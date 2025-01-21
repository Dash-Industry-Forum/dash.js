---
layout: default
title: Installation / Build
nav_order: 1
parent: Quickstart
---

# Installation & Build  

There are multiple ways to obtain the bundled `dist` files of dash.js for usage in your application.

## Bundle formats

### Version 4.x and older

In version 4.x and older versions of dash.js there is only one bundle format available. It is a `UMD` build that does
not contain any polyfills.

### Version 5.x and newer

With version 5 of dash.js we introduced three different bundle formats:

* `UMD legacy`: A `UMD` build targeting legacy platforms by specifying the babel target  `ie: '11'`. In addition,
  `core.js` polyfills are enabled.
* `ESM modern`: An `ESM` build using `.browserslistrc` as target, with target set to `defaults`. **No** `core.js`
  polyfills are enabled.
* `UMD modern`:  A `UMD` build targeting modern platforms using `.browserslistrc` as target, with target set to
  `defaults`. **No** `core.js` polyfills are enabled.

All the bundled files are located in the `dist` directory of the repository. The `legacy` folder inside the `dist`
folder contains the `UMD legacy` build. The `modern` folder inside the `dist` folder contains both the `ESM modern` and
the `UMD modern` build.

### General Note

Note that only the `master` branch of dash.js includes the `dist` folder. If you are working with the `development`
branch, you need to build the bundles yourself. For that reason, check
the [Build dist files yourself](#build-dist-files-yourself) section below.

## CDN hosted files

We provide the latest minified files of all releases on a global CDN. They are free to be used in production
environments. An overview
of the dash.js releases can be found on [GitHub](https://github.com/Dash-Industry-Forum/dash.js/releases).

### Version 4.x and older

All releases prior to version 5.0.0 are available under the following urls. Replace `vx.x.x` with the release version,
for
instance `v3.1.0`.

- [http://cdn.dashjs.org/vx.x.x/dash.all.min.js](http://cdn.dashjs.org/v3.1.0/dash.all.min.js)
- [http://cdn.dashjs.org/vx.x.x/dash.all.debug.js](http://cdn.dashjs.org/v3.1.0/dash.all.debug.js)

### Version 5.x and newer

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

## NPM package

We publish dash.js to [npm](https://www.npmjs.com/package/dashjs). Examples of how to use dash.js in different module
bundlers can be found in
the [`samples/modules`](https://github.com/Dash-Industry-Forum/dash.js/tree/development/samples/modules) directory of
the dash.js repository.

### Version 4.x and older

For version 4.x and older, we define the following entry point in the `package.json`:

````json
{
  "main": "dist/dash.all.min.js"
}
````

### Version 5.x and newer

For version 5.x and newer, we define the following entry points in the `package.json`:

````json
{
  "types": "./index.d.ts",
  "import": "./dist/modern/esm/dash.all.min.js",
  "default": "./dist/modern/esm/dash.all.min.js",
  "browser": "./dist/modern/umd/dash.all.min.js",
  "script": "./dist/modern/umd/dash.all.min.js",
  "require": "./dist/modern/umd/dash.all.min.js"
}
````

## Building the `dist` files 

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


