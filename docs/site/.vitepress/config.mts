import { defineConfig } from 'vitepress'
import { readdirSync, statSync, readFileSync, writeFileSync } from 'node:fs'
import { join, relative } from 'node:path'

// GitHub Pages serves the site under /dash.js/ — the deploy workflow sets DOCS_BASE.
const base = process.env.DOCS_BASE || '/'

export default defineConfig({
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
            { text: 'Quickstart', link: '/pages/quickstart/index' },
            { text: 'Usage', link: '/pages/usage/index' },
            { text: 'Developers', link: '/pages/developers/index' },
            {
                text: 'Resources',
                items: [
                    { text: 'API Documentation', link: 'https://cdn.dashjs.org/latest/jsdoc/index.html' },
                    { text: 'Sample Section', link: 'https://reference.dashif.org/dash.js/nightly/samples/index.html' },
                    { text: 'Reference Client', link: 'https://reference.dashif.org/dash.js/nightly/samples/dash-if-reference-player/index.html' }
                ]
            }
        ],
        sidebar: [
            {
                text: 'Quickstart',
                link: '/pages/quickstart/index',
                collapsed: false,
                items: [
                    { text: 'Installation / Build', link: '/pages/quickstart/installation' },
                    { text: 'Setup', link: '/pages/quickstart/setup' }
                ]
            },
            {
                text: 'Usage',
                link: '/pages/usage/index',
                collapsed: false,
                items: [
                    {
                        text: 'Adaptive Bitrate Streaming',
                        link: '/pages/usage/abr/index',
                        collapsed: true,
                        items: [
                            { text: 'AbandonRequestRule', link: '/pages/usage/abr/abandon-request-rule' },
                            { text: 'ABR Settings', link: '/pages/usage/abr/settings' },
                            { text: 'BolaRule', link: '/pages/usage/abr/bola-rule' },
                            { text: 'DroppedFramesRule', link: '/pages/usage/abr/dropped-frames-rule' },
                            { text: 'InsufficientBufferRule', link: '/pages/usage/abr/insufficient-buffer-rule' },
                            { text: 'L2A Rule', link: '/pages/usage/abr/l2a' },
                            { text: 'LoL+ Rule', link: '/pages/usage/abr/lol_plus' },
                            { text: 'Manual quality selection', link: '/pages/usage/abr/manual-quality-selection' },
                            { text: 'SwitchHistoryRule', link: '/pages/usage/abr/switch-history-rule' },
                            { text: 'Throughput Calculation', link: '/pages/usage/abr/throughput-calculation' },
                            { text: 'ThroughputRule', link: '/pages/usage/abr/throughput-rule' }
                        ]
                    },
                    { text: 'Buffer Management', link: '/pages/usage/buffer-management' },
                    { text: 'Clock Synchronization', link: '/pages/usage/clock-sync' },
                    { text: 'Common Media Client Data', link: '/pages/usage/cmcd' },
                    { text: 'Common Media Server Data', link: '/pages/usage/cmsd' },
                    { text: 'Content Steering', link: '/pages/usage/content-steering' },
                    { text: 'Controlbar', link: '/pages/usage/controlbar' },
                    { text: 'Digital Rights Management (DRM)', link: '/pages/usage/drm' },
                    { text: 'Event handling - MPD and Inband events', link: '/pages/usage/event-handling' },
                    { text: 'Flexible Insertion of URL Parameters', link: '/pages/usage/flexible-insertion-url-parameters' },
                    { text: 'LCEVC', link: '/pages/usage/lcevc' },
                    { text: 'Live Streaming', link: '/pages/usage/live-streaming' },
                    { text: 'Logging', link: '/pages/usage/logging' },
                    { text: 'Low Latency Streaming', link: '/pages/usage/low-latency' },
                    { text: 'Microsoft Smooth Streaming', link: '/pages/usage/mss' },
                    { text: 'MPD Patching', link: '/pages/usage/mpd-patching' },
                    { text: 'Network Interceptor', link: '/pages/usage/network-interceptor' },
                    { text: 'Player Events', link: '/pages/usage/player-events' },
                    { text: 'Settings', link: '/pages/usage/settings' },
                    {
                        text: 'Subtitles & Captions',
                        link: '/pages/usage/subtitles-and-captions/index',
                        collapsed: true,
                        items: [
                            { text: 'Basic Subtitle Handling', link: '/pages/usage/subtitles-and-captions/subtitle-handling' },
                            { text: 'Custom WebVTT Rendering', link: '/pages/usage/subtitles-and-captions/custom-webvtt-rendering' },
                            { text: 'DVB Font Downloading', link: '/pages/usage/subtitles-and-captions/dvb-font-downloading' }
                        ]
                    },
                    { text: 'Timing APIs', link: '/pages/usage/timing-apis' },
                    { text: 'Track Selection', link: '/pages/usage/track-selection' }
                ]
            },
            {
                text: 'Developers',
                link: '/pages/developers/index',
                collapsed: false,
                items: [
                    { text: 'Architecture', link: '/pages/developers/architecture' },
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
                link: '/pages/testing/index',
                collapsed: false,
                items: [
                    { text: 'Functional Tests', link: '/pages/testing/functional-test' },
                    { text: 'Unit Tests', link: '/pages/testing/unit-test' }
                ]
            },
            {
                text: 'Meetings and Events',
                link: '/pages/events/index',
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
            { icon: 'slack', link: 'https://join.slack.com/t/dashif/shared_invite/zt-egme869x-JH~UPUuLoKJB26fw7wj3Gg' }
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
