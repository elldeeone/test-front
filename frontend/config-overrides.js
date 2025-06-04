const { override, addWebpackModuleRule, addWebpackResolve } = require('customize-cra');

module.exports = override(
  // Add polyfills for Node.js modules
  addWebpackResolve({
    fallback: {
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "buffer": require.resolve("buffer"),
      "process": require.resolve("process/browser"),
      "os": require.resolve("os-browserify/browser"),
      "path": require.resolve("path-browserify"),
      "assert": require.resolve("assert"),
      "util": require.resolve("util"),
      "url": require.resolve("url"),
      "querystring": require.resolve("querystring"),
      "vm": require.resolve("vm-browserify"),
      "events": require.resolve("events"),
      "fs": false,
      "net": false,
      "tls": false,
      "child_process": false
    }
  }),
  
  // Provide global variables that Node.js modules expect
  (config) => {
    config.plugins.push(
      new (require('webpack')).ProvidePlugin({
        Buffer: ['buffer', 'Buffer'],
        process: 'process/browser'
      })
    );
    return config;
  },

  // Handle WASM files
  addWebpackModuleRule({
    test: /\.wasm$/,
    type: 'webassembly/async'
  })
); 