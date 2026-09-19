
function setGridColumns(columns) {
    const productGrid = document.querySelector('.product-grid');
    const buttons = document.querySelectorAll('.grid-selector-btn');
    if (productGrid) {
        productGrid.style.setProperty('--grid-columns', columns);
    }
    buttons.forEach(btn => {
        if (btn.getAttribute('data-grid') == columns) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    localStorage.setItem('collectionGridColumns', columns);
}

// Support for collapsible filters
document.addEventListener('click', function (e) {
    const title = e.target.closest('.filter-title');
    if (title) {
        const parent = title.closest('.filter-group');
        if (parent) {
            parent.classList.toggle('active');
            const content = parent.querySelector('.filter-content');
            if (content) {
                if (parent.classList.contains('active')) {
                    content.style.display = 'block';
                } else {
                    content.style.display = 'none';
                }
            }
        }
    }
});

function toggleMetafieldFilter(el) {
    const url = new URL(window.location.href);
    let name, value;

    if (el.tagName === 'INPUT') {
        name = el.name;
        value = el.value;
    } else {
        name = el.getAttribute('data-name');
        value = el.getAttribute('data-value');
    }

    const params = url.searchParams.getAll(name);

    if (params.includes(value)) {
        // Remove value
        const newParams = params.filter(v => v !== value);
        url.searchParams.delete(name);
        newParams.forEach(v => url.searchParams.append(name, v));
    } else {
        // Add value
        url.searchParams.append(name, value);
    }

    window.location.href = url.toString();
}

function toggleTagFilter(tagHandle) {
    // Current URL parsing
    let currentPath = window.location.pathname;
    const searchParams = window.location.search;

    // Shopify collection path structure: /collections/handle/tags
    const pathParts = currentPath.split('/');
    const collectionsIndex = pathParts.indexOf('collections');

    if (collectionsIndex === -1) return; // Not a collection page

    const collectionHandle = pathParts[collectionsIndex + 1];
    let existingTags = [];

    if (pathParts.length > collectionsIndex + 2) {
        existingTags = pathParts[collectionsIndex + 2].split('+');
    }

    const tagIndex = existingTags.indexOf(tagHandle);

    if (tagIndex > -1) {
        // Remove tag
        existingTags.splice(tagIndex, 1);
    } else {
        // Add tag
        existingTags.push(tagHandle);
    }

    // Build new path
    let newPath = `/collections/${collectionHandle}`;
    if (existingTags.length > 0) {
        newPath += `/${existingTags.join('+')}`;
    }

    window.location.href = newPath + searchParams;
}

document.addEventListener('DOMContentLoaded', function () {
    const savedColumns = localStorage.getItem('collectionGridColumns');
    if (savedColumns) {
        setGridColumns(savedColumns);
    } else {
        const activeBtn = document.querySelector('.grid-selector-btn.active');
        if (activeBtn) {
            const defaultColumns = activeBtn.getAttribute('data-grid');
            const productGrid = document.querySelector('.product-grid');
            if (productGrid && defaultColumns) {
                productGrid.style.setProperty('--grid-columns', defaultColumns);
            }
        }
    }

    // Refresh display of any collapsible filters that aren't expandable by default
    document.querySelectorAll('.filter-group').forEach(group => {
        const content = group.querySelector('.filter-content');
        if (content) {
            if (group.classList.contains('active')) {
                content.style.display = 'block';
            } else {
                content.style.display = 'none';
            }
        }
    });

    // Restore Filter Sidebar state on Desktop
    if (window.innerWidth >= 992) {
        const sidebarActive = sessionStorage.getItem('filterSidebarActive') === 'true';
        if (sidebarActive) {
            const sidebar = document.querySelector('.collection-sidebar.is-drawer-mode');
            if (sidebar) {
                sidebar.classList.add('active');
                document.body.classList.add('sidebar-open');
            }
        }
    }
});

function updateSortBy(value) {
    const url = new URL(window.location.href);
    url.searchParams.set('sort_by', value);
    window.location.href = url.toString();
}

function openFilterDrawer() {
    if (window.innerWidth >= 992) {
        toggleDesktopSidebar();
        return;
    }

    const drawer = document.querySelector('.filter-drawer');
    const overlay = document.querySelector('.filter-drawer-overlay');

    if (drawer && overlay) {
        drawer.classList.add('active');
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';
    }
}

function toggleDesktopSidebar() {
    const sidebar = document.querySelector('.collection-sidebar.is-drawer-mode');

    if (sidebar) {
        sidebar.classList.toggle('active');
        const isActive = sidebar.classList.contains('active');
        document.body.classList.toggle('sidebar-open', isActive);
        // Persist the state in sessionStorage
        sessionStorage.setItem('filterSidebarActive', isActive);
    }
}

function closeFilterDrawer() {
    const drawer = document.querySelector('.filter-drawer');
    const overlay = document.querySelector('.filter-drawer-overlay');
    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}
function toggleSortDropdown() {
    const dropdown = document.querySelector('.mobile-sort-dropdown');
    const overlay = document.querySelector('.filter-drawer-overlay');
    if (dropdown && overlay) {
        const isOpen = dropdown.classList.contains('active');
        if (isOpen) {
            closeSortDropdown();
        } else {
            dropdown.classList.add('active');
            overlay.classList.add('active');
            document.body.style.overflow = 'hidden';
        }
    }
}
function closeSortDropdown() {
    const dropdown = document.querySelector('.mobile-sort-dropdown');
    const overlay = document.querySelector('.filter-drawer-overlay');
    if (dropdown) dropdown.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
    document.body.style.overflow = '';
}
document.addEventListener('click', function (e) {
    if (e.target.classList.contains('filter-drawer-overlay')) {
        closeSortDropdown();
    }
});
document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
        closeFilterDrawer();
        closeSortDropdown();
    }
});
