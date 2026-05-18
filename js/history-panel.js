// ====== History Panel · Just Hermes Agent WEB UI ======
// Collapsible sidebar history panel

// Toggle whole panel open/closed
function historyToggle() {
  const panel = document.getElementById('historyPanel');
  const isCollapsed = panel.classList.toggle('collapsed');
  const btn = document.getElementById('historyToggle');
  btn.textContent = isCollapsed ? '▶' : '◀';
  btn.title = isCollapsed ? '展开历史' : '收起历史';
  localStorage.setItem(COLLAPSE_KEY, isCollapsed ? '1' : '0');
}

function historyCollapse() {
  const panel = document.getElementById('historyPanel');
  if (!panel.classList.contains('collapsed')) historyToggle();
}

// Restore panel collapse state on load
if (localStorage.getItem(COLLAPSE_KEY) === '1') {
  document.getElementById('historyPanel').classList.add('collapsed');
  document.getElementById('historyToggle').textContent = '▶';
  document.getElementById('historyToggle').title = '展开历史';
}

// Toggle history list (header click — collapse the scrollable list)
function toggleHistoryList() {
  const body = document.getElementById('historyBody');
  const arrow = document.getElementById('historyArrow');
  const collapsed = body.classList.toggle('collapsed');
  arrow.classList.toggle('open', !collapsed);
  localStorage.setItem(LIST_COLLAPSE_KEY, collapsed ? '1' : '0');
}

// Restore history list collapse state
if (localStorage.getItem(LIST_COLLAPSE_KEY) === '1') {
  document.getElementById('historyBody').classList.add('collapsed');
  document.getElementById('historyArrow').classList.remove('open');
}

// ==== Render history sessions list ====

function renderHistorySessions() {
  const list = document.getElementById('historyList');
  const all = ls();
  all.sort((a, b) => new Date(b.updated) - new Date(a.updated));
  if (all.length === 0) {
    list.innerHTML = '<div class="history-empty">暂无对话<br>点击 ＋ 开始新对话</div>';
    return;
  }
  list.innerHTML = all.map(s => {
    const isActive = s.id === state.currentSessionId;
    const cnt = s.messages.length;
    const msgCount = cnt === 0 ? '0条' : cnt + '条';
    const time = ta(s.updated);
    return `<div class="history-item${isActive ? ' active' : ''}" onclick="openSession('${s.id}')">
      <div class="hi-top">
        <span class="hi-title">${esc(s.title || '新对话')}</span>
        <button class="hi-menu-btn" onclick="toggleMenu(event,'${s.id}')">⋮</button>
      </div>
      <div class="hi-meta"><span>${msgCount}</span><span>${time}</span></div>
      ${s.notes ? `<div class="hi-notes">${esc(s.notes)}</div>` : ''}
      <div class="hi-dropdown" id="menu-${s.id}">
        <button class="hi-dd-item" onclick="renameSession(event,'${s.id}')">✏️ 重命名</button>
        <div class="hi-dd-divider"></div>
        <button class="hi-dd-item danger" onclick="trashSession(event,'${s.id}')">🗑️ 删除</button>
      </div>
    </div>`;
  }).join('');
}

// Dropdown menu
function toggleMenu(e, id) {
  e.stopPropagation();
  closeAllMenus();
  const menu = document.getElementById('menu-' + id);
  if (menu) menu.classList.toggle('show');
}

function closeAllMenus() {
  document.querySelectorAll('.hi-dropdown').forEach(m => m.classList.remove('show'));
}
document.addEventListener('click', () => closeAllMenus());
