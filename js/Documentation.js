import { EventBus } from './EventBus.js';
import { IndexService } from './IndexService.js';
import { SearchService } from './SearchService.js';
import { DOMService } from './DOMService.js';
import { DocumentService } from './DocumentService.js';
import { NavigationService } from './NavigationService.js';

/**
 * Main documentation application class that orchestrates all services.
 * @class Documentation
 */
class Documentation {
    constructor() {
        /** @type {EventBus} */
        this.eventBus = new EventBus();
        /** @type {IndexService} */
        this.indexService = new IndexService();
        /** @type {SearchService} */
        this.searchService = new SearchService(this.eventBus, this.indexService);
        /** @type {DOMService} */
        this.domService = new DOMService(this.eventBus);
        /** @type {DocumentService} */
        this.documentService = new DocumentService(this.eventBus, this.indexService);
        /** @type {NavigationService} */
        this.navigationService = new NavigationService(this.eventBus, this.documentService);
        /** @type {IndexData|null} */
        this.indexData = null;

        this.setupEventListeners();
        this.setupKeyboardShortcuts();
    }

    /**
     * Loads a custom CSS file if specified in the index.json.
     * @param {string} customCSSPath - Path to the custom CSS file relative to document root.
     */
    loadCustomCSS(customCSSPath) {
        if (!customCSSPath) return;

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.type = 'text/css';
        link.href = customCSSPath;
        document.head.appendChild(link);
    }

    /**
     * Sets up application-wide event listeners.
     * @private
     */
    setupEventListeners() {
        this.eventBus.on('navigation:requested', async ({ slug, hash }) => {
            slug = slug.replace(/^[?=]/, '');
            await this.loadDocumentBySlug(slug, hash);
        });

        this.eventBus.on('document:load', async ({ path }) => {
            await this.loadDocument(path);
        });

        window.addEventListener('load', () => {
            this.domService.setupMobileMenu();
            this.initialize();
        });

        document.addEventListener('click', async (e) => {
            const target = e.target.closest('a[data-internal="true"]');
            if (target) {
                e.preventDefault();
                const slug = target.href.split('?').pop();
                history.pushState(null, '', target.href);
                await this.loadDocumentBySlug(slug);
            }
        });
    }

    /**
     * Sets up keyboard shortcuts for navigation and search.
     * @private
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            const isTyping = ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName) ||
                document.activeElement.isContentEditable;

            if (this.isSearchShortcut(e) && !isTyping) {
                e.preventDefault();
                this.focusSearch();
            }

            if ((e.key === 'ArrowUp' || e.key === 'ArrowDown') && e.altKey && !isTyping) {
                e.preventDefault();
                this.navigatePages(e.key === 'ArrowDown' ? 1 : -1);
            }
        });
    }

    /**
     * Checks if the key event is a search shortcut.
     * @param {KeyboardEvent} e - The keyboard event.
     * @returns {boolean} True if it's a search shortcut.
     * @private
     */
    isSearchShortcut(e) {
        return ((e.key === 's' || e.key === 'S') && !e.ctrlKey && !e.metaKey &&
            (!e.altKey || (e.altKey && (e.key === 's' || e.key === 'S'))));
    }

    /**
     * Focuses the search input and opens mobile sidebar if needed.
     * @private
     */
    focusSearch() {
        const searchInput = document.getElementById('search-input');
        if (searchInput) {
            searchInput.focus();

            const leftSidebar = document.querySelector('.left-sidebar');
            const menuButton = document.querySelector('.menu-button');
            if (window.innerWidth <= 1000 && leftSidebar && !leftSidebar.classList.contains('show')) {
                leftSidebar.classList.add('show');
                if (menuButton) {
                    menuButton.setAttribute('aria-expanded', 'true');
                }
            }
        }
    }

    /**
     * Navigates to the next or previous page in the file index.
     * @param {number} direction - 1 for next, -1 for previous.
     * @private
     */
    navigatePages(direction) {
        const fileLinks = Array.from(document.querySelectorAll('#file-index a'));
        if (fileLinks.length === 0) return;

        const activeLink = document.querySelector('#file-index a.active');
        if (!activeLink) return;

        const activeIndex = fileLinks.indexOf(activeLink);
        if (activeIndex === -1) return;

        let targetIndex;
        if (direction === 1) {
            targetIndex = activeIndex < fileLinks.length - 1 ? activeIndex + 1 : 0;
        } else {
            targetIndex = activeIndex > 0 ? activeIndex - 1 : fileLinks.length - 1;
        }

        const targetLink = fileLinks[targetIndex];
        if (targetLink) {
            targetLink.click();
            targetLink.scrollIntoView({ block: 'nearest' });
        }
    }

    /**
     * Initializes the documentation application.
     * @returns {Promise<void>}
     */
    async initialize() {
        try {
            const response = await fetch('index.json');
            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            this.indexData = data;
            window._indexData = data;

            if (data.customCSS) {
                this.loadCustomCSS(data.customCSS);
            }

            this.searchService.buildSearchIndex(this.indexData.documents);
            this.domService.setupSearch(this.searchService);

            this.populateAuthorInfo(data.author);
            window.originalDocTitle = data.metadata.site_name || 'Documentation';
            document.title = window.originalDocTitle;

            this.domService.elements.fileIndex.innerHTML = '';
            this.indexData.documents.forEach(doc =>
                this.domService.createFileIndexItem(doc, this.domService.elements.fileIndex));

            const search = window.location.search;
            const slug = search === '' || search === '?'
                ? this.indexData.defaultPage
                : search.replace(/^\?/, '');

            await this.loadDocumentBySlug(slug);

            if (window.location.hash) {
                setTimeout(() => {
                    const element = document.getElementById(window.location.hash.slice(1));
                    if (element) this.domService.scrollToElement(element);
                }, 100);
            }
        } catch (error) {
            this.domService.setError(`Failed to load documentation index: ${error.message}`);
        }
    }

    /**
     * Populates the author information in the sidebar.
     * @param {Author} author - The author data.
     */
    populateAuthorInfo(author) {
        const subtitleName = document.querySelector('.name');
        const subtitleRole = document.querySelector('.role');
        if (!subtitleName || !subtitleRole) return;

        subtitleName.textContent = author.name || '';
        subtitleRole.textContent = author.role || '';

        const socials = document.querySelector('.social-links');
        if (socials) {
            socials.innerHTML = '';
            if (author.socials) {
                author.socials.forEach(s => {
                    const link = document.createElement('a');
                    link.href = s.url;
                    link.target = '_blank';
                    link.title = s.title;
                    link.innerHTML = `<i class="${s.icon}"></i>`;
                    socials.appendChild(link);
                });
            }
        }
    }

    /**
     * Loads a document by its slug.
     * @param {string} slug - The document slug.
     * @param {string} [hash] - Optional hash for scrolling to a section.
     * @returns {Promise<void>}
     */
    async loadDocumentBySlug(slug, hash) {
        const [baseSlug] = slug.split('#');
        const doc = this.indexService.findDocumentBySlug(this.indexData.documents, baseSlug);

        if (!doc) {
            this.domService.setError(`Document not found: ${baseSlug}`);
            return;
        }

        if (doc.type === 'folder') {
            if (doc.path) {
                await this.loadDocument(doc.path, hash);
            } else if (doc.items?.length > 0) {
                await this.loadDocument(doc.items[0].path, hash);
            } else {
                this.domService.setError('This folder is empty.');
            }
            return;
        }

        await this.loadDocument(doc.path, hash);
    }

    /**
     * Loads and renders a document from a path.
     * @param {string} path - The document path.
     * @param {string} [hash] - Optional hash for scrolling to a section.
     * @param {boolean} [fromSearch=false] - Whether navigation came from search.
     * @returns {Promise<void>}
     */
    async loadDocument(path, hash, fromSearch = false) {
        try {
            const { content, metadata, marked, title } = await this.documentService.loadDocument(path);

            this.domService.setTitle(title);
            this.domService.setContent(marked.parse(content));
            this.domService.updateActiveDocument(path);

            const headings = document.querySelectorAll('h2, h3, h4, h5, h6');
            const headingLinks = this.domService.createOutline(headings);

            headings.forEach(heading => {
                heading.addEventListener('click', (e) => {
                    if (e.target.closest('svg') || e.target.closest('.header-anchor')) return;

                    const id = heading.id;
                    if (id) {
                        history.pushState(null, '', `${window.location.pathname}${window.location.search}#${id}`);
                        this.domService.scrollToElement(heading);
                        heading.classList.remove('highlight');
                        void heading.offsetWidth;
                        heading.classList.add('highlight');
                    }
                });
            });

            this.setupScrollObserver(headings, headingLinks);

            window._currentPath = path;

            if (hash) {
                const element = document.getElementById(hash.slice(1));
                if (element) {
                    const delay = fromSearch ? 300 : 100;
                    setTimeout(() => {
                        this.domService.scrollToElement(element);
                        element.classList.remove('highlight');
                        void element.offsetWidth;
                        element.classList.add('highlight');
                    }, delay);
                }
            } else {
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        } catch (error) {
            this.domService.setError('Error loading document. Please try again.');
        }
    }

    /**
     * Sets up an intersection observer for outline highlighting.
     * @param {NodeListOf<HTMLHeadingElement>} headings - The heading elements.
     * @param {Map<HTMLHeadingElement, HTMLAnchorElement>} headingLinks - Map of headings to links.
     * @returns {IntersectionObserver} The created observer.
     * @private
     */
    setupScrollObserver(headings, headingLinks) {
        const observer = new IntersectionObserver(
            (entries) => {
                const visibleHeadings = entries
                    .filter(entry => entry.isIntersecting)
                    .sort((a, b) => a.target.offsetTop - b.target.offsetTop);

                if (visibleHeadings.length) {
                    this.domService.elements.outline
                        .querySelectorAll('a')
                        .forEach(a => a.classList.remove('active'));

                    const link = headingLinks.get(visibleHeadings[0].target);
                    if (link) link.classList.add('active');
                }
            },
            {
                rootMargin: '-48px 0px -60% 0px',
                threshold: [0, 0.25, 0.5, 0.75, 1]
            }
        );

        headings.forEach(heading => observer.observe(heading));
        return observer;
    }
}

/**
 * @typedef {Object} IndexData
 * @property {string} defaultPage - The default page slug.
 * @property {Object} metadata - Site metadata.
 * @property {Author} author - Author information.
 * @property {Array<Document>} documents - The document tree.
 * @property {string} [customCSS] - Optional custom CSS path.
 */

/**
 * @typedef {Object} Author
 * @property {string} [name] - Author name.
 * @property {string} [role] - Author role.
 * @property {Array<Social>} [socials] - Social media links.
 */

/**
 * @typedef {Object} Social
 * @property {string} url - The social media URL.
 * @property {string} title - The link title.
 * @property {string} icon - The Font Awesome icon class.
 */

window.originalDocTitle = document.title;
const docs = new Documentation();

// Expose to global scope for console access
window.docs = docs;
