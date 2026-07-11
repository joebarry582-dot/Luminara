/**
 * LUMINARA Auth Module
 * Handles login, signup, session, role-based access using MockSupabase
 */

const Auth = {
  currentUser: null,
  supabase: null,

  init(supabaseClient) {
    this.supabase = supabaseClient || window.mockSupabase;
    this._checkSession();
    this._setupAuthListeners();
  },

  async _checkSession() {
    const { data } = await this.supabase.auth.getUser();
    if (data?.user) {
      this.currentUser = data.user;
      this._showDashboard();
    } else {
      this._showLogin();
    }
  },

  _setupAuthListeners() {
    // Listen for auth changes from mock
    this.supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' && session?.user) {
        this.currentUser = session.user;
        this._showDashboard();
      } else if (event === 'SIGNED_OUT') {
        this.currentUser = null;
        this._showLogin();
      }
    });
  },

  async login(email, password, remember = true) {
    const { data, error } = await this.supabase.auth.signInWithPassword({ email, password });
    if (error) {
      utils.showToast(error.message || 'Login failed', 'error');
      return false;
    }
    if (remember) {
      localStorage.setItem('luminara_remember', 'true');
    }
    utils.showToast('Welcome back, Commander', 'success');
    return true;
  },

  async signup(email, password, username) {
    const { data, error } = await this.supabase.auth.signUp({
      email,
      password,
      options: { data: { username } }
    });
    if (error) {
      utils.showToast(error.message, 'error');
      return false;
    }
    utils.showToast('Account created. Welcome to LUMINARA!', 'success');
    return true;
  },

  async logout() {
    await this.supabase.auth.signOut();
    localStorage.removeItem('luminara_remember');
    utils.showToast('Logged out successfully');
    this._showLogin();
  },

  getCurrentUser() {
    return this.currentUser;
  },

  getRole() {
    return this.currentUser?.role || 'user';
  },

  hasRole(required) {
    const role = this.getRole();
    const hierarchy = { user: 1, moderator: 2, administrator: 3 };
    return hierarchy[role] >= hierarchy[required];
  },

  _showLogin() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('dashboard').style.display = 'none';
  },

  _showDashboard() {
    document.getElementById('loading-screen').style.display = 'none';
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('dashboard').style.display = 'flex';

    // Update UI with user info
    this._updateUserUI();

    // Initialize other modules now that user is logged in
    if (window.App) window.App.onUserAuthenticated(this.currentUser);
  },

  _updateUserUI() {
    const user = this.currentUser;
    if (!user) return;

    // Topbar user info
    const nameEl = document.getElementById('user-name');
    const roleEl = document.getElementById('user-role');
    const avatarEl = document.getElementById('user-avatar');

    if (nameEl) nameEl.textContent = user.username || user.email.split('@')[0];
    if (roleEl) roleEl.textContent = user.role?.toUpperCase() || 'USER';

    if (avatarEl) {
      avatarEl.innerHTML = utils.createAvatar(user.username || user.email, 36);
    }

    // Show/hide admin nav item
    const adminNav = document.getElementById('nav-admin');
    if (adminNav) {
      adminNav.style.display = this.hasRole('administrator') ? 'flex' : 'none';
    }

    // Update profile page if open
    if (window.Profile) window.Profile.loadProfile(user);
  },

  // Helper to require auth for actions
  requireAuth(callback) {
    if (!this.currentUser) {
      utils.showToast('Please log in to perform this action', 'error');
      return false;
    }
    callback();
    return true;
  }
};

window.Auth = Auth;