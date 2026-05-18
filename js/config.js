// ====== Config · Just Hermes Agent WEB UI ======
// Centralized configuration and global application state

// API endpoint — defaults to current origin (Gateway server)
const API_BASE = location.origin || 'http://127.0.0.1:8642';

// localStorage keys
const STORAGE_KEY   = 'hermes_skill_names';
const SES_KEY       = 'hermes_sessions';
const TRASH_KEY     = 'hermes_trash';
const FILES_KEY     = 'hermes_files';
const ACTIVE_KEY    = 'hermes_active_session';
const COLLAPSE_KEY  = 'hermes_history_collapsed';
const LIST_COLLAPSE_KEY = 'hermes_history_list_collapsed';

// ====== Global State ======
// Shared across modules via window or direct reference

const state = {
  skillsData:       [],
  sessionsData:     [],
  currentSessionId: null,
  currentModelIdx:  0,
  currentPage:      'chat',
  streaming:        false,
  trashItems:       [],

  // WeChat QR
  qrCodeToken: '',
  qrRetries:    0,
};

// Model catalog — extend here to add/remove models
const MODELS = [
  {name:'DeepSeek-V4-Flash', provider:'deepseek', ctx:'128K', speed:45, latency:320, cost:0.15, tool:true, badge:'online'},
  {name:'Claude Sonnet 4',  provider:'anthropic', ctx:'200K', speed:38, latency:400, cost:3.00, tool:true, badge:'online'},
  {name:'GPT-4o',           provider:'openai',    ctx:'128K', speed:55, latency:280, cost:2.50, tool:true, badge:'online'},
  {name:'Gemini 2.5 Pro',   provider:'google',    ctx:'1M',   speed:60, latency:250, cost:1.25, tool:true, badge:'online'},
  {name:'Claude Haiku 3.5', provider:'anthropic', ctx:'200K', speed:80, latency:150, cost:0.80, tool:true, badge:'online'},
];
