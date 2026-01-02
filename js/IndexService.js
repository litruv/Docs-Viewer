/**
 * Service responsible for document index operations and lookups.
 * @class IndexService
 */
export class IndexService {
    /**
     * Finds a document by its slug in the document tree.
     * @param {Array<Document>} documents - The documents to search.
     * @param {string} slug - The slug to find.
     * @returns {Document|null} The found document or null.
     */
    findDocumentBySlug(documents, slug) {
        for (const doc of documents) {
            if (doc.slug === slug) return doc;
            if (doc.type === 'folder') {
                const found = this.findDocumentBySlug(doc.items, slug);
                if (found) return found;
            }
        }
        return null;
    }

    /**
     * Finds a document by its title, path, or slug.
     * @param {Array<Document>} documents - The documents to search.
     * @param {string} title - The title to find.
     * @returns {Document|null} The found document or null.
     */
    findDocumentByTitle(documents, title) {
        for (const doc of documents) {
            if (doc.type === 'folder') {
                const found = this.findDocumentByTitle(doc.items, title);
                if (found) return found;
            } else if (
                doc.title === title ||
                doc.path.endsWith(title + '.md') ||
                doc.slug === title.toLowerCase().replace(/ /g, '-')
            ) {
                return doc;
            }
        }
        return null;
    }

    /**
     * Finds all parent folders for a given document path.
     * @param {Array<Document>} documents - The documents to search.
     * @param {string} path - The path to find parents for.
     * @param {Array<Document>} [parentFolders=[]] - Accumulated parent folders.
     * @returns {Array<Document>} The parent folders.
     */
    findParentFolders(documents, path, parentFolders = []) {
        for (const doc of documents) {
            if (doc.type === 'folder') {
                const found = doc.items.find(item => {
                    if (item.path === path) return true;
                    if (item.type === 'folder') {
                        return this.findParentFolders([item], path).length > 0;
                    }
                    return false;
                });

                if (found) {
                    parentFolders.push(doc);
                    doc.items.forEach(item => {
                        if (item.type === 'folder') {
                            this.findParentFolders([item], path, parentFolders);
                        }
                    });
                }
            }
        }
        return parentFolders;
    }
}

/**
 * @typedef {Object} Document
 * @property {string} title - The document title.
 * @property {string} [path] - The file path.
 * @property {string} slug - The URL slug.
 * @property {'folder'|'file'} [type] - The document type.
 * @property {Array<Document>} [items] - Child documents for folders.
 * @property {Array<string>} [headers] - Document headers.
 * @property {string} [icon] - Custom icon class.
 * @property {boolean} [defaultOpen] - Whether folder is open by default.
 * @property {string} [showfolderpage] - Whether to show folder page.
 * @property {Object} [metadata] - Additional metadata.
 */
