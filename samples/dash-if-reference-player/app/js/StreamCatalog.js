/**
 * StreamCatalog.js - Stream source loading, tag-based filtering, and selection
 */

import {$, fetchJSON, createElement} from './UIHelpers.js';

// Tags to display prominently as filter pills (ordered by importance)
const FEATURED_TAGS = [
    'vod', 'live', 'low-latency', 'drm', 'widevine', 'playready', 'clearkey',
    'multiperiod', 'subtitles', 'thumbnails', 'hevc', 'avc', '4k', '1080p',
    'cmaf', 'ttml', 'cea-608', 'multi-audio', 'audio-only', 'mss', 'lcevc',
    'mpd-patch', 'cmsd', 'events', 'content-steering'
];

export class StreamCatalog {
    constructor() {
        this.sources = [];         // raw category array from JSON
        this.flatStreams = [];     // flattened list of all stream items
        this.allTags = [];         // sorted list of all unique tags
        this.providers = {};       // provider map
        this.activeTags = new Set();
        this.providerColorMap = {};
        this.searchQuery = '';
        this.onStreamSelected = null;
        this._selectedItem = null;
        this._panelVisible = false;
    }

    /**
     * Load sources from JSON and build the UI
     * @param {string} url - URL to sources.json
     */
    async init(url) {
        try {
            const data = await fetchJSON(url);
            this.sources = data.items || [];
            this.providers = data.provider || {};
            this._buildProviderColorMap();

            this._flattenStreams();
            this._collectTags();
            this._buildPanel();
            this._bindEvents();
        } catch (err) {
            console.warn('Failed to load stream sources:', err);
        }
    }

    getUrl() {
        const input = $('#stream-url');
        return input ? input.value.trim() : '';
    }

    setUrl(url) {
        const input = $('#stream-url');
        if (input) {
            input.value = url;
        }
    }

    getSelectedItem() {
        return this._selectedItem || null;
    }

    // ---- Private: Data Processing ----

    _buildProviderColorMap() {
        const NUM_COLORS = 10;
        const keys = Object.keys(this.providers);
        this.providerColorMap = {};
        for (let i = 0; i < keys.length; i++) {
            this.providerColorMap[keys[i]] = i % NUM_COLORS;
        }
    }

    _flattenStreams() {
        this.flatStreams = [];
        for (const category of this.sources) {
            if (!category.submenu) {
                continue;
            }
            for (const item of category.submenu) {
                this.flatStreams.push({
                    ...item,
                    category: category.name,
                    tags: item.tags || []
                });
            }
        }
    }

    _collectTags() {
        const tagSet = new Set();
        for (const stream of this.flatStreams) {
            for (const tag of stream.tags) {
                tagSet.add(tag);
            }
        }
        // Order: featured tags first (in their defined order), then alphabetical remainder
        const featured = FEATURED_TAGS.filter(t => tagSet.has(t));
        const rest = [...tagSet].filter(t => !FEATURED_TAGS.includes(t)).sort();
        this.allTags = [...featured, ...rest];
    }

    _getFilteredStreams() {
        return this.flatStreams.filter(stream => {
            // Tag filter: stream must have ALL active tags
            for (const tag of this.activeTags) {
                if (!stream.tags.includes(tag)) {
                    return false;
                }
            }
            // Text search
            if (this.searchQuery) {
                const q = this.searchQuery.toLowerCase();
                const haystack = `${stream.name} ${stream.category} ${stream.tags.join(' ')}`.toLowerCase();
                if (!haystack.includes(q)) {
                    return false;
                }
            }
            return true;
        });
    }

    // ---- Private: UI Building ----

    _buildPanel() {
        const panel = $('#stream-panel');
        if (!panel) {
            return;
        }

        // Search input
        const searchRow = createElement('div', { className: 'stream-panel-search' });
        const searchInput = createElement('input', {
            type: 'text',
            id: 'stream-search',
            className: 'form-control form-control-sm',
            placeholder: 'Search streams...'
        });
        searchRow.appendChild(searchInput);
        panel.appendChild(searchRow);

        // Tag pills
        const tagRow = createElement('div', { className: 'stream-panel-tags', id: 'stream-tags' });
        for (const tag of this.allTags) {
            // Skip provider tags from the main tag bar (too many)
            if (this.providers[tag]) {
                continue;
            }
            const pill = createElement('button', {
                className: 'stream-tag-pill',
                textContent: tag,
                'data-tag': tag
            });
            pill.addEventListener('click', () => this._toggleTag(tag, pill));
            tagRow.appendChild(pill);
        }
        panel.appendChild(tagRow);

        // Results count
        const countRow = createElement('div', { className: 'stream-panel-count', id: 'stream-count' });
        panel.appendChild(countRow);

        // Stream list
        const listContainer = createElement('div', {
            className: 'stream-panel-list',
            id: 'stream-list'
        });
        panel.appendChild(listContainer);

        this._renderStreamList();
    }

    _renderStreamList() {
        const listContainer = $('#stream-list');
        const countEl = $('#stream-count');
        if (!listContainer) {
            return;
        }

        const filtered = this._getFilteredStreams();
        listContainer.innerHTML = '';

        if (countEl) {
            const total = this.flatStreams.length;
            countEl.textContent = filtered.length === total
                ? `${total} streams`
                : `${filtered.length} of ${total} streams`;
        }

        if (filtered.length === 0) {
            listContainer.appendChild(createElement('div', {
                className: 'stream-panel-empty',
                textContent: 'No streams match your filters.'
            }));
            return;
        }

        // Group by category
        const grouped = new Map();
        for (const stream of filtered) {
            if (!grouped.has(stream.category)) {
                grouped.set(stream.category, []);
            }
            grouped.get(stream.category).push(stream);
        }

        const hasActiveFilters = this.activeTags.size > 0 || this.searchQuery.length > 0;

        for (const [category, streams] of grouped) {
            const group = createElement('div', { className: 'stream-panel-group' });

            const catHeader = createElement('div', {
                className: 'stream-panel-category'
            });
            const chevron = createElement('i', {
                className: hasActiveFilters ? 'bi bi-chevron-down' : 'bi bi-chevron-right'
            });
            const label = createElement('span', { textContent: ` ${category}` });
            const count = createElement('span', {
                className: 'stream-panel-category-count',
                textContent: `${streams.length}`
            });
            catHeader.appendChild(chevron);
            catHeader.appendChild(label);
            catHeader.appendChild(count);

            const itemsContainer = createElement('div', {
                className: `stream-panel-group-items ${hasActiveFilters ? '' : 'collapsed'}`
            });

            catHeader.addEventListener('click', () => {
                const isCollapsed = itemsContainer.classList.toggle('collapsed');
                chevron.className = isCollapsed ? 'bi bi-chevron-right' : 'bi bi-chevron-down';
            });

            for (const stream of streams) {
                const row = createElement('div', { className: 'stream-panel-item' });
                row.addEventListener('click', (e) => {
                    e.stopPropagation();
                    this._selectStream(stream);
                });

                const nameSpan = createElement('span', { className: 'stream-panel-item-name' });

                const providerInfo = stream.provider ? this.providers[stream.provider] : null;
                if (providerInfo) {
                    const colorIdx = this.providerColorMap[stream.provider] || 0;
                    const providerBadge = createElement('span', {
                        className: `stream-provider-badge stream-provider-badge-${colorIdx}`,
                        textContent: providerInfo.acronym
                    });
                    nameSpan.appendChild(providerBadge);
                }

                nameSpan.appendChild(document.createTextNode(stream.name));
                row.appendChild(nameSpan);

                if (stream.tags.length > 0) {
                    const tagSpan = createElement('span', { className: 'stream-panel-item-tags' });
                    for (const tag of stream.tags) {
                        if (this.providers[tag]) {
                            continue;
                        }
                        const badge = createElement('span', {
                            className: `stream-tag-badge ${this.activeTags.has(tag) ? 'active' : ''}`,
                            textContent: tag
                        });
                        tagSpan.appendChild(badge);
                    }
                    row.appendChild(tagSpan);
                }

                itemsContainer.appendChild(row);
            }

            group.appendChild(catHeader);
            group.appendChild(itemsContainer);
            listContainer.appendChild(group);
        }
    }

    // ---- Private: Events ----

    _bindEvents() {
        // Stream button toggles the panel
        const streamsBtn = $('#btn-streams');
        if (streamsBtn) {
            streamsBtn.addEventListener('click', () => this._togglePanel());
        }

        // Search input
        const searchInput = $('#stream-search');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                this.searchQuery = searchInput.value.trim();
                this._renderStreamList();
            });
        }

        // Close panel when clicking outside
        document.addEventListener('click', (e) => {
            if (!this._panelVisible) {
                return;
            }
            const panel = $('#stream-panel');
            const btn = $('#btn-streams');
            if (panel && !panel.contains(e.target) && btn && !btn.contains(e.target)) {
                this._hidePanel();
            }
        });

        // Close on Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this._panelVisible) {
                this._hidePanel();
            }
        });
    }

    _toggleTag(tag, pillEl) {
        if (this.activeTags.has(tag)) {
            this.activeTags.delete(tag);
            pillEl.classList.remove('active');
        } else {
            this.activeTags.add(tag);
            pillEl.classList.add('active');
        }
        this._renderStreamList();
    }

    _togglePanel() {
        if (this._panelVisible) {
            this._hidePanel();
        } else {
            this._showPanel();
        }
    }

    _showPanel() {
        const panel = $('#stream-panel');
        if (panel) {
            panel.classList.remove('d-none');
            this._panelVisible = true;
            // Focus search
            const search = $('#stream-search');
            if (search) {
                search.focus();
            }
        }
    }

    _hidePanel() {
        const panel = $('#stream-panel');
        if (panel) {
            panel.classList.add('d-none');
            this._panelVisible = false;
        }
    }

    _selectStream(item) {
        this._selectedItem = { ...item };
        this.setUrl(item.url || '');
        this._hidePanel();
        if (this.onStreamSelected) {
            this.onStreamSelected(this._selectedItem);
        }
    }
}
