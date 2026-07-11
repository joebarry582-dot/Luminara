/**
 * LUMINARA Utils - Helper functions
 */

window.LuminaraUtils = {
  // Format date nicely
  formatDate: (dateStr, includeTime = true) => {
    const date = new Date(dateStr);
    const options = { month: 'short', day: 'numeric', year: 'numeric' };
    let formatted = date.toLocaleDateString('en-US', options);
    if (includeTime) {
      formatted += ' • ' + date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    }
    return formatted;
  },

  // Generate random ID
  generateId: () => 'id_' + Date.now().toString(36) + Math.random().toString(36).substr(2),

  // Severity color helper
  getSeverityClass: (severity) => {
    return severity || 'medium';
  },

  // Create avatar from initials
  createAvatar: (name, size = 36) => {
    const colors = ['#00d4ff', '#a855f7', '#22c55e', '#f59e0b'];
    const color = colors[name ? name.charCodeAt(0) % colors.length : 0];
    return `
      <div style="width:${size}px;height:${size}px;border-radius:50%;background:linear-gradient(135deg, ${color}, #0a0f1e);display:flex;align-items:center;justify-content:center;font-weight:700;font-size:${size/2.2}px;color:#0a0f1e;box-shadow:0 0 10px ${color}55;">
        ${name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0,2) : 'U'}
      </div>
    `;
  },

  // Show toast notification (simple)
  showToast: (message, type = 'info') => {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;bottom:24px;left:50%;transform:translateX(-50%);padding:14px 26px;background:var(--bg-glass);border:1px solid var(--border-glass);border-radius:999px;box-shadow:0 10px 30px rgba(0,0,0,0.4);z-index:99999;display:flex;align-items:center;gap:10px;color:var(--text-primary);font-size:14px;`;
    toast.innerHTML = `
      <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-circle' : 'info-circle'}" style="color:var(--accent-${type === 'success' ? 'green' : type === 'error' ? 'red' : 'blue'})"></i>
      <span>${message}</span>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'all .4s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.remove(), 400);
    }, 2800);
  },

  // Debounce
  debounce: (fn, delay) => {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => fn(...args), delay);
    };
  },

  // Simulate loading
  simulateNetwork: (ms = 600) => new Promise(resolve => setTimeout(resolve, ms)),

  // Get current user from mock
  getCurrentUser: () => {
    try {
      return JSON.parse(localStorage.getItem('luminara_session') || 'null');
    } catch { return null; }
  }
};

// Make available globally
window.utils = window.LuminaraUtils;