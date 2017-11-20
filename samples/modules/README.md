# dash.js Module Samples
These samples give examples of how the dash.js library can be consumed in different module loaders.

Each directory contains a standalone package with a build setup to run with `npm run build`. The result
file will be placed in `out/out.js`.

Please, take into account there were some issues with the way dash.js modules/classes were exported and in its declaration files that make these samples don't work with dash.js v2.6.3 and below. Please, read the project [FAQ](https://github.com/Dash-Industry-Forum/dash.js/wiki/FAQ) to get information about how to use dash.js in webpack based projects for dash.js 2.6.3 and below.

## WebPack with Babel Loader
If you are using [WebPack](https://webpack.github.io/) with the [Babel Loader](https://github.com/babel/babel-loader)
and the [ES2015 Preset](https://babeljs.io/docs/plugins/preset-es2015/) you can consume the dash.js modules directly from source.
To see an example of this check out the files in the `webpack` directory.

## WebPack with Typescript
Sample similar to the previous one but using Typescript instead of Babel/ES2015 presets
To see an example of this check out the files in the `typescript` directory.
