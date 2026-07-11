/**
 * LUMINARA Charts Module - Analytics visualizations with Chart.js
 */

const Charts = {
  charts: {},

  init() {
    // Will be called on demand when pages load
    this._loadChartJsIfNeeded();
  },

  _loadChartJsIfNeeded() {
    if (window.Chart) return Promise.resolve();
    return new Promise((resolve) => {
      const script = document.createElement('script');
      script.src = 'https://cdn.jsdelivr.net/npm/chart.js';
      script.onload = resolve;
      document.head.appendChild(script);
    });
  },

  async updateOverviewCharts() {
    await this._loadChartJsIfNeeded();

    // Reports by Severity - Doughnut
    this._createOrUpdateChart('chart-severity', {
      type: 'doughnut',
      data: {
        labels: ['Critical', 'High', 'Medium', 'Low'],
        datasets: [{
          data: this._getSeverityCounts(),
          backgroundColor: ['#ef4444', '#f59e0b', '#eab308', '#22c55e'],
          borderWidth: 0
        }]
      },
      options: { 
        responsive: true, 
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom', labels: { color: '#a0b8d0', padding: 16 } } }
      }
    });

    // Weather Trend - Line
    this._createOrUpdateChart('chart-weather', {
      type: 'line',
      data: {
        labels: ['6h ago', '5h', '4h', '3h', '2h', 'Now'],
        datasets: [{
          label: 'Temperature (°C)',
          data: this._getWeatherTrend('temperature'),
          borderColor: '#00d4ff',
          tension: 0.4,
          fill: false
        }, {
          label: 'Wind (kts)',
          data: this._getWeatherTrend('wind'),
          borderColor: '#a855f7',
          tension: 0.4,
          fill: false
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#64748b' } },
          y: { grid: { color: 'rgba(255,255,255,0.08)' }, ticks: { color: '#64748b' } }
        },
        plugins: { legend: { labels: { color: '#a0b8d0' } } }
      }
    });
  },

  async loadAdminCharts() {
    await this._loadChartJsIfNeeded();

    // Reports over time
    this._createOrUpdateChart('admin-chart-reports', {
      type: 'bar',
      data: {
        labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
        datasets: [{
          label: 'Reports Submitted',
          data: [4, 7, 3, 9, 12, 5, 8],
          backgroundColor: '#00d4ff'
        }]
      },
      options: {
        responsive: true,
        scales: {
          x: { grid: { color: 'rgba(255,255,255,0.08)' } },
          y: { grid: { color: 'rgba(255,255,255,0.08)' } }
        }
      }
    });
  },

  _createOrUpdateChart(canvasId, config) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    if (this.charts[canvasId]) {
      this.charts[canvasId].destroy();
    }

    const ctx = canvas.getContext('2d');
    this.charts[canvasId] = new Chart(ctx, config);
  },

  _getSeverityCounts() {
    const reports = JSON.parse(localStorage.getItem('luminara_reports') || '[]');
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    reports.forEach(r => {
      if (counts[r.severity] !== undefined) counts[r.severity]++;
    });
    return [counts.critical, counts.high, counts.medium, counts.low];
  },

  _getWeatherTrend(field) {
    const logs = JSON.parse(localStorage.getItem('luminara_weather_logs') || '[]');
    if (logs.length === 0) return [26, 27, 25, 28, 27, 27.4];
    
    return logs.slice(0, 6).reverse().map(log => {
      if (field === 'temperature') return parseFloat(log.temperature.toFixed(1));
      if (field === 'wind') return parseFloat(log.wind.toFixed(1));
      return 0;
    });
  }
};

window.Charts = Charts;