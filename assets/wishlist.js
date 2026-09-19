
class WishlistManager {
  constructor() {
    this.storageKey = 'shopify_wishlist';
    this.wishlistContainer = document.querySelector('[data-wishlist-container]');
    this.wishlistGrid = document.querySelector('[data-wishlist-grid]');
    this.wishlistEmpty = document.querySelector('[data-wishlist-empty]');
    this.init();
  }
  init() {
    this.migrateWishlistData();
    this.loadWishlist();
    this.attachEventListeners();
    this.updateWishlistCount();
  }
  migrateWishlistData() {
    const items = this.getWishlistItems();
    if (!items || items.length === 0) return;
    const hasNumericIds = items.some(item => /^\d+$/.test(String(item)));

    if (hasNumericIds) {
      const validHandles = items.filter(item => !/^\d+$/.test(String(item)));
      if (validHandles.length !== items.length) {
        this.saveWishlistItems(validHandles);
      }
    }
  }
  getWishlistItems() {
    try {
      const items = localStorage.getItem(this.storageKey);
      return items ? JSON.parse(items) : [];
    } catch (e) {
      return [];
    }
  }
  saveWishlistItems(items) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
      this.updateWishlistCount();
    } catch (e) {
      return;
    }
  }
  addToWishlist(productHandle) {
    const items = this.getWishlistItems();
    const productHandleStr = String(productHandle);
    if (!items.includes(productHandleStr)) {
      items.push(productHandleStr);
      this.saveWishlistItems(items);
      this.loadWishlist();
    }
  }
  removeFromWishlist(productHandle, showToast = false) {
    const items = this.getWishlistItems();
    const productHandleStr = String(productHandle);
    const filteredItems = items.filter(handle => String(handle) !== productHandleStr);
    this.saveWishlistItems(filteredItems);
    this.loadWishlist();
    if (showToast && typeof window.showToast === 'function') {
      window.showToast('Product removed from wishlist', 'error');
    }
  }
  isInWishlist(productHandle) {
    const items = this.getWishlistItems();
    const productHandleStr = String(productHandle);
    return items.some(handle => String(handle) === productHandleStr);
  }
  async loadWishlist() {
    const productHandles = this.getWishlistItems();
    if (productHandles.length === 0) {
      this.showEmptyState();
      return;
    }
    this.hideEmptyState();

    try {
      const products = await this.fetchProducts(productHandles);

      if (products.length === 0) {
        this.showEmptyState();
      } else {
        this.renderProducts(products);
      }
    } catch (error) {
      this.showEmptyState();
    }
  }
  async fetchProducts(productHandles) {
    if (!productHandles || productHandles.length === 0) {
      return [];
    }


    const promises = productHandles.map(handle => {
      if (/^\d+$/.test(String(handle))) {
        return Promise.resolve(null);
      }
      const fetchUrl = `/products/${handle}.js`;
      return fetch(fetchUrl)
        .then(response => {
          if (!response.ok) {
            throw new Error(`Product ${handle} not found (${response.status})`);
          }
          return response.json();
        })
        .catch(error => {
          return null;
        });
    });

    const results = await Promise.all(promises);
    const validProducts = results.filter(product => product !== null);

    if (validProducts.length < productHandles.length) {
      const failedCount = productHandles.length - validProducts.length;
    }

    return validProducts;
  }
  renderProducts(products) {
    if (!this.wishlistGrid) return;

    if (products.length === 0) {
      this.showEmptyState();
      return;
    }
    this.wishlistGrid.innerHTML = '';
    this.wishlistGrid.style.display = 'grid';

    products.forEach(product => {
      const card = this.createProductCard(product);
      this.wishlistGrid.appendChild(card);
    });
    if (window.compareManager && window.compareManager.updateButtonStates) {
      window.compareManager.updateButtonStates();
    }
  }
  createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'wishlist-card';
    card.setAttribute('data-wishlist-item', '');
    card.setAttribute('data-product-id', product.id);
    card.setAttribute('data-product-handle', product.handle);
    const rating = product.metafields?.reviews?.rating?.value || 5;
    const ratingValue = Math.round(parseFloat(rating));
    const price = this.formatMoney(product.price);
    const comparePrice = product.compare_at_price ? this.formatMoney(product.compare_at_price) : null;

    const starsHtml = Array.from({ length: 5 }, (_, i) => {
      const filled = i < ratingValue;
      return `
        <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="https://www.w3.org/2000/svg">
          <path d="M10 1L12.09 7.26L19 8.27L14 12.14L15.18 19.02L10 15.77L4.82 19.02L6 12.14L1 8.27L7.91 7.26L10 1Z" 
            fill="${filled ? '#FFD700' : '#E0E0E0'}" 
            stroke="${filled ? '#FFD700' : '#E0E0E0'}" 
            stroke-width="1"/>
        </svg>
      `;
    }).join('');
    const firstImage = product.featured_image || (product.images && product.images[0]) || '';
    const secondImage = (product.images && product.images[1]) || firstImage;
    let imageHtml = '';
    if (firstImage) {
      const firstImageUrl = typeof firstImage === 'string' ? firstImage : (firstImage.src || firstImage);
      const secondImageUrl = typeof secondImage === 'string' ? secondImage : (secondImage.src || secondImage);
      const hasSecondImage = firstImageUrl !== secondImageUrl;
      imageHtml = `
        <img src="${firstImageUrl}" alt="${this.escapeHtml(product.title)}" class="wishlist-card__image wishlist-card__image--primary" loading="lazy">
        ${hasSecondImage ? `<img src="${secondImageUrl}" alt="${this.escapeHtml(product.title)}" class="wishlist-card__image wishlist-card__image--secondary" loading="lazy">` : ''}
      `;
    } else {
      imageHtml = `<div class="wishlist-card__image-placeholder">${this.getPlaceholderSvg()}</div>`;
    }
    let firstVariant = null;
    if (product.selected_or_first_available_variant) {
      firstVariant = product.selected_or_first_available_variant;
    } else if (product.variants && product.variants.length > 0) {
      firstVariant = product.variants.find(v => v.available) || product.variants[0];
    }
    const variantId = firstVariant ? firstVariant.id : '';
    const isAvailable = firstVariant && firstVariant.available !== false;
    card.innerHTML = `
      <button 
        class="wishlist-card__remove" 
        type="button"
        aria-label="Remove from wishlist"
        data-remove-wishlist-item
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="https://www.w3.org/2000/svg">
          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="wishlist-card__image-container">
        <a href="${product.url}" class="wishlist-card__image-wrapper">
          ${imageHtml}
        </a>
        <div class="wishlist-card__hover-actions">
          <button 
            type="button"
            class="wishlist-card__action-btn wishlist-card__action-btn--quick-view"
            data-product-id="${product.id}"
            aria-label="Quick view ${this.escapeHtml(product.title)}"
            title="Quick view"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="https://www.w3.org/2000/svg">
              <path d="M10 4C6 4 2.73 6.61 1 10C2.73 13.39 6 16 10 16C14 16 17.27 13.39 19 10C17.27 6.61 14 4 10 4ZM10 14C7.79 14 6 12.21 6 10C6 7.79 7.79 6 10 6C12.21 6 14 7.79 14 10C14 12.21 12.21 14 10 14ZM10 8C8.9 8 8 8.9 8 10C8 11.1 8.9 12 10 12C11.1 12 12 11.1 12 10C12 8.9 11.1 8 10 8Z" fill="currentColor"/>
            </svg>
          </button>
          
          ${variantId ? `
          <button 
            type="button"
            class="wishlist-card__action-btn wishlist-card__action-btn--add-to-cart add-to-cart-button"
            data-add-to-cart
            data-product-id="${product.id}"
            data-variant-id="${variantId}"
            ${!isAvailable ? 'disabled' : ''}
            title="${isAvailable ? 'Add to cart' : 'Sold Out'}"
            aria-label="${isAvailable ? 'Add to cart' : 'Sold Out'}"
          >
            <span class="add-to-cart-button__icon">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="https://www.w3.org/2000/svg">
                  <path d="M9 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" fill="currentColor"/>
                  <path d="M20 22a1 1 0 1 0 0-2 1 1 0 0 0 0 2z" fill="currentColor"/>
                  <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" stroke="currentColor" stroke-width="2" fill="none"/>
                </svg>
            </span>
            <span class="add-to-cart-button__loading" style="display: none;">
              <svg width="16" height="16" viewBox="0 0 20 20" fill="none" xmlns="https://www.w3.org/2000/svg">
                <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" stroke-dasharray="32" stroke-dashoffset="32">
                  <animate attributeName="stroke-dasharray" dur="1.5s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                  <animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-16;-32;-32" repeatCount="indefinite"/>
                </circle>
              </svg>
            </span>
          </button>
          ` : ''}
        </div>
      </div>
  <div class="wishlist-card__info">
    <div class="wishlist-card__title">
      <a href="${product.url}">${this.escapeHtml(product.title)}</a>
    </div>
    <div class="wishlist-card__price">
      ${comparePrice && parseFloat(product.compare_at_price) > parseFloat(product.price)
        ? `<span class="wishlist-card__price--sale">${price}</span><span class="wishlist-card__price--compare">${comparePrice}</span>`
        : `<span>${price}</span>`
      }
    </div>
  </div>
`;

    return card;
  }
  formatMoney(cents, format) {
    if (typeof cents === 'string') { cents = cents.replace('.', ''); }
    let value = '';
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const formatString = format || window.Shopify?.money_format || window.Shopify?.shop?.money_format || '${{ amount }}';

    function defaultOption(opt, def) {
      return (typeof opt == 'undefined' ? def : opt);
    }

    function formatWithDelimiters(number, precision, thousands, decimal) {
      precision = defaultOption(precision, 2);
      thousands = defaultOption(thousands, ',');
      decimal = defaultOption(decimal, '.');

      if (isNaN(number) || number == null) { return 0; }

      number = (number / 100.0).toFixed(precision);

      var parts = number.split('.'),
        dollars = parts[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + thousands),
        cents = parts[1] ? (decimal + parts[1]) : '';

      return dollars + cents;
    }

    switch (formatString.match(placeholderRegex)[1]) {
      case 'amount':
        value = formatWithDelimiters(cents, 2);
        break;
      case 'amount_no_decimals':
        value = formatWithDelimiters(cents, 0);
        break;
      case 'amount_with_comma_separator':
        value = formatWithDelimiters(cents, 2, '.', ',');
        break;
      case 'amount_no_decimals_with_comma_separator':
        value = formatWithDelimiters(cents, 0, '.', ',');
        break;
    }

    let formattedValue = formatString.replace(placeholderRegex, value);

    // Apply currency specific replacements
    if (window.Shopify && window.Shopify.currency) {
      if (window.Shopify.currency.active === 'EUR') {
        formattedValue = formattedValue.replace('.', 'TEMP').replace(',', '.').replace('TEMP', ',');
      } else if (window.Shopify.currency.active === 'INR') {
        formattedValue = formattedValue.replace('Rs.', '₹').replace('Rs', '₹').replace('$', '₹');
      }
    }

    return formattedValue;
  }
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
  getPlaceholderSvg() {
    return '<svg viewBox="0 0 525.5 525.5" xmlns="https://www.w3.org/2000/svg"><path d="M324.5 212.5h-123c-5 0-9 4-9 9s4 9 9 9h123c5 0 9-4 9-9s-4-9-9-9zM324.5 262.5h-123c-5 0-9 4-9 9s4 9 9 9h123c5 0 9-4 9-9s-4-9-9-9zM324.5 312.5h-123c-5 0-9 4-9 9s4 9 9 9h123c5 0 9-4 9-9s-4-9-9-9z" fill="#999"/></svg>';
  }
  showEmptyState() {
    if (this.wishlistEmpty) {
      this.wishlistEmpty.style.display = 'block';
    }
    if (this.wishlistGrid) {
      this.wishlistGrid.style.display = 'none';
    }
  }
  hideEmptyState() {
    if (this.wishlistEmpty) {
      this.wishlistEmpty.style.display = 'none';
    }
  }
  updateWishlistCount() {
    const count = this.getWishlistItems().length;
    const countElements = document.querySelectorAll('[data-wishlist-count]');
    countElements.forEach(el => {
      el.textContent = count;
      if (count > 0) {
        el.style.display = 'flex';
      } else {
        el.style.display = 'none';
      }
    });
  }
  attachEventListeners() {
    if (this.wishlistGrid) {
      this.wishlistGrid.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-remove-wishlist-item]');
        if (removeBtn) {
          e.preventDefault();
          const card = removeBtn.closest('[data-wishlist-item]');
          if (card) {
            const productHandle = card.getAttribute('data-product-handle');
            if (productHandle) {
              this.removeFromWishlist(productHandle, true);
            }
          }
        }
      });
    }
    document.addEventListener('wishlist:updated', () => {
      this.loadWishlist();
    });
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeWishlist();
  });
} else {
  initializeWishlist();
}

function initializeWishlist() {
  if (document.querySelector('[data-wishlist-container]')) {
    window.wishlistManager = new WishlistManager();
  } else {
    window.wishlistManager = {
      storageKey: 'shopify_wishlist',
      getWishlistItems() {
        try {
          const items = localStorage.getItem(this.storageKey);
          return items ? JSON.parse(items) : [];
        } catch (e) {
          return [];
        }
      },
      updateWishlistCount() {
        const count = this.getWishlistItems().length;
        const countElements = document.querySelectorAll('[data-wishlist-count]');
        countElements.forEach(el => {
          el.textContent = count;
          el.style.display = count > 0 ? 'flex' : 'none';
        });
      }
    };
    window.wishlistManager.updateWishlistCount();
  }
  document.addEventListener('wishlist:updated', () => {
    if (window.wishlistManager && window.wishlistManager.updateWishlistCount) {
      window.wishlistManager.updateWishlistCount();
    }
  });
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = WishlistManager;
}