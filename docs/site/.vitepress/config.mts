import { withMermaid } from 'vitepress-plugin-mermaid'
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

// GitHub Pages serves the site under /dash.js/ — the deploy workflow sets DOCS_BASE.
const base = process.env.DOCS_BASE || '/'

export default withMermaid({
    base,
    title: 'dash.js',
    description: 'dash.js - Official reference client of the DASH-Industry-Forum.',
    head: [
        ['link', { rel: 'icon', href: `${base}favicon.ico` }]
    ],
    ignoreDeadLinks: [
        /^https?:\/\/localhost/
    ],
    themeConfig: {
        logo: '/assets/images/dashjs.png',
        siteTitle: false,
        nav: [
            { text: 'Quickstart', link: '/pages/quickstart/' },
            { text: 'Usage', link: '/pages/usage/' },
            { text: 'Developers', link: '/pages/developers/' },
            { text: 'API Reference', link: '/api/', target: '_blank' },
            {
                text: 'Resources',
                items: [
                    { text: 'Sample Section', link: 'https://reference.dashif.org/dash.js/nightly/samples/index.html' },
                    { text: 'Reference Client', link: 'https://reference.dashif.org/dash.js/nightly/samples/dash-if-reference-player/index.html' }
                ]
            }
        ],
        sidebar: [
            {
                text: 'Quickstart',
                link: '/pages/quickstart/',
                collapsed: false,
                items: [
                    { text: 'Installation / Build', link: '/pages/quickstart/installation' },
                    { text: 'Setup', link: '/pages/quickstart/setup' }
                ]
            },
            {
                text: 'Usage',
                link: '/pages/usage/',
                collapsed: false,
                items: [
                    {
                        text: 'Playback Basics',
                        collapsed: true,
                        items: [
                            { text: 'Settings', link: '/pages/usage/settings' },
                            { text: 'Player Events', link: '/pages/usage/player-events' },
                            { text: 'Logging', link: '/pages/usage/logging' },
                            { text: 'Controlbar', link: '/pages/usage/controlbar' },
                            { text: 'Timing APIs', link: '/pages/usage/timing-apis' }
                        ]
                    },
                    {
                        text: 'Streaming Types',
                        collapsed: true,
                        items: [
                            { text: 'Live Streaming', link: '/pages/usage/live-streaming' },
                            { text: 'Low Latency Streaming', link: '/pages/usage/low-latency' },
                            { text: 'Multiperiod Streams', link: '/pages/usage/multiperiod' },
                            { text: 'MPD Patching', link: '/pages/usage/mpd-patching' },
                            { text: 'Clock Synchronization', link: '/pages/usage/clock-sync' },
                            { text: 'Microsoft Smooth Streaming', link: '/pages/usage/mss' }
                        ]
                    },
                    {
                        text: 'Adaptive Bitrate & Buffering',
                        link: '/pages/usage/abr/',
                        collapsed: true,
                        items: [
                            { text: 'ABR Settings', link: '/pages/usage/abr/settings' },
                            { text: 'Manual quality selection', link: '/pages/usage/abr/manual-quality-selection' },
                            { text: 'Throughput Calculation', link: '/pages/usage/abr/throughput-calculation' },
                            {
                                text: 'ABR Rules',
                                collapsed: true,
                                items: [
                                    { text: 'AbandonRequestRule', link: '/pages/usage/abr/abandon-request-rule' },
                                    { text: 'BolaRule', link: '/pages/usage/abr/bola-rule' },
                                    { text: 'DroppedFramesRule', link: '/pages/usage/abr/dropped-frames-rule' },
                                    { text: 'InsufficientBufferRule', link: '/pages/usage/abr/insufficient-buffer-rule' },
                                    { text: 'L2A Rule', link: '/pages/usage/abr/l2a' },
                                    { text: 'LoL+ Rule', link: '/pages/usage/abr/lol_plus' },
                                    { text: 'SwitchHistoryRule', link: '/pages/usage/abr/switch-history-rule' },
                                    { text: 'ThroughputRule', link: '/pages/usage/abr/throughput-rule' }
                                ]
                            },
                            { text: 'Buffer Management', link: '/pages/usage/buffer-management' }
                        ]
                    },
                    {
                        text: 'Tracks & Media',
                        collapsed: true,
                        items: [
                            { text: 'Track Selection', link: '/pages/usage/track-selection' },
                            {
                                text: 'Subtitles & Captions',
                                link: '/pages/usage/subtitles-and-captions/',
                                collapsed: true,
                                items: [
                                    { text: 'Basic Subtitle Handling', link: '/pages/usage/subtitles-and-captions/subtitle-handling' },
                                    { text: 'Custom WebVTT Rendering', link: '/pages/usage/subtitles-and-captions/custom-webvtt-rendering' },
                                    { text: 'DVB Font Downloading', link: '/pages/usage/subtitles-and-captions/dvb-font-downloading' }
                                ]
                            },
                            { text: 'Thumbnails', link: '/pages/usage/thumbnails' },
                            { text: 'LCEVC', link: '/pages/usage/lcevc' }
                        ]
                    },
                    { text: 'Digital Rights Management (DRM)', link: '/pages/usage/drm' },
                    {
                        text: 'Data & Reporting',
                        collapsed: true,
                        items: [
                            { text: 'Common Media Client Data', link: '/pages/usage/cmcd' },
                            { text: 'Common Media Server Data', link: '/pages/usage/cmsd' },
                            { text: 'Event handling - MPD and Inband events', link: '/pages/usage/event-handling' }
                        ]
                    },
                    {
                        text: 'Advanced',
                        collapsed: true,
                        items: [
                            { text: 'Content Steering', link: '/pages/usage/content-steering' },
                            { text: 'Network Interceptor', link: '/pages/usage/network-interceptor' },
                            { text: 'Flexible Insertion of URL Parameters', link: '/pages/usage/flexible-insertion-url-parameters' },
                            { text: 'Preloading', link: '/pages/usage/preloading' }
                        ]
                    }
                ]
            },
            {
                text: 'Developers',
                link: '/pages/developers/',
                collapsed: false,
                items: [
                    {
                        text: 'Architecture',
                        link: '/pages/developers/architecture/',
                        collapsed: true,
                        items: [
                            { text: 'Dependency Injection', link: '/pages/developers/architecture/dependency-injection' },
                            { text: 'Event Bus & Wiring', link: '/pages/developers/architecture/event-bus' },
                            { text: 'Playback Pipeline', link: '/pages/developers/architecture/playback-pipeline' },
                            { text: 'Manifest Handling', link: '/pages/developers/architecture/manifest-handling' },
                            { text: 'Error Model', link: '/pages/developers/architecture/error-model' }
                        ]
                    },
                    { text: 'Code Quality', link: '/pages/developers/code-quality' },
                    { text: 'Debugging', link: '/pages/developers/debugging' },
                    { text: 'Dependencies', link: '/pages/developers/dependencies' },
                    { text: 'Development Principles', link: '/pages/developers/development-principles' },
                    { text: 'How to contribute', link: '/pages/developers/how-to-contribute' },
                    {
                        text: 'Migration Guides',
                        link: '/pages/developers/migration-guides/index-migration-guides',
                        collapsed: true,
                        items: [
                            { text: 'Version 3 to 4', link: '/pages/developers/migration-guides/3-to-4' },
                            { text: 'Version 4 to 5', link: '/pages/developers/migration-guides/4-to-5' }
                        ]
                    },
                    { text: 'Naming', link: '/pages/developers/naming' },
                    { text: 'Release Procedure', link: '/pages/developers/release-procedure' }
                ]
            },
            {
                text: 'Testing',
                link: '/pages/testing/',
                collapsed: false,
                items: [
                    { text: 'Functional Tests', link: '/pages/testing/functional-test' },
                    { text: 'Unit Tests', link: '/pages/testing/unit-test' }
                ]
            },
            {
                text: 'Meetings and Events',
                link: '/pages/events/',
                collapsed: false,
                items: [
                    { text: 'Monthly Calls', link: '/pages/events/monthly-calls' }
                ]
            },
            { text: 'Feature Overview', link: '/pages/features/index_features' }
        ],
        outline: [2, 3],
        search: {
            provider: 'local'
        },
        socialLinks: [
            { icon: 'github', link: 'https://github.com/Dash-Industry-Forum/dash.js' },
            { icon: 'slack', link: 'https://join.slack.com/t/dashif/shared_invite/zt-191r8cjva-4bu_5_SJ1U~d_oltjqWkEQ' }
        ],
        editLink: {
            pattern: 'https://github.com/Dash-Industry-Forum/dash.js/edit/development/docs/site/:path',
            text: 'Edit this page on GitHub'
        },
        footer: {
            copyright: 'Copyright © DASH Industry Forum'
        }
    },
    buildEnd(siteConfig) {
        // Generate llms.txt: markdown links to the raw sources of all doc pages.
        const pagesDir = join(siteConfig.srcDir, 'pages')
        const files: string[] = []
        const walk = (dir: string) => {
            for (const entry of readdirSync(dir)) {
                const p = join(dir, entry)
                if (statSync(p).isDirectory()) {
                    walk(p)
                } else if (entry.endsWith('.md')) {
                    files.push(p)
                }
            }
        }
        walk(pagesDir)
        files.sort()
        const links = files.map((file) => {
            const rel = relative(siteConfig.srcDir, file)
            const title = readFileSync(file, 'utf8').match(/^---\n[\s\S]*?title:\s*(.+?)\n[\s\S]*?---/)?.[1]
                ?? rel.split('/').pop()
            return `- [${title}](https://raw.githubusercontent.com/Dash-Industry-Forum/dash.js/refs/heads/development/docs/site/${rel})`
        })
        const content = [
            '# LLM Feed for dashif.org/dash.js/',
            '> dash.js is a reference client implementation for the playback of MPEG DASH via JavaScript in browser based environments that support the Media Source Extensions and optionally the Encrypted Media Extensions.',
            '',
            '## Documentation',
            'The links below take you to the raw Markdown content.',
            '',
            ...links,
            '',
            '## API',
            '',
            '- [API List](https://cdn.dashjs.org/latest/jsdoc/index.html): A complete API reference for dash.js',
            '',
            '## Examples',
            '',
            '- [Sample Section](https://reference.dashif.org/dash.js/nightly/samples/index.html): Various samples demonstrating dash.js features',
            ''
        ].join('\n')
        writeFileSync(join(siteConfig.outDir, 'llms.txt'), content)
    }
})
