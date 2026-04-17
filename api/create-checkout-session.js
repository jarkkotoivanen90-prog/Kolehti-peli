import Stripe from "stripe";
import { supabaseAdmin } from "./_supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

function getConfig(type) {
  if (type === "day") return { limit: 2, prices: [2, 5] };
  if (type === "week") return { limit: 4, prices: [2, 4, 7, 11] };
  if (type === "month") return { limit: 6, prices: [2, 4, 6, 9, 13, 18] };
  return { limit: 2, prices: [2, 5] };
}

function getCooldown(type) {
  if (type === "day") return 2 * 60 * 1000;
  if (type === "week") return 10 * 60 * 1000;
  if (type === "month") return 30 * 60 * 1000;
  return 5 * 60 * 1000;
}

function clampPrice(price, min, max) {
  return Math.max(min, Math.min(max, price));
}

function calcPrice(base, timing, score, purchaseRate = 0, priceSensitivity = 0.5) {
  let p = base;

  if (timing === "perfect") p += 1;
  if (timing === "wait") p -= 1;
  if (score > 70) p += 1;
  if (score < 40) p -= 1;
  if (purchaseRate >= 35) p += 1;
  if (purchaseRate <= 10) p -= 1;
  if (priceSensitivity > 0.7) p -= 1;
  if (priceSensitivity < 0.3) p += 1;

  return clampPrice(p, Math.max(1, base - 1), base + 2);
}

async function getUserFromBearer(req) {
  const auth = req.headers.authorization || "";
  const token = auth.startsWith("Bearer ") ? auth.slice(7) : null;
  if (!token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  if (error) return null;
  return data.user ?? null;
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const user = await getUserFromBearer(req);
    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { drawType, drawId, timing, aiScore, purchaseRate = 0 } = req.body || {};

    if (!drawType || !drawId) {
      return res.status(400).json({ error: "Missing drawType or drawId" });
    }

    const { data: userDraw } = await supabaseAdmin
      .from("user_draws")
      .select("*")
      .eq("user_id", user.id)
      .eq("draw_id", drawId)
      .maybeSingle();

    const used = userDraw?.boosts_used || 0;
    const last = userDraw?.last_boost_at;

    const cfg = getConfig(drawType);
    if (used >= cfg.limit) {
      return res.status(400).json({ error: "Boost limit reached" });
    }

    if (last) {
      const diff = Date.now() - new Date(last).getTime();
      if (diff < getCooldown(drawType)) {
        return res.status(400).json({ error: "Cooldown active" });
      }
    }

    const { data: aiModel } = await supabaseAdmin
      .from("ai_user_models")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle();

    const basePrice = cfg.prices[used];
    const finalPrice = calcPrice(
      basePrice,
      timing,
      Number(aiScore || 0),
      Number(purchaseRate || 0),
      Number(aiModel?.price_sensitivity || 0.5)
    );

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${process.env.VITE_APP_URL}?success=1`,
      cancel_url: `${process.env.VITE_APP_URL}?cancel=1`,
      client_reference_id: user.id,
      metadata: {
        user_id: user.id,
        draw_id: drawId,
        draw_type: drawType,
        timing,
        ai_score: String(aiScore || 0),
        boost_number: String(used + 1),
        base_price: String(basePrice),
        price: String(finalPrice),
      },
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "eur",
            product_data: {
              name: `Boost #${used + 1}`,
            },
            unit_amount: Math.round(finalPrice * 100),
          },
        },
      ],
    });

    await supabaseAdmin.from("stripe_checkout_sessions").insert({
      user_id: user.id,
      stripe_session_id: session.id,
      draw_id: drawId,
      draw_type: drawType,
      boost_number: used + 1,
      base_price_eur: basePrice,
      final_price_eur: finalPrice,
      timing,
      ai_score: Number(aiScore || 0),
      status: "pending",
      meta: {
        purchaseRate,
      },
    });

    res.json({ url: session.url, sessionId: session.id });
  } catch (e) {
    await supabaseAdmin.from("app_errors").insert({
      area: "create_checkout_session",
      message: e.message,
      meta: {},
    });

    res.status(500).json({ error: e.message });
  }
}
