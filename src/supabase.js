import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;https://garqbefezreppqdheocw.supabase.co
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;"sb_publishable_VehM8pJcRzFJO3-ZQd3IeA_YQCqqqES";

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("❌ Supabase env puuttuu. Tarkista .env tiedosto.");
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
