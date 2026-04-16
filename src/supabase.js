import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://garqbefezreppqdheocw.supabase.co";
const supabaseKey = "sb_publishable_VehM8pJcRzFJO3-ZQd3IeA_YQCqqqES"; 

export const supabase = createClient(supabaseUrl, supabaseKey);
