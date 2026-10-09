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
      link: /pages/quickstart/
    - theme: alt
      text: Reference Player
      link: https://reference.dashif.org/dash.js/nightly/samples/dash-if-reference-player/index.html
    - theme: alt
      text: GitHub
      link: https://github.com/Dash-Industry-Forum/dash.js

features:
  - icon: 🎬
    title: MPEG-DASH Playback
    details: Specification compliant MPEG-DASH playback built on the Media Source Extensions and the Encrypted Media Extensions, for VoD and live content.
    link: /pages/usage/
  - icon: ⚡
    title: Low Latency Streaming
    details: CMAF low-latency streaming with configurable catchup mechanisms and latency targets.
    link: /pages/usage/low-latency
  - icon: 📈
    title: Adaptive Bitrate Algorithms
    details: Multiple pluggable ABR rules including BOLA, L2A and LoL+, plus support for custom rules.
    link: /pages/usage/abr/
  - icon: 🔐
    title: DRM Support
    details: Playback of protected content via the Encrypted Media Extensions — Widevine, PlayReady and more.
    link: /pages/usage/drm
  - icon: 💬
    title: Subtitles & Captions
    details: TTML, IMSC, WebVTT and CEA-608/708 rendering, including DVB font downloading.
    link: /pages/usage/subtitles-and-captions/
  - icon: 🧩
    title: Extensible Architecture
    details: Modular design with dependency injection — extend or replace almost any internal component.
    link: /pages/developers/architecture/
---

## Get started in 30 seconds

Include dash.js from the CDN, add a video element and point the player to an MPD:

```html
<script src="https://cdn.dashjs.org/latest/modern/umd/dash.all.min.js"></script>
<video id="video" controls></video>
<script>
    dashjs.MediaPlayer().create().initialize(
        document.querySelector('#video'),
        'https://dash.akamaized.net/akamai/bbb_30fps/bbb_30fps.mpd',
        true
    );
</script>
```

Or install it as a package:

```sh
npm install dashjs
```

The [Quickstart](pages/quickstart/index.html) covers all installation options — CDN builds, npm, bundle formats and
building from source — and the basic [player setup](pages/quickstart/setup.html).

## Why dash.js?

- **Reference client of the DASH Industry Forum**: dash.js is developed alongside
  the [DASH-IF Interoperability Guidelines](https://dashif.org/guidelines/iop-v5/) and serves as the reference for new
  MPEG-DASH features. See the [feature overview](pages/features/index_features.html) for what is supported.
- **Production ready**: used by broadcasters, streaming platforms and device manufacturers worldwide, from desktop
  browsers to smart TVs and set-top boxes.
- **Open source and extensible**: BSD-licensed, driven by an active community, with a modular architecture that lets
  you replace or extend almost any component.

## Getting help

The full [API Documentation](https://cdn.dashjs.org/latest/jsdoc/index.html) describes all public methods, interfaces, properties, and events.

For help, join the [#dashjs Slack channel](https://join.slack.com/t/dashif/shared_invite/zt-191r8cjva-4bu_5_SJ1U~d_oltjqWkEQ), our [email list](https://groups.google.com/d/forum/dashjs), file an issue on [GitHub](https://github.com/Dash-Industry-Forum/dash.js/issues) or read the documentation on this website.

## License

dash.js is released under the [BSD license](https://github.com/Dash-Industry-Forum/dash.js/blob/development/LICENSE.md).
