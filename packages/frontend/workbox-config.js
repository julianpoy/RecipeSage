module.exports = {
  globDirectory: "www/browser/",
  globPatterns: [
    // "assets/fonts/roboto*.woff2",
    // "assets/**/*.{png,jpg}",
    //"svg/*.svg",
    "*.css",
    "*.js",
    // "index.html",
    "manifest.json",
  ],
  dontCacheBustURLsMatching: /-[A-Za-z0-9]{8}\.[^.]+$/,
  maximumFileSizeToCacheInBytes: 5000000,
  swSrc: "src/service-worker.js",
  swDest: "www/browser/service-worker.js",
};
