/**
 * Service responsible for DOM manipulation and UI rendering.
 * @class DOMService
 */
export class DOMService {
    /**
     * Creates a new DOMService instance.
     * @param {EventBus} eventBus - The event bus for communication.
     */
    constructor(eventBus) {
        /** @type {EventBus} */
        this.eventBus = eventBus;
        
        /** @type {DOMElements} */
        this.elements = {
            content: document.getElementById('document-content'),
            outline: document.getElementById('document-outline'),
            fileIndex: document.getElementById('file-index'),
            titleText: document.querySelector('.title-text .page-title'),
            leftSidebar: document.querySelector('.left-sidebar'),
            menuButton: document.querySelector('.menu-button'),
            header: document.querySelector('title-bar'),
            searchInput: document.getElementById('search-input'),
            searchResults: document.getElementById('search-results'),
            clearSearch: document.getElementById('clear-search')
        };
        
        /** @type {number} */
        this.headerOffset = 60;
    }

    /**
     * Sets up the mobile menu toggle functionality.
     */
    setupMobileMenu() {
        this.elements.menuButton.addEventListener('click', () => {
            const isExpanded = this.elements.leftSidebar.classList.toggle('show');
            this.elements.menuButton.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            
            if (isExpanded) {
                this.enableFocusTrap();
            } else {
                this.disableFocusTrap();
            }
        });

        this.elements.content.addEventListener('click', () => {
            this.elements.leftSidebar.classList.remove('show');
            this.elements.menuButton.setAttribute('aria-expanded', 'false');
            this.disableFocusTrap();
        });
    }

    /**
     * Enables focus trap within the mobile sidebar.
     * @private
     */
    enableFocusTrap() {
        this.focusTrapHandler = (e) => {
            if (window.innerWidth > 1000) return;
            if (!this.elements.leftSidebar.classList.contains('show')) return;

            const focusableElements = this.elements.leftSidebar.querySelectorAll(
                'a[href], button, input, [tabindex]:not([tabindex="-1"])'
            );
            const firstFocusable = focusableElements[0];
            const lastFocusable = focusableElements[focusableElements.length - 1];

            if (e.key === 'Tab') {
                if (e.shiftKey && document.activeElement === firstFocusable) {
                    e.preventDefault();
                    lastFocusable.focus();
                } else if (!e.shiftKey && document.activeElement === lastFocusable) {
                    e.preventDefault();
                    firstFocusable.focus();
                }
            }

            if (e.key === 'Escape') {
                this.elements.leftSidebar.classList.remove('show');
                this.elements.menuButton.setAttribute('aria-expanded', 'false');
                this.elements.menuButton.focus();
                this.disableFocusTrap();
            }
        };

        document.addEventListener('keydown', this.focusTrapHandler);
        
        const firstFocusable = this.elements.leftSidebar.querySelector(
            'a[href], button, input, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
            firstFocusable.focus();
        }
    }

    /**
     * Disables the focus trap.
     * @private
     */
    disableFocusTrap() {
        if (this.focusTrapHandler) {
            document.removeEventListener('keydown', this.focusTrapHandler);
            this.focusTrapHandler = null;
        }
    }

    /**
     * Sets the main content area HTML.
     * @param {string} html - The HTML content to render.
     */
    setContent(html) {
        this.elements.content.innerHTML = html;
        this.elements.content.className = 'markdown-content';
        hljs.highlightAll();
    }

    /**
     * Sets the document title and page title display.
     * @param {string} title - The title to set.
     */
    setTitle(title) {
        document.title = `${window.originalDocTitle} / ${title}`;
        this.elements.titleText.textContent = title;
    }

    /**
     * Displays an error message in the content area.
     * @param {string} message - The error message to display.
     */
    setError(message) {
        this.elements.content.innerHTML = `<div class="error">${message}</div>`;
    }

    /**
     * Creates a file index item (folder or file) in the sidebar.
     * @param {Document} doc - The document to create an item for.
     * @param {HTMLElement} container - The container element to append to.
     * @param {number} [level=0] - The nesting level for indentation.
     */
    createFileIndexItem(doc, container, level = 0) {
        if (doc.type === 'folder') {
            this.createFolderItem(doc, container, level);
        } else {
            this.createFileItem(doc, container, level);
        }
    }

    /**
     * Creates a folder item in the sidebar.
     * @param {Document} doc - The folder document.
     * @param {HTMLElement} container - The container element.
     * @param {number} level - The nesting level.
     * @private
     */
    createFolderItem(doc, container, level) {
        const folderDiv = document.createElement('div');
        const isOpen = doc.defaultOpen === true;
        folderDiv.className = 'folder' + (isOpen ? ' open' : '');
        folderDiv.dataset.path = doc.title;
        folderDiv.style.paddingLeft = `${level * 0.8}rem`;

        const folderHeader = document.createElement('div');
        folderHeader.className = 'folder-header';
        folderHeader.setAttribute('role', 'treeitem');
        folderHeader.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
        folderHeader.setAttribute('tabindex', '0');
        
        const iconClass = doc.icon || `fas fa-folder${isOpen ? '-open' : ''}`;

        if (doc.path && doc.metadata?.showfolderpage !== false) {
            folderHeader.innerHTML = this.createFolderHeaderWithFile(iconClass, doc);
            this.setupFolderListeners(folderDiv, folderHeader, doc);
        } else {
            folderHeader.innerHTML = this.createFolderHeaderBasic(iconClass, doc);
            this.setupBasicFolderListeners(folderDiv, folderHeader, doc);
        }

        const folderContent = document.createElement('div');
        folderContent.className = 'folder-content';
        doc.items.forEach(item => this.createFileIndexItem(item, folderContent, level + 1));

        folderDiv.appendChild(folderHeader);
        folderDiv.appendChild(folderContent);
        container.appendChild(folderDiv);
    }

    /**
     * Sets up listeners for basic folder toggle (no folder page).
     * @param {HTMLElement} folderDiv - The folder container element.
     * @param {HTMLElement} folderHeader - The folder header element.
     * @param {Document} doc - The folder document.
     * @private
     */
    setupBasicFolderListeners(folderDiv, folderHeader, doc) {
        folderHeader.addEventListener('click', () => {
            folderDiv.classList.toggle('open');
            const isExpanded = folderDiv.classList.contains('open');
            folderHeader.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            if (!doc.icon) {
                const icon = folderHeader.querySelector('.folder-icon');
                icon.classList.toggle('fa-folder-closed');
                icon.classList.toggle('fa-folder-open');
            }
        });

        folderHeader.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                folderHeader.click();
            }
        });
    }

    /**
     * Creates a file item link in the sidebar.
     * @param {Document} doc - The file document.
     * @param {HTMLElement} container - The container element.
     * @param {number} level - The nesting level.
     * @private
     */
    createFileItem(doc, container, level) {
        const link = document.createElement('a');
        link.href = `?${doc.slug}`;
        link.textContent = doc.title || doc.path.split('/').pop().replace('.md', '');
        link.dataset.path = doc.path;
        link.dataset.slug = doc.slug;
        link.style.paddingLeft = `${(level * 0.6) + 0.8}rem`;
        link.setAttribute('role', 'treeitem');

        link.onclick = (e) => {
            e.preventDefault();
            this.setLinkLoading(link);
            this.eventBus.emit('navigation:requested', { slug: doc.slug });
            history.pushState(null, '', link.href);
            if (window.innerWidth <= 1000) {
                this.elements.leftSidebar.classList.remove('show');
            }
        };

        container.appendChild(link);
    }

    /**
     * Sets a link to loading state.
     * @param {HTMLAnchorElement} link - The link element.
     */
    setLinkLoading(link) {
        this.clearAllLoading();
        link.classList.add('loading');
    }

    /**
     * Clears loading state from all links.
     */
    clearAllLoading() {
        this.elements.fileIndex.querySelectorAll('a.loading, .folder-link.loading').forEach(link => {
            link.classList.remove('loading');
        });
    }

    /**
     * Updates the active document highlight in the sidebar.
     * @param {string} path - The path of the active document.
     */
    updateActiveDocument(path) {
        this.clearAllLoading();
        this.elements.fileIndex.querySelectorAll('a').forEach(link => {
            const isActive = link.dataset.path === path;
            link.classList.toggle('active', isActive);
            if (isActive) {
                link.setAttribute('aria-current', 'page');
            } else {
                link.removeAttribute('aria-current');
            }
        });
    }

    /**
     * Creates the document outline from headings.
     * @param {NodeListOf<HTMLHeadingElement>} headings - The heading elements.
     * @returns {Map<HTMLHeadingElement, HTMLAnchorElement>} Map of headings to their outline links.
     */
    createOutline(headings) {
        this.elements.outline.innerHTML = '';
        const headingLinks = new Map();

        headings.forEach(heading => {
            if (!heading.id) {
                heading.id = heading.textContent.toLowerCase()
                    .replace(/[^\w\s-]/g, '')
                    .replace(/\s+/g, '-');
            }

            const link = this.createOutlineLink(heading);
            headingLinks.set(heading, link);
            this.elements.outline.appendChild(link);
            this.addHeadingFoldToggle(heading);
        });

        return headingLinks;
    }

    /**
     * Creates HTML for a folder header with a file link.
     * @param {string} iconClass - The icon CSS class.
     * @param {Document} doc - The folder document.
     * @returns {string} The HTML string.
     * @private
     */
    createFolderHeaderWithFile(iconClass, doc) {
        const showFolderPage = doc.showfolderpage !== 'false';
        return `
            <div class="folder-icons">
                <i class="${iconClass} folder-icon" aria-hidden="true"></i>
            </div>
            <span>${doc.title}</span>
            ${showFolderPage ? `
                <a href="?${doc.slug}" class="folder-link" title="View folder page" aria-label="View ${doc.title} folder page">
                    <i class="fas fa-file-alt" aria-hidden="true"></i>
                </a>` : ''}`;
    }

    /**
     * Creates HTML for a basic folder header without file link.
     * @param {string} iconClass - The icon CSS class.
     * @param {Document} doc - The folder document.
     * @returns {string} The HTML string.
     * @private
     */
    createFolderHeaderBasic(iconClass, doc) {
        return `
            <div class="folder-icons">
                <i class="${iconClass} folder-icon" aria-hidden="true"></i>
            </div>
            <span>${doc.title}</span>`;
    }

    /**
     * Sets up event listeners for a folder with a navigable page.
     * @param {HTMLElement} folderDiv - The folder container element.
     * @param {HTMLElement} folderHeader - The folder header element.
     * @param {Document} doc - The folder document.
     * @private
     */
    setupFolderListeners(folderDiv, folderHeader, doc) {
        folderHeader.addEventListener('click', (e) => {
            if (e.target.closest('.folder-link')) {
                e.preventDefault();
                const folderLink = e.target.closest('.folder-link');
                this.setFolderLinkLoading(folderLink);
                this.eventBus.emit('navigation:requested', { slug: doc.slug });
                history.pushState(null, '', `?${doc.slug}`);
                if (window.innerWidth <= 1000) {
                    this.elements.leftSidebar.classList.remove('show');
                }
                return;
            }

            folderDiv.classList.toggle('open');
            const isExpanded = folderDiv.classList.contains('open');
            folderHeader.setAttribute('aria-expanded', isExpanded ? 'true' : 'false');
            if (!doc.icon) {
                const icon = folderHeader.querySelector('.folder-icon');
                icon.classList.toggle('fa-folder-closed');
                icon.classList.toggle('fa-folder-open');
            }
        });

        folderHeader.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                if (e.target.closest('.folder-link')) {
                    e.target.closest('.folder-link').click();
                } else {
                    folderHeader.click();
                }
            }
        });
    }

    /**
     * Sets a folder link to loading state.
     * @param {HTMLAnchorElement} link - The folder link element.
     */
    setFolderLinkLoading(link) {
        this.clearAllLoading();
        link.classList.add('loading');
    }

    /**
     * Scrolls smoothly to an element with header offset.
     * @param {HTMLElement} element - The element to scroll to.
     */
    scrollToElement(element) {
        if (!element) return;
        const rect = element.getBoundingClientRect();
        const absoluteElementTop = rect.top + window.scrollY;
        const middle = absoluteElementTop - (this.headerOffset + 20);

        window.scrollTo({
            top: middle,
            behavior: 'smooth'
        });
    }

    /**
     * Creates an outline link for a heading.
     * @param {HTMLHeadingElement} heading - The heading element.
     * @returns {HTMLAnchorElement} The created link element.
     * @private
     */
    createOutlineLink(heading) {
        const link = document.createElement('a');
        link.href = `${window.location.pathname}${window.location.search}#${heading.id}`;
        link.textContent = heading.textContent;
        link.style.paddingLeft = (heading.tagName[1] * 15) + 'px';

        link.onclick = (e) => {
            e.preventDefault();
            history.pushState(null, '', link.href);
            this.scrollToElement(heading);
            heading.classList.remove('highlight');
            void heading.offsetWidth;
            heading.classList.add('highlight');
        };

        return link;
    }

    /**
     * Adds a fold/unfold toggle button to a heading.
     * @param {HTMLHeadingElement} heading - The heading element.
     * @private
     */
    addHeadingFoldToggle(heading) {
        const toggleBtn = document.createElement('span');
        toggleBtn.innerHTML = `<svg width="10" height="10" viewBox="0 0 10 10" style="transform: rotate(90deg); transition: transform 0.2s;">
            <path d="M3 2L7 5L3 8" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>`;
        toggleBtn.style.cursor = 'pointer';
        toggleBtn.style.userSelect = 'none';
        toggleBtn.style.marginLeft = '0.5em';
        toggleBtn.style.display = 'inline-flex';
        toggleBtn.style.alignItems = 'center';

        toggleBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const svg = toggleBtn.querySelector('svg');
            const isFolded = svg.style.transform === 'rotate(90deg)';
            svg.style.transform = isFolded ? 'rotate(0deg)' : 'rotate(90deg)';

            let next = heading.nextElementSibling;
            const currentLevel = parseInt(heading.tagName[1]);

            while (next) {
                if (!/^H[1-6]$/.test(next.tagName)) {
                    next.style.display = isFolded ? 'none' : '';
                    next = next.nextElementSibling;
                } else {
                    const nextLevel = parseInt(next.tagName[1]);
                    if (nextLevel <= currentLevel) break;
                    next.style.display = isFolded ? 'none' : '';
                    next = next.nextElementSibling;
                }
            }
        });

        heading.appendChild(toggleBtn);
    }

    /**
     * Sets up search input event handlers.
     * @param {SearchService} searchService - The search service instance.
     */
    setupSearch(searchService) {
        let searchTimeout;

        this.elements.searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            const query = e.target.value;

            searchTimeout = setTimeout(() => {
                const results = searchService.search(query);
                this.renderSearchResults(results);
            }, 200);
        });

        this.elements.clearSearch.addEventListener('click', () => {
            this.elements.searchInput.value = '';
            this.elements.searchResults.innerHTML = '';
            this.elements.searchResults.style.display = 'none';
            this.elements.searchResults.setAttribute('aria-hidden', 'true');
        });
    }

    /**
     * Renders search results in the dropdown.
     * @param {Array<SearchResult>} results - The search results to render.
     */
    renderSearchResults(results) {
        const container = this.elements.searchResults;
        container.innerHTML = '';

        if (results.length === 0 || !this.elements.searchInput.value) {
            container.style.display = 'none';
            container.setAttribute('aria-hidden', 'true');
            return;
        }

        container.setAttribute('aria-hidden', 'false');
        const resultCount = results.length === 1 ? '1 search result found' : `${results.length} search results found`;
        container.setAttribute('aria-label', resultCount);

        results.forEach(result => {
            const div = document.createElement('div');
            div.className = 'search-result';

            const icon = document.createElement('i');
            icon.className = result.type === 'folder' ? 'fas fa-folder' :
                result.type === 'header' ? 'fas fa-hashtag' : 'fas fa-file-alt';

            const link = document.createElement('a');
            link.href = `?${result.slug}`;
            link.innerHTML = `
                ${icon.outerHTML}
                <div class="search-result-content">
                    <div class="search-result-title">${result.title}</div>
                    <div class="search-result-path">${result.location}</div>
                </div>
            `;

            link.addEventListener('click', (e) => {
                e.preventDefault();
                this.elements.searchInput.value = '';
                container.style.display = 'none';
                const [baseSlug, hash] = result.slug.split('#');
                history.pushState(null, '', link.href);
                this.eventBus.emit('navigation:requested', {
                    slug: baseSlug,
                    hash: hash ? `#${hash}` : '',
                    fromSearch: true
                });
            });

            div.appendChild(link);
            container.appendChild(div);
        });

        container.style.display = 'block';
    }
}

/**
 * @typedef {Object} DOMElements
 * @property {HTMLElement} content - The main content container.
 * @property {HTMLElement} outline - The document outline container.
 * @property {HTMLElement} fileIndex - The file index container.
 * @property {HTMLElement} titleText - The page title element.
 * @property {HTMLElement} leftSidebar - The left sidebar element.
 * @property {HTMLElement} menuButton - The mobile menu button.
 * @property {HTMLElement} header - The header element.
 * @property {HTMLInputElement} searchInput - The search input field.
 * @property {HTMLElement} searchResults - The search results container.
 * @property {HTMLElement} clearSearch - The clear search button.
 */
