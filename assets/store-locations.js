class StoreLocations {
  constructor(sectionId) {
    this.section = document.querySelector(`[data-section-id="${sectionId}"]`);
    if (!this.section) return;
    const selector = this.section.querySelector('.store-locations-section__selector');
    this.buttons = selector ? selector.querySelectorAll('.store-locations-section__location-btn') : [];
    this.contentPanels = this.section.querySelectorAll('.store-locations-section__store-content');
    this.selectorWrapper = this.section.querySelector('.store-locations-section__selector-wrapper');
    
    this.init();
  }
  init() {
    if (this.buttons.length === 0 || this.contentPanels.length === 0) return;
    this.ensureFirstLocationActive();
    this.buttons.forEach(button => {
      button.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const locationId = button.getAttribute('data-location-id');
        if (locationId) {
          this.switchLocation(locationId, button);
        }
      });
    });
  }

  ensureFirstLocationActive() {
    const hasActiveButton = Array.from(this.buttons).some(btn => btn.classList.contains('active'));
    const hasActiveContent = Array.from(this.contentPanels).some(panel => panel.classList.contains('active'));
    
    if (!hasActiveButton && this.buttons.length > 0) {
      this.buttons[0].classList.add('active');
    }
    if (!hasActiveContent && this.contentPanels.length > 0) {
      this.contentPanels[0].classList.add('active');
    }
    if (this.buttons.length > 0) {
      const firstButton = this.buttons[0];
      if (firstButton.classList.contains('active')) {
        firstButton.offsetHeight;
      }
    }
  }

  switchLocation(locationId, activeButton) {
    if (!locationId) return;
    const currentActivePanel = this.section.querySelector('.store-locations-section__store-content.active');
    const targetPanel = this.section.querySelector(`[data-location-content="${locationId}"]`);
    if (currentActivePanel === targetPanel) return;
    this.buttons.forEach(btn => btn.classList.remove('active'));
    if (activeButton) {
      activeButton.classList.add('active');
      this.scrollButtonIntoView(activeButton);
      activeButton.offsetHeight;
    }
    const currentIndex = currentActivePanel ? Array.from(this.contentPanels).indexOf(currentActivePanel) : 0;
    const targetIndex = targetPanel ? Array.from(this.contentPanels).indexOf(targetPanel) : 0;
    const slideRight = targetIndex > currentIndex;
    if (currentActivePanel && targetPanel) {
      this.contentPanels.forEach(panel => {
        panel.classList.remove('active', 'sliding-out', 'sliding-in');
      });
      currentActivePanel.classList.add('sliding-out');
      currentActivePanel.classList.remove('active');
      targetPanel.classList.add('sliding-in');
      requestAnimationFrame(() => {
        targetPanel.classList.add('active');
      });
      setTimeout(() => {
        this.contentPanels.forEach(panel => {
          panel.classList.remove('sliding-out', 'sliding-in');
        });
        this.contentPanels.forEach(panel => {
          panel.classList.remove('active');
        });
        targetPanel.classList.add('active');
      }, 500);
    } else if (targetPanel) {
      this.contentPanels.forEach(panel => {
        panel.classList.remove('active', 'sliding-out', 'sliding-in');
      });
      targetPanel.classList.add('active');
    }
  }
  scrollButtonIntoView(button) {
    if (!this.selectorWrapper || !button) return;
    const wrapperRect = this.selectorWrapper.getBoundingClientRect();
    const buttonRect = button.getBoundingClientRect();
    const scrollLeft = this.selectorWrapper.scrollLeft;
    const buttonLeft = buttonRect.left - wrapperRect.left + scrollLeft;
    const buttonRight = buttonLeft + buttonRect.width;
    const wrapperWidth = wrapperRect.width;
    const currentScroll = scrollLeft;
    if (buttonLeft < currentScroll) {
      this.selectorWrapper.scrollTo({
        left: buttonLeft - 20,
        behavior: 'smooth'
      });
    } else if (buttonRight > currentScroll + wrapperWidth) {
      this.selectorWrapper.scrollTo({
        left: buttonRight - wrapperWidth + 20,
        behavior: 'smooth'
      });
    }
  }
}
function initStoreLocations() {
  const sections = document.querySelectorAll('.store-locations-section');
  sections.forEach(section => {
    const sectionId = section.getAttribute('data-section-id');
    if (sectionId) {
      new StoreLocations(sectionId);
    }
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initStoreLocations);
} else {
  initStoreLocations();
}
if (typeof Shopify !== 'undefined' && Shopify.designMode) {
  document.addEventListener('shopify:section:load', (event) => {
    const sectionElement = event.target.querySelector('.store-locations-section');
    if (sectionElement) {
      const sectionId = sectionElement.getAttribute('data-section-id');
      if (sectionId) {
        new StoreLocations(sectionId);
      }
    }
  });
  document.addEventListener('shopify:section:select', (event) => {
    const sectionElement = event.target.querySelector('.store-locations-section');
    if (sectionElement) {
      const sectionId = sectionElement.getAttribute('data-section-id');
      if (sectionId) {
        new StoreLocations(sectionId);
      }
    }
  });
}