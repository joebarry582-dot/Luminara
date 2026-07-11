/**
 * LUMINARA Notifications Module
 * Realtime-style notification center
 */

const Notifications = {
  notifications: [],
  supabase: null,

  init(supabase) {
    this.supabase = supabase || window.mockSupabase;
    this._loadFromStorage();
    this._renderBell();
    this._setupRealtime();
  },

  _loadFromStorage() {
    const saved = localStorage.getItem('luminara_notifications');
    this.notifications = saved ? JSON.parse(saved) : [];
  },

  _save() {
    localStorage.setItem('luminara_notifications', JSON.stringify(this.notifications));
  },

  addNotification(title, message, type = 'info') {
    const notif = {
      id: 'notif_' + Date.now(),
      title,
      message,
      type,
      read: false,
      created_at: new Date().toISOString()
    };
    this.notifications.unshift(notif);
    if (this.notifications.length > 30) this.notifications.pop();
    this._save();
    this._renderBell();
    this._showToastPopup(notif);

    // Also store in mock DB
    this.supabase.from('notifications').insert(notif);
  },

  _showToastPopup(notif) {
    const toast = document.createElement('div');
    toast.style.cssText = `position:fixed;top:80px;right:24px;max-width:320px;padding:16px 20px;background:var(--bg-glass);border:1px solid var(--border-glass);border-radius:14px;box-shadow:0 15px 40px rgba(0,0,0,0.4);z-index:9999;`;
    toast.innerHTML = `
      <div style="display:flex;gap:12px;align-items:flex-start">
        <div style="width:28px;height:28px;border-radius:50%;background:var(--accent-blue);display:flex;align-items:center;justify-content:center;flex-shrink:0;">
          <i class="fas fa-satellite" style="color:#0a0f1e;font-size:14px"></i>
        </div>
        <div style="flex:1">
          <div style="font-weight:700;margin-bottom:4px">${notif.title}</div>
          <div style="font-size:13.5px;color:var(--text-secondary);line-height:1.4">${notif.message}</div>
        </div>
      </div>
    `;
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.style.transition = 'all 0.4s ease';
      toast.style.opacity = '0';
      setTimeout(() => toast.parentNode?.removeChild(toast), 300);
    }, 4200);
  },

  markAllRead() {
    this.notifications.forEach(n => n.read = true);
    this._save();
    this._renderBell();
    this._renderDropdown();
  },

  _renderBell() {
    const bell = document.getElementById('notification-bell');
    if (!bell) return;

    const unread = this.notifications.filter(n => !n.read).length;
    let badge = bell.querySelector('.notification-badge');
    
    if (unread > 0) {
      if (!badge) {
        badge = document.createElement('div');
        badge.className = 'notification-badge';
        bell.appendChild(badge);
      }
      badge.textContent = unread > 9 ? '9+' : unread;
    } else if (badge) {
      badge.remove();
    }

    bell.onclick = () => this._toggleDropdown();
  },

  _toggleDropdown() {
    let dropdown = document.getElementById('notification-dropdown');
    if (!dropdown) {
      dropdown = document.createElement('div');
      dropdown.id = 'notification-dropdown';
      dropdown.className = 'notification-dropdown glass';
      document.querySelector('.topbar-right').appendChild(dropdown);
    }

    if (dropdown.classList.contains('show')) {
      dropdown.classList.remove('show');
      return;
    }

    dropdown.classList.add('show');
    this._renderDropdown(dropdown);

    // Close when clicking outside
    setTimeout(() => {
      document.addEventListener('click', function handler(e) {
        if (!dropdown.contains(e.target) && e.target.id !== 'notification-bell') {
          dropdown.classList.remove('show');
          document.removeEventListener('click', handler);
        }
      }, { once: true });
    }, 50);
  },

  _renderDropdown(dropdown = null) {
    const dd = dropdown || document.getElementById('notification-dropdown');
    if (!dd) return;

    const unreadCount = this.notifications.filter(n => !n.read).length;

    dd.innerHTML = `
      <div style="padding:16px 20px;border-bottom:1px solid var(--border-glass);display:flex;justify-content:space-between;align-items:center">
        <div style="font-weight:700">Notifications</div>
        <div style="display:flex;gap:8px;align-items:center">
          ${unreadCount > 0 ? `<button onclick="Notifications.markAllRead();event.stopImmediatePropagation()" class="btn btn-secondary" style="padding:4px 12px;font-size:11px">Mark all read</button>` : ''}
          <button onclick="document.getElementById('notification-dropdown').classList.remove('show');event.stopImmediatePropagation()" style="background:none;border:none;color:var(--text-secondary);font-size:18px;cursor:pointer">×</button>
        </div>
      </div>
      <div style="max-height:340px;overflow-y:auto">
        ${this.notifications.length === 0 ? 
          `<div style="padding:40px 20px;text-align:center;color:var(--text-secondary)">No notifications yet</div>` : 
          this.notifications.map(n => `
            <div class="notification-item ${n.read ? '' : 'unread'}" onclick="Notifications._markRead('${n.id}');event.stopImmediatePropagation()">
              <div style="font-weight:600;margin-bottom:3px">${n.title}</div>
              <div style="font-size:13.5px;color:var(--text-secondary);line-height:1.35">${n.message}</div>
              <div class="notification-time">${utils.formatDate(n.created_at, false)}</div>
            </div>
          `).join('')
        }
      </div>
    `;
  },

  _markRead(id) {
    const notif = this.notifications.find(n => n.id === id);
    if (notif) {
      notif.read = true;
      this._save();
      this._renderBell();
      this._renderDropdown();
    }
  },

  _setupRealtime() {
    // Listen for new reports, etc. via mock realtime
    if (this.supabase) {
      this.supabase.channel('notifications-realtime')
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, (payload) => {
          if (payload.new) {
            this.addNotification('New Report Received', `${payload.new.title} • ${payload.new.severity.toUpperCase()}`, 'warning');
          }
        })
        .subscribe();
    }
  }
};

window.Notifications = Notifications;