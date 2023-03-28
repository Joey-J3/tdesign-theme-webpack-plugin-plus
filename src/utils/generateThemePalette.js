const { harmony, colorScheme } = require("simpler-color");
const convertColorToHex = require("./convertColorToHex");

const toneList = [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 95, 98, 100]

module.exports = function generateThemePalette(color) {
  const hex = convertColorToHex(color);
  const baseColors = harmony(hex);
  const scheme = colorScheme(
    baseColors,
    colors => toneList.reverse().map(tone => colors.primary(tone))
  )
  return scheme.slice(2, 12)
}
