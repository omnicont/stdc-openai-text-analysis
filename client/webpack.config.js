const fs = require('fs');
const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  entry: './src/index.jsx',
  mode: 'development',
  plugins: [
    new HtmlWebpackPlugin({ template: './public/index.html' })
  ],
  devServer: {
    port: 3001,
    server: {
      type: 'https',
      options: {
        key: fs.readFileSync(path.resolve(__dirname, '../server.key')),
        cert: fs.readFileSync(path.resolve(__dirname, '../server.crt')),
      }
    },
    proxy: [
      {
        context: ['/api'],
        target: 'https://localhost:3000',
        secure: false,
        changeOrigin: true
      }
    ],
    historyApiFallback: true
  },
  module: {
    rules: [
      {
        test: /\.jsx?$/,
        exclude: /node_modules/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-react']
          }
        }
      }
    ]
  },
  resolve: {
    extensions: ['.js', '.jsx']
  }
};
