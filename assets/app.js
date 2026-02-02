// ===== SA Visual - Main JavaScript =====

(function() {
  'use strict';

  // ===== Load Works Data =====
  let worksData = [];

  async function loadWorksData() {
    try {
      const response = await fetch('/data/works.json');
      worksData = await response.json();
      return worksData;
    } catch (error) {
      console.error('Failed to load works data:', error);
      return [];
    }
  }

  // ===== Portfolio Grid (Photo/Video) =====
  async function initPortfolioGrid() {
    const grid = document.getElementById('worksGrid');
    if (!grid) return;

    // Get category from URL path
    const path = window.location.pathname;
    let category = null;
    
    if (path.includes('/photo')) {
      category = 'Photo';
    } else if (path.includes('/video')) {
      category = 'Video';
    }

    const works = await loadWorksData();
    
    // Filter by category if specified
    const filteredWorks = category 
      ? works.filter(work => work.type === category || 
          (category === 'Video' && (work.type === 'Full Video' || work.type === 'Teaser')))
      : works;

    if (filteredWorks.length === 0) {
      grid.innerHTML = '<p style="opacity:0.5;text-align:center;padding:60px 0;">No works found.</p>';
      return;
    }

    grid.innerHTML = filteredWorks.map(work => `
      <a href="/work/?id=${work.id}" class="work-card${work.type === 'Photo' ? ' photo-card' : ''}">
        <img src="${work.thumb}" alt="${work.title}" />
        <div class="work-overlay">
          <div class="work-title">${work.title}</div>
          <div class="work-type">${work.type}</div>
        </div>
      </a>
    `).join('');
  }

  // ===== Work Detail Page =====
  async function initWorkDetail() {
    const root = document.getElementById('workRoot');
    if (!root) return;

    const params = new URLSearchParams(window.location.search);
    const workId = params.get('id');

    if (!workId) {
      root.innerHTML = '<div class="container"><p>Work not found.</p></div>';
      return;
    }

    const works = await loadWorksData();
    const work = works.find(w => w.id === workId);

    if (!work) {
      root.innerHTML = '<div class="container"><p>Work not found.</p></div>';
      return;
    }

    // Find next and previous works
    const currentIndex = works.findIndex(w => w.id === workId);
    const nextWork = works[(currentIndex + 1) % works.length];
    const prevWork = works[(currentIndex - 1 + works.length) % works.length];

    // Render work detail
    let mediaHTML = '';
    
    if (work.videoId) {
      // Video work
      mediaHTML = `
        <div class="work-media">
          <div class="work-video">
            <iframe 
              src="https://www.youtube.com/embed/${work.videoId}" 
              frameborder="0" 
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" 
              allowfullscreen>
            </iframe>
          </div>
        </div>
      `;
    } else if (work.images) {
      // Photo work
      mediaHTML = `
        <div class="work-media">
          <div class="work-photos">
            ${work.images.map(img => `<img src="${img}" alt="${work.title}" />`).join('')}
          </div>
        </div>
      `;
    }

    root.innerHTML = `
      <div class="work-detail">
        <div class="work-header">
          <h1>${work.title}</h1>
          <div class="work-meta">
            <span>${work.type}</span>
            <span>${work.year}</span>
            <span>${work.client}</span>
          </div>
        </div>

        ${mediaHTML}

        <div class="work-credits">
          <h2>Credits</h2>
          <div class="credits-list">
            ${work.credits.map(credit => `<div class="credit-item">${credit}</div>`).join('')}
          </div>
        </div>

        <div class="work-nav">
          <a href="/work/?id=${prevWork.id}" class="nav-project">
            <img src="${prevWork.thumb}" alt="${prevWork.title}" />
            <div class="nav-label">◄ Previous Project</div>
            <div class="nav-title">${prevWork.title}</div>
          </a>
          <a href="/work/?id=${nextWork.id}" class="nav-project">
            <img src="${nextWork.thumb}" alt="${nextWork.title}" />
            <div class="nav-label">Next Project ►</div>
            <div class="nav-title">${nextWork.title}</div>
          </a>
        </div>
      </div>
    `;
  }

  // ===== Contact Page =====
  function initContactPage() {
    const root = document.getElementById('contactRoot');
    if (!root) return;

    root.innerHTML = `
      <div class="contact-container">
        <div class="contact-intro">
          <h1>Contact</h1>
        </div>

        <div class="contact-methods">
          <div class="contact-item">
            <div class="contact-label">Email</div>
            <div class="contact-value" style="display: flex; align-items: center; gap: 15px;">
              <a href="mailto:contact@savisual.com" id="emailLink">contact@savisual.com</a>
              <button id="copyEmailBtn" class="copy-btn">Copy</button>
            </div>
            <div id="copyNotification" class="copy-notification">Copied!</div>
          </div>

          <div class="contact-item">
            <div class="contact-label">Instagram</div>
            <div class="contact-value">
              <a href="https://www.instagram.com/sa.visual__/" target="_blank" rel="noopener">@sa.visual__</a>
            </div>
          </div>

          <div class="contact-item">
            <div class="contact-label">Location</div>
            <div class="contact-value">Seoul, South Korea</div>
          </div>
        </div>
      </div>
    `;

    // Copy email functionality
    const copyBtn = document.getElementById('copyEmailBtn');
    const notification = document.getElementById('copyNotification');
    
    if (copyBtn) {
      copyBtn.addEventListener('click', function(e) {
        e.preventDefault();
        const email = 'contact@savisual.com';
        
        // Copy to clipboard
        navigator.clipboard.writeText(email).then(function() {
          // Show notification
          notification.classList.add('show');
          
          // Hide notification after 2 seconds
          setTimeout(function() {
            notification.classList.remove('show');
          }, 2000);
        }).catch(function(err) {
          console.error('Failed to copy:', err);
        });
      });
    }
  }

  // ===== Initialize on DOM Load =====
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  function init() {
    // Check which page we're on and initialize accordingly
    if (document.getElementById('worksGrid')) {
      initPortfolioGrid();
    }
    
    if (document.getElementById('workRoot')) {
      initWorkDetail();
    }
    
    if (document.getElementById('contactRoot')) {
      initContactPage();
    }
  }

})();
