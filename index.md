---
layout: default
title: Home
nav_order: 1
---

<img src="https://cloud.githubusercontent.com/assets/2762250/7824984/985c3e76-03bc-11e5-807b-1402bde4fe56.png" width="400">

[Join #dashjs on Slack!](https://join.slack.com/t/dashif/shared_invite/zt-egme869x-JH~UPUuLoKJB26fw7wj3Gg)

# Overview
dash.js is a reference client implementation for the playback of MPEG DASH via JavaScript in browser based environments
that support the Media Source Extensions.

If your intent is to use the player code without contributing back to this project, then use the `master` branch which
holds the approved and stable public releases.

If your goal is to improve or extend the code and contribute back to this project, then you should make your changes in,
and submit a pull request against, the `development` branch.

# Demos and reference players
All the reference builds and minified files are available under both http and https.

## Samples
Multiple [dash.js samples](https://reference.dashif.org/dash.js/latest/samples/index.html) covering a wide set of common use cases.

## Reference players
The released [pre-built reference players ](http://reference.dashif.org/dash.js/) if you want direct access without
writing any Javascript.

The [nightly build of the /dev branch reference player](http://reference.dashif.org/dash.js/nightly/samples/dash-if-reference-player/index.html)
, is pre-release but contains the latest fixes. It is a good place to start if you are debugging playback problems.

# CDN hosted build files

The latest minified files have been hosted on a global CDN and are free to use in production:

- [dash.all.min.js](http://cdn.dashjs.org/latest/dash.all.min.js)
- [dash.all.debug.js](http://cdn.dashjs.org/latest/dash.all.debug.js)

In addition, all the releases are available under the following urls. Replace "vx.x.x" with the release version, for
instance `v3.1.0`.

- [http://cdn.dashjs.org/vx.x.x/dash.all.min.js](http://cdn.dashjs.org/v3.1.0/dash.all.min.js)
- [http://cdn.dashjs.org/vx.x.x/dash.all.debug.js](http://cdn.dashjs.org/v3.1.0/dash.all.debug.js)

# API Documentation

The full [API Documentation](http://cdn.dashjs.org/latest/jsdoc/module-MediaPlayer.html) is available describing all public methods, interfaces, properties, and events.

For help, join our [Slack channel](https://dashif-slack.azurewebsites.net),
our [email list](https://groups.google.com/d/forum/dashjs) and read the documentation on this website.

# License

dash.js is released under [BSD license](https://github.com/Dash-Industry-Forum/dash.js/blob/development/LICENSE.md)
