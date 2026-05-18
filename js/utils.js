// ====== Utils · Just Hermes Agent WEB UI ======
// Shared utility functions

// Show a toast notification
function toast(msg, type = 'info') {
  const c = document.getElementById('toastContainer');
  const t = document.createElement('div');
  t.className = 'toast ' + type;
  t.textContent = msg;
  c.appendChild(t);
  setTimeout(() => t.remove(), 2500);
}

// HTML-escape a string
function esc(s) {
  if (!s) return '';
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Time-ago in Chinese (from ISO timestamp)
function ta(iso) {
  if (!iso) return '';
  const d = Date.now() - new Date(iso).getTime();
  const m = Math.floor(d / 60000);
  if (m < 1)   return '刚刚';
  if (m < 60)  return m + '分钟前';
  const h = Math.floor(m / 60);
  if (h < 24)  return h + '小时前';
  const days = Math.floor(h / 24);
  if (days < 30) return days + '天前';
  return new Date(iso).toLocaleDateString();
}

// Relative time in English (for API sessions)
function formatTime(ts) {
  if (!ts) return '';
  const d = new Date(ts);
  const diff = Date.now() - d;
  const mins = Math.floor(diff / 60000);
  if (mins < 1)    return '刚刚';
  if (mins < 60)   return mins + 'm ago';
  if (mins < 1440) return Math.floor(mins / 60) + 'h ago';
  return Math.floor(mins / 1440) + 'd ago';
}
