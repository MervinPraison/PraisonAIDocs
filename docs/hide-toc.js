/**
 * PraisonAI Docs - Custom JavaScript
 * Hides the right sidebar (table of contents) on most pages,
 * except for installation and API playground pages.
 */

(function() {
  'use strict';
  
  // Pages that should KEEP the right sidebar (table of contents)
  const pagesWithTOC = [
    '/docs/installation',
    '/installation',
    '/docs/deploy/api/',
    '/deploy/api/',
    '/docs/playground',
    '/playground'
  ];
  
  function shouldShowTOC() {
    const path = window.location.pathname;
    return pagesWithTOC.some(pattern => path.includes(pattern));
  }
  
  function applyTOCVisibility() {
    if (!shouldShowTOC()) {
      document.body.classList.add('hide-toc');
    } else {
      document.body.classList.remove('hide-toc');
    }
  }
  
  // Apply on initial load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyTOCVisibility);
  } else {
    applyTOCVisibility();
  }
  
  // Also handle client-side navigation (Next.js)
  // MutationObserver to detect URL changes
  let lastPath = window.location.pathname;
  const observer = new MutationObserver(() => {
    if (window.location.pathname !== lastPath) {
      lastPath = window.location.pathname;
      applyTOCVisibility();
    }
  });
  
  observer.observe(document.body, { 
    childList: true, 
    subtree: true 
  });
  
  // Also listen for popstate (browser back/forward)
  window.addEventListener('popstate', applyTOCVisibility);
})();
