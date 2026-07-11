/**
 * LUMINARA - Mock Supabase Client
 * Simulates Supabase Auth, Database (PostgreSQL tables), Storage, and Realtime
 * All data persisted in localStorage for demo persistence across refreshes.
 * Designed to be API-compatible with real @supabase/supabase-js for easy migration.
 */

class MockSupabase {
  constructor() {
    this._initStorage();
    this._realtimeListeners = {};
    this._currentUser = null;
    this._loadSession();
  }

  _initStorage() {
    const tables = ['profiles', 'reports', 'weather_logs', 'chat_messages', 'notifications', 'bookmarks', 'activity_logs'];
    tables.forEach(table => {
      if (!localStorage.getItem(`luminara_${table}`)) {
        localStorage.setItem(`luminara_${table}`, JSON.stringify([]));
      }
    });
    if (!localStorage.getItem('luminara_users')) {
      // Seed demo users
      const demoUsers = [
        { id: 'u1', email: 'admin@luminara.space', password: 'password123', username: 'CommanderNova', role: 'administrator', avatar: null, experience_points: 12450, rank: 'Admiral', created_at: new Date().toISOString() },
        { id: 'u2', email: 'mod@luminara.space', password: 'password123', username: 'StarShield', role: 'moderator', avatar: null, experience_points: 7820, rank: 'Captain', created_at: new Date().toISOString() },
        { id: 'u3', email: 'user@luminara.space', password: 'password123', username: 'OrbitWalker', role: 'user', avatar: null, experience_points: 2450, rank: 'Lieutenant', created_at: new Date().toISOString() }
      ];
      localStorage.setItem('luminara_users', JSON.stringify(demoUsers));
    }
  }

  _loadSession() {
    const session = localStorage.getItem('luminara_session');
    if (session) {
      this._currentUser = JSON.parse(session);
    }
  }

  // ==================== AUTH ====================
  auth = {
    signInWithPassword: async ({ email, password }) => {
      const users = JSON.parse(localStorage.getItem('luminara_users') || '[]');
      const user = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
      if (!user) {
        return { data: null, error: { message: 'Invalid login credentials' } };
      }
      const sessionUser = { ...user };
      delete sessionUser.password;
      this._currentUser = sessionUser;
      localStorage.setItem('luminara_session', JSON.stringify(sessionUser));
      this._triggerRealtime('auth', { event: 'SIGNED_IN', session: { user: sessionUser } });
      return { data: { user: sessionUser, session: { user: sessionUser } }, error: null };
    },

    signUp: async ({ email, password, options = {} }) => {
      const users = JSON.parse(localStorage.getItem('luminara_users') || '[]');
      if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
        return { data: null, error: { message: 'User already registered' } };
      }
      const newUser = {
        id: 'u' + Date.now(),
        email: email.toLowerCase(),
        password,
        username: options.data?.username || email.split('@')[0],
        role: 'user',
        avatar: null,
        experience_points: 100,
        rank: 'Cadet',
        created_at: new Date().toISOString()
      };
      users.push(newUser);
      localStorage.setItem('luminara_users', JSON.stringify(users));

      // Create profile
      await this.from('profiles').insert({
        id: newUser.id,
        username: newUser.username,
        email: newUser.email,
        avatar: null,
        role: newUser.role,
        experience_points: newUser.experience_points,
        rank: newUser.rank
      });

      const sessionUser = { ...newUser };
      delete sessionUser.password;
      this._currentUser = sessionUser;
      localStorage.setItem('luminara_session', JSON.stringify(sessionUser));
      return { data: { user: sessionUser }, error: null };
    },

    signOut: async () => {
      this._currentUser = null;
      localStorage.removeItem('luminara_session');
      this._triggerRealtime('auth', { event: 'SIGNED_OUT' });
      return { error: null };
    },

    getUser: async () => {
      return { data: { user: this._currentUser }, error: null };
    },

    onAuthStateChange: (callback) => {
      // Simple polling simulation for demo
      const interval = setInterval(() => {
        const current = localStorage.getItem('luminara_session');
        const parsed = current ? JSON.parse(current) : null;
        if (JSON.stringify(parsed) !== JSON.stringify(this._currentUser)) {
          this._currentUser = parsed;
          callback('SIGNED_IN', { user: parsed });
        }
      }, 2000);
      return { data: { subscription: { unsubscribe: () => clearInterval(interval) } } };
    }
  };

  // ==================== DATABASE ====================
  from(table) {
    return {
      select: async (columns = '*') => {
        let data = JSON.parse(localStorage.getItem(`luminara_${table}`) || '[]');
        // Simple filter simulation (expand as needed)
        return { data, error: null };
      },

      insert: async (payload) => {
        let data = JSON.parse(localStorage.getItem(`luminara_${table}`) || '[]');
        const newRecord = {
          id: payload.id || 'rec_' + Date.now() + Math.random().toString(36).substr(2, 9),
          ...payload,
          created_at: payload.created_at || new Date().toISOString()
        };
        data.push(newRecord);
        localStorage.setItem(`luminara_${table}`, JSON.stringify(data));
        this._triggerRealtime(table, { event: 'INSERT', new: newRecord, table });
        return { data: newRecord, error: null };
      },

      update: async (payload) => {
        let data = JSON.parse(localStorage.getItem(`luminara_${table}`) || '[]');
        // For demo we assume update by id in payload or use .eq later
        const index = data.findIndex(r => r.id === payload.id);
        if (index !== -1) {
          data[index] = { ...data[index], ...payload };
          localStorage.setItem(`luminara_${table}`, JSON.stringify(data));
          this._triggerRealtime(table, { event: 'UPDATE', new: data[index], old: data[index], table });
          return { data: data[index], error: null };
        }
        return { data: null, error: { message: 'Record not found' } };
      },

      delete: async () => {
        // Simplified - use .eq('id', val) pattern in real usage
        return { data: null, error: null };
      },

      eq: (column, value) => {
        // Chainable mock for .eq()
        return {
          select: async () => {
            let data = JSON.parse(localStorage.getItem(`luminara_${table}`) || '[]');
            data = data.filter(r => r[column] == value);
            return { data, error: null };
          },
          update: async (payload) => {
            let data = JSON.parse(localStorage.getItem(`luminara_${table}`) || '[]');
            const updated = [];
            data.forEach((rec, i) => {
              if (rec[column] == value) {
                data[i] = { ...rec, ...payload };
                updated.push(data[i]);
              }
            });
            localStorage.setItem(`luminara_${table}`, JSON.stringify(data));
            updated.forEach(rec => this._triggerRealtime(table, { event: 'UPDATE', new: rec }));
            return { data: updated, error: null };
          },
          delete: async () => {
            let data = JSON.parse(localStorage.getItem(`luminara_${table}`) || '[]');
            data = data.filter(r => r[column] != value);
            localStorage.setItem(`luminara_${table}`, JSON.stringify(data));
            return { data: [], error: null };
          }
        };
      }
    };
  }

  // ==================== REALTIME ====================
  channel(name) {
    return {
      on: (eventType, filter, callback) => {
        if (!this._realtimeListeners[name]) this._realtimeListeners[name] = [];
        this._realtimeListeners[name].push({ eventType, filter, callback });
        return this.channel(name); // chainable
      },
      subscribe: (statusCallback) => {
        if (statusCallback) statusCallback('SUBSCRIBED');
        return { unsubscribe: () => { delete this._realtimeListeners[name]; } };
      }
    };
  }

  _triggerRealtime(table, payload) {
    Object.keys(this._realtimeListeners).forEach(ch => {
      const listeners = this._realtimeListeners[ch] || [];
      listeners.forEach(listener => {
        if (listener.filter && listener.filter.table === table) {
          if (!listener.filter.event || listener.filter.event === payload.event) {
            listener.callback(payload);
          }
        }
      });
    });
    // Also global listeners
    if (this._realtimeListeners['*']) {
      this._realtimeListeners['*'].forEach(l => l.callback(payload));
    }
  }

  // Storage mock (for image uploads)
  storage = {
    from: (bucket) => ({
      upload: async (path, file) => {
        // In real: upload to Supabase Storage
        // Here we store base64 in localStorage under reports or separate key
        return { data: { path }, error: null };
      },
      getPublicUrl: (path) => ({
        data: { publicUrl: `https://demo.luminara.space/storage/${bucket}/${path}` }
      })
    })
  };
}

// Export singleton
window.mockSupabase = new MockSupabase();
console.log('%c[LUMINARA] Mock Supabase initialized. Data in localStorage.', 'color:#00d4ff');