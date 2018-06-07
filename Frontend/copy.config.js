module.exports = {
  copyWorkbox: {
  src: ['./node_modules/workbox-sw/build/workbox-sw.js', 
        './node_modules/workbox-core/build/workbox-core.prod.js', 
        './node_modules/workbox-precaching/build/workbox-precaching.prod.js'],
	dest: '{{WWW}}/workbox-3.2.0'
  }
}