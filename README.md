# Docs Viewer

A modern, accessible documentation viewer for Markdown files with live search, navigation, and mobile support.

## Features

- 🔍 **Live search** with keyboard shortcuts (Alt+S) and result caching
- 📱 **Mobile-friendly** responsive design with focus trap
- 🎯 **Keyboard navigation** support (arrow keys, Enter, Escape)
- 📑 **Auto-generated document outline** with collapsible headers
- 🔗 **Wiki-style internal linking** with `[[Page Title]]` syntax
- 🖨️ **Print-friendly** styling
- ♿ **ARIA-compliant accessibility** (aria-current, role attributes, focus management)
- 🌙 **Dark theme** with CSS custom properties
- ⚡ **Performance optimized** with document caching and lazy loading
- 📊 **Loading indicators** with animated progress bars

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Copy the example configuration:
```bash
cp example.index.json index.json
```
Then modify `index.json` with your site's metadata, author info, and social links.

3. Create your documentation structure:
```
docs/
  ├── images/        # Place images here
  ├── index.md      # Main landing page
  └── ... other .md files
```

4. Build the documentation index:
```bash
npm run build
```
This will scan your docs folder and update `index.json` with the document structure.

5. Start the development server:
```bash
npm start
```

## Documentation Structure

### File Organization

- Place all documentation files in the `docs/` directory
- Store images and video in `docs/images/`
- Use `.md` extension for Markdown files

### Markdown Files

Each Markdown file can include YAML frontmatter:

```markdown
---
title: Page Title
description: Page description
sort: 1           # Optional: controls sidebar order
thumbnail: images/thumb.png  # Optional: for OG images
---

# Content starts here
```

### Folder Structure

To create sections, make a folder and add a matching Markdown file:

```
docs/
  ├── getting-started/
  │   ├── getting-started.md  # Folder index
  │   ├── installation.md
  │   └── configuration.md
  └── index.md
```

## Special Features

### Wiki Links

Use double brackets for internal links:
```markdown
[[Page Title]]
[[Page Title|Custom Text]]
```

### Images

Store images in `docs/images/` and reference them:
```markdown
![Alt text](./docs/images/picture.png)
# or
![[picture.png]]
```

### Headers

Headers are automatically added to the right sidebar outline and are collapsible.

## Development

### Recommended Editor

We recommend using [Obsidian.md](https://obsidian.md) as your editor for the documentation files. The `docs/.obsidian` directory includes a custom plugin that provides enhanced editing features:

- Displays page titles in the file explorer instead of filenames
- Shows frontmatter-defined sort order in the file list
- Automatically updates file ordering based on the `sort` property
- Makes folder and document organization more intuitive

To use the plugin:
1. Open the `docs` folder as an Obsidian vault
2. The plugin will be automatically loaded
3. The file explorer will now show your document titles and sorting order

### Project Structure

```
.
├── docs/                    # Documentation files
├── js/                      # Application modules
│   ├── EventBus.js          # Pub-sub event system
│   ├── IndexService.js      # Document index management
│   ├── SearchService.js     # Search with caching
│   ├── DOMService.js        # DOM manipulation & accessibility
│   ├── DocumentService.js   # Markdown loading & caching
│   ├── NavigationService.js # Browser history handling
│   └── Documentation.js     # Main orchestrator
├── build-docs.js            # Documentation builder
├── index.html               # Main viewer
└── styles.css               # Styling
```

### Architecture

The application uses a modular ES6 architecture with:

- **EventBus**: Pub-sub pattern for decoupled communication between services
- **Services**: Single-responsibility modules for search, DOM, documents, and navigation
- **Caching**: LRU caches for search results (50 entries) and documents (20 entries)
- **Lazy Loading**: Images use `loading="lazy"` for improved performance


### Building

The build process:
1. Scans the `docs/` directory
2. Edits `index.json` with document metadata

A GitHub Actions workflow is included that automatically:
- Runs on every push to the master branch
- Executes the build process
- Commits and pushes any changes to `index.json`
- Ensures your documentation index stays in sync with your content

This means you can edit your documentation directly on GitHub, and the index will be automatically updated.

If you don't want to use Github actions, you can use npm run build

### Cloudflare Pages

1. Create a new repository on GitHub.
2. Push your code to the repository.
3. Go to [Cloudflare Pages](https://pages.cloudflare.com/) and connect your GitHub repository.
4. Configure the build settings:
   - **Production branch:** `main` (or your main branch name)
   - **Build command:** Leave empty
   - **Build output directory:** `/` (root)
5. Save and deploy.

#### Optional: Cloudflare Worker for OG/Twitter Tags

For improved SEO and social sharing, you can use a Cloudflare Worker to dynamically generate OG/Twitter tags.

1. Create a new Cloudflare Worker using the code in `cloudflare-worker.js`.
2. Set the `SITE_URL` environment variable to where your site will be located, e.g., `https://example.com/docs/`
3. Set the `DOCS_URL` environment variable to the URL where your documentation files are hosted (usually your Cloudflare Pages URL).
4. Configure a route in your Cloudflare account to route all requests to your Cloudflare Pages site through the worker.

## Configuration

### index.json


```json
{
  "defaultPage": "home",
  "metadata": {
    "title": "Site Title",
    "description": "Site description",
    "site_name": "Documentation"
  },
  "author": {
    "name": "Author Name",
    "role": "Role",
    "socials": [
      {
        "icon": "fab fa-github",
        "url": "https://github.com/username",
        "title": "GitHub"
      }
    ]
  }
}
```

The build process generates the documents part for `index.json`
## Contributing

1. Fork the repository
2. Create a feature branch
3. Submit a pull request

## Dependencies

- [marked.js](https://marked.js.org/) - Markdown parsing
- [highlight.js](https://highlightjs.org/) - Syntax highlighting
- [Font Awesome](https://fontawesome.com/) - Icons

## License

MIT License - see LICENSE file for details.

