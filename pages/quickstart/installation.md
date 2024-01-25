---
layout: default
title: Installation / Build
nav_order: 1
parent: Quickstart
---

# Installation

There are multiple ways to obtain the `dist` files of dash.js to be included in your application

## CDN hosted files

The latest minified files have been hosted on a global CDN and are free to use in production:

- [dash.all.min.js](http://cdn.dashjs.org/latest/dash.all.min.js)
- [dash.all.debug.js](http://cdn.dashjs.org/latest/dash.all.debug.js)

In addition, all the releases are available under the following urls. Replace `vx.x.x` with the release version, for
instance `v3.1.0`.

- [http://cdn.dashjs.org/vx.x.x/dash.all.min.js](http://cdn.dashjs.org/v3.1.0/dash.all.min.js)
- [http://cdn.dashjs.org/vx.x.x/dash.all.debug.js](http://cdn.dashjs.org/v3.1.0/dash.all.debug.js)

An overview of the dash.js releases can be found on [Github](https://github.com/Dash-Industry-Forum/dash.js/releases).

## Build dist files yourself

To build the `dist` files of the latest stable release yourself run the following steps:

1. Install Core Dependencies
    * [Install NodeJS](http://nodejs.org/)
2. Checkout project repository (default branch: `development`)
    * ```git clone https://github.com/Dash-Industry-Forum/dash.js.git```
3. Change branch to `master`
    * ```git checkout -b master origin/master```
4. Install dependencies
    * ```npm install```
5. Build the `dist` files.
    * ```npm run build```

## NPM package

We publish dash.js to [npm](https://www.npmjs.com/package/dashjs). Examples of how to use dash.js in different module
bundlers can be found in
the [`samples/modules`](https://github.com/Dash-Industry-Forum/dash.js/tree/development/samples/modules) directory.
