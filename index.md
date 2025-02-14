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

# Quickstart

Using dash.js in your application is very straight forward. Just follow the installation and setup steps in
our [Quickstart Guide](pages/quickstart/index.html).

For detailed usage instructions refer to the [Usage](pages/usage/index.html) section.

# Migration from v4 to v5

dash.js version 5.0 introduces changes to the build files, settings and the APIs.
The [migration guide](pages/developers/migration-guides/4-to-5.html) will help you migrate your
application from dash.js version 4.x to 5.0.

# Demos and reference players

All the reference builds and minified files are available under both http and https.

## Samples

Multiple [dash.js samples](https://reference.dashif.org/dash.js/latest/samples/index.html) covering a wide set of common
use cases.

## Reference players

The released [pre-built reference players ](http://reference.dashif.org/dash.js/) if you want direct access without
writing any Javascript.

The [nightly build of the /dev branch reference player](http://reference.dashif.org/dash.js/nightly/samples/dash-if-reference-player/index.html)
, is pre-release but contains the latest fixes. It is a good place to start if you are debugging playback problems.

# CDN hosted files

We provide the latest minified files of all releases on a global CDN. They are free to be used in production
environments. An overview
of the dash.js releases can be found on [GitHub](https://github.com/Dash-Industry-Forum/dash.js/releases).

## Version 4.x and older

All releases prior to version 5.0.0 are available under the following urls. Replace `vx.x.x` with the release version,
for
instance `v3.1.0`.

- [http://cdn.dashjs.org/vx.x.x/dash.all.min.js](http://cdn.dashjs.org/v3.1.0/dash.all.min.js)
- [http://cdn.dashjs.org/vx.x.x/dash.all.debug.js](http://cdn.dashjs.org/v3.1.0/dash.all.debug.js)

## Version 5.x and newer

With version 5.0.0 we introduced new bundle formats. The URLs for the CDN hosted files for these new bundle formats
are as follows. Replace `vx.x.x` with the release version, for instance `v5.0.0`.

- `UMD legacy`
    - Minified
      Build: [http://cdn.dashjs.org/vx.x.x/legacy/umd/dash.all.min.js](http://cdn.dashjs.org/v5.0.0/legacy/umd/dash.all.min.js)
    - Debug
      Build: [http://cdn.dashjs.org/vx.x.x/legacy/umd/dash.all.debug.js](http://cdn.dashjs.org/v5.0.0/legacy/umd/dash.all.debug.js)
- `UMD modern`
    - Minified
      Build: [http://cdn.dashjs.org/vx.x.x/modern/umd/dash.all.min.js](http://cdn.dashjs.org/v5.0.0/modern/umd/dash.all.min.js)
    - Debug
      Build: [http://cdn.dashjs.org/vx.x.x/modern/umd/dash.all.debug.js](http://cdn.dashjs.org/v5.0.0/modern/umd/dash.all.debug.js)
- `ESM modern`
    - Minified
      Build: [http://cdn.dashjs.org/vx.x.x/modern/esm/dash.all.min.js](http://cdn.dashjs.org/v5.0.0/modern/esm/dash.all.min.js)
    - Debug
      Build: [http://cdn.dashjs.org/vx.x.x/modern/esm/dash.all.debug.js](http://cdn.dashjs.org/v5.0.0/modern/esm/dash.all.debug.js)

Multiple examples how to use dash.js in your Typescript or Webpack based JavaScript project can be found in `samples/modules`.


# API Documentation

The full [API Documentation](http://cdn.dashjs.org/latest/jsdoc/module-MediaPlayer.html) is available describing all
public methods, interfaces, properties, and events.

For help, join our [Slack channel](https://dashif-slack.azurewebsites.net),
our [email list](https://groups.google.com/d/forum/dashjs) and read the documentation on this website.

# License

dash.js is released under [BSD license](https://github.com/Dash-Industry-Forum/dash.js/blob/development/LICENSE.md)
