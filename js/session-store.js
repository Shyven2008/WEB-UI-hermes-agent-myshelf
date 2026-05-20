// ====== Session Store · Just Hermes Agent WEB UI ======
// LocalStorage-based session CRUD with trash support

// ——— Sessions ———

function ls() {
  try { return JSON.parse(localStorage.getItem(SES_KEY)) || []; }
  catch { return []; }
}

function ss(sessions) {
  localStorage.setItem(SES_KEY, JSON.stringify(sessions));
}

function newSession() {
  const id = Date.now().toString(36);
  const sessions = ls();
  sessions.unshift({
    id,
    title: '新对话',
    notes: '',
    messages: [],
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
  });
  ss(sessions);
  renderHistorySessions();
  openSession(id);
  switchPage('chat');
}

function openSession(id) {
  state.currentSessionId = id;
  localStorage.setItem(ACTIVE_KEY, id);
  renderHistorySessions();
  const sessions = ls();
  const s = sessions.find(x => x.id === id);
  if (s) {
    document.getElementById('chatNotes').value = s.notes || '';
    renderChat(s);
  }
}

function renameSession(e, id) {
  e.stopPropagation();
  closeAllMenus();
  const sessions = ls();
  const s = sessions.find(x => x.id === id);
  if (!s) return;
  const newName = prompt('输入新名称:', s.title);
  if (newName && newName.trim()) {
    s.title = newName.trim();
    s.updated = new Date().toISOString();
    ss(sessions);
    renderHistorySessions();
    if (state.currentSessionId === id) renderChat(s);
    toast('已重命名', 'success');
  }
}

function saveNotes() {
  if (!state.currentSessionId) return;
  const sessions = ls();
  const s = sessions.find(x => x.id === state.currentSessionId);
  if (!s) return;
  s.notes = document.getElementById('chatNotes').value;
  if (s.notes) s.title = s.notes.length > 20 ? s.notes.slice(0, 20) + '…' : s.notes;
  else if (s.messages[0]) s.title = s.messages[0].content.length > 20 ? s.messages[0].content.slice(0, 20) + '…' : s.messages[0].content;
  s.updated = new Date().toISOString();
  ss(sessions);
  renderHistorySessions();
}

function addMsg(role, content) {
  if (!state.currentSessionId) newSession();
  const sessions = ls();
  const s = sessions.find(x => x.id === state.currentSessionId);
  s.messages.push({ role, content, time: new Date().toISOString() });
  if (!s.title || s.title === '新对话') {
    if (s.notes) s.title = s.notes.length > 20 ? s.notes.slice(0, 20) + '…' : s.notes;
    else s.title = content.length > 20 ? content.slice(0, 20) + '…' : content;
  }
  s.updated = new Date().toISOString();
  ss(sessions);
  renderHistorySessions();
}

// ——— Trash ———

function loadTrash() {
  try { return JSON.parse(localStorage.getItem(TRASH_KEY)) || []; }
  catch { return []; }
}

function saveTrash(items) {
  localStorage.setItem(TRASH_KEY, JSON.stringify(items));
}

// Delete → move to trash (non-destructive)
function trashSession(e, id) {
  e.stopPropagation();
  closeAllMenus();
  const sessions = ls();
  const idx = sessions.findIndex(x => x.id === id);
  if (idx === -1) return;
  const [session] = sessions.splice(idx, 1);
  ss(sessions);
  const trash = loadTrash();
  session.deletedAt = new Date().toISOString();
  trash.unshift(session);
  saveTrash(trash);
  if (state.currentSessionId === id) {
    state.currentSessionId = null;
    localStorage.removeItem(ACTIVE_KEY);
    document.getElementById('chatMessages').innerHTML =
      '<div class="empty-state"><div class="icon">💬</div><h3>开始新的对话</h3><p>在下方输入消息，或从左侧选择已有会话</p></div>';
  }
  renderHistorySessions();
  renderTrash();
  toast('已移入回收站', 'success');
}

function restoreTrash(id) {
  const trash = loadTrash();
  const idx = trash.findIndex(x => x.id === id);
  if (idx === -1) return;
  const [session] = trash.splice(idx, 1);
  saveTrash(trash);
  const sessions = ls();
  delete session.deletedAt;
  sessions.unshift(session);
  ss(sessions);
  renderHistorySessions();
  renderTrash();
  openSession(id);
  switchPage('chat');
  toast('已恢复会话', 'success');
}

function permDeleteTrash(id) {
  saveTrash(loadTrash().filter(x => x.id !== id));
  renderTrash();
  toast('已永久删除', 'error');
}

function emptyTrash() {
  if (!confirm('确认清空回收站？所有会话将被永久删除。')) return;
  saveTrash([]);
  renderTrash();
  toast('回收站已清空', 'success');
}
