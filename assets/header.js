
document.addEventListener('DOMContentLoaded', function () {
    const drawer = document.querySelector('[data-mobile-drawer]');
    const toggleBtn = document.querySelector('[data-mobile-menu-toggle]');
    const closeBtns = document.querySelectorAll('[data-mobile-drawer-close]');
    if (toggleBtn && drawer) {
        toggleBtn.addEventListener('click', function () {
            drawer.classList.add('active');
            toggleBtn.setAttribute('aria-expanded', 'true');
            document.body.style.overflow = 'hidden';
        });
    }
    if (closeBtns.length > 0) {
        closeBtns.forEach(btn => {
            btn.addEventListener('click', function () {
                if (drawer) {
                    drawer.classList.remove('active');
                    if (toggleBtn) {
                        toggleBtn.setAttribute('aria-expanded', 'false');
                    }
                    document.body.style.overflow = '';
                }
            });
        });
    }
    if (drawer) {
        drawer.addEventListener('click', function (e) {
            const clickedElement = e.target;
            const link = clickedElement.closest('.header__mobile-menu-link');
            const arrow = clickedElement.closest('.header__mobile-menu-arrow');
            const targetLink = arrow ? arrow.closest('.header__mobile-menu-link') : link;
            if (!targetLink) return;
            const menuItem = targetLink.closest('.header__mobile-menu-item--has-children');
            if (!menuItem) return;
            const childrenList = menuItem.querySelector('.header__mobile-menu-children, .header__mobile-menu-children2');
            if (!childrenList) return;
            const hasArrow = targetLink.querySelector('.header__mobile-menu-arrow');

            if (hasArrow || arrow) {
                e.preventDefault();
                e.stopPropagation();

                const isActive = menuItem.classList.contains('active');

                if (isActive) {
                    menuItem.classList.remove('active');
                } else {
                    const isNestedMenu = childrenList.classList.contains('header__mobile-menu-children2');
                    const parentChildren = menuItem.closest('.header__mobile-menu-children');
                    if (isNestedMenu && parentChildren) {
                        const siblingItems = parentChildren.querySelectorAll('li.header__mobile-menu-item--has-children.active');
                        siblingItems.forEach(siblingItem => {
                            if (siblingItem !== menuItem) {
                                siblingItem.classList.remove('active');
                            }
                        });
                    }
                    menuItem.classList.add('active');
                }
            }
        });
    }
    const menuItems = document.querySelectorAll('.header__menu-item--has-dropdown, .header__menu-item');

    menuItems.forEach(item => {
        const link = item.querySelector('.header__menu-link');
        const dropdown = item.querySelector('.header__mega-menu, .header__dropdown-menu');

        if (link && dropdown && window.innerWidth <= 768) {
            link.addEventListener('click', function (e) {
                e.preventDefault();
                const isActive = item.classList.contains('active');
                menuItems.forEach(otherItem => {
                    if (otherItem !== item) {
                        otherItem.classList.remove('active');
                    }
                });
                if (isActive) {
                    item.classList.remove('active');
                } else {
                    item.classList.add('active');
                }
            });
        }
    });
    document.addEventListener('click', function (e) {
        if (!e.target.closest('.header__menu-item')) {
            menuItems.forEach(item => {
                item.classList.remove('active');
            });
        }
    });
    const searchPopup = document.querySelector('[data-search-popup]');
    const searchToggles = document.querySelectorAll('[data-search-toggle]');
    const searchCloses = document.querySelectorAll('[data-search-close]');
    const searchInput = document.querySelector('[data-search-input]');
    const searchForm = document.querySelector('.header__search-popup-form');
    const recentSearchesContainer = document.querySelector('[data-recent-searches-container]');
    const clearAllButton = document.querySelector('[data-clear-all-searches]');
    function saveSearchToHistory(searchTerm) {
        if (!searchTerm || searchTerm.trim() === '') return;

        const searchTermTrimmed = searchTerm.trim();
        let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        recentSearches = recentSearches.filter(term => term.toLowerCase() !== searchTermTrimmed.toLowerCase());
        recentSearches.unshift(searchTermTrimmed);
        recentSearches = recentSearches.slice(0, 5);

        localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
    }
    function removeSearchFromHistory(searchTerm) {
        let recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');
        recentSearches = recentSearches.filter(term => term.toLowerCase() !== searchTerm.toLowerCase());
        localStorage.setItem('recentSearches', JSON.stringify(recentSearches));
        loadRecentSearches();
    }
    function clearAllSearches() {
        localStorage.setItem('recentSearches', JSON.stringify([]));
        loadRecentSearches();
    }
    function loadRecentSearches() {
        if (!recentSearchesContainer) return;

        const recentSearches = JSON.parse(localStorage.getItem('recentSearches') || '[]');

        recentSearchesContainer.innerHTML = '';

        const trendingWrapper = document.querySelector('[data-trending-search-wrapper]');

        if (recentSearches.length === 0) {
            if (trendingWrapper) trendingWrapper.style.display = 'none';
            recentSearchesContainer.style.setProperty('display', 'none', 'important');
            if (clearAllButton) {
                clearAllButton.style.display = 'none';
            }
            return;
        }

        if (trendingWrapper) trendingWrapper.style.display = 'block';

        recentSearchesContainer.style.setProperty('display', 'flex', 'important');
        if (clearAllButton) {
            clearAllButton.style.display = 'block';
        }

        recentSearches.forEach(searchTerm => {
            const tagWrapper = document.createElement('div');
            tagWrapper.style.position = 'relative';
            tagWrapper.style.display = 'inline-block';

            const tag = document.createElement('button');
            tag.type = 'button';
            tag.className = 'header__search-trending-tag';
            tag.setAttribute('data-trending-search', searchTerm);
            tag.textContent = searchTerm;

            const closeBtn = document.createElement('button');
            closeBtn.type = 'button';
            closeBtn.className = 'header__search-trending-tag-close';
            closeBtn.setAttribute('aria-label', 'Remove ' + searchTerm);
            closeBtn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                removeSearchFromHistory(searchTerm);
            });

            tag.appendChild(closeBtn);
            tagWrapper.appendChild(tag);
            recentSearchesContainer.appendChild(tagWrapper);
            tag.addEventListener('click', function (e) {
                if (e.target.classList.contains('header__search-trending-tag-close')) {
                    return;
                }
                e.preventDefault();
                if (searchInput) {
                    searchInput.value = searchTerm;
                    const form = searchInput.closest('form');
                    if (form) {
                        saveSearchToHistory(searchTerm);
                        form.submit();
                    }
                }
            });
        });
    }

    if (searchPopup && searchToggles.length > 0) {
        searchToggles.forEach(toggle => {
            toggle.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                searchPopup.classList.add('active');
                document.body.style.overflow = 'hidden';
                loadRecentSearches();
                setTimeout(() => {
                    if (window.loadAllProducts) {
                        window.loadAllProducts();
                    }
                }, 300);
                if (searchInput) {
                    setTimeout(() => {
                        searchInput.focus();
                    }, 100);
                }
            });
        });
        searchCloses.forEach(close => {
            close.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                searchPopup.classList.remove('active');
                document.body.style.overflow = '';
            });
        });
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && searchPopup.classList.contains('active')) {
                searchPopup.classList.remove('active');
                document.body.style.overflow = '';
            }
        });
        if (searchForm) {
            searchForm.addEventListener('submit', function (e) {
                if (searchInput && searchInput.value.trim() !== '') {
                    saveSearchToHistory(searchInput.value);
                }
            });
        }
        if (searchInput) {
            const clearButton = document.querySelector('[data-search-clear]');
            let searchTimeout;

            searchInput.addEventListener('input', function (e) {
                const query = e.target.value.trim();

                if (clearButton) {
                    if (e.target.value.length > 0) {
                        clearButton.style.display = 'flex';
                    } else {
                        clearButton.style.display = 'none';
                    }
                }

                clearTimeout(searchTimeout);
                searchTimeout = setTimeout(() => {
                    if (query.length >= 2) {
                        if (window.loadRelatedProducts) {
                            window.loadRelatedProducts(query);
                        }
                    } else {
                        if (window.loadAllProducts) {
                            window.loadAllProducts();
                        }
                    }
                }, 300);
            });

            if (clearButton) {
                clearButton.addEventListener('click', function (e) {
                    e.preventDefault();
                    searchInput.value = '';
                    clearButton.style.display = 'none';
                    searchInput.focus();
                    if (window.loadAllProducts) {
                        window.loadAllProducts();
                    }
                });
            }
        }
        if (clearAllButton) {
            clearAllButton.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                clearAllSearches();
            });
        }
        if (searchPopup && searchPopup.classList.contains('active')) {
            loadRecentSearches();
        }
        const urlParams = new URLSearchParams(window.location.search);
        const searchQuery = urlParams.get('q');
        if (searchQuery && searchQuery.trim() !== '') {
            saveSearchToHistory(searchQuery);
        }
    }
});

(function () {
    'use strict';
    window.loadRelatedProducts = async function (searchQuery) {
        const productsContainer = document.querySelector('[data-search-related-products]');
        const popularWrapper = document.querySelector('[data-popular-products-wrapper]');
        const popularTitle = document.querySelector('[data-popular-products-title]');
        const searchPopup = document.querySelector('[data-search-popup]');
        if (!productsContainer) return;

        // Show Skeleton
        productsContainer.innerHTML = '';
        for (let i = 0; i < 6; i++) {
            productsContainer.innerHTML += `
                <div class="header__search-product swiper-slide skeleton">
                    <div class="skeleton-image"></div>
                    <div class="skeleton-info">
                        <div class="skeleton-title"></div>
                        <div class="skeleton-price"></div>
                    </div>
                </div>
            `;
        }
        if (popularWrapper) popularWrapper.style.display = 'block';
        if (window.initPopularProductsSlider) window.initPopularProductsSlider();

        if (!searchQuery || searchQuery.trim().length < 2) {
            if (window.loadAllProducts) {
                window.loadAllProducts();
            }
            return;
        }

        if (popularTitle) {
            popularTitle.textContent = `Search results for "${searchQuery}"`;
        }

        try {
            const rootUrl = window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/';
            const cleanRootUrl = rootUrl.endsWith('/') ? rootUrl : rootUrl + '/';
            const activeCurrency = window.Shopify && window.Shopify.currency ? window.Shopify.currency.active : 'INR';
            const searchUrl = `${cleanRootUrl}search/suggest.json?q=${encodeURIComponent(searchQuery)}&resources[type]=product&resources[limit]=8&currency=${activeCurrency}`;

            const response = await fetch(searchUrl);
            if (!response.ok) {
                throw new Error(`Search failed: ${response.status}`);
            }
            const data = await response.json();

            if (data.resources && data.resources.results && data.resources.results.products) {
                const products = data.resources.results.products;

                if (products.length === 0) {
                    productsContainer.innerHTML = '<p style="text-align: center; width: 100%; padding: 20px;">No products found.</p>';
                    return;
                }

                if (popularWrapper) popularWrapper.style.display = 'block';
                productsContainer.innerHTML = '';

                const moneyFormat = searchPopup && searchPopup.dataset.moneyFormat ? searchPopup.dataset.moneyFormat : (window.Shopify ? window.Shopify.money_format : '$ {{amount}}');
                const formatMoneyFn = function (cents) {
                    if (cents === null || cents === undefined) return '';

                    let centsVal = cents;
                    // If cents is a string with a decimal (like "14.60"), convert to actual cents
                    if (typeof centsVal === 'string' && centsVal.includes('.')) {
                        centsVal = Math.round(parseFloat(centsVal.replace(/[^0-9.]/g, '')) * 100);
                    } else if (typeof centsVal === 'string') {
                        centsVal = parseInt(centsVal.replace(/[^0-9]/g, ''));
                    }

                    let formatted = '';
                    if (window.Shopify && window.Shopify.formatMoney) {
                        formatted = window.Shopify.formatMoney(centsVal);
                        if (formatted.includes('{{amount}}')) {
                            formatted = window.Shopify.formatMoney(centsVal, moneyFormat);
                        }
                    } else {
                        // Fallback manual formatting
                        let value = (centsVal / 100).toFixed(2);
                        formatted = moneyFormat.replace(/\{\{\s*amount\s*\}\}/, value).replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(centsVal / 100));
                    }

                    // Apply custom replacements for INR/EUR
                    if (window.Shopify && window.Shopify.currency) {
                        if (window.Shopify.currency.active === 'INR') {
                            formatted = formatted.replace(/Rs\.\s*/g, '₹').replace(/Rs\s*/g, '₹').replace(/\$/g, '₹').replace(/INR\s*/g, '₹');
                        } else if (window.Shopify.currency.active === 'EUR') {
                        formatted = formatted.replace('.', 'TEMP').replace(',', '.').replace('TEMP', ',');
                    }
                    } else if (formatted.match(/Rs\.|Rs|INR|\$/)) {
                        formatted = formatted.replace(/Rs\.\s*/g, '₹').replace(/Rs\s*/g, '₹').replace(/\$/g, '₹').replace(/INR\s*/g, '₹');
                    }

                    return formatted;
                };

                products.forEach(product => {
                    const productCard = document.createElement('a');
                    productCard.href = product.url;
                    productCard.className = 'header__search-product swiper-slide';

                    const imageUrl = product.image || product.featured_image || '';
                    const imageSrc = imageUrl ? (imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`) : '';
                    const priceFormatted = product.price ? formatMoneyFn(product.price) : '';
                    const comparePriceFormatted = product.compare_at_price ? formatMoneyFn(product.compare_at_price) : '';

                    productCard.innerHTML = `
            <img 
              src="${imageSrc || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect width=\'200\' height=\'200\' fill=\'%23f0f0f0\'/%3E%3C/svg%3E'}" 
              alt="${(product.title || '').replace(/"/g, '&quot;')}"
              class="header__search-product-image"
              loading="lazy"
              width="200"
              height="200"
              onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect width=\'200\' height=\'200\' fill=\'%23f0f0f0\'/%3E%3C/svg%3E'"
            >
            <div class="header__search-product-info">
              <p class="header__search-product-title">${product.title || ''}</p>
              ${priceFormatted ? `
                <div class="header__search-product-price">
                  ${priceFormatted}
                  ${product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) ? `
                    <span class="header__search-product-compare">${comparePriceFormatted}</span>
                  ` : ''}
                </div>
              ` : ''}
            </div>
          `;

                    productsContainer.appendChild(productCard);
                });

                setTimeout(() => {
                    if (window.initPopularProductsSlider) window.initPopularProductsSlider();
                }, 100);
            }
        } catch (error) {
            if (popularWrapper) popularWrapper.style.display = 'none';
        }
    }

    window.loadAllProducts = async function () {
    const productsContainer = document.querySelector('[data-search-related-products]');
    const popularWrapper = document.querySelector('[data-popular-products-wrapper]');
    const popularTitle = document.querySelector('[data-popular-products-title]');
    const searchPopup = document.querySelector('[data-search-popup]');
    if (!productsContainer) return;

    productsContainer.innerHTML = '';

    for (let i = 0; i < 6; i++) {
        productsContainer.innerHTML += `
            <div class="header__search-product swiper-slide skeleton">
                <div class="skeleton-image"></div>
                <div class="skeleton-info">
                    <div class="skeleton-title"></div>
                    <div class="skeleton-price"></div>
                </div>
            </div>
        `;
    }

    if (popularWrapper) popularWrapper.style.display = 'block';
    if (popularTitle) popularTitle.textContent = 'Popular Products';

    try {
        const searchTerm = searchPopup
            ? (searchPopup.getAttribute('data-popular-products-search-term') || '').trim()
            : '';

        const limit = searchPopup
            ? (parseInt(searchPopup.getAttribute('data-popular-products-count')) || 8)
            : 8;

        if (!searchTerm) {
            productsContainer.innerHTML = '';
            if (popularWrapper) popularWrapper.style.display = 'none';
            return;
        }

        const rootUrl = window.Shopify && window.Shopify.routes ? window.Shopify.routes.root : '/';
        const cleanRootUrl = rootUrl.endsWith('/') ? rootUrl : rootUrl + '/';
        const activeCurrency = window.Shopify && window.Shopify.currency ? window.Shopify.currency.active : 'INR';

        let products = [];

        // 1. First try as normal product search term
        const searchUrl = `${cleanRootUrl}search/suggest.json?q=${encodeURIComponent(searchTerm)}&resources[type]=product&resources[limit]=${limit}&currency=${activeCurrency}`;

        const searchResponse = await fetch(searchUrl);

        if (searchResponse.ok) {
            const searchData = await searchResponse.json();
            products = searchData.resources?.results?.products || [];
        }

        // 2. If no products found, try customizer text as collection handle
        // Example: "Ring For Her" becomes "ring-for-her"
        if (!products.length) {
            const collectionHandle = searchTerm
                .toLowerCase()
                .trim()
                .replace(/&/g, 'and')
                .replace(/[^a-z0-9]+/g, '-')
                .replace(/^-+|-+$/g, '');

            const collectionUrl = `${cleanRootUrl}collections/${collectionHandle}/products.json?limit=${limit}`;

            const collectionResponse = await fetch(collectionUrl);

            if (collectionResponse.ok) {
                const collectionData = await collectionResponse.json();

                products = (collectionData.products || []).map(product => {
                    const firstVariant = product.variants && product.variants.length ? product.variants[0] : null;
                    const image = product.images && product.images.length ? product.images[0].src : '';

                    return {
                        title: product.title,
                        url: `/products/${product.handle}`,
                        image: image,
                        featured_image: image,
                        price: firstVariant ? Math.round(parseFloat(firstVariant.price) * 100) : null,
                        compare_at_price: firstVariant && firstVariant.compare_at_price
                            ? Math.round(parseFloat(firstVariant.compare_at_price) * 100)
                            : null
                    };
                });
            }
        }

        if (!products.length) {
            productsContainer.innerHTML = `<p style="text-align:center;width:100%;padding:20px;">No popular products found.</p>`;
            return;
        }

        if (popularWrapper) popularWrapper.style.display = 'block';

        const moneyFormat = searchPopup && searchPopup.dataset.moneyFormat
            ? searchPopup.dataset.moneyFormat
            : (window.Shopify ? window.Shopify.money_format : '₹{{amount}}');

        const formatMoneyFn = function (cents) {
            if (cents === null || cents === undefined) return '';

            let centsVal = cents;

            if (typeof centsVal === 'string' && centsVal.includes('.')) {
                centsVal = Math.round(parseFloat(centsVal.replace(/[^0-9.]/g, '')) * 100);
            } else if (typeof centsVal === 'string') {
                centsVal = parseInt(centsVal.replace(/[^0-9]/g, ''));
            }

            let formatted = '';

            if (window.Shopify && window.Shopify.formatMoney) {
                formatted = window.Shopify.formatMoney(centsVal, moneyFormat);
            } else {
                let value = (centsVal / 100).toFixed(2);
                formatted = moneyFormat
                    .replace(/\{\{\s*amount\s*\}\}/, value)
                    .replace(/\{\{\s*amount_no_decimals\s*\}\}/, Math.round(centsVal / 100));
            }

            if (window.Shopify && window.Shopify.currency && window.Shopify.currency.active === 'INR') {
                formatted = formatted
                    .replace(/Rs\.\s*/g, '₹')
                    .replace(/Rs\s*/g, '₹')
                    .replace(/INR\s*/g, '₹');
            }

            return formatted;
        };

        productsContainer.innerHTML = '';

        products.forEach(product => {
            const productCard = document.createElement('a');
            productCard.href = product.url;
            productCard.className = 'header__search-product swiper-slide';

            const imageUrl = product.image || product.featured_image || '';
            const imageSrc = imageUrl
                ? (imageUrl.startsWith('http') ? imageUrl : `https:${imageUrl}`)
                : '';

            const priceFormatted = product.price ? formatMoneyFn(product.price) : '';
            const comparePriceFormatted = product.compare_at_price ? formatMoneyFn(product.compare_at_price) : '';

            productCard.innerHTML = `
                <img 
                    src="${imageSrc || 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect width=\'200\' height=\'200\' fill=\'%23f0f0f0\'/%3E%3C/svg%3E'}" 
                    alt="${(product.title || '').replace(/"/g, '&quot;')}"
                    class="header__search-product-image"
                    loading="lazy"
                    width="200"
                    height="200"
                    onerror="this.src='data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'200\' height=\'200\'%3E%3Crect width=\'200\' height=\'200\' fill=\'%23f0f0f0\'/%3E%3C/svg%3E'"
                >
                <div class="header__search-product-info">
                    <p class="header__search-product-title">${product.title || ''}</p>
                    ${priceFormatted ? `
                        <div class="header__search-product-price">
                            ${priceFormatted}
                            ${product.compare_at_price && parseFloat(product.compare_at_price) > parseFloat(product.price) ? `
                                <span class="header__search-product-compare">${comparePriceFormatted}</span>
                            ` : ''}
                        </div>
                    ` : ''}
                </div>
            `;

            productsContainer.appendChild(productCard);
        });

        setTimeout(() => {
            if (window.initPopularProductsSlider) window.initPopularProductsSlider();
        }, 100);

    } catch (error) {
        console.error('Popular products error:', error);
        productsContainer.innerHTML = `<p style="text-align:center;width:100%;padding:20px;">Popular products could not load.</p>`;
    }
};
    window.initPopularProductsSlider = function () {
        const swiperContainer = document.querySelector('.header__search-popular-slider-wrapper');
        if (!swiperContainer) return;

        if (window.popularProductsSwiper) {
            window.popularProductsSwiper.destroy(true, true);
        }

        const prevBtn = swiperContainer.querySelector('.header__search-popular-arrow--prev');
        const nextBtn = swiperContainer.querySelector('.header__search-popular-arrow--next');
        const slidesContainer = swiperContainer.querySelector('.swiper-wrapper');

        // Function to update arrow visibility based on slide count
        const updateArrowVisibility = () => {
            if (!slidesContainer || !prevBtn || !nextBtn) return;

            const slideCount = slidesContainer.querySelectorAll('.swiper-slide').length;
            const isMobile = window.innerWidth < 768;
            const slidesPerView = isMobile ? 2 : 6;

            // Show arrows only if there are more slides than can fit in view
            if (slideCount > slidesPerView) {
                prevBtn.style.display = 'flex';
                nextBtn.style.display = 'flex';
            } else {
                prevBtn.style.display = 'none';
                nextBtn.style.display = 'none';
            }
        };

        window.popularProductsSwiper = new Swiper(swiperContainer, {
            slidesPerView: 2,
            spaceBetween: 14,
            watchOverflow: true,
            navigation: {
                nextEl: nextBtn,
                prevEl: prevBtn,
            },
            breakpoints: {
                768: {
                    slidesPerView: 6,
                    spaceBetween: 14
                }
            },
            observer: true,
            observeParents: true,
            on: {
                init: function () {
                    updateArrowVisibility();
                },
                resize: function () {
                    updateArrowVisibility();
                }
            }
        });

        // Initial arrow visibility check
        updateArrowVisibility();

        // Update on window resize
        window.addEventListener('resize', updateArrowVisibility);
    }
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initPopularProductsSlider);
    } else {
        initPopularProductsSlider();
    }
    document.addEventListener('click', (e) => {
        if (e.target.closest('[data-search-toggle]')) {
            setTimeout(initPopularProductsSlider, 300);
        }
    });
})();
    function updateHeaderHeight() {
        const header = document.querySelector(".js-sticky-header");
        if (header) {
            document.documentElement.style.setProperty('--header-height', header.offsetHeight + 'px');
        }
    }

    document.addEventListener("scroll", function () {
        const header = document.querySelector(".js-sticky-header");
        if (!header) return;

        if (window.scrollY > 50) {
            header.classList.add("header_sticky");
        } else {
            header.classList.remove("header_sticky");
        }
    });

    window.addEventListener('resize', updateHeaderHeight);
    updateHeaderHeight();
    // Re-check after a short delay to account for layout shifts
    setTimeout(updateHeaderHeight, 500);
