// ====== App Entry · Just Hermes Agent WEB UI ======
// Initial data loading and auto-refresh

async function loadAll() {
  try {
    const [skillsRes, sessionsRes] = await Promise.all([
      fetch(API_BASE + '/api/skills').then(r => r.ok ? r.json() : { skills: [] }),
      fetch(API_BASE + '/api/sessions').then(r => r.ok ? r.json() : { sessions: [] })
    ]);
    state.skillsData = skillsRes.skills || [];
    state.sessionsData = sessionsRes.sessions || [];
    const saved = loadSavedNames();
    state.skillsData.forEach(s => { if (saved[s.id]) s.name = saved[s.id]; });

    // Restore active session
    const savedId = localStorage.getItem(ACTIVE_KEY);
    if (savedId) { const sessions = ls(); if (sessions.find(x => x.id === savedId)) openSession(savedId); }

    renderHistorySessions();
    if (state.currentPage === 'skills')   renderSkills();
    if (state.currentPage === 'sessions') renderAllSessions();
    loadUsage();
    loadLogs();
  } catch (err) { console.error('Load failed:', err); }
}

// Init
loadAll();
renderModels();

// Auto-refresh every 30s
setInterval(loadAll, 30000);
