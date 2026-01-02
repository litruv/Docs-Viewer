/**
 * Service responsible for loading and processing markdown documents.
 * @class DocumentService
 */
export class DocumentService {
    /**
     * Creates a new DocumentService instance.
     * @param {EventBus} eventBus - The event bus for communication.
     * @param {IndexService} indexService - The index service for document lookups.
     */
    constructor(eventBus, indexService) {
        /** @type {EventBus} */
        this.eventBus = eventBus;
        /** @type {IndexService} */
        this.indexService = indexService;
        /** @type {Promise<marked>} */
        this.markedPromise = this.initializeMarked();
    }

    /**
     * Initializes the marked library with custom renderer.
     * @returns {Promise<marked>} Promise resolving to the marked instance.
     * @private
     */
    async initializeMarked() {
        const marked = await new Promise((resolve) => {
            if (typeof window.marked !== 'undefined') {
                resolve(window.marked);
            } else {
                window.addEventListener('load', () => resolve(window.marked));
            }
        });

        const renderer = new marked.Renderer();
        this.setupRenderer(renderer);

        marked.setOptions({
            breaks: true,
            gfm: true,
            renderer: renderer
        });

        return marked;
    }

    /**
     * Configures the marked renderer with custom handlers.
     * @param {marked.Renderer} renderer - The renderer to configure.
     * @private
     */
    setupRenderer(renderer) {
        const originalLink = renderer.link.bind(renderer);

        renderer.code = this.renderCode;
        renderer.link = (href, title, text) => {
            const isExternal = href.startsWith('http');
            const attrs = isExternal ? ' target="_blank" rel="noopener noreferrer"' : '';
            const link = originalLink(href, title, text);
            if (!isExternal && href.startsWith('?')) {
                return link.replace(/^<a /, '<a data-internal="true" ');
            }
            return link.replace(/^<a /, `<a${attrs} `);
        };

        const originalHeading = renderer.heading.bind(renderer);
        renderer.heading = (text, level) => {
            const escapedText = text.toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/\s+/g, '-');

            const id = escapedText;

            return `<h${level} id="${id}" class="clickable-header">
                ${text}
            </h${level}>`;
        };
    }

    /**
     * Renders a code block with syntax highlighting.
     * @param {string} code - The code content.
     * @param {string} language - The language for highlighting.
     * @returns {string} The rendered HTML.
     * @private
     */
    renderCode(code, language) {
        let highlighted;
        if (language && hljs.getLanguage(language)) {
            highlighted = hljs.highlight(code, { language }).value;
        } else {
            highlighted = hljs.highlightAuto(code).value;
            language = '';
        }
        return `<pre class="hljs ${language ? "language-" + language : ""}"><code>${highlighted}</code></pre>`;
    }

    /**
     * Extracts frontmatter metadata from document content.
     * @param {string} content - The raw document content.
     * @returns {ExtractedDocument} The extracted metadata and content.
     */
    extractMetadata(content) {
        const lines = content.trim().split('\n');
        let metadata = {};
        let contentStart = 0;

        if (lines[0].trim() === '---') {
            let endMetadata = lines.findIndex((line, index) => index > 0 && line.trim() === '---');
            if (endMetadata !== -1) {
                const frontmatterEntries = lines.slice(1, endMetadata)
                    .map(line => line.match(/^([\w-]+):\s*(.*)$/))
                    .filter(Boolean)
                    .map(([, key, value]) => {
                        if (key === 'defaultOpen') {
                            return [key, value.trim().toLowerCase() === 'true'];
                        } else if (key === 'sort') {
                            return [key, parseInt(value.trim(), 10)];
                        } else {
                            return [key, value.trim()];
                        }
                    });

                metadata = Object.fromEntries(frontmatterEntries);
                contentStart = endMetadata + 1;
            }
        }

        return {
            metadata,
            content: lines.slice(contentStart).join('\n').trim()
        };
    }

    /**
     * Loads and processes a document from a path.
     * @param {string} path - The document path to load.
     * @returns {Promise<LoadedDocument>} The loaded document data.
     * @throws {Error} If the document fails to load.
     */
    async loadDocument(path) {
        try {
            const [response, marked] = await Promise.all([
                fetch(path),
                this.markedPromise
            ]);

            let rawContent = await response.text();
            const { metadata, content } = this.extractMetadata(rawContent);

            if (metadata.defaultOpen !== undefined) {
                metadata.defaultOpen = metadata.defaultOpen === true || metadata.defaultOpen === 'true';
            }

            if (metadata.sort !== undefined) {
                metadata.sort = typeof metadata.sort === 'number' ? metadata.sort : parseInt(metadata.sort, 10);
            }

            const basePath = path.substring(0, path.lastIndexOf('/'));
            const indexDoc = this.findDocInIndex(path);

            let processedContent = this.processWikiLinks(content);
            processedContent = this.processImages(processedContent, basePath);
            const titleContent = metadata.title || indexDoc?.title || path.split('/').pop().replace('.md', '');
            processedContent = this.ensureTitle(processedContent, titleContent);

            return {
                content: processedContent,
                metadata,
                marked,
                title: titleContent
            };
        } catch (error) {
            throw new Error('Failed to load document');
        }
    }

    /**
     * Finds a document in the global index by path.
     * @param {string} path - The document path.
     * @returns {Document|null} The found document or null.
     * @private
     */
    findDocInIndex(path) {
        let doc = window._indexData.documents.find(d => d.path === path);

        if (!doc) {
            for (const d of window._indexData.documents) {
                if (d.type === 'folder' && d.items) {
                    doc = d.items.find(item => item.path === path);
                    if (doc) break;
                }
            }
        }
        return doc;
    }

    /**
     * Ensures the content has a title heading.
     * @param {string} content - The document content.
     * @param {string} title - The title to add.
     * @returns {string} The content with title.
     * @private
     */
    ensureTitle(content, title) {
        content = content.replace(/^#\s+.*$/m, '').trim();
        return `# ${title}\n\n${content}`;
    }

    /**
     * Processes wiki-style links [[Link]] into markdown links.
     * @param {string} content - The content to process.
     * @returns {string} The processed content.
     * @private
     */
    processWikiLinks(content) {
        return content.replace(/\[\[(.*?)\]\]/g, (match, linkText) => {
            const [targetTitle, displayText] = linkText.split('|').map(s => s.trim());
            if (targetTitle.match(/\.(png|jpg|jpeg|gif|mp4|webm)$/i)) {
                return match;
            }

            const doc = this.indexService.findDocumentByTitle(
                window._indexData.documents,
                targetTitle
            );
            return doc ? `[${displayText || doc.title}](?${doc.slug})` : match;
        });
    }

    /**
     * Processes wiki-style image embeds into HTML.
     * @param {string} content - The content to process.
     * @param {string} basePath - The base path for relative images.
     * @returns {string} The processed content.
     * @private
     */
    processImages(content, basePath) {
        return content.replace(/!\[\[(.*?)\]\]/g, (match, filename) => {
            const mediaPath = `./docs/images/${filename}`;

            if (filename.toLowerCase().endsWith('.mp4')) {
                return `\n<video controls width="100%">
                    <source src="${mediaPath}" type="video/mp4">
                    Your browser does not support the video tag.
                </video>\n\n`;
            }

            return `\n![${filename}](${mediaPath})\n\n`;
        });
    }
}

/**
 * @typedef {Object} ExtractedDocument
 * @property {Object} metadata - The document metadata.
 * @property {string} content - The document content without frontmatter.
 */

/**
 * @typedef {Object} LoadedDocument
 * @property {string} content - The processed markdown content.
 * @property {Object} metadata - The document metadata.
 * @property {marked} marked - The marked instance.
 * @property {string} title - The document title.
 */
