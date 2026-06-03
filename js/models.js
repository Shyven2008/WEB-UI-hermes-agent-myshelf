// ====== Models · Just Hermes Agent WEB UI (v2) ======
// Real config writing: base_url + model + api_key → config.yaml + .env

// ====== COMMON MODEL PRESETS ======
var MODEL_PRESETS = {
  'GPT-4o':       { provider:'openai',      baseUrl:'https://api.openai.com/v1',           envKey:'OPENAI_API_KEY',      model:'gpt-4o' },
  'GPT-5.4':      { provider:'openai',      baseUrl:'https://shendun.vip/v1',               envKey:'OPENAI_API_KEY',      model:'gpt-5.4' },
  'Claude Sonnet 4': { provider:'anthropic', baseUrl:'https://api.anthropic.com/v1',         envKey:'ANTHROPIC_API_KEY',   model:'claude-sonnet-4' },
  'Claude Haiku 3.5': { provider:'anthropic',baseUrl:'https://api.anthropic.com/v1',         envKey:'ANTHROPIC_API_KEY',   model:'claude-haiku-3.5' },
  'Claude 4.5 Haiku': { provider:'openai',   baseUrl:'https://shendun.vip/v1',               envKey:'OPENAI_API_KEY',      model:'claude-4.5-haiku' },
  'DeepSeek-V4-Flash':{ provider:'deepseek', baseUrl:'https://api.deepseek.com/v1',          envKey:'DEEPSEEK_API_KEY',    model:'deepseek-v4-flash' },
  'DeepSeek-V3':  { provider:'deepseek',     baseUrl:'https://api.deepseek.com/v1',          envKey:'DEEPSEEK_API_KEY',    model:'deepseek-chat' },
  'Gemini 2.5 Pro':{ provider:'google',      baseUrl:'https://generativelanguage.googleapis.com/v1beta', envKey:'GOOGLE_API_KEY', model:'gemini-2.5-pro' },
  'Gemini 2.0 Flash':{ provider:'google',    baseUrl:'https://generativelanguage.googleapis.com/v1beta', envKey:'GOOGLE_API_KEY', model:'gemini-2.0-flash' },
  'Qwen3 Coder':  { provider:'openrouter',   baseUrl:'https://openrouter.ai/api/v1',         envKey:'OPENROUTER_API_KEY',  model:'qwen/qwen3-coder' },
  'Grok 3':       { provider:'xai',          baseUrl:'https://api.x.ai/v1',                  envKey:'XAI_API_KEY',         model:'grok-3' },
  'Mistral Large':{ provider:'mistral',      baseUrl:'https://api.mistral.ai/v1',            envKey:'MISTRAL_API_KEY',     model:'mistral-large-latest' },
};

// ====== STATE ======
var _switchingModel = false;
var _modelConnStatus = {};

// ====== MAIN RENDER ======
function modelPageLoad() {
  renderModelPresets();
  loadCurrentConfig();
}

function renderModelPresets() {
  var grid = ge('modelGridV2');
  if (!grid) return;
  
  var activeModel = localStorage.getItem('hermes_active_model') || '';
  
  var html = Object.keys(MODEL_PRESETS).map(function(name) {
    var preset = MODEL_PRESETS[name];
    var isActive = name === activeModel;
    var connSt = _modelConnStatus[name] || '';
    var connIc = connSt === 'connected' ? '<span class="mc-conn-icon">✅</span>' : '';
    var providerColor = providerColorMap[preset.provider] || '#666';
    
    return '<div class="models-card-v2' + (isActive ? ' active' : '') + '" onclick="modelSetup(\'' + esc(name) + '\')" style="' + (_switchingModel && !isActive ? 'opacity:.4;pointer-events:none' : '') + '">' +
      '<div class="models-card-top">' +
        '<div class="models-card-avatar" style="background:' + providerColor + '20;color:' + providerColor + '">' + (preset.provider[0] || '?').toUpperCase() + '</div>' +
        '<div class="models-card-info">' +
          '<div class="models-card-name">' + esc(name) + connIc + '</div>' +
          '<div class="models-card-provider">' + preset.provider + ' · ' + preset.model + '</div>' +
        '</div>' +
        (isActive ? '<span class="models-card-badge">✓ 当前</span>' : '') +
      '</div>' +
      '<div class="models-card-url">' + preset.baseUrl + '</div>' +
    '</div>';
  }).join('');
  grid.innerHTML = html;
}

function loadCurrentConfig() {
  // Restore connection status
  try {
    var conn = JSON.parse(localStorage.getItem('hermes_model_conn') || '{}');
    Object.assign(_modelConnStatus, conn);
  } catch(e) {}
}

// ====== MODEL SETUP FLOW ======
var _setupModel = null;

function modelSetup(name) {
  if (_switchingModel) return;
  
  var preset = MODEL_PRESETS[name];
  if (!preset) { toast('未知模型', 'error'); return; }
  
  _setupModel = { name: name, preset: preset };
  
  // Show setup modal with pre-filled values
  var modal = ge('modelSetupModal');
  var mName = ge('msName');
  var mProvider = ge('msProvider');
  var mBaseUrl = ge('msBaseUrl');
  var mModel = ge('msModel');
  var mKey = ge('msKey');
  
  if (mName) mName.textContent = name;
  if (mProvider) mProvider.textContent = preset.provider;
  if (mBaseUrl) mBaseUrl.value = preset.baseUrl;
  if (mModel) mModel.value = preset.model;
  if (mKey) { mKey.value = ''; mKey.placeholder = '输入 ' + preset.envKey; }
  
  if (modal) modal.style.display = 'flex';
  
  // Try to load existing key from .env
  loadExistingKey(preset.envKey, mKey);
}

async function loadExistingKey(envKey, inputEl) {
  if (!inputEl) return;
  try {
    var py = [
      'import os',
      'p = r"C:\\Users\\YF00\\AppData\\Local\\hermes\\.env"',
      'if os.path.exists(p):',
      '  for line in open(p):',
      '    if line.startswith("' + envKey + '="):',
      '      print(line.strip().split("=", 1)[1])',
      '      break'
    ].join('\n');
    
    var res = await fetch('/api/terminal', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command: 'python3 -c ' + JSON.stringify(py)})
    });
    var data = await res.json();
    if (data.output && data.output.length > 4) {
      inputEl.value = data.output.slice(0, 8) + '...' + data.output.slice(-4);
      inputEl.dataset.hasKey = '1';
      inputEl.style.borderColor = 'var(--success)';
    }
  } catch(e) {}
}

function modelSetupClose() {
  var modal = ge('modelSetupModal');
  if (modal) modal.style.display = 'none';
  _setupModel = null;
}

async function modelSetupSave() {
  if (!_setupModel) return;
  var preset = _setupModel.preset;
  var name = _setupModel.name;
  
  var baseUrlEl = ge('msBaseUrl');
  var modelEl = ge('msModel');
  var keyEl = ge('msKey');
  
  var baseUrl = baseUrlEl ? baseUrlEl.value.trim() : preset.baseUrl;
  var modelName = modelEl ? modelEl.value.trim() : preset.model;
  var apiKey = keyEl ? keyEl.value.trim() : '';
  
  if (!baseUrl) { toast('请输入 Base URL', 'error'); return; }
  if (!modelName) { toast('请输入 Model 名称', 'error'); return; }
  
  // If key has existing mask, get from stored data
  if (apiKey.includes('...') && keyEl && keyEl.dataset.hasKey) {
    apiKey = ''; // Keep existing key
  }
  
  _switchingModel = true;
  renderModelPresets();
  
  var btn = ge('msSaveBtn');
  if (btn) { btn.disabled = true; btn.textContent = '⏳ 配置中...'; }
  
  try {
    // Step 1: Write API key to .env (if provided)
    if (apiKey && !apiKey.includes('...')) {
      var pyScript = [
        'import os',
        'path = r"C:\\Users\\YF00\\AppData\\Local\\hermes\\.env"',
        'key_name = "' + preset.envKey + '"',
        'val = "' + apiKey + '"',
        'if os.path.exists(path):',
        '  with open(path, "r") as f: lines = f.readlines()',
        '  found = False',
        '  for i, line in enumerate(lines):',
        '    if line.startswith(key_name + "="):',
        '      lines[i] = key_name + "=" + val + "\\n"',
        '      found = True; break',
        '  if not found: lines.append(key_name + "=" + val + "\\n")',
        '  with open(path, "w") as f: f.writelines(lines)',
        'else:',
        '  with open(path, "w") as f: f.write(key_name + "=" + val + "\\n")',
        'print("OK")'
      ].join('\n');
      
      await fetch('/api/terminal', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
        body:JSON.stringify({command: 'python3 -c ' + JSON.stringify(pyScript)})
      });
    }
    
    // Step 2: Write provider to config.yaml
    // Use HERMES_HOME from env or default path
    var configPy = [
      'import os, yaml',
      'path = r"C:\\Users\\YF00\\AppData\\Local\\hermes\\config.yaml"',
      'provider_name = "' + preset.provider + '"',
      'model_name = "' + modelName + '"',
      'base_url = "' + baseUrl + '"',
      'if os.path.exists(path):',
      '  with open(path, "r") as f: cfg = yaml.safe_load(f) or {}',
      'else: cfg = {}',
      'cfg["model"] = cfg.get("model", {})',
      'cfg["model"]["provider"] = provider_name',
      'cfg["model"]["default"] = model_name',
      'cfg["model"]["model"] = model_name',
      'cfg["providers"] = cfg.get("providers", {})',
      'cfg["providers"][provider_name] = cfg["providers"].get(provider_name, {})',
      'cfg["providers"][provider_name]["name"] = provider_name',
      'cfg["providers"][provider_name]["key_env"] = "' + preset.envKey + '"',
      'cfg["providers"][provider_name]["base_url"] = base_url',
      'cfg["providers"][provider_name]["default_model"] = model_name',
      'with open(path, "w") as f: yaml.dump(cfg, f, default_flow_style=False)',
      'print("OK")'
    ].join('\n');
    
    await fetch('/api/terminal', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command: 'python3 -c ' + JSON.stringify(configPy)})
    });
    
    // Step 3: Update local state
    localStorage.setItem('hermes_active_model', name);
    
    // Update connection status
    _modelConnStatus[name] = 'connected';
    try { localStorage.setItem('hermes_model_conn', JSON.stringify(_modelConnStatus)); } catch(e) {}
    
    // Update pill
    var pill = ge('pillModelName');
    if (pill) pill.textContent = name;
    var pill2 = ge('pillModelName2');
    if (pill2) pill2.textContent = name;
    
    toast('✅ ' + name + ' 已配置并激活', 'success');
    playChime();
    
    modelSetupClose();
    renderModelPresets();
  } catch(e) {
    toast('配置失败: ' + e.message, 'error');
  } finally {
    _switchingModel = false;
    renderModelPresets();
    var btn = ge('msSaveBtn');
    if (btn) { btn.disabled = false; btn.textContent = '✅ 保存并切换'; }
  }
}

// ====== MODEL PILL CLICK ======
function modelPillClick() {
  switchPage('model');
}

// ====== PROVIDER COLORS ======
var providerColorMap = {
  'openai': '#10a37f', 'anthropic': '#d97706', 'google': '#4285f4',
  'deepseek': '#dc2626', 'openrouter': '#f97316', 'xai': '#1a1a1a',
  'mistral': '#6366f1', 'meta': '#065f46', 'perplexity': '#0891b2',
  'groq': '#db2777', 'together': '#7c3aed', 'fireworks': '#c026d3',
  'huggingface': '#fbbf24', 'nvidia': '#76b900', 'nous': '#6366f1',
  'qwen': '#059669', 'minimax': '#0891b2', 'custom': '#666'
};
