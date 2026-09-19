(function () {
  'use strict';
  class QuickViewPopup {
    constructor() {
      this.currentPopup = null;
      this.isMobile = window.innerWidth <= 768;
      this.init();
      this.handleResize();
    }

    init() {
      document.addEventListener('click', (e) => {
        const quickViewBtn = e.target.closest('.wishlist-card__action-btn--quick-view, .quick-view-btn');
        if (quickViewBtn) {
          e.preventDefault();
          const productId = quickViewBtn.dataset.productId;
          const productHandle = quickViewBtn.dataset.productHandle;
          if (productId) {
            this.openQuickView(productId, productHandle);
          }
        }
      });
      document.addEventListener('click', (e) => {
        const minusBtn = e.target.closest('[data-quantity-minus]');
        const plusBtn = e.target.closest('[data-quantity-plus]');
        if (minusBtn || plusBtn) {
          const input = (minusBtn || plusBtn).closest('.quick-view-popup__quantity')?.querySelector('[data-quantity-input]');
          if (input) {
            let value = parseInt(input.value) || 1;
            if (minusBtn && value > 1) {
              value--;
            } else if (plusBtn) {
              value++;
            }
            input.value = value;
            this.updateAddToCartQuantity(input.value);
          }
        }
      });
      document.addEventListener('input', (e) => {
        if (e.target.matches('[data-quantity-input]')) {
          let value = parseInt(e.target.value) || 1;
          if (value < 1) value = 1;
          e.target.value = value;
          this.updateAddToCartQuantity(value);
        }
      });

      document.addEventListener('click', (e) => {
        if (!this.currentPopup) return;

        const popup = this.currentPopup;
        const closeButton = e.target.closest('.quick-view-popup__close');
        if (closeButton && closeButton.closest('.quick-view-popup') === popup) {
          e.preventDefault();
          e.stopPropagation();
          this.closePopup();
          return;
        }
        if (e.target.classList.contains('quick-view-popup__overlay')) {
          if (e.target.closest('.quick-view-popup') === popup) {
            e.preventDefault();
            e.stopPropagation();
            this.closePopup();
            return;
          }
        }
        if (e.target === popup) {
          this.closePopup();
          return;
        }
        const clickedContent = e.target.closest('.quick-view-popup__content');
        if (!clickedContent && popup.contains(e.target)) {
          this.closePopup();
        }
      });
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && this.currentPopup) {
          this.closePopup();
        }
      });
      document.addEventListener('click', (e) => {
        if (e.target.closest('[data-view-details]')) {
          this.closePopup();
        }
      });


    }
    handleResize() {
      window.addEventListener('resize', () => {
        this.isMobile = window.innerWidth <= 768;
      });
    }
    async openQuickView(productId, productHandle = null) {
      try {
        if (this.currentPopup) {
          this.closePopup();
        }
        const product = await this.fetchProduct(productId, productHandle);
        if (!product) {
          return;
        }
        await this.renderPopup(product);
        const popupId = this.isMobile ? `quick-view-popup-mobile-${productId}` : `quick-view-popup-${productId}`;
        const popup = document.getElementById(popupId);

        if (!popup) {
          return;
        }

        this.currentPopup = popup;
        popup.classList.add('is-open');
        this.initImageSlider(popup, product);
        this.updateButtonStates(product);
        const closeButton = popup.querySelector('.quick-view-popup__close');
        if (closeButton) {
          closeButton.focus();
        }
      } catch (error) {
      }
    }

    async fetchProduct(productId, productHandle = null) {
      try {
        let handle = productHandle;

        if (!handle) {
          const card = document.querySelector(`[data-product-id="${productId}"][data-wishlist-item]`);
          handle = card?.getAttribute('data-product-handle');
        }

        if (!handle) {
          return null;
        }
        const response = await fetch(`/products/${handle}.js`);
        if (!response.ok) {
          throw new Error(`Product fetch failed: ${response.status}`);
        }
        return await response.json();
      } catch (error) {
        return null;
      }
    }

    async renderPopup(product) {
      const desktopPopup = document.getElementById(`quick-view-popup-${product.id}`);
      const mobilePopup = document.getElementById(`quick-view-popup-mobile-${product.id}`);

      if (desktopPopup && mobilePopup) {
        this.updatePopupContent(product);
        return;
      }
      this.createPopupHTML(product);
    }

    updatePopupContent(product) {
      const price = this.formatMoney(product.price);
      const comparePrice = product.compare_at_price ? this.formatMoney(product.compare_at_price) : null;

      // Helper to update price in a specific popup
      const updatePriceInPopup = (popupId) => {
        const popup = document.getElementById(popupId);
        if (!popup) return;

        const priceContainer = popup.querySelector('.quick-view-popup__price');
        if (priceContainer) {
          if (comparePrice && parseFloat(product.compare_at_price) > parseFloat(product.price)) {
            priceContainer.innerHTML = `
                        <span class="quick-view-popup__price--sale">${price}</span>
                        <span class="quick-view-popup__price--compare">${comparePrice}</span>
                    `;
          } else {
            priceContainer.innerHTML = `<span>${price}</span>`;
          }
        }
      };

      updatePriceInPopup(`quick-view-popup-${product.id}`);
      updatePriceInPopup(`quick-view-popup-mobile-${product.id}`);
    }

    createPopupHTML(product) {
      const firstVariant = product.selected_or_first_available_variant || (product.variants && product.variants[0]) || null;
      const rating = product.metafields?.reviews?.rating?.value || 5;
      const ratingValue = Math.round(parseFloat(rating));
      const reviewsCount = product.metafields?.reviews?.rating_count?.value || 1;
      const price = this.formatMoney(product.price);
      const comparePrice = product.compare_at_price ? this.formatMoney(product.compare_at_price) : null;
      const imageUrl = product.featured_image || (product.images && product.images[0]) || '';
      const imageSrc = typeof imageUrl === 'string' ? imageUrl : (imageUrl.src || '');
      const starsHtml = Array.from({ length: 5 }, (_, i) => {
        const filled = i < ratingValue;
        return `<svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="https://www.w3.org/2000/svg">
          <path d="M10 1L12.09 7.26L19 8.27L14 12.14L15.18 19.02L10 15.77L4.82 19.02L6 12.14L1 8.27L7.91 7.26L10 1Z" 
            fill="${filled ? '#FFD700' : '#E0E0E0'}" 
            stroke="${filled ? '#FFD700' : '#E0E0E0'}" 
            stroke-width="1"/>
        </svg>`;
      }).join('');
      const desktopPopupHTML = this.createDesktopPopupHTML(product, firstVariant, price, comparePrice, imageSrc, starsHtml, reviewsCount);
      const desktopDiv = document.createElement('div');
      desktopDiv.innerHTML = desktopPopupHTML;
      const desktopPopup = desktopDiv.firstElementChild;
      document.body.appendChild(desktopPopup);
      const mobilePopupHTML = this.createMobilePopupHTML(product, firstVariant, price, comparePrice, imageSrc, starsHtml, reviewsCount);
      const mobileDiv = document.createElement('div');
      mobileDiv.innerHTML = mobilePopupHTML;
      const mobilePopup = mobileDiv.firstElementChild;
      document.body.appendChild(mobilePopup);
    }
    createDesktopPopupHTML(product, firstVariant, price, comparePrice, imageSrc, starsHtml, reviewsCount) {
      const buyNowUrl = firstVariant ? `/cart/add?id=${firstVariant.id}&quantity=1&return_to=/checkout` : '#';
      const description = product.description || '';
      const images = product.images || [];
      const imagesCount = images.length || 1;
      return `
        <div class="quick-view-popup quick-view-popup--desktop" id="quick-view-popup-${product.id}" data-product-id="${product.id}" role="dialog" aria-modal="true" aria-labelledby="quick-view-popup-title-${product.id}" data-quick-view-popup>
          <div class="quick-view-popup__overlay" data-popup-close></div>
          <div class="quick-view-popup__content">
            <div class="quick-view-popup__inner">
              <button class="quick-view-popup__close" data-popup-close aria-label="Close popup">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="https://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <div class="quick-view-popup__image-section">
                ${imageSrc ? `
                  <div class="quick-view-popup__image-wrapper">
                    <img src="${imageSrc}" alt="${this.escapeHtml(product.title)}" class="quick-view-popup__image" loading="lazy">
                  </div>
                ` : `
                  <div class="quick-view-popup__image-wrapper quick-view-popup__image-wrapper--placeholder">
                    <svg viewBox="0 0 525.5 525.5" xmlns="https://www.w3.org/2000/svg"><path d="M324.5 212.5h-123c-5 0-9 4-9 9s4 9 9 9h123c5 0 9-4 9-9s-4-9-9-9z" fill="#999"/></svg>
                  </div>
                `}
              </div>
              <div class="quick-view-popup__details-section">
                <div class="quick-view-popup__details-content">
                  <div class="quick-view-popup__header">
                    <h2 class="quick-view-popup__title" id="quick-view-popup-title-${product.id}">${this.escapeHtml(product.title)}</h2>
                    <div class="quick-view-popup__rating">
                      <div class="quick-view-popup__stars">${starsHtml}</div>
                      <span class="quick-view-popup__reviews-count">${reviewsCount} review${reviewsCount !== 1 ? 's' : ''}</span>
                    </div>
                  </div>
                  <div class="quick-view-popup__price">
                    ${comparePrice && parseFloat(product.compare_at_price) > parseFloat(product.price)
          ? `<span class="quick-view-popup__price--sale">${price}</span><span class="quick-view-popup__price--compare">${comparePrice}</span>`
          : `<span>${price}</span>`
        }
                  </div>
                  ${description ? `<div class="quick-view-popup__description">${description}</div>` : ''}
                  
                  <div class="quick-view-popup__top-actions">
                    <div class="quick-view-popup__quantity">
                      <div class="quantity-input" data-quantity-selector>
                        <button type="button" class="quantity-input__btn quantity-input__btn--minus" data-quantity-selector-button="minus" aria-label="Decrease quantity" data-quantity-minus>
                          <svg width="12" height="2" viewBox="0 0 12 2" fill="none" xmlns="https://www.w3.org/2000/svg">
                            <path d="M0 1H12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                          </svg>
                        </button>
                        <input type="number" name="quantity" value="1" min="1" class="quantity-input__input" data-quantity-selector-input data-quantity-input>
                        <button type="button" class="quantity-input__btn quantity-input__btn--plus" data-quantity-selector-button="plus" aria-label="Increase quantity" data-quantity-plus>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="https://www.w3.org/2000/svg">
                            <path d="M6 0V12M0 6H12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div class="quick-view-popup__action-icons">
                      ${this.createWishlistButton(product)}
                      ${this.createCompareButton(product)}
                    </div>
                  </div>
                  
                  ${window.__GDPR_SETTINGS__ && window.__GDPR_SETTINGS__.agree_text ? `
                    <div class="quick-view-popup__terms">
                      <label class="quick-view-popup__terms-label">
                        <input type="checkbox" class="quick-view-popup__terms-checkbox" data-terms-checkbox>
                        <span class="quick-view-popup__terms-text">${window.__GDPR_SETTINGS__.agree_text}</span>
                      </label>
                    </div>
                  ` : ''}
                  
                  <a href="${product.url}" class="quick-view-popup__view-details" data-view-details>View Full Details >></a>
                </div>
                
                <div class="quick-view-popup__details-footer">
                  <div class="quick-view-popup__actions">
                    ${this.createAddToCartButton(product, firstVariant)}
                  </div>
                  ${firstVariant && firstVariant.available ? `<a href="${buyNowUrl}" class="quick-view-popup__buy-now-btn" data-buy-now>Buy Now</a>` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    createMobilePopupHTML(product, firstVariant, price, comparePrice, imageSrc, starsHtml, reviewsCount) {
      const buyNowUrl = firstVariant ? `/cart/add?id=${firstVariant.id}&quantity=1&return_to=/checkout` : '#';
      const description = product.description || '';
      const images = product.images || [];
      const imagesCount = images.length || 1;

      return `
        <div class="quick-view-popup quick-view-popup--mobile" id="quick-view-popup-mobile-${product.id}" data-product-id="${product.id}" role="dialog" aria-modal="true" aria-labelledby="quick-view-popup-mobile-title-${product.id}" data-quick-view-popup>
          <div class="quick-view-popup__overlay" data-popup-close></div>
          <div class="quick-view-popup__content quick-view-popup__content--mobile">
            ${imagesCount > 1 ? `
              <div class="quick-view-popup__image-counter">
                <span data-current-image>1</span>/<span data-total-images>${imagesCount}</span>
              </div>
            ` : ''}
            <div class="quick-view-popup__inner quick-view-popup__inner--mobile">
              <button class="quick-view-popup__close" data-popup-close aria-label="Close popup">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="https://www.w3.org/2000/svg">
                  <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </button>
              <div class="quick-view-popup__image-section quick-view-popup__image-section--mobile">
                ${imageSrc ? `
                  <div class="quick-view-popup__image-wrapper quick-view-popup__image-wrapper--mobile">
                    <img src="${imageSrc}" alt="${this.escapeHtml(product.title)}" class="quick-view-popup__image quick-view-popup__image--mobile" loading="lazy">
                  </div>
                ` : `
                  <div class="quick-view-popup__image-wrapper quick-view-popup__image-wrapper--mobile quick-view-popup__image-wrapper--placeholder">
                    <svg viewBox="0 0 525.5 525.5" xmlns="https://www.w3.org/2000/svg"><path d="M324.5 212.5h-123c-5 0-9 4-9 9s4 9 9 9h123c5 0 9-4 9-9s-4-9-9-9z" fill="#999"/></svg>
                  </div>
                `}
              </div>
              <div class="quick-view-popup__scrollable-content">
                <div class="quick-view-popup__header">
                  <h2 class="quick-view-popup__title quick-view-popup__title--mobile" id="quick-view-popup-mobile-title-${product.id}">${this.escapeHtml(product.title)}</h2>
                  <div class="quick-view-popup__rating">
                    <div class="quick-view-popup__stars">${starsHtml}</div>
                    <span class="quick-view-popup__reviews-count">${reviewsCount} review${reviewsCount !== 1 ? 's' : ''}</span>
                  </div>
                </div>
                <div class="quick-view-popup__price quick-view-popup__price--mobile">
                  ${comparePrice && parseFloat(product.compare_at_price) > parseFloat(product.price)
          ? `<span class="quick-view-popup__price--sale">${price}</span><span class="quick-view-popup__price--compare">${comparePrice}</span>`
          : `<span>${price}</span>`
        }
                </div>
                ${description ? `<div class="quick-view-popup__description quick-view-popup__description--mobile">${description}</div>` : ''}
                <div class="quantity-with-action-btns">
                  <div class="quick-view-popup__top-actions">
                    <div class="quick-view-popup__quantity">
                      <div class="quantity-input" data-quantity-selector>
                        <button type="button" class="quantity-input__btn quantity-input__btn--minus" data-quantity-selector-button="minus" aria-label="Decrease quantity" data-quantity-minus>
                          <svg width="12" height="2" viewBox="0 0 12 2" fill="none" xmlns="https://www.w3.org/2000/svg">
                            <path d="M0 1H12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                          </svg>
                        </button>
                        <input type="number" name="quantity" value="1" min="1" class="quantity-input__input" data-quantity-selector-input data-quantity-input>
                        <button type="button" class="quantity-input__btn quantity-input__btn--plus" data-quantity-selector-button="plus" aria-label="Increase quantity" data-quantity-plus>
                          <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="https://www.w3.org/2000/svg">
                            <path d="M6 0V12M0 6H12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <div class="quick-view-popup__action-icons">
                      ${this.createWishlistButton(product)}
                      ${this.createCompareButton(product)}
                    </div>
                  </div>
                </div>
                
                ${window.__GDPR_SETTINGS__ && window.__GDPR_SETTINGS__.agree_text ? `
                  <div class="quick-view-popup__terms quick-view-popup__terms--mobile">
                    <label class="quick-view-popup__terms-label">
                      <input type="checkbox" class="quick-view-popup__terms-checkbox" data-terms-checkbox>
                      <span class="quick-view-popup__terms-text">${window.__GDPR_SETTINGS__.agree_text}</span>
                    </label>
                  </div>
                ` : ''}
                
                <a href="${product.url}" class="quick-view-popup__view-details quick-view-popup__view-details--mobile" data-view-details>View Full Details >></a>
              </div>
                <div class="quick-view-popup__footer--mobile">
                  <div class="quick-view-popup__actions quick-view-popup__actions--mobile">
                    ${this.createAddToCartButton(product, firstVariant)}
                  </div>
                  ${firstVariant && firstVariant.available ? `<a href="${buyNowUrl}" class="quick-view-popup__buy-now-btn quick-view-popup__buy-now-btn--mobile" data-buy-now>Buy Now</a>` : ''}
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    createAddToCartButton(product, variant) {
      if (!variant || !variant.id) {
        return '<button type="button" class="add-to-cart-button" aria-label="Add to cart" disabled><span class="add-to-cart-button__text">Unavailable</span></button>';
      }

      const isAvailable = variant.available !== false;
      const disabledAttr = !isAvailable ? 'disabled="disabled" aria-disabled="true"' : '';

      return `
        <button 
          type="button"
          class="add-to-cart-button"
          data-add-to-cart
          data-product-id="${product.id}"
          data-variant-id="${variant.id}"
          data-inventory-policy="${variant.inventory_policy}"
          data-inventory-quantity="${variant.inventory_quantity}"
          data-inventory-management="${variant.inventory_management}"
          ${disabledAttr}
          aria-label="${isAvailable ? `Add ${this.escapeHtml(product.title)} to cart` : 'Sold Out'}"
        >
          <span class="add-to-cart-button__text">${isAvailable ? 'Add To Cart' : 'Sold Out'}</span>
          <span class="add-to-cart-button__loading" style="display: none;">
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="https://www.w3.org/2000/svg">
              <circle cx="10" cy="10" r="8" stroke="currentColor" stroke-width="2" stroke-dasharray="32" stroke-dashoffset="32">
                <animate attributeName="stroke-dasharray" dur="1.5s" values="0 32;16 16;0 32;0 32" repeatCount="indefinite"/>
                <animate attributeName="stroke-dashoffset" dur="1.5s" values="0;-16;-32;-32" repeatCount="indefinite"/>
              </circle>
            </svg>
          </span>
        </button>
      `;
    }

    createWishlistButton(product) {
      return `
        <button 
          type="button"
          class="wishlist-button"
          data-wishlist-button
          data-product-id="${product.id}"
          data-product-handle="${product.handle}"
          aria-label="Add ${this.escapeHtml(product.title)} to wishlist"
          title="Add to wishlist"
        >
          <svg class="wishlist-button__icon" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="https://www.w3.org/2000/svg">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
              stroke="currentColor" 
              stroke-width="2" 
              stroke-linecap="round" 
              stroke-linejoin="round"
              fill="none"
            />
          </svg>
          <svg class="wishlist-button__icon--filled" width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="https://www.w3.org/2000/svg" style="display: none;">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" 
              fill="currentColor"
            />
          </svg>
        </button>
      `;
    }

    createCompareButton(product) {
      const existingCompareButton = document.querySelector('[data-compare-button][data-compare-page-url]');
      const comparePageUrl = existingCompareButton?.getAttribute('data-compare-page-url') || '/pages/compare';
      return `
        <button 
          type="button"
          class="compare-button"
          data-compare-button
          data-product-id="${product.id}"
          data-product-handle="${product.handle}"
          data-compare-page-url="${comparePageUrl}"
          aria-label="Add ${this.escapeHtml(product.title)} to compare"
          title="Add to compare"
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none"
             xmlns="https://www.w3.org/2000/svg">
          <path d="M4 6h10M4 6l3-3M4 6l3 3"
                stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
          <path d="M20 18H10M20 18l-3-3M20 18l-3 3"
                stroke="currentColor" stroke-width="2"
                stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        </button>
      `;
    }
    formatMoney(cents) {
      if (window.Shopify && window.Shopify.formatMoney) {
        return window.Shopify.formatMoney(cents);
      }
      const moneyFormat = window.Shopify && window.Shopify.money_format ? window.Shopify.money_format : '${{amount}}';

      let value = '';
      let placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;

      function formatWithDelimiters(number, precision, thousands, decimal) {
        precision = precision || 2;
        thousands = thousands || ',';
        decimal = decimal || '.';

        if (isNaN(number) || number == null) {
          return 0;
        }

        number = (number / 100.0).toFixed(precision);

        var parts = number.split('.');
        var dollars = parts[0].replace(/(\d)(?=(\d\d\d)+(?!\d))/g, '$1' + thousands);
        var cents = parts[1] ? (decimal + parts[1]) : '';

        return dollars + cents;
      }

      if (typeof cents === 'string') {
        cents = cents.replace('.', '');
      }

      switch (moneyFormat.match(placeholderRegex)[1]) {
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

      return moneyFormat.replace(placeholderRegex, value);
    }

    escapeHtml(text) {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    updateAddToCartQuantity(quantity) {
    }

    initImageSlider(popup, product) {
  if (!popup || !product) return;

  const images = product.images || [];
  if (images.length <= 1) return;

  const imageSection = popup.querySelector('.quick-view-popup__image-section');
  const imageWrapper = popup.querySelector('.quick-view-popup__image-wrapper');

  if (!imageSection || !imageWrapper) return;

  // Prevent slider from initializing again on same popup
  if (imageSection.querySelector('[data-image-slider]')) return;

  const isMobile = popup.classList.contains('quick-view-popup--mobile');

  const sliderContainer = document.createElement('div');
  sliderContainer.className = 'quick-view-popup__image-slider';
  sliderContainer.setAttribute('data-image-slider', '');

  if (isMobile) {
    sliderContainer.className += ' quick-view-popup__image-wrapper--mobile';
    sliderContainer.style.position = 'relative';
    sliderContainer.style.width = '100%';
    sliderContainer.style.paddingTop = '100%';
    sliderContainer.style.overflow = 'hidden';
  }

  const imagesContainer = document.createElement('div');
  imagesContainer.className = 'quick-view-popup__images-container';
  imagesContainer.style.transform = 'translateX(-100%)';
  imagesContainer.style.transition = 'transform 0.3s ease';

  if (isMobile) {
    imagesContainer.style.position = 'absolute';
    imagesContainer.style.top = '0';
    imagesContainer.style.left = '0';
    imagesContainer.style.width = '100%';
    imagesContainer.style.height = '100%';
  }

  const createSlide = (image, realIndex, isClone = false) => {
    const imgWrapper = document.createElement('div');
    imgWrapper.className = `quick-view-popup__image-slide ${realIndex === 0 && !isClone ? 'active' : ''}`;
    imgWrapper.setAttribute('data-image-index', realIndex);

    if (isClone) {
      imgWrapper.setAttribute('data-clone', 'true');
    }

    const img = document.createElement('img');
    const imageUrl = typeof image === 'string' ? image : (image.src || image.url || '');

    img.src = imageUrl;
    img.alt = product.title || '';
    img.className = isMobile
      ? 'quick-view-popup__image quick-view-popup__image--mobile'
      : 'quick-view-popup__image';
    img.loading = realIndex === 0 ? 'eager' : 'lazy';

    if (isMobile) {
      img.style.position = 'absolute';
      img.style.top = '0';
      img.style.left = '0';
      img.style.width = '100%';
      img.style.height = '100%';
    }

    imgWrapper.appendChild(img);
    return imgWrapper;
  };

  // Clone last slide before first slide
  imagesContainer.appendChild(createSlide(images[images.length - 1], images.length - 1, true));

  // Real slides
  images.forEach((image, index) => {
    imagesContainer.appendChild(createSlide(image, index, false));
  });

  // Clone first slide after last slide
  imagesContainer.appendChild(createSlide(images[0], 0, true));

  sliderContainer.appendChild(imagesContainer);

  if (!isMobile) {
    const prevArrow = document.createElement('button');
    prevArrow.className = 'quick-view-popup__nav-arrow quick-view-popup__nav-arrow--prev';
    prevArrow.setAttribute('aria-label', 'Previous image');
    prevArrow.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="https://www.w3.org/2000/svg">
        <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    prevArrow.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentIdx = parseInt(popup.getAttribute('data-current-image-index') || '0');
      this.changeImage(popup, currentIdx - 1, images.length);
    });

    const nextArrow = document.createElement('button');
    nextArrow.className = 'quick-view-popup__nav-arrow quick-view-popup__nav-arrow--next';
    nextArrow.setAttribute('aria-label', 'Next image');
    nextArrow.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="https://www.w3.org/2000/svg">
        <path d="M9 18L15 12L9 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
    `;

    nextArrow.addEventListener('click', (e) => {
      e.stopPropagation();
      const currentIdx = parseInt(popup.getAttribute('data-current-image-index') || '0');
      this.changeImage(popup, currentIdx + 1, images.length);
    });

    sliderContainer.appendChild(prevArrow);
    sliderContainer.appendChild(nextArrow);
  }

  imageWrapper.parentNode.replaceChild(sliderContainer, imageWrapper);

  popup.setAttribute('data-current-image-index', '0');

  if (isMobile) {
    this.initSwipe(sliderContainer, images.length);
  }
}

changeImage(popup, newIndex, totalImages) {
  if (!popup) return;

  const imagesContainer = popup.querySelector('.quick-view-popup__images-container');
  if (!imagesContainer) return;

  // Stop rapid double click / double swipe issues
  if (popup.getAttribute('data-is-sliding') === 'true') return;
  popup.setAttribute('data-is-sliding', 'true');

  let realIndex = newIndex;
  let slideIndex = newIndex + 1;
  let resetSlideIndex = null;

  // Going next from last slide
  if (newIndex >= totalImages) {
    realIndex = 0;
    slideIndex = totalImages + 1; // cloned first slide
    resetSlideIndex = 1; // real first slide
  }

  // Going prev from first slide
  if (newIndex < 0) {
    realIndex = totalImages - 1;
    slideIndex = 0; // cloned last slide
    resetSlideIndex = totalImages; // real last slide
  }

  imagesContainer.style.transition = 'transform 0.3s ease';
  imagesContainer.style.transform = `translateX(-${slideIndex * 100}%)`;

  const counter = popup.querySelector('[data-current-image]');
  if (counter) {
    counter.textContent = realIndex + 1;
  }

  popup.setAttribute('data-current-image-index', realIndex.toString());

  const slides = popup.querySelectorAll('.quick-view-popup__image-slide');
  slides.forEach((slide) => {
    const slideRealIndex = parseInt(slide.getAttribute('data-image-index') || '0');
    const isClone = slide.hasAttribute('data-clone');

    slide.classList.toggle('active', slideRealIndex === realIndex && !isClone);
  });

  let finished = false;

  const finishSlide = () => {
    if (finished) return;
    finished = true;

    if (resetSlideIndex !== null) {
      imagesContainer.style.transition = 'none';
      imagesContainer.style.transform = `translateX(-${resetSlideIndex * 100}%)`;

      // Force browser reflow
      void imagesContainer.offsetWidth;

      imagesContainer.style.transition = 'transform 0.3s ease';
    }

    popup.removeAttribute('data-is-sliding');
  };

  imagesContainer.addEventListener('transitionend', finishSlide, { once: true });

  // Fallback in case transitionend does not fire
  setTimeout(finishSlide, 400);
}

initSwipe(container, totalImages) {
  if (!container) return;

  let startX = 0;
  let currentX = 0;
  let isDragging = false;

  const popup = container.closest('.quick-view-popup');

  container.addEventListener('touchstart', (e) => {
    startX = e.touches[0].clientX;
    currentX = 0;
    isDragging = true;
  }, { passive: true });

  container.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    currentX = e.touches[0].clientX - startX;
  }, { passive: true });

  container.addEventListener('touchend', () => {
    if (!isDragging) return;

    isDragging = false;

    const threshold = 50;
    const currentIndex = parseInt(popup.getAttribute('data-current-image-index') || '0');

    if (Math.abs(currentX) > threshold) {
      if (currentX > 0) {
        this.changeImage(popup, currentIndex - 1, totalImages);
      } else {
        this.changeImage(popup, currentIndex + 1, totalImages);
      }
    }

    currentX = 0;
  }, { passive: true });
}

    closePopup() {
      if (this.currentPopup) {
        this.currentPopup.classList.remove('is-open');
        this.currentPopup = null;
      }
    }
    updateButtonStates(product) {
      if (!this.currentPopup) return;
      try {
        const stored = localStorage.getItem('shopify_wishlist');
        const wishlist = stored ? JSON.parse(stored) : [];
        const wishlistButtons = this.currentPopup.querySelectorAll('[data-wishlist-button]');
        wishlistButtons.forEach(button => {
          const productHandle = button.getAttribute('data-product-handle') || product.handle;
          const isInWishlist = productHandle && wishlist.includes(String(productHandle));
          const title = isInWishlist ? 'Remove from wishlist' : 'Add to wishlist';
          
          if (isInWishlist) {
            button.classList.add('is-active');
          } else {
            button.classList.remove('is-active');
          }
          
          button.setAttribute('title', title);
          button.setAttribute('aria-label', title);
        });
      } catch (error) {
      }
      try {
        const compareStored = localStorage.getItem('shopify_compare');
        const compareItems = compareStored ? JSON.parse(compareStored) : [];

        const compareButtons = this.currentPopup.querySelectorAll('[data-compare-button]');
        compareButtons.forEach(button => {
          const productHandle = button.getAttribute('data-product-handle') || product.handle;
          const isInCompare = productHandle && compareItems.includes(String(productHandle));
          const title = isInCompare ? 'Compare' : 'Add to compare';
          
          if (isInCompare) {
            button.classList.add('is-active');
          } else {
            button.classList.remove('is-active');
          }
          
          button.setAttribute('title', title);
          button.setAttribute('aria-label', title);
        });
      } catch (error) {
      }
      if (window.compareManager && window.compareManager.updateButtonStates) {
        setTimeout(() => {
          window.compareManager.updateButtonStates();
        }, 50);
      }
    }
  }
  let quickViewPopupInstance;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      quickViewPopupInstance = new QuickViewPopup();
      window.quickViewPopup = quickViewPopupInstance;
    });
  } else {
    quickViewPopupInstance = new QuickViewPopup();
    window.quickViewPopup = quickViewPopupInstance;
  }
  if (typeof Shopify !== 'undefined' && Shopify.designMode) {
    document.addEventListener('shopify:section:load', () => {
      if (!window.quickViewPopup) {
        quickViewPopupInstance = new QuickViewPopup();
        window.quickViewPopup = quickViewPopupInstance;
      }
    });
  }
})();

