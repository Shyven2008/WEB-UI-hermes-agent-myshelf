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
const CUSTOM_MODELS_KEY = 'hermes_custom_models';
const MODEL_TOKENS_KEY  = 'hermes_model_tokens';
const ACTIVE_MODEL_KEY  = 'hermes_active_model';

// ====== Global State ======
// Shared across modules via window or direct reference

const state = {
  skillsData:       [],
  sessionsData:     [],
  currentSessionId: null,
  currentModelIdx:  0,
  currentModelName: null, // set from active model in localStorage
  currentPage:      'chat',
  streaming:        false,
  trashItems:       [],

  // WeChat QR
  qrCodeToken: '',
  qrRetries:    0,
  _switchingModel: false,
};

// ====== Custom Models API ======

function loadCustomModels() {
  try { return JSON.parse(localStorage.getItem(CUSTOM_MODELS_KEY)) || []; }
  catch { return []; }
}

function saveCustomModels(models) {
  localStorage.setItem(CUSTOM_MODELS_KEY, JSON.stringify(models));
}

function addCustomModel(model) {
  const models = loadCustomModels();
  model.id = 'custom_' + Date.now().toString(36);
  model.installedAt = new Date().toISOString();
  models.push(model);
  saveCustomModels(models);
  return model;
}

function removeCustomModel(id) {
  saveCustomModels(loadCustomModels().filter(m => m.id !== id));
}

function getActiveModelName() {
  return localStorage.getItem(ACTIVE_MODEL_KEY) || MODELS[0].name;
}

function setActiveModelName(name) {
  localStorage.setItem(ACTIVE_MODEL_KEY, name);
}

// ====== Token Usage Tracking ======

function loadTokenUsage() {
  try { return JSON.parse(localStorage.getItem(MODEL_TOKENS_KEY)) || {}; }
  catch { return {}; }
}

function saveTokenUsage(usage) {
  localStorage.setItem(MODEL_TOKENS_KEY, JSON.stringify(usage));
}

function addTokenUsage(modelName, inputTokens, outputTokens) {
  const usage = loadTokenUsage();
  if (!usage[modelName]) usage[modelName] = { input: 0, output: 0 };
  usage[modelName].input  += inputTokens;
  usage[modelName].output += outputTokens;
  saveTokenUsage(usage);
}

function resetTokenUsage(modelName) {
  const usage = loadTokenUsage();
  if (modelName) {
    delete usage[modelName];
  } else {
    // Clear all
    localStorage.removeItem(MODEL_TOKENS_KEY);
    return;
  }
  saveTokenUsage(usage);
}

// Estimate tokens from text (rough: 1 token ≈ 4 chars for English, ~2 for CJK)
function estimateTokens(text) {
  if (!text) return 0;
  let cjk = 0, other = 0;
  for (const ch of text) {
    if (ch.charCodeAt(0) > 0x2e80) cjk++;
    else other++;
  }
  return Math.ceil(cjk / 2 + other / 4);
}

// Model catalog — extend here to add/remove models
const MODELS = [
  {name:'DeepSeek-V4-Flash', provider:'deepseek', ctx:'128K', speed:45, latency:320, cost:0.15, tool:true, badge:'online'},
  {name:'Claude Sonnet 4',  provider:'anthropic', ctx:'200K', speed:38, latency:400, cost:3.00, tool:true, badge:'online'},
  {name:'GPT-4o',           provider:'openai',    ctx:'128K', speed:55, latency:280, cost:2.50, tool:true, badge:'online'},
  {name:'Gemini 2.5 Pro',   provider:'google',    ctx:'1M',   speed:60, latency:250, cost:1.25, tool:true, badge:'online'},
  {name:'Claude Haiku 3.5', provider:'anthropic', ctx:'200K', speed:80, latency:150, cost:0.80, tool:true, badge:'online'},
  {name:'Qwen3 Coder 480B A35B (free)', provider:'openrouter', ctx:'1M', speed:0, latency:0, cost:0, tool:true, badge:'online'},
];

// Model → Hermes backend config mapping
// When checked, runs hermes config set to switch backend
const MODEL_BACKEND_MAP = {
  'DeepSeek-V4-Flash':    { provider:'deepseek',    model:'deepseek-v4-flash' },
  'Claude Sonnet 4':       { provider:'anthropic',   model:'claude-sonnet-4' },
  'GPT-4o':                { provider:'openai',      model:'gpt-4o' },
  'Gemini 2.5 Pro':        { provider:'google',      model:'gemini-2.5-pro' },
  'Claude Haiku 3.5':      { provider:'anthropic',   model:'claude-haiku-3.5' },
  'Qwen3 Coder 480B A35B (free)':   { provider:'openrouter',  model:'qwen/qwen3-coder' },
};
