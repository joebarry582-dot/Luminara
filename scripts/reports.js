/**
 * LUMINARA Reports Module
 * Full reporting system with form, list, status management, photo upload, map sync
 */

const Reports = {
  reports: [],
  supabase: null,

  init(supabase) {
    this.supabase = supabase || window.mockSupabase;
    this._loadReports();
    this._setupForm();
    this._setupFilters();
    this.refreshList();
  },

  _loadReports() {
    this.reports = JSON.parse(localStorage.getItem('luminara_reports') || '[]');
  },

  _saveReports() {
    localStorage.setItem('luminara_reports', JSON.stringify(this.reports));
  },

  refreshList(filterStatus = 'all', filterSeverity = 'all') {
    const container = document.getElementById('report-list');
    if (!container) return;

    let filtered = [...this.reports];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(r => r.status === filterStatus);
    }
    if (filterSeverity !== 'all') {
      filtered = filtered.filter(r => r.severity === filterSeverity);
    }

    // Sort newest first
    filtered.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    if (filtered.length === 0) {
      container.innerHTML = `<div class="glass" style="padding:40px;text-align:center;color:var(--text-secondary)">No reports found matching filters.</div>`;
      return;
    }

    container.innerHTML = filtered.map(report => {
      const user = this._getUserName(report.created_by);
      const time = utils.formatDate(report.created_at);
      const hasImages = report.images && report.images.length > 0;

      return `
        <div class="report-item ${report.severity}" onclick="Reports.viewReport('${report.id}')">
          <div class="report-header">
            <div>
              <div class="report-title">${report.title}</div>
              <div style="font-size:12px;color:var(--text-secondary);margin-top:2px">${report.category || 'General'} • ${user}</div>
            </div>
            <div class="report-severity ${report.severity}">${report.severity}</div>
          </div>
          
          <div style="font-size:13.5px;color:#cbd5e1;margin:10px 0;line-height:1.4">${report.description?.substring(0, 120)}${report.description?.length > 120 ? '...' : ''}</div>
          
          <div class="report-meta">
            <span><i class="fas fa-map-marker-alt"></i> ${report.latitude ? report.latitude.toFixed(2) + ', ' + report.longitude.toFixed(2) : 'N/A'}</span>
            <span><i class="fas fa-clock"></i> ${time}</span>
            ${hasImages ? `<span><i class="fas fa-image"></i> ${report.images.length} photo${report.images.length > 1 ? 's' : ''}</span>` : ''}
            <span class="report-severity ${report.status}" style="margin-left:auto">${report.status}</span>
          </div>

          ${Auth.hasRole('moderator') || Auth.hasRole('administrator') ? `
            <div class="report-actions">
              ${report.status === 'pending' ? `
                <button onclick="event.stopImmediatePropagation();Reports.updateStatus('${report.id}', 'approved')" class="btn btn-success" style="padding:6px 14px;font-size:12px">Approve</button>
                <button onclick="event.stopImmediatePropagation();Reports.updateStatus('${report.id}', 'rejected')" class="btn btn-danger" style="padding:6px 14px;font-size:12px">Reject</button>
              ` : ''}
              <button onclick="event.stopImmediatePropagation();Reports.updateStatus('${report.id}', 'archived')" class="btn btn-secondary" style="padding:6px 14px;font-size:12px">Archive</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');
  },

  _getUserName(userId) {
    const users = JSON.parse(localStorage.getItem('luminara_users') || '[]');
    const user = users.find(u => u.id === userId);
    return user ? user.username : 'Unknown Operator';
  },

  _setupForm() {
    const form = document.getElementById('report-form');
    if (!form) return;

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      await this.submitReport(form);
    });

    // Image preview
    const imageInput = document.getElementById('report-images');
    if (imageInput) {
      imageInput.addEventListener('change', this._previewImages);
    }

    // Quick location from map if pending
    setTimeout(() => {
      if (window.pendingReportLocation) {
        const latEl = document.getElementById('report-lat');
        const lngEl = document.getElementById('report-lng');
        if (latEl) latEl.value = window.pendingReportLocation.lat.toFixed(5);
        if (lngEl) lngEl.value = window.pendingReportLocation.lng.toFixed(5);
        window.pendingReportLocation = null;
      }
    }, 500);
  },

  _previewImages(e) {
    const preview = document.getElementById('image-preview');
    if (!preview) return;
    preview.innerHTML = '';

    Array.from(e.target.files).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const img = document.createElement('img');
        img.src = ev.target.result;
        img.style.cssText = 'width:72px;height:72px;object-fit:cover;border-radius:8px;border:1px solid var(--border-glass)';
        preview.appendChild(img);
      };
      reader.readAsDataURL(file);
    });
  },

  async submitReport(form) {
    if (!Auth.requireAuth(() => {})) return;

    const title = form.querySelector('#report-title').value.trim();
    const description = form.querySelector('#report-desc').value.trim();
    const category = form.querySelector('#report-category').value;
    const severity = form.querySelector('#report-severity').value;
    const lat = parseFloat(form.querySelector('#report-lat').value);
    const lng = parseFloat(form.querySelector('#report-lng').value);

    if (!title || !description) {
      utils.showToast('Title and description are required', 'error');
      return;
    }

    // Handle image uploads (convert to base64 for demo persistence)
    const imageFiles = form.querySelector('#report-images').files;
    const imagesBase64 = [];

    for (let file of imageFiles) {
      const base64 = await new Promise(resolve => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.readAsDataURL(file);
      });
      imagesBase64.push(base64);
    }

    const newReport = {
      id: 'rep_' + Date.now(),
      title,
      description,
      category,
      severity,
      latitude: isNaN(lat) ? null : lat,
      longitude: isNaN(lng) ? null : lng,
      status: 'pending',
      images: imagesBase64,
      created_by: Auth.currentUser.id,
      created_at: new Date().toISOString()
    };

    // Save locally
    this.reports.unshift(newReport);
    this._saveReports();

    // Also insert into mock Supabase
    await this.supabase.from('reports').insert(newReport);

    // Add marker to map
    if (window.MapModule && newReport.latitude) {
      window.MapModule.refreshReportMarkers();
    }

    // Notify
    Notifications.addNotification('New Report Submitted', `${title} • ${severity.toUpperCase()}`, 'warning');

    // Log activity
    this._logActivity(`Submitted report: ${title}`);

    utils.showToast('Report submitted successfully. Awaiting review.', 'success');

    // Reset form
    form.reset();
    document.getElementById('image-preview').innerHTML = '';

    // Refresh list
    this.refreshList();

    // Switch to list view
    setTimeout(() => {
      document.getElementById('reports-list-view').scrollIntoView({ behavior: 'smooth' });
    }, 600);
  },

  async updateStatus(reportId, newStatus) {
    if (!Auth.hasRole('moderator')) {
      utils.showToast('Moderator or higher clearance required', 'error');
      return;
    }

    const reportIndex = this.reports.findIndex(r => r.id === reportId);
    if (reportIndex === -1) return;

    const oldStatus = this.reports[reportIndex].status;
    this.reports[reportIndex].status = newStatus;
    this._saveReports();

    // Update in mock DB
    await this.supabase.from('reports').update({ id: reportId, status: newStatus });

    // Refresh UI
    this.refreshList();

    if (window.MapModule) window.MapModule.refreshReportMarkers();

    Notifications.addNotification('Report Status Updated', `Report #${reportId.slice(-6)} changed from ${oldStatus} → ${newStatus}`);

    utils.showToast(`Report marked as ${newStatus}`);
  },

  viewReport(reportId) {
    const report = this.reports.find(r => r.id === reportId);
    if (!report) return;

    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `
      <div class="modal-content glass" style="max-width:620px">
        <div style="padding:24px">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
            <div>
              <span class="report-severity ${report.severity}" style="font-size:12px;padding:3px 11px">${report.severity}</span>
              <span class="report-severity ${report.status}" style="margin-left:8px;font-size:12px;padding:3px 11px">${report.status}</span>
            </div>
            <button onclick="this.closest('.modal').remove()" style="background:none;border:none;font-size:24px;color:var(--text-secondary);cursor:pointer">×</button>
          </div>

          <h2 style="margin-bottom:8px">${report.title}</h2>
          <div style="color:var(--text-secondary);margin-bottom:18px">${report.category} • Reported by ${this._getUserName(report.created_by)} • ${utils.formatDate(report.created_at)}</div>

          <p style="line-height:1.65;margin-bottom:20px">${report.description}</p>

          ${report.latitude ? `<div style="margin-bottom:18px"><strong>Location:</strong> <span style="font-family:monospace">${report.latitude.toFixed(5)}, ${report.longitude.toFixed(5)}</span> <button onclick="MapModule.focusReport('${report.id}');this.closest('.modal').remove()" class="btn btn-secondary" style="padding:4px 12px;margin-left:10px;font-size:12px">Show on Map</button></div>` : ''}

          ${report.images && report.images.length > 0 ? `
            <div style="margin-bottom:20px">
              <strong style="display:block;margin-bottom:8px">Attached Imagery (${report.images.length})</strong>
              <div style="display:flex;gap:10px;flex-wrap:wrap">
                ${report.images.map((img, i) => `<img src="${img}" style="width:110px;height:110px;object-fit:cover;border-radius:10px;border:1px solid var(--border-glass)" onclick="window.open('${img}', '_blank')">`).join('')}
              </div>
            </div>
          ` : ''}

          <div style="display:flex;gap:12px;margin-top:24px">
            ${Auth.hasRole('moderator') && report.status === 'pending' ? `
              <button onclick="Reports.updateStatus('${report.id}', 'approved');this.closest('.modal').remove()" class="btn btn-success">Approve Report</button>
              <button onclick="Reports.updateStatus('${report.id}', 'rejected');this.closest('.modal').remove()" class="btn btn-danger">Reject</button>
            ` : ''}
            <button onclick="this.closest('.modal').remove()" class="btn btn-secondary" style="margin-left:auto">Close</button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
  },

  _setupFilters() {
    const statusFilter = document.getElementById('filter-status');
    const severityFilter = document.getElementById('filter-severity');

    if (statusFilter) {
      statusFilter.addEventListener('change', () => {
        this.refreshList(statusFilter.value, severityFilter?.value || 'all');
      });
    }
    if (severityFilter) {
      severityFilter.addEventListener('change', () => {
        this.refreshList(statusFilter?.value || 'all', severityFilter.value);
      });
    }
  },

  _logActivity(action) {
    let logs = JSON.parse(localStorage.getItem('luminara_activity') || '[]');
    logs.unshift({ action, timestamp: new Date().toISOString() });
    localStorage.setItem('luminara_activity', JSON.stringify(logs.slice(0, 20)));
  }
};

window.Reports = Reports;