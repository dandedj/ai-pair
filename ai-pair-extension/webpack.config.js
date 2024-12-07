//@ts-check

'use strict';

const path = require('path');
const webpack = require('webpack');

/** @type {import('webpack').Configuration} */
const extensionConfig = {
  target: 'node',
  mode: 'none',

  entry: './src/extension.ts',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'extension.js',
    libraryTarget: 'commonjs2',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  externals: {
    vscode: 'commonjs vscode',
    'ai-pair': 'commonjs ai-pair'
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx']
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader'
          }
        ]
      }
    ]
  },
  devtool: 'nosources-source-map'
};

/** @type {import('webpack').Configuration} */
const webviewConfig = {
  target: 'web',
  mode: 'development',
  entry: './src/webview/sidebar.tsx',
  output: {
    path: path.resolve(__dirname, 'dist', 'webview'),
    filename: 'sidebar.js',
    libraryTarget: 'umd',
    devtoolModuleFilenameTemplate: '../[resource-path]'
  },
  module: {
    rules: [
      {
        test: /\.tsx?$/,
        exclude: /node_modules/,
        use: [
          {
            loader: 'ts-loader',
            options: {
              compilerOptions: {
                module: 'esnext'
              }
            }
          }
        ]
      }
    ]
  },
  resolve: {
    extensions: ['.ts', '.tsx', '.js', '.jsx'],
    alias: {
      'vscode': path.resolve(__dirname, 'src/webview/stubs/vscode.js')
    },
    fallback: {
      "path": require.resolve("path-browserify"),
      "fs": false,
      "child_process": false,
      "timers": require.resolve("timers-browserify"),
      "process": require.resolve("process/browser"),
      "stream": require.resolve("stream-browserify")
    }
  },
  plugins: [
    new webpack.ProvidePlugin({
      React: 'react',
      process: 'process/browser'
    })
  ],
  devtool: 'source-map'
};

module.exports = [ extensionConfig, webviewConfig ];