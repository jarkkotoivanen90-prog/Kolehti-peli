import Stripe from "stripe";
import { supabaseAdmin } from "./_supabaseAdmin";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks);
}

function getEffect(type, timing) {
  let momentum = 20;
  let visibility = 10;

  if (type === "day") {
    momentum = 25;
    visibility = 20;
  }
  if (type === "month") {
    momentum = 15;
    visibility = 8;
  }

  if (timing === "perfect") {
    momentum = Math.round(momentum * 1.5);
    visibility += 10;
  }
  if (timing === "good") {
    momentum = Math.round(momentum * 1.2);
    visibility += 5;
  }

  return { momentum, visibility };
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).send("Method not allowed");
  }

  try {
    const rawBody = await readRawBody(req);
    const sig = req.headers["stripe-signature"];

    const event = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );

    const stripeEventId = event.id;

    const { data: existingWebhook } = await supabaseAdmin
      .from("processed_webhooks")
      .select("id")
      .eq("stripe_event_id", stripeEventId)
      .maybeSingle();

    if (existingWebhook) {
      return res.status(200).json({ ok: true, duplicate: true });
    }

    await supabaseAdmin.from("processed_webhooks").insert({
      stripe_event_id: stripeEventId,
    });

    if (event.type === "checkout.session.completed") {
      const s = event.data.object;
      const meta = s.metadata || {};

      const { data: checkoutRow } = await supabaseAdmin
        .from("stripe_checkout_sessions")
        .select("*")
        .eq("stripe_session_id", s.id)
        .maybeSingle();

      if (checkoutRow && checkoutRow.status !== "completed") {
        const effect = getEffect(meta.draw_type, meta.timing);
        const now = new Date().toISOString();

        await supabaseAdmin
          .from("user_draws")
          .update({
            boosts_used: Number(meta.boost_number || 0),
            last_boost_at: now,
          })
          .eq("user_id", meta.user_id)
          .eq("draw_id", meta.draw_id);

        const { data: post } = await supabaseAdmin
          .from("posts")
          .select("*")
          .eq("user_id", meta.user_id)
          .maybeSingle();

        if (post) {
          await supabaseAdmin
            .from("posts")
            .update({
              visibility_score: (post.visibility_score || 0) + effect.visibility,
              visibility_updated_at: now,
            })
            .eq("id", post.id);
        }

        await supabaseAdmin.from("purchases").insert({
          user_id: meta.user_id,
          offer_code: "BOOST",
          price_eur: Number(meta.price || 0),
          status: "completed",
          meta: {
            stripe_session_id: s.id,
            draw_type: meta.draw_type,
            boost_number: Number(meta.boost_number || 0),
            timing: meta.timing,
            ai_score: Number(meta.ai_score || 0),
            effect,
            base_price: Number(meta.base_price || 0),
            adaptive_price: Number(meta.price || 0),
          },
        });

        await supabaseAdmin.from("events").insert({
          user_id: meta.user_id,
          type: "boost_purchase",
          value: Math.round(Number(meta.price || 0) * 100),
          meta: {
            stripe_session_id: s.id,
            draw_type: meta.draw_type,
            boost_number: Number(meta.boost_number || 0),
            timing: meta.timing,
            effect,
          },
        });

        await supabaseAdmin.from("boost_offer_events").insert({
          user_id: meta.user_id,
          draw_type: meta.draw_type,
          timing: meta.timing,
          price_eur: Number(meta.price || 0),
          action: "purchased",
          ai_score: Number(meta.ai_score || 0),
          meta: {
            stripe_session_id: s.id,
            boost_number: Number(meta.boost_number || 0),
          },
        });

        await supabaseAdmin
          .from("stripe_checkout_sessions")
          .update({
            status: "completed",
            completed_at: now,
          })
          .eq("id", checkoutRow.id);

        const { data: aiModel } = await supabaseAdmin
          .from("ai_user_models")
          .select("*")
          .eq("user_id", meta.user_id)
          .maybeSingle();

        if (aiModel) {
          const patch = {
            pays_in_critical_moments: Math.min(1, Number(aiModel.pays_in_critical_moments || 0.5) + 0.05),
            ignores_offers: Math.max(0, Number(aiModel.ignores_offers || 0.5) - 0.04),
            price_sensitivity: Math.max(
              0,
              Math.min(1, Number(aiModel.price_sensitivity || 0.5) + (Number(meta.price || 0) >= 5 ? -0.03 : 0.01))
            ),
            updated_at: now,
          };

          if (meta.draw_type === "day") patch.prefers_day_draws = Math.min(1, Number(aiModel.prefers_day_draws || 0.5) + 0.05);
          if (meta.draw_type === "week") patch.prefers_week_draws = Math.min(1, Number(aiModel.prefers_week_draws || 0.5) + 0.05);
          if (meta.draw_type === "month") patch.prefers_month_draws = Math.min(1, Number(aiModel.prefers_month_draws || 0.5) + 0.05);

          await supabaseAdmin
            .from("ai_user_models")
            .update(patch)
            .eq("user_id", meta.user_id);
        }
      }
    }

    res.json({ ok: true });
  } catch (err) {
    await supabaseAdmin.from("app_errors").insert({
      area: "stripe_webhook",
      message: err.message || "Unknown webhook error",
      meta: {},
    });

    res.status(400).send(err.message);
  }
}
