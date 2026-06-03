// ====== Integrations · Just Hermes Agent WEB UI ======
// Platform connections: WeChat, Feishu, DingTalk, Telegram, etc.
// Uses Hermes Gateway pairing mechanism for QR code login.
// Once connected → stays connected (no auto-drop).

// ====== STATE ======
var integrations = {
  platforms: {},
  pairingCode: null,
  qrImage: null,
  polling: false,
  activePlatform: null
};

// Platform definitions
var PLATFORMS = [
  { key: 'weixin',   name: '微信',         icon: '💚', color: '#07c160', url: '', desc: '个人微信 · 扫码连接' },
  { key: 'feishu',   name: '飞书',         icon: '📎', color: '#3370ff', url: '', desc: '扫码连接飞书' },
  { key: 'dingtalk', name: '钉钉',         icon: '🔔', color: '#0089ff', url: '', desc: '扫码连接钉钉' },
  { key: 'telegram', name: 'Telegram',     icon: '✈️', color: '#0088cc', url: 'https://t.me/hermes_agent_bot', desc: 'Telegram Bot 连接' },
  { key: 'discord',  name: 'Discord',      icon: '🎮', color: '#5865f2', url: '', desc: '扫码连接 Discord' },
  { key: 'slack',    name: 'Slack',        icon: '#',  color: '#4a154b', url: '', desc: 'Slack 连接' },
  { key: 'whatsapp', name: 'WhatsApp',     icon: '💬', color: '#25d366', url: '', desc: '扫码连接 WhatsApp' },
  { key: 'signal',   name: 'Signal',       icon: '🔵', color: '#3b82f6', url: '', desc: 'Signal 连接' },
  { key: 'wecom',    name: '企业微信',     icon: '💼', color: '#07c160', url: '', desc: '企业微信连接' },
];

// Load platform status
async function integrationsLoad() {
  try {
    var res = await fetch('/api/terminal', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command:'hermes pairing list'})
    });
    var data = await res.json();
    var output = data.output || '';
    
    // Parse the pairing list output
    var lines = output.split('\n');
    var currentPlatform = null;
    
    lines.forEach(function(line) {
      // Match: "Platform     User ID              Name"
      // After separator line, data lines: "weixin       xxx@im.wechat  xxx"
      if (line.trim() && !line.startsWith('-') && !line.startsWith('Plat') && !line.startsWith('No ')) {
        var parts = line.trim().split(/\s{2,}/);
        if (parts.length >= 2) {
          var key = parts[0].trim().toLowerCase();
          if (key) {
            integrations.platforms[key] = {
              connected: true,
              userId: parts[1] || '',
              name: parts[2] || parts[1] || ''
            };
          }
        }
      }
    });
    
    renderIntegrations();
  } catch(e) {
    console.error('Integrations load error:', e);
  }
}

// Generate pairing QR code
async function integrationsPair(platformKey) {
  var platform = PLATFORMS.find(function(p) { return p.key === platformKey; });
  if (!platform) return;
  
  integrations.activePlatform = platformKey;
  
  // Show pairing modal
  showPairingModal(platform);
  
  try {
    var res = await fetch('/api/terminal', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command:'hermes pairing --platform ' + platformKey + ' 2>&1'})
    });
    var data = await res.json();
    var output = data.output || data.error || '';
    
    // Check for QR code in output
    var qrMatch = output.match(/https?:\/\/[^\s]+/);
    var codeMatch = output.match(/code[=:]\s*([A-Za-z0-9]+)/i);
    
    if (codeMatch) {
      integrations.pairingCode = codeMatch[1];
      var qrEl = ge('pairingQrCode');
      if (qrEl) qrEl.textContent = integrations.pairingCode;
      
      // Generate QR image URL if available
      integrations.qrImage = null;
      var qrImg = ge('pairingQrImage');
      if (qrImg) {
        qrImg.src = '/static/qr_' + integrations.pairingCode + '.png';
        qrImg.style.display = 'block';
      }
      
      var statusEl = ge('pairingStatus');
      if (statusEl) {
        statusEl.textContent = '请用 ' + platform.name + ' 扫描二维码或输入配对码：' + integrations.pairingCode;
        statusEl.className = 'pi-status waiting';
      }
      
      // Start polling for connection
      startPollingPairing(platformKey);
    } else if (qrMatch) {
      integrations.qrImage = qrMatch[0];
      var qrImg = ge('pairingQrImage');
      if (qrImg) {
        qrImg.src = integrations.qrImage;
        qrImg.style.display = 'block';
      }
      var statusEl = ge('pairingStatus');
      if (statusEl) {
        statusEl.textContent = '请用 ' + platform.name + ' 扫描二维码';
        statusEl.className = 'pi-status waiting';
      }
      startPollingPairing(platformKey);
    } else {
      var statusEl = ge('pairingStatus');
      if (statusEl) {
        statusEl.textContent = '生成配对码中...\n' + output.slice(0, 200);
        statusEl.className = 'pi-status error';
      }
    }
  } catch(e) {
    var statusEl = ge('pairingStatus');
    if (statusEl) {
      statusEl.textContent = '连接失败: ' + e.message;
      statusEl.className = 'pi-status error';
    }
  }
}

// Poll for pairing completion
function startPollingPairing(platformKey) {
  if (integrations.polling) return;
  integrations.polling = true;
  
  var pollInterval = setInterval(async function() {
    try {
      // Re-load pairing list to check if connected
      var res = await fetch('/api/terminal', {
        method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
        body:JSON.stringify({command:'hermes pairing list'})
      });
      var data = await res.json();
      var output = data.output || '';
      
      // Check if our platform appeared
      var connected = output.indexOf(platformKey) >= 0 || output.indexOf('Approved') >= 0;
      
      if (connected) {
        clearInterval(pollInterval);
        integrations.polling = false;
        
        var statusEl = ge('pairingStatus');
        if (statusEl) {
          statusEl.textContent = '✅ ' + PLATFORMS.find(function(p) { return p.key === platformKey; }).name + ' 已连接!';
          statusEl.className = 'pi-status success';
        }
        
        integrations.platforms[platformKey] = { connected: true };
        renderIntegrations();
        
        toast(PLATFORMS.find(function(p) { return p.key === platformKey; }).name + ' 连接成功', 'success');
        playChime();
        
        // Close modal after 2s
        setTimeout(function() {
          closePairingModal();
        }, 2000);
      }
    } catch(e) {}
  }, 2000);
  
  // Timeout after 60s
  setTimeout(function() {
    if (integrations.polling) {
      clearInterval(pollInterval);
      integrations.polling = false;
      var statusEl = ge('pairingStatus');
      if (statusEl) {
        statusEl.textContent = '⏱ 超时，请重试';
        statusEl.className = 'pi-status error';
      }
    }
  }, 60000);
}

// Disconnect platform
async function integrationsDisconnect(platformKey) {
  if (!confirm('确认断开 ' + (PLATFORMS.find(function(p) { return p.key === platformKey; }).name) + ' 连接？')) return;
  
  try {
    var res = await fetch('/api/terminal', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command:'hermes pairing revoke ' + platformKey})
    });
    var data = await res.json();
    
    delete integrations.platforms[platformKey];
    renderIntegrations();
    toast('已断开连接', 'success');
  } catch(e) {
    toast('断开失败: ' + e.message, 'error');
  }
}

// ====== UI RENDER ======
function renderIntegrations() {
  var grid = ge('integrationsGrid');
  if (!grid) return;
  
  var allPlatforms = PLATFORMS;
  var connected = 0;
  
  allPlatforms.forEach(function(p) {
    if (integrations.platforms[p.key] && integrations.platforms[p.key].connected) connected++;
  });
  
  var cnt = ge('integrationsCount');
  if (cnt) cnt.textContent = connected + '/' + allPlatforms.length;
  
  grid.innerHTML = allPlatforms.map(function(p) {
    var isConnected = integrations.platforms[p.key] && integrations.platforms[p.key].connected;
    
    return '<div class="pi-card' + (isConnected ? ' connected' : '') + '">' +
      '<div class="pi-card-left">' +
        '<div class="pi-icon" style="background:' + p.color + '20;color:' + p.color + '">' + p.icon + '</div>' +
        '<div class="pi-info">' +
          '<div class="pi-name">' + p.name + (isConnected ? ' <span class="pi-badge">已连接</span>' : '') + '</div>' +
          '<div class="pi-desc">' + p.desc + '</div>' +
        '</div>' +
      '</div>' +
      '<div class="pi-card-right">' +
        (isConnected
          ? '<button class="pi-btn pi-btn-disconnect" onclick="integrationsDisconnect(\'' + p.key + '\')">断开</button>'
          : '<button class="pi-btn pi-btn-connect" onclick="integrationsPair(\'' + p.key + '\')">连接</button>'
        ) +
      '</div>' +
    '</div>';
  }).join('');
  
  // Update status indicators
  updateTopbarPlatformStatus();
}

function updateTopbarPlatformStatus() {
  var el = ge('platformStatus');
  if (!el) return;
  
  var connectedPlatforms = PLATFORMS.filter(function(p) {
    return integrations.platforms[p.key] && integrations.platforms[p.key].connected;
  });
  
  if (connectedPlatforms.length === 0) {
    el.innerHTML = '';
    return;
  }
  
  el.innerHTML = connectedPlatforms.map(function(p) {
    return '<span class="platform-dot" style="background:' + p.color + '" title="' + p.name + ' 已连接">' + p.icon + '</span>';
  }).join('');
}

// ====== PAIRING MODAL ======
function showPairingModal(platform) {
  var modal = ge('pairingModal');
  var title = ge('pairingModalTitle');
  var status = ge('pairingStatus');
  var qrImg = ge('pairingQrImage');
  var qrCode = ge('pairingQrCode');
  
  if (title) title.textContent = platform.icon + ' ' + platform.name + ' 连接';
  if (status) { status.textContent = '生成配对码中...'; status.className = 'pi-status'; }
  if (qrImg) { qrImg.src = ''; qrImg.style.display = 'none'; }
  if (qrCode) qrCode.textContent = '';
  
  if (modal) modal.style.display = 'flex';
}

function closePairingModal() {
  var modal = ge('pairingModal');
  if (modal) modal.style.display = 'none';
  integrations.activePlatform = null;
  
  if (integrations.polling) {
    integrations.polling = false;
  }
}
