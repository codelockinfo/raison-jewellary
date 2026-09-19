function updateInventory(container) {
    if (!container) return;

    const qty = parseInt(container.dataset.qty, 10);
    const threshold = parseInt(container.dataset.threshold, 10);
    const showCount = container.dataset.showCount === "true";
    const hideBackorder = container.dataset.hideBackorder === "true";
    const showProgress = container.dataset.showProgress === "true";
    const max = parseInt(container.dataset.progressMax, 10);
    const policy = container.dataset.policy;

    let text = "";
    let percent = 0;

    if (qty <= 0) {
        text =
            policy === "continue" && !hideBackorder
                ? "Available on backorder"
                : "Sold Out";
    } else if (qty <= threshold) {
        text = showCount ? `Only ${qty} items left` : "Low stock";
    } else {
        text = showCount ? `${qty} in stock` : "In stock";
    }

    const textEl = container.querySelector(".inventory-text");
    if (textEl) textEl.textContent = text;
    const progressWrap = container.querySelector(".inventory-progress");

    if (showProgress && qty > 0) {
        const percent = Math.min((qty / max) * 100, 100);
        if (progressWrap) {
            progressWrap.style.display = "block";
            progressWrap.querySelector(".inventory-progress-bar").style.width =
                percent + "%";
        }
    } else {
        if (progressWrap) {
            progressWrap.style.display = "none";
        }
    }

}

document.addEventListener("DOMContentLoaded", () => {
    const box = document.querySelector(".inventory-notice");
    updateInventory(box);

    // Optional: variant change support
    document.addEventListener("variant:change", e => {
        if (!box || !e.detail.variant) return;
        box.dataset.qty = e.detail.variant.inventory_quantity;
        box.dataset.policy = e.detail.variant.inventory_policy;
        updateInventory(box);
    });
});

async function getCart() {
    const res = await fetch("/cart.js");
    return res.json();
}

document.addEventListener("DOMContentLoaded", () => {
    const form = document.querySelector("#product-form");
    if (!form) return;

    const errorBox = document.querySelector(".cart-limit-error");

    form.addEventListener("submit", async (e) => {
        const variantInput = form.querySelector('input[name="id"]');
        if (!variantInput) return;

        const variantId = Number(variantInput.value);

        // Get inventory from DOM (set this in liquid)
        const inventory = Number(
            form.dataset.inventoryQuantity
        );

        const cart = await getCart();
        const itemInCart = cart.items.find(
            item => item.variant_id === variantId
        );

        const cartQty = itemInCart ? itemInCart.quantity : 0;

        if (cartQty >= inventory) {
            e.preventDefault(); // 🚫 STOP add to cart

            if (errorBox) {
                errorBox.hidden = false;
            }

            return false;
        }

        // If allowed → hide error
        if (errorBox) errorBox.hidden = true;
    });
});
