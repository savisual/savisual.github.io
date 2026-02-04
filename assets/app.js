// ===== SA Visual - Main JavaScript =====

(function() {
  'use strict';

  // ===== Back Button =====
  function initBackButton() {
    const path = window.location.pathname;
    
    // Show back button on: work detail, portfolio category pages, contact
    const showBackButton = path.includes('/work/') || 
                          path.includes('/portfolio/video') ||
                          path.includes('/portfolio/photo') ||
                          path.includes('/portfolio/shorts') ||
                          path.includes('/portfolio/design') ||
                          path.includes('/contact/');
    
    if (showBackButton) {
      const backBtn = document.createElement('div');
      backBtn.className = 'back-button';
      backBtn.innerHTML = `
        <svg viewBox="0 0 24 24">
          <path d="M19 12H5M12 19l-7-7 7-7"/>
        </svg>
      `;
      
      backBtn.addEventListener('click', function() {
        window.history.back();
      });
      
      document.body.appendChild(backBtn);
    }
  }

  // ===== Scroll Fade-in Animation =====
  function initScrollAnimation() {
    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -100px 0px'
    };
    
    const observer = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting) {
          const delay = Array.from(entry.target.parentElement.children).indexOf(entry.target) * 100;
          setTimeout(function() {
            entry.target.classList.add('fade-in-animate');
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
          }, delay);
          observer.unobserve(entry.target);
        }
      });
    }, observerOptions);
    
    // Set initial state and observe
    const elements = document.querySelectorAll('.work-card, .category-card, .contact-item, .gallery-thumb');
    elements.forEach(function(el) {
      el.style.opacity = '0';
      el.style.transform = 'translateY(50px)';
      observer.observe(el);
    });
  }

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
      grid.classList.add('photo-grid');
    } else if (path.includes('/video')) {
      category = 'Video';
    } else if (path.includes('/shorts')) {
      category = 'Shorts';
      grid.classList.add('photo-grid'); // Shorts use vertical layout
    } else if (path.includes('/design')) {
      category = 'Design';
    }

    const works = await loadWorksData();
    
    // Filter by category if specified
    const filteredWorks = category 
      ? works.filter(work => {
          if (category === 'Video') {
            return work.type === 'Full Video' || work.type === 'Teaser';
          } else if (category === 'Shorts') {
            return work.type === 'Shorts';
          } else {
            return work.type === category;
          }
        })
      : works;

    if (filteredWorks.length === 0) {
      grid.innerHTML = '<p style="opacity:0.5;text-align:center;padding:60px 0;">No works found.</p>';
      return;
    }

    grid.innerHTML = filteredWorks.map(work => `
      <a href="/work/?id=${work.id}" class="work-card${(work.type === 'Photo' || work.type === 'Shorts') ? ' photo-card' : ''}${work.type === 'Design' ? ' design-card' : ''}">
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
      // YouTube video work
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
    } else if (work.instagramUrl) {
      // Instagram Reel/Post
      const embedUrl = work.instagramUrl.replace('/reel/', '/p/').replace(/\/$/, '') + '/embed/';
      mediaHTML = `
        <div class="work-media">
          <div class="instagram-embed">
            <iframe 
              src="${embedUrl}" 
              frameborder="0" 
              scrolling="no"
              allowtransparency="true"
              allow="encrypted-media">
            </iframe>
          </div>
        </div>
      `;
    } else if (work.images) {
      // Photo work - thumbnail gallery
      mediaHTML = `
        <div class="work-media">
          <div class="photo-gallery">
            ${work.images.map((img, index) => `
              <img 
                src="${img}" 
                alt="${work.title}" 
                class="gallery-thumb" 
                onclick="openLightbox(${index})"
              />
            `).join('')}
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

      ${work.images ? `
        <div id="lightbox" class="lightbox" onclick="closeLightbox()">
          <span class="lightbox-close">&times;</span>
          <span class="lightbox-prev" onclick="event.stopPropagation(); changeLightboxImage(-1)">&#10094;</span>
          <span class="lightbox-next" onclick="event.stopPropagation(); changeLightboxImage(1)">&#10095;</span>
          <img id="lightbox-img" src="" alt="${work.title}" onclick="event.stopPropagation()">
          <div class="lightbox-counter"><span id="lightbox-current">1</span> / ${work.images.length}</div>
        </div>
      ` : ''}
    `;

    // Lightbox functionality for photo works
    if (work.images) {
      let currentImageIndex = 0;
      const images = work.images;

      window.openLightbox = function(index) {
        currentImageIndex = index;
        updateLightboxImage();
        document.getElementById('lightbox').style.display = 'flex';
        document.body.style.overflow = 'hidden';
      };

      window.closeLightbox = function() {
        document.getElementById('lightbox').style.display = 'none';
        document.body.style.overflow = 'auto';
      };

      window.changeLightboxImage = function(direction) {
        currentImageIndex += direction;
        if (currentImageIndex < 0) currentImageIndex = images.length - 1;
        if (currentImageIndex >= images.length) currentImageIndex = 0;
        updateLightboxImage();
      };

      function updateLightboxImage() {
        document.getElementById('lightbox-img').src = images[currentImageIndex];
        document.getElementById('lightbox-current').textContent = currentImageIndex + 1;
      }

      // Keyboard navigation
      document.addEventListener('keydown', function(e) {
        const lightbox = document.getElementById('lightbox');
        if (lightbox && lightbox.style.display === 'flex') {
          if (e.key === 'ArrowLeft') changeLightboxImage(-1);
          if (e.key === 'ArrowRight') changeLightboxImage(1);
          if (e.key === 'Escape') closeLightbox();
        }
      });
    }
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
              <a href="mailto:safilm8206@gmail.com" id="emailLink">safilm8206@gmail.com</a>
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
        const email = 'safilm8206@gmail.com';
        
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
    // Initialize back button
    initBackButton();
    
    // Check which page we're on and initialize accordingly
    if (document.getElementById('worksGrid')) {
      initPortfolioGrid();
      // Add delay for scroll animation after grid is loaded
      setTimeout(initScrollAnimation, 100);
    }
    
    if (document.getElementById('workRoot')) {
      initWorkDetail();
      setTimeout(initScrollAnimation, 100);
    }
    
    if (document.getElementById('contactRoot')) {
      initContactPage();
      setTimeout(initScrollAnimation, 100);
    }
    
    // Initialize scroll animation for portfolio main page
    if (window.location.pathname === '/portfolio/' || window.location.pathname === '/portfolio/index.html') {
      setTimeout(initScrollAnimation, 100);
    }
  }

})();
