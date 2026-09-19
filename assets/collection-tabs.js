function initCollectionTabs(section) {
  if (!section) return;
  const tabs = section.querySelectorAll('.collection-tabs-section__tab-btn');
  const contents = section.querySelectorAll('.collection-tabs-section__products-content');
  const productsWrapper = section.querySelector('.collection-tabs-section__products-wrapper');
  const indicator = section.querySelector('.collection-tabs-section__tabs-indicator');
  const swipers = new Map();

  function updateIndicator() {
    if (!indicator) return;
    const activeTab = section.querySelector('.collection-tabs-section__tab-btn.active');
    if (!activeTab) return;

    const tabRect = activeTab.getBoundingClientRect();
    const containerRect = activeTab.parentElement.getBoundingClientRect();

    indicator.style.width = `${tabRect.width}px`;
    indicator.style.left = `${activeTab.offsetLeft}px`;
    indicator.style.height = `${tabRect.height}px`;
    indicator.style.top = `${activeTab.offsetTop}px`;
  }

  function shouldUseSlider(sectionEl) {
    const isMobile = window.innerWidth <= 768;
    return isMobile
      ? sectionEl.dataset.layoutMobile === 'slider'
      : sectionEl.dataset.layoutDesktop === 'slider';
  }

  function initSwiper(content) {
    const swiperEl = content.querySelector('.collection-tabs-swiper');
    if (!swiperEl) return;

    if (swipers.has(content)) {
      swipers.get(content).destroy(true, true);
      swipers.delete(content);
    }

    if (!shouldUseSlider(section)) return;

    const style = getComputedStyle(section);
    const paginationStyle = section.dataset.paginationStyle || 'style-1';
    const paginationEl = swiperEl.querySelector('.swiper-pagination');

    const totalSlides = swiperEl.querySelectorAll('.swiper-slide').length;

    function getCurrentSlidesPerView() {
      const width = window.innerWidth;

      if (width <= 750) {
        return parseFloat(section.dataset.slidesMobile) || 1;
      }

      if (width <= 1024) {
        return parseFloat(section.dataset.slidesTablet) || 3;
      }

      return parseFloat(section.dataset.slidesDesktop) || 4;
    }

    function hasEnoughProductsForSlider() {
      return totalSlides > getCurrentSlidesPerView();
    }

    let paginationConfig = false;

    if (paginationEl && hasEnoughProductsForSlider()) {
      if (paginationStyle === 'style-1') {
        paginationConfig = {
          el: paginationEl,
          clickable: true,
          type: 'bullets'
        };
      } else if (paginationStyle === 'style-2') {
        paginationConfig = {
          el: paginationEl,
          type: 'progressbar'
        };
      } else if (paginationStyle === 'style-3') {
        paginationConfig = {
          el: paginationEl,
          type: 'fraction',
          renderFraction: function (currentClass, totalClass) {
            return `<span class="${currentClass}"></span> / <span class="${totalClass}"></span>`;
          }
        };
      }
    }

    const swiper = new Swiper(swiperEl, {
      grabCursor: hasEnoughProductsForSlider(),
      spaceBetween: parseInt(style.getPropertyValue('--product-gap')) || 20,

      navigation: hasEnoughProductsForSlider()
        ? {
            nextEl: swiperEl.querySelector('.swiper-button-next'),
            prevEl: swiperEl.querySelector('.swiper-button-prev')
          }
        : false,

      pagination: paginationConfig,

      breakpoints: {
        0: {
          slidesPerView: parseFloat(section.dataset.slidesMobile) || 1
        },
        750: {
          slidesPerView: parseFloat(section.dataset.slidesTablet) || 3
        },
        1025: {
          slidesPerView: parseFloat(section.dataset.slidesDesktop) || 4
        }
      },

      observer: true,
      observeParents: true,
      watchOverflow: true,

      on: {
        init: function () {
          toggleSliderControls(this);
        },
        resize: function () {
          toggleSliderControls(this);
        },
        breakpoint: function () {
          toggleSliderControls(this);
        }
      }
    });

    function toggleSliderControls(swiperInstance) {
      const visibleSlides = getCurrentSlidesPerView();
      const shouldShowPagination = totalSlides > visibleSlides;

      const pagination = swiperEl.querySelector('.swiper-pagination');
      const prevArrow = swiperEl.querySelector('.swiper-button-prev');
      const nextArrow = swiperEl.querySelector('.swiper-button-next');

      if (pagination) {
        if (shouldShowPagination) {
          pagination.style.removeProperty('display');
          pagination.style.removeProperty('visibility');
          pagination.style.removeProperty('opacity');
          pagination.style.removeProperty('height');
          pagination.style.removeProperty('min-height');
          pagination.style.removeProperty('max-height');
          pagination.style.removeProperty('margin');
          pagination.style.removeProperty('padding');
          pagination.style.removeProperty('overflow');
        } else {
          pagination.style.setProperty('display', 'none', 'important');
          pagination.style.setProperty('visibility', 'hidden', 'important');
          pagination.style.setProperty('opacity', '0', 'important');
          pagination.style.setProperty('height', '0', 'important');
          pagination.style.setProperty('min-height', '0', 'important');
          pagination.style.setProperty('max-height', '0', 'important');
          pagination.style.setProperty('margin', '0', 'important');
          pagination.style.setProperty('padding', '0', 'important');
          pagination.style.setProperty('overflow', 'hidden', 'important');
        }
      }

      if (prevArrow) {
        prevArrow.style.display = shouldShowPagination ? '' : 'none';
      }

      if (nextArrow) {
        nextArrow.style.display = shouldShowPagination ? '' : 'none';
      }

      swiperEl.classList.toggle('collection-tabs-swiper--no-controls', !shouldShowPagination);

      if (swiperInstance && swiperInstance.update) {
        swiperInstance.update();
      }
    }

    swipers.set(content, swiper);
  }

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const blockId = tab.getAttribute('data-block-id');
      if (!blockId) return;

      const currentActive = section.querySelector('.collection-tabs-section__products-content.active');
      const nextActive = section.querySelector(`[data-collection-content="${blockId}"]`);

      if (currentActive === nextActive) return;

      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      updateIndicator();

      // Sync header buttons
      const headerButtons = section.querySelectorAll('.collection-tabs-section__header-view-all');
      headerButtons.forEach(b => b.classList.remove('active'));
      const activeHeaderBtn = section.querySelector(`.collection-tabs-section__header-view-all[data-view-all-content="${blockId}"]`);
      if (activeHeaderBtn) {
        activeHeaderBtn.classList.add('active');
      }

      if (currentActive) {
        // Smooth height transition
        const startHeight = productsWrapper.offsetHeight;
        productsWrapper.style.height = `${startHeight}px`;
        productsWrapper.style.overflow = 'hidden';
        productsWrapper.style.transition = 'height 0.4s cubic-bezier(0.4, 0, 0.2, 1)';

        currentActive.style.opacity = '0';
        currentActive.style.transition = 'opacity 0.2s ease';

        setTimeout(() => {
          currentActive.classList.remove('active');
          currentActive.style.opacity = '';
          currentActive.style.transition = '';

          if (nextActive) {
            nextActive.classList.add('active');
            initSwiper(nextActive);

            const endHeight = nextActive.offsetHeight;
            productsWrapper.style.height = `${endHeight}px`;

            setTimeout(() => {
              productsWrapper.style.height = '';
              productsWrapper.style.overflow = '';
              productsWrapper.style.transition = '';
            }, 400);
          }
        }, 200);
      } else if (nextActive) {
        nextActive.classList.add('active');
        initSwiper(nextActive);
      }
    });
  });

  // Resize handler
  const resizeHandler = () => {
    contents.forEach(content => initSwiper(content));
    updateIndicator();
  };
  window.addEventListener('resize', resizeHandler);

  // Initial load
  const firstActive = section.querySelector('.collection-tabs-section__products-content.active');
  if (firstActive) {
    initSwiper(firstActive);
  }
  // Small delay to ensure styles are loaded for indicator calculation
  setTimeout(updateIndicator, 100);

  // Cleanup function for shopify editor re-loads
  section.addEventListener('shopify:section:unload', () => {
    window.removeEventListener('resize', resizeHandler);
    swipers.forEach(swiper => swiper.destroy(true, true));
  });

  const mobileSelect = section.querySelector('.collection-tabs-section__mobile-select');

if (mobileSelect) {
  mobileSelect.addEventListener('change', () => {
    const blockId = mobileSelect.value;
    if (!blockId) return;

    const targetTab = section.querySelector(
      `.collection-tabs-section__tab-btn[data-block-id="${blockId}"]`
    );

    if (targetTab) {
      targetTab.click();
    }
  });
}
}

document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.collection-tabs-section').forEach(section => {
    initCollectionTabs(section);
  });
});

// Shopify Editor Support
document.addEventListener('shopify:section:load', (event) => {
  const section = event.target.querySelector('.collection-tabs-section');
  if (section) {
    initCollectionTabs(section);
  }
});
