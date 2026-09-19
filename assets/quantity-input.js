if (typeof QuantityInput === 'undefined') {
  class QuantityInput {
    constructor() {
      this.init();
      document.addEventListener('DOMContentLoaded', () => this.init());
      document.addEventListener('shopify:section:load', () => this.init());
      document.addEventListener('cart:refresh', () => this.init());
      document.addEventListener('cart:updated', () => this.init());
    }
    init() {
      const selectors = document.querySelectorAll('[data-quantity-selector]');
      selectors.forEach(selector => {
        if (selector.dataset.initialized) return;
        const input = selector.querySelector('[data-quantity-selector-input]');
        const minusBtn = selector.querySelector('[data-quantity-decrease]');
        const plusBtn = selector.querySelector('[data-quantity-increase]');
        if (!input || !minusBtn || !plusBtn) return;
        const updateButtons = () => {
          const value = parseInt(input.value);
          const min = parseInt(input.getAttribute('min')) || 1;
          const max = parseInt(input.getAttribute('max')) || Infinity;
          minusBtn.disabled = value <= min;
          plusBtn.disabled = value >= max;
        };
        minusBtn.addEventListener('click', () => {
          let value = parseInt(input.value) || 1;
          const min = parseInt(input.getAttribute('min')) || 1;
          if (value > min) {
            input.value = value - 1;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          updateButtons();
        });
        plusBtn.addEventListener('click', () => {
          let value = parseInt(input.value) || 1;
          const max = parseInt(input.getAttribute('max')) || Infinity;
          if (value < max) {
            input.value = value + 1;
            input.dispatchEvent(new Event('change', { bubbles: true }));
          }
          updateButtons();
        });
        input.addEventListener('change', () => {
          let value = parseInt(input.value) || 1;
          const min = parseInt(input.getAttribute('min')) || 1;
          const max = parseInt(input.getAttribute('max')) || Infinity;
          if (value < min) value = min;
          if (value > max) value = max;
          input.value = value;
          updateButtons();
        });
        updateButtons();
        selector.dataset.initialized = 'true';
      });
    }
  }
  window.QuantityInput = new QuantityInput();
}