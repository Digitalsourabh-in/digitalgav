// Supabase browser client for Digital Gav.
// The publishable key is designed for browser use. Never put a secret/service_role key here.
(function () {
  const SUPABASE_URL = "https://esfwcfyekufvcfzjczbt.supabase.co";
  const SUPABASE_PUBLISHABLE_KEY = "sb_publishable_OunSvaLP64JNd5Xjae8MQw_GwIZnBb1";

  if (!window.supabase || typeof window.supabase.createClient !== "function") {
    console.error("Supabase library did not load. Check the CDN script in index.html.");
    return;
  }

  window.digitalGavSupabase = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
  );
})();
