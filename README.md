# LUMINARA Satellite Command

A complete futuristic full-stack web application simulating a professional NASA-style satellite command center.

## Features Implemented

- **Futuristic Glassmorphism UI**: Dark theme with neon accents, blur effects, glowing elements, satellite-themed animations.
- **Loading Screen**: Animated satellite launch sequence with progress.
- **Authentication System**: Beautiful login/signup modal with validation, remember me, session persistence via localStorage (mock Supabase Auth).
- **User Roles**: Admin, Moderator, User with different permissions (UI gated).
- **Interactive GIS Map** (Leaflet.js): Multiple base layers (Satellite, Terrain, Street, Dark), simulated overlays (Weather, Earthquakes, Typhoons, etc.), marker clustering simulation, drawing/distance tool, search, bookmarks, user GPS, report markers synced.
- **Weather Dashboard**: Dynamic cards with simulated live data, gauges.
- **Reporting System**: Submit reports with title, desc, category, severity, photo upload (base64), location from map click or form. List, filter, status updates (for admins/mods). Synced to map.
- **AI Assistant "Lumizia"**: Floating chatbot with quick prompts, keyword-based intelligent responses, conversation history (local persist), voice input (Web Speech API), text-to-speech output.
- **Radio Communication**: Multi-channel realtime-style chat (General, Emergency, Weather, Operations), typing indicators, timestamps, simulated other users + admin announcements, online users list.
- **Analytics & Charts** (Chart.js): Dynamic charts for reports, weather trends, updated live.
- **Admin Dashboard**: Stats, pending reports management (approve/reject/archive), user list (mock), system logs.
- **User Profile**: View/edit avatar (initials or upload preview), rank/XP (simulated), achievements, activity log, saved locations (bookmarks), theme settings.
- **Notifications**: Realtime-style bell with dropdown, auto notifications for new reports, messages, alerts.
- **Settings**: Theme switcher (Dark, Blue Neon, Purple Void), notification toggles, language (UI only).
- **Performance**: Responsive (mobile/tablet/desktop), smooth animations, lazy-ish sections.
- **Security Mock**: Role-based UI, protected sections.

## Tech Stack (Demo)
- **Frontend**: HTML5, CSS3 (glassmorphism, custom properties, animations), Vanilla JS (ES6 modules simulation), Leaflet.js (CDN), Chart.js (CDN)
- **Backend Simulation**: Custom MockSupabase class using localStorage (mimics tables, auth, realtime subscriptions). Easy to replace with real @supabase/supabase-js.
- **No external backend needed for demo** - fully functional offline after initial load (CDNs for libs).

## Project Structure
```
/luminara-satellite-command/
├── index.html              # Main application entry point
├── README.md
├── styles/
│   └── main.css            # All futuristic styling, themes, animations
├── scripts/
│   ├── app.js              # Core app initialization, navigation, UI state
│   ├── auth.js             # Login, signup, session, role handling (mock)
│   ├── map.js              # Leaflet map setup, layers, tools, interactions
│   ├── reports.js          # Report submission, listing, management, map sync
│   ├── ai.js               # Lumizia AI assistant, voice, history
│   ├── radio.js            # Multi-channel chat, typing, online users
│   ├── admin.js            # Admin-only dashboard and controls
│   ├── notifications.js    # Notification center and realtime alerts
│   ├── profile.js          # Profile view, edits, bookmarks, activity
│   ├── charts.js           # Chart.js visualizations and updates
│   ├── mock-supabase.js    # Full mock Supabase client (tables, auth, realtime)
│   └── utils.js            # Helpers: formatters, generators, storage
├── assets/                 # Placeholder for future images/icons
│   └── (add your satellite imagery, logos here)
└── supabase/               # For real integration
    └── README.md           # Instructions to connect real Supabase
```

## How to Run (Demo - No Setup Needed)
1. Open the folder in VS Code or any editor.
2. Open `index.html` directly in a modern browser (Chrome/Firefox/Edge recommended) **OR** better: use a local server for module-like feel:
   ```bash
   cd luminara-satellite-command
   npx serve . -p 8080
   # or python -m http.server 8080
   ```
3. Enjoy the full experience! All data persists in browser localStorage.

**Note on CDNs**: The app uses CDNs for Leaflet and Chart.js. Works online or cached. For offline/airgapped, download the libs and replace src.

## Switching to Real Supabase (Production)
See `supabase/README.md` for step-by-step migration guide. The mock is designed to be API-compatible in structure (async methods, .from(), .select(), realtime .on()).

## Demo Credentials
- **Administrator**: admin@luminara.space / password123 (full access)
- **Moderator**: mod@luminara.space / password123
- **User**: user@luminara.space / password123
- Or **Sign Up** new account (role defaults to "user", can promote in admin panel for demo)

## Key Interactions
- Click map to set report location or use search.
- Submit emergency reports from quick actions or Reports panel.
- Talk to Lumizia AI (try "What's the weather?", "Predict disaster risk", "Explain the map").
- Use mic in AI for voice commands.
- Radio: switch channels, type messages (others "reply" occasionally).
- Admin: Go to Admin tab (only visible for admin role), manage reports/users.
- Themes: Settings > change and see instant neon color shifts.
- Bookmarks: On map, click location > "Bookmark this location" (saves to profile).

## Future Enhancements (Production)
- Real Supabase + Row Level Security (RLS) policies per table/role.
- Image upload to Supabase Storage with signed URLs.
- Real Geocoding (Mapbox or Photon) + reverse.
- Leaflet plugins: markercluster, draw, heat, timeline.
- Backend cron for simulated weather satellite data.
- PWA installable, offline support with service worker.
- Voice AI with real LLM (e.g. integrate Grok API or OpenAI).

Built with ❤️ for space exploration simulation. Command the stars.

---

**To customize further**: Edit the JS files. All major functions are commented.
