// ====== Pages · Just Hermes Agent WEB UI ======
// All page-level rendering and interaction functions

// =============================================
// SKILLS
// =============================================

function loadSavedNames() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {}; }
  catch { return {}; }
}

function saveSkillName(id, name) {
  const n = loadSavedNames();
  n[id] = name;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(n));
}

function resetSkillNames() {
  localStorage.removeItem(STORAGE_KEY);
  renderSkills();
  toast('所有名称已重置', 'success');
}

async function loadSkills() {
  try {
    const res = await fetch(API_BASE + '/api/skills');
    const data = await res.json();
    state.skillsData = data.skills || [];
    const saved = loadSavedNames();
    state.skillsData.forEach(s => { if (saved[s.id]) s.name = saved[s.id]; });
  } catch (e) {
    state.skillsData = [];
  }
}

function renderSkills() {
  const cont = document.getElementById('skillsContainer');
  let filtered = state.skillsData;
  const cats = {};
  filtered.forEach(s => {
    const cat = s.category || 'uncategorized';
    if (!cats[cat]) cats[cat] = [];
    cats[cat].push(s);
  });
  const catKeys = Object.keys(cats).sort();
  document.getElementById('skillCount2').textContent = filtered.length;
  if (catKeys.length === 0) {
    cont.innerHTML = '<div class="empty-state"><div class="icon">🧩</div><h3>暂无技能</h3></div>';
    return;
  }
  let html = '';
  catKeys.forEach(cat => {
    const items = cats[cat];
    const saved = loadSavedNames();
    html += `<div class="cat-header"><h3>${esc(cat)}</h3><span class="cnt">${items.length}</span><span class="line"></span></div><div class="skill-grid">`;
    items.forEach(s => {
      const dName = saved[s.id] || s.name || s.id;
      html += `<div class="skill-card" onclick="openSkill('${esc(s.id)}')">
        <div class="sc-name"><input type="text" value="${esc(dName)}" onfocus="this.select()" onchange="renameSkill('${esc(s.id)}',this.value)" onclick="event.stopPropagation()"></div>
        <div class="sc-id">${esc(s.id)}</div>
        <div class="sc-desc">${esc(s.description || '')}</div>
        <span class="sc-tag">${esc(cat)}</span>
      </div>`;
    });
    html += `</div>`;
  });
  cont.innerHTML = html;
}

function renameSkill(id, newName) {
  if (!newName.trim()) return;
  saveSkillName(id, newName.trim());
  const skill = state.skillsData.find(s => s.id === id);
  if (skill) skill.name = newName.trim();
  toast('已保存: ' + newName.trim(), 'success');
}

async function openSkill(id) {
  try {
    const res = await fetch(API_BASE + '/api/skills/' + encodeURIComponent(id));
    if (!res.ok) throw new Error('Not found');
    const data = await res.json();
    document.getElementById('modalTitle').textContent = data.name || id;
    document.getElementById('modalContent').textContent = data.content || 'No content';
    document.getElementById('modalOverlay').classList.add('show');
  } catch (e) {
    toast('加载失败: ' + id, 'error');
  }
}

// =============================================
// ALL SESSIONS (API, not local)
// =============================================

async function loadAllSessions() {
  try {
    const res = await fetch(API_BASE + '/api/sessions');
    const data = await res.json();
    state.sessionsData = data.sessions || [];
  } catch (e) {
    state.sessionsData = [];
  }
}

function renderAllSessions() {
  const cont = document.getElementById('sessionsContainer');
  document.getElementById('sessionsCount2').textContent = state.sessionsData.length;
  if (state.sessionsData.length === 0) {
    cont.innerHTML = '<div class="empty-state"><div class="icon">📋</div><h3>暂无会话</h3></div>';
    return;
  }
  cont.innerHTML = '<div class="session-list">' + state.sessionsData.map(s => {
    return `<div class="sess-item">
      <span class="sid">${esc(s.id ? s.id.slice(0, 12) : '')}</span>
      <span class="stitle">${esc(s.title || '(untitled)')}</span>
      <span class="stime">${formatTime(s.updated_at || s.created_at)}</span>
      <button class="sdel" onclick="event.stopPropagation();deleteApiSession('${esc(s.id)}')" title="删除">✕</button>
    </div>`;
  }).join('') + '</div>';
}

async function deleteApiSession(id) {
  if (!confirm('确认删除会话 ' + id.slice(0, 12) + '?')) return;
  try {
    const res = await fetch(API_BASE + '/api/sessions/' + encodeURIComponent(id), { method: 'DELETE' });
    const data = await res.json();
    if (data.success) { toast('已删除', 'success'); await loadAllSessions(); renderAllSessions(); }
    else toast('删除失败', 'error');
  } catch (e) { toast('删除失败: ' + e.message, 'error'); }
}

// =============================================
// TERMINAL
// =============================================

async function runTermCmd() {
  const input = document.getElementById('termInput');
  const cmd = input.value.trim();
  if (!cmd) return;
  const box = document.getElementById('termBox');
  box.innerHTML += `<div><span class="prompt">PS></span> ${esc(cmd)}</div>`;
  box.scrollTop = box.scrollHeight;
  input.value = '';
  try {
    const res = await fetch(API_BASE + '/api/terminal', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ command: cmd })
    });
    const data = await res.json();
    if (data.output) box.innerHTML += `<div style="color:#8f8;white-space:pre-wrap">${esc(data.output)}</div>`;
    if (data.error)  box.innerHTML += `<div style="color:#e55;white-space:pre-wrap">${esc(data.error)}</div>`;
    box.innerHTML += `<div class="pinfo">exit code: ${data.exit_code}</div>`;
  } catch (e) { box.innerHTML += `<div class="perr">(连接失败: ${esc(e.message || '')})</div>`; }
  box.scrollTop = box.scrollHeight;
}

// =============================================
// MODELS
// =============================================

function renderModels() {
  const grid = document.getElementById('modelGrid');
  grid.innerHTML = MODELS.map((m, i) => {
    const ia = i === state.currentModelIdx;
    return `<div class="model-card${ia ? ' active' : ''}" onclick="selectModel(${i})">
      <div class="mc-top"><span class="mc-name">${m.name}</span><span class="mc-badge ${m.badge}">● ${m.badge === 'online' ? '在线' : '离线'}</span></div>
      <div class="mc-provider">${m.provider} · ${m.ctx} ctx</div>
      <div class="mc-stats">
        <div class="mc-stat"><div class="v">${m.speed}</div><div class="l">tok/s</div></div>
        <div class="mc-stat"><div class="v">${m.latency}</div><div class="l">ms</div></div>
        <div class="mc-stat"><div class="v">$${m.cost}</div><div class="l">/M tokens</div></div>
        <div class="mc-stat"><div class="v">${m.tool ? '✓' : '✗'}</div><div class="l">tool use</div></div>
      </div>
      <button class="mc-action${ia ? ' current' : ''}">${ia ? '✓ 当前' : '切换'}</button>
    </div>`;
  }).join('');
}

function selectModel(i) {
  state.currentModelIdx = i;
  const m = MODELS[i];
  document.getElementById('pillModelName').textContent = m.name;
  renderModels();
  toast('已切换到 ' + m.name, 'success');
}

// =============================================
// MY FILES (browser localStorage)
// =============================================

function loadFiles() {
  try { return JSON.parse(localStorage.getItem(FILES_KEY)) || []; }
  catch { return []; }
}

function saveFiles(files) {
  localStorage.setItem(FILES_KEY, JSON.stringify(files));
}

function getFileIcon(name, type) {
  const ext = name.split('.').pop().toLowerCase();
  if (type?.startsWith('image/')) return '🖼️';
  if (type?.startsWith('text/') || ['txt','md','json','js','py','html','css','xml','yaml','yml','toml','ini','cfg','log','sh','bat','ps1'].includes(ext)) return '📄';
  if (['pdf'].includes(ext)) return '📕';
  if (['doc','docx','xls','xlsx','ppt','pptx'].includes(ext)) return '📋';
  if (['zip','rar','7z','tar','gz'].includes(ext)) return '📦';
  if (['png','jpg','jpeg','gif','svg','webp','ico'].includes(ext)) return '🖼️';
  if (['mp3','wav','flac','aac','ogg'].includes(ext)) return '🎵';
  if (['mp4','avi','mov','mkv'].includes(ext)) return '🎬';
  if (['psd','ai','sketch','fig'].includes(ext)) return '🎨';
  return '📄';
}

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1048576) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / 1048576).toFixed(1) + ' MB';
}

function uploadFile() { document.getElementById('fileInput').click(); }

function handleFiles(fileList) {
  const files = loadFiles();
  let count = 0;
  Array.from(fileList).forEach(file => {
    const reader = new FileReader();
    reader.onload = function (e) {
      const dataUrl = e.target.result;
      const isImage = file.type.startsWith('image/');
      const isText = file.type.startsWith('text/') || ['txt','md','json','js','py','html','css','xml','yaml','yml','log','sh','bat','ps1'].includes(file.name.split('.').pop()?.toLowerCase());
      const isSmall = dataUrl.length < 500000;
      files.unshift({
        id: Date.now().toString(36) + '_' + count,
        name: file.name,
        size: file.size,
        type: file.type,
        date: new Date().toISOString(),
        content: isSmall ? dataUrl : null,
        note: ''
      });
      count++;
      saveFiles(files);
      renderFiles();
      toast('已上传: ' + file.name, 'success');
    };
    if (file.size < 5000000) { reader.readAsDataURL(file); }
    else { toast('文件太大: ' + file.name + ' (超过5MB)', 'error'); }
  });
}

function renderFiles() {
  const cont = document.getElementById('filesContainer');
  const files = loadFiles();
  if (files.length === 0) {
    cont.innerHTML = '<div class="empty-state"><div class="icon">📁</div><h3>暂无文件</h3><p>点击「上传文件」选择文档、设计图稿等</p></div>';
    return;
  }
  cont.innerHTML = '<div class="file-grid">' + files.map(f => {
    const icon = getFileIcon(f.name, f.type);
    const size = formatFileSize(f.size);
    const time = new Date(f.date).toLocaleDateString('zh-CN');
    const isImage = f.type?.startsWith('image/') && f.content;
    return `<div class="file-card" onclick="viewFile('${f.id}')">
      <button class="fc-del" onclick="event.stopPropagation();deleteFile('${f.id}')">✕</button>
      ${isImage && f.content ? `<div class="fc-icon"><img src="${f.content}" style="max-width:100%;max-height:80px;border-radius:4px;object-fit:contain" alt="${esc(f.name)}"></div>`
        : `<div class="fc-icon">${icon}</div>`}
      <div class="fc-name">${esc(f.name)}</div>
      <div class="fc-meta"><span>${size}</span><span>${time}</span></div>
    </div>`;
  }).join('') + '</div>';
}

function viewFile(id) {
  const files = loadFiles();
  const f = files.find(x => x.id === id);
  if (!f) return;
  if (f.content) {
    const isImage = f.type?.startsWith('image/');
    if (isImage && f.content.startsWith('data:image/')) {
      document.getElementById('modalTitle').textContent = '🖼️ ' + f.name;
      document.getElementById('modalContent').innerHTML = `<img src="${f.content}" style="max-width:100%;border-radius:4px" alt="${esc(f.name)}">`;
    } else {
      document.getElementById('modalTitle').textContent = '📄 ' + f.name;
      try {
        const raw = atob(f.content.split(',')[1] || '');
        document.getElementById('modalContent').textContent = raw.length < 5000 ? raw : '(文件内容过长，仅展示前5000字符)\n\n' + raw.slice(0, 5000);
      } catch (e) {
        document.getElementById('modalContent').textContent = '(二进制文件，无法预览文本)';
      }
    }
  } else {
    document.getElementById('modalTitle').textContent = '📄 ' + f.name;
    document.getElementById('modalContent').textContent = '(文件较大，未存储内容)\n\n名称: ' + f.name + '\n大小: ' + formatFileSize(f.size) + '\n类型: ' + f.type + '\n日期: ' + new Date(f.date).toLocaleString('zh-CN');
  }
  document.getElementById('modalOverlay').classList.add('show');
}

function deleteFile(id) {
  if (!confirm('确认删除此文件？')) return;
  saveFiles(loadFiles().filter(x => x.id !== id));
  renderFiles();
  toast('已删除文件', 'success');
}

function clearAllFiles() {
  if (!confirm('确认清空所有文件？')) return;
  saveFiles([]);
  renderFiles();
  toast('已清空全部文件', 'success');
}

// =============================================
// TRASH RENDER
// =============================================

function renderTrash() {
  const cont = document.getElementById('trashContainer');
  state.trashItems = loadTrash();
  const count = state.trashItems.length;
  document.getElementById('trashCount').textContent = count;
  if (count === 0) { cont.innerHTML = '<div class="empty-state"><div class="icon">🗑️</div><h3>回收站为空</h3></div>'; return; }
  cont.innerHTML = state.trashItems.map(s => {
    const time = ta(s.deletedAt);
    return `<div class="trash-item">
      <span class="ti-title">${esc(s.title || '未命名会话')} (${s.messages?.length || 0}条消息)</span>
      <span class="ti-time">${time}</span>
      <div class="ti-actions">
        <button class="restore" onclick="restoreTrash('${s.id}')">↩ 恢复</button>
        <button class="perm-del" onclick="permDeleteTrash('${s.id}')">✕ 永久删除</button>
      </div>
    </div>`;
  }).join('');
}

// =============================================
// MEMORY PAGE
// =============================================

function loadMemory() {
  const cont = document.getElementById('memoryContainer');
  const sessions = ls();
  const s = sessions.find(x => x.id === state.currentSessionId);
  if (s && s.messages && s.messages.length > 0) {
    const lastMsg = s.messages[s.messages.length - 1];
    const m = MODELS[state.currentModelIdx];
    cont.innerHTML = `<div class="memory-card">
      <div class="mc-label">当前会话</div><div class="mc-val">${esc(s.title || '新对话')}</div>
      <div class="mc-label" style="margin-top:10px">备注</div><div class="mc-val small">${esc(s.notes || '无备注')}</div>
      <div class="mc-label" style="margin-top:10px">消息数</div><div class="mc-val">${s.messages.length} 条</div>
      <div class="mc-label" style="margin-top:10px">最后消息预览</div><div class="mc-val small">${esc(lastMsg.content.slice(0, 80))}${lastMsg.content.length > 80 ? '…' : ''}</div>
      <div class="mc-label" style="margin-top:10px">当前模型</div><div class="mc-val small">${m.name} (${m.provider})</div>
      <div class="mc-label" style="margin-top:10px">记忆模式</div><div class="mc-val small">仅当前会话 · 不打开不读取 · 节省算力</div>
    </div>`;
  } else {
    cont.innerHTML = `<div class="empty-state"><div class="icon">🧠</div><h3>当前无活跃对话</h3>
      <p>记忆作用于当前会话，不打开不会读取，减少算力消耗</p>
      <div class="memory-card" style="margin-top:12px;text-align:left">
        <div class="mc-label">当前模型</div><div class="mc-val small">${MODELS[state.currentModelIdx].name}</div>
        <div class="mc-label" style="margin-top:6px">记忆模式</div><div class="mc-val small">仅当前会话 · 不打开不读取</div>
      </div>
    </div>`;
  }
}

// =============================================
// USAGE
// =============================================

function loadUsage() {
  document.getElementById('usageSkills').textContent = state.skillsData.length;
  document.getElementById('usageSessions').textContent = state.sessionsData.length;
  document.getElementById('usageModel').textContent = MODELS[state.currentModelIdx].name;
}

// =============================================
// LOGS
// =============================================

function loadLogs() {
  const cont = document.getElementById('logsContainer');
  const entries = [
    { time: new Date(), level: 'info', msg: 'Dashboard v3 loaded, system ready' },
    { time: new Date(Date.now() - 60000), level: 'info', msg: `API server: ${API_BASE}/health → 200` },
    { time: new Date(Date.now() - 120000), level: 'info', msg: `Skills: ${state.skillsData.length} installed` },
    { time: new Date(Date.now() - 180000), level: 'info', msg: `Sessions: ${state.sessionsData.length} in DB` },
    { time: new Date(Date.now() - 300000), level: 'info', msg: `Model: ${MODELS[state.currentModelIdx].name}` },
  ];
  if (state.skillsData.length === 0) { cont.innerHTML = '<div class="empty-state"><div class="icon">📁</div><h3>暂无详细日志</h3><p>API 数据将在连接后显示</p></div>'; return; }
  cont.innerHTML = entries.map(e => {
    return `<div class="log-entry"><span class="lt">[${e.time.toLocaleTimeString('zh-CN')}]</span><span class="ll ${e.level}">${e.level}</span>${esc(e.msg)}</div>`;
  }).join('');
}

// =============================================
// MODAL
// =============================================

function closeModal() {
  document.getElementById('modalOverlay').classList.remove('show');
}
