/**
 * LUMINARA Map Module - Professional GIS Dashboard with Leaflet
 * Features: Multiple layers, overlays, drawing, search, bookmarks, GPS, report markers
 */

const MapModule = {
  map: null,
  markers: [],
  reportMarkers: [],
  initialized: false,
  currentLayer: 'satellite',
  drawingPoints: [],
  distanceLine: null,

  initMap() {
    if (this.initialized) return;
    const container = document.getElementById('map');
    if (!container) return;

    // Initialize Leaflet map
    this.map = L.map(container, {
      zoomControl: false,
      attributionControl: false
    }).setView([8.5, 125.5], 5); // Southeast Asia / Pacific region - good for satellite command demo

    // Add zoom control nicely
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // Base layers
    this.layers = {
      satellite: L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        className: 'map-tiles'
      }),
      terrain: L.tileLayer('https://stamen-tiles.a.ssl.fastly.net/terrain/{z}/{x}/{y}.jpg', {
        maxZoom: 18
      }),
      street: L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      }),
      dark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
      })
    };

    // Start with satellite
    this.layers.satellite.addTo(this.map);
    this.currentLayer = 'satellite';

    // Add some initial demo markers (reports, weather stations, events)
    this._addDemoMarkers();

    // Map click handler for location picking + reporting
    this.map.on('click', (e) => {
      this._onMapClick(e);
    });

    // Setup layer control buttons (already in HTML)
    this._setupLayerControls();

    // Setup drawing / measurement tool
    this._setupDrawingTools();

    // Search bar
    this._setupSearch();

    // GPS button
    this._setupGPS();

    this.initialized = true;
    console.log('%c[LUMINARA Map] Professional GIS dashboard ready', 'color:#00d4ff');

    // Expose globally for other modules
    window.LuminaraMap = this.map;
  },

  _addDemoMarkers() {
    // Clear existing
    this.markers.forEach(m => m.remove());
    this.markers = [];

    const demoEvents = [
      { lat: 14.6, lng: 121.0, title: 'Weather Station Alpha', type: 'weather', desc: 'Live telemetry online' },
      { lat: 7.2, lng: 151.8, title: 'Typhoon Watch Zone', type: 'typhoon', desc: 'Category 2 developing' },
      { lat: -1.3, lng: 120.5, title: 'Seismic Activity', type: 'earthquake', desc: 'M4.8 detected 38min ago' },
      { lat: 19.4, lng: 155.3, title: 'Volcano Monitoring', type: 'volcano', desc: 'Kilauea - elevated alert' }
    ];

    demoEvents.forEach(ev => {
      const iconColor = ev.type === 'typhoon' ? '#f59e0b' : ev.type === 'earthquake' ? '#ef4444' : ev.type === 'volcano' ? '#a855f7' : '#22c55e';
      const iconHtml = `<div style="background:${iconColor};width:18px;height:18px;border-radius:50%;border:3px solid #0a0f1e;box-shadow:0 0 12px ${iconColor}"></div>`;
      
      const marker = L.marker([ev.lat, ev.lng], {
        icon: L.divIcon({
          className: 'custom-marker',
          html: iconHtml,
          iconSize: [24, 24],
          iconAnchor: [12, 12]
        })
      }).addTo(this.map);

      marker.bindPopup(`
        <strong>${ev.title}</strong><br>
        <span style="color:#a0b8d0">${ev.desc}</span><br>
        <small style="color:#64748b">${ev.lat.toFixed(2)}°, ${ev.lng.toFixed(2)}°</small>
      `);
      this.markers.push(marker);
    });

    // Load existing reports as markers
    this._loadReportMarkers();
  },

  _loadReportMarkers() {
    // Remove old report markers
    this.reportMarkers.forEach(m => m.remove());
    this.reportMarkers = [];

    const reports = JSON.parse(localStorage.getItem('luminara_reports') || '[]');
    
    reports.forEach(report => {
      if (!report.latitude || !report.longitude) return;

      const color = report.severity === 'critical' ? '#ef4444' : 
                    report.severity === 'high' ? '#f59e0b' : 
                    report.severity === 'medium' ? '#eab308' : '#22c55e';

      const marker = L.marker([report.latitude, report.longitude], {
        icon: L.divIcon({
          className: 'custom-marker report-marker',
          html: `<div style="background:${color};width:14px;height:14px;border-radius:3px;border:2px solid #fff;box-shadow:0 0 8px ${color}"></div>`,
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        })
      }).addTo(this.map);

      marker.bindPopup(`
        <div style="min-width:220px">
          <div style="font-weight:700;margin-bottom:6px">${report.title}</div>
          <div style="font-size:12.5px;margin-bottom:8px;color:#64748b">${report.description?.substring(0,110)}...</div>
          <div style="display:flex;justify-content:space-between;align-items:center">
            <span class="report-severity ${report.severity}" style="font-size:10px;padding:1px 8px">${report.severity}</span>
            <button onclick="MapModule.focusReport('${report.id}');event.stopImmediatePropagation()" class="btn btn-primary" style="padding:4px 12px;font-size:11px">View Details</button>
          </div>
        </div>
      `);

      this.reportMarkers.push(marker);
    });
  },

  refreshReportMarkers() {
    this._loadReportMarkers();
  },

  _onMapClick(e) {
    const { lat, lng } = e.latlng;

    // Create a temporary popup with actions
    const popupContent = `
      <div style="min-width:200px">
        <div style="margin-bottom:10px"><strong>Coordinates</strong><br><span style="font-family:monospace">${lat.toFixed(5)}, ${lng.toFixed(5)}</span></div>
        <div style="display:flex;flex-direction:column;gap:8px">
          <button onclick="MapModule.setReportLocation(${lat}, ${lng});event.target.closest('.leaflet-popup').remove()" class="btn btn-primary" style="width:100%;padding:9px">📍 Use for New Report</button>
          <button onclick="Profile.saveBookmark(${lat}, ${lng}, 'Quick Bookmark');event.target.closest('.leaflet-popup').remove()" class="btn btn-secondary" style="width:100%;padding:9px">🔖 Bookmark Location</button>
          <button onclick="MapModule.measureFromHere(${lat}, ${lng});event.target.closest('.leaflet-popup').remove()" class="btn btn-secondary" style="width:100%;padding:9px">📏 Measure Distance</button>
        </div>
      </div>
    `;

    L.popup()
      .setLatLng(e.latlng)
      .setContent(popupContent)
      .openOn(this.map);
  },

  setReportLocation(lat, lng) {
    // Store for reports module
    window.pendingReportLocation = { lat, lng };
    
    // Switch to reports page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById('page-reports').classList.add('active');
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById('nav-reports').classList.add('active');

    // Pre-fill form location
    setTimeout(() => {
      const latInput = document.getElementById('report-lat');
      const lngInput = document.getElementById('report-lng');
      if (latInput) latInput.value = lat.toFixed(5);
      if (lngInput) lngInput.value = lng.toFixed(5);
      utils.showToast('Location set from map. Complete the report form.');
    }, 180);
  },

  focusReport(reportId) {
    const reports = JSON.parse(localStorage.getItem('luminara_reports') || '[]');
    const report = reports.find(r => r.id === reportId);
    if (!report || !report.latitude) return;

    this.map.flyTo([report.latitude, report.longitude], 9, { duration: 1.2 });
    
    // Open popup on matching marker
    setTimeout(() => {
      this.reportMarkers.forEach(m => {
        if (m.getLatLng().lat.toFixed(4) === report.latitude.toFixed(4)) {
          m.openPopup();
        }
      });
    }, 1300);
  },

  switchBaseLayer(layerName) {
    if (!this.layers[layerName] || !this.map) return;

    // Remove current
    Object.values(this.layers).forEach(l => this.map.removeLayer(l));
    
    // Add new
    this.layers[layerName].addTo(this.map);
    this.currentLayer = layerName;

    // Update active button state
    document.querySelectorAll('.map-control-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.layer === layerName);
    });
  },

  _setupLayerControls() {
    // The buttons are already in the HTML (see index.html)
    // We just attach listeners here
    setTimeout(() => {
      document.querySelectorAll('.map-control-btn[data-layer]').forEach(btn => {
        btn.addEventListener('click', () => {
          const layer = btn.dataset.layer;
          this.switchBaseLayer(layer);
        });
      });

      // Overlay toggles (simulated)
      document.getElementById('overlay-weather')?.addEventListener('click', () => this._toggleOverlay('weather'));
      document.getElementById('overlay-earthquake')?.addEventListener('click', () => this._toggleOverlay('earthquake'));
      document.getElementById('overlay-typhoon')?.addEventListener('click', () => this._toggleOverlay('typhoon'));
    }, 300);
  },

  _toggleOverlay(type) {
    const btn = document.getElementById(`overlay-${type}`);
    if (!btn) return;

    btn.classList.toggle('active');

    if (btn.classList.contains('active')) {
      this._addOverlayMarkers(type);
      utils.showToast(`${type.charAt(0).toUpperCase() + type.slice(1)} layer enabled`);
    } else {
      this._removeOverlayMarkers(type);
    }
  },

  _addOverlayMarkers(type) {
    // Simple demo overlays
    const positions = {
      weather: [[10.2, 130.1], [6.8, 142.3]],
      earthquake: [[-4.1, 135.6], [13.5, 122.8]],
      typhoon: [[15.1, 138.4]]
    };

    if (!this[`overlay_${type}`]) this[`overlay_${type}`] = [];

    positions[type]?.forEach((pos, idx) => {
      const marker = L.marker(pos, {
        icon: L.divIcon({
          className: 'custom-marker',
          html: `<div style="width:22px;height:22px;border:3px solid #fff;border-radius:50%;background:rgba(245,158,11,0.7);box-shadow:0 0 15px #f59e0b"></div>`,
          iconSize: [22, 22]
        })
      }).addTo(this.map).bindPopup(`<strong>${type.toUpperCase()} Event #${idx+1}</strong><br>Live satellite feed`);
      this[`overlay_${type}`].push(marker);
    });
  },

  _removeOverlayMarkers(type) {
    if (this[`overlay_${type}`]) {
      this[`overlay_${type}`].forEach(m => m.remove());
      this[`overlay_${type}`] = [];
    }
  },

  _setupDrawingTools() {
    // Simple distance measurement tool
    const measureBtn = document.getElementById('btn-measure');
    if (measureBtn) {
      measureBtn.addEventListener('click', () => {
        this.startMeasurement();
      });
    }
  },

  startMeasurement() {
    if (this.drawingPoints.length > 0) {
      this._clearMeasurement();
      return;
    }

    utils.showToast('Click on map to start measuring distance. Click again to finish.');

    const clickHandler = (e) => {
      this.drawingPoints.push(e.latlng);

      if (this.drawingPoints.length === 1) {
        L.marker(e.latlng, { icon: L.divIcon({ html: '📍', className: '', iconSize: [20,20] }) }).addTo(this.map);
      } else if (this.drawingPoints.length === 2) {
        // Draw line
        if (this.distanceLine) this.distanceLine.remove();
        this.distanceLine = L.polyline(this.drawingPoints, { color: '#00d4ff', weight: 3, opacity: 0.9 }).addTo(this.map);

        const dist = this.map.distance(this.drawingPoints[0], this.drawingPoints[1]) / 1000; // km
        const mid = L.latLng(
          (this.drawingPoints[0].lat + this.drawingPoints[1].lat) / 2,
          (this.drawingPoints[0].lng + this.drawingPoints[1].lng) / 2
        );

        L.popup()
          .setLatLng(mid)
          .setContent(`<strong>Distance:</strong> ${dist.toFixed(1)} km`)
          .openOn(this.map);

        this.map.off('click', clickHandler);
        setTimeout(() => this._clearMeasurement(), 4200);
      }
    };

    this.map.on('click', clickHandler);
  },

  _clearMeasurement() {
    this.drawingPoints = [];
    if (this.distanceLine) {
      this.distanceLine.remove();
      this.distanceLine = null;
    }
    // remove temp markers if any (simplified)
  },

  _setupSearch() {
    const searchInput = document.getElementById('map-search');
    if (!searchInput) return;

    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        const query = searchInput.value.trim();
        if (!query) return;
        this._fakeGeocodeSearch(query);
      }
    });
  },

  _fakeGeocodeSearch(query) {
    // Demo locations
    const known = {
      'manila': [14.5995, 120.9842],
      'tokyo': [35.6762, 139.6503],
      'singapore': [1.3521, 103.8198],
      'sydney': [-33.8688, 151.2093],
      'hawaii': [19.8968, -155.5828],
      'command center': [8.5, 125.5]
    };

    const lower = query.toLowerCase();
    let found = null;
    for (let key in known) {
      if (lower.includes(key)) {
        found = known[key];
        break;
      }
    }

    if (found) {
      this.map.flyTo(found, 8, { duration: 1.4 });
      L.popup().setLatLng(found).setContent(`<strong>${query}</strong><br>Coordinates: ${found[0].toFixed(3)}, ${found[1].toFixed(3)}`).openOn(this.map);
    } else {
      // Random nearby point for demo
      const center = this.map.getCenter();
      const randLat = center.lat + (Math.random() - 0.5) * 4;
      const randLng = center.lng + (Math.random() - 0.5) * 4;
      this.map.flyTo([randLat, randLng], 7);
      utils.showToast(`Showing approximate results for "${query}"`);
    }
    document.getElementById('map-search').value = '';
  },

  _setupGPS() {
    const gpsBtn = document.getElementById('btn-gps');
    if (gpsBtn) {
      gpsBtn.addEventListener('click', () => {
        if (!navigator.geolocation) {
          utils.showToast('Geolocation not supported by your browser', 'error');
          return;
        }
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            this.map.flyTo([latitude, longitude], 10, { duration: 1.6 });
            L.marker([latitude, longitude], {
              icon: L.divIcon({
                html: `<div style="width:16px;height:16px;background:#22c55e;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px #22c55e"></div>`,
                className: '',
                iconSize: [16,16]
              })
            }).addTo(this.map).bindPopup('Your current location').openPopup();
            utils.showToast('GPS location acquired');
          },
          () => utils.showToast('Unable to retrieve your location', 'error')
        );
      });
    }
  },

  measureFromHere(lat, lng) {
    this.drawingPoints = [L.latLng(lat, lng)];
    utils.showToast('Now click another point on the map to measure distance');
    // Reuse the measurement handler
    const handler = (e) => {
      this.drawingPoints.push(e.latlng);
      if (this.distanceLine) this.distanceLine.remove();
      this.distanceLine = L.polyline(this.drawingPoints, { color: '#00d4ff', weight: 3 }).addTo(this.map);
      const dist = this.map.distance(this.drawingPoints[0], this.drawingPoints[1]) / 1000;
      L.popup().setLatLng(e.latlng).setContent(`Distance: ${dist.toFixed(1)} km`).openOn(this.map);
      this.map.off('click', handler);
      setTimeout(() => this._clearMeasurement(), 5000);
    };
    this.map.once('click', handler);
  }
};

window.MapModule = MapModule;