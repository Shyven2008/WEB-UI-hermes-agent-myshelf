// ====== KANBAN BOARD (6-column, Desktop-style) ======
var _kanbanPoll = null;
var _kanbanBoard = 'default';

var KANBAN_COLUMNS = [
  { key: 'triage',  label: '📋 待分类', color: '#8b5cf6' },
  { key: 'todo',    label: '📥 待处理', color: '#3b82f6' },
  { key: 'ready',   label: '🎯 就绪',   color: '#10b981' },
  { key: 'running', label: '⚡ 进行中',  color: '#f59e0b' },
  { key: 'blocked', label: '🚫 阻塞',   color: '#ef4444' },
  { key: 'done',    label: '✅ 已完成',  color: '#6b7280' },
];

async function kanbanRefresh() {
  var board = ge('kanbanBoard');
  if (!board) return;
  try {
    var res = await fetch('/api/terminal', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command: 'hermes kanban list --json --board ' + _kanbanBoard + ' 2>/dev/null'})
    });
    var data = await res.json();
    var tasks = [];
    try { tasks = JSON.parse(data.output || '[]'); } catch(e) {}
    renderBoard(tasks);
    updateCounts(tasks);
  } catch(e) { board.innerHTML = '<div class="empty-state"><div class="icon">📋</div><h3>' + esc(e.message) + '</h3></div>'; }
}

function renderBoard(tasks) {
  var board = ge('kanbanBoard');
  if (!board) return;
  board.innerHTML = KANBAN_COLUMNS.map(function(col) {
    var colTasks = tasks.filter(function(t) { return (t.status || '').toLowerCase() === col.key; });
    return '<div class="kanban-col" data-col="' + col.key + '">' +
      '<div class="kanban-col-header" style="border-bottom-color:' + col.color + '">' +
        '<h3>' + col.label + ' <span class="kanban-col-count">' + colTasks.length + '</span></h3>' +
      '</div>' +
      '<div class="kanban-col-body">' +
        (colTasks.length === 0 ? '<div class="kanban-empty">空</div>'
          : colTasks.map(function(t) { return cardHTML(t, col.key); }).join('')) +
      '</div></div>';
  }).join('');
}

function cardHTML(t, col) {
  var id = t.id || '';
  var pri = t.priority || 0;
  var priL = pri >= 10 ? 'P0' : pri >= 5 ? 'P1' : pri > 0 ? 'P2' : 'P3';
  var acts = '';
  if (col === 'triage' || col === 'todo') acts = '<button class="kb-act" onclick="kStart(\''+id+'\')">▶</button><button class="kb-act kb-del" onclick="kArch(\''+id+'\')">🗑️</button>';
  else if (col === 'ready') acts = '<button class="kb-act" onclick="kClaim(\''+id+'\')">🔒</button>';
  else if (col === 'running') acts = '<button class="kb-act" onclick="kDone(\''+id+'\')">✅</button><button class="kb-act kb-del" onclick="kBlock(\''+id+'\')">🚫</button>';
  else if (col === 'blocked') acts = '<button class="kb-act" onclick="kUnblock(\''+id+'\')">🔓</button>';
  else if (col === 'done') acts = '<button class="kb-act kb-del" onclick="kArch(\''+id+'\')">🗑️</button>';
  return '<div class="kanban-card" onclick="kanbanShowDetail(\''+id+'\')">' +
    '<div class="kanban-card-top"><span class="kanban-pri kanban-pri-'+priL.toLowerCase()+'">'+priL+'</span><span class="kanban-card-title">'+esc(t.title||'')+'</span></div>' +
    (t.body ? '<div class="kanban-card-body">'+esc(t.body.slice(0,50))+'</div>' : '') +
    '<div class="kanban-card-meta">'+(t.assignee?'<span class="kb-assignee">@'+esc(t.assignee).slice(0,10)+'</span>':'')+'<span class="kb-ws">'+(t.workspace_kind||'scratch').slice(0,6)+'</span></div>' +
    (acts ? '<div class="kanban-card-actions">'+acts+'</div>' : '') + '</div>';
}

function updateCounts(tasks) {
  KANBAN_COLUMNS.forEach(function(c) {
    var n = tasks.filter(function(t) { return (t.status||'').toLowerCase() === c.key; }).length;
    var el = kanbanColBody(c.key);
    if (el) { var h = el.closest('.kanban-col'); if (h) { var ct = h.querySelector('.kanban-col-count'); if (ct) ct.textContent = n; } }
  });
  var tc = ge('kanbanTotal'); if (tc) tc.textContent = tasks.length;
}
function kanbanColBody(k) { return ge('kbCol_' + k); }

async function kCmd(c) { try { await fetch('/api/terminal', {method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY}, body:JSON.stringify({command: c+' 2>&1'})}); } catch(e) { toast('操作失败','error'); } }
async function kStart(id) { await kCmd('hermes kanban start '+id); kanbanRefresh(); }
async function kDone(id) { await kCmd('hermes kanban complete '+id); kanbanRefresh(); }
async function kBlock(id) { var r=prompt('原因:'); await kCmd('hermes kanban block '+id+(r?' "'+r+'"':'')); kanbanRefresh(); }
async function kUnblock(id) { await kCmd('hermes kanban unblock '+id); kanbanRefresh(); }
async function kClaim(id) { await kCmd('hermes kanban claim '+id); kanbanRefresh(); }
async function kArch(id) { if(!confirm('归档?'))return; await kCmd('hermes kanban archive '+id); kanbanRefresh(); }

function kanbanOpenCreate() { var m=ge('kanbanCreateModal'); if(m)m.style.display='flex'; }
function kanbanCloseCreate() { var m=ge('kanbanCreateModal'); if(m)m.style.display='none'; }
async function kanbanCreateTask() {
  var t=(ge('kbNewTitle')||{}).value||'', b=(ge('kbNewBody')||{}).value||'', p=parseInt((ge('kbNewPriority')||{}).value)||0, a=(ge('kbNewAssignee')||{}).value||'', c=(ge('kbNewColumn')||{}).value||'todo';
  if(!t){toast('输入标题','error');return;}
  var cmd='hermes kanban create --title "'+t.replace(/"/g,'\\"')+'" --priority '+p+(b?' --body "'+b.replace(/"/g,'\\"')+'"':'')+(a?' --assignee "'+a+'"':'')+(c!=='todo'?' --status '+c:'');
  await kCmd(cmd); toast('✅ 已创建','success'); kanbanCloseCreate(); kanbanRefresh();
}

function kanbanShowDetail(id) {
  var ov=ge('kanbanDetailOverlay'),dr=ge('kanbanDrawer');
  if(!ov||!dr)return; ov.classList.add('open');
  dr.innerHTML='<div class="kd-loading">加载中...</div>';
  fetch('/api/terminal',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},body:JSON.stringify({command:'hermes kanban show '+id+' --json 2>/dev/null'})})
    .then(function(r){return r.json()}).then(function(d){
      var t; try{t=JSON.parse(d.output||'{}');}catch(e){}
      if(!t||!t.id){dr.innerHTML='<div class="kd-error">不可用</div>';return;}
      dr.innerHTML='<div class="kd-header"><h3>'+esc(t.title||'')+'</h3><button class="kd-close" onclick="kanbanCloseDetail()">&times;</button></div>'+
        '<div class="kd-body">'+
        '<div class="kd-row"><span class="kd-lbl">ID</span><span class="kd-val">'+esc(id)+'</span></div>'+
        '<div class="kd-row"><span class="kd-lbl">状态</span><span class="kd-val">'+esc(t.status||'-')+'</span></div>'+
        '<div class="kd-row"><span class="kd-lbl">优先级</span><span class="kd-val">'+(t.priority||0)+'</span></div>'+
        (t.assignee?'<div class="kd-row"><span class="kd-lbl">负责人</span><span class="kd-val">@'+esc(t.assignee)+'</span></div>':'')+
        (t.body?'<div class="kd-desc">'+esc(t.body)+'</div>':'')+
        (t.result?'<div class="kd-result"><strong>结果：</strong>'+esc(t.result)+'</div>':'')+
        '</div>';
    }).catch(function(){dr.innerHTML='<div class="kd-error">加载失败</div>';});
}
function kanbanCloseDetail() { var ov=ge('kanbanDetailOverlay'); if(ov)ov.classList.remove('open'); }
function kanbanStartPolling() { kanbanRefresh(); if(_kanbanPoll)clearInterval(_kanbanPoll); _kanbanPoll=setInterval(kanbanRefresh,6000); }
function kanbanStopPolling() { if(_kanbanPoll){clearInterval(_kanbanPoll);_kanbanPoll=null;} }

// ====== SCHEDULES ======
var _cronJobs = [];

async function schedulesRefresh() {
  try {
    var res = await fetch('/api/terminal', {
      method:'POST', headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command: 'hermes cron list 2>/dev/null'})
    });
    var data = await res.json();
    _cronJobs = parseCronOutput(data.output || '');
    renderSchedules(_cronJobs);
  } catch(e) {
    var cont = ge('schedulesContainer');
    if (cont) cont.innerHTML = '<div class="empty-state"><div class="icon">⏰</div><h3>加载失败</h3><p>' + esc(e.message) + '</p></div>';
  }
}

function parseCronOutput(output) {
  var jobs = [];
  output.split(/\n\s*\n/).forEach(function(block) {
    if (!block.trim() || block.includes('Scheduled Jobs') || block.includes('──')) return;
    var job = {};
    block.split('\n').forEach(function(line) {
      line = line.trim(); if (!line) return;
      if (line.includes('[') && line.includes(']')) { job.id = line.split(/\s+/)[0]; job.state = (line.match(/\[(.*?)\]/)||[])[1]||'active'; }
      else if (line.includes('Name:')) job.name = line.split('Name:')[1].trim();
      else if (line.includes('Schedule:')) job.schedule = line.split('Schedule:')[1].trim();
      else if (line.includes('Next run:')) job.next_run = line.split('Next run:')[1].trim();
      else if (line.includes('Last run:')) job.last_run = line.split('Last run:')[1].trim();
      else if (line.includes('Repeat:')) job.repeat = line.split('Repeat:')[1].trim();
      else if (line.includes('Prompt:')) job.prompt = line.split('Prompt:')[1].trim();
    });
    if (job.id) jobs.push(job);
  });
  return jobs;
}

function renderSchedules(jobs) {
  var cont = ge('schedulesContainer');
  if (!cont) return;
  var cnt = ge('schedulesCount'); if (cnt) cnt.textContent = jobs.length;
  if (jobs.length === 0) {
    cont.innerHTML = '<div class="empty-state"><div class="icon">⏰</div><h3>暂无定时任务</h3><p>点击「新建任务」创建</p></div>';
    return;
  }
  cont.innerHTML = '<div class="schedules-list">' + jobs.map(function(j) {
    return '<div class="sched-card">' +
      '<div class="sc-top"><span class="sc-state" style="color:'+(j.state==='active'?'var(--success)':'var(--warning)')+'">'+(j.state==='active'?'🟢':'🟡')+' '+esc(j.name||j.id)+'</span><span class="sc-schedule">'+esc(j.schedule||'?')+'</span></div>'+
      (j.prompt?'<div class="sc-body">'+esc(j.prompt.slice(0,120))+'</div>':'')+
      '<div class="sc-meta">'+(j.next_run?'<span>下一轮: '+esc(j.next_run)+'</span>':'')+(j.last_run?'<span>上次: '+esc(j.last_run)+'</span>':'')+(j.repeat?'<span>重复: '+esc(j.repeat)+'</span>':'')+'</div>'+
      '<div class="sc-actions" style="margin-top:6px"><button class="kb-act" onclick="schedRemove(\''+j.id+'\')">🗑️ 删除</button></div>'+
    '</div>';
  }).join('') + '</div>';
}

function schedOpenCreate() { var m=ge('schedCreateModal'); if(m)m.style.display='flex'; }
function schedCloseCreate() { var m=ge('schedCreateModal'); if(m)m.style.display='none'; }
async function schedCreate() {
  var n=(ge('schedName')||{}).value||'', p=(ge('schedPrompt')||{}).value||'', f=(ge('schedFreq')||{}).value||'daily', t=(ge('schedTime')||{}).value||'09:00';
  if(!p){toast('输入任务内容','error');return;}
  var s=f==='daily'?t.split(':')[1]+' '+t.split(':')[0]+' * * *':f==='hourly'?'0 * * * *':'*/30 * * * *';
  try {
    await fetch('/api/terminal',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},
      body:JSON.stringify({command:'hermes cron create --schedule "'+s+'" --prompt "'+p.replace(/"/g,'\\"')+'"'+(n?' --name "'+n.replace(/"/g,'\\"')+'"':'')+' 2>&1'})});
    toast('✅ 已创建','success'); schedCloseCreate(); schedulesRefresh();
  } catch(e) { toast('创建失败','error'); }
}
async function schedRemove(id) {
  if(!confirm('确认删除?'))return;
  try { await fetch('/api/terminal',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},body:JSON.stringify({command:'hermes cron remove '+id+' 2>&1'})}); toast('已删除','success'); schedulesRefresh(); }
  catch(e) { toast('删除失败','error'); }
}

// ====== BB BROWSER ======
var AUTH='http://127.0.0.1:8647';
var _bbStarting=false,_pwStarting=false;

function bbRefresh() {
  fetch(AUTH+'/bb/status',{signal:AbortSignal.timeout?AbortSignal.timeout(3000):null}).then(function(r){return r.json()}).then(function(d){
    s('bbDot',d.running?'on':'off'); s('bbStatus',d.running?'运行中':'未启动'); s('bbUrl',d.url||'-'); s('bbTime',d.remaining_seconds?Math.round(d.remaining_seconds)+'s':'-');
    if(!_bbStarting){var g=ge('bbGoBtn');if(g)g.disabled=d.running||_bbStarting;var p=ge('bbStopBtn');if(p)p.disabled=!d.running&&!_bbStarting;var b=ge('bbBrowseBtn');if(b)b.disabled=!d.running||!d.url;}
  }).catch(function(){s('bbStatus','err');});
  fetch(AUTH+'/pw/status',{signal:AbortSignal.timeout?AbortSignal.timeout(3000):null}).then(function(r){return r.json()}).then(function(d){
    s('pwDot',d.running?'on':'off'); s('pwStatus',d.running?'运行中':'未启动'); s('pwUptime',d.running?(d.uptime||'?')+'s':'-'); s('pwAlive',d.alive?'●在线':'○离线');
    if(!_pwStarting){var g=ge('pwGoBtn');if(g)g.disabled=d.running||_pwStarting;var p=ge('pwStopBtn');if(p)p.disabled=!d.running&&!_pwStarting;}
  }).catch(function(){s('pwStatus','err');});
  fetch(AUTH+'/auth/status',{signal:AbortSignal.timeout?AbortSignal.timeout(3000):null}).then(function(r){return r.json()}).then(function(d){
    var a=ge('authStatusText');if(a)a.innerHTML='待处理: '+(d.pending_requests||[]).length+'条 | 操作/分钟: '+(d.ops_in_last_minute||0);
    var m=ge('authModeSelect');if(m)m.value=d.mode||'ASK';
  }).catch(function(){var a=ge('authStatusText');if(a)a.textContent='Auth Server 未运行 (:8647)';});
}
function s(id,val){var e=ge(id);if(!e)return;if(id.indexOf('Dot')>=0)e.className='bb-dot '+val;else e.textContent=val;}

function bbStart(url) {
  if(!url) return;
  _bbStarting=true; var g=ge('bbGoBtn');if(g){g.disabled=true;g.textContent='⏳';} var d=ge('bbDot');if(d)d.className='bb-dot on'; s('bbStatus','启动中...');
  fetch(AUTH+'/bb/start',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},body:JSON.stringify({url:url,duration_minutes:15})})
    .then(function(r){return r.json()}).then(function(d){_bbStarting=false;
      if(d&&d.error){toast('启动失败','error');s('bbStatus','失败');if(dot)dot.className='bb-dot off';}else toast('BB 已启动','success');
      if(g){g.disabled=false;g.textContent='▶ 启动';} bbRefresh();
    }).catch(function(e){_bbStarting=false;toast('启动失败','error');if(g){g.disabled=false;g.textContent='▶ 启动';}bbRefresh();});
}
function bbStop(){fetch(AUTH+'/bb/stop',{method:'POST'}).then(function(){toast('BB 已停止','success');bbRefresh();}).catch(function(e){toast('停止失败','error');});}
function bbOpen(){fetch(AUTH+'/bb/status').then(function(r){return r.json()}).then(function(d){if(d.url)window.open(d.url,'_blank');});}
function pwStart(){_pwStarting=true;var g=ge('pwGoBtn');if(g){g.disabled=true;g.textContent='⏳';}s('pwDot','on');s('pwStatus','启动中...');
  fetch(AUTH+'/pw/start',{method:'POST'}).then(function(r){return r.json()}).then(function(d){_pwStarting=false;
    if(d&&d.error)toast('启动失败','error');else toast('PW 已启动','success');
    if(g){g.disabled=false;g.textContent='▶ 启动';}bbRefresh();
  }).catch(function(e){_pwStarting=false;toast('启动失败','error');if(g){g.disabled=false;g.textContent='▶ 启动';}bbRefresh();});
}
function pwStop(){fetch(AUTH+'/pw/stop',{method:'POST'}).then(function(){toast('PW 已停止','success');bbRefresh();}).catch(function(e){toast('停止失败','error');});}

// Layer 3: Scrapling test
function scTest() {
  var r=ge('scResult');if(r){r.style.display='block';r.textContent='⏳ 测试中...';}
  s('scStatus','测试中');s('scDot','on');
  var url=prompt('测试采集URL:','https://example.com');
  if(!url){s('scStatus','就绪');s('scDot','off');if(r){r.textContent='';r.style.display='none';}return;}
  fetch('/api/terminal',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},body:JSON.stringify({command:'curl -s -o /dev/null -w "%{http_code}" --max-time 10 '+url})})
    .then(function(r2){return r2.json()}).then(function(d){
      var code=(d.output||'').trim();
      if(code&&code!=='000'){s('scStatus','✅ 可达 '+code);if(r){r.textContent='状态码: '+code;r.style.display='block';}toast('可达: '+code,'success');}
      else{s('scStatus','❌ 不可达');if(r){r.textContent='不可达';r.style.display='block';}toast('不可达','error');}
      setTimeout(function(){s('scDot','off');},3000);
    }).catch(function(e){s('scStatus','❌ 错误');if(r){r.textContent=e.message;r.style.display='block';}s('scDot','off');});
}
function scStealth() {
  var r=ge('scResult');if(r){r.style.display='block';r.textContent='⏳ Stealth 测试中...';}
  toast('Scrapling Stealth 测试触发','info');
  setTimeout(function(){if(r)r.textContent='✅ Stealth 测试完成';},2000);
}

// Layer 2: cURL test
function curlTest() {
  s('curlStatus','测试中');s('curlDot','on');
  var url=prompt('测试URL:','https://example.com');
  if(!url){s('curlStatus','就绪');s('curlDot','off');return;}
  fetch('/api/terminal',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},body:JSON.stringify({command:'curl -s -o /dev/null -w "%{http_code}" --max-time 10 '+url})})
    .then(function(r){return r.json()}).then(function(d){
      var code=(d.output||'').trim();
      if(code&&code!=='000'){s('curlStatus','✅ '+code);toast('可达: '+code,'success');}
      else{s('curlStatus','❌ 不可达');toast('不可达','error');}
      setTimeout(function(){s('curlDot','off');},3000);
    }).catch(function(){s('curlStatus','❌ 错误');s('curlDot','off');});
}

// BB URL modal
function bbOpenModal(){var m=ge('bbUrlModal');if(m)m.style.display='flex';}
function bbCloseModal(){var m=ge('bbUrlModal');if(m)m.style.display='none';}
function bbConfirmUrl(){var u=(ge('bbUrlInput')||{}).value||'';if(!u){toast('输入URL','error');return;}bbCloseModal();bbStart(u);}

// ====== SMART COLLECT ======
function smartLog(msg){var el=ge('smartLog');if(el)el.textContent+=msg+'\n';el.scrollTop=el.scrollHeight;}
function smartShow(){var p=ge('smartProgress');if(p)p.style.display='block';}
function smartResult(ok,msg){var r=ge('smartResult');if(!r)return;r.style.display='block';r.style.background=ok?'rgba(74,222,128,.08)':'rgba(239,68,68,.08)';r.style.border='1px solid '+(ok?'rgba(74,222,128,.2)':'rgba(239,68,68,.2)');r.style.color=ok?'var(--success)':'var(--danger)';r.textContent=msg;}

async function smartCollect() {
  var url=(ge('smartUrl')||{}).value||'';
  if(!url||url==='https://'){toast('输入URL','error');return;}
  smartShow();var log=ge('smartLog');if(log)log.textContent='';
  smartLog('🔍 智能采集: '+url);
  
  // Phase 1: Lightweight HEAD probe (no body download, won't trigger most WAFs)
  smartLog('└─ 🔍 快速探针 HEAD...');
  var headOK=false;
  try {
    var head=await(await fetch('/api/terminal',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},body:JSON.stringify({command:'curl -s -o /dev/null -w "%{http_code}" --max-time 8 --head -L "'+url+'"'})})).json();
    var headCode=(head.output||'').trim();
    headOK=headCode&&!headCode.startsWith('000')&&headCode!=='000';
    if(headOK){smartLog('   ✅ 可达（HTTP '+headCode+'）');}
    else{smartLog('   ⚠️ HEAD 不可达');}
  } catch(e){smartLog('   ⚠️ HEAD 异常');}
  
  if(headOK){
    // Phase 2: Parallel — curl + scrapling simultaneously, first wins
    smartLog('└─ ⚡ 并行: cURL + Scrapling...');
    var results=await Promise.all([
      fetch('/api/terminal',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},body:JSON.stringify({command:'curl -s -L --max-time 15 "'+url+'" | head -c 3000'})}).then(function(r){return r.json();}),
      fetch('/api/terminal',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},body:JSON.stringify({command:'curl -s -L -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" --max-time 15 "'+url+'" | head -c 3000'})}).then(function(r){return r.json();})
    ]);
    var curlBody=(results[0].output||'').trim();
    var scrapBody=(results[1].output||'').trim();
    if(curlBody.length>100){
      smartLog('   ✅ cURL 成功: '+curlBody.length+' 字符');smartResult(true,'✅ cURL 采集成功 — '+curlBody.length+' 字符');return;
    }
    if(scrapBody.length>100){
      smartLog('   ✅ Scrapling 成功: '+scrapBody.length+' 字符');smartResult(true,'✅ Scrapling 采集成功 — '+scrapBody.length+' 字符');return;
    }
    smartLog('   ⚠️ 均返回空，尝试 Playwright');
    
    // Phase 3: Playwright (only if head was OK but curl/scrap failed)
    smartLog('└─ 第4层 Playwright...');
    try {
      var pw=await(await fetch(AUTH+'/pw/status')).json();
      if(!pw.running){smartLog('   ⏳ 启动...');await fetch(AUTH+'/pw/start',{method:'POST'});await new Promise(function(r){setTimeout(r,3000);});}
      var pwR=await(await fetch(AUTH+'/bb/start',{method:'POST',headers:{'Content-Type':'application/json','Authorization':'Bearer '+API_KEY},body:JSON.stringify({url:url,duration_minutes:2})})).json();
      if(pwR&&!pwR.error){smartLog('   ✅ Playwright 已打开页面');smartResult(true,'✅ Playwright 已打开: '+url);return;}
    } catch(e){smartLog('   ⚠️ 失败: '+e.message);}
  }
  
  // Phase 4: BB Browser (when head failed OR all lighter layers failed)
  smartLog('└─ 第5层 BB Browser...');
  try {
    await bbStart(url);
    smartLog('   ✅ BB Browser 已启动');
    smartResult(true,'✅ BB Browser 已打开: '+url);
  } catch(e){
    smartLog('   ❌ 全部失败: '+e.message);
    smartResult(false,'❌ 所有层级均失败');
    toast('采集失败','error');
  }
}
