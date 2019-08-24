module.exports = {
  "globDirectory": "www/",
  "globPatterns": [
    // "assets/fonts/roboto*.woff2",
    "assets/**/*.png",
    "*.css",
    "*.js",
    "index.html",
    "manifest.json"
  ],
  "dontCacheBustUrlsMatching": new RegExp('.+\.[a-f0-9]{10}\..+'),
  "maximumFileSizeToCacheInBytes": 5000000,
  "swSrc": "src/service-worker.js",
  "swDest": "www/service-worker.js"
};
