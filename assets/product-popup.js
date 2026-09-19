(function () {
  'use strict';
  let lastToastMessage = null;
  let lastToastTime = 0;
  const TOAST_DEBOUNCE_MS = 500;
  function showToast(message, type = 'success') {
    const now = Date.now();
    if (lastToastMessage === message && (now - lastToastTime) < TOAST_DEBOUNCE_MS) {
      return;
    }
    lastToastMessage = message;
    lastToastTime = now;
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    const successIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="https://www.w3.org/2000/svg">
      <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM8 15L3 10L4.41 8.59L8 12.17L15.59 4.58L17 6L8 15Z" fill="currentColor"/>
    </svg>`;
    const errorIcon = `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="https://www.w3.org/2000/svg">
      <path d="M10 0C4.48 0 0 4.48 0 10C0 15.52 4.48 20 10 20C15.52 20 20 15.52 20 10C20 4.48 15.52 0 10 0ZM11 15H9V13H11V15ZM11 11H9V5H11V11Z" fill="currentColor"/>
    </svg>`;
    const closeIcon = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="https://www.w3.org/2000/svg">
      <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>`;

    const icon = type === 'success' ? successIcon : errorIcon;

    toast.innerHTML = `
      <div class="toast__icon">${icon}</div>
      <div class="toast__content">${message}</div>
      <button class="toast__close" aria-label="Close">
        ${closeIcon}
      </button>
    `;
    container.appendChild(toast);
    const closeBtn = toast.querySelector('.toast__close');
    const closeToast = () => {
      toast.classList.add('toast--exiting');
      setTimeout(() => {
        if (toast.parentNode) {
          toast.parentNode.removeChild(toast);
        }
      }, 300);
    };

    closeBtn.addEventListener('click', closeToast);
    setTimeout(closeToast, 4000);
  }
  window.showToast = showToast;
  class ProductPopup {
    constructor() {
      this.currentPopup = null;
      this.isMobile = window.innerWidth <= 768;
      this.wishlistInstance = null;
      this.init();
      this.handleResize();
    }

    init() {
      document.addEventListener('click', (e) => {
        // Ignore clicks on quick view buttons to avoid conflict with AJAX quick view system
        if (e.target.closest('.quick-view-btn') || e.target.closest('.wishlist-card__action-btn--quick-view')) return;

        const productCard = e.target.closest('[data-product-card]');
        if (productCard) {
          e.preventDefault();
          const productId = productCard.dataset.productId;
          this.openPopup(productId);
        }
      });
      document.addEventListener('click', (e) => {
        const shopNowBtn = e.target.closest('[data-shop-now]');
        if (shopNowBtn) {
          e.preventDefault();
          const productId = shopNowBtn.dataset.productId;
          this.openNestedPopup(productId);
        }
      });
      document.addEventListener('click', (e) => {
        const viewDetailsBtn = e.target.closest('[data-view-details]');
        if (viewDetailsBtn) {
          this.closePopup();
        }
      });
      document.addEventListener('click', (e) => {
        if (e.target.closest('[data-popup-close]')) {
          this.closePopup();
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.currentPopup) {
          this.closePopup();
        }
      });
    }
    handleResize() {
      window.addEventListener('resize', () => {
        this.isMobile = window.innerWidth <= 768;
      });
    }
    openPopup(productId, productCard = null) {
      if (this.currentPopup) {
        this.closePopup();
      }
      if (this.isMobile) {
        const mobileFirstPopup = document.getElementById(`product-popup-mobile-first-${productId}`);
        if (!mobileFirstPopup) {
          return;
        }
        this.currentPopup = mobileFirstPopup;
        mobileFirstPopup.classList.add('is-open');
      } else {
        const desktopPopup = document.getElementById(`product-popup-${productId}`);
        if (!desktopPopup) {
          return;
        }
        this.currentPopup = desktopPopup;
        desktopPopup.classList.add('is-open');
      }
      this.updateWishlistButtonStates();
      const closeButton = this.currentPopup.querySelector('.product-popup__close');
      if (closeButton) {
        closeButton.focus();
      }
    }
    openNestedPopup(productId) {
      if (this.currentPopup) {
        this.currentPopup.classList.remove('is-open');
      }
      const nestedPopup = document.getElementById(`product-popup-mobile-nested-${productId}`);
      if (!nestedPopup) {
        return;
      }
      this.currentPopup = nestedPopup;
      nestedPopup.classList.add('is-open');
      this.updateWishlistButtonStates();
      const closeButton = nestedPopup.querySelector('.product-popup__close');
      if (closeButton) {
        closeButton.focus();
      }
    }
    closePopup() {
      if (this.currentPopup) {
        this.currentPopup.classList.remove('is-open');
        this.currentPopup = null;
      }
    }
    updateWishlistButtonStates() {
      try {
        const stored = localStorage.getItem('shopify_wishlist');
        const wishlist = stored ? JSON.parse(stored) : [];
        if (this.currentPopup) {
          const buttons = this.currentPopup.querySelectorAll('[data-wishlist-button]');
          buttons.forEach(button => {
            const productHandle = button.dataset.productHandle;
            if (productHandle && wishlist.includes(productHandle)) {
              button.classList.add('is-active');
            } else {
              button.classList.remove('is-active');
            }
          });
        }
      } catch (error) {
      }
    }
  }

  if (!window._wishlistListenerAttached) {
    window._wishlistListenerAttached = false;
  }
  class Wishlist {
    constructor() {
      this.storageKey = 'shopify_wishlist';
      this.wishlist = this.loadWishlist();
      this.init();
    }

    init() {
      if (window._wishlistListenerAttached) {
        this.updateButtonStates();
        return;
      }
      window._wishlistListenerAttached = true;
      document.addEventListener('click', (e) => {
        const button = e.target.closest('[data-wishlist-button]');
        if (!button) return;

        e.preventDefault();
        e.stopPropagation();
        const wishlistHandler = window.wishlistInstance || this;
        wishlistHandler.toggleWishlist(button);
      });
      this.updateButtonStates();
    }
    loadWishlist() {
      try {
        const stored = localStorage.getItem(this.storageKey);
        return stored ? JSON.parse(stored) : [];
      } catch (error) {
        return [];
      }
    }

    saveWishlist() {
      try {
        localStorage.setItem(this.storageKey, JSON.stringify(this.wishlist));
        if (window.wishlistManager && typeof window.wishlistManager.updateWishlistCount === 'function') {
          window.wishlistManager.updateWishlistCount();
        }
        document.dispatchEvent(new CustomEvent('wishlist:updated'));
      } catch (error) {
      }
    }

    toggleWishlist(button) {
      const productHandle = button.dataset.productHandle;
      const productId = button.dataset.productId;
      if (!productHandle) {
        return;
      }
      const index = this.wishlist.indexOf(productHandle);
      const isAdding = index === -1;

      if (index > -1) {
        this.wishlist.splice(index, 1);
      } else {
        this.wishlist.push(productHandle);
      }
      const allButtons = document.querySelectorAll(`[data-wishlist-button][data-product-handle="${productHandle}"]`);
      allButtons.forEach(btn => {
        if (isAdding) {
          btn.classList.add('is-active');
        } else {
          btn.classList.remove('is-active');
        }
      });

      this.saveWishlist();
      if (typeof window.showToast === 'function') {
        const message = isAdding
          ? 'Product added to wishlist'
          : 'Product removed from wishlist';
        window.showToast(message, isAdding ? 'success' : 'error');
      }

      // Update attributes for all matching buttons
      allButtons.forEach(btn => {
        const title = isAdding ? 'Remove from wishlist' : 'Add to wishlist';
        btn.setAttribute('title', title);
        btn.setAttribute('aria-label', title);
      });

      document.dispatchEvent(new CustomEvent('wishlist:updated', {
        detail: { productId, productHandle, isInWishlist: isAdding }
      }));
    }
    updateButtonStates() {
      const wishlist = this.loadWishlist();
      document.querySelectorAll('[data-wishlist-button]').forEach(button => {
        const productHandle = button.dataset.productHandle;
        const isInWishlist = productHandle && wishlist.includes(productHandle);
        const title = isInWishlist ? 'Remove from wishlist' : 'Add to wishlist';
        
        if (isInWishlist) {
          button.classList.add('is-active');
        } else {
          button.classList.remove('is-active');
        }
        
        button.setAttribute('title', title);
        button.setAttribute('aria-label', title);
      });
    }
    isInWishlist(productHandle) {
      return this.wishlist.includes(productHandle);
    }
  }
  let productPopupInstance, wishlistInstance;
  function initializeWishlistSystem() {
    if (!window.wishlistInstance) {
      wishlistInstance = new Wishlist();
      window.wishlistInstance = wishlistInstance;
    }
    if (window.wishlistInstance && window.wishlistInstance.updateButtonStates) {
      window.wishlistInstance.updateButtonStates();
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      productPopupInstance = new ProductPopup();
      window.productPopupInstance = productPopupInstance;
      initializeWishlistSystem();
    });
  } else {
    productPopupInstance = new ProductPopup();
    window.productPopupInstance = productPopupInstance;
    initializeWishlistSystem();
  }
  if (typeof Shopify !== 'undefined' && Shopify.designMode) {
    document.addEventListener('shopify:section:load', () => {
      initializeWishlistSystem();
    });
  }
  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
      let hasNewButtons = false;
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === 1) {
            if (node.matches && node.matches('[data-wishlist-button]')) {
              hasNewButtons = true;
            }
            if (node.querySelector && node.querySelector('[data-wishlist-button]')) {
              hasNewButtons = true;
            }
          }
        });
      });
      if (hasNewButtons && window.wishlistInstance && window.wishlistInstance.updateButtonStates) {
        window.wishlistInstance.updateButtonStates();
      }
    });
    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true
      });
    } else {
      document.addEventListener('DOMContentLoaded', () => {
        observer.observe(document.body, {
          childList: true,
          subtree: true
        });
      });
    }
  }
})();

