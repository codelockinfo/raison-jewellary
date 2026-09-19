document.addEventListener('DOMContentLoaded', () => {
  // Variant Selection Logic (PDP)
  const variants = window.__PRODUCT_VARIANTS__ || [];
  const variantInput = document.querySelector('[data-variant-input]');
  
  function getSelectedOptions(form) {
    return Array.from(form.querySelectorAll('.variant-group'))
      .map(group => {
        const checked = group.querySelector('input:checked');
        return checked ? checked.value : null;
      });
  }

  function updateVariant(e) {
    const form = e ? e.target.closest('form') : document.querySelector('#product-form');
    if (!form || !form.querySelector('.variant-group')) return;

    const selected = getSelectedOptions(form);
    const match = variants.find(v =>
      v.options.every((opt, i) => opt === selected[i])
    );

    const addToCartButtons = form.querySelectorAll('[data-add-to-cart]');
    
    if (!match) {
        addToCartButtons.forEach(btn => {
            btn.disabled = true;
            btn.setAttribute('aria-disabled', 'true');
            const text = btn.querySelector('.add-to-cart-button__text');
            if(text) text.textContent = 'Unavailable';
        });
        return;
    }

    const variantInput = form.querySelector('[data-variant-input]');
    if (variantInput) variantInput.value = match.id;
    
    addToCartButtons.forEach(btn => {
      btn.dataset.variantId = match.id;
      btn.dataset.inventoryQuantity = match.inventory_quantity;
      btn.dataset.inventoryPolicy = match.inventory_policy;
      btn.dataset.inventoryManagement = match.inventory_management;
      
      btn.disabled = !match.available;
      if (match.available) btn.removeAttribute('aria-disabled');
      else btn.setAttribute('aria-disabled', 'true');

      const text = btn.querySelector('.add-to-cart-button__text');
      if (text) {
          text.textContent = match.available ? (btn.dataset.originalText || 'Add to Cart') : 'Sold Out';
      }
    });

    // Also update price if we are on a form with price elements
    const priceContainer = form.querySelector('.m-price');
    if (priceContainer && typeof window.formatMoney === 'function') {
        // Note: product.liquid has its own robust price update. 
        // We let it handle it there, but here we provide a basic update for other forms.
    }
  }

  document
    .querySelectorAll('.variant-group input')
    .forEach(input => input.addEventListener('change', updateVariant));
    
  // Initialize button text storage
  document.querySelectorAll('[data-add-to-cart]').forEach(btn => {
      const text = btn.querySelector('.add-to-cart-button__text');
      if(text) btn.dataset.originalText = text.textContent.trim();
  });


  // Toast Notification Helper (window scope for accessibility by other scripts)
  window.showToast = function(message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
      container = document.createElement('div');
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    // Remove existing toasts to prevent stacking overload
    const existing = container.querySelector('.toast');
    if(existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = `toast toast--${type}`;
    
    const icon = type === 'success' 
      ? '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd"/></svg>'
      : '<svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd"/></svg>';

    toast.innerHTML = `
      <div class="toast__icon">${icon}</div>
      <div class="toast__content">${message}</div>
      <button class="toast__close" aria-label="Close">
        <svg viewBox="0 0 20 20" fill="currentColor"><path fill-rule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clip-rule="evenodd"/></svg>
      </button>
    `;

    const closeBtn = toast.querySelector('.toast__close');
    closeBtn.addEventListener('click', () => toast.remove());
    container.appendChild(toast);

    setTimeout(() => {
      if (document.body.contains(toast)) toast.remove();
    }, 5000);
  };

  // Centralized Add to Cart Logic
  document.addEventListener('click', async (e) => {
    const btn = e.target.closest('[data-add-to-cart]');
    if (!btn) return;
    
    e.preventDefault();
    if (btn.disabled || btn.classList.contains('is-loading')) return;

    const variantId = btn.dataset.variantId;
    
    // Find Quantity
    let quantity = 1;
    // 1. Try closest form or popup for quantity input
    const container = btn.closest('.product-form, .quick-view-popup__scrollable-content, .quick-view-popup__details-content, .product-popup, form');
    if (container) {
        const qtyInput = container.querySelector('[name="quantity"], [data-quantity-input]');
        if (qtyInput) quantity = parseInt(qtyInput.value) || 1;
    }
    
    // Inventory Validation
    const policy = btn.dataset.inventoryPolicy;
    const management = btn.dataset.inventoryManagement;
    const stock = parseInt(btn.dataset.inventoryQuantity);
    
    if (management === 'shopify' && policy === 'deny' && !isNaN(stock)) {
        if (quantity > stock) {
            window.showToast(`Cannot add ${quantity} items. Only ${stock} left in stock.`, 'error');
            return;
        }
    }

    // Proceed to Add
    btn.classList.add('is-loading');
    const textEl = btn.querySelector('.add-to-cart-button__text');
    const loadingEl = btn.querySelector('.add-to-cart-button__loading');
    const originalText = textEl ? textEl.innerText : 'Add To Cart';
    
    if (textEl) textEl.innerText = 'Adding...';
    if (loadingEl) loadingEl.style.display = 'block';

    try {
      const response = await fetch('/cart/add.js', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: [{ id: variantId, quantity: quantity }] })
      });

      const body = await response.json();

      if (!response.ok) {
        throw new Error(body.description || body.message || 'Error adding to cart');
      }

      // Success
      if (textEl) textEl.innerText = 'Added!';

      // Close any open product popup or quick view popup
      if (window.productPopupInstance && typeof window.productPopupInstance.closePopup === 'function') {
        window.productPopupInstance.closePopup();
      }
      if (window.quickViewPopup && typeof window.quickViewPopup.closePopup === 'function') {
        window.quickViewPopup.closePopup();
      }
      
      // Refresh Cart
      document.dispatchEvent(new CustomEvent('cart:refresh'));
      const enableCartDrawer = window.__ENABLE_CART_DRAWER__;
      const isCartPage = window.__TEMPLATE_NAME__ === 'cart';
      if (enableCartDrawer && !isCartPage) {
        document.dispatchEvent(new CustomEvent('cart:open'));
         if (window.cartDrawer && typeof window.cartDrawer.open === 'function') {
            window.cartDrawer.open();
          }
      } else {
         window.location.href = '/cart';
      }

    } catch (error) {
       window.showToast(error.message, 'error');
    } finally {
       setTimeout(() => {
         btn.classList.remove('is-loading');
         if (textEl) textEl.innerText = originalText;
         if (loadingEl) loadingEl.style.display = 'none';
       }, 2000);
    }
  });

  // Close product-popup and quick-view-popup when "Buy It Now" is clicked
  document.addEventListener('click', (e) => {
    const buyNowBtn = e.target.closest('[data-buy-now]');
    if (!buyNowBtn) return;
    if (window.productPopupInstance && typeof window.productPopupInstance.closePopup === 'function') {
      window.productPopupInstance.closePopup();
    }
    if (window.quickViewPopup && typeof window.quickViewPopup.closePopup === 'function') {
      window.quickViewPopup.closePopup();
    }
  });

  // Show toast if customer just posted a form (newsletter or contact)
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('customer_posted') === 'true' || window.location.hash === '#contact_form') {
    const isNewsletter = document.querySelector('.newsletter-form, .footer-newsletter, [name="contact[tags]"][value="newsletter"]');
    if (isNewsletter) {
      if (typeof window.showToast === 'function') {
        window.showToast("Thanks for subscribing !", 'success');
      }
      
      // Clean up URL parameter to prevent re-triggering on refresh
      const url = new URL(window.location.href);
      if (url.searchParams.get('customer_posted') === 'true') {
        url.searchParams.delete('customer_posted');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    }
  }
  // Terms & Conditions Checkbox logic
  function handleTermsCheckbox() {
    const checkboxes = document.querySelectorAll('[data-terms-checkbox]');
    
    checkboxes.forEach(checkbox => {
      const container = checkbox.closest('form, .cart-drawer, .quick-view-popup, .product-details-info, .cart_box') || document;
      
      const buttons = container.querySelectorAll([
        '.shopify-payment-button',
        '[name="checkout"]',
        '[data-checkout-btn]',
        '.quick-view-popup__buy-now-btn',
        '.checkout-btn-heavy',
        '.sidebar-btn--primary[name="checkout"]',
        '[data-buy-now]'
      ].join(','));

      const updateButtons = () => {
        const isChecked = checkbox.checked;
        buttons.forEach(btn => {
          if (isChecked) {
            btn.classList.remove('is-disabled');
            btn.style.opacity = '1';
            btn.setAttribute('aria-disabled', 'false');
          } else {
            btn.classList.add('is-disabled');
            btn.style.opacity = '0.5';
            btn.setAttribute('aria-disabled', 'true');
          }
        });
      };

      if (!checkbox.dataset.listenerAdded) {
        checkbox.addEventListener('change', updateButtons);
        checkbox.dataset.listenerAdded = 'true';
        
        buttons.forEach(btn => {
          if (!btn.dataset.gdprListenerAdded) {
            btn.addEventListener('click', (e) => {
              if (!checkbox.checked) {
                  e.preventDefault();
                  e.stopPropagation();
                  if (typeof window.showToast === 'function') {
                      window.showToast('Please agree to the Terms & Conditions to proceed.', 'error');
                  }
              }
            }, true);
            btn.dataset.gdprListenerAdded = 'true';
          }
        });
      }

      updateButtons();
    });
  }

  handleTermsCheckbox();

  document.addEventListener('cart:refresh', () => setTimeout(handleTermsCheckbox, 500));
  document.addEventListener('cart:updated', () => setTimeout(handleTermsCheckbox, 500));
  document.addEventListener('quickview:opened', () => setTimeout(handleTermsCheckbox, 100));

  // Periodic check for dynamically loaded buttons (like Shopify Payment buttons)
  setInterval(handleTermsCheckbox, 2000);

  // Smooth Collapsible / Accordion Logic
  class SmoothCollapsible {
    constructor(el) {
      if (el.tagName === 'DETAILS') {
        this.initDetails(el);
      } else {
        this.initCustom(el);
      }
    }

    initDetails(el) {
      const summary = el.querySelector('summary');
      const content = el.querySelector('.smooth-collapsible');
      if (!summary || !content) return;

      summary.addEventListener('click', (e) => {
        e.preventDefault();
        if (el.hasAttribute('open')) {
          this.closeDetails(el, content);
        } else {
          this.openDetails(el, content);
        }
      });
    }

    openDetails(el, content) {
      // Set open so the element renders in the DOM (grid rows = 0fr),
      // but do NOT add .active yet — let browser paint the 0fr baseline first.
      el.setAttribute('open', '');
      el.classList.add('is-opening');
      el.style.overflow = 'hidden';

      // Double RAF: first frame registers the open+0fr state,
      // second frame triggers the transition to 1fr.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          content.classList.add('active');
        });
      });

      let transitionDone = false;
      const onEnd = (e) => {
        if (transitionDone) return;
        if (!e || e.propertyName === 'grid-template-rows') {
          transitionDone = true;
          el.style.overflow = '';
          el.classList.remove('is-opening');
          content.removeEventListener('transitionend', onEnd);
        }
      };
      content.addEventListener('transitionend', onEnd);
      // Fallback
      setTimeout(() => onEnd(), 600);
    }

    closeDetails(el, content) {
      // Immediately lock overflow so content stays visible during transition
      el.style.overflow = 'hidden';

      // Remove [open] now — while content is still at 1fr.
      // overflow:hidden prevents any flash. The grid transition will
      // then animate it to 0fr cleanly with no end-of-animation stutter.
      el.removeAttribute('open');

      // Trigger the grid transition 1fr → 0fr
      content.classList.remove('active');

      let transitionDone = false;
      const cleanup = (e) => {
        if (transitionDone) return;
        if (!e || e.propertyName === 'grid-template-rows') {
          transitionDone = true;
          el.style.overflow = '';
          content.removeEventListener('transitionend', cleanup);
        }
      };
      content.addEventListener('transitionend', cleanup);
      // Fallback — slightly longer than the 0.4s CSS transition
      setTimeout(() => cleanup(), 500);
    }

    initCustom(el) {
      const trigger = el.querySelector('.collapsible-trigger');
      const content = el.querySelector('.smooth-collapsible');
      if (!trigger || !content) return;

      trigger.addEventListener('click', () => {
        const isExpanded = trigger.getAttribute('aria-expanded') === 'true';
        trigger.setAttribute('aria-expanded', !isExpanded);
        content.classList.toggle('active');
      });
    }
  }

  // Initialize all smooth details
  function initSmoothCollapsibles() {
    document.querySelectorAll('details.smooth-details:not([data-smooth-init])').forEach(el => {
      new SmoothCollapsible(el);
      el.dataset.smoothInit = 'true';
    });
  }

  initSmoothCollapsibles();
  // Re-run on dynamic updates
  document.addEventListener('shopify:section:load', initSmoothCollapsibles);
});


// Fail-safe: Ensure discount codes are cleared once the user removes them
(function() {
  const checkCleared = () => {
    if (localStorage.getItem('cart_discount_cleared') === 'true' || localStorage.getItem('cart_discount_clearing') === 'true') {
      // Clear from all links and forms
      document.querySelectorAll('a[href*="discount="], form[action*="discount="]').forEach(el => {
        try {
          const attr = el.tagName === 'A' ? 'href' : 'action';
          const url = new URL(el.getAttribute(attr), window.location.origin);
          if (url.searchParams.has('discount')) {
            url.searchParams.delete('discount');
            el.setAttribute(attr, url.pathname + url.search);
          }
        } catch(e) {}
      });
      
      // Also prevent re-applying from URL
      if (window.location.search.includes('discount=')) {
        const url = new URL(window.location.href);
        url.searchParams.delete('discount');
        window.history.replaceState({}, '', url.pathname + url.search);
      }
    }
  };
  
  checkCleared();
  document.addEventListener('DOMContentLoaded', checkCleared);
  document.addEventListener('cart:updated', checkCleared);
  
  // Intercept checkout form submits to ensure no discount is sent if cleared
  document.addEventListener('submit', (e) => {
    const form = e.target;
    if (form.getAttribute('action') === '/cart' || form.querySelector('[name="checkout"]')) {
      if (localStorage.getItem('cart_discount_cleared') === 'true' || localStorage.getItem('cart_discount_clearing') === 'true') {
        // Add a hidden input to force-clear the discount at checkout
        let discInput = form.querySelector('input[name="discount"]');
        if (!discInput) {
          discInput = document.createElement('input');
          discInput.type = 'hidden';
          discInput.name = 'discount';
          form.appendChild(discInput);
        }
        discInput.value = ''; 
      }
    }
  });
})();

// Footer Menu Toggles for Mobile
document.addEventListener('click', function (e) {
  if (window.innerWidth > 900) return;

  const title = e.target.closest('.footer-menu-title');
  if (title) {
    const col = title.closest('.footer-col');
    if (col) {
      col.classList.toggle('active');
    }
  }
});
// Global function to update product card image via swatches (Collection Page)
window.updateProductCardImage = function(swatch) {
  const newImage = swatch.getAttribute('data-variant-image');
  const hoverImage = swatch.getAttribute('data-variant-hover-image');
  const variantId = swatch.getAttribute('data-variant-id');
  const variantPrice = swatch.getAttribute('data-variant-price');
  const variantComparePrice = swatch.getAttribute('data-variant-compare-price');
  const variantAvailable = swatch.getAttribute('data-variant-available') === 'true';

  if (!newImage || newImage === '') return;
  
  const card = swatch.closest('.image-collection-new');
  if (!card) return;
  
  // Update images
  const mainImg = card.querySelector('.main-img');
  if (mainImg) {
    mainImg.src = newImage;
    if (mainImg.srcset) mainImg.srcset = '';
  }

  const hoverImg = card.querySelector('.hover-image');
  if (hoverImg) {
    if (hoverImage && hoverImage !== '') {
      hoverImg.src = hoverImage;
    } else {
      hoverImg.src = newImage;
    }
    if (hoverImg.srcset) hoverImg.srcset = '';
  }

  // Prices will not be updated as per user request to only change images

  // Update variant ID in form and button
  const variantInput = card.querySelector('input[name="id"]');
  if (variantInput) variantInput.value = variantId;

  const atcBtn = card.querySelector('[data-add-to-cart]');
  if (atcBtn) {
    atcBtn.dataset.variantId = variantId;
    if (variantAvailable) {
      atcBtn.disabled = false;
      atcBtn.classList.remove('is-out-of-stock');
      atcBtn.setAttribute('aria-label', 'Add to cart'); 
      atcBtn.title = 'Add to cart';
    } else {
      atcBtn.disabled = true;
      atcBtn.classList.add('is-out-of-stock');
      atcBtn.setAttribute('aria-label', 'Sold Out');
      atcBtn.title = 'Sold Out';
    }
  }
  
  // Update active state
  const parent = swatch.parentElement;
  if (parent) {
    parent.querySelectorAll('.featured-product-section__color-swatch').forEach(s => s.classList.remove('active'));
    swatch.classList.add('active');
  }
};
