/**
 * LUMINARA - Real Supabase Client
 * 
 * This replaces the mock version with actual Supabase.
 * 
 * SETUP:
 * 1. Get your Supabase URL and anon key from Project Settings → API
 * 2. Replace the values below
 * 3. Include this script in index.html (after the Supabase CDN)
 */

const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_KEY_HERE';

let supabase = null;

window.LuminaraSupabase = {
  isInitialized: false,

  init() {
    if (this.isInitialized) return supabase;

    if (SUPABASE_URL.includes('YOUR_PROJECT_ID') || SUPABASE_ANON_KEY.includes('YOUR_ANON_KEY')) {
      console.warn('%c[LUMINARA] Supabase credentials not configured. Using mock mode.', 'color:orange');
      return null;
    }

    try {
      // Using Supabase JS v2 via CDN
      supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      this.isInitialized = true;
      console.log('%c[LUMINARA] ✓ Connected to real Supabase', 'color:#22c55e');
      return supabase;
    } catch (error) {
      console.error('Failed to initialize Supabase:', error);
      return null;
    }
  },

  getClient() {
    return supabase;
  },

  // ==================== AUTH ====================
  auth: {
    async signInWithPassword({ email, password }) {
      if (!supabase) throw new Error('Supabase not initialized');
      return supabase.auth.signInWithPassword({ email, password });
    },

    async signUp({ email, password, options }) {
      if (!supabase) throw new Error('Supabase not initialized');
      return supabase.auth.signUp({ email, password, options });
    },

    async signOut() {
      if (!supabase) return;
      return supabase.auth.signOut();
    },

    async getUser() {
      if (!supabase) return { data: { user: null }, error: null };
      return supabase.auth.getUser();
    },

    onAuthStateChange(callback) {
      if (!supabase) return { data: { subscription: { unsubscribe: () => {} } } };
      return supabase.auth.onAuthStateChange(callback);
    }
  },

  // ==================== DATABASE ====================
  from(table) {
    if (!supabase) throw new Error('Supabase not initialized');
    return supabase.from(table);
  },

  // ==================== REALTIME ====================
  channel(name) {
    if (!supabase) throw new Error('Supabase not initialized');
    return supabase.channel(name);
  },

  // ==================== STORAGE ====================
  storage: {
    from(bucket) {
      if (!supabase) throw new Error('Supabase not initialized');
      return supabase.storage.from(bucket);
    }
  }
};