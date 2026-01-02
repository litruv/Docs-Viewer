/**
 * Service responsible for building and querying the search index.
 * @class SearchService
 */
export class SearchService {
    /**
     * Creates a new SearchService instance.
     * @param {EventBus} eventBus - The event bus for communication.
     * @param {IndexService} indexService - The index service for document lookups.
     */
    constructor(eventBus, indexService) {
        /** @type {EventBus} */
        this.eventBus = eventBus;
        /** @type {IndexService} */
        this.indexService = indexService;
        /** @type {Array<SearchIndexItem>} */
        this.searchIndex = [];
        /** @type {Map<string, Array<SearchResult>>} */
        this.searchCache = new Map();
        /** @type {number} */
        this.cacheMaxSize = 50;
    }

    /**
     * Builds the search index from a list of documents.
     * @param {Array<Document>} documents - The documents to index.
     */
    buildSearchIndex(documents) {
        this.searchIndex = [];
        this.searchCache.clear();
        this.processDocuments(documents);
    }

    /**
     * Recursively processes documents and adds them to the search index.
     * @param {Array<Document>} documents - The documents to process.
     * @param {string} [parentPath=''] - The parent path for breadcrumb display.
     * @private
     */
    processDocuments(documents, parentPath = '') {
        documents.forEach(doc => {
            if (doc.type === 'folder') {
                this.processFolderDocument(doc, parentPath);
            } else {
                this.processFileDocument(doc, parentPath);
            }
        });
    }

    /**
     * Processes a folder document and its children.
     * @param {Document} doc - The folder document to process.
     * @param {string} parentPath - The parent path for breadcrumb display.
     * @private
     */
    processFolderDocument(doc, parentPath) {
        const currentPath = parentPath ? `${parentPath} / ${doc.title}` : doc.title;
        
        if (doc.path) {
            if (doc.showfolderpage !== 'false') {
                this.searchIndex.push({
                    title: doc.title,
                    path: doc.path,
                    slug: doc.slug,
                    location: currentPath,
                    type: 'folder'
                });
            }

            if (doc.headers) {
                this.addHeadersToIndex(doc, currentPath, doc.title);
            }
        }
        
        if (doc.items) {
            this.processDocuments(doc.items, currentPath);
        }
    }

    /**
     * Processes a file document.
     * @param {Document} doc - The file document to process.
     * @param {string} parentPath - The parent path for breadcrumb display.
     * @private
     */
    processFileDocument(doc, parentPath) {
        this.searchIndex.push({
            title: doc.title,
            path: doc.path,
            slug: doc.slug,
            location: parentPath,
            type: 'file'
        });

        if (doc.headers) {
            this.addHeadersToIndex(doc, parentPath, doc.title);
        }
    }

    /**
     * Adds document headers to the search index.
     * @param {Document} doc - The document containing headers.
     * @param {string} location - The location path for display.
     * @param {string} docTitle - The document title.
     * @private
     */
    addHeadersToIndex(doc, location, docTitle) {
        doc.headers.forEach(header => {
            this.searchIndex.push({
                title: header,
                path: doc.path,
                slug: `${doc.slug}#${this.slugifyHeader(header)}`,
                location: `${location} / ${docTitle}`,
                type: 'header'
            });
        });
    }

    /**
     * Converts a header text to a URL-friendly slug.
     * @param {string} header - The header text to slugify.
     * @returns {string} The slugified header.
     * @private
     */
    slugifyHeader(header) {
        return header.toLowerCase()
            .replace(/[^\w\s-]/g, '')
            .replace(/\s+/g, '-');
    }

    /**
     * Searches the index for documents matching the query.
     * @param {string} query - The search query.
     * @returns {Array<SearchResult>} The search results sorted by relevance.
     */
    search(query) {
        if (!query) return [];
        query = query.toLowerCase();

        if (this.searchCache.has(query)) {
            return this.searchCache.get(query);
        }

        const results = this.searchIndex
            .map(item => this.scoreItem(item, query))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 10);

        if (this.searchCache.size >= this.cacheMaxSize) {
            const firstKey = this.searchCache.keys().next().value;
            this.searchCache.delete(firstKey);
        }
        this.searchCache.set(query, results);

        return results;
    }

    /**
     * Calculates a relevance score for a search index item.
     * @param {SearchIndexItem} item - The item to score.
     * @param {string} query - The search query (lowercase).
     * @returns {SearchResult} The item with its score.
     * @private
     */
    scoreItem(item, query) {
        const titleLower = item.title.toLowerCase();
        let score = 0;

        if (titleLower === query) score = 100;
        else if (titleLower.startsWith(query)) score = 80;
        else if (titleLower.includes(query)) score = 60;
        else if (item.path.toLowerCase().includes(query)) score = 40;
        else if (item.location.toLowerCase().includes(query)) score = 20;

        if (item.type === 'header') score += 5;

        return { ...item, score };
    }

    /**
     * Clears the search result cache.
     */
    clearCache() {
        this.searchCache.clear();
    }
}

/**
 * @typedef {Object} SearchIndexItem
 * @property {string} title - The item title.
 * @property {string} path - The file path.
 * @property {string} slug - The URL slug.
 * @property {string} location - The breadcrumb location.
 * @property {'folder'|'file'|'header'} type - The item type.
 */

/**
 * @typedef {SearchIndexItem & {score: number}} SearchResult
 */
