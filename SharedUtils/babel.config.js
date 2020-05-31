module.exports = {
  presets: [
    [
      '@babel/preset-env',
      {
        targets: "defaults, maintained node versions",
        useBuiltIns: "usage",
        corejs: 3
      }
    ],
  ],
  ignore: [/core-js/]
};
