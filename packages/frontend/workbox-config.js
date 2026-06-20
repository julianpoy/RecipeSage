module.exports = {
  globDirectory: "www/",
  globPatterns: [
    // "assets/fonts/roboto*.woff2",
    // "assets/**/*.{png,jpg}",
    "*.css",
    "*.js",
    // "index.html" intentionally omitted so the shell stays NetworkFirst
  ],
  modifyURLPrefix: {
    "": "/app/",
  },
  dontCacheBustURLsMatching: new RegExp(".+.[a-f0-9]{20}..+"),
  maximumFileSizeToCacheInBytes: 5000000,
  swSrc: "src/service-worker.js",
  swDest: "www/service-worker.js",
};
