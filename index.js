const webpack = require('webpack');
const { RawSource } = webpack.sources || require('webpack-sources');
const path = require("path");
const fs = require("fs");
const postcss = require('postcss');
const less = require('less');
const NpmImportPlugin = require('less-plugin-npm-import');
const generateThemePalette = require('./src/utils/generateThemePalette');
const { generateColorMap, combineLess, compileAllLessFilesToCss } = require('./src/utils');

const exportFileName = 'custom-theme.css';
const defaultOutputDir = '/css';

const reducePlugin = postcss.plugin('reducePlugin', () => (css) => {
  css.walkAtRules(atRule => {
    atRule.remove();
  });

  css.walkComments(c => c.remove());
});

const validVariables = [
  '@brand-color',
  '@success-color',
  '@error-color',
  '@warning-color'
]


/**
 * 1. Generate theme palette for valid variables
 * 2. Use tdesign default variables and custom variables
 * 3. Override tdesign component styles
 */
class ThemePlugin {
  /**
   * 
   * @param {{
   *  varFile: custom variables file
   * }} options 
   */
  constructor(options = {}) {
    const defaultOptions = {
      tdDir: path.join(__dirname, "../../node_modules/tdesign-vue"),
      indexFileName: "index.html",
      generateOnce: false,
      output: defaultOutputDir,
      entry: path.join(__dirname, "./src/styles/index.less"),
      stylesDir: path.join(__dirname, "./src/styles"),
      themeVariables: ['@brand-color']
    };
    this.options = Object.assign(defaultOptions, options);
    this.initOptions()
    this.version = webpack.version;
  }

  initOptions() {
    let { varFile, tdStylesDir, themeVariables, tdDir } = this.options
    varFile = varFile || path.join(tdDir, "./esm/_common/style/web/_variables.less"),

    tdStylesDir = tdStylesDir || path.join(tdDir, './esm/_common/style/web')
    themeVariables = validVariables.filter(validVar => themeVariables.includes(validVar))
    const nodeModulesPath = path.join(
      tdDir.slice(0, tdDir.indexOf("node_modules")),
      "./node_modules"
    );
    this.options = {
      ...this.options,
      varFile,
      tdStylesDir, themeVariables, nodeModulesPath
    }
  }

  apply(compiler) {
    const pluginName = 'ThemePlugin';
    compiler.hooks.emit.tapAsync(pluginName, (compilation, callback) =>
      this.addAssets(compilation, compilation.assets, callback));
  }

  async addAssets(compilation, assets, callback) {
    this.generateIndexContent(assets, compilation);
    const { generateOnce } = this.options;

    if (generateOnce && this.colors) {
      this.generateColorStylesheet(compilation, this.colors);
      return callback();
    }
    try {
      const css = await this.generateCssContent();
      if (generateOnce) {
        this.colors = css;
      }
      this.generateColorStylesheet(compilation, css);
      callback();
    } catch (error) {
      callback(error);
    }
  };

  /**
   * generate color palette for every theme variables
   * @returns {Object} - return color palette key-value map
   * @example { '--td-brand-color-1': '#123456' }
   */
  generateVarContent() {
    const varFileContent = fs.readFileSync(this.options.varFile).toString()
    const mappings = generateColorMap(varFileContent);
    const content = Object.entries(mappings).reduce((prev, [varName, color]) => {
      if (!this.options.themeVariables.includes(varName)) {
        return prev
      }
      // theme palette color
      const palettes = generateThemePalette(color)
      const name = varName.replace('@', '')
      palettes.forEach((c, i) => {
        prev += `--td-${name}-${i+1}: ${c};`
      })
      const actionColor = `
      --td-${name}-light: var(--td-${name}-1);
      --td-${name}-focus: var(--td-${name}-2);
      --td-${name}-disabled: var(--td-${name}-3);
      --td-${name}-hover: var(--td-${name}-4);
      --td-${name}: var(--td-${name}-5);
      --td-${name}-active: var(--td-${name}-6);
      `
      return prev + actionColor
    }, "")
    return `:root,:root[theme-mode="light"],:root[theme-mode="dark"] {${content}}`
  }

  getVarMappings() {
    const { varFile, nodeModulesPath } = this.options
    const varFileContent = combineLess(varFile, nodeModulesPath)
    return generateColorMap(varFileContent)
  }

  /**
   * transform all less file and bundle into a css file
   * @returns {Promise<string>} css string promise
   */
  async generateCssContent() {
    let { stylesDir, tdStylesDir, varFile } = this.options
    const mappings = this.getVarMappings()
    const themePaletteContent = this.generateVarContent()
    const varsContent = Object.entries(mappings).reduce((prev, [varName, color]) => prev + `${varName}: ${color};`, "")
    const userCustomCss = await compileAllLessFilesToCss(
      stylesDir,
      tdStylesDir,
      mappings,
      varFile
    );
    let results = await less.render(`${themePaletteContent}\n${varsContent}`, {
      paths: [tdStylesDir].concat(stylesDir),
      javascriptEnabled: true,
      plugins: [new NpmImportPlugin({ prefix: "~" })],
    })
    let css = `${results.css}\n${userCustomCss}`
    return Promise.resolve(postcss([reducePlugin, require('postcss-minify')]).process(css, {
      from: path.join(tdStylesDir, 'index.less'),
    })).then(res => res.css)
  }

  generateIndexContent(assets, compilation) {
    if (
      this.options.indexFileName &&
      this.options.indexFileName in assets
    ) {
      const index = assets[this.options.indexFileName];
      const content = index.source();

      if (!content.match(/\/override-tdesign-style\.css/g)) {
        const less = `
          <link rel="stylesheet" href="/${exportFileName}" />
          <script>
            window.less = {
              async: false,
              env: 'production'
            };
          </script>
        `;

        const updatedContent = content.replace(less, "").replace(/<body>/gi, `<body>${less}`);

        if (this.version.startsWith('5.')) {
          compilation.updateAsset(this.options.indexFileName, new RawSource(updatedContent), { size: updatedContent.length });
          return;
        }

        index.source = () => updatedContent;
        index.size = () => updatedContent.length;
      }
    }
  };

  generateColorStylesheet(compilation, source) {

    if (this.version.startsWith('5.')) {
      compilation.emitAsset(exportFileName, new RawSource(source), { size: source.length });
      return;
    }

    compilation.assets[exportFileName] = {
      source: () => source,
      size: () => source.length
    };
  };
}


module.exports = ThemePlugin;
