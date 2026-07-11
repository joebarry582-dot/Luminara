/**
 * LUMINARA AI Assistant - "Lumizia"
 * Floating chatbot with voice input/output, smart responses, history
 */

const AI = {
  history: [],
  isOpen: false,
  recognition: null,
  synth: window.speechSynthesis,
  supabase: null,

  init(supabase) {
    this.supabase = supabase || window.mockSupabase;
    this._loadHistory();
    this._createFloatingButton();
    this._setupVoiceRecognition();
  },

  _loadHistory() {
    const saved = localStorage.getItem('luminara_ai_history');
    this.history = saved ? JSON.parse(saved) : [];
  },

  _saveHistory() {
    localStorage.setItem('luminara_ai_history', JSON.stringify(this.history.slice(-30)));
  },

  _createFloatingButton() {
    const btn = document.createElement('button');
    btn.id = 'ai-floating-btn';
    btn.innerHTML = '🧠';
    btn.title = 'Ask Lumizia AI (⌘/)';
    btn.onclick = () => this.togglePanel();
    document.body.appendChild(btn);
  },

  togglePanel() {
    let panel = document.getElementById('ai-panel');
    
    if (!panel) {
      panel = this._createPanel();
      document.body.appendChild(panel);
    }

    this.isOpen = !this.isOpen;
    panel.style.display = this.isOpen ? 'flex' : 'none';

    if (this.isOpen) {
      const input = panel.querySelector('.ai-input');
      if (input) input.focus();
      this._renderChat(panel);
    }
  },

  _createPanel() {
    const panel = document.createElement('div');
    panel.id = 'ai-panel';
    panel.className = 'ai-panel glass';
    panel.style.display = 'none';

    panel.innerHTML = `
      <div class="ai-header">
        <div class="title">
          <span style="font-size:22px">🧠</span> 
          <span>Lumizia AI</span>
          <span style="font-size:10px;opacity:0.7;margin-left:6px">v4.2 • ONLINE</span>
        </div>
        <div>
          <button onclick="AI.clearHistory();event.stopImmediatePropagation()" style="background:none;border:none;color:#0a0f1e;font-size:13px;margin-right:12px;cursor:pointer">Clear</button>
          <button onclick="AI.togglePanel()" style="background:none;border:none;color:#0a0f1e;font-size:22px;cursor:pointer;line-height:1">×</button>
        </div>
      </div>

      <div class="ai-chat" id="ai-chat-window"></div>

      <div class="ai-quick-actions">
        <div class="quick-action-btn" onclick="AI.quickPrompt('What is the current weather analysis?')">Weather Analysis</div>
        <div class="quick-action-btn" onclick="AI.quickPrompt('Predict disaster risk in the region')">Disaster Prediction</div>
        <div class="quick-action-btn" onclick="AI.quickPrompt('Explain what I am seeing on the map')">Explain Map</div>
        <div class="quick-action-btn" onclick="AI.quickPrompt('Emergency response protocol for volcanic event')">Emergency Protocol</div>
      </div>

      <div class="ai-input-area">
        <input type="text" class="ai-input input" id="ai-input-field" placeholder="Ask Lumizia anything about satellite data, weather, emergencies..." style="border-radius:999px">
        <button onclick="AI.sendMessage()" class="btn btn-primary" style="padding:0 20px;border-radius:999px">Send</button>
        <button onclick="AI.startVoiceInput()" class="btn btn-icon" title="Voice Input" style="width:46px;height:46px">🎤</button>
        <button onclick="AI.speakLastResponse()" class="btn btn-icon" title="Speak Last Response" style="width:46px;height:46px">🔊</button>
      </div>
    `;

    // Enter key support
    setTimeout(() => {
      const input = panel.querySelector('#ai-input-field');
      if (input) {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') AI.sendMessage();
        });
      }
    }, 100);

    return panel;
  },

  _renderChat(panel = null) {
    const chatWindow = panel ? panel.querySelector('#ai-chat-window') : document.getElementById('ai-chat-window');
    if (!chatWindow) return;

    chatWindow.innerHTML = this.history.length === 0 ? 
      `<div style="text-align:center;color:var(--text-secondary);padding:40px 20px">
        <div style="font-size:42px;margin-bottom:12px">🛰️</div>
        <div style="font-weight:600">Hello, Commander.</div>
        <div style="font-size:13.5px;margin-top:6px">I am Lumizia, your satellite intelligence assistant.<br>Ask me about weather, predictions, map data, or emergency protocols.</div>
      </div>` : '';

    this.history.forEach(msg => {
      const div = document.createElement('div');
      div.className = `ai-message ${msg.role}`;
      div.innerHTML = msg.content;
      chatWindow.appendChild(div);
    });

    chatWindow.scrollTop = chatWindow.scrollHeight;
  },

  async sendMessage(customMessage = null) {
    const input = document.getElementById('ai-input-field');
    const message = customMessage || (input ? input.value.trim() : '');
    if (!message) return;

    const chatWindow = document.getElementById('ai-chat-window');
    
    // Add user message
    this.history.push({ role: 'user', content: message, timestamp: Date.now() });
    this._saveHistory();
    this._renderChat();

    if (input) input.value = '';

    // Show typing
    const typing = document.createElement('div');
    typing.className = 'ai-message assistant';
    typing.innerHTML = '<span style="opacity:0.6">Lumizia is analyzing satellite telemetry...</span>';
    chatWindow.appendChild(typing);
    chatWindow.scrollTop = chatWindow.scrollHeight;

    // Generate response (intelligent mock)
    await new Promise(r => setTimeout(r, 850 + Math.random() * 600));

    const response = this._generateResponse(message);
    
    typing.remove();

    this.history.push({ role: 'assistant', content: response, timestamp: Date.now() });
    this._saveHistory();
    this._renderChat();

    // Optional auto speak
    if (localStorage.getItem('luminara_ai_voice') === 'true') {
      setTimeout(() => this.speakText(response), 420);
    }
  },

  quickPrompt(text) {
    const panel = document.getElementById('ai-panel');
    if (!panel || panel.style.display === 'none') this.togglePanel();
    setTimeout(() => this.sendMessage(text), 180);
  },

  _generateResponse(query) {
    const q = query.toLowerCase();
    const user = Auth.currentUser?.username || 'Commander';

    if (q.includes('weather') || q.includes('temperature') || q.includes('storm')) {
      return `Current conditions at Command Center Alpha: <strong>27.4°C</strong>, humidity 74%, wind 14 knots from SE. A developing low-pressure system 380km east may bring scattered showers by 0400Z. All satellite feeds nominal.`;
    }
    
    if (q.includes('predict') || q.includes('disaster') || q.includes('risk')) {
      return `Based on latest multispectral imagery and AI models: <strong>Moderate risk</strong> of tropical cyclone formation in the Philippine Sea within 48 hours. Recommend increasing observation cadence on sectors 4-B and 7-C. No immediate ground impact projected.`;
    }
    
    if (q.includes('map') || q.includes('explain') || q.includes('seeing')) {
      return `You are viewing the primary operations theater over the Western Pacific. Current overlays show active weather monitoring, one seismic event near Sulawesi, and a volcanic plume advisory. All markers are synced with live telemetry from our constellation. Tap any marker for detailed sensor data.`;
    }
    
    if (q.includes('emergency') || q.includes('protocol') || q.includes('volcan')) {
      return `Emergency Protocol activated. For volcanic events: 1) Activate ash dispersion models 2) Issue aviation NOTAMs 3) Deploy drone reconnaissance 4) Notify civil defense. I have pre-loaded the response checklist into your dashboard. Would you like me to initiate any step?`;
    }
    
    if (q.includes('hello') || q.includes('hi') || q.includes('status')) {
      return `All systems green, ${user}. 14 satellites in nominal orbit. 3 reports pending review. Weather stable. How can I assist your command today?`;
    }

    // Default intelligent response
    return `I've processed your query against our real-time satellite database. Current telemetry shows nominal operations across all sectors. For more specific analysis, try asking about weather patterns, disaster prediction, map interpretation, or emergency protocols. I'm here to support your decisions, Commander.`;
  },

  startVoiceInput() {
    if (!('SpeechRecognition' in window || 'webkitSpeechRecognition' in window)) {
      utils.showToast('Voice recognition not supported in this browser', 'error');
      return;
    }

    if (!this.recognition) {
      const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
      this.recognition = new SpeechRec();
      this.recognition.continuous = false;
      this.recognition.interimResults = false;
      this.recognition.lang = 'en-US';

      this.recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        const input = document.getElementById('ai-input-field');
        if (input) input.value = transcript;
        this.sendMessage(transcript);
      };

      this.recognition.onerror = () => utils.showToast('Voice input error. Please try again.', 'error');
    }

    try {
      this.recognition.start();
      utils.showToast('Listening... Speak now');
    } catch(e) {
      utils.showToast('Voice recognition already active');
    }
  },

  speakLastResponse() {
    if (this.history.length === 0) return;
    const lastAssistant = [...this.history].reverse().find(m => m.role === 'assistant');
    if (lastAssistant) this.speakText(lastAssistant.content);
  },

  speakText(text) {
    if (!this.synth) {
      utils.showToast('Text-to-speech not available');
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text.replace(/<[^>]*>/g, '')); // strip HTML
    utterance.rate = 0.95;
    utterance.pitch = 1.05;
    utterance.volume = 0.9;
    this.synth.speak(utterance);
  },

  clearHistory() {
    if (!confirm('Clear all Lumizia conversation history?')) return;
    this.history = [];
    this._saveHistory();
    const chat = document.getElementById('ai-chat-window');
    if (chat) chat.innerHTML = '';
    utils.showToast('Conversation history cleared');
  }
};

window.AI = AI;