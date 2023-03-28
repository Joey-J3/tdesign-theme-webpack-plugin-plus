const path = require('path')
const { defineConfig } = require('@vue/cli-service')
const TdesignThemeWebpackPlugin = require('../../index');

module.exports = defineConfig({
  transpileDependencies: true,
  configureWebpack: {
    plugins: [
      new TdesignThemeWebpackPlugin({
        varFile: path.join(__dirname, './src/styles/override-styles/variables.less'),
        tdDir: path.join(__dirname, './node_modules/tdesign-vue'),
        stylesDir: path.join(__dirname, './src/styles/override-styles'),
        themeVariables: ['@brand-color']
      })
    ]
  }
})
