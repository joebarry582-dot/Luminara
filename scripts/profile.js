/**
 * LUMINARA User Profile Module
 */

const Profile = {
  currentUser: null,
  bookmarks: [],

  init() {
    this._loadBookmarks();
    this._setupProfileListeners();
  },

  loadProfile(user) {
    this.currentUser = user;
    const container = document.getElementById('profile-content');
    if (!container) return;

    const xp = user.experience_points || 2450;
    const rank = user.rank || 'Lieutenant';
    const achievements = ['First Contact', 'Storm Chaser', 'Satellite Whisperer', 'Emergency Responder'];

    container.innerHTML = `
      <div class="glass card">
        <div class="profile-header">
          <div class="profile-avatar-large" id="profile-avatar-large">
            ${utils.createAvatar(user.username || 'User', 110)}
          </div>
          <div style="flex:1">
            <h2 style="font-size:28px;margin-bottom:4px">${user.username || user.email.split('@')[0]}</h2>
            <div style="color:var(--text-secondary);margin-bottom:16px">${user.email}</div>
            
            <div class="profile-stats">
              <div class="profile-stat">
                <div class="value">${xp.toLocaleString()}</div>
                <div class="label">EXPERIENCE</div>
              </div>
              <div class="profile-stat">
                <div class="value">${rank}</div>
                <div class="label">CURRENT RANK</div>
              </div>
              <div class="profile-stat">
                <div class="value">${user.role?.toUpperCase()}</div>
                <div class="label">CLEARANCE</div>
              </div>
            </div>
          </div>
        </div>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
          <!-- Achievements -->
          <div>
            <h4 style="margin-bottom:14px;color:var(--text-secondary);font-size:13px;letter-spacing:1px">ACHIEVEMENTS UNLOCKED</h4>
            <div style="display:flex;flex-wrap:wrap;gap:8px">
              ${achievements.map(a => `
                <div style="background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.3);padding:6px 14px;border-radius:999px;font-size:13px">${a}</div>
              `).join('')}
            </div>
          </div>

          <!-- Saved Locations -->
          <div>
            <h4 style="margin-bottom:14px;color:var(--text-secondary);font-size:13px;letter-spacing:1px">SAVED LOCATIONS (${this.bookmarks.length})</h4>
            <div id="profile-bookmarks" style="max-height:160px;overflow-y:auto">
              ${this.bookmarks.length === 0 ? 
                `<div style="color:var(--text-secondary);font-size:13px">No saved locations yet. Bookmark from the map.</div>` : 
                this.bookmarks.map(b => `
                  <div onclick="Profile.flyToBookmark(${b.latitude}, ${b.longitude}, '${b.name}')" style="display:flex;justify-content:space-between;align-items:center;padding:8px 0;border-bottom:1px solid var(--border-glass);cursor:pointer">
                    <div><strong>${b.name}</strong><div style="font-size:12px;color:var(--text-secondary)">${b.latitude.toFixed(2)}, ${b.longitude.toFixed(2)}</div></div>
                    <i class="fas fa-map-marker-alt" style="color:var(--accent-blue)"></i>
                  </div>
                `).join('')}
            </div>
          </div>
        </div>

        <div style="margin-top:30px">
          <h4 style="margin-bottom:12px;color:var(--text-secondary);font-size:13px">RECENT ACTIVITY</h4>
          <div style="font-size:13.5px;line-height:1.7;color:var(--text-secondary)">
            ${this._getActivityLogHTML()}
          </div>
        </div>

        <div style="margin-top:30px;display:flex;gap:12px">
          <button onclick="Profile.editProfile()" class="btn btn-secondary">Edit Profile</button>
          <button onclick="Profile.changeThemePrompt()" class="btn btn-secondary">Change Theme</button>
          <button onclick="Auth.logout()" class="btn btn-danger" style="margin-left:auto">Log Out</button>
        </div>
      </div>
    `;
  },

  _getActivityLogHTML() {
    const logs = JSON.parse(localStorage.getItem('luminara_activity') || '[]').slice(0, 5);
    if (logs.length === 0) return '<div style="color:var(--text-secondary)">No recent activity</div>';
    return logs.map(log => `
      <div style="display:flex;gap:10px;margin-bottom:8px">
        <div style="width:6px;height:6px;background:var(--accent-blue);border-radius:50%;margin-top:7px;flex-shrink:0"></div>
        <div><strong>${log.action}</strong> <span style="color:var(--text-secondary)">• ${utils.formatDate(log.timestamp, false)}</span></div>
      </div>
    `).join('');
  },

  _loadBookmarks() {
    const saved = localStorage.getItem('luminara_bookmarks');
    this.bookmarks = saved ? JSON.parse(saved) : [];
  },

  saveBookmark(lat, lng, name = 'Custom Location') {
    const exists = this.bookmarks.find(b => Math.abs(b.latitude - lat) < 0.01 && Math.abs(b.longitude - lng) < 0.01);
    if (exists) {
      utils.showToast('Location already bookmarked');
      return;
    }
    this.bookmarks.unshift({ id: Date.now(), latitude: lat, longitude: lng, name, created_at: new Date().toISOString() });
    localStorage.setItem('luminara_bookmarks', JSON.stringify(this.bookmarks));
    utils.showToast('Location bookmarked successfully');
    
    // Refresh profile if open
    if (document.getElementById('page-profile')?.classList.contains('active') && this.currentUser) {
      this.loadProfile(this.currentUser);
    }
  },

  flyToBookmark(lat, lng, name) {
    if (window.MapModule && window.MapModule.map) {
      window.MapModule.map.flyTo([lat, lng], 9, { duration: 1.5 });
      // Switch to map page
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.getElementById('page-map').classList.add('active');
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById('nav-map').classList.add('active');
      utils.showToast(`Navigating to ${name}`);
    }
  },

  editProfile() {
    const newUsername = prompt('Enter new username:', this.currentUser?.username || '');
    if (!newUsername || newUsername === this.currentUser?.username) return;

    // Update in mock
    const users = JSON.parse(localStorage.getItem('luminara_users') || '[]');
    const idx = users.findIndex(u => u.id === this.currentUser.id);
    if (idx !== -1) {
      users[idx].username = newUsername;
      localStorage.setItem('luminara_users', JSON.stringify(users));
    }

    // Update session
    this.currentUser.username = newUsername;
    localStorage.setItem('luminara_session', JSON.stringify(this.currentUser));

    utils.showToast('Profile updated');
    Auth._updateUserUI();
    if (document.getElementById('page-profile')?.classList.contains('active')) {
      this.loadProfile(this.currentUser);
    }
  },

  changeThemePrompt() {
    const themes = ['dark', 'blue', 'purple'];
    const current = document.body.className.replace('theme-', '') || 'dark';
    const next = themes[(themes.indexOf(current) + 1) % themes.length];
    
    document.body.className = next === 'dark' ? '' : `theme-${next}`;
    localStorage.setItem('luminara_theme', next);
    utils.showToast(`Theme changed to ${next}`);
  },

  _setupProfileListeners() {
    // Can add more listeners here
  }
};

window.Profile = Profile;