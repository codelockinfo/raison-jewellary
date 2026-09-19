(function () {
  'use strict';
  function initSlider(sliderWrapper) {
    if (!sliderWrapper) return;

    const track = sliderWrapper.querySelector('.product-slider-track') || sliderWrapper.querySelector('.product-grid-mobile-slider');
    if (!track) return;

    const slides = track.querySelectorAll('.product-slide, .product-grid-item');
    if (slides.length === 0) return;

    const sliderId = sliderWrapper.dataset.sliderId;
    const isMobileSlider = sliderWrapper.classList.contains('product-grid-mobile-slider-wrapper');

    let slidesToShow;
    let currentIndex = 0;
    let autoSlideTimer = null;
    let totalSlides = slides.length;
    let maxIndex = 0;

    // Drag functionality variables
    let isDragging = false;
    let startX = 0;
    let startY = 0;
    let currentX = 0;
    let dragOffset = 0;

    // Helper function to update state based on screen size
    function updateState() {
      const windowWidth = window.innerWidth;
      const isMobile = windowWidth < 768;
      const isTablet = windowWidth >= 768 && windowWidth < 1200;

      // If it's a mobile-only slider but we are NOT on mobile, reset and do nothing
      if (isMobileSlider && !isMobile) {
        track.style.transform = 'none';
        return false; // Inactive
      }

      if (isMobile) {
        slidesToShow = parseInt(sliderWrapper.dataset.slidesMobile || sliderWrapper.dataset.productsToShowMobile || 1);
      } else if (isTablet) {
        slidesToShow = parseInt(sliderWrapper.dataset.slidesTablet || 2);
      } else {
        slidesToShow = parseInt(sliderWrapper.dataset.slidesDesktop || 4);
      }

      maxIndex = Math.max(0, totalSlides - slidesToShow);
      if (currentIndex > maxIndex) currentIndex = maxIndex;
      return true; // Active
    }

    // Initial State Check
    if (!updateState()) {
      // Even if inactive initially, we MUST attach resize listener
    }

    const showArrows = true;
    const showPagination = sliderWrapper.dataset.showPagination === 'true' || sliderWrapper.dataset.showPagination === '';
    const paginationStyle = sliderWrapper.dataset.paginationStyle || 'dots';
    const autoSlide = sliderWrapper.dataset.autoSlide === 'true' || sliderWrapper.dataset.autoSlide === '';
    const autoSlideInterval = parseInt(sliderWrapper.dataset.autoSlideInterval || 5000);

    function getSlideWidth() {
      const firstSlide = slides[0];
      if (!firstSlide) return 0;
      const slideWidth = firstSlide.offsetWidth;
      const gap = parseFloat(getComputedStyle(track).gap) || 0;
      return slideWidth + gap;
    }

    function updateSlider(smooth = true) {
      // Re-check state before updating (important for resize)
      if (!updateState()) return;

      const container = sliderWrapper.querySelector('.product-slider-container');
      if (!container || slides.length === 0) return;

      const slideWidthWithGap = getSlideWidth();
      if (slideWidthWithGap === 0) return; // Not visible or layout not ready

      const translateX = -(slideWidthWithGap * currentIndex) + dragOffset;

      track.style.transition = smooth ? 'transform 0.3s ease-out' : 'none';
      track.style.transform = `translateX(${translateX}px)`;

      updatePagination();
      updateArrows();
    }

    function updateArrows() {
      if (!showArrows) return;

      const prevBtn = sliderWrapper.querySelector('.slider-arrow-prev');
      const nextBtn = sliderWrapper.querySelector('.slider-arrow-next');
      if (prevBtn) prevBtn.disabled = currentIndex === 0;
      if (nextBtn) nextBtn.disabled = currentIndex >= maxIndex;
    }

    function updatePagination() {
      if (!showPagination) return;

      const pagination = sliderWrapper.querySelector('.slider-pagination');
      if (!pagination) return;

      // Calculate dots based on total navigable positions (maxIndex + 1)
      const dotsCount = maxIndex + 1;

      if (dotsCount <= 1) {
        pagination.style.display = 'none';
        pagination.innerHTML = '';
        return;
      }

      pagination.style.display = paginationStyle === 'progressbar' ? 'block' : 'flex';

      if (paginationStyle === 'dots') {
        let existingDots = pagination.querySelectorAll('.slider-pagination-dot');
        if (existingDots.length !== dotsCount) {
          pagination.innerHTML = '';
          for (let i = 0; i < dotsCount; i++) {
            const dot = document.createElement('div');
            dot.className = 'slider-pagination-dot';
            dot.setAttribute('data-index', i);
            dot.addEventListener('click', (e) => {
              e.preventDefault();
              e.stopPropagation();
              const targetIndex = parseInt(dot.getAttribute('data-index'));
              currentIndex = Math.min(targetIndex, maxIndex);
              dragOffset = 0;
              updateSlider();
              resetAutoSlide();
            });
            pagination.appendChild(dot);
          }
          existingDots = pagination.querySelectorAll('.slider-pagination-dot');
        }
        // Update active dot based on currentIndex
        existingDots.forEach((dot, i) => {
          if (i === currentIndex) {
            dot.classList.add('active');
          } else {
            dot.classList.remove('active');
          }
        });
      } else if (paginationStyle === 'progressbar') {
        let progress = pagination.querySelector('.slider-pagination-progress');
        if (!progress) {
          pagination.innerHTML = '';
          progress = document.createElement('div');
          progress.className = 'slider-pagination-progress';
          pagination.appendChild(progress);
        }
        const progressWidth = ((currentIndex + 1) / dotsCount) * 100;
        progress.style.width = progressWidth + '%';
      } else if (paginationStyle === 'fraction') {
        let fraction = pagination.querySelector('.slider-pagination-fraction');
        if (!fraction) {
          pagination.innerHTML = '';
          fraction = document.createElement('div');
          fraction.className = 'slider-pagination-fraction';
          pagination.appendChild(fraction);
        }
        fraction.textContent = (currentIndex + 1) + ' / ' + dotsCount;
      }
    }

    function nextSlide() {
      if (!updateState()) return;
      if (currentIndex < maxIndex) {
        currentIndex++;
      } else {
        currentIndex = 0;
      }
      dragOffset = 0;
      updateSlider();
      resetAutoSlide();
    }

    function prevSlide() {
      if (!updateState()) return;
      if (currentIndex > 0) {
        currentIndex--;
      } else {
        currentIndex = maxIndex;
      }
      dragOffset = 0;
      updateSlider();
      resetAutoSlide();
    }

    function resetAutoSlide() {
      if (autoSlide) {
        clearInterval(autoSlideTimer);
        autoSlideTimer = setInterval(nextSlide, autoSlideInterval);
      }
    }

    // Mouse/Touch drag functionality
    function getPositionX(event) {
      return event.type.includes('mouse') ? event.pageX : event.touches[0].clientX;
    }

    function getPositionY(event) {
      return event.type.includes('mouse') ? event.pageY : event.touches[0].clientY;
    }

    function dragStart(event) {
      if (!updateState()) return;

      // Don't prevent default on links/buttons
      if (event.target.closest('a, button, [role="button"]')) {
        return;
      }

      isDragging = true;
      startX = getPositionX(event);
      startY = getPositionY(event);
      currentX = startX;
      track.style.cursor = 'grabbing';

      // Stop auto slide while dragging
      if (autoSlide) {
        clearInterval(autoSlideTimer);
      }
    }

    function dragMove(event) {
      if (!isDragging) return;

      currentX = getPositionX(event);
      const currentY = getPositionY(event);

      const diffX = Math.abs(currentX - startX);
      const diffY = Math.abs(currentY - startY);

      // Only prevent scroll if movement is primarily horizontal
      if (diffX > diffY) {
        event.preventDefault();
      } else if (diffY > diffX && diffY > 5) {
        // If it's a vertical scroll, cancel the drag
        isDragging = false;
        return;
      }

      dragOffset = currentX - startX;

      // Apply drag with rubber band effect at edges
      const slideWidthWithGap = getSlideWidth();
      const atStart = currentIndex === 0 && dragOffset > 0;
      const atEnd = currentIndex === maxIndex && dragOffset < 0;

      if (atStart || atEnd) {
        // Apply resistance at edges
        dragOffset = dragOffset * 0.3;
      }

      updateSlider(false);
    }

    function dragEnd() {
      if (!isDragging) return;

      const wasDragged = Math.abs(dragOffset) > 5; // More than 5px movement is considered a drag

      isDragging = false;
      track.style.cursor = 'grab';

      const dragThreshold = 50;

      // Determine if we should change slides
      if (dragOffset < -dragThreshold && currentIndex < maxIndex) {
        currentIndex++;
      } else if (dragOffset > dragThreshold && currentIndex > 0) {
        currentIndex--;
      }

      // Reset drag offset and update with animation
      dragOffset = 0;
      updateSlider(true);
      resetAutoSlide();

      // Prevent clicks if user dragged
      if (wasDragged) {
        preventClickAfterDrag();
      }
    }

    // Prevent click events after dragging
    function preventClickAfterDrag() {
      const preventClick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      };

      // Add click prevention to all interactive elements
      track.addEventListener('click', preventClick, { capture: true });

      // Remove the prevention after a short delay
      setTimeout(() => {
        track.removeEventListener('click', preventClick, { capture: true });
      }, 10);
    }

    // Add drag event listeners
    track.addEventListener('mousedown', dragStart);
    track.addEventListener('touchstart', dragStart, { passive: false });
    track.addEventListener('mousemove', dragMove);
    track.addEventListener('touchmove', dragMove, { passive: false });
    track.addEventListener('mouseup', dragEnd);
    track.addEventListener('mouseleave', dragEnd);
    track.addEventListener('touchend', dragEnd);

    // Prevent context menu on long press
    track.addEventListener('contextmenu', (e) => {
      if (isDragging) e.preventDefault();
    });

    // Prevent image dragging
    slides.forEach(slide => {
      const images = slide.querySelectorAll('img');
      images.forEach(img => {
        img.addEventListener('dragstart', (e) => e.preventDefault());
      });
    });

    // Set cursor style
    track.style.cursor = 'grab';
    track.style.userSelect = 'none';

    const prevBtn = sliderWrapper.querySelector('.slider-arrow-prev');
    const nextBtn = sliderWrapper.querySelector('.slider-arrow-next');
    if (prevBtn && showArrows) {
      prevBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        prevSlide();
      });
    }
    if (nextBtn && showArrows) {
      nextBtn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        nextSlide();
      });
    }

    if (showPagination && paginationStyle === 'progressbar') {
      const pagination = sliderWrapper.querySelector('.slider-pagination');
      if (pagination && !pagination.dataset.handlerAttached) {
        pagination.addEventListener('click', (e) => {
          if (!updateState()) return;
          const dotsCount = Math.ceil(totalSlides / slidesToShow);
          if (dotsCount <= 1) return;
          const rect = pagination.getBoundingClientRect();
          const clickX = e.clientX - rect.left;
          const clickPercent = clickX / rect.width;
          const targetPage = Math.floor(clickPercent * dotsCount);
          if (targetPage >= 0 && targetPage < dotsCount) {
            currentIndex = Math.min(targetPage * slidesToShow, maxIndex);
            dragOffset = 0;
            updateSlider();
            resetAutoSlide();
          }
        });
        pagination.dataset.handlerAttached = 'true';
      }
    }

    // Initial call
    updateSlider();
    if (autoSlide) resetAutoSlide();

    // Resize Handler
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        dragOffset = 0;
        updateSlider();
        if (autoSlide) resetAutoSlide();
      }, 250);
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    const sliderWrappers = document.querySelectorAll('.product-slider-wrapper');
    sliderWrappers.forEach(wrapper => {
      initSlider(wrapper);
    });
  });
  if (typeof Shopify !== 'undefined' && Shopify.designMode) {
    document.addEventListener('shopify:section:load', (event) => {
      const section = event.target.querySelector('.product-showcase-section');
      if (section) {
        const sliderWrappers = section.querySelectorAll('.product-slider-wrapper');
        sliderWrappers.forEach(wrapper => {
          initSlider(wrapper);
        });
      }
    });
  }
})();