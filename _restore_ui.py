import sys

# Read backup
with open(r'C:\Users\YF00\AppData\Local\hermes\dashboard.html.bak', 'r', encoding='utf-8') as f:
    content = f.read()

print(f'Original backup: {len(content)} chars, {content.count(chr(10))} lines')

# 1. CSS Variables to Matrix
content = content.replace(
    '  --bg:#0a0a14;--sidebar-bg:#0f0f1e;--card-bg:#14142a;\n'
    '  --border:#1e1e32;--border-hover:rgba(102,126,234,.25);\n'
    '  --accent:#667eea;--accent2:#764ba2;\n'
    '  --text:#d0d0d0;--text2:#888;--text3:#555577;',
    '  --bg:#000;--sidebar-bg:#050505;--card-bg:#0a0a0a;\n'
    '  --border:#0a2a0a;--border-hover:rgba(0,255,65,.25);\n'
    '  --accent:#00ff41;--accent2:#00cc33;\n'
    '  --text:#c8c8c8;--text2:#999;--text3:#3a5a3a;'
)

# 2. Nav icon sizing
content = content.replace(
    '.nav-icon{\n  width:56px;padding:4px 0;border-radius:var(--radius-sm);display:flex;\n  flex-direction:column;align-items:center;cursor:pointer;font-size:16px;\n  transition:all .15s;position:relative;margin:1px 0;color:var(--text2);\n  flex-shrink:0;gap:1px;\n}\n.nav-icon .emoji{font-size:18px;line-height:1}\n.nav-icon .label{font-size:9px;color:var(--text3);line-height:1;transition:color .15s}',
    '.nav-icon{\n  width:56px;padding:6px 0;border-radius:var(--radius-sm);display:flex;\n  flex-direction:column;align-items:center;cursor:pointer;font-size:16px;\n  transition:all .15s;position:relative;margin:2px 0;color:var(--text2);\n  flex-shrink:0;gap:2px;\n}\n.nav-icon .emoji{font-size:24px;line-height:1}\n.nav-icon .label{font-size:12px;color:var(--text3);line-height:1.2;transition:color .15s;font-weight:500}'
)

# 3. Blue rgba to Green rgba
reps = {
    'rgba(102,126,234,.25)': 'rgba(0,255,65,.25)',
    'rgba(102,126,234,.08)': 'rgba(0,255,65,.08)',
    'rgba(102,126,234,.06)': 'rgba(0,255,65,.06)',
    'rgba(102,126,234,.04)': 'rgba(0,255,65,.04)',
    'rgba(102,126,234,.15)': 'rgba(0,255,65,.15)',
    'rgba(102,126,234,.2)': 'rgba(0,255,65,.15)',
}
for old, new in reps.items():
    content = content.replace(old, new)

# 4. Green grid on page-container
content = content.replace(
    '.page-container{flex:1;overflow:hidden;position:relative}',
    '.page-container{flex:1;overflow:hidden;position:relative;background-image:repeating-linear-gradient(0deg,transparent,transparent 19px,rgba(0,255,65,.015) 19px,rgba(0,255,65,.015) 20px),repeating-linear-gradient(90deg,transparent,transparent 19px,rgba(0,255,65,.015) 19px,rgba(0,255,65,.015) 20px)}'
)

# 5. History header cursor
content = content.replace(
    '.history-header{\n  padding:10px 14px 10px 12px;display:flex;align-items:center;gap:6px;\n  border-bottom:1px solid var(--border);flex-shrink:0;position:relative;\n}',
    '.history-header{\n  padding:10px 14px 10px 12px;display:flex;align-items:center;gap:6px;\n  border-bottom:1px solid var(--border);flex-shrink:0;position:relative;\n  cursor:pointer;user-select:none;\n}'
)

# 6. History-body and arrow CSS
content = content.replace(
    '.history-header:hover{background:rgba(255,255,255,.02)}',
    '.history-header:hover{background:rgba(255,255,255,.02)}\n' +
    '/* History list collapsible via header click */\n' +
    '.history-body{overflow:hidden;transition:max-height .28s cubic-bezier(.4,0,.2,1);display:flex;flex-direction:column;flex:1}\n' +
    '.history-body.collapsed{max-height:0 !important;overflow:hidden;flex:0}\n' +
    '.history-arrow{font-size:9px;color:var(--text3);transition:transform .28s;margin-left:2px}'
)

# 7. Input -> Textarea CSS
content = content.replace(
    '.chat-input-wrap input{\n  flex:1;padding:9px 14px;background:var(--card-bg);border:1px solid var(--border);\n  border-radius:var(--radius-xl);color:var(--text);font-size:13px;outline:none;transition:border-color .15s;\n}\n.chat-input-wrap input:focus{border-color:var(--accent)}\n.chat-input-wrap input::placeholder{color:var(--text3)}',
    '.chat-input-wrap textarea{\n  flex:1;padding:9px 14px;background:var(--card-bg);border:1px solid var(--border);\n  border-radius:var(--radius-xl);color:var(--text);font-size:13px;outline:none;transition:border-color .15s;\n  min-height:38px;max-height:200px;resize:none;overflow-y:auto;font-family:var(--font);line-height:1.5;\n}\n.chat-input-wrap textarea:focus{border-color:var(--accent)}\n.chat-input-wrap textarea::placeholder{color:var(--text3)}\n.chat-input-wrap textarea::-webkit-scrollbar{width:4px}\n.chat-input-wrap textarea::-webkit-scrollbar-thumb{background:var(--border);border-radius:2px}'
)

print('CSS transformations done')

# === HTML ===

# 8. History header with + New button + history-body
old_html = (
    '<div class="history-header">\n'
    '    <h3>\U0001f4cb 历史记录</h3>\n'
    '    <button class="new-btn" onclick="newSession()" title="新建对话">\uff0b</button>\n'
    '  </div>\n'
    '  <div class="history-list" id="historyList"></div>\n'
    '  <div class="history-footer">'
)
new_html = (
    '<div class="history-header">\n'
    '    <span class="history-arrow" id="historyArrow">\u25bc</span>\n'
    '    <h3>\U0001f4cb 历史记录</h3>\n'
    '    <button class="new-btn" onclick="event.stopPropagation();newSession()" title="New">\uff0b<span style="font-size:11px;margin-left:3px;font-weight:400;color:var(--text2)"> New</span></button>\n'
    '  </div>\n'
    '  <div class="history-body" id="historyBody">\n'
    '  <div class="history-list" id="historyList"></div>\n'
    '  <div class="history-footer">'
)
content = content.replace(old_html, new_html)

# 9. Close history-body div
content = content.replace(
    '</div>\n<button class="history-toggle" id="historyToggle"',
    '</div>\n</div>\n<button class="history-toggle" id="historyToggle"'
)

# 10. Chat input to textarea
content = content.replace(
    '<input id="chatInput" placeholder="输入消息..." onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendChat()}">',
    '<textarea id="chatInput" rows="1" placeholder="输入消息..." oninput="autoResizeChat(this)" onkeydown="if(event.key===\'Enter\'&&!event.shiftKey){event.preventDefault();sendChat()}"></textarea>'
)

print('HTML transformations done')

# === JS ===

# 11. autoResizeChat function
content = content.replace(
    '// ====== SSE CHAT ======\n'
    'async function sendChat(){',
    '// ====== AUTO-RESIZE TEXTAREA ======\n'
    'function autoResizeChat(el){\n'
    '  el.style.height="auto";\n'
    '  el.style.height=Math.min(el.scrollHeight,200)+"px";\n'
    '}\n'
    '\n'
    '// ====== SSE CHAT ======\n'
    'async function sendChat(){'
)

# 12. Reset textarea height in sendChat
content = content.replace(
    "  input.value='';\n  addMsg('user',msg);",
    "  input.value='';\n  autoResizeChat(input);\n  addMsg('user',msg);"
)

# 13. historyHeaderClick function
content = content.replace(
    '// ====== KEYBOARD ======\n'
    "document.addEventListener('keydown',function(e){",
    '// ====== HISTORY HEADER CLICK ======\n'
    'function historyHeaderClick(e){\n'
    '  const body=document.getElementById("historyBody");\n'
    '  const arrow=document.getElementById("historyArrow");\n'
    '  if(!body||!arrow)return;\n'
    '  body.classList.toggle("collapsed");\n'
    '  arrow.style.transform=body.classList.contains("collapsed")?"rotate(-90deg)":"rotate(0deg)";\n'
    '}\n'
    '\n'
    '// ====== KEYBOARD ======\n'
    "document.addEventListener('keydown',function(e){"
)

# Write output
new_lines = content.count(chr(10))
print(f'New file: {len(content)} chars, {new_lines} lines')

with open(r'C:\Users\YF00\just-hermes-agent-webui\index.html', 'w', encoding='utf-8') as f:
    f.write(content)
with open(r'C:\Users\YF00\AppData\Local\hermes\dashboard.html', 'w', encoding='utf-8') as f:
    f.write(content)

print('Files written successfully!')
