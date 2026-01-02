/**
 * Service responsible for handling navigation events and browser history.
 * @class NavigationService
 */
export class NavigationService {
    /**
     * Creates a new NavigationService instance.
     * @param {EventBus} eventBus - The event bus for communication.
     * @param {DocumentService} documentService - The document service.
     */
    constructor(eventBus, documentService) {
        /** @type {EventBus} */
        this.eventBus = eventBus;
        /** @type {DocumentService} */
        this.documentService = documentService;
        this.setupEventListeners();
    }

    /**
     * Sets up browser history and internal link event listeners.
     * @private
     */
    setupEventListeners() {
        window.addEventListener('popstate', async () => {
            const search = window.location.search;
            const hash = window.location.hash;
            const slug = (search === '' || search === '?') ?
                window._indexData.defaultPage :
                search.replace(/^\?/, '').split('#')[0];

            this.eventBus.emit('navigation:requested', { slug, hash });
        });

        document.addEventListener('click', async (e) => {
            const target = e.target.closest('a[data-internal="true"]');
            if (target) {
                e.preventDefault();
                const slug = target.href.split('?').pop();
                history.pushState(null, '', `?${slug}`);
                this.eventBus.emit('navigation:requested', { slug });
            }
        });
    }
}
