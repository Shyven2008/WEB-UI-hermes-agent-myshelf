// ====== JustPost WEB UI · Hermes Agent — App Bundle ======
// Single-file stable build. Fix: no duplicate functions, global error boundary,
// Gateway health check, cross-module safety.

(function() {
'use strict';

// ====== ERROR BOUNDARY ======
window.__crashGuard = function(fn, context) {
  return function() {
    try {
      return fn.apply(this, arguments);
    } catch(e) {
      console.error('[BG] Crash in', context || fn.name || 'anonymous', e);
      showErrorBoundary(e, context);
    }
  };
};

function showErrorBoundary(err, ctx) {
  var eb = document.getElementById('errorBoundary');
  if (!eb) return;
  eb.classList.add('show');
  var msg = document.getElementById('ebMessage');
  if (msg) {
    msg.textContent = (ctx ? '[' + ctx + '] ' : '') + (err ? (err.message || String(err)) : 'Unknown error') +
      '\n\n页面可能部分功能不可用。点击「恢复」尝试继续。\n\n' +
      (err && err.stack ? err.stack.slice(0, 500) : '');
  }
}

window.dismissError = function() {
  var eb = document.getElementById('errorBoundary');
  if (eb) eb.classList.remove('show');
};

window.recoverApp = function() {
  window.location.reload();
};

// Wrap all init in try-catch
try {
// ====== CONFIG ======
var API_BASE = 'http://127.0.0.1:8642';
var API_KEY = 'hermes-dashboard-2026';

function authFetch(url, opts) {
  opts = opts || {};
  opts.headers = opts.headers || {};
  opts.headers['Authorization'] = 'Bearer ' + API_KEY;
  return fetch(url, opts);
}

var STORAGE_KEY = 'hermes_skill_names';
var SES_KEY = 'hermes_sessions';
var TRASH_KEY = 'hermes_trash';
var FILES_KEY = 'hermes_files';
var ACTIVE_KEY = 'hermes_active_session';
var COLLAPSE_KEY = 'hermes_history_collapsed';

// ====== STATE ======
var skillsData = [];
var sessionsData = [];
var state = {
  currentSessionId: null,
  streaming: false,
  currentPage: 'chat',
  currentModelIdx: 0,
  switchingModel: false,
  modelConnStatus: {},
  pendingModelIdx: -1,
  pendingCustomModel: null
};

// Expose state for backward compat with js/ modules
window.state = state;

// Model definitions
var MODELS = [
  {name:'DeepSeek-V4-Flash', provider:'deepseek', ctx:'128K', speed:45, latency:320, cost:0.15, tool:true, badge:'online'},
  {name:'Claude Sonnet 4', provider:'anthropic', ctx:'200K', speed:38, latency:400, cost:3.00, tool:true, badge:'online'},
  {name:'GPT-4o', provider:'openai', ctx:'128K', speed:55, latency:280, cost:2.50, tool:true, badge:'online'},
  {name:'Gemini 2.5 Pro', provider:'google', ctx:'1M', speed:60, latency:250, cost:1.25, tool:true, badge:'online'},
  {name:'Claude Haiku 3.5', provider:'anthropic', ctx:'200K', speed:80, latency:150, cost:0.80, tool:true, badge:'online'},
  {name:'GPT-5.4', provider:'openai', ctx:'256K', speed:42, latency:300, cost:5.00, tool:true, badge:'online'},
  {name:'Qwen3 Coder 480B A35B (free)', provider:'openrouter', ctx:'1M', speed:0, latency:0, cost:0, tool:true, badge:'online'},
  {name:'Claude 4.5 Haiku', provider:'openai', ctx:'200K', speed:85, latency:140, cost:0.80, tool:true, badge:'online'},
];

var MODEL_BACKEND_MAP = {
  'DeepSeek-V4-Flash':    { provider:'deepseek',    model:'deepseek-v4-flash' },
  'Claude Sonnet 4':       { provider:'anthropic',   model:'claude-sonnet-4' },
  'GPT-4o':                { provider:'openai',      model:'gpt-4o' },
  'GPT-5.4':                { provider:'openai',      model:'gpt-5.4' },
  'Gemini 2.5 Pro':        { provider:'google',      model:'gemini-2.5-pro' },
  'Claude Haiku 3.5':      { provider:'anthropic',   model:'claude-haiku-3.5' },
  'Claude 4.5 Haiku':      { provider:'openai',      model:'claude-4.5-haiku' },
  'Qwen3 Coder 480B A35B (free)':   { provider:'openrouter',  model:'qwen/qwen3-coder' },
};

var MODEL_KEY_MAP = {
  'DeepSeek-V4-Flash':    { env:'DEEPSEEK_API_KEY',   test:'curl -s https://api.deepseek.com/v1/models -H "Authorization: Bearer *** --max-time 10' },
  'Claude Sonnet 4':       { env:'ANTHROPIC_API_KEY',  test:'curl -s https://api.anthropic.com/v1/messages -H "x-api-key: KEY" -H "anthropic-version:2023-06-01" -d \'{"model":"claude-sonnet-4","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}\' --max-time 15' },
  'GPT-4o':                { env:'OPENAI_API_KEY',     test:'curl -s https://api.openai.com/v1/models -H "Authorization: Bearer *** --max-time 10' },
  'GPT-5.4':                { env:'OPENAI_API_KEY',     test:'curl -s https://api.openai.com/v1/models -H "Authorization: Bearer *** --max-time 10' },
  'Claude 4.5 Haiku':      { env:'OPENAI_API_KEY',     test:'curl -s https://shendun.vip/v1/models -H "Authorization: Bearer *** --max-time 10' },
  'Gemini 2.5 Pro':        { env:'GOOGLE_API_KEY',     test:'curl -s "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=KEY" -H "Content-Type:application/json" -d \'{"contents":[{"role":"user","parts":[{"text":"hi"}]}]}\' --max-time 15' },
  'Claude Haiku 3.5':      { env:'ANTHROPIC_API_KEY',  test:'curl -s https://api.anthropic.com/v1/messages -H "x-api-key: KEY" -H "anthropic-version:2023-06-01" -d \'{"model":"claude-haiku-3.5","max_tokens":1,"messages":[{"role":"user","content":"hi"}]}\' --max-time 15' },
  'Qwen3 Coder 480B A35B (free)': { env:'OPENROUTER_API_KEY', test:'curl -s https://openrouter.ai/api/v1/auth/key -H "Authorization: Bearer *** --max-time 10' },
};

// ====== HELPERS ======
window.ge = function(id) { return document.getElementById(id); };
window.esc = function(s) { return s ? String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;') : ''; };

var toast = window.toast = function(msg, type) {
  type = type || 'info';
  var c = ge('toastContainer');
  if (!c) return;
  var t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(function() { if (t.parentNode) t.remove(); }, 2500);
};

window.formatTime = function(ts) {
  if (!ts) return '';
  var d = new Date(ts);
  var diff = Date.now() - d;
  var mins = Math.floor(diff / 60000);
  if (mins < 1) return '刚刚';
  if (mins < 60) return mins + 'm ago';
  if (mins < 1440) return Math.floor(mins / 60) + 'h ago';
  return Math.floor(mins / 1440) + 'd ago';
};

window.ta = function(iso) {
  if (!iso) return '';
  var d = Date.now() - new Date(iso).getTime();
  var m = Math.floor(d / 60000);
  if (m < 1) return '刚刚';
  if (m < 60) return m + '分钟前';
  var h = Math.floor(m / 60);
  if (h < 24) return h + '小时前';
  var days = Math.floor(h / 24);
  if (days < 30) return days + '天前';
  return new Date(iso).toLocaleDateString();
};

window.playChime = function() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 800;
    o.type = 'sine';
    g.gain.setValueAtTime(0.2, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.4);
    o.start();
    o.stop(ctx.currentTime + 0.4);
    setTimeout(function() {
      var o2 = ctx.createOscillator();
      var g2 = ctx.createGain();
      o2.connect(g2);
      g2.connect(ctx.destination);
      o2.frequency.value = 1200;
      o2.type = 'sine';
      g2.gain.setValueAtTime(0.15, ctx.currentTime);
      g2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      o2.start();
      o2.stop(ctx.currentTime + 0.3);
    }, 150);
  } catch(e) { /* audio not available */ }
};

window.playFail = function() {
  try {
    var ctx = new (window.AudioContext || window.webkitAudioContext)();
    var o = ctx.createOscillator();
    var g = ctx.createGain();
    o.connect(g);
    g.connect(ctx.destination);
    o.frequency.value = 200;
    o.type = 'sawtooth';
    g.gain.setValueAtTime(0.15, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.5);
    o.start();
    o.stop(ctx.currentTime + 0.5);
  } catch(e) { /* audio not available */ }
};

var estimateTokens = window.estimateTokens = function(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 3.5);
};

window.getActiveModelName = function() {
  var saved = localStorage.getItem('hermes_active_model') || MODELS[0].name;
  var m = MODEL_BACKEND_MAP[saved];
  return (m && m.model) || saved;
};

// ====== GATEWAY HEALTH CHECK ======
var gatewayOnline = false;
window.isGatewayOnline = function() { return gatewayOnline; };

async function checkGatewayHealth() {
  try {
    var res = await fetch(API_BASE + '/health', {
      method: 'GET',
      signal: AbortSignal.timeout ? AbortSignal.timeout(3000) : null
    });
    gatewayOnline = res.ok;
  } catch(e) {
    gatewayOnline = false;
  }
  // Update UI indicator
  updateGatewayStatusUI();
  return gatewayOnline;
}

function updateGatewayStatusUI() {
  var el = ge('gatewayStatus');
  if (!el) return;
  el.className = 'gateway-status ' + (gatewayOnline ? 'online' : 'offline');
  el.innerHTML = '<span class="dot"></span>' + (gatewayOnline ? 'Gateway 在线' : 'Gateway 离线');
  el.title = gatewayOnline ? API_BASE + ' 可达' : API_BASE + ' 不可达 — 部分功能不可用';
}

// Health check every 15s
setInterval(checkGatewayHealth, 15000);

// ====== SESSION MANAGEMENT ======
function ls() { try { return JSON.parse(localStorage.getItem(SES_KEY)) || []; } catch(e) { return []; } }
function ss(sessions) { localStorage.setItem(SES_KEY, JSON.stringify(sessions)); }
function loadTrash() { try { return JSON.parse(localStorage.getItem(TRASH_KEY)) || []; } catch(e) { return []; } }
function saveTrash(items) { localStorage.setItem(TRASH_KEY, JSON.stringify(items)); }

window.ls = ls;
window.ss = ss;
window.loadTrash = loadTrash;
window.saveTrash = saveTrash;

window.newSession = function(name) {
  var id = Date.now().toString(36);
  var title = name || prompt('新对话名称:', '') || '新对话';
  if (title.length > 30) title = title.slice(0, 30) + '…';
  var sessions = ls();
  sessions.unshift({id:id, title:title, notes:'', messages:[], created:new Date().toISOString(), updated:new Date().toISOString()});
  ss(sessions);
  renderHistorySessions();
  openSession(id);
  switchPage('chat');
};

window.openSession = function(id) {
  state.currentSessionId = id;
  localStorage.setItem(ACTIVE_KEY, id);
  renderHistorySessions();
  var sessions = ls();
  var s = sessions.find(function(x) { return x.id === id; });
  if (s) {
    var notesEl = ge('chatNotes');
    if (notesEl) notesEl.value = s.notes || '';
    renderChat(s);
  }
};

window.trashSession = function(e, id) {
  e.stopPropagation();
  closeAllMenus();
  var sessions = ls();
  var idx = sessions.findIndex(function(x) { return x.id === id; });
  if (idx === -1) return;
  var session = sessions.splice(idx, 1)[0];
  ss(sessions);
  var trash = loadTrash();
  session.deletedAt = new Date().toISOString();
  trash.unshift(session);
  saveTrash(trash);
  if (state.currentSessionId === id) {
    state.currentSessionId = null;
    localStorage.removeItem(ACTIVE_KEY);
    var msg = ge('chatMessages');
    if (msg) msg.innerHTML = '<div class="empty-state"><div class="icon">💬</div><h3>开始新的对话</h3><p>在下方输入消息，或从左侧选择已有会话</p></div>';
  }
  renderHistorySessions();
  renderTrash();
  toast('已移入回收站', 'success');
};

window.permDeleteTrash = function(id) {
  saveTrash(loadTrash().filter(function(x) { return x.id !== id; }));
  renderTrash();
  toast('已永久删除', 'error');
};

window.restoreTrash = function(id) {
  var trash = loadTrash();
  var idx = trash.findIndex(function(x) { return x.id === id; });
  if (idx === -1) return;
  var session = trash.splice(idx, 1)[0];
  saveTrash(trash);
  var sessions = ls();
  delete session.deletedAt;
  sessions.unshift(session);
  ss(sessions);
  renderHistorySessions();
  renderTrash();
  openSession(id);
  switchPage('chat');
  toast('已恢复会话', 'success');
};

window.emptyTrash = function() {
  if (!confirm('确认清空回收站？所有会话将被永久删除。')) return;
  saveTrash([]);
  renderTrash();
  toast('回收站已清空', 'success');
};

window.renameSession = function(e, id) {
  e.stopPropagation();
  closeAllMenus();
  var sessions = ls();
  var s = sessions.find(function(x) { return x.id === id; });
  if (!s) return;
  var newName = prompt('输入新名称:', s.title);
  if (newName && newName.trim()) {
    s.title = newName.trim();
    s.updated = new Date().toISOString();
    ss(sessions);
    renderHistorySessions();
    if (state.currentSessionId === id) renderChat(s);
    toast('已重命名', 'success');
  }
};

window.saveNotes = function() {
  if (!state.currentSessionId) return;
  var sessions = ls();
  var s = sessions.find(function(x) { return x.id === state.currentSessionId; });
  if (!s) return;
  var notesEl = ge('chatNotes');
  if (!notesEl) return;
  s.notes = notesEl.value;
  if (s.notes) s.title = s.notes.length > 20 ? s.notes.slice(0, 20) + '…' : s.notes;
  else if (s.messages[0]) s.title = s.messages[0].content.length > 20 ? s.messages[0].content.slice(0, 20) + '…' : s.messages[0].content;
  s.updated = new Date().toISOString();
  ss(sessions);
  renderHistorySessions();
};

window.addMsg = function(role, content) {
  if (!state.currentSessionId) newSession();
  var sessions = ls();
  var s = sessions.find(function(x) { return x.id === state.currentSessionId; });
  if (!s) return;
  s.messages.push({role:role, content:content, time:new Date().toISOString()});
  if (!s.title || s.title === '新对话') {
    if (s.notes) s.title = s.notes.length > 20 ? s.notes.slice(0, 20) + '…' : s.notes;
    else s.title = content.length > 20 ? content.slice(0, 20) + '…' : content;
  }
  s.updated = new Date().toISOString();
  ss(sessions);
  renderHistorySessions();
};

// ====== RENDER HISTORY SESSIONS ======
function renderHistorySessions() {
  var list = ge('historyList');
  if (!list) return;
  var all = ls();
  all.sort(function(a, b) { return new Date(b.updated) - new Date(a.updated); });
  if (all.length === 0) {
    list.innerHTML = '<div class="history-empty">暂无对话<br>点击 ＋ 开始新对话</div>';
    return;
  }
  list.innerHTML = all.map(function(s) {
    var isActive = s.id === state.currentSessionId;
    var cnt = s.messages.length;
    var msgCount = cnt === 0 ? '0条' : cnt + '条';
    var time = ta(s.updated);
    return '<div class="history-item' + (isActive ? ' active' : '') + '" onclick="openSession(\'' + s.id + '\')">' +
      '<div class="hi-top">' +
        '<span class="hi-title">' + esc(s.title || '新对话') + '</span>' +
        '<button class="hi-menu-btn" onclick="toggleMenu(event,\'' + s.id + '\')">⋮</button>' +
      '</div>' +
      '<div class="hi-meta"><span>' + msgCount + '</span><span>' + time + '</span></div>' +
      (s.notes ? '<div class="hi-notes">' + esc(s.notes) + '</div>' : '') +
      '<div class="hi-dropdown" id="menu-' + s.id + '">' +
        '<button class="hi-dd-item" onclick="renameSession(event,\'' + s.id + '\')">✏️ 重命名</button>' +
        '<div class="hi-dd-divider"></div>' +
        '<button class="hi-dd-item danger" onclick="trashSession(event,\'' + s.id + '\')">🗑️ 删除</button>' +
      '</div>' +
    '</div>';
  }).join('');
}

window.renderHistorySessions = renderHistorySessions;

window.toggleMenu = function(e, id) {
  e.stopPropagation();
  closeAllMenus();
  var menu = ge('menu-' + id);
  if (menu) menu.classList.toggle('show');
};

function closeAllMenus() {
  document.querySelectorAll('.hi-dropdown').forEach(function(m) { m.classList.remove('show'); });
}

document.addEventListener('click', function() { closeAllMenus(); });

// ====== AUTO-RESIZE ======
window.autoResizeChat = function(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
};

// ====== SSE CHAT (single unified sendChat) ======
var _pendingSendMsg = '';

window.confirmSendChat = function(input) {
  var msg = input.value.trim();
  if (!msg) return;
  var incomplete = msg.length < 3 || /[,;:\\-]$/.test(msg) || msg.endsWith('并且') || msg.endsWith('然后') || msg.endsWith('但是');
  if (incomplete) {
    _pendingSendMsg = msg;
    var cm = ge('confirmMsg');
    var co = ge('confirmOverlay');
    if (cm) cm.textContent = '指令还没输完，确定要发送吗？';
    if (co) co.style.display = 'flex';
    return;
  }
  input.value = '';
  autoResizeChat(input);
  startChat(msg);
};

window.confirmContinue = function() {
  var co = ge('confirmOverlay');
  if (co) co.style.display = 'none';
  var input = ge('chatInput');
  if (input) {
    input.value = _pendingSendMsg;
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }
  _pendingSendMsg = '';
};

window.confirmSend = function() {
  var co = ge('confirmOverlay');
  if (co) co.style.display = 'none';
  var input = ge('chatInput');
  if (input) { input.value = ''; autoResizeChat(input); }
  startChat(_pendingSendMsg);
  _pendingSendMsg = '';
};

// ====== CHAT HELPERS (Desktop-style) ======

// Fast mode toggle
var _fastMode = false;
function toggleFastMode() {
  _fastMode = !_fastMode;
  var btn = ge('fastModeBtn');
  if (btn) btn.style.opacity = _fastMode ? '1' : '.5';
  toast('Fast Mode ' + (_fastMode ? '✅ 开启' : '关'), 'success');
  localStorage.setItem('hermes_fast_mode', _fastMode ? '1' : '0');
}
// Restore fast mode
(function() {
  var saved = localStorage.getItem('hermes_fast_mode');
  if (saved === '1') { _fastMode = true; var btn = ge('fastModeBtn'); if (btn) btn.style.opacity = '1'; }
})();

// Use suggestion
function useSuggestion(text) {
  var input = ge('chatInput');
  if (input) { input.value = text; autoResizeChat(input); input.focus(); sendChat(); }
}

// Clear chat
function confirmClearChat() {
  if (!confirm('确认清空当前对话？')) return;
  state.streaming = false;
  state.currentSessionId = null;
  localStorage.removeItem(ACTIVE_KEY);
  var msg = ge('chatMessages');
  if (msg) msg.innerHTML = '<div class="chat-empty-state">' +
    '<div class="chat-empty-icon">💬</div>' +
    '<h3 class="chat-empty-title">开始对话</h3>' +
    '<p class="chat-empty-desc">输入消息开始与 Hermes 对话</p>' +
    '<div class="chat-suggestions" id="chatSuggestions">' +
      '<button class="suggestion-btn" onclick="useSuggestion(\'分析当前项目结构\')">📂 分析项目</button>' +
      '<button class="suggestion-btn" onclick="useSuggestion(\'帮我写一段代码\')">💻 写代码</button>' +
      '<button class="suggestion-btn" onclick="useSuggestion(\'检查系统状态\')">🔍 检查状态</button>' +
      '<button class="suggestion-btn" onclick="useSuggestion(\'总结今天的更新\')">📝 总结更新</button>' +
    '</div></div>';
  var ctb = ge('clearChatBtn');
  if (ctb) ctb.style.display = 'none';
  var tc = ge('chatTokenCounter');
  if (tc) tc.style.display = 'none';
  var hd = ge('chatHeaderTitle');
  if (hd) hd.textContent = '💬 对话';
  renderHistorySessions();
}

// Context folder picker
var _contextFolder = null;
function pickContextFolder() {
  var folder = prompt('输入工作区路径:', _contextFolder || '');
  if (folder && folder.trim()) {
    _contextFolder = folder.trim();
    var lbl = ge('contextFolderLabel');
    if (lbl) lbl.textContent = _contextFolder.split('\\').pop() || _contextFolder.split('/').pop() || _contextFolder;
    var panel = ge('worktreePanel');
    if (panel) panel.style.display = 'flex';
    var title = ge('worktreeTitle');
    if (title) title.textContent = _contextFolder;
    var content = ge('worktreeContent');
    if (content) content.innerHTML = '<div class="worktree-empty">已绑定: ' + _contextFolder + '</div>';
    toast('工作区已绑定', 'success');
  } else {
    _contextFolder = null;
    var lbl = ge('contextFolderLabel');
    if (lbl) lbl.textContent = '上下文';
    closeWorktree();
  }
}

function closeWorktree() {
  var panel = ge('worktreePanel');
  if (panel) panel.style.display = 'none';
}

// Context gauge
function updateContextGauge(used, total) {
  var gauge = ge('contextGauge');
  var bar = ge('cgBar');
  var text = ge('cgText');
  if (!gauge || !bar || !text) return;
  if (!used || !total) { gauge.style.display = 'none'; return; }
  var pct = Math.min(100, (used / total) * 100);
  gauge.style.display = 'inline-flex';
  bar.innerHTML = '<span class="cg-bar-fill' + (pct > 80 ? ' danger' : pct > 60 ? ' warn' : '') + '" style="width:' + pct + '%"></span>';
  text.textContent = Math.round(used / 1000) + 'K/' + Math.round(total / 1000) + 'K';
}

// Update renderChat for new bubble format
function renderChat(s) {
  var box = ge('chatMessages');
  if (!box) return;
  
  // Update header
  var hd = ge('chatHeaderTitle');
  if (hd) hd.textContent = '💬 ' + (s ? esc(s.title || '对话') : '对话');
  
  if (!s || !s.messages || s.messages.length === 0) {
    showChatEmpty();
    return;
  }
  
  box.innerHTML = s.messages.map(function(m, idx) {
    var rc = m.role === 'user' ? 'user' : 'agent';
    var avatar = rc === 'user' ? '👤' : '🤖';
    var t = m.time ? new Date(m.time) : new Date();
    var ts = t.toLocaleTimeString('zh-CN', {hour:'2-digit', minute:'2-digit'});
    
    return '<div class="chat-message chat-message-' + rc + '">' +
      '<div class="chat-avatar chat-avatar-' + rc + '">' + avatar + '</div>' +
      '<div class="chat-bubble chat-bubble-' + rc + '">' + esc(m.content) +
        '<div class="chat-time">' + ts + '</div>' +
      '</div>' +
    '</div>';
  }).join('');
  box.scrollTop = box.scrollHeight;
  
  // Show clear button
  var ctb = ge('clearChatBtn');
  if (ctb) ctb.style.display = 'inline-flex';
}

function showChatEmpty() {
  var box = ge('chatMessages');
  if (!box) return;
  box.innerHTML = '<div class="chat-empty-state">' +
    '<div class="chat-empty-icon">💬</div>' +
    '<h3 class="chat-empty-title">开始对话</h3>' +
    '<p class="chat-empty-desc">输入消息开始与 Hermes 对话</p>' +
    '<div class="chat-suggestions" id="chatSuggestions">' +
      '<button class="suggestion-btn" onclick="useSuggestion(\'分析当前项目结构\')">📂 分析项目</button>' +
      '<button class="suggestion-btn" onclick="useSuggestion(\'帮我写一段代码\')">💻 写代码</button>' +
      '<button class="suggestion-btn" onclick="useSuggestion(\'检查系统状态\')">🔍 检查状态</button>' +
      '<button class="suggestion-btn" onclick="useSuggestion(\'总结今天的更新\')">📝 总结更新</button>' +
    '</div></div>';
  var ctb = ge('clearChatBtn');
  if (ctb) ctb.style.display = 'none';
}

// Update sendChat for new bubble format
async function startChat(msg) {
  if (!state.currentSessionId) newSession();
  addMsg('user', msg);

  var box = ge('chatMessages');
  if (!box) return;
  
  // Add typing indicator
  var sid = 'stm_' + Date.now();
  box.innerHTML += '<div class="chat-message chat-message-agent" id="' + sid + '">' +
    '<div class="chat-avatar chat-avatar-agent">🤖</div>' +
    '<div class="chat-bubble chat-bubble-agent">' +
      '<div class="chat-typing"><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span></div>' +
      '<div class="chat-time">Hermes · 思考中...</div>' +
    '</div></div>';
  box.scrollTop = box.scrollHeight;

  state.streaming = true;
  var sendBtn = ge('sendBtn');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '⏳'; }

  var full = '';
  var modelName = getActiveModelName();

  try {
    if (!gatewayOnline) {
      var hc = await checkGatewayHealth();
      if (!hc) {
        full = '(Gateway 离线 — 请确认端口 ' + API_BASE + ' 运行)';
        updateStreamMessage(sid, full);
        return;
      }
    }

    var sessions = ls();
    var s = sessions.find(function(x) { return x.id === state.currentSessionId; });
    var messages = s ? s.messages.map(function(m) { return {role: m.role, content: m.content}; }) : [];

    var res = await fetch(API_BASE + '/v1/chat/completions', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY},
      body: JSON.stringify({
        model: modelName,
        messages: [{role:'system', content:'You are a helpful AI assistant. Respond concisely and in Chinese unless asked otherwise.'}].concat(messages),
        stream: true
      })
    });

    if (!res.ok) {
      full = '(连接失败 — API 返回 ' + res.status + ')';
      updateStreamMessage(sid, full);
      return;
    }

    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var firstChunk = true;

    while (true) {
      var result = await reader.read();
      if (result.done) break;
      var lines = decoder.decode(result.value).split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line.startsWith('data:')) continue;
        var data = line.slice(5).trim();
        if (data === '[DONE]' || !data) continue;
        try {
          var json = JSON.parse(data);
          var delta = json.choices && json.choices[0] && json.choices[0].delta ? json.choices[0].delta.content || '' : '';
          if (delta) {
            full += delta;
            if (firstChunk) {
              // Replace typing indicator with actual content
              updateStreamMessage(sid, full, false);
              firstChunk = false;
            } else {
              updateStreamMessage(sid, full, false);
            }
          }
        } catch(e) {}
      }
    }
  } catch(err) {
    full = '(连接失败: ' + err.message + ')';
    updateStreamMessage(sid, full);
    checkGatewayHealth();
  } finally {
    state.streaming = false;
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '➤'; }
  }

  if (full && !full.startsWith('(')) {
    addMsg('assistant', full);
    var el = ge(sid);
    if (el) el.remove();
    // Full session render
    var sessions2 = ls();
    var s2 = sessions2.find(function(x) { return x.id === state.currentSessionId; });
    if (s2) renderChat(s2);
  }
}

function updateStreamMessage(sid, content, isError) {
  isError = isError !== undefined ? isError : content.startsWith('(');
  var el = ge(sid);
  if (!el) return;
  var bubble = el.querySelector('.chat-bubble');
  if (!bubble) return;
  bubble.innerHTML = esc(content) +
    '<div class="chat-time">' + (isError ? '⚠️ ' : '') + 'Hermes · 流式</div>';
  var box = ge('chatMessages');
  if (box) box.scrollTop = box.scrollHeight;
}

// Enable/disable send button based on input
document.addEventListener('DOMContentLoaded', function() {
  var input = ge('chatInput');
  var sendBtn = ge('sendBtn');
  if (input && sendBtn) {
    input.addEventListener('input', function() {
      sendBtn.disabled = !input.value.trim() && attachedFiles.length === 0;
    });
  }
});

// ====== FILE ATTACHMENTS (debug-friendly) ======
var attachedFiles = [];

window.handleAttachFiles = function(files) {
  if (!files || files.length === 0) return;
  
  Array.from(files).forEach(function(file) {
    if (file.size > 20 * 1024 * 1024) {
      toast('文件太大: ' + file.name + ' (超过20MB)', 'error');
      return;
    }
    var id = 'att_' + Date.now() + '_' + Math.random().toString(36).slice(2,6);
    var base = { id: id, name: file.name, size: file.size, type: file.type, content: null, fileType: 'other', extracting: false };
    
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    
    if (file.type.startsWith('image/')) {
      base.fileType = 'image';
      addChip(id, file.name, file.size, '🖼️', '');
      var r = new FileReader();
      r.onload = function(e) { 
        base.content = e.target.result;
        attachedFiles.push(base);
        updateChip(id, '🖼️ ' + file.name);
        enableSendBtn();
      };
      r.onerror = function() { toast('读取失败:' + file.name, 'error'); removeChip(id); };
      r.readAsDataURL(file);
    } else if (ext === 'docx' || ext === 'pdf' || file.type.startsWith('text/') || ['txt','md','json','js','py','html','css','xml','yaml','yml','log','sh','bat','ps1','csv','ini','cfg','env','conf','toml'].indexOf(ext) >= 0) {
      base.fileType = ext === 'docx' ? 'docx' : ext === 'pdf' ? 'pdf' : 'text';
      addChip(id, file.name, file.size, ext === 'pdf' ? '📕' : ext === 'docx' ? '📝' : '📄', '⏳');
      var r = new FileReader();
      r.onload = function(e) {
        base.content = e.target.result;
        attachedFiles.push(base);
        if (ext === 'docx' || ext === 'pdf') {
          var b64 = (e.target.result || '').split(',')[1] || '';
          extractServerText(id, b64, file.name, base);
        } else {
          updateChip(id, '📄 ' + file.name + ' ✅');
          enableSendBtn();
        }
      };
      r.onerror = function() { toast('读取失败:' + file.name, 'error'); removeChip(id); };
      r.readAsDataURL(file);
    } else {
      addChip(id, file.name, file.size, '📎', '');
      attachedFiles.push(base);
      enableSendBtn();
    }
  });
  if (ge('fileAttachInput')) ge('fileAttachInput').value = '';
}

function addChip(id, name, size, icon, status) {
  var container = ge('chatAttachments');
  if (!container) return;
  container.style.display = '';
  container.innerHTML += '<span class="att-chip" id="chip_' + id + '">' + icon + ' ' + esc(name) + ' <span class="att-size">' + fmtSize(size) + '</span>' + (status ? ' <span class="att-status">' + status + '</span>' : '') + ' <span class="att-rm" onclick="removeAtt(\'' + id + '\')">✕</span></span>';
}

function updateChip(id, text) {
  var chip = ge('chip_' + id);
  if (chip) chip.innerHTML = text + ' <span class="att-rm" onclick="removeAtt(\'' + id + '\')">✕</span>';
}

function removeChip(id) {
  var chip = ge('chip_' + id);
  if (chip) chip.remove();
  attachedFiles = attachedFiles.filter(function(f) { return f.id !== id; });
  if (attachedFiles.length === 0) {
    var container = ge('chatAttachments');
    if (container) { container.style.display = 'none'; container.innerHTML = ''; }
  }
}

window.removeAtt = function(id) {
  removeChip(id);
  if (attachedFiles.length === 0) {
    var input = ge('chatInput');
    var sendBtn = ge('sendBtn');
    if (sendBtn && input) sendBtn.disabled = !input.value.trim();
  }
}

async function extractServerText(id, b64, filename, base) {
  var ext = filename.toLowerCase().endsWith('.pdf') ? 'pdf' : 'docx';
  var pyCmd = ext === 'pdf'
    ? 'import base64,sys,json,tempfile,os;d=base64.b64decode(sys.argv[1]);f=tempfile.NamedTemporaryFile(suffix=".pdf",delete=False);f.write(d);f.close();t="";c=0\n'
    + 'try:\n import PyPDF2;r=PyPDF2.PdfReader(f.name);t="\\n".join([p.extract_text() or "" for p in r.pages]);c=len(t)\n'
    + 'except:\n try:\n  import pdfplumber;pf=pdfplumber.open(f.name);t="\\n".join([p.extract_text() or "" for p in pf.pages]);c=len(t);pf.close()\n'
    + ' except:\n  try:\n   import fitz;doc=fitz.open(f.name);t="".join([p.get_text() for p in doc]);c=len(t);doc.close()\n'
    + '  except: pass\n'
    + 'os.unlink(f.name);print(json.dumps({"t":t[:50000],"c":c}))'
    : 'import base64,sys,json,tempfile,os,docx;d=base64.b64decode(sys.argv[1]);f=tempfile.NamedTemporaryFile(suffix=".docx",delete=False);f.write(d);f.close();doc=docx.Document(f.name);t="\\n".join([p.text for p in doc.paragraphs]);c=len(t);os.unlink(f.name);print(json.dumps({"t":t[:50000],"c":c}))';
  
  try {
    var res = await fetch('/api/terminal', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command: 'python3 -c "' + pyCmd.replace(/"/g, '\\"') + '" ' + b64})
    });
    var data = await res.json();
    var result = {};
    try { result = JSON.parse(data.output || '{}'); } catch(e) {}
    
    if (result.c > 0) {
      base.content = 'data:text/plain;base64,' + btoa(unescape(encodeURIComponent(result.t)));
      updateChip(id, (ext === 'pdf' ? '📕' : '📝') + ' ' + filename + ' (' + result.c + '字 ✅)');
      toast('已提取: ' + filename, 'success');
    } else {
      updateChip(id, (ext === 'pdf' ? '📕' : '📝') + ' ' + filename + ' (无文本)');
    }
    enableSendBtn();
  } catch(e) {
    updateChip(id, (ext === 'pdf' ? '📕' : '📝') + ' ' + filename + ' ❌');
    toast('提取失败: ' + filename, 'error');
    enableSendBtn();
  }
}

function fmtSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return bytes + 'B';
  if (bytes < 1048576) return (bytes/1024).toFixed(1) + 'K';
  return (bytes/1048576).toFixed(1) + 'M';
}

function enableSendBtn() {
  var btn = ge('sendBtn');
  if (btn) btn.disabled = false;
}
// ====== MULTIMODAL SEND ======
// Override sendChat to support multimodal (images + text)
window.sendChat = function() {
  if (state.streaming) return;
  var input = ge('chatInput');
  if (!input) return;
  
  var msg = input.value.trim();
  var hasImages = attachedFiles.some(function(f) { return f.fileType === 'image'; });
  var hasDocs = attachedFiles.some(function(f) { return f.fileType === 'docx' || f.fileType === 'text'; });
  
  // Build message content
  var contentParts = [];
  
  if (msg) contentParts.push({type: 'text', text: msg});
  
  // Add attachments
  attachedFiles.forEach(function(f) {
    if (f.fileType === 'image' && f.content) {
      contentParts.push({type: 'image_url', image_url: {url: f.content}});
    } else if (f.fileType === 'docx' && f.content) {
      contentParts.push({type: 'text', text: '📝 ' + f.name + ' 内容:\n```\n' + f.content.slice(0, 50000) + '\n```'});
    } else if (f.fileType === 'text' && f.content) {
      try {
        var raw = atob(f.content.split(',')[1] || '');
        contentParts.push({type: 'text', text: '📄 ' + f.name + ':\n```\n' + raw.slice(0, 50000) + '\n```'});
      } catch(e) {
        contentParts.push({type: 'text', text: '📄 ' + f.name + ' (' + fmtSize(f.size) + ')'});
      }
    } else {
      contentParts.push({type: 'text', text: '📎 ' + f.name + ' (' + fmtSize(f.size) + ')'});
    }
  });
  
  // Clear attachments strip
  var container = ge('chatAttachments');
  if (container) { container.style.display = 'none'; container.innerHTML = ''; }
  attachedFiles = [];
  
  if (!msg && contentParts.length === 0) return;
  
  input.value = '';
  autoResizeChat(input);
  startChatMultimodal(contentParts);
};

var _pendingMultimodalContent = null;
var _pendingHasImages = false;

// Multimodal version of startChat
async function startChatMultimodal(contentParts) {
  if (!state.currentSessionId) newSession();
  addMsg('user', contentParts.map(function(p) { return p.type === 'text' ? p.text : '[图片]'; }).join('\n'));

  var box = ge('chatMessages');
  if (!box) return;
  
  var sid = 'stm_' + Date.now();
  box.innerHTML += '<div class="chat-message chat-message-agent" id="' + sid + '">' +
    '<div class="chat-avatar chat-avatar-agent">🤖</div>' +
    '<div class="chat-bubble chat-bubble-agent">' +
      '<div class="chat-typing"><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span><span class="chat-typing-dot"></span></div>' +
      '<div class="chat-time">Hermes · 思考中...</div>' +
    '</div></div>';
  box.scrollTop = box.scrollHeight;

  state.streaming = true;
  var sendBtn = ge('sendBtn');
  if (sendBtn) { sendBtn.disabled = true; sendBtn.textContent = '⏳'; }

  var full = '';
  var modelName = getActiveModelName();

  try {
    if (!gatewayOnline) {
      var hc = await checkGatewayHealth();
      if (!hc) {
        full = '(Gateway 离线)';
        updateStreamMessage(sid, full);
        return;
      }
    }

    var sessions = ls();
    var s = sessions.find(function(x) { return x.id === state.currentSessionId; });
    var historyMessages = s ? s.messages.slice(0, -1).map(function(m) { return {role: m.role, content: m.content}; }) : [];
    
    // Build user message with multimodal content
    var userMsg = contentParts.length === 1 && contentParts[0].type === 'text'
      ? contentParts[0].text
      : contentParts;

    var res = await fetch(API_BASE + '/v1/chat/completions', {
      method: 'POST',
      headers: {'Content-Type': 'application/json', 'Authorization': 'Bearer ' + API_KEY},
      body: JSON.stringify({
        model: modelName,
        messages: [{role:'system', content:'You are a helpful AI assistant. Respond concisely and in Chinese unless asked otherwise.'}]
          .concat(historyMessages)
          .concat([{role: 'user', content: userMsg}]),
        stream: true
      })
    });

    if (!res.ok) {
      full = '(API 返回 ' + res.status + ')';
      updateStreamMessage(sid, full);
      return;
    }

    var reader = res.body.getReader();
    var decoder = new TextDecoder();
    var firstChunk = true;

    while (true) {
      var result = await reader.read();
      if (result.done) break;
      var lines = decoder.decode(result.value).split('\n');
      for (var i = 0; i < lines.length; i++) {
        var line = lines[i];
        if (!line.startsWith('data:')) continue;
        var data = line.slice(5).trim();
        if (data === '[DONE]' || !data) continue;
        try {
          var json = JSON.parse(data);
          var delta = json.choices && json.choices[0] && json.choices[0].delta ? json.choices[0].delta.content || '' : '';
          if (delta) {
            full += delta;
            if (firstChunk) { updateStreamMessage(sid, full, false); firstChunk = false; }
            else { updateStreamMessage(sid, full, false); }
          }
        } catch(e) {}
      }
    }
  } catch(err) {
    full = '(连接失败: ' + err.message + ')';
    updateStreamMessage(sid, full);
    checkGatewayHealth();
  } finally {
    state.streaming = false;
    if (sendBtn) { sendBtn.disabled = false; sendBtn.textContent = '➤'; }
  }

  if (full && !full.startsWith('(')) {
    addMsg('assistant', full);
    var el = ge(sid);
    if (el) el.remove();
    var sessions2 = ls();
    var s2 = sessions2.find(function(x) { return x.id === state.currentSessionId; });
    if (s2) renderChat(s2);
  }
}

// Also handle Enter key
document.addEventListener('DOMContentLoaded', function() {
  var input = ge('chatInput');
  if (input) {
    input.addEventListener('keydown', function(e) {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendChat();
      }
    });
  }
});
function addTokenUsage(model, inputTokens, outputTokens) {
  try {
    var usage = JSON.parse(localStorage.getItem('hermes_token_usage') || '{}');
    if (!usage[model]) usage[model] = {input: 0, output: 0, calls: 0};
    usage[model].input += inputTokens;
    usage[model].output += outputTokens;
    usage[model].calls += 1;
    usage[model].lastUsed = new Date().toISOString();
    localStorage.setItem('hermes_token_usage', JSON.stringify(usage));
  } catch(e) { /* ignore */ }
}
window.addTokenUsage = addTokenUsage;

// ====== SKILLS ======
window.loadSavedNames = function() { try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; } catch(e) { return {}; } };
window.saveSkillName = function(id, name) { var n = loadSavedNames(); n[id] = name; localStorage.setItem(STORAGE_KEY, JSON.stringify(n)); };
window.resetSkillNames = function() { localStorage.removeItem(STORAGE_KEY); renderSkills(); toast('所有名称已重置', 'success'); };

async function loadSkills() {
  try {
    var res = await authFetch(API_BASE + '/v1/skills');
    var data = await res.json();
    skillsData = data.data || data.skills || [];
    var saved = loadSavedNames();
    skillsData.forEach(function(s) { if (saved[s.id]) s.name = saved[s.id]; });
  } catch(e) { skillsData = []; }
}
window.loadSkills = loadSkills;

function renderSkills() {
  var cont = ge('skillsContainer');
  if (!cont) return;
  var cats = {};
  skillsData.forEach(function(s) {
    var cat = s.category || 'uncategorized';
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push(s);
  });
  var catKeys = Object.keys(cats).sort();
  var countEl = ge('skillCount2');
  if (countEl) countEl.textContent = skillsData.length;
  if (catKeys.length === 0) { cont.innerHTML = '<div class="empty-state"><div class="icon">🧩</div><h3>暂无技能</h3></div>'; return; }
  var html = '';
  catKeys.forEach(function(cat) {
    var items = cats[cat];
    var saved = loadSavedNames();
    html += '<div class="cat-header"><h3>' + esc(cat) + '</h3><span class="cnt">' + items.length + '</span><span class="line"></span></div><div class="skill-grid">';
    items.forEach(function(s) {
      var dName = saved[s.id] || s.name || s.id;
      html += '<div class="skill-card" onclick="openSkill(\'' + esc(s.id) + '\')">' +
        '<div class="sc-name"><input type="text" value="' + esc(dName) + '" onfocus="this.select()" onchange="renameSkill(\'' + esc(s.id) + '\',this.value)" onclick="event.stopPropagation()"></div>' +
        '<div class="sc-id">' + esc(s.id) + '</div>' +
        '<div class="sc-desc">' + esc(s.description || '') + '</div>' +
        '<span class="sc-tag">' + esc(cat) + '</span>' +
      '</div>';
    });
    html += '</div>';
  });
  cont.innerHTML = html;
}
window.renderSkills = renderSkills;

window.renameSkill = function(id, newName) {
  if (!newName.trim()) return;
  saveSkillName(id, newName.trim());
  var skill = skillsData.find(function(s) { return s.id === id; });
  if (skill) skill.name = newName.trim();
  toast('已保存: ' + newName.trim(), 'success');
};

window.openSkill = async function(id) {
  try {
    var res = await fetch(API_BASE + '/v1/skills/' + encodeURIComponent(id));
    if (!res.ok) throw new Error('Not found');
    var data = await res.json();
    var mt = ge('modalTitle');
    var mc = ge('modalContent');
    var mo = ge('modalOverlay');
    if (mt) mt.textContent = data.name || id;
    if (mc) mc.textContent = data.content || 'No content';
    if (mo) mo.classList.add('show');
  } catch(e) { toast('加载失败: ' + id, 'error'); }
};

window.closeModal = function() {
  var mo = ge('modalOverlay');
  if (mo) mo.classList.remove('show');
};

// ====== ALL SESSIONS PAGE ======
async function loadAllSessions() {
  try {
    var res = await authFetch(API_BASE + '/api/sessions');
    var data = await res.json();
    sessionsData = data.sessions || [];
  } catch(e) { sessionsData = []; }
}
window.loadAllSessions = loadAllSessions;

function renderAllSessions() {
  var cont = ge('sessionsContainer');
  if (!cont) return;
  var countEl = ge('sessionsCount2');
  if (countEl) countEl.textContent = sessionsData.length;
  if (sessionsData.length === 0) { cont.innerHTML = '<div class="empty-state"><div class="icon">📋</div><h3>暂无会话</h3></div>'; return; }
  cont.innerHTML = '<div class="session-list">' + sessionsData.map(function(s) {
    return '<div class="sess-item"><span class="sid">' + esc(s.id ? s.id.slice(0,12) : '') + '</span><span class="stitle">' + esc(s.title || '(untitled)') + '</span><span class="stime">' + formatTime(s.updated_at || s.created_at) + '</span>' +
      '<button class="sdel" onclick="event.stopPropagation();deleteApiSession(\'' + esc(s.id) + '\')" title="删除">✕</button></div>';
  }).join('') + '</div>';
}
window.renderAllSessions = renderAllSessions;

window.deleteApiSession = async function(id) {
  if (!confirm('确认删除会话 ' + id.slice(0,12) + '?')) return;
  try {
    var res = await authFetch(API_BASE + '/api/sessions/' + encodeURIComponent(id), {method:'DELETE'});
    var data = await res.json();
    if (data.success) { toast('已删除', 'success'); await loadAllSessions(); renderAllSessions(); }
    else toast('删除失败', 'error');
  } catch(e) { toast('删除失败: ' + e.message, 'error'); }
};

// ====== TERMINAL ======
window.runTermCmd = async function() {
  var input = ge('termInput');
  if (!input) return;
  var cmd = input.value.trim();
  if (!cmd) return;
  var box = ge('termBox');
  if (!box) return;
  box.innerHTML += '<div><span class="prompt">PS></span> ' + esc(cmd) + '</div>';
  box.scrollTop = box.scrollHeight;
  input.value = '';
  try {
    var res = await fetch(API_BASE + '/api/terminal', {
      method:'POST', headers:{'Content-Type':'application/json', 'Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command:cmd})
    });
    var data = await res.json();
    if (data.output) box.innerHTML += '<div style="color:#8f8;white-space:pre-wrap">' + esc(data.output) + '</div>';
    if (data.error) box.innerHTML += '<div style="color:#e55;white-space:pre-wrap">' + esc(data.error) + '</div>';
    box.innerHTML += '<div class="pinfo">exit code: ' + (data.exit_code !== undefined ? data.exit_code : '?') + '</div>';
  } catch(e) { box.innerHTML += '<div class="perr">(连接失败: ' + esc(e.message || '') + ')</div>'; }
  box.scrollTop = box.scrollHeight;
};

// ====== MODELS ======
function renderModels() {
  var grid = ge('modelGrid');
  if (!grid) return;
  // Include custom models
  var custom = [];
  try {
    var d = JSON.parse(localStorage.getItem('hermes_custom_models') || '[]');
    d.forEach(function(m) { custom.push({name:m.name, provider:m.provider, ctx:m.ctx||'128K', speed:m.speed||0, latency:m.latency||0, cost:m.cost||0, tool:true, badge:'online', builtin:false, _custom:m}); });
  } catch(e) {}
  var all = MODELS.map(function(m, i) { return Object.assign({}, m, {builtin:true, _idx:i}); }).concat(custom);
  var lsName = localStorage.getItem('hermes_active_model');
  var activeName = lsName || MODELS[state.currentModelIdx || 0].name;

  grid.innerHTML = all.map(function(m, i) {
    var ia = m.name === activeName;
    var dis = state.switchingModel && !ia;
    var connSt = state.modelConnStatus[m.name] || '';
    var connIc = connSt === 'connected' ? '<span class="mc-conn-icon" title="已连接">✅</span>' : '';
    return '<div class="model-card' + (ia ? ' active' : '') + '" onclick="' + (dis ? '' : "selectModelByName('" + esc(m.name) + "')") + '" style="' + (dis ? 'opacity:.4;pointer-events:none' : '') + ';' + (m.builtin ? '' : 'border-left:2px solid var(--accent)') + '">' +
      '<div class="mc-top">' +
        '<label class="mc-check-wrap" onclick="event.stopPropagation()">' +
          '<input type="radio" name="modelSelect" class="mc-radio" ' + (ia ? 'checked' : '') + ' onchange="selectModelByName(\'' + esc(m.name) + '\')" ' + (dis ? 'disabled' : '') + '>' +
          '<span class="mc-check-visual"></span>' +
        '</label>' +
        '<span class="mc-name">' + esc(m.name) + '</span>' +
        connIc +
        '<span class="mc-badge ' + m.badge + '">● ' + (m.badge === 'online' ? '在线' : '离线') + '</span>' +
        (m.builtin ? '' : '<span style="font-size:8px;color:var(--text3);background:var(--border);padding:0 5px;border-radius:4px;margin-left:2px">自定义</span>') +
      '</div>' +
      '<div class="mc-provider">' + m.provider + ' · ' + m.ctx + ' ctx</div>' +
      '<div class="mc-stats">' +
        '<div class="mc-stat"><div class="v">' + (m.speed || '—') + '</div><div class="l">tok/s</div></div>' +
        '<div class="mc-stat"><div class="v">' + (m.latency ? m.latency+'ms' : '—') + '</div><div class="l">延迟</div></div>' +
        '<div class="mc-stat"><div class="v">' + (m.cost ? '$'+m.cost : '—') + '</div><div class="l">/M tokens</div></div>' +
        '<div class="mc-stat"><div class="v">' + (m.tool ? '✓' : '✗') + '</div><div class="l">tool use</div></div>' +
      '</div>' +
      (m.builtin ? '' : '<button class="mc-del" onclick="event.stopPropagation();deleteCustomModel(\'' + esc(m.name) + '\')" title="删除此模型">✕</button>') +
      (ia && state.switchingModel ? '<div class="mc-switching">切换中...</div>' : '<button class="mc-action' + (ia ? ' current' : '') + '">' + (ia ? '✓ 当前' : '切换') + '</button>') +
    '</div>';
  }).join('');
}
window.renderModels = renderModels;

window.selectModel = function(i) {
  if (state.switchingModel) return;
  var m = MODELS[i];
  try {
    var s = JSON.parse(localStorage.getItem('hermes_model_conn') || '{}');
    Object.assign(state.modelConnStatus, s);
  } catch(e) {}
  var km = MODEL_KEY_MAP[m.name];
  if (km && state.modelConnStatus[m.name] !== 'connected') {
    var sameKeyConnected = Object.keys(MODEL_KEY_MAP).some(function(name) {
      return MODEL_KEY_MAP[name].env === km.env && state.modelConnStatus[name] === 'connected';
    });
    if (sameKeyConnected) {
      doSwitchModel(i);
      return;
    }
    state.pendingModelIdx = i;
    showApiKeyModal(i);
    return;
  }
  doSwitchModel(i);
};

window.selectModelByName = function(name) {
  if (state.switchingModel) return;
  try {
    var s = JSON.parse(localStorage.getItem('hermes_model_conn') || '{}');
    Object.assign(state.modelConnStatus, s);
  } catch(e) {}
  var builtinIdx = MODELS.findIndex(function(m) { return m.name === name; });
  if (builtinIdx >= 0) {
    var m = MODELS[builtinIdx];
    var km = MODEL_KEY_MAP[m.name];
    if (km && state.modelConnStatus[m.name] !== 'connected') {
      state.pendingModelIdx = builtinIdx;
      showApiKeyModal(builtinIdx);
      return;
    }
    doSwitchModel(builtinIdx);
  } else {
    var customItems = [];
    try { customItems.push.apply(customItems, JSON.parse(localStorage.getItem('hermes_custom_models') || '[]')); } catch(e) {}
    var cm = customItems.find(function(x) { return x.name === name; });
    if (cm) {
      localStorage.setItem('hermes_active_model', name);
      state.currentModelIdx = MODELS.findIndex(function(m) { return m.name === name; });
      if (state.currentModelIdx < 0) state.currentModelIdx = 0;
      var pill = ge('pillModelName');
      if (pill) pill.textContent = name;
      toast('已选择: ' + name, 'success');
      showApiKeyModalCustom(cm);
    }
  }
};

window.showApiKeyModal = function(i) {
  state.pendingModelIdx = i;
  var m = MODELS[i];
  var km = MODEL_KEY_MAP[m.name];
  var kmModel = ge('keyModalModel');
  var kmProvider = ge('keyModalProvider');
  var kmEnv = ge('keyModalEnv');
  var kmInput = ge('keyInput');
  var kmStatus = ge('keyModalStatus');
  var kmIcon = ge('keyModalIcon');
  var kmBtn = ge('keyTestBtn');
  if (kmModel) kmModel.textContent = m.name;
  if (kmProvider) kmProvider.textContent = m.provider;
  if (kmEnv) kmEnv.textContent = km ? km.env : '?';
  if (kmInput) kmInput.value = '';
  if (kmStatus) { kmStatus.textContent = ''; kmStatus.className = 'keyModal-status'; }
  if (kmIcon) kmIcon.innerHTML = '🔑';
  if (kmBtn) { kmBtn.disabled = false; kmBtn.textContent = '🔌 连接测试'; }
  var modal = ge('keyModal');
  if (modal) modal.style.display = 'flex';
  setTimeout(function() { var ki = ge('keyInput'); if (ki) ki.focus(); }, 100);
};

window.closeKeyModal = function() {
  var modal = ge('keyModal');
  if (modal) modal.style.display = 'none';
  state.pendingModelIdx = -1;
  state.pendingCustomModel = null;
};

window.skipKey = function() {
  closeKeyModal();
  if (state.pendingModelIdx >= 0) doSwitchModel(state.pendingModelIdx);
};

window.testApiKey = async function() {
  var i = state.pendingModelIdx;
  if (i < 0) return;
  var m = MODELS[i];
  var km = MODEL_KEY_MAP[m.name];
  if (!km) { toast('此模型无密钥配置', 'error'); return; }
  var keyInput = ge('keyInput');
  var key = keyInput ? keyInput.value.trim() : '';
  if (!key) { toast('请输入 API Key', 'error'); return; }

  var btn = ge('keyTestBtn');
  var status = ge('keyModalStatus');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 测试中...'; }
  if (status) { status.textContent = '正在连接...'; status.className = 'keyModal-status testing'; }

  try {
    var putCmd = "echo '" + km.env + "=" + key + "' >> /c/Users/YF00/AppData/Local/hermes/.env";
    await fetch('/api/terminal', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY}, body:JSON.stringify({command:putCmd})});

    var testCmd = km.test.replace(/KEY/g, key);
    var r = await(await fetch('/api/terminal', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY}, body:JSON.stringify({command:testCmd})})).json();

    var output = (r.output || '').toLowerCase();
    var isError = output.includes('error') || output.includes('401') || output.includes('403') || output.includes('invalid') || r.exit_code !== 0;

    if (!isError && output.length > 0) {
      state.modelConnStatus[m.name] = 'connected';
      try { localStorage.setItem('hermes_model_conn', JSON.stringify(state.modelConnStatus)); } catch(e) {}
      if (status) { status.textContent = '✅ 连接成功！'; status.className = 'keyModal-status success'; }
      var kmIcon = ge('keyModalIcon');
      if (kmIcon) kmIcon.innerHTML = '✅';
      if (btn) { btn.textContent = '✅ 已连接'; }
      playChime();
      setTimeout(function() { closeKeyModal(); doSwitchModel(i); }, 800);
    } else {
      if (status) { status.textContent = '❌ 连接失败：API Key 无效或网络不可达'; status.className = 'keyModal-status error'; }
      if (btn) { btn.textContent = '🔌 重试'; btn.disabled = false; }
      playFail();
    }
  } catch(e) {
    if (status) { status.textContent = '❌ 测试异常: ' + (e.message||''); status.className = 'keyModal-status error'; }
    if (btn) { btn.textContent = '🔌 重试'; btn.disabled = false; }
    playFail();
  }
};

async function doSwitchModel(i) {
  var m = MODELS[i];
  state.currentModelIdx = i;
  var pill = ge('pillModelName');
  if (pill) pill.textContent = m.name;
  state.switchingModel = true;
  renderModels();
  var cfg = MODEL_BACKEND_MAP[m.name];
  if (cfg) {
    try {
      var r1 = await(await fetch('/api/terminal', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY}, body:JSON.stringify({command:'hermes config set model.provider "' + cfg.provider + '"'})})).json();
      var r2 = await(await fetch('/api/terminal', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY}, body:JSON.stringify({command:'hermes config set model.default "' + cfg.model + '"'})})).json();
      if (r1.exit_code === 0 && r2.exit_code === 0) toast('✅ ' + m.name + ' 已就绪', 'success');
      else toast('⚠️ 后端切换部分失败: ' + ((r1.error||'') + ' ' + (r2.error||'')).trim(), 'error');
    } catch(e) { toast('❌ 后端切换失败: ' + (e.message||'连接异常'), 'error'); }
  }
  localStorage.setItem('hermes_active_model', m.name);
  state.switchingModel = false;
  renderModels();
}

window.doSwitchModel = doSwitchModel;

window.showApiKeyModalCustom = function(cm) {
  var kmModel = ge('keyModalModel');
  var kmProvider = ge('keyModalProvider');
  var kmEnv = ge('keyModalEnv');
  var kmInput = ge('keyInput');
  var kmStatus = ge('keyModalStatus');
  var kmIcon = ge('keyModalIcon');
  var kmBtn = ge('keyTestBtn');
  if (kmModel) kmModel.textContent = cm.name;
  if (kmProvider) kmProvider.textContent = cm.provider;
  if (kmEnv) kmEnv.textContent = 'API Key';
  if (kmInput) kmInput.value = '';
  if (kmStatus) { kmStatus.textContent = ''; kmStatus.className = 'keyModal-status'; }
  if (kmIcon) kmIcon.innerHTML = '🔑';
  if (kmBtn) { kmBtn.disabled = false; kmBtn.textContent = '🔌 连接测试'; }
  var modal = ge('keyModal');
  if (modal) modal.style.display = 'flex';
  state.pendingCustomModel = cm;
  setTimeout(function() { var ki = ge('keyInput'); if (ki) ki.focus(); }, 100);
};

window.testCustomApiKey = function() {
  var cm = state.pendingCustomModel;
  if (!cm) return;
  var keyInput = ge('keyInput');
  var key = keyInput ? keyInput.value.trim() : '';
  if (!key) { toast('请输入 API Key', 'error'); return; }
  var btn = ge('keyTestBtn');
  var status = ge('keyModalStatus');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 测试中...'; }
  if (status) { status.textContent = '正在连接...'; status.className = 'keyModal-status testing'; }

  var testCmd = 'curl -s "' + cm.baseUrl + '/models" -H "Authorization: Bearer *** --max-time 10';
  fetch('/api/terminal', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY}, body:JSON.stringify({command:testCmd})})
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var out = (data.output || '').toLowerCase();
      var bad = out.includes('error') || out.includes('401') || out.includes('403') || out.includes('invalid') || data.exit_code !== 0;
      if (!bad && out.length > 0) {
        state.modelConnStatus[cm.name] = 'connected';
        try { localStorage.setItem('hermes_model_conn', JSON.stringify(state.modelConnStatus)); } catch(e) {}
        if (status) { status.textContent = '✅ 连接成功！'; status.className = 'keyModal-status success'; }
        var kmIcon = ge('keyModalIcon');
        if (kmIcon) kmIcon.innerHTML = '✅';
        if (btn) btn.textContent = '✅ 已连接';
        playChime();
        setTimeout(function() {
          var modal = ge('keyModal');
          if (modal) modal.style.display = 'none';
          state.pendingCustomModel = null;
          renderModels();
        }, 800);
      } else {
        if (status) { status.textContent = '❌ 连接失败，请检查 Key 和地址'; status.className = 'keyModal-status error'; }
        if (btn) { btn.textContent = '🔌 重试'; btn.disabled = false; }
        playFail();
      }
    })
    .catch(function(e) {
      if (status) { status.textContent = '❌ 异常: ' + (e.message||''); status.className = 'keyModal-status error'; }
      if (btn) { btn.disabled = false; playFail(); }
    });
};

window.deleteCustomModel = function(name) {
  try {
    var custom = JSON.parse(localStorage.getItem('hermes_custom_models') || '[]');
    custom = custom.filter(function(m) { return m.name !== name; });
    localStorage.setItem('hermes_custom_models', JSON.stringify(custom));
    toast('已删除: ' + name, 'success');
    renderModels();
  } catch(e) { toast('删除失败', 'error'); }
};

// ====== MY FILES ======
function loadFiles() { try { return JSON.parse(localStorage.getItem(FILES_KEY)) || []; } catch(e) { return []; } }
function saveFiles(files) { localStorage.setItem(FILES_KEY, JSON.stringify(files)); }

function getFileIcon(name, type) {
  var ext = name.split('.').pop().toLowerCase();
  if (type && type.startsWith('image/')) return '🖼️';
  if ((type && type.startsWith('text/')) || ['txt','md','json','js','py','html','css','xml','yaml','yml','toml','ini','cfg','log','sh','bat','ps1'].indexOf(ext) >= 0) return '📄';
  if (['pdf'].indexOf(ext) >= 0) return '📕';
  if (['doc','docx','xls','xlsx','ppt','pptx'].indexOf(ext) >= 0) return '📋';
  if (['zip','rar','7z','tar','gz'].indexOf(ext) >= 0) return '📦';
  if (['png','jpg','jpeg','gif','svg','webp','ico'].indexOf(ext) >= 0) return '🖼️';
  if (['mp3','wav','flac','aac','ogg'].indexOf(ext) >= 0) return '🎵';
  if (['mp4','avi','mov','mkv'].indexOf(ext) >= 0) return '🎬';
  if (['psd','ai','sketch','fig'].indexOf(ext) >= 0) return '🎨';
  return '📄';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

window.uploadFile = function() {
  var fi = ge('fileInput');
  if (fi) fi.click();
};

window.handleFiles = function(fileList) {
  var files = loadFiles();
  var count = 0;
  Array.from(fileList).forEach(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      var dataUrl = e.target.result;
      var isImage = file.type.startsWith('image/');
      var isText = file.type.startsWith('text/') || ['txt','md','json','js','py','html','css','xml','yaml','yml','log','sh','bat','ps1'].indexOf(file.name.split('.').pop()) >= 0;
      var isSmall = dataUrl.length < 500000;
      files.unshift({id:Date.now().toString(36)+'_'+count, name:file.name, size:file.size, type:file.type, date:new Date().toISOString(), content:isSmall ? dataUrl : null, note:''});
      count++;
      saveFiles(files);
      renderFiles();
      toast('已上传: ' + file.name, 'success');
    };
    if (file.size < 5000000) { reader.readAsDataURL(file); }
    else { toast('文件太大: ' + file.name + ' (超过5MB)', 'error'); }
  });
};

function renderFiles() {
  var cont = ge('filesContainer');
  if (!cont) return;
  var files = loadFiles();
  if (files.length === 0) { cont.innerHTML = '<div class="empty-state"><div class="icon">📁</div><h3>暂无文件</h3><p>点击「上传文件」选择文档、设计图稿等</p></div>'; return; }
  cont.innerHTML = '<div class="file-grid">' + files.map(function(f) {
    var icon = getFileIcon(f.name, f.type);
    var size = formatFileSize(f.size);
    var time = new Date(f.date).toLocaleDateString('zh-CN');
    var isImage = f.type && f.type.startsWith('image/') && f.content;
    return '<div class="file-card" onclick="viewFile(\'' + f.id + '\')">' +
      '<button class="fc-del" onclick="event.stopPropagation();deleteFile(\'' + f.id + '\')">✕</button>' +
      (isImage && f.content ? '<div class="fc-icon"><img src="' + f.content + '" style="max-width:100%;max-height:80px;border-radius:4px;object-fit:contain" alt="' + esc(f.name) + '"></div>' : '<div class="fc-icon">' + icon + '</div>') +
      '<div class="fc-name">' + esc(f.name) + '</div>' +
      '<div class="fc-meta"><span>' + size + '</span><span>' + time + '</span></div>' +
    '</div>';
  }).join('') + '</div>';
}
window.renderFiles = renderFiles;

window.viewFile = function(id) {
  var files = loadFiles();
  var f = files.find(function(x) { return x.id === id; });
  if (!f) return;
  var mt = ge('modalTitle');
  var mc = ge('modalContent');
  var mo = ge('modalOverlay');
  if (!mt || !mc || !mo) return;
  if (f.content) {
    if (f.type && f.type.startsWith('image/') && f.content.startsWith('data:image/')) {
      mt.textContent = '🖼️ ' + f.name;
      mc.innerHTML = '<img src="' + f.content + '" style="max-width:100%;border-radius:4px" alt="' + esc(f.name) + '">';
    } else {
      mt.textContent = '📄 ' + f.name;
      try {
        var raw = atob(f.content.split(',')[1] || '');
        mc.textContent = raw.length < 5000 ? raw : '(文件内容过长，仅展示前5000字符)\n\n' + raw.slice(0, 5000);
      } catch(e) { mc.textContent = '(二进制文件，无法预览文本)'; }
    }
  } else {
    mt.textContent = '📄 ' + f.name;
    mc.textContent = '(文件较大，未存储内容)\n\n名称: ' + f.name + '\n大小: ' + formatFileSize(f.size) + '\n类型: ' + f.type + '\n日期: ' + new Date(f.date).toLocaleString('zh-CN');
  }
  mo.classList.add('show');
};

window.deleteFile = function(id) {
  if (!confirm('确认删除此文件？')) return;
  saveFiles(loadFiles().filter(function(x) { return x.id !== id; }));
  renderFiles();
  toast('已删除文件', 'success');
};

window.clearAllFiles = function() {
  if (!confirm('确认清空所有文件？')) return;
  saveFiles([]);
  renderFiles();
  toast('已清空全部文件', 'success');
};

// ====== TRASH RENDER ======
function renderTrash() {
  var cont = ge('trashContainer');
  if (!cont) return;
  var trashItems = loadTrash();
  var count = trashItems.length;
  var cntEl = ge('trashCount');
  if (cntEl) cntEl.textContent = count;
  if (count === 0) { cont.innerHTML = '<div class="empty-state"><div class="icon">🗑️</div><h3>回收站为空</h3></div>'; return; }
  cont.innerHTML = trashItems.map(function(s) {
    return '<div class="trash-item">' +
      '<span class="ti-title">' + esc(s.title||'未命名会话') + ' (' + (s.messages ? s.messages.length : 0) + '条消息)</span>' +
      '<span class="ti-time">' + ta(s.deletedAt) + '</span>' +
      '<div class="ti-actions">' +
        '<button class="restore" onclick="restoreTrash(\'' + s.id + '\')">↩ 恢复</button>' +
        '<button class="perm-del" onclick="permDeleteTrash(\'' + s.id + '\')">✕ 永久删除</button>' +
      '</div>' +
    '</div>';
  }).join('');
}
window.renderTrash = renderTrash;

// ====== MEMORY PAGE ======
window.loadMemory = function() {
  var cont = ge('memoryContainer');
  if (!cont) return;
  var sessions = ls();
  var s = sessions.find(function(x) { return x.id === state.currentSessionId; });
  var m = MODELS[state.currentModelIdx];
  if (s && s.messages && s.messages.length > 0) {
    var lastMsg = s.messages[s.messages.length - 1];
    cont.innerHTML = '<div class="memory-card">' +
      '<div class="mc-label">当前会话</div><div class="mc-val">' + esc(s.title||'新对话') + '</div>' +
      '<div class="mc-label" style="margin-top:10px">备注</div><div class="mc-val small">' + esc(s.notes||'无备注') + '</div>' +
      '<div class="mc-label" style="margin-top:10px">消息数</div><div class="mc-val">' + s.messages.length + ' 条</div>' +
      '<div class="mc-label" style="margin-top:10px">最后消息预览</div><div class="mc-val small">' + esc(lastMsg.content.slice(0,80)) + (lastMsg.content.length>80?'…':'') + '</div>' +
      '<div class="mc-label" style="margin-top:10px">当前模型</div><div class="mc-val small">' + m.name + ' (' + m.provider + ')</div>' +
      '<div class="mc-label" style="margin-top:10px">记忆模式</div><div class="mc-val small">仅当前会话 · 不打开不读取</div>' +
    '</div>';
  } else {
    cont.innerHTML = '<div class="empty-state"><div class="icon">🧠</div><h3>当前无活跃对话</h3>' +
      '<p>记忆作用于当前会话，不打开不会读取，减少算力消耗</p>' +
      '<div class="memory-card" style="margin-top:12px;text-align:left">' +
        '<div class="mc-label">当前模型</div><div class="mc-val small">' + m.name + '</div>' +
        '<div class="mc-label" style="margin-top:6px">记忆模式</div><div class="mc-val small">仅当前会话 · 不打开不读取</div>' +
      '</div></div>';
  }
};

// ====== USAGE ======
window.loadUsage = function() {
  var us = ge('usageSkills');
  var uss = ge('usageSessions');
  var um = ge('usageModel');
  if (us) us.textContent = skillsData.length;
  if (uss) uss.textContent = sessionsData.length;
  if (um) um.textContent = MODELS[state.currentModelIdx].name;
};

// ====== LOGS ======
window.loadLogs = function() {
  var cont = ge('logsContainer');
  if (!cont) return;
  if (skillsData.length === 0) { cont.innerHTML = '<div class="empty-state"><div class="icon">📁</div><h3>暂无详细日志</h3><p>API 数据将在连接后显示</p></div>'; return; }
  var entries = [
    {time:new Date(), level:'info', msg:'Dashboard v3 loaded, system ready'},
    {time:new Date(Date.now()-60000), level:'info', msg:'Gateway: ' + (gatewayOnline ? '在线' : '离线')},
    {time:new Date(Date.now()-120000), level:'info', msg:'Skills: ' + skillsData.length + ' installed'},
    {time:new Date(Date.now()-180000), level:'info', msg:'Sessions: ' + sessionsData.length + ' in DB'},
    {time:new Date(Date.now()-300000), level:'info', msg:'Model: ' + MODELS[state.currentModelIdx].name},
  ];
  cont.innerHTML = entries.map(function(e) {
    return '<div class="log-entry"><span class="lt">[' + e.time.toLocaleTimeString('zh-CN') + ']</span><span class="ll ' + e.level + '">' + e.level + '</span>' + esc(e.msg) + '</div>';
  }).join('');
};

// ====== WECHAT QR ======
var qrCodeToken = '';
var qrRetries = 0;

window.generateWeChatQR = async function() {
  try {
    var qs = ge('qrStatus');
    if (qs) qs.textContent = '生成中...';
    var res = await fetch(API_BASE + '/api/wechat/qr');
    var data = await res.json();
    var qb = ge('qrBox');
    if (qb) {
      if (data.qr_image_url) qb.innerHTML = '<img src="' + data.qr_image_url + '" alt="WeChat QR">';
      else qb.innerHTML = '<img src="/static/wechat_qr.png" alt="WeChat QR">';
    }
    qrCodeToken = data.qr_token || '';
    qrRetries = 0;
    if (qs) qs.textContent = '请用微信扫描 (有效期约35秒)';
    var pb = ge('pollBtn');
    if (pb) pb.style.display = 'inline-block';
  } catch(e) { var qs2 = ge('qrStatus'); if (qs2) qs2.textContent = '生成失败: ' + e.message; }
};

window.pollWeChatStatus = async function() {
  if (!qrCodeToken) return;
  var qs = ge('qrStatus');
  if (qs) qs.textContent = '检测中...';
  try {
    var res = await fetch(API_BASE + '/api/wechat/status?qrcode=' + encodeURIComponent(qrCodeToken));
    var data = await res.json();
    if (data.status === '2' || data.status === 'confirmed') {
      if (qs) qs.textContent = '✅ 登录成功! 凭证已保存.';
      var pb = ge('pollBtn');
      if (pb) pb.style.display = 'none';
      toast('微信登录成功!', 'success');
    } else if (data.status === '3' || data.status === 'expired') {
      qrRetries++;
      if (qrRetries < 3) { if (qs) qs.textContent = '二维码已过期，重新生成...'; await generateWeChatQR(); }
      else if (qs) qs.textContent = '二维码已过期, 请手动点击生成';
    } else {
      if (qs) qs.textContent = '等待扫描...';
      setTimeout(pollWeChatStatus, 2000);
    }
  } catch(e) { var qs2 = ge('qrStatus'); if (qs2) qs2.textContent = '检测失败: ' + e.message; }
};

// ====== PAGE SWITCHING ======
function switchPage(page) {
  state.currentPage = page;

  // Nav active state
  document.querySelectorAll('.nav-icon').forEach(function(el) {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Show/hide pages safely
  document.querySelectorAll('.page').forEach(function(el) {
    el.classList.toggle('active', el.id === 'page-' + page);
    if (el.id === 'page-terminal') {
      el.style.display = el.classList.contains('active') ? 'flex' : 'none';
    }
  });

  // Lazy load
  if (page === 'skills')   { loadSkills().then(renderSkills); }
  if (page === 'sessions') { loadAllSessions().then(renderAllSessions); }
  if (page === 'memory')   { loadMemory(); }
  if (page === 'model')    { modelPageLoad(); }
  if (page === 'usage')    { loadUsage(); }
  if (page === 'logs')     { loadLogs(); }
  if (page === 'trash')    { renderTrash(); }
  if (page === 'files')    { renderFiles(); }
  if (page === 'browser')  { bbRefresh(); }
  if (page === 'kanban')   { kanbanStartPolling(); }
  if (page === 'schedules') { schedulesRefresh(); }
  if (page === 'integrations') { integrationsLoad(); }
  if (page === 'gateway')   { gatewayPageLoad(); }
  if (page === 'providers')  { providersPageLoad(); }
  if (page === 'settings')  { settingsPageLoad(); }
  if (page === 'kanban')   { if (window.kanbanRefresh) window.kanbanRefresh(); }
}

window.switchPage = switchPage;

// ====== HISTORY HEADER CLICK ======
window.historyHeaderClick = function() {
  var body = ge('historyBody');
  var arrow = ge('historyArrow');
  if (!body || !arrow) return;
  body.classList.toggle('collapsed');
  arrow.style.transform = body.classList.contains('collapsed') ? 'rotate(-90deg)' : 'rotate(0deg)';
};

// ====== HISTORY PANEL COLLAPSE ======
window.historyToggle = function() {
  var panel = ge('historyPanel');
  if (!panel) return;
  var isCollapsed = panel.classList.toggle('collapsed');
  var btn = ge('historyToggle');
  if (btn) { btn.textContent = isCollapsed ? '▶' : '◀'; btn.title = isCollapsed ? '展开历史' : '收起历史'; }
  localStorage.setItem(COLLAPSE_KEY, isCollapsed ? '1' : '0');
};

window.historyCollapse = function() {
  var panel = ge('historyPanel');
  if (panel && !panel.classList.contains('collapsed')) historyToggle();
};

// Restore collapse state
(function() {
  if (localStorage.getItem(COLLAPSE_KEY) === '1') {
    var panel = ge('historyPanel');
    var btn = ge('historyToggle');
    if (panel) panel.classList.add('collapsed');
    if (btn) { btn.textContent = '▶'; btn.title = '展开历史'; }
  }
})();

// ====== KEYBOARD ======
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') { closeModal(); closeKeyModal(); }
});

// ====== ADD MODEL WIZARD ======
var AMW_PROVIDERS = [{"name": "OpenAI", "icon": "🔵", "url": "https://api.openai.com/v1", "key": "openai"}, {"name": "Anthropic", "icon": "🟣", "url": "https://api.anthropic.com/v1", "key": "anthropic"}, {"name": "DeepSeek", "icon": "🔴", "url": "https://api.deepseek.com/v1", "key": "deepseek"}, {"name": "Google", "icon": "🟢", "url": "https://generativelanguage.googleapis.com/v1beta", "key": "google"}, {"name": "OpenRouter", "icon": "🟠", "url": "https://openrouter.ai/api/v1", "key": "openrouter"}, {"name": "自定义", "icon": "⚙️", "url": "", "key": "custom"}];

var amwState = { step:1, provider:'', icon:'', modelName:'', modelId:'', baseUrl:'' };

window.amwInit = function() {
  var grid = ge('amwProviderGrid');
  if (!grid) return;
  grid.innerHTML = AMW_PROVIDERS.map(function(p) {
    return '<div class="amw-provider-card" onclick="amwSelectProvider(\'' + p.key + '\',\'' + p.name + '\',\'' + p.icon + '\')">' +
      '<div class="amw-pc-icon">' + p.icon + '</div>' +
      '<div class="amw-pc-name">' + p.name + '</div>' +
      '<div class="amw-pc-url" style="font-size:9px;color:var(--text3)">' + (p.url||'自定义') + '</div>' +
    '</div>';
  }).join('');
};

window.amwSelectProvider = function(key, name, icon) {
  document.querySelectorAll('.amw-provider-card').forEach(function(el) { el.classList.remove('selected'); });
  if (event && event.currentTarget) event.currentTarget.classList.add('selected');
  amwState.provider = name;
  amwState.icon = icon;
  amwState.baseUrl = '';
  var p = AMW_PROVIDERS.find(function(x) { return x.key === key; });
  var urlEl = ge('amwBaseUrl');
  if (p && p.url && urlEl) { urlEl.value = p.url; amwState.baseUrl = p.url; }
  else if (urlEl) { urlEl.value = ''; amwState.baseUrl = ''; }
  var examples = {openai:'gpt-4o', anthropic:'claude-sonnet-4', deepseek:'deepseek-v4-flash', google:'gemini-2.5-pro', openrouter:'qwen/qwen3-coder', custom:''};
  var modelEl = ge('amwModelName');
  if (modelEl) { modelEl.value = examples[key] || ''; amwState.modelName = examples[key] || ''; }
  var btn = ge('amwNextBtn1');
  if (btn) btn.disabled = false;
};

window.amwValidate = function() {
  var s = amwState.step;
  var ok = false;
  if (s === 1) ok = !!amwState.provider;
  else if (s === 2) { var mn = ge('amwModelName'); ok = mn && !!mn.value.trim(); }
  else if (s === 3) { var bu = ge('amwBaseUrl'); ok = bu && !!bu.value.trim(); }
  else ok = true;
  var btnId = s === 1 ? 'amwNextBtn1' : s === 2 ? 'amwNextBtn2' : s === 3 ? 'amwNextBtn3' : 'amwNextBtn';
  var btn = ge(btnId);
  if (btn) btn.disabled = !ok;
};

window.amwNext = function() {
  var s = amwState.step;
  if (s === 1) {
    if (!amwState.provider) return;
    var s1 = ge('amwStep1'); if (s1) s1.style.display = 'none';
    var s2 = ge('amwStep2'); if (s2) s2.style.display = 'block';
    amwState.step = 2;
    var btn2 = ge('amwNextBtn2'); if (btn2) btn2.disabled = true;
  } else if (s === 2) {
    var nameEl = ge('amwModelName');
    var name = nameEl ? nameEl.value.trim() : '';
    if (!name) return;
    amwState.modelName = name; amwState.modelId = name;
    var s2 = ge('amwStep2'); if (s2) s2.style.display = 'none';
    var s3 = ge('amwStep3'); if (s3) s3.style.display = 'block';
    amwState.step = 3;
    var btn3 = ge('amwNextBtn3'); if (btn3) btn3.disabled = true;
  } else if (s === 3) {
    var urlEl = ge('amwBaseUrl');
    var url = urlEl ? urlEl.value.trim() : '';
    if (!url) return;
    amwState.baseUrl = url;
    var sp = ge('amwSummaryProvider'); if (sp) sp.textContent = amwState.icon + ' ' + amwState.provider;
    var sn = ge('amwSummaryName'); if (sn) sn.textContent = amwState.modelName;
    var si = ge('amwSummaryId'); if (si) si.textContent = amwState.modelId;
    var su = ge('amwSummaryUrl'); if (su) su.textContent = amwState.baseUrl;
    var s3 = ge('amwStep3'); if (s3) s3.style.display = 'none';
    var s4 = ge('amwStep4'); if (s4) s4.style.display = 'block';
    amwState.step = 4;
  } else if (s === 4) {
    amwSaveModel();
  }
  amwUpdateSteps();
};

window.amwPrev = function() {
  var s = amwState.step;
  if (s === 2) {
    var s2 = ge('amwStep2'); if (s2) s2.style.display = 'none';
    var s1 = ge('amwStep1'); if (s1) s1.style.display = 'block';
    amwState.step = 1;
  } else if (s === 3) {
    var s3 = ge('amwStep3'); if (s3) s3.style.display = 'none';
    var s2 = ge('amwStep2'); if (s2) s2.style.display = 'block';
    amwState.step = 2;
  } else if (s === 4) {
    var s4 = ge('amwStep4'); if (s4) s4.style.display = 'none';
    var s3 = ge('amwStep3'); if (s3) s3.style.display = 'block';
    amwState.step = 3;
  }
  amwUpdateSteps();
};

function amwUpdateSteps() {
  document.querySelectorAll('.amw-step-dot').forEach(function(el) {
    var step = parseInt(el.dataset.step);
    el.classList.toggle('active', step <= amwState.step);
    el.classList.toggle('done', step < amwState.step);
  });
}

function amwSaveModel() {
  try {
    var custom = JSON.parse(localStorage.getItem('hermes_custom_models') || '[]');
    var model = {id:'custom_' + Date.now().toString(36), name:amwState.modelName, modelId:amwState.modelId, provider:amwState.provider, baseUrl:amwState.baseUrl, ctx:'128K', speed:0, latency:0, cost:0, tool:true, savedAt:new Date().toISOString()};
    custom.push(model);
    localStorage.setItem('hermes_custom_models', JSON.stringify(custom));
    toast('✅ 模型已保存: ' + amwState.modelName, 'success');
    playChime();
    var s4 = ge('amwStep4'); if (s4) s4.style.display = 'none';
    var s1 = ge('amwStep1'); if (s1) s1.style.display = 'block';
    amwState = {step:1, provider:'', icon:'', modelName:'', modelId:'', baseUrl:''};
    var mn = ge('amwModelName'); if (mn) mn.value = '';
    var bu = ge('amwBaseUrl'); if (bu) bu.value = '';
    var btn1 = ge('amwNextBtn1'); if (btn1) btn1.disabled = true;
    document.querySelectorAll('.amw-provider-card').forEach(function(el) { el.classList.remove('selected'); });
    amwUpdateSteps();
  } catch(e) { toast('保存失败: ' + e.message, 'error'); }
}

window.amwSaveModel = amwSaveModel;

// ====== GIT SYNC ======
window.gitSync = window.__crashGuard(async function() {
  var btn = ge('navGitSync');
  var ver = ge('navVersion');
  if (btn) { btn.style.opacity = '.4'; btn.style.pointerEvents = 'none'; }
  if (ver) ver.textContent = 'sync...';
  try {
    var r = await (await fetch('/api/terminal', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY}, body:JSON.stringify({command:'bash /c/Users/YF00/just-hermes-agent-webui/git-sync.sh "WEB UI sync"'})})).json();
    if (r.exit_code === 0) {
      if (ver) ver.textContent = 'OK pushed';
      toast('Synced to GitHub', 'success');
      setTimeout(function() { location.reload(); }, 2000);
    } else {
      if (ver) ver.textContent = 'FAIL';
      toast('Sync failed: ' + (r.error||r.output||'unknown').slice(0, 80), 'error');
      setTimeout(function() { if (ver) { ver.textContent = 'v'; } if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; } }, 3000);
    }
  } catch(e) {
    if (ver) ver.textContent = 'no connect';
    toast('GitHub sync connection failed', 'error');
    if (btn) { btn.style.opacity = '1'; btn.style.pointerEvents = 'auto'; }
  }
}, 'gitSync');

// ====== DATA LOADING ======
async function loadAll() {
  try {
    var [skillsRes, sessionsRes] = await Promise.all([
      authFetch(API_BASE + '/v1/skills').then(function(r) { return r.ok ? r.json() : {skills:[]}; }),
      authFetch(API_BASE + '/api/sessions').then(function(r) { return r.ok ? r.json() : {sessions:[]}; })
    ]);
    skillsData = skillsRes.skills || [];
    sessionsData = sessionsRes.sessions || [];
    var saved = loadSavedNames();
    skillsData.forEach(function(s) { if (saved[s.id]) s.name = saved[s.id]; });

    var savedId = localStorage.getItem(ACTIVE_KEY);
    if (savedId) { var sessions = ls(); if (sessions.find(function(x) { return x.id === savedId; })) openSession(savedId); }

    renderHistorySessions();
    if (state.currentPage === 'skills') renderSkills();
    if (state.currentPage === 'sessions') renderAllSessions();
    loadUsage();
    loadLogs();
  } catch(err) { console.error('Load failed:', err); }
}

// ====== BB / PW / cURL / Auth ======
var AUTH = 'http://127.0.0.1:8647';

window.bbRefresh = async function() {
  try {
    var r = await(await fetch(AUTH + '/bb/status')).json();
    setBB('bbDot', r.running ? 'on' : 'off');
    setBB('bbStatus', r.running ? '运行中' : '未启动');
    setBB('bbUrl', r.url || '-');
    setBB('bbTime', r.remaining_seconds ? Math.round(r.remaining_seconds) + 's' : '-');
    var bbGo = ge('bbGoBtn'); if (bbGo) bbGo.disabled = r.running;
    var bbStop = ge('bbStopBtn'); if (bbStop) bbStop.disabled = !r.running;
    var bbBrowse = ge('bbBrowseBtn'); if (bbBrowse) bbBrowse.disabled = !r.running || !r.url;
  } catch(e) { setBB('bbStatus', 'err'); }
  try {
    var p = await(await fetch(AUTH + '/pw/status')).json();
    setBB('pwDot', p.running ? 'on' : 'off');
    setBB('pwStatus', p.running ? '运行中' : '未启动');
    setBB('pwUptime', p.running ? p.uptime + 's' : '-');
    setBB('pwAlive', p.alive ? '●在线' : '○离线');
    var pwGo = ge('pwGoBtn'); if (pwGo) pwGo.disabled = p.running;
    var pwStop = ge('pwStopBtn'); if (pwStop) pwStop.disabled = !p.running;
  } catch(e) {}
  try {
    var a = await(await fetch(AUTH + '/auth/status')).json();
    var ast = ge('authStatusText');
    if (ast) ast.innerHTML = '待处理: ' + (a.pending_requests||[]).length + '条 | 操作/分钟: ' + a.ops_in_last_minute;
    var ms = ge('authModeSelect');
    if (ms) ms.value = a.mode || 'ASK';
  } catch(e) {}
};

function setBB(id, val) {
  var el = ge(id);
  if (el) {
    if (el.className !== undefined && (id.indexOf('Dot') >= 0 || id.indexOf('dot') >= 0)) {
      el.className = 'bb-dot ' + val;
    } else {
      el.textContent = val;
    }
  }
}

// Browser auto-refresh every 5s
setInterval(function() {
  if (state.currentPage === 'browser') bbRefresh();
}, 5000);

// Auth mode select handler
document.addEventListener('DOMContentLoaded', function() {
var am = ge('authModeSelect');
if (am) am.onchange = function() {
  fetch('http://127.0.0.1:8647/auth/mode', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY}, body:JSON.stringify({mode:am.value})})
    .then(function(r) { return r.json(); })
    .then(function(d) { if (d && d.ok) { var ast = ge('authStatusText'); if (ast) ast.innerHTML = '已切换至 ' + am.value; } })
    .catch(function(e) { alert('切换失败: ' + e.message); });
};
});

// ====== INIT ======
// Run health check immediately, then periodic
checkGatewayHealth();

// Load data
loadAll();
renderModels();

// Periodic refresh
setInterval(loadAll, 30000);

// Periodic BB refresh if browser page is visible
setInterval(function() {
  if (state.currentPage === 'browser') bbRefresh();
}, 5000);

// Expose for backward compat
window.skillsData = skillsData;
window.sessionsData = sessionsData;
window.MODELS = MODELS;
window.MODEL_BACKEND_MAP = MODEL_BACKEND_MAP;
window.MODEL_KEY_MAP = MODEL_KEY_MAP;
window.API_BASE = API_BASE;
window.API_KEY = API_KEY;

} catch(e) {
  // Top-level init error — show error boundary
  console.error('[FATAL] Init error:', e);
  showErrorBoundary(e, 'INIT');
}

})(); // end IIFE
