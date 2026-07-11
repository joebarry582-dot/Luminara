/**
 * LUMINARA Main App Controller
 * Handles page navigation, initialization, global events
 */

const App = {
  currentPage: 'overview',
  supabase: null,

  async init() {
    // Try real Supabase first, fallback to mock
    let backendClient = window.mockSupabase;
    
    try {
      const realSupabase = window.LuminaraSupabase?.init();
      if (realSupabase) {
        backendClient = realSupabase;
        console.log("%c[LUMINARA] ✓ Using REAL Supabase backend", "color:#22c55e");
      }
    } catch (err) {
      console.log("%c[LUMINARA] Using Mock backend", "color:#64748b");
    }

    this.supabase = backendClient;
    
    // Apply saved theme
    const savedTheme = localStorage.getItem('luminara_theme');
    if (savedTheme && savedTheme !== 'dark') {
      document.body.classList.add(`theme-${savedTheme}`);
    }

    // Initialize modules
    Auth.init(this.supabase);
    Notifications.init(this.supabase);
    Profile.init();

    // Setup navigation
    this._setupNavigation();

    // Setup global keyboard shortcuts
    this._setupKeyboardShortcuts();

    // Seed initial demo data if empty
    this._seedDemoData();

    // Show loading then proceed to auth check (handled in Auth)
    this._runLoadingScreen();

    console.log('%c[LUMINARA] Application initialized successfully', 'color:#22c55e');
  },

  _runLoadingScreen() {
    const loading = document.getElementById('loading-screen');
    const progress = document.querySelector('.progress-fill');
    
    let width = 0;
    const interval = setInterval(() => {
      width += Math.random() * 28 + 12;
      if (width >= 100) {
        width = 100;
        clearInterval(interval);
        setTimeout(() => {
          loading.style.opacity = '0';
          setTimeout(() => {
            loading.style.display = 'none';
            // Auth will decide login or dashboard
          }, 600);
        }, 420);
      }
      progress.style.width = width + '%';
    }, 180);
  },

  _setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
      item.addEventListener('click', () => {
        const page = item.dataset.page;
        if (page) this.navigateTo(page);
      });
    });

    // Mobile menu toggle could be added here
  },

  navigateTo(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show target
    const targetPage = document.getElementById(`page-${page}`);
    if (targetPage) {
      targetPage.classList.add('active');
      this.currentPage = page;

      // Page-specific init
      this._onPageChange(page);
    }

    // Update active nav
    document.querySelectorAll('.nav-item').forEach(n => {
      n.classList.toggle('active', n.dataset.page === page);
    });
  },

  _onPageChange(page) {
    switch(page) {
      case 'overview':
        if (window.Charts) window.Charts.updateOverviewCharts();
        break;
      case 'map':
        if (window.MapModule && !window.MapModule.initialized) {
          window.MapModule.initMap();
        }
        break;
      case 'reports':
        if (window.Reports) window.Reports.refreshList();
        break;
      case 'radio':
        if (window.Radio) window.Radio.refreshUI();
        break;
      case 'ai':
        // AI is floating, but can focus
        break;
      case 'admin':
        if (window.Admin && Auth.hasRole('administrator')) {
          window.Admin.loadDashboard();
        } else {
          utils.showToast('Access denied: Administrator clearance required', 'error');
          this.navigateTo('overview');
        }
        break;
      case 'profile':
        if (Auth.currentUser) Profile.loadProfile(Auth.currentUser);
        break;
    }
  },

  onUserAuthenticated(user) {
    // Called from Auth after successful login
    console.log('[LUMINARA] User authenticated:', user.username || user.email);

    // Add welcome notification
    setTimeout(() => {
      Notifications.addNotification('Welcome to LUMINARA', `Satellite Command online. Current clearance: ${user.role?.toUpperCase()}`, 'success');
    }, 1200);

    // Seed some activity
    this._logActivity('Logged into Satellite Command Center');

    // Default to overview
    setTimeout(() => this.navigateTo('overview'), 300);

    // Initialize map early in background
    setTimeout(() => {
      if (window.MapModule) window.MapModule.initMap();
    }, 800);
  },

  _logActivity(action) {
    let logs = JSON.parse(localStorage.getItem('luminara_activity') || '[]');
    logs.unshift({ action, timestamp: new Date().toISOString() });
    if (logs.length > 20) logs = logs.slice(0, 20);
    localStorage.setItem('luminara_activity', JSON.stringify(logs));
  },

  _setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if (e.metaKey && e.key === '/') {
        e.preventDefault();
        const aiBtn = document.getElementById('ai-floating-btn');
        if (aiBtn) aiBtn.click();
      }
      if (e.key === 'Escape') {
        const dropdown = document.getElementById('notification-dropdown');
        if (dropdown) dropdown.classList.remove('show');
        // Close AI panel if open
        const aiPanel = document.getElementById('ai-panel');
        if (aiPanel) aiPanel.style.display = 'none';
      }
      if (e.key.toLowerCase() === '?' && document.activeElement.tagName === 'BODY') {
        e.preventDefault();
        this.navigateTo('map');
      }
    });

    // Easter egg: Konami code or simple
    let konami = [];
    const pattern = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight','ArrowLeft','ArrowRight','b','a'];
    document.addEventListener('keydown', (e) => {
      konami.push(e.key);
      if (konami.length > pattern.length) konami.shift();
      if (konami.join(',') === pattern.join(',')) {
        document.body.style.filter = 'hue-rotate(180deg)';
        setTimeout(() => document.body.style.filter = '', 1800);
        utils.showToast('🌌 Warp drive engaged');
        konami = [];
      }
    });
  },

  _seedDemoData() {
    // Seed some reports if none exist
    const existingReports = JSON.parse(localStorage.getItem('luminara_reports') || '[]');
    if (existingReports.length === 0) {
      const demoReports = [
        {
          id: 'rep1',
          title: 'Tropical Storm Formation',
          description: 'Large convective system developing 420km SE of command center. Wind shear increasing.',
          category: 'Weather',
          severity: 'high',
          latitude: 12.4,
          longitude: 145.2,
          status: 'approved',
          images: [],
          created_by: 'u3',
          created_at: new Date(Date.now() - 1000*60*45).toISOString()
        },
        {
          id: 'rep2',
          title: 'Volcanic Ash Plume Detected',
          description: 'Satellite imagery shows significant ash cloud from Mt. Merapi. Aviation advisory issued.',
          category: 'Geological',
          severity: 'critical',
          latitude: -7.54,
          longitude: 110.44,
          status: 'approved',
          images: [],
          created_by: 'u2',
          created_at: new Date(Date.now() - 1000*60*120).toISOString()
        }
      ];
      localStorage.setItem('luminara_reports', JSON.stringify(demoReports));
    }

    // Seed weather logs
    const weather = JSON.parse(localStorage.getItem('luminara_weather_logs') || '[]');
    if (weather.length === 0) {
      const demoWeather = Array.from({length: 6}).map((_,i) => ({
        id: 'w' + i,
        temperature: 26 + Math.random() * 4,
        humidity: 68 + Math.random() * 18,
        wind: 12 + Math.random() * 9,
        uv: 7 + Math.random() * 3,
        pressure: 1012 + Math.random() * 6,
        location: 'Command Center Alpha',
        created_at: new Date(Date.now() - i*1000*60*35).toISOString()
      }));
      localStorage.setItem('luminara_weather_logs', JSON.stringify(demoWeather));
    }
  }
};

window.App = App;

// Boot the application
document.addEventListener('DOMContentLoaded', () => {
  App.init();
});