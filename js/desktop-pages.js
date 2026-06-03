// ====== Desktop-Style Pages: Gateway, Providers, Settings ======
// Ported from Hermes Desktop (React → vanilla JS)

// ====== GATEWAY PAGE ======
async function gatewayPageLoad() {
  renderGatewayStatus();
  renderGatewayPlatforms();
}

function renderGatewayStatus() {
  var el = ge('gatewayInfo');
  if (!el) return;
  
  var status = gatewayOnline ? '🟢 运行中' : '🔴 已停止';
  var btn = gatewayOnline
    ? '<button class="km-btn km-btn-sec" onclick="gatewayToggle()" disabled>停止 (通过CLI)</button>'
    : '<button class="km-btn km-btn-pri" onclick="gatewayToggle()">启动 Gateway</button>';
  
  el.innerHTML = '<div class="gw-status-card">' +
    '<div class="gw-status-row"><span class="gw-label">状态</span><span class="gw-value" style="color:' + (gatewayOnline ? 'var(--success)' : 'var(--danger)') + '">' + status + '</span></div>' +
    '<div class="gw-status-row"><span class="gw-label">地址</span><span class="gw-value">' + API_BASE + '</span></div>' +
    '<div class="gw-status-row"><span class="gw-label">端口</span><span class="gw-value">8642</span></div>' +
    '<div style="margin-top:10px">' + btn + '</div>' +
  '</div>';
  
  // Health check info
  var logsEl = ge('gatewayLogs');
  if (logsEl) {
    logsEl.innerHTML = '<div class="log-entry"><span class="lt">[' + new Date().toLocaleTimeString() + ']</span><span class="ll ' + (gatewayOnline ? 'info' : 'error') + '">' + (gatewayOnline ? 'Gateway 在线' : 'Gateway 离线') + '</span></div>';
  }
}

function renderGatewayPlatforms() {
  var el = ge('gatewayPlatforms');
  if (!el) return;
  
  var platforms = [
    {key:'telegram', name:'Telegram', icon:'✈️', desc:'Telegram Bot'},
    {key:'discord', name:'Discord', icon:'🎮', desc:'Discord Bot'},
    {key:'weixin', name:'微信', icon:'💚', desc:'个人微信'},
    {key:'feishu', name:'飞书', icon:'📎', desc:'飞书 Bot'},
    {key:'dingtalk', name:'钉钉', icon:'🔔', desc:'钉钉 Bot'},
    {key:'whatsapp', name:'WhatsApp', icon:'💬', desc:'WhatsApp'},
    {key:'signal', name:'Signal', icon:'🔵', desc:'Signal'},
    {key:'slack', name:'Slack', icon:'#', desc:'Slack Bot'},
    {key:'wecom', name:'企业微信', icon:'💼', desc:'企业微信'},
    {key:'email', name:'Email', icon:'✉️', desc:'SMTP/IMAP'},
    {key:'sms', name:'SMS', icon:'📱', desc:'短信'},
    {key:'webhook', name:'Webhook', icon:'🔗', desc:'Webhook'},
  ];
  
  el.innerHTML = platforms.map(function(p) {
    var isConnected = integrations && integrations.platforms && integrations.platforms[p.key] && integrations.platforms[p.key].connected;
    return '<div class="gp-card' + (isConnected ? ' connected' : '') + '">' +
      '<div class="gp-icon">' + p.icon + '</div>' +
      '<div class="gp-info">' +
        '<span class="gp-name">' + p.name + '</span>' +
        '<span class="gp-desc">' + p.desc + '</span>' +
      '</div>' +
      '<div class="gp-status">' +
        (isConnected ? '<span class="gp-badge on">● 已连接</span>' : '<span class="gp-badge off">○ 未接</span>') +
      '</div>' +
    '</div>';
  }).join('');
}

async function gatewayToggle() {
  if (gatewayOnline) {
    toast('通过 CLI 停止: hermes gateway stop', 'info');
  } else {
    toast('通过 CLI 启动: hermes gateway start', 'info');
  }
}

// ====== PROVIDERS PAGE ======
async function providersPageLoad() {
  renderProviderKeys();
  renderOAuthCards();
}

function renderProviderKeys() {
  var el = ge('providerKeysGrid');
  if (!el) return;
  
  var providers = [
    {key:'OPENAI_API_KEY', name:'OpenAI', icon:'🔵', env:'OPENAI_API_KEY', hint:'api.openai.com'},
    {key:'ANTHROPIC_API_KEY', name:'Anthropic', icon:'🟣', env:'ANTHROPIC_API_KEY', hint:'api.anthropic.com'},
    {key:'DEEPSEEK_API_KEY', name:'DeepSeek', icon:'🔴', env:'DEEPSEEK_API_KEY', hint:'api.deepseek.com'},
    {key:'GOOGLE_API_KEY', name:'Google', icon:'🟢', env:'GOOGLE_API_KEY', hint:'generativelanguage.googleapis.com'},
    {key:'OPENROUTER_API_KEY', name:'OpenRouter', icon:'🟠', env:'OPENROUTER_API_KEY', hint:'openrouter.ai'},
    {key:'GROQ_API_KEY', name:'Groq', icon:'⚡', env:'GROQ_API_KEY', hint:'groq.com'},
    {key:'MISTRAL_API_KEY', name:'Mistral', icon:'🇫🇷', env:'MISTRAL_API_KEY', hint:'api.mistral.ai'},
    {key:'TOGETHER_API_KEY', name:'Together AI', icon:'🔮', env:'TOGETHER_API_KEY', hint:'api.together.xyz'},
    {key:'PERPLEXITY_API_KEY', name:'Perplexity', icon:'🔍', env:'PERPLEXITY_API_KEY', hint:'api.perplexity.ai'},
    {key:'XAI_API_KEY', name:'xAI Grok', icon:'✖️', env:'XAI_API_KEY', hint:'api.x.ai'},
    {key:'HF_TOKEN', name:'Hugging Face', icon:'🤗', env:'HF_TOKEN', hint:'huggingface.co'},
    {key:'FIREWORKS_API_KEY', name:'Fireworks', icon:'🎆', env:'FIREWORKS_API_KEY', hint:'api.fireworks.ai'},
    {key:'CEREBRAS_API_KEY', name:'Cerebras', icon:'🧠', env:'CEREBRAS_API_KEY', hint:'api.cerebras.ai'},
    {key:'NVIDIA_API_KEY', name:'NVIDIA NIM', icon:'🟢', env:'NVIDIA_API_KEY', hint:'integrate.api.nvidia.com'},
  ];
  
  el.innerHTML = providers.map(function(p) {
    return '<div class="pk-card">' +
      '<div class="pk-header">' +
        '<span class="pk-icon">' + p.icon + '</span>' +
        '<span class="pk-name">' + p.name + '</span>' +
      '</div>' +
      '<div class="pk-field">' +
        '<label>' + p.env + '</label>' +
        '<div class="pk-input-wrap">' +
          '<input type="password" class="pk-input" id="pk_' + p.key + '" placeholder="输入 ' + p.env + '" spellcheck="false" data-env="' + p.env + '">' +
          '<button class="pk-toggle" onclick="togglePkVis(\'pk_' + p.key + '\')" title="显示/隐藏">👁️</button>' +
          '<button class="pk-save" onclick="savePk(\'' + p.key + '\')">💾</button>' +
        '</div>' +
        '<span class="pk-hint">' + p.hint + '</span>' +
      '</div>' +
    '</div>';
  }).join('');
  
  // Try to load existing keys
  providersPageLoadKeys();
}

async function providersPageLoadKeys() {
  try {
    var res = await fetch('/api/terminal', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command:'type ' + HERMES_ENV_PATH + ' 2>nul || echo ""'})
    });
    var data = await res.json();
    var envContent = data.output || '';
    var lines = envContent.split('\n');
    
    lines.forEach(function(line) {
      var parts = line.split('=');
      if (parts.length >= 2) {
        var key = parts[0].trim();
        var val = parts.slice(1).join('=').trim();
        if (val && val.length > 4) {
          var el = ge('pk_' + key);
          if (el) {
            el.value = val.slice(0, 8) + '...' + val.slice(-4);
            el.dataset.saved = '1';
            el.style.borderColor = 'var(--success)';
          }
        }
      }
    });
  } catch(e) {}
}

function togglePkVis(id) {
  var el = ge(id);
  if (!el) return;
  if (el.type === 'password') el.type = 'text';
  else el.type = 'password';
}

async function savePk(envKey) {
  var el = ge('pk_' + envKey);
  if (!el) return;
  var val = el.value.trim();
  if (!val || val.includes('...')) return;
  
  try {
    var pyScript = [
      'import sys, os',
      'path = r"' + HERMES_ENV_PATH + '"',
      'key = "' + envKey + '"',
      'val = "' + val + '"',
      'if os.path.exists(path):',
      '  with open(path, "r") as f: lines = f.readlines()',
      '  found = False',
      '  for i, line in enumerate(lines):',
      '    if line.startswith(key + "="):',
      '      lines[i] = key + "=" + val + "\\n"',
      '      found = True',
      '      break',
      '  if not found: lines.append(key + "=" + val + "\\n")',
      '  with open(path, "w") as f: f.writelines(lines)',
      'else:',
      '  with open(path, "w") as f: f.write(key + "=" + val + "\\n")',
      'print("OK")'
    ].join('\n');
    
    await fetch('/api/terminal', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command: 'python3 -c ' + JSON.stringify(pyScript)})
    });
    
    el.dataset.saved = '1';
    el.style.borderColor = 'var(--success)';
    el.value = val.slice(0, 8) + '...' + val.slice(-4);
    toast('✅ ' + envKey + ' 已保存', 'success');
  } catch(e) {
    toast('保存失败: ' + e.message, 'error');
  }
}

var HERMES_ENV_PATH = 'C:\\Users\\YF00\\AppData\\Local\\hermes\\.env';

function renderOAuthCards() {
  var el = ge('oauthCards');
  if (!el) return;
  
  var oauthProviders = [
    {name:'OpenAI Codex', icon:'🔵', desc:'Codex CLI OAuth 登录', action:'openai-codex'},
    {name:'xAI Grok', icon:'✖️', desc:'xAI Grok OAuth 登录', action:'xai-oauth'},
    {name:'Qwen', icon:'🐉', desc:'通义千问 OAuth 登录', action:'qwen-oauth'},
    {name:'MiniMax', icon:'🤖', desc:'MiniMax OAuth 登录', action:'minimax-oauth'},
    {name:'Nous', icon:'🟣', desc:'Nous Research OAuth', action:'nous'},
  ];
  
  el.innerHTML = oauthProviders.map(function(p) {
    return '<div class="oauth-card">' +
      '<div class="oauth-icon">' + p.icon + '</div>' +
      '<div class="oauth-info">' +
        '<div class="oauth-name">' + p.name + '</div>' +
        '<div class="oauth-desc">' + p.desc + '</div>' +
      '</div>' +
      '<button class="oauth-btn" onclick="toast(\'OAuth 登录通过 Hermes CLI: hermes auth login\', \'info\')">登录</button>' +
    '</div>';
  }).join('');
}

// ====== SETTINGS PAGE ======
async function settingsPageLoad() {
  renderSettingsInfo();
  renderSettingsConnection();
  renderSettingsAppearance();
}

function renderSettingsInfo() {
  var el = ge('settingsInfo');
  if (!el) return;
  
  el.innerHTML = '<div class="gw-status-card">' +
    '<div class="gw-status-row"><span class="gw-label">WebUI</span><span class="gw-value">v2.3.0 · Hermes Desktop 移植版</span></div>' +
    '<div class="gw-status-row"><span class="gw-label">Gateway</span><span class="gw-value" style="color:' + (gatewayOnline ? 'var(--success)' : 'var(--danger)') + '">' + (gatewayOnline ? '🟢 在线 8642' : '🔴 离线') + '</span></div>' +
    '<div class="gw-status-row"><span class="gw-label">Auth Server</span><span class="gw-value">:8647</span></div>' +
    '<div class="gw-status-row"><span class="gw-label">Mailbox</span><span class="gw-value">:8648</span></div>' +
    '<div class="gw-status-row"><span class="gw-label">平台</span><span class="gw-value">Windows 11</span></div>' +
    '<div class="gw-status-row"><span class="gw-label">环境</span><span class="gw-value" style="font-size:10px;font-family:monospace">' + HERMES_ENV_PATH + '</span></div>' +
  '</div>';
}

function renderSettingsConnection() {
  var el = ge('settingsConnection');
  if (!el) return;
  
  el.innerHTML = '<div class="settings-section">' +
    '<h4>连接模式</h4>' +
    '<div class="gw-status-card">' +
      '<div class="gw-status-row"><span class="gw-label">模式</span><span class="gw-value">本地 (Local)</span></div>' +
      '<div class="gw-status-row"><span class="gw-label">API Base</span><span class="gw-value" style="font-family:monospace">' + API_BASE + '</span></div>' +
      '<div class="gw-status-row"><span class="gw-label">Gateway 状态</span><span class="gw-value" id="settingsGwStatus" style="color:' + (gatewayOnline ? 'var(--success)' : 'var(--danger)') + '">' + (gatewayOnline ? '🟢 在线' : '🔴 离线') + '</span></div>' +
    '</div>' +
  '</div>';
  
  // Quick diagnostics
  var diagEl = ge('settingsDiag');
  if (diagEl) {
    diagEl.innerHTML = '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">' +
      '<button class="km-btn km-btn-sec" onclick="runDiag()">🩺 诊断</button>' +
      '<button class="km-btn km-btn-sec" onclick="runDump()">📋 Debug Dump</button>' +
    '</div>' +
    '<pre id="diagOutput" style="margin-top:8px;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:10px;max-height:200px;overflow:auto;display:none"></pre>';
  }
}

function renderSettingsAppearance() {
  var el = ge('settingsAppearance');
  if (!el) return;
  
  el.innerHTML = '<div class="settings-section">' +
    '<h4>主题</h4>' +
    '<div style="display:flex;gap:6px;margin:6px 0 12px">' +
      '<button class="theme-btn active" onclick="setTheme(\'dark\')" style="padding:6px 16px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);cursor:pointer;font-size:11px">🌙 深色</button>' +
      '<button class="theme-btn" onclick="setTheme(\'light\')" style="padding:6px 16px;border-radius:6px;border:1px solid var(--border);background:var(--card-bg);color:var(--text);cursor:pointer;font-size:11px">☀️ 浅色</button>' +
    '</div>' +
    '<h4>隐私</h4>' +
    '<label class="settings-toggle" style="display:flex;align-items:center;gap:8px;font-size:11px;color:var(--text2);margin:6px 0">' +
      '<input type="checkbox" id="analyticsToggle" checked disabled style="accent-color:var(--accent)"> 允许匿名使用统计' +
    '</label>' +
    '<div style="font-size:10px;color:var(--text3);margin:4px 0 12px">当前关闭，仅本地运行不收集数据</div>' +
  '</div>';
}

function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  document.querySelectorAll('.theme-btn').forEach(function(b) { b.classList.remove('active'); });
  var btn = document.querySelector('.theme-btn[onclick*="' + theme + '"]') || document.querySelector('.theme-btn:nth-child(' + (theme === 'dark' ? 1 : 2) + ')');
  if (btn) btn.classList.add('active');
  localStorage.setItem('hermes_theme', theme);
}

// Restore theme
(function() {
  var saved = localStorage.getItem('hermes_theme');
  if (saved) document.documentElement.setAttribute('data-theme', saved);
})();

async function runDiag() {
  var el = ge('diagOutput');
  if (!el) return;
  el.style.display = 'block';
  el.textContent = '诊断中...';
  try {
    var res = await fetch('/api/terminal', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command:'hermes doctor 2>&1 || echo "CLI not available"'})
    });
    var data = await res.json();
    el.textContent = data.output || data.error || '连接失败';
  } catch(e) {
    el.textContent = '错误: ' + e.message;
  }
}

async function runDump() {
  var el = ge('diagOutput');
  if (!el) return;
  el.style.display = 'block';
  el.textContent = '生成 Debug Dump...';
  try {
    var res = await fetch('/api/terminal', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command:'echo === Gateway === && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8642/health 2>&1 && echo && echo === Auth Server === && curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8647/auth/status 2>&1 && echo && echo === Env File === && type ' + HERMES_ENV_PATH + ' 2>nul | head -20'})
    });
    var data = await res.json();
    el.textContent = data.output || data.error || '连接失败';
  } catch(e) {
    el.textContent = '错误: ' + e.message;
  }
}
