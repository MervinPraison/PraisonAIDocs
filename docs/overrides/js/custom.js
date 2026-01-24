// Handle sidebar visibility for SPA navigation
// Hides sidebar on home page, shows on all other pages

(function() {
  function isHomePage() {
    const path = window.location.pathname;
    return path === '/docs/index' || 
           path === '/docs/' ||
           path === '/docs' ||
           path === '/' ||
           path.endsWith('/docs/index');
  }
  
  function updateSidebar() {
    const sidebar = document.getElementById('sidebar');
    
    // Find the main container - try multiple selectors
    let mainContainer = document.querySelector('.lg\\:ml-\\[19rem\\]');
    if (!mainContainer) {
      mainContainer = document.querySelector('[class*="lg:ml-"]');
    }
    
    if (isHomePage()) {
      // Hide sidebar on home page
      if (sidebar) {
        sidebar.style.setProperty('display', 'none', 'important');
      }
      if (mainContainer) {
        mainContainer.style.setProperty('margin-left', '0', 'important');
      }
    } else {
      // Show sidebar on all other pages
      if (sidebar) {
        sidebar.style.removeProperty('display');
      }
      if (mainContainer) {
        mainContainer.style.removeProperty('margin-left');
      }
    }
  }
  
  // Run on initial load
  updateSidebar();
  
  // Listen for navigation changes
  window.addEventListener('popstate', updateSidebar);
  
  // Listen for clicks that might trigger navigation
  document.addEventListener('click', function(e) {
    // Check if it's a link click
    if (e.target.closest('a')) {
      setTimeout(updateSidebar, 100);
      setTimeout(updateSidebar, 200);
      setTimeout(updateSidebar, 500);
    }
  });
  
  // Fallback: check URL changes frequently
  let lastPath = window.location.pathname;
  setInterval(function() {
    const currentPath = window.location.pathname;
    if (currentPath !== lastPath) {
      lastPath = currentPath;
      setTimeout(updateSidebar, 50);
      updateSidebar();
    }
  }, 50);
})();