/**
 * LUMINARA Radio Communication System
 * Multi-channel realtime chat simulation with typing indicators, online users, announcements
 */

const Radio = {
  currentChannel: 'general',
  messages: {},
  onlineUsers: [],
  typingTimeout: null,
  supabase: null,

  init(supabase) {
    this.supabase = supabase || window.mockSupabase;
    this._loadMessages();
    this._initOnlineUsers();
    this._setupChannelListeners();
    this.refreshUI();
  },

  _loadMessages() {
    const saved = localStorage.getItem('luminara_radio_messages');
    this.messages = saved ? JSON.parse(saved) : {
      general: [],
      emergency: [],
      weather: [],
      operations: []
    };
  },

  _saveMessages() {
    localStorage.setItem('luminara_radio_messages', JSON.stringify(this.messages));
  },

  _initOnlineUsers() {
    // Demo online crew
    this.onlineUsers = [
      { id: 'u1', username: 'CommanderNova', role: 'administrator', status: 'online' },
      { id: 'u2', username: 'StarShield', role: 'moderator', status: 'online' },
      { id: 'u4', username: 'CosmicEcho', role: 'user', status: 'online' },
      { id: 'u5', username: 'NebulaOps', role: 'user', status: 'online' },
      { id: 'u6', username: 'AstroWatch', role: 'user', status: 'online' }
    ];
  },

  refreshUI() {
    this._renderChannels();
    this._renderChatWindow();
    this._renderOnlineUsers();
  },

  _renderChannels() {
    const container = document.getElementById('channel-list');
    if (!container) return;

    const channels = [
      { id: 'general', name: 'General Ops', icon: 'fa-satellite' },
      { id: 'emergency', name: 'Emergency', icon: 'fa-exclamation-triangle' },
      { id: 'weather', name: 'Weather Intel', icon: 'fa-cloud-sun' },
      { id: 'operations', name: 'Operations', icon: 'fa-rocket' }
    ];

    container.innerHTML = channels.map(ch => `
      <div class="channel-item ${this.currentChannel === ch.id ? 'active' : ''}" onclick="Radio.switchChannel('${ch.id}')">
        <div class="icon"><i class="fas ${ch.icon}"></i></div>
        <div style="flex:1">
          <div style="font-weight:600">${ch.name}</div>
          <div style="font-size:11px;color:var(--text-secondary)">${this.messages[ch.id]?.length || 0} messages</div>
        </div>
      </div>
    `).join('');
  },

  switchChannel(channelId) {
    this.currentChannel = channelId;
    this.refreshUI();
  },

  _renderChatWindow() {
    const container = document.getElementById('chat-messages');
    if (!container) return;

    const msgs = this.messages[this.currentChannel] || [];
    
    container.innerHTML = msgs.length === 0 ? 
      `<div style="text-align:center;padding:60px 20px;color:var(--text-secondary)">No messages in this channel yet.<br>Be the first to transmit.</div>` : '';

    msgs.forEach(msg => {
      const isOwn = msg.user_id === Auth.currentUser?.id;
      const div = document.createElement('div');
      div.className = `chat-message ${isOwn ? 'own' : ''}`;
      div.innerHTML = `
        ${!isOwn ? `<div class="chat-avatar">${msg.username?.slice(0,2).toUpperCase() || 'OP'}</div>` : ''}
        <div style="flex:1">
          <div class="chat-bubble">
            ${msg.message}
            ${msg.isAnnouncement ? `<div style="margin-top:6px;font-size:10px;opacity:0.7">📢 OFFICIAL ANNOUNCEMENT</div>` : ''}
          </div>
          <div class="chat-meta">${msg.username || 'System'} • ${utils.formatDate(msg.created_at, true)}</div>
        </div>
      `;
      container.appendChild(div);
    });

    container.scrollTop = container.scrollHeight;

    // Setup input
    this._setupChatInput();
  },

  _setupChatInput() {
    const inputArea = document.getElementById('chat-input-area');
    if (!inputArea) return;

    // Only setup once
    if (inputArea.dataset.setup) return;
    inputArea.dataset.setup = 'true';

    inputArea.innerHTML = `
      <input type="text" id="radio-input" class="input" placeholder="Transmit message on ${this.currentChannel} channel..." style="flex:1;border-radius:999px">
      <button onclick="Radio.sendMessage()" class="btn btn-primary" style="padding:0 22px;border-radius:999px">SEND</button>
    `;

    const input = document.getElementById('radio-input');
    if (input) {
      input.addEventListener('input', () => this._showTypingIndicator());
      input.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') this.sendMessage();
      });
    }
  },

  _showTypingIndicator() {
    clearTimeout(this.typingTimeout);
    const container = document.getElementById('chat-messages');
    if (!container) return;

    let indicator = document.getElementById('typing-indicator');
    if (!indicator) {
      indicator = document.createElement('div');
      indicator.id = 'typing-indicator';
      indicator.style.cssText = 'padding:4px 16px;font-size:12px;color:var(--text-secondary);font-style:italic';
      indicator.innerHTML = 'Someone is typing...';
      container.appendChild(indicator);
    }

    this.typingTimeout = setTimeout(() => {
      if (indicator && indicator.parentNode) indicator.parentNode.removeChild(indicator);
    }, 1600);
  },

  async sendMessage() {
    const input = document.getElementById('radio-input');
    if (!input || !input.value.trim()) return;

    const messageText = input.value.trim();
    const user = Auth.currentUser;

    const newMsg = {
      id: 'msg_' + Date.now(),
      user_id: user?.id || 'guest',
      username: user?.username || 'Guest Operator',
      message: messageText,
      channel: this.currentChannel,
      created_at: new Date().toISOString(),
      isAnnouncement: false
    };

    if (!this.messages[this.currentChannel]) this.messages[this.currentChannel] = [];
    this.messages[this.currentChannel].push(newMsg);
    this._saveMessages();

    // Simulate other user replies occasionally in demo
    if (Math.random() > 0.65 && this.currentChannel !== 'emergency') {
      setTimeout(() => this._simulateReply(), 1400 + Math.random() * 2200);
    }

    input.value = '';
    this.refreshUI();

    // Store in mock DB
    await this.supabase.from('chat_messages').insert(newMsg);

    Notifications.addNotification('Radio Message Sent', `Transmitted on ${this.currentChannel}`, 'info');
  },

  _simulateReply() {
    const replies = {
      general: ['Copy that.', 'Affirmative, monitoring.', 'Roger. All systems nominal.', 'Standing by for further instructions.'],
      weather: ['Updated satellite pass confirms trend.', 'Wind shear models updated.', 'Precipitation probability increasing slightly.'],
      operations: ['Telemetry link stable.', 'Next orbit window in 47 minutes.', 'Ground station handshake complete.']
    };

    const pool = replies[this.currentChannel] || replies.general;
    const replyText = pool[Math.floor(Math.random() * pool.length)];
    const randomUser = this.onlineUsers[Math.floor(Math.random() * this.onlineUsers.length)];

    const replyMsg = {
      id: 'msg_' + Date.now(),
      user_id: randomUser.id,
      username: randomUser.username,
      message: replyText,
      channel: this.currentChannel,
      created_at: new Date().toISOString()
    };

    if (!this.messages[this.currentChannel]) this.messages[this.currentChannel] = [];
    this.messages[this.currentChannel].push(replyMsg);
    this._saveMessages();
    this.refreshUI();
  },

  sendAnnouncement(text) {
    if (!Auth.hasRole('administrator')) {
      utils.showToast('Only administrators can broadcast announcements', 'error');
      return;
    }

    const user = Auth.currentUser;
    const ann = {
      id: 'ann_' + Date.now(),
      user_id: user.id,
      username: 'COMMAND',
      message: text,
      channel: this.currentChannel,
      created_at: new Date().toISOString(),
      isAnnouncement: true
    };

    if (!this.messages[this.currentChannel]) this.messages[this.currentChannel] = [];
    this.messages[this.currentChannel].push(ann);
    this._saveMessages();
    this.refreshUI();

    Notifications.addNotification('Official Announcement', text.substring(0, 60) + '...', 'warning');
    utils.showToast('Announcement broadcast to all channels');
  },

  _renderOnlineUsers() {
    const container = document.getElementById('online-users-list');
    if (!container) return;

    container.innerHTML = this.onlineUsers.map(u => `
      <div class="online-user">
        <div class="chat-avatar" style="width:26px;height:26px;font-size:11px">${u.username.slice(0,2).toUpperCase()}</div>
        <div style="flex:1">
          <div style="font-weight:600;font-size:13.5px">${u.username}</div>
          <div style="font-size:10px;color:var(--text-secondary)">${u.role}</div>
        </div>
        <div class="status-dot"></div>
      </div>
    `).join('');
  },

  _setupChannelListeners() {
    // Can add more realtime simulation here if needed
  }
};

window.Radio = Radio;