// ====== Chat · Just Hermes Agent WEB UI ======
// SSE streaming chat

// Auto-resize chat input textarea
function autoResizeChat(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 200) + 'px';
}

function renderChat(s) {
  const box = document.getElementById('chatMessages');
  if (!s || !s.messages || s.messages.length === 0) {
    box.innerHTML = '<div class="empty-state"><div class="icon">💬</div><h3>开始新的对话</h3><p>在下方输入消息</p></div>';
    return;
  }
  box.innerHTML = s.messages.map(m => {
    const rc = m.role === 'user' ? 'user' : m.role === 'assistant' ? 'assistant' : 'system';
    const t = new Date(m.time);
    const ts = t.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' });
    return `<div class="chat-msg ${rc}"><div class="bubble">${esc(m.content)}</div><div class="time">${rc === 'user' ? '你' : 'Hermes'} · ${ts}</div></div>`;
  }).join('');
  box.scrollTop = box.scrollHeight;
}

// SSE streaming send
async function sendChat() {
  if (state.streaming) return;
  const input = document.getElementById('chatInput');
  const msg = input.value.trim();
  if (!msg) return;
  if (!state.currentSessionId) newSession();

  input.value = '';
  autoResizeChat(input);
  addMsg('user', msg);

  const box = document.getElementById('chatMessages');
  const sid = 'stm_' + Date.now();
  box.innerHTML += `<div class="chat-msg assistant" id="${sid}"><div class="bubble"><span id="stxt_${sid}"></span><span class="stream-cursor"></span></div><div class="time">Hermes · 思考中...</div></div>`;
  box.scrollTop = box.scrollHeight;

  state.streaming = true;
  document.getElementById('sendBtn').disabled = true;

  let full = '';
  let inputTokens = estimateTokens(msg);
  let outputTokens = 0; // we'll count as we receive
  const modelName = getActiveModelName();
  try {
    const sessions = ls();
    const s = sessions.find(x => x.id === state.currentSessionId);
    const messages = s ? s.messages.map(m => ({ role: m.role, content: m.content })) : [];

    const res = await fetch(API_BASE + '/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: 'system', content: 'You are a helpful AI assistant. Respond concisely and in Chinese unless asked otherwise.' }, ...messages],
        stream: true
      })
    });
    if (!res.ok) {
      full = '(连接失败 — API 返回 ' + res.status + ')';
      document.getElementById('stxt_' + sid).textContent = full;
      return;
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const lines = decoder.decode(value).split('\n');
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]' || !data) continue;
        try {
          const json = JSON.parse(data);
          full += json.choices?.[0]?.delta?.content || '';
          // Count output tokens via estimation as we receive
          outputTokens += estimateTokens(json.choices?.[0]?.delta?.content || '');
          document.getElementById('stxt_' + sid).textContent = full;
        } catch (e) { /* partial JSON — skip */ }
      }
    }
  } catch (err) {
    full = '(连接失败 — 确认 Gateway 正在运行: ' + err.message + ')';
    document.getElementById('stxt_' + sid).textContent = full;
  } finally {
    state.streaming = false;
    document.getElementById('sendBtn').disabled = false;
  }
  if (full && !full.startsWith('(')) {
    addMsg('assistant', full);
    const el = document.getElementById(sid);
    if (el) el.remove();
    // Save token usage (output already counted, add a small overhead for system/messages context ~0.5K)
    addTokenUsage(modelName, inputTokens + 500, outputTokens);
  }
}
