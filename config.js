// Supabase Configuration
const SUPABASE_URL = "https://nojnufbdnordzpmbhkuv.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_iR_KVbrin9R8KTHR9YBRag_Vurn1JSs";

// Initialize Supabase client
let supabaseClient = null;

// Initialize when Supabase library is loaded
setTimeout(() => {
  if (typeof window.supabase !== "undefined") {
    supabaseClient = window.supabase.createClient(
      SUPABASE_URL,
      SUPABASE_ANON_KEY,
    );
    window.supabase_instance = supabaseClient;
  }
}, 100);

// Get current user from localStorage
function getCurrentUserFromStorage() {
  const user = localStorage.getItem("currentUser");
  return user ? JSON.parse(user) : null;
}

// Verify user is logged in
function verifyUserLoggedIn() {
  const user = getCurrentUserFromStorage();
  if (!user) {
    window.location.href = "login.html";
    return null;
  }
  return user;
}
