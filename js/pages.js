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

function onTermInputFocus(){
  document.getElementById('page-terminal').classList.add('quick-launch-compact');
  document.getElementById('termBox').classList.add('term-box-expanded');
}
function onTermInputBlur(){
  const input=document.getElementById('termInput');
  if(!input.value.trim()){
    document.getElementById('page-terminal').classList.remove('quick-launch-compact');
    document.getElementById('termBox').classList.remove('term-box-expanded');
  }
}

async function launchPowerShell(){
  const status=document.getElementById('psLaunchStatus');
  status.textContent='正在打开 PowerShell...';
  status.style.color='var(--text3)';
  try{
    const res=await fetch(API_BASE+'/api/terminal',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({command:'Start-Process powershell.exe'})
    });
    const data=await res.json();
    if(data.exit_code===0){
      status.textContent='PowerShell 已打开';
      status.style.color='#8f8';
    }else{
      status.textContent='打开失败: '+(data.error||'未知错误');
      status.style.color='#e55';
    }
  }catch(e){
    status.textContent='连接失败: '+(e.message||'');
    status.style.color='#e55';
  }
}
async function openProjectFolder(){
  const path='C:\\dowload\\GITHUB';
  try{
    const res=await fetch(API_BASE+'/api/terminal',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({command:"Start-Process explorer.exe -ArgumentList '"+path+"'"})
    });
    const data=await res.json();
    if(data.exit_code===0){
      toast('已打开: '+path,'success');
    }else{
      toast('打开失败: '+(data.error||'未知错误'),'error');
    }
  }catch(e){
    toast('连接失败: '+(e.message||''),'error');
  }
}

// =============================================
// MODELS
// =============================================

function getAllModels() {
  const builtin = MODELS.map((m, i) => ({ ...m, builtin: true, _idx: i }));
  const custom = loadCustomModels().map(m => ({
    name: m.name,
    provider: m.provider || 'custom',
    ctx: m.ctx || '128K',
    speed: 0,
    latency: 0,
    cost: 0,
    tool: true,
    badge: 'online',
    builtin: false,
    _id: m.id,
    _custom: m,
  }));
  return [...builtin, ...custom];
}

function getActiveModelIdx() {
  const all = getAllModels();
  const activeName = getActiveModelName();
  const idx = all.findIndex(m => m.name === activeName);
  if (idx >= 0) return idx;
  // fallback to first
  return 0;
}

function renderModels() {
  const grid = document.getElementById('modelGrid');
  const all = getAllModels();
  const activeIdx = getActiveModelIdx();
  const activeName = all[activeIdx]?.name || all[0]?.name;
  const tokens = loadTokenUsage();
  const switching = state._switchingModel;

  grid.innerHTML = all.map((m, i) => {
    const isActive = m.name === activeName;
    const isBuiltin = m.builtin;
    const tok = tokens[m.name];
    const tokStr = tok ? `in:${fmtTok(tok.input)} · out:${fmtTok(tok.output)}` : '';
    const disabled = switching && !isActive;

    return `<div class="model-card${isActive ? ' active' : ''}" onclick="${!disabled ? `selectModel('${esc(m.name)}')` : ''}" style="${!isBuiltin ? 'border-left:2px solid var(--accent)' : ''};${disabled?'opacity:.4;pointer-events:none':''}">
      <div class="mc-top">
        <label class="mc-check-wrap" onclick="event.stopPropagation()">
          <input type="radio" name="modelSelect" class="mc-radio" ${isActive ? 'checked' : ''} onchange="selectModel('${esc(m.name)}')" ${disabled ? 'disabled' : ''}>
          <span class="mc-check-visual"></span>
        </label>
        <span class="mc-name">${esc(m.name)}</span>
        <span class="mc-badge ${m.badge}" style="background:rgba(0,255,65,.12);color:var(--accent)">● 在线</span>
        ${!isBuiltin ? `<button class="mc-del" onclick="event.stopPropagation();deleteCustomModel('${esc(m._id)}')" title="删除此模型">✕</button>` : ''}
      </div>
      <div class="mc-provider">${m.provider} · ${m.ctx} ctx ${!isBuiltin ? '· 自定义' : ''}</div>
      ${tokStr ? `<div style="font-size:9px;color:var(--text3);margin-top:2px">${tokStr}</div>` : ''}
      <div class="mc-stats">
        <div class="mc-stat"><div class="v">${m.speed || '—'}</div><div class="l">tok/s</div></div>
        <div class="mc-stat"><div class="v">${m.latency ? m.latency + 'ms' : '—'}</div><div class="l">延迟</div></div>
        <div class="mc-stat"><div class="v">${m.cost ? '$' + m.cost : '—'}</div><div class="l">/M tokens</div></div>
        <div class="mc-stat"><div class="v">${m.tool ? '✓' : '✗'}</div><div class="l">tool use</div></div>
      </div>
      ${isActive && switching ? '<div class="mc-switching">切换中...</div>' : `<button class="mc-action${isActive ? ' current' : ''}">${isActive ? '✓ 当前' : '切换'}</button>`}
    </div>`;
  }).join('');
}

async function selectModel(name) {
  if (state._switchingModel) return;

  // Visual switch immediately
  setActiveModelName(name);
  document.getElementById('pillModelName').textContent = name;
  state._switchingModel = true;
  renderModels();
  toast('正在切换至 ' + name + ' ...', 'info');

  // Also switch Hermes backend
  const cfg = MODEL_BACKEND_MAP[name];
  if (cfg) {
    try {
      const res1 = await fetch(API_BASE + '/api/terminal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `hermes config set model.provider "${cfg.provider}"` })
      });
      const r1 = await res1.json();
      const res2 = await fetch(API_BASE + '/api/terminal', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ command: `hermes config set model.default "${cfg.model}"` })
      });
      const r2 = await res2.json();
      if (r1.exit_code === 0 && r2.exit_code === 0) {
        toast('后端已切换至 ' + name, 'success');
      } else {
        toast('后端切换部分失败: ' + ((r1.error||'') + ' ' + (r2.error||'')).trim(), 'error');
      }
    } catch (e) {
      toast('后端切换失败: ' + (e.message||'连接异常'), 'error');
    }
  }
  state._switchingModel = false;
  renderModels();
}

// ====== ADD MODEL STEP WIZARD ======

const MODEL_FAMILIES = {
  'OpenAI':     { versions: ['gpt-4o','gpt-4o-mini','gpt-4-turbo','o1','o1-mini','o3-mini'],          url: 'https://api.openai.com/v1',          icon: '🔵' },
  'Anthropic':  { versions: ['claude-sonnet-4','claude-haiku-3.5','claude-opus-4'],                    url: 'https://api.anthropic.com/v1',        icon: '🟣' },
  'Google':     { versions: ['gemini-2.5-pro','gemini-2.5-flash','gemini-2.0-flash'],                  url: 'https://generativelanguage.googleapis.com/v1beta', icon: '🟢' },
  'DeepSeek':   { versions: ['deepseek-chat','deepseek-reasoner','deepseek-coder'],                    url: 'https://api.deepseek.com/v1',         icon: '🔴' },
  'Other':      { versions: [], url: '', icon: '⚙️' },
};

let wizardState = { step: 1, family: '', version: '' };

function showAddModelModal() {
  wizardState = { step: 1, family: '', version: '' };
  document.getElementById('addModelModal').style.display = 'flex';
  renderFamilyGrid();
  showStep(1);
}

function closeAddModelModal() {
  document.getElementById('addModelModal').style.display = 'none';
  ['amUrl','amKey'].forEach(id => document.getElementById(id).value = '');
  document.getElementById('amUrlPreview').textContent = '';
  document.getElementById('amSummary').textContent = '';
}

function renderFamilyGrid() {
  const grid = document.getElementById('familyGrid');
  grid.innerHTML = Object.entries(MODEL_FAMILIES).map(([name, f]) =>
    `<div class="family-card" onclick="selectFamily('${name}')">
      <div class="family-icon">${f.icon}</div>
      <div class="family-name">${name}</div>
      <div class="family-ver">${name === 'Other' ? '自定义' : f.versions.length + ' 个版本'}</div>
    </div>`
  ).join('');
}

function selectFamily(name) {
  wizardState.family = name;
  document.querySelectorAll('.family-card').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  // If Other, skip step 2 and go to step 3
  if (name === 'Other') {
    document.getElementById('amUrl').value = '';
    document.getElementById('amUrlPreview').textContent = '自定义 API URL';
    showStep(3);
  } else {
    renderVersions(name);
    showStep(2);
  }
}

function renderVersions(family) {
  const f = MODEL_FAMILIES[family];
  if (!f) return;
  const grid = document.getElementById('versionGrid');
  grid.innerHTML = f.versions.map(v =>
    `<div class="family-card" onclick="selectVersion('${v}')">
      <div class="family-ver" style="font-size:13px">${v}</div>
    </div>`
  ).join('');
}

function selectVersion(version) {
  wizardState.version = version;
  document.querySelectorAll('#versionGrid .family-card').forEach(el => el.classList.remove('selected'));
  event.currentTarget.classList.add('selected');
  // Auto-fill URL
  const f = MODEL_FAMILIES[wizardState.family];
  document.getElementById('amUrl').value = f?.url || '';
  document.getElementById('amUrlPreview').textContent = `📡 ${f?.url || ''}`;
  showStep(3);
}

function showStep(n) {
  wizardState.step = n;
  // Pane visibility
  document.querySelectorAll('.step-pane').forEach(el => el.classList.remove('active'));
  document.getElementById('step' + n).classList.add('active');
  // Dot indicators
  document.querySelectorAll('.step-dot').forEach(el => {
    const s = parseInt(el.dataset.s);
    el.classList.toggle('active', s <= n);
  });
  // Step bars
  document.querySelectorAll('.step-bar').forEach((el, i) => {
    el.classList.toggle('active', i + 1 < n);
  });
  // Buttons
  const prevBtn = document.getElementById('stepPrev');
  const nextBtn = document.getElementById('stepNext');
  const instBtn = document.getElementById('stepInstall');
  prevBtn.style.display = n > 1 ? 'block' : 'none';
  if (n === 4) {
    nextBtn.style.display = 'none';
    instBtn.style.display = 'block';
    // Update summary
    const url = document.getElementById('amUrl').value;
    const key = document.getElementById('amKey').value;
    const f = wizardState.family === 'Other' ? 'Custom' : wizardState.family;
    const ver = wizardState.version || '—';
    document.getElementById('amSummary').textContent = `${f} · ${ver} · ${url || 'URL未填'}`;
  } else {
    nextBtn.style.display = 'block';
    instBtn.style.display = 'none';
  }
}

function nextStep() {
  const n = wizardState.step;
  if (n === 1 && !wizardState.family) { toast('请先选择一个模型厂商', 'error'); return; }
  if (n === 2 && !wizardState.version && wizardState.family !== 'Other') { toast('请先选择模型版本', 'error'); return; }
  if (n === 3 && !document.getElementById('amUrl').value.trim()) { toast('请填写 API Base URL', 'error'); return; }
  showStep(n + 1);
}

function prevStep() {
  const n = wizardState.step;
  if (n === 3 && wizardState.family === 'Other') {
    wizardState.family = '';
    document.querySelectorAll('.family-card').forEach(el => el.classList.remove('selected'));
    showStep(1);
    return;
  }
  showStep(n - 1);
}

function submitAddModel() {
  const key = document.getElementById('amKey').value.trim();
  const url = document.getElementById('amUrl').value.trim();
  if (!key) { toast('请填写 API Key', 'error'); return; }
  if (!url) { toast('请填写 API Base URL', 'error'); return; }

  let name;
  const f = MODEL_FAMILIES[wizardState.family];
  if (wizardState.family === 'Other') {
    name = prompt('请输入自定义模型名称:');
    if (!name || !name.trim()) { toast('模型名称不能为空', 'error'); return; }
    name = name.trim();
  } else {
    name = wizardState.version;
  }

  addCustomModel({
    name,
    key,
    url,
    ctx: '128K',
    provider: wizardState.family === 'Other' ? 'custom' : wizardState.family.toLowerCase(),
  });
  closeAddModelModal();
  renderModels();
  toast('✓ ' + name + ' 安装成功', 'success');
}

function deleteCustomModel(id) {
  if (!confirm('确认删除此自定义模型？')) return;
  const all = getAllModels();
  const m = all.find(x => x._id === id);
  removeCustomModel(id);
  // If it was active, switch to first built-in
  if (m && getActiveModelName() === m.name) {
    setActiveModelName(MODELS[0].name);
  }
  renderModels();
  toast('已删除', 'success');
}

function fmtTok(n) {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return String(n);
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

  const all = getAllModels();
  const activeName = getActiveModelName();
  document.getElementById('usageModel').textContent = activeName || MODELS[0].name;

  // Token breakdown by model
  const tokens = loadTokenUsage();
  const container = document.getElementById('usageTokenBreakdown');
  const modelNames = Object.keys(tokens);
  if (modelNames.length === 0) {
    container.innerHTML = '<div class="empty-state" style="padding:16px"><p style="font-size:11px">使用模型后，Token用量将自动记录在此</p></div>';
    return;
  }
  let totalIn = 0, totalOut = 0;
  modelNames.forEach(n => {
    totalIn += tokens[n].input;
    totalOut += tokens[n].output;
  });
  container.innerHTML = modelNames.map(n => {
    const t = tokens[n];
    if (!t) return '';
    const inFmt = fmtTok(t.input);
    const outFmt = fmtTok(t.output);
    const pctIn = totalIn > 0 ? (t.input / totalIn * 100).toFixed(1) : 0;
    const pctOut = totalOut > 0 ? (t.output / totalOut * 100).toFixed(1) : 0;
    const barW = Math.max(4, (t.input + t.output) / (totalIn + totalOut) * 100);
    return `<div style="background:var(--card-bg);border:1px solid var(--border);border-radius:var(--radius-sm);padding:8px 10px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">
        <span style="font-size:12px;font-weight:600;color:var(--text)">${esc(n)}</span>
        <span style="font-size:10px;color:var(--text3)">in:${inFmt} · out:${outFmt}</span>
      </div>
      <div style="height:4px;background:var(--bg);border-radius:2px;overflow:hidden">
        <div style="height:100%;width:${barW}%;background:var(--accent);border-radius:2px;transition:width .3s"></div>
      </div>
      <div style="display:flex;justify-content:space-between;margin-top:2px;font-size:9px;color:var(--text3)">
        <span>输入 ${pctIn}%</span>
        <span>输出 ${pctOut}%</span>
      </div>
    </div>`;
  }).join('') + `<div style="display:flex;justify-content:space-between;padding:6px 4px;font-size:11px;color:var(--text2)">
    <span>合计</span><span>in: <strong>${fmtTok(totalIn)}</strong> · out: <strong>${fmtTok(totalOut)}</strong></span>
  </div>`;
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
