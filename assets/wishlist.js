/* ============================================================
   wishlist.js - Raison Jewels
   Single source of truth. No duplicate listeners. No dead code.
   ============================================================ */

class WishlistManager {
  constructor() {
    this.storageKey    = 'shopify_wishlist';
    this.wishlistGrid  = document.querySelector('[data-wishlist-grid]');
    this.wishlistEmpty = document.querySelector('[data-wishlist-empty]');
    this._migrateData();
    this.updateWishlistCount();
    this._syncButtonStates();     // restore liked state on page load / refresh
    if (this.wishlistGrid) this._loadPage();
  }
  /* ── Storage ──────────────────────────────────────────────────────────── */

  _migrateData() {
    const items   = this.getWishlistItems();
    const cleaned = items.filter(h => !/^\d+$/.test(String(h)));
    if (cleaned.length !== items.length) {
      try { localStorage.setItem(this.storageKey, JSON.stringify(cleaned)); } catch (_) {}
    }
  }

  getWishlistItems() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      return raw ? JSON.parse(raw) : [];
    } catch (_) { return []; }
  }

  /* _save() is the ONLY place we write to storage.
     It always updates badge count + button states + fires event. */
  _save(items) {
    try { localStorage.setItem(this.storageKey, JSON.stringify(items)); } catch (_) {}
    this.updateWishlistCount();
    this._syncButtonStates();
    document.dispatchEvent(new CustomEvent('wishlist:updated'));
  }

  /* ── Public API ───────────────────────────────────────────────────────── */

  isInWishlist(handle) {
    return this.getWishlistItems().some(h => String(h) === String(handle));
  }

  addToWishlist(handle) {
    const items = this.getWishlistItems();
    const str   = String(handle);
    if (!items.includes(str)) {
      items.push(str);
      this._save(items);
      if (this.wishlistGrid) this._loadPage();
      if (typeof window.showToast === 'function') window.showToast('Added to wishlist', 'success');
    }
  }

  removeFromWishlist(handle) {
    const items = this.getWishlistItems().filter(h => String(h) !== String(handle));
    this._save(items);
    if (this.wishlistGrid) this._loadPage();
    if (typeof window.showToast === 'function') window.showToast('Removed from wishlist', 'error');
  }
  /* ── Header badge count (always called after every change) ──────────── */

  updateWishlistCount() {
    const count = this.getWishlistItems().length;
    document.querySelectorAll('[data-wishlist-count]').forEach(el => {
      // Set text — when empty string, CSS :empty selector auto-hides the badge
      el.textContent = count > 0 ? String(count) : '';
      // Also force inline style so CSS specificity cannot override when count > 0
      el.style.display = count > 0 ? 'flex' : '';
    });
  }

  /* ── Button state sync (liked class + SVG fill) ──────────────────────── */

  _syncButtonStates() {
    const items = this.getWishlistItems();
    document.querySelectorAll('.js-wishlist-toggle').forEach(btn => {
      const handle = btn.getAttribute('data-product-handle');
      if (!handle) return;
      const inList = items.some(h => String(h) === String(handle));
      btn.classList.toggle('liked', inList);
      const path = btn.querySelector('svg path');
      if (path) {
        path.setAttribute('fill',   inList ? 'currentColor' : 'none');
        path.setAttribute('stroke', 'currentColor');
      }
    });
  }

  /* ── Wishlist page ────────────────────────────────────────────────────── */

  async _loadPage() {
    const handles = this.getWishlistItems();
    if (handles.length === 0) { this._showEmpty(); return; }
    this._hideEmpty();
    try {
      const products = await this._fetchProducts(handles);
      products.length > 0 ? this._renderGrid(products) : this._showEmpty();
    } catch (_) { this._showEmpty(); }
  }

  async _fetchProducts(handles) {
    const results = await Promise.all(
      handles.map(handle => {
        if (/^\d+$/.test(String(handle))) return Promise.resolve(null);
        return fetch('/products/' + handle + '.js')
          .then(r => r.ok ? r.json() : null)
          .catch(() => null);
      })
    );
    return results.filter(Boolean);
  }
  _renderGrid(products) {
    if (!this.wishlistGrid) return;
    this.wishlistGrid.innerHTML = '';
    this.wishlistGrid.className = 'collection-grid cols-desktop-4 cols-mobile-2';
    this.wishlistGrid.style.display = 'grid';
    products.forEach(p => this.wishlistGrid.appendChild(this._buildCard(p)));
  }

  _showEmpty() {
    if (this.wishlistEmpty) this.wishlistEmpty.style.display = 'block';
    if (this.wishlistGrid)  this.wishlistGrid.style.display  = 'none';
  }

  _hideEmpty() {
    if (this.wishlistEmpty) this.wishlistEmpty.style.display = 'none';
  }
  /* ── Card builder (same HTML as collection product-card) ──────────────── */

  _buildCard(product) {
    const card = document.createElement('article');
    card.className = 'collection-card product-card';
    card.setAttribute('data-wishlist-item', '');
    card.setAttribute('data-product-id', product.id);
    card.setAttribute('data-product-handle', product.handle);

    const price = this._formatMoney(product.price);
    const comparePrice = product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price)
      ? this._formatMoney(product.compare_at_price)
      : null;

    // Image
    const firstImage = product.featured_image || (product.images && product.images[0]) || '';
    let imgSrc = '';
    if (firstImage) {
      imgSrc = typeof firstImage === 'string' ? firstImage : (firstImage.src || '');
    }
    if (imgSrc && imgSrc.includes('cdn.shopify.com') && !imgSrc.includes('width=')) {
      imgSrc = imgSrc + (imgSrc.includes('?') ? '&' : '?') + 'width=800';
    }

    // Badge
    let badge = '';
    if (product.tags && product.tags.length > 0) {
      const badgeTag = product.tags.find(t => ['bestseller','new','sale','featured','gift edit','office edit'].includes(t.toLowerCase()));
      badge = badgeTag ? badgeTag.toUpperCase() : product.tags[0].toUpperCase();
    }

    // Subtitle
    let subtitle = product.product_type ? 'Gold · ' + product.product_type : '14K Gold · Laboratory-Grown Diamond';

    // Tags line (first 3 tags joined)
    const tagsLine = product.tags && product.tags.length > 1
      ? product.tags.slice(0, 3).join(' · ')
      : '';

    card.innerHTML = `
      <div class="collection-card-image product-image">
        ${imgSrc ? `<img src="${imgSrc}" alt="${this._esc(product.title)}" loading="lazy" width="600" height="600">` : ''}
        ${badge ? `<span class="badge">${badge}</span>` : ''}
        <button
          type="button"
          class="collection-wish wishlist-btn js-wishlist-toggle liked"
          aria-label="Remove from wishlist"
          data-product-handle="${product.handle}"
          data-product-id="${product.id}"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>
        </button>
      </div>
      <div class="collection-card-copy product-info">
        <p class="card-subtitle">${this._esc(subtitle)}</p>
        <h3 class="card-title">
          <a href="${product.url}">${this._esc(product.title)}</a>
        </h3>
        <div class="card-price-row">
          <strong>${price}</strong>
          ${comparePrice ? `<del>${comparePrice}</del>` : ''}
        </div>
        ${tagsLine ? `<small class="card-tags">${this._esc(tagsLine)}</small>` : ''}
        <a href="${product.url}" class="collection-view">VIEW DESIGN →</a>
      </div>
    `;

    return card;
  }
  /* ── Utilities ────────────────────────────────────────────────────────── */

  _esc(text) {
    const d = document.createElement('div');
    d.textContent = String(text || '');
    return d.innerHTML;
  }

  _formatMoney(cents) {
    if (typeof cents === 'string') cents = cents.replace('.', '');
    const shopify = window.Shopify;
    const fmt     = (shopify && (shopify.money_format || (shopify.shop && shopify.shop.money_format))) || '\u20b9{{ amount }}';
    const match   = fmt.match(/\{\{\s*(\w+)\s*\}\}/);
    if (!match) return fmt;
    const precision = match[1].includes('no_decimals') ? 0 : 2;
    const useComma  = match[1].includes('with_comma');
    const thou = useComma ? '.' : ',';
    const dec  = useComma ? ',' : '.';
    const num  = (Number(cents) / 100).toFixed(precision);
    const parts   = num.split('.');
    const integer = parts[0].replace(/(\d)(?=(\d{3})+(?!\d))/g, '$1' + thou);
    const frac    = parts[1] ? dec + parts[1] : '';
    let result    = fmt.replace(/\{\{\s*\w+\s*\}\}/, integer + frac);
    const active  = shopify && shopify.currency && shopify.currency.active;
    if (active === 'INR') result = result.replace(/Rs\.?\s?/g, '\u20b9').replace(/\$/g, '\u20b9');
    return result;
  }
}
/* ── Boot (once only, guarded) ──────────────────────────────────────────── */

function _bootWishlist() {
  if (window.__wishlistBooted) return;
  window.__wishlistBooted = true;

  window.wishlistManager = new WishlistManager();

  /* Single global click handler for ALL .js-wishlist-toggle buttons */
  document.addEventListener('click', function(e) {
    const btn = e.target.closest('.js-wishlist-toggle');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();

    const handle = btn.getAttribute('data-product-handle');
    if (!handle || !window.wishlistManager) return;

    if (window.wishlistManager.isInWishlist(handle)) {
      window.wishlistManager.removeFromWishlist(handle);
    } else {
      window.wishlistManager.addToWishlist(handle);
    }
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', _bootWishlist);
} else {
  _bootWishlist();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = WishlistManager;
}