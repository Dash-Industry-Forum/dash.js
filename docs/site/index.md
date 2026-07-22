---
layout: home

hero:
  name: dash.js
  text: The official reference client for MPEG-DASH
  tagline: Production-ready playback of MPEG-DASH via JavaScript in any browser that supports the Media Source Extensions.
  image:
    src: /assets/images/dashjs.png
    alt: dash.js
  actions:
    - theme: brand
      text: Quickstart
      link: /pages/quickstart/index
    - theme: alt
      text: Reference Player
      link: https://reference.dashif.org/dash.js/nightly/samples/dash-if-reference-player/index.html
    - theme: alt
      text: GitHub
      link: https://github.com/Dash-Industry-Forum/dash.js

features:
  - icon: 🎬
    title: MPEG-DASH Playback
    details: Spec-compliant DASH playback built on the Media Source Extensions, for VoD and live content.
    link: /pages/usage/index
  - icon: ⚡
    title: Low Latency Streaming
    details: CMAF low-latency streaming with configurable catchup mechanisms and latency targets.
    link: /pages/usage/low-latency
  - icon: 📈
    title: Adaptive Bitrate Algorithms
    details: Multiple pluggable ABR rules including BOLA, L2A and LoL+, plus support for custom rules.
    link: /pages/usage/abr/index
  - icon: 🔐
    title: DRM Support
    details: Playback of protected content via the Encrypted Media Extensions — Widevine, PlayReady and more.
    link: /pages/usage/drm
  - icon: 💬
    title: Subtitles & Captions
    details: TTML, IMSC, WebVTT and CEA-608/708 rendering, including DVB font downloading.
    link: /pages/usage/subtitles-and-captions/index
  - icon: 🧩
    title: Extensible Architecture
    details: Modular design with dependency injection — extend or replace almost any internal component.
    link: /pages/developers/architecture
---

## Which branch should I use?

- Use the `master` branch if you want the approved and stable public releases without contributing back.
- Use the `development` branch if you want to improve or extend dash.js — make your changes there and submit a pull request against it.

Migrating from version 4.x? The [migration guide](pages/developers/migration-guides/4-to-5.html) covers all changes to build files, settings and APIs in version 5.

## CDN hosted files

We provide the latest minified files of all releases on a global CDN, free to use in production environments. An overview of the dash.js releases can be found on [GitHub](https://github.com/Dash-Industry-Forum/dash.js/releases).

### Version 5.x and newer

Replace `vx.x.x` with the release version, for instance `v5.0.0`:

- `UMD legacy`
    - Minified Build: [http://cdn.dashjs.org/vx.x.x/legacy/umd/dash.all.min.js](http://cdn.dashjs.org/v5.0.0/legacy/umd/dash.all.min.js)
    - Debug Build: [http://cdn.dashjs.org/vx.x.x/legacy/umd/dash.all.debug.js](http://cdn.dashjs.org/v5.0.0/legacy/umd/dash.all.debug.js)
- `UMD modern`
    - Minified Build: [http://cdn.dashjs.org/vx.x.x/modern/umd/dash.all.min.js](http://cdn.dashjs.org/v5.0.0/modern/umd/dash.all.min.js)
    - Debug Build: [http://cdn.dashjs.org/vx.x.x/modern/umd/dash.all.debug.js](http://cdn.dashjs.org/v5.0.0/modern/umd/dash.all.debug.js)
- `ESM modern`
    - Minified Build: [http://cdn.dashjs.org/vx.x.x/modern/esm/dash.all.min.js](http://cdn.dashjs.org/v5.0.0/modern/esm/dash.all.min.js)
    - Debug Build: [http://cdn.dashjs.org/vx.x.x/modern/esm/dash.all.debug.js](http://cdn.dashjs.org/v5.0.0/modern/esm/dash.all.debug.js)

### Version 4.x and older

All releases prior to version 5.0.0 are available under the following URLs. Replace `vx.x.x` with the release version, for instance `v3.1.0`:

- [http://cdn.dashjs.org/vx.x.x/dash.all.min.js](http://cdn.dashjs.org/v3.1.0/dash.all.min.js)
- [http://cdn.dashjs.org/vx.x.x/dash.all.debug.js](http://cdn.dashjs.org/v3.1.0/dash.all.debug.js)

Multiple examples how to use dash.js in your TypeScript or Webpack based JavaScript project can be found in `samples/modules`.

## Getting help

The full [API Documentation](https://cdn.dashjs.org/latest/jsdoc/index.html) describes all public methods, interfaces, properties, and events.

For help, join the [#dashjs Slack channel](https://join.slack.com/t/dashif/shared_invite/zt-egme869x-JH~UPUuLoKJB26fw7wj3Gg), our [email list](https://groups.google.com/d/forum/dashjs) and read the documentation on this website.

## License

dash.js is released under the [BSD license](https://github.com/Dash-Industry-Forum/dash.js/blob/development/LICENSE.md).
