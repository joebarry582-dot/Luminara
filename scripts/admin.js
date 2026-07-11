/**
 * LUMINARA Admin Dashboard Module
 * Only accessible to administrators
 */

const Admin = {
  init() {
    // Nothing heavy on init
  },

  loadDashboard() {
    const container = document.getElementById('admin-content');
    if (!container) return;

    const reports = JSON.parse(localStorage.getItem('luminara_reports') || '[]');
    const users = JSON.parse(localStorage.getItem('luminara_users') || '[]');
    const pending = reports.filter(r => r.status === 'pending').length;

    container.innerHTML = `
      <div class="admin-stats">
        <div class="glass stat-card">
          <div class="stat-value">${reports.length}</div>
          <div class="stat-label">TOTAL REPORTS</div>
        </div>
        <div class="glass stat-card">
          <div class="stat-value" style="color:#f59e0b">${pending}</div>
          <div class="stat-label">PENDING REVIEW</div>
        </div>
        <div class="glass stat-card">
          <div class="stat-value">${users.length}</div>
          <div class="stat-label">REGISTERED USERS</div>
        </div>
        <div class="glass stat-card">
          <div class="stat-value">14</div>
          <div class="stat-label">SATELLITES ONLINE</div>
        </div>
      </div>

      <div class="glass card" style="margin-bottom:24px">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-chart-bar"></i> System Analytics</div>
        </div>
        <div style="height:260px"><canvas id="admin-chart-reports"></canvas></div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">
        <!-- Pending Reports -->
        <div class="glass card">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-exclamation-circle"></i> Pending Reports</div>
          </div>
          <div style="max-height:280px;overflow-y:auto">
            ${reports.filter(r => r.status === 'pending').length === 0 ? 
              `<div style="padding:20px;text-align:center;color:var(--text-secondary)">No pending reports</div>` : 
              reports.filter(r => r.status === 'pending').map(r => `
                <div style="padding:12px 0;border-bottom:1px solid var(--border-glass);display:flex;justify-content:space-between;align-items:center">
                  <div>
                    <div style="font-weight:600">${r.title}</div>
                    <div style="font-size:12px;color:var(--text-secondary)">${r.severity} • ${utils.formatDate(r.created_at, false)}</div>
                  </div>
                  <div>
                    <button onclick="Reports.updateStatus('${r.id}', 'approved');Admin.loadDashboard()" class="btn btn-success" style="padding:5px 11px;font-size:11px">Approve</button>
                  </div>
                </div>
              `).join('')
            }
          </div>
        </div>

        <!-- User Management -->
        <div class="glass card">
          <div class="card-header">
            <div class="card-title"><i class="fas fa-users"></i> User Management</div>
          </div>
          <div style="max-height:280px;overflow-y:auto">
            ${users.map(u => `
              <div style="display:flex;align-items:center;justify-content:space-between;padding:10px 0;border-bottom:1px solid var(--border-glass)">
                <div style="display:flex;align-items:center;gap:12px">
                  <div style="width:34px;height:34px">${utils.createAvatar(u.username, 34)}</div>
                  <div>
                    <div style="font-weight:600">${u.username}</div>
                    <div style="font-size:12px;color:var(--text-secondary)">${u.email} • ${u.role}</div>
                  </div>
                </div>
                <div>
                  ${u.role !== 'administrator' ? `
                    <button onclick="Admin.promoteUser('${u.id}', 'moderator');Admin.loadDashboard()" class="btn btn-secondary" style="padding:4px 10px;font-size:11px">Promote</button>
                    <button onclick="Admin.banUser('${u.id}');Admin.loadDashboard()" class="btn btn-danger" style="padding:4px 10px;font-size:11px">Ban</button>
                  ` : `<span style="font-size:11px;color:#22c55e">ADMIN</span>`}
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="glass card mt-4">
        <div class="card-header">
          <div class="card-title"><i class="fas fa-terminal"></i> Recent System Logs</div>
        </div>
        <div style="font-family:monospace;font-size:12.5px;color:#64748b;line-height:1.7">
          [2026-07-09 18:12] Satellite constellation sync complete (14/14)<br>
          [2026-07-09 17:58] New user registration: orbitwalker<br>
          [2026-07-09 17:41] Weather model v4.2 deployed<br>
          [2026-07-09 16:55] Emergency drill completed successfully<br>
          [2026-07-09 16:02] Realtime channel 'operations' subscribed by 5 users
        </div>
      </div>
    `;

    // Load chart
    setTimeout(() => {
      if (window.Charts) Charts.loadAdminCharts();
    }, 300);
  },

  promoteUser(userId, newRole) {
    const users = JSON.parse(localStorage.getItem('luminara_users') || '[]');
    const idx = users.findIndex(u => u.id === userId);
    if (idx === -1) return;

    users[idx].role = newRole;
    localStorage.setItem('luminara_users', JSON.stringify(users));

    // Update current session if same user
    const session = JSON.parse(localStorage.getItem('luminara_session') || '{}');
    if (session.id === userId) {
      session.role = newRole;
      localStorage.setItem('luminara_session', JSON.stringify(session));
    }

    utils.showToast(`User promoted to ${newRole}`);
  },

  banUser(userId) {
    if (!confirm('Are you sure you want to ban this user?')) return;

    let users = JSON.parse(localStorage.getItem('luminara_users') || '[]');
    users = users.filter(u => u.id !== userId);
    localStorage.setItem('luminara_users', JSON.stringify(users));

    utils.showToast('User has been banned from the system');
  }
};

window.Admin = Admin;