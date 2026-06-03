// ====== Browser Automation (BB / PW) · Just Hermes Agent WEB UI ======
const AUTH_API = 'http://127.0.0.1' + ':8647';

async function bbRefresh() {
  try {
    const bb = await (await fetch(AUTH_API + '/bb/status')).json();
    const bbDot = document.getElementById('bbDot');
    const bbStatusText = document.getElementById('bbStatusText');
    if (bb && bb.running) {
      if (bbDot) bbDot.className = 'bb-status-dot green';
      if (bbStatusText) bbStatusText.textContent = '运行中';
      const urlEl = document.getElementById('bbUrl');
      if (urlEl) urlEl.textContent = bb.url || '-';
      const timeEl = document.getElementById('bbTime');
      if (timeEl) timeEl.textContent = bb.remaining_seconds ? Math.round(bb.remaining_seconds)+'s 剩余' : '-';
      const startBtn = document.getElementById('bbStartBtn');
      if (startBtn) { startBtn.disabled = true; startBtn.style.opacity = '.4'; }
      const stopBtn = document.getElementById('bbStopBtn');
      if (stopBtn) { stopBtn.disabled = false; stopBtn.style.opacity = '1'; }
    } else {
      if (bbDot) bbDot.className = 'bb-status-dot gray';
      if (bbStatusText) bbStatusText.textContent = '未启动';
      const urlEl = document.getElementById('bbUrl');
      if (urlEl) urlEl.textContent = '-';
      const timeEl = document.getElementById('bbTime');
      if (timeEl) timeEl.textContent = '-';
      const startBtn = document.getElementById('bbStartBtn');
      if (startBtn) { startBtn.disabled = false; startBtn.style.opacity = '1'; }
      const stopBtn = document.getElementById('bbStopBtn');
      if (stopBtn) { stopBtn.disabled = true; stopBtn.style.opacity = '.4'; }
    }

    const pw = await (await fetch(AUTH_API + '/pw/status')).json();
    const pwDot = document.getElementById('pwDot');
    const pwStatusText = document.getElementById('pwStatusText');
    if (pw && pw.running) {
      if (pwDot) pwDot.className = 'bb-status-dot green';
      if (pwStatusText) pwStatusText.textContent = '运行中';
      const uptimeEl = document.getElementById('pwUptime');
      if (uptimeEl) uptimeEl.textContent = '运行 ' + pw.uptime + 's';
      const aliveEl = document.getElementById('pwAlive');
      if (aliveEl) aliveEl.textContent = pw.alive ? '● 在线' : '○ 离线';
      const startBtn = document.getElementById('pwStartBtn');
      if (startBtn) { startBtn.disabled = true; startBtn.style.opacity = '.4'; }
      const stopBtn = document.getElementById('pwStopBtn');
      if (stopBtn) { stopBtn.disabled = false; stopBtn.style.opacity = '1'; }
    } else {
      if (pwDot) pwDot.className = 'bb-status-dot gray';
      if (pwStatusText) pwStatusText.textContent = '未启动';
      const uptimeEl = document.getElementById('pwUptime');
      if (uptimeEl) uptimeEl.textContent = '-';
      const aliveEl = document.getElementById('pwAlive');
      if (aliveEl) aliveEl.textContent = '-';
      const startBtn = document.getElementById('pwStartBtn');
      if (startBtn) { startBtn.disabled = false; startBtn.style.opacity = '1'; }
      const stopBtn = document.getElementById('pwStopBtn');
      if (stopBtn) { stopBtn.disabled = true; stopBtn.style.opacity = '.4'; }
    }

    const auth = await (await fetch(AUTH_API + '/auth/status')).json();
    const asb = document.getElementById('authStatusBox');
    if (asb) asb.innerHTML =
      '模式: <b>' + (auth.mode||'?') + '</b> · ' +
      '待处理请求: ' + ((auth.pending_requests||[]).length) + ' 条 · ' +
      '操作/分钟: ' + (auth.ops_in_last_minute||0);
  } catch (e) {
    const asb = document.getElementById('authStatusBox');
    if (asb) asb.textContent = '连接失败: ' + e.message;
  }
}

async function bbStart() {
  try {
    const url = prompt('输入目标URL:', 'https://xiaohongshu.com');
    if (!url) return;
    const res = await (await fetch(AUTH_API + '/bb/start', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({url: url, duration_minutes: 15})
    })).json();
    if (res && res.error) { toast('BB 启动失败: ' + res.error, 'error'); return; }
    toast('BB Browser 已启动', 'success');
    bbRefresh();
  } catch (e) {
    toast('BB 启动错误: ' + e.message, 'error');
  }
}

async function bbStop() {
  try {
    await fetch(AUTH_API + '/bb/stop', {method: 'POST'});
    toast('BB Browser 已停止', 'info');
    bbRefresh();
  } catch (e) {
    toast('BB 停止错误: ' + e.message, 'error');
  }
}

async function pwStart() {
  try {
    const res = await (await fetch(AUTH_API + '/pw/start', {method: 'POST'})).json();
    if (res && res.error) { toast('PW 启动失败: ' + res.error, 'error'); return; }
    toast('Playwright MCP 已启动', 'success');
    bbRefresh();
  } catch (e) {
    toast('PW 启动错误: ' + e.message, 'error');
  }
}

async function pwStop() {
  try {
    await fetch(AUTH_API + '/pw/stop', {method: 'POST'});
    toast('Playwright MCP 已停止', 'info');
    bbRefresh();
  } catch (e) {
    toast('PW 停止错误: ' + e.message, 'error');
  }
}
