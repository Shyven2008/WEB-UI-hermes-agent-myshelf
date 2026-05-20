#!/usr/bin/env python
"""Insert gitSync function into dashboard.html after the esc() function."""
import re
import os

home = os.environ['USERPROFILE']
path = os.path.join(home, 'AppData', 'Local', 'hermes', 'dashboard.html')

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

git_sync = """

// ====== GIT SYNC ======
async function gitSync(){
  const btn=document.getElementById('navGitSync');
  const ver=document.getElementById('navVersion');
  btn.style.opacity='.4'; btn.style.pointerEvents='none';
  ver.textContent='sync...';
  try{
    const r=await(await fetch('/api/terminal',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({command:'bash /c/Users/YF00/just-hermes-agent-webui/git-sync.sh "WEB UI sync"'})})).json();
    if(r.exit_code===0){
      ver.textContent='OK pushed';
      toast('Synced to GitHub','success');
      setTimeout(()=>{location.reload();},2000);
    }else{
      ver.textContent='FAIL';
      toast('Sync failed: '+(r.error||r.output||'unknown').slice(0,80),'error');
      setTimeout(()=>{ver.textContent='v';btn.style.opacity='1';btn.style.pointerEvents='auto';},3000);
    }
  }catch(e){
    ver.textContent='no connect';
    toast('GitHub sync connection failed','error');
    btn.style.opacity='1'; btn.style.pointerEvents='auto';
  }
}

"""

# Insert after esc function, before ta function
idx = content.find('function ta(iso)')
if idx > 0:
    new_content = content[:idx] + git_sync + content[idx:]
    with open(path, 'w', encoding='utf-8') as f:
        f.write(new_content)
    print(f"OK - inserted gitSync. New size: {len(new_content)} bytes")
else:
    print("FAIL - ta function not found")
