# dash.js Module Samples
These samples give examples of how the dash.js library can be consumed in different module loaders.

Each directory contains a standalone package with a build setup to run with `npm run build`. The result
file will be placed in `out/out.js`.

## WebPack with Babel Loader
If you are using [WebPack](https://webpack.github.io/) with the [Babel Loader](https://github.com/babel/babel-loader) 
and the [ES2015 Preset](https://babeljs.io/docs/plugins/preset-es2015/) you can consume the dash.js modules directly from source.
To see an example of this check out the files in the `webpack` directory.
