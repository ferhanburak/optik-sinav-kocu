// React Native modüllerinin node taklitleri
const mem = {};
module.exports = {
  __esModule: true,
  default: { getItem: async (k) => mem[k] ?? null, setItem: async (k, v) => { mem[k] = v; } },
  printToFileAsync: async () => ({ uri: "file://x.pdf" }),
  isAvailableAsync: async () => true,
  shareAsync: async () => {},
};
