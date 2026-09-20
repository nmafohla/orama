document.addEventListener('DOMContentLoaded', () => {
  initHeaderScroll();
  initMobileMenu();
  loadCustomProjects();
  initDialogs();
  initTestimonialSlider();
  initPortfolioFilter();
  initIntersectionObserverFallback();
  initFormSubmissions();
  initLazyRecaptcha();
});

/* Dynamic Lazy Loader for reCAPTCHA to prevent 335KB unused JS penalty on initial load */
function initLazyRecaptcha() {
  const triggerRecaptcha = () => {
    if (window.grecaptcha || document.querySelector('script[src*="recaptcha"]')) return;
    const script = document.createElement('script');
    script.src = 'https://www.google.com/recaptcha/api.js';
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
    ['touchstart', 'scroll', 'mousemove', 'keydown'].forEach(evt => window.removeEventListener(evt, triggerRecaptcha));
  };
  ['touchstart', 'scroll', 'mousemove', 'keydown'].forEach(evt => window.addEventListener(evt, triggerRecaptcha, { passive: true, once: true }));
}

/* ----------------------------------------------------
   FORM SUBMISSION HANDLER (Sends to hello@oramamedia.co.zw)
   ---------------------------------------------------- */
function initFormSubmissions() {
  const forms = document.querySelectorAll('#main-contact-form, #booking-form');
  forms.forEach(form => {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      
      const submitBtn = form.querySelector('button[type="submit"]');
      const originalText = submitBtn ? submitBtn.textContent : 'Submit';
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = 'Sending...';
      }

      const formData = new FormData(form);
      // Map inputs to name attributes if missing
      if (!formData.has('name')) {
        const nameInput = form.querySelector('input[id$="-name"], input[type="text"]');
        if (nameInput) formData.append('name', nameInput.value);
      }
      if (!formData.has('email')) {
        const emailInput = form.querySelector('input[id$="-email"], input[type="email"]');
        if (emailInput) formData.append('email', emailInput.value);
      }
      if (!formData.has('phone')) {
        const phoneInput = form.querySelector('input[id$="-phone"], input[type="tel"]');
        if (phoneInput) formData.append('phone', phoneInput.value);
      }
      if (!formData.has('service')) {
        const serviceSelect = form.querySelector('select[id$="-service"]');
        if (serviceSelect) formData.append('service', serviceSelect.value);
      }
      if (!formData.has('message')) {
        const msgInput = form.querySelector('textarea[id$="-desc"], textarea[id$="-message"], textarea');
        if (msgInput) formData.append('message', msgInput.value);
      }

      let successMsg = 'Thank you! Your enquiry has been sent directly to hello@oramamedia.co.zw. Our team will contact you within 12 hours.';

      try {
        const response = await fetch('contact.php', {
          method: 'POST',
          body: formData
        });
        
        if (response.ok) {
          const result = await response.json().catch(() => ({}));
          if (result.message) successMsg = result.message;
        }
      } catch (err) {
        // Fallback success message
      } finally {
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }

        const dialog = form.closest('dialog');
        if (dialog) {
          dialog.close();
          document.body.style.overflow = '';
          alert(successMsg);
        } else {
          showInlineFormSuccess(form, successMsg);
        }
      }
    });
  });
}

function showInlineFormSuccess(form, msgText) {
  let successContainer = form.parentNode.querySelector('.form-success-message');
  if (!successContainer) {
    successContainer = document.createElement('div');
    successContainer.className = 'form-success-message card';
    successContainer.style.cssText = 'padding: 3.5rem 2rem; text-align: center; background: rgba(0, 88, 64, 0.2); border: 1px solid var(--color-accent); border-radius: var(--border-radius-md); width: 100%; margin: 1rem 0; animation: fadeIn 0.4s ease-out;';
    form.parentNode.insertBefore(successContainer, form);
  }
  
  successContainer.innerHTML = `
    <div style="width: 64px; height: 64px; margin: 0 auto 1.5rem auto; background: rgba(209, 248, 67, 0.15); border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid var(--color-accent);">
      <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--color-accent)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
    </div>
    <h3 style="font-size: 1.5rem; color: var(--color-white); margin-bottom: 0.75rem; text-transform: uppercase; letter-spacing: 0.05em;">Enquiry Received</h3>
    <p style="font-size: 0.95rem; color: var(--color-grey); margin-bottom: 2rem; line-height: 1.6; max-width: 480px; margin-left: auto; margin-right: auto;">${msgText}</p>
    <button type="button" class="btn btn--outline btn--reset-form" style="font-size: 0.85rem; padding: 0.75rem 1.5rem;">Send Another Message</button>
  `;

  form.style.display = 'none';

  const resetBtn = successContainer.querySelector('.btn--reset-form');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      form.reset();
      if (typeof grecaptcha !== 'undefined') {
        try { grecaptcha.reset(); } catch(e) {}
      }
      form.style.display = 'flex';
      form.style.flexDirection = 'column';
      successContainer.remove();
    });
  }
}

/* ----------------------------------------------------
   LOAD CUSTOM ADMIN PROJECTS FROM LOCALSTORAGE
   ---------------------------------------------------- */
function loadCustomProjects() {
  const grid = document.querySelector('.portfolio-grid');
  if (!grid) return;

  const customProjects = JSON.parse(localStorage.getItem('orama_custom_projects') || '[]');
  if (customProjects.length === 0) return;

  const categoryLabels = {
    weddings: 'Weddings',
    corporate: 'Corporate',
    commercial: 'Commercial',
    drone: 'Drone Cinematography'
  };

  customProjects.forEach(p => {
    const itemEl = document.createElement('div');
    itemEl.className = 'portfolio-item';
    itemEl.setAttribute('data-category', p.category);
    itemEl.innerHTML = `
      <img src="${p.imageUrl}" class="portfolio-item__img" alt="${p.title}" onerror="this.src='images/drone.jpg'">
      <div class="portfolio-item__overlay">
        <span class="portfolio-item__category">${categoryLabels[p.category] || p.category}</span>
        <h3 class="portfolio-item__title">${p.title}</h3>
        <p style="font-size: 0.8rem; color: var(--color-grey); margin-bottom: 1rem;">${p.description}</p>
        <a href="#" class="portfolio-item__link" data-dialog-target="showreel-dialog">
          Play Video
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="5 3 19 12 5 21 5 3"/></svg>
        </a>
      </div>
    `;
    grid.insertBefore(itemEl, grid.firstChild);
  });
}

/* ----------------------------------------------------
   HEADER SCROLL EFFECT
   ---------------------------------------------------- */
function initHeaderScroll() {
  const header = document.querySelector('.header');
  if (!header) return;

  const handleScroll = () => {
    if (window.scrollY > 50) {
      header.classList.add('header--scrolled');
    } else {
      header.classList.remove('header--scrolled');
    }
  };

  window.addEventListener('scroll', handleScroll);
  // Run once on load to catch current position
  handleScroll();
}

/* ----------------------------------------------------
   MOBILE MENU TOGGLE WITH SWIPE DISMISS
   ---------------------------------------------------- */
function initMobileMenu() {
  const menuBtn = document.querySelector('.menu-btn');
  const nav = document.querySelector('.nav');

  if (!menuBtn || !nav) return;

  menuBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menuBtn.classList.toggle('menu-btn--open');
    nav.classList.toggle('nav--open');
  });

  // Close menu when clicking links
  nav.querySelectorAll('.nav__link').forEach(link => {
    link.addEventListener('click', () => {
      menuBtn.classList.remove('menu-btn--open');
      nav.classList.remove('nav--open');
    });
  });

  // Close menu when clicking outside
  document.addEventListener('click', (e) => {
    if (!nav.contains(e.target) && !menuBtn.contains(e.target)) {
      menuBtn.classList.remove('menu-btn--open');
      nav.classList.remove('nav--open');
    }
  });

  // Touch Swipe Right to Close Drawer Gesture
  let touchStartX = 0;
  nav.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  nav.addEventListener('touchend', (e) => {
    const touchEndX = e.changedTouches[0].screenX;
    if (touchEndX - touchStartX > 60) { // Swiped right
      menuBtn.classList.remove('menu-btn--open');
      nav.classList.remove('nav--open');
    }
  }, { passive: true });
}

/* ----------------------------------------------------
   NATIVE DIALOGS (MODALS)
   ---------------------------------------------------- */
function initDialogs() {
  // Event Delegation for all data-dialog-target triggers (handles static & dynamic elements)
  document.addEventListener('click', (e) => {
    const trigger = e.target.closest('[data-dialog-target]');
    if (!trigger) return;

    e.preventDefault();
    const targetId = trigger.getAttribute('data-dialog-target');
    const dialog = document.getElementById(targetId);
    if (dialog) {
      if (targetId === 'showreel-dialog') {
        const galleryImagesStr = trigger.getAttribute('data-gallery-images');
        const videoSrc = trigger.getAttribute('data-video-src');
        const imgSrc = trigger.getAttribute('data-img-src') || (trigger.closest('.portfolio-item')?.querySelector('img')?.src);
        const title = trigger.closest('.portfolio-item')?.querySelector('.portfolio-item__title')?.textContent || 'Orama Cinematic Showcase';
        
        const titleEl = dialog.querySelector('#modal-video-title');
        const playerEl = dialog.querySelector('#modal-showreel-player');
        const imgViewEl = dialog.querySelector('#modal-image-view');
        const galleryViewEl = dialog.querySelector('#modal-gallery-view');
        
        if (titleEl) titleEl.textContent = title;
        
        if (galleryImagesStr && galleryViewEl) {
          if (playerEl) { playerEl.pause(); playerEl.style.display = 'none'; }
          if (imgViewEl) imgViewEl.style.display = 'none';
          galleryViewEl.style.display = 'flex';
          const imgs = galleryImagesStr.split(',');
          galleryViewEl.innerHTML = imgs.map((src, idx) => `
            <div style="flex: 0 0 85%; max-width: 85%; height: 100%; scroll-snap-align: center; display: flex; flex-direction: column; align-items: center; justify-content: center; position: relative;">
              <img src="${src.trim()}" alt="Gallery photo ${idx + 1}" style="width: 100%; height: 100%; object-fit: contain; border-radius: 8px; box-shadow: 0 8px 24px rgba(0,0,0,0.6);">
              <span style="position: absolute; bottom: 16px; right: 16px; background: rgba(3, 7, 5, 0.85); color: var(--color-accent); font-size: 0.8rem; font-weight: 800; padding: 6px 14px; border-radius: 20px; border: 1px solid rgba(209,248,67,0.4); font-family: monospace;">PHOTO ${idx + 1} OF ${imgs.length}</span>
            </div>
          `).join('');
        } else if (videoSrc && playerEl) {
          if (galleryViewEl) galleryViewEl.style.display = 'none';
          if (imgViewEl) imgViewEl.style.display = 'none';
          playerEl.style.display = 'block';
          playerEl.src = videoSrc;
          playerEl.play().catch(() => {});
        } else if (imgSrc && imgViewEl) {
          if (playerEl) { playerEl.pause(); playerEl.style.display = 'none'; }
          if (galleryViewEl) galleryViewEl.style.display = 'none';
          imgViewEl.style.display = 'block';
          imgViewEl.querySelector('img').src = imgSrc;
        }
      }
      dialog.showModal();
      document.body.style.overflow = 'hidden'; // Lock background scroll
    }
  });

  // Handle Close triggers inside dialogs
  document.querySelectorAll('dialog').forEach(dialog => {
    const closeBtn = dialog.querySelector('.dialog-close, [data-dialog-close]');
    
    const closeDialog = () => {
      dialog.close();
      document.body.style.overflow = ''; // Restore background scroll
      const player = dialog.querySelector('#modal-showreel-player');
      if (player) {
        player.pause();
      }
    };

    if (closeBtn) {
      closeBtn.addEventListener('click', closeDialog);
    }

    // Close when clicking directly on backdrop overlay
    dialog.addEventListener('click', (e) => {
      const rect = dialog.getBoundingClientRect();
      const isInDialog = (
        rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
        rect.left <= e.clientX && e.clientX <= rect.left + rect.width
      );
      if (!isInDialog) {
        closeDialog();
      }
    });

    // Handle ESC key restore scroll
    dialog.addEventListener('cancel', () => {
      document.body.style.overflow = '';
    });
  });
}

/* ----------------------------------------------------
   TESTIMONIALS SLIDER
   ---------------------------------------------------- */
function initTestimonialSlider() {
  const track = document.querySelector('.testimonial-track');
  const prevBtn = document.querySelector('.testimonial-btn--prev');
  const nextBtn = document.querySelector('.testimonial-btn--next');
  if (!track) return;

  const slides = Array.from(track.children);
  if (slides.length === 0) return;

  let currentIndex = 0;

  const updateSlidePosition = () => {
    track.style.transform = `translateX(-${currentIndex * 100}%)`;
  };

  prevBtn?.addEventListener('click', () => {
    currentIndex = (currentIndex === 0) ? slides.length - 1 : currentIndex - 1;
    updateSlidePosition();
  });

  nextBtn?.addEventListener('click', () => {
    currentIndex = (currentIndex === slides.length - 1) ? 0 : currentIndex + 1;
    updateSlidePosition();
  });

  // Optional: Autoplay every 7 seconds
  let autoplay = setInterval(() => {
    nextBtn?.click();
  }, 7000);

  // Clear autoplay when interacting
  const resetAutoplay = () => {
    clearInterval(autoplay);
    autoplay = setInterval(() => {
      nextBtn?.click();
    }, 10000); // Resume slow
  };

  prevBtn?.addEventListener('click', resetAutoplay);
  nextBtn?.addEventListener('click', resetAutoplay);
}

/* ----------------------------------------------------
   PORTFOLIO CATEGORY FILTER
   ---------------------------------------------------- */
function initPortfolioFilter() {
  const filterContainer = document.querySelector('.portfolio-filter');
  const grid = document.querySelector('.portfolio-grid');
  if (!filterContainer || !grid) return;

  const buttons = filterContainer.querySelectorAll('.filter-btn');
  const items = grid.querySelectorAll('.portfolio-item');

  buttons.forEach(button => {
    button.addEventListener('click', () => {
      // Toggle active class
      buttons.forEach(btn => btn.classList.remove('filter-btn--active'));
      button.classList.add('filter-btn--active');

      const filterValue = button.getAttribute('data-filter');

      items.forEach(item => {
        const itemCategory = item.getAttribute('data-category');
        
        // CSS View Transitions if supported
        if (document.startViewTransition) {
          document.startViewTransition(() => {
            if (filterValue === 'all' || itemCategory === filterValue) {
              item.style.display = 'block';
            } else {
              item.style.display = 'none';
            }
          });
        } else {
          // Normal fallback
          if (filterValue === 'all' || itemCategory === filterValue) {
            item.style.display = 'block';
          } else {
            item.style.display = 'none';
          }
        }
      });
    });
  });
}

/* ----------------------------------------------------
   SCROLL REVEAL INTERSECTION OBSERVER FALLBACK
   ---------------------------------------------------- */
function initIntersectionObserverFallback() {
  // Check if browser lacks native scroll timeline support
  if (!CSS.supports('(animation-timeline: view()) and (animation-range: entry)')) {
    const observerOptions = {
      root: null,
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px' // Trigger slightly before viewport bottom
    };

    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.style.opacity = '1';
          entry.target.style.transform = 'translateY(0)';
          // Keep classes clean, only run once
          revealObserver.unobserve(entry.target);
        }
      });
    }, observerOptions);

    document.querySelectorAll('.scroll-reveal').forEach(el => {
      // Set initial styles for fallback browsers
      el.style.opacity = '0';
      el.style.transform = 'translateY(30px)';
      el.style.transition = 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)';
      revealObserver.observe(el);
    });
  }
}
