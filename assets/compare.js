class CompareManager {
  constructor() {
    this.storageKey = 'shopify_compare';
    this.compareContainer = document.querySelector('[data-compare-container]');
    this.compareTable = document.querySelector('[data-compare-table]');
    this.compareEmpty = document.querySelector('[data-compare-empty]');
    this.maxCompareItems = 6;
    this.init();
  }
  init() {
    this.loadCompare();
    this.attachEventListeners();
    this.updateCompareCount();
  }
  getCompareItems() {
    try {
      const items = localStorage.getItem(this.storageKey);
      return items ? JSON.parse(items) : [];
    } catch (e) {
      return [];
    }
  }
  saveCompareItems(items) {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(items));
      this.updateCompareCount();
    } catch (e) {
      return;
    }
  }
  addToCompare(productHandle) {
    const items = this.getCompareItems();
    const productHandleStr = String(productHandle);

    if (items.length >= this.maxCompareItems) {
      if (typeof window.showToast === 'function') {
        window.showToast(`You can compare a maximum of ${this.maxCompareItems} products. Please remove an item first.`, 'error');
      }
      return false;
    }
    if (!items.includes(productHandleStr)) {
      items.push(productHandleStr);
      this.saveCompareItems(items);
      this.updateButtonStates();
      this.loadCompare();
      if (typeof window.showToast === 'function') {
        window.showToast('Product added to compare', 'success');
      }
      return true;
    }
    return false;
  }
  removeFromCompare(productHandle, showToast = true) {
    const items = this.getCompareItems();
    const productHandleStr = String(productHandle);
    const filteredItems = items.filter(handle => String(handle) !== productHandleStr);
    this.saveCompareItems(filteredItems);
    this.updateButtonStates();
    this.loadCompare();
    if (showToast && typeof window.showToast === 'function') {
      window.showToast('Product removed from compare', 'error');
    }
  }
  isInCompare(productHandle) {
    const items = this.getCompareItems();
    const productHandleStr = String(productHandle);
    return items.some(handle => String(handle) === productHandleStr);
  }
  async loadCompare() {
    const productHandles = this.getCompareItems();
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
        this.renderComparisonTable(products);
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
    return results.filter(product => product !== null);
  }
  renderProducts(products) {

    this.renderComparisonTable(products);
  }
  createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'compare-card';
    card.setAttribute('data-compare-item', '');
    card.setAttribute('data-product-id', product.id);
    card.setAttribute('data-product-handle', product.handle);
    const rating = product.metafields?.reviews?.rating?.value || 5;
    const ratingValue = Math.round(parseFloat(rating));
    const price = this.formatMoney(product.price);
    const comparePrice = product.compare_at_price ? this.formatMoney(product.compare_at_price) : null;
    const vendor = product.vendor || 'N/A';
    const colors = this.getUniqueOptionValues(product, 'Color');
    const sizes = this.getUniqueOptionValues(product, 'Size');
    const isAvailable = product.available !== false && product.variants?.some(v => v.available !== false);
    const availabilityText = isAvailable ? 'In Stock' : 'Out of Stock';
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
    let imageHtml = '';
    if (firstImage) {
      const firstImageUrl = typeof firstImage === 'string' ? firstImage : (firstImage.src || firstImage);
      imageHtml = `
        <img src="${firstImageUrl}" alt="${this.escapeHtml(product.title)}" class="compare-card__image" loading="lazy">
      `;
    } else {
      imageHtml = `<div class="compare-card__image-placeholder">${this.getPlaceholderSvg()}</div>`;
    }

    card.innerHTML = `
      <button 
        class="compare-card__remove" 
        type="button"
        aria-label="Remove from compare"
        data-remove-compare-item
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="https://www.w3.org/2000/svg">
          <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="compare-card__image-container">
        <a href="${product.url}" class="compare-card__image-wrapper">
          ${imageHtml}
        </a>
      </div>
      <div class="compare-card__info">
        <h3 class="compare-card__title">
          <a href="${product.url}">${this.escapeHtml(product.title)}</a>
        </h3>
        <div class="compare-card__rating">
          <div class="compare-card__stars">
            ${starsHtml}
          </div>
          <span class="compare-card__rating-text">Review</span>
        </div>
        <div class="compare-card__vendor">
          <strong>Vendor:</strong> ${this.escapeHtml(vendor)}
        </div>
        <div class="compare-card__color">
          <strong>Color:</strong> ${colors.length > 0 ? colors.join(', ') : 'N/A'}
        </div>
        <div class="compare-card__size">
          <strong>Size:</strong> ${sizes.length > 0 ? sizes.join(', ') : 'N/A'}
        </div>
        <div class="compare-card__availability">
          <strong>Availability:</strong> <span class="${isAvailable ? 'compare-card__availability--in-stock' : 'compare-card__availability--out-of-stock'}">${availabilityText}</span>
        </div>
        <div class="compare-card__price">
          ${comparePrice && parseFloat(product.compare_at_price) > parseFloat(product.price)
        ? `<span class="compare-card__price--sale">${price}</span><span class="compare-card__price--compare">${comparePrice}</span>`
        : `<span>${price}</span>`
      }
        </div>
      </div>
    `;

    return card;
  }
  renderComparisonTable(products) {
    if (!this.compareTable) return;

    const table = this.compareTable;
    const tbody = table.querySelector('tbody') || document.createElement('tbody');
    tbody.innerHTML = '';
    const fields = [
      { label: 'Review', key: 'rating' },
      { label: 'Vendor', key: 'vendor' },
      { label: 'Color', key: 'color' },
      { label: 'Size', key: 'size' },
      { label: 'Availability', key: 'availability' }
    ];
    let headerRow = table.querySelector('thead tr');
    if (!headerRow) {
      const thead = table.querySelector('thead') || document.createElement('thead');
      headerRow = document.createElement('tr');
      thead.appendChild(headerRow);
      if (!table.querySelector('thead')) {
        table.insertBefore(thead, tbody);
      }
    }
    headerRow.innerHTML = '';
    const productsLabelHeader = document.createElement('th');
    productsLabelHeader.className = 'compare-table__products-label';
    productsLabelHeader.textContent = 'Products';
    headerRow.appendChild(productsLabelHeader);
    products.forEach(product => {
      const th = document.createElement('th');
      th.className = 'compare-table__product-header';
      const price = this.formatMoney(product.price);
      const comparePrice = product.compare_at_price ? this.formatMoney(product.compare_at_price) : null;

      const firstImage = product.featured_image || (product.images && product.images[0]) || '';
      const imageUrl = typeof firstImage === 'string' ? firstImage : (firstImage.src || firstImage);

      th.innerHTML = `
        <button 
          class="compare-table__remove" 
          type="button"
          aria-label="Remove ${this.escapeHtml(product.title)} from compare"
          data-remove-compare-item
          data-product-handle="${product.handle}"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="https://www.w3.org/2000/svg">
            <path d="M12 4L4 12M4 4L12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
        <div class="compare-table__product-content">
          <a href="${product.url}" class="compare-table__product-link">
            ${imageUrl ? `<img src="${imageUrl}" alt="${this.escapeHtml(product.title)}" class="compare-table__product-image">` : ''}
            <span class="compare-table__product-title">${this.escapeHtml(product.title)}</span>
          </a>
          <div class="compare-table__product-price">
            ${comparePrice && parseFloat(product.compare_at_price) > parseFloat(product.price)
          ? `<span class="compare-table__price--sale">${price}</span><span class="compare-table__price--compare">${comparePrice}</span>`
          : `<span>${price}</span>`
        }
          </div>
          <div class="compare-table__product-action">
            ${this.createAddToCartButton(product)}
          </div>
        </div>
      `;
      headerRow.appendChild(th);
    });
    fields.forEach(field => {
      const row = document.createElement('tr');
      const labelCell = document.createElement('td');
      labelCell.className = 'compare-table__label';
      labelCell.textContent = field.label;
      row.appendChild(labelCell);

      products.forEach(product => {
        const dataCell = document.createElement('td');
        dataCell.className = `compare-table__data compare-table__data--${field.key}`;

        switch (field.key) {
          case 'rating':
            const rating = product.metafields?.reviews?.rating?.value || 5;
            const ratingValue = Math.round(parseFloat(rating));
            const starsHtml = Array.from({ length: 5 }, (_, i) => {
              const filled = i < ratingValue;
              return `<svg width="14" height="14" viewBox="0 0 20 20" fill="none" xmlns="https://www.w3.org/2000/svg">
                <path d="M10 1L12.09 7.26L19 8.27L14 12.14L15.18 19.02L10 15.77L4.82 19.02L6 12.14L1 8.27L7.91 7.26L10 1Z" 
                  fill="${filled ? '#FFD700' : '#E0E0E0'}" 
                  stroke="${filled ? '#FFD700' : '#E0E0E0'}" 
                  stroke-width="1"/>
              </svg>`;
            }).join('');
            dataCell.innerHTML = `<div class="compare-table__stars">${starsHtml}</div>`;
            break;
          case 'vendor':
            dataCell.textContent = product.vendor || '-';
            break;
          case 'color':
            const colors = this.getUniqueOptionValues(product, 'Color');
            dataCell.textContent = colors.length > 0 ? colors.join(', ') : '-';
            break;
          case 'size':
            const sizes = this.getUniqueOptionValues(product, 'Size');
            dataCell.textContent = sizes.length > 0 ? sizes.join(', ') : '-';
            break;
          case 'availability':
            const isAvailable = product.available !== false && product.variants?.some(v => v.available !== false);
            dataCell.innerHTML = `<span class="${isAvailable ? 'compare-table__availability--in-stock' : 'compare-table__availability--out-of-stock'}">${isAvailable ? '✓ Instock' : 'Out of Stock'}</span>`;
            break;
        }

        row.appendChild(dataCell);
      });

      tbody.appendChild(row);
    });

    if (!table.querySelector('tbody')) {
      table.appendChild(tbody);
    }

    table.style.display = 'table';
  }
  getUniqueOptionValues(product, optionName) {
    if (!product.options || !product.variants) return [];

    const optionIndex = product.options.findIndex(opt =>
      opt.name.toLowerCase() === optionName.toLowerCase()
    );

    if (optionIndex === -1) return [];

    const values = new Set();
    product.variants.forEach(variant => {
      if (variant.options && variant.options[optionIndex]) {
        values.add(variant.options[optionIndex]);
      }
    });

    return Array.from(values);
  }
  formatMoney(cents, format) {
    if (typeof cents === 'string') { cents = cents.replace('.', ''); }
    let value = '';
    const placeholderRegex = /\{\{\s*(\w+)\s*\}\}/;
    const formatString = format || window.Shopify?.money_format || window.Shopify?.shop?.money_format || '${{amount}}';

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
  createAddToCartButton(product) {
    const firstVariant = product.variants && product.variants.length > 0 ? product.variants[0] : null;
    const variantId = firstVariant ? firstVariant.id : '';
    const isAvailable = product.available !== false && product.variants?.some(v => v.available !== false);

    if (isAvailable && variantId) {
      return `
        <form action="/cart/add" method="post" enctype="multipart/form-data" class="compare-table__add-to-cart-form">
          <input type="hidden" name="id" value="${variantId}">
          <input type="hidden" name="quantity" value="1">
          <button type="submit" class="compare-table__add-to-cart-btn" aria-label="Add to cart from compare">Add To Cart</button>
        </form>
      `;
    } else {
      return `<a href="${product.url}" class="compare-table__view-btn">View Product</a>`;
    }
  }
  showEmptyState() {
    if (this.compareEmpty) {
      this.compareEmpty.style.display = 'block';
    }
    if (this.compareTable) {
      this.compareTable.style.display = 'none';
    }
  }
  hideEmptyState() {
    if (this.compareEmpty) {
      this.compareEmpty.style.display = 'none';
    }
  }
  updateCompareCount() {
    const count = this.getCompareItems().length;
    const countElements = document.querySelectorAll('[data-compare-count]');
    countElements.forEach(el => {
      el.textContent = count;
      if (count > 0) {
        el.style.display = 'flex';
      } else {
        el.style.display = 'none';
      }
    });
  }
  updateButtonStates() {
    const items = this.getCompareItems();
    document.querySelectorAll('[data-compare-button]').forEach(button => {
      const productHandle = button.getAttribute('data-product-handle');
      const isInCompare = productHandle && items.includes(productHandle);
      const title = isInCompare ? 'Compare' : 'Add to compare';

      if (isInCompare) {
        button.classList.add('is-active');
      } else {
        button.classList.remove('is-active');
      }

      button.setAttribute('title', title);
      button.setAttribute('aria-label', title);
    });
  }
  attachEventListeners() {
    if (this.compareTable) {
      this.compareTable.addEventListener('click', (e) => {
        const removeBtn = e.target.closest('[data-remove-compare-item]');
        if (removeBtn) {
          e.preventDefault();
          const productHandle = removeBtn.getAttribute('data-product-handle');
          if (productHandle) {
            this.removeFromCompare(productHandle, true);
          }
        }
      });
      this.compareTable.addEventListener('submit', (e) => {
        const form = e.target.closest('.compare-table__add-to-cart-form');
        if (form) {
          e.preventDefault();
          const formData = new FormData(form);

          fetch('/cart/add.js', {
            method: 'POST',
            body: formData
          })
            .then(response => response.json())
            .then(data => {
              document.dispatchEvent(new CustomEvent('cart:updated'));
              if (window.cartDrawer && window.cartDrawer.open) {
                window.cartDrawer.open();
              }
            })
            .catch(error => {
            });
        }
      });
    }
    document.addEventListener('compare:updated', () => {
      this.loadCompare();
    });
  }
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    initializeCompare();
  });
} else {
  initializeCompare();
}

function initializeCompare() {
  if (document.querySelector('[data-compare-container]')) {
    window.compareManager = new CompareManager();
  } else {
    window.compareManager = {
      storageKey: 'shopify_compare',
      maxCompareItems: 6,
      getCompareItems() {
        try {
          const items = localStorage.getItem(this.storageKey);
          return items ? JSON.parse(items) : [];
        } catch (e) {
          return [];
        }
      },
      saveCompareItems(items) {
        try {
          localStorage.setItem(this.storageKey, JSON.stringify(items));
          this.updateCompareCount();
        } catch (e) {
        }
      },
      addToCompare(productHandle) {
        const items = this.getCompareItems();
        const productHandleStr = String(productHandle);
        if (items.length >= this.maxCompareItems) {
          const message = `You can compare a maximum of ${this.maxCompareItems} products. Please remove an item first.`;
          if (typeof window.showToast === 'function') {
            window.showToast(message, 'warning');
          } else {
            alert(message);
          }
          return;
        }
        if (!items.includes(productHandleStr)) {
          items.push(productHandleStr);
          this.saveCompareItems(items);
          this.updateButtonStates();
          document.dispatchEvent(new CustomEvent('compare:updated'));
          if (typeof window.showToast === 'function') {
            window.showToast('Product added to compare', 'success');
          }
          return true;
        }
        return false;
      },
      removeFromCompare(productHandle, showToast = false) {
        const items = this.getCompareItems();
        const productHandleStr = String(productHandle);
        const filteredItems = items.filter(handle => String(handle) !== productHandleStr);
        this.saveCompareItems(filteredItems);
        this.updateButtonStates();
        document.dispatchEvent(new CustomEvent('compare:updated'));
        if (showToast && typeof window.showToast === 'function') {
          window.showToast('Product removed from compare', 'error');
        }
      },
      isInCompare(productHandle) {
        const items = this.getCompareItems();
        const productHandleStr = String(productHandle);
        return items.some(handle => String(handle) === productHandleStr);
      },
      updateCompareCount() {
        const count = this.getCompareItems().length;
        const countElements = document.querySelectorAll('[data-compare-count]');
        countElements.forEach(el => {
          el.textContent = count;
          el.style.display = count > 0 ? 'flex' : 'none';
        });
      },
      updateButtonStates() {
        const items = this.getCompareItems();
        document.querySelectorAll('[data-compare-button]').forEach(button => {
          const productHandle = button.getAttribute('data-product-handle');
          const isInCompare = productHandle && items.includes(productHandle);
          const title = isInCompare ? 'Compare' : 'Add to compare';

          if (isInCompare) {
            button.classList.add('is-active');
          } else {
            button.classList.remove('is-active');
          }

          button.setAttribute('title', title);
          button.setAttribute('aria-label', title);
        });
      }
    };
    window.compareManager.updateCompareCount();
    window.compareManager.updateButtonStates();
    document.addEventListener('click', (e) => {
      const button = e.target.closest('[data-compare-button]');
      if (!button) return;

      e.preventDefault();
      const productHandle = button.getAttribute('data-product-handle');
      if (!productHandle) return;
      if (window.compareManager.isInCompare(productHandle)) {
        const comparePageUrl = button.getAttribute('data-compare-page-url') || '/pages/compare';
        window.location.href = comparePageUrl;
      } else {
        window.compareManager.addToCompare(productHandle);
      }
    });
  }
  document.addEventListener('compare:updated', () => {
    if (window.compareManager && window.compareManager.updateCompareCount) {
      window.compareManager.updateCompareCount();
    }
    if (window.compareManager && window.compareManager.updateButtonStates) {
      window.compareManager.updateButtonStates();
    }
  });
}
if (typeof module !== 'undefined' && module.exports) {
  module.exports = CompareManager;
}