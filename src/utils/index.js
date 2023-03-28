const fs = require('fs');
const path = require('path');
const { globSync } = require('glob');
const less = require('less')
const NpmImportPlugin = require('less-plugin-npm-import')
const hash = require('hash.js');

/*
  This function takes color string as input and return true if string is a valid color otherwise returns false.
  e.g.
  isValidColor('#ffffff'); //true
  isValidColor('#fff'); //true
  isValidColor('rgba(0, 0, 0, 0.5)'); //true
  isValidColor('20px'); //false
*/
function isValidColor(color) {
  if (color && color.includes("rgb")) return true;
  if (!color || color.match(/px/g)) return false;
  if (color.includes("var")) return true;
  if (color.charAt(0) === "#") {
    color = color.substring(1);
    return (
      [3, 4, 6, 8].indexOf(color.length) > -1 && !isNaN(parseInt(color, 16))
    );
  }
  // eslint-disable-next-line
  const isColor = /^(rgb|hsl|hsv)a?\((\d+%?(deg|rad|grad|turn)?[,\s]+){2,3}[\s\/]*[\d\.]+%?\)$/i.test(
    color
  );
  if (isColor) return true;
  return false;
}

/*
  Recursively get the color code assigned to a variable e.g.
  @primary-color: #1890ff;
  @link-color: @primary-color;

  @link-color -> @primary-color ->  #1890ff
  Which means
  @link-color: #1890ff
*/
function getColor(varName, mappings) {
  const color = mappings[varName];
  if (color in mappings) {
    return getColor(color, mappings);
  } else {
    return color;
  }
}
/*
  Read following files and generate color variables and color codes mapping
    - Ant design color.less, themes/default.less
    - Your own variables.less
  It will generate map like this
  {
    '@primary-color': '#00375B',
    '@info-color': '#1890ff',
    '@success-color': '#52c41a',
    '@error-color': '#f5222d',
    '@normal-color': '#d9d9d9',
    '@primary-6': '#1890ff',
    '@heading-color': '#fa8c16',
    '@text-color': '#cccccc',
    ....
  }
*/
function generateColorMap(content) {
  return content
    .split("\n")
    .filter((line) => line.startsWith("@") && line.indexOf(":") > -1)
    .reduce((prev, next) => {
      try {
        const matches = next.match(
          /(?=\S*['-])([@a-zA-Z0-9'-]+).*:[ ]{1,}(.*);/
        );
        if (!matches) {
          return prev;
        }
        let [, varName, color] = matches;
        if (color && color.startsWith("@")) {
          color = getColor(color, prev);
          if (!isValidColor(color)) return prev;
          prev[varName] = color;
        } 
        prev[varName] = color;
        return prev;
      } catch (e) {
        console.log("e", e);
        return prev;
      }
    }, {});
}

function combineLess(filePath, nodeModulesPath) {
  const fileContent = fs.readFileSync(filePath).toString();
  const directory = path.dirname(filePath);
  return fileContent
    .split("\n")
    .map((line) => {
      if (line.startsWith("@import")) {
        let importPath = line.match(/@import[^'"]*['"](.*)['"]/)[1];
        if (!importPath.endsWith(".less")) {
          importPath += ".less";
        }
        let newPath = path.join(directory, importPath);
        if (importPath.startsWith("~")) {
          importPath = importPath.replace("~", "");
          newPath = path.join(nodeModulesPath, `./${importPath}`);
        }
        return combineLess(newPath, nodeModulesPath);
      }
      return line;
    })
    .join("\n");
}

function getLessVars(filtPath) {
  const sheet = fs.readFileSync(filtPath).toString();
  const lessVars = {};
  const matches = sheet.match(/@(.*:[^;]*)/g) || [];

  matches.forEach((variable) => {
    const definition = variable.split(/:\s*/);
    const varName = definition[0].replace(/['"]+/g, "").trim();
    lessVars[varName] = definition.splice(1).join(":");
  });
  return lessVars;
}

async function compileAllLessFilesToCss(
  stylesDir,
  tdStylesDir,
  varMap = {},
  varPath
) {
  /*
    Get all less files path in styles directory
    and then compile all to css and join
  */
  const stylesDirs = [].concat(stylesDir);
  let styles = [];
  stylesDirs.forEach((s) => {
    styles = styles.concat(globSync(path.join(s, "./**/*.less")));
  });
  const csss = await Promise.all(
    styles.map((filePath) => {
      let fileContent = fs.readFileSync(filePath).toString();
      // Removed imports to avoid duplicate styles due to reading file separately as well as part of parent file (which is importing)
      // if (avoidDuplicates) fileContent = fileContent.replace(/@import\ ["'](.*)["'];/g, '\n');
      const r = /@import ["'](.*)["'];/g;
      const directory = path.dirname(filePath);
      fileContent = fileContent.replace(r, function (
        match,
        importPath,
        index,
        content
      ) {
        if (!importPath.endsWith(".less")) {
          importPath += ".less";
        }
        const newPath = path.join(directory, importPath);
        // If imported path/file already exists in styles paths then replace import statement with empty line
        if (styles.indexOf(newPath) === -1) {
          return match;
        } else {
          return "";
        }
      });
      Object.keys(varMap).forEach((varName) => {
        fileContent = fileContent.replace(
          new RegExp(`(:.*)(${varName})`, "g"),
          (match, group, a) => {
            return match.replace(varName, varMap[varName]);
          }
        );
      });
      fileContent = `@import "${varPath}";\n${fileContent}`;
      // fileContent = `@import "~antd/lib/style/themes/default.less";\n${fileContent}`;
      return less
        .render(fileContent, {
          paths: [tdStylesDir].concat(stylesDir),
          filename: path.resolve(filePath),
          javascriptEnabled: true,
          plugins: [new NpmImportPlugin({ prefix: "~" })],
        })
        .then((res) => res.css)
        .catch((e) => {
          console.error(`Error occurred compiling file ${filePath}`);
          console.error("Error", e);
          return "\n";
        });
    })
  );
  const hashes = {};

  return csss
    .map((css) => {
      const hashCode = hash.sha256().update(css).digest("hex");
      if (hashCode in hashes) {
        return "";
      } else {
        hashes[hashCode] = hashCode;
        return css;
      }
    })
    .join("\n");
}

module.exports = {
  generateColorMap,
  combineLess,
  getLessVars,
  compileAllLessFilesToCss,
}