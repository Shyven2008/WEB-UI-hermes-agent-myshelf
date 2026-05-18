// ====== Navigation · Just Hermes Agent WEB UI ======
// Page switching, lazy loading, keyboard shortcuts, and init

function switchPage(page) {
  state.currentPage = page;

  // Update nav rail active state
  document.querySelectorAll('.nav-icon').forEach(el => {
    el.classList.toggle('active', el.dataset.page === page);
  });

  // Show/hide page containers
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === 'page-' + page);
    if (el.id === 'page-terminal') el.style.display = el.classList.contains('active') ? 'flex' : 'none';
  });

  // Lazy-load page data
  if (page === 'skills')   { loadSkills().then(renderSkills); }
  if (page === 'sessions') { loadAllSessions().then(renderAllSessions); }
  if (page === 'memory')   { loadMemory(); }
  if (page === 'model')    { renderModels(); }
  if (page === 'usage')    { loadUsage(); }
  if (page === 'logs')     { loadLogs(); }
  if (page === 'trash')    { renderTrash(); }
  if (page === 'files')    { renderFiles(); }
}

// ESC key closes modal
document.addEventListener('keydown', function (e) {
  if (e.key === 'Escape') closeModal();
});
