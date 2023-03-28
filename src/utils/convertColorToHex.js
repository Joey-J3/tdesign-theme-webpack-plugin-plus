module.exports = function convertColorToHex(color) {
  if (typeof color === 'string') {
    // 处理字符串类型的颜色值
    if (color.startsWith('#')) {
      // 以 # 开头的十六进制颜色值
      return color;
    } else if (/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.test(color)) {
      // RGB 颜色值
      const [, r, g, b] = /^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/.exec(color);
      return `#${Number(r).toString(16)}${Number(g).toString(16)}${Number(b).toString(16)}`;
    } else if (/^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.test(color)) {
      // RGBA 颜色值
      const [, r, g, b, a] = /^rgba\((\d+),\s*(\d+),\s*(\d+),\s*([\d.]+)\)$/.exec(color);
      return `#${Number(r).toString(16)}${Number(g).toString(16)}${Number(b).toString(16)}${Math.round(Number(a) * 255).toString(16).padStart(2, '0')}`;
    } else if (/^hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)$/.test(color)) {
      // HSL 颜色值
      const [, h, s, l] = /^hsl\((\d+),\s*([\d.]+)%,\s*([\d.]+)%\)$/.exec(color);
      const rgb = hslToRgb(h, s / 100, l / 100);
      return `#${Number(rgb[0]).toString(16)}${Number(rgb[1]).toString(16)}${Number(rgb[2]).toString(16)}`;
    } else if (/^hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)$/.test(color)) {
      // HSLA 颜色值
      const [, h, s, l, a] = /^hsla\((\d+),\s*([\d.]+)%,\s*([\d.]+)%,\s*([\d.]+)\)$/.exec(color);
      const rgb = hslToRgb(h, s / 100, l / 100);
      return `#${Number(rgb[0]).toString(16)}${Number(rgb[1]).toString(16)}${Number(rgb[2]).toString(16)}${Math.round(Number(a) * 255).toString(16).padStart(2, '0')}`;
    }
  } else if (Array.isArray(color)) {
    // 处理数组类型的颜色值
    if (color.length === 3) {
      // RGB 颜色值
      return `#${Number(color[0]).toString(16)}${Number(color[1]).toString(16)}${Number(color[2]).toString(16)}`;
    } else if (color.length === 4) {
      // RGBA 颜色值
      return `#${Number(color[0]).toString(16)}${Number(color[1]).toString(16)}${Number(color[2]).toString(16)}${Math.round(Number(color[3]) * 255).toString(16).padStart(2, '0')}`;
    }
  }
  
  // 处理不支持的颜色值
  throw new Error('Unsupported color value.');
}

const hslToRgb = (h, s, l) => {
  s /= 100;
  l /= 100;
  const k = n => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = n =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [255 * f(0), 255 * f(8), 255 * f(4)];
};