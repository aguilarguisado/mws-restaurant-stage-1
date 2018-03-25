importScripts('https://storage.googleapis.com/workbox-cdn/releases/3.0.0/workbox-sw.js');

if (workbox) {

    // Google fonts cache
    workbox.routing.registerRoute(
        new RegExp('https://fonts.(?:googleapis|gstatic).com/(.*)'),
        workbox.strategies.cacheFirst(),
    );
    
    // Image chaching
    workbox.routing.registerRoute(
    /\.(?:png|gif|jpg|jpeg|svg|webp)$/,
    workbox.strategies.cacheFirst({
        cacheName: 'images',
        plugins: [
        new workbox.expiration.Plugin({
            maxEntries: 60,
            maxAgeSeconds: 15 * 24 * 60 * 60 // 15 Days
        })
        ]
    })
    );

    // js, css and json files
    workbox.routing.registerRoute(
        /\.(?:js|css|json)$/,
        workbox.strategies.staleWhileRevalidate({
            cacheName: 'files'
        })
    );

    // Google maps request cache
    workbox.routing.registerRoute(
        new RegExp('https://maps.googleapis.com/maps/api/(.*)'),
        workbox.strategies.networkFirst()
    );

    // pages caching
    workbox.routing.registerRoute(
        new RegExp('restaurant.html(.*)'),
        workbox.strategies.networkFirst({
            cacheName: 'html-pages'
        })
    );
    
    // Html caching
    workbox.precaching.precacheAndRoute([
        'index.html',
        'restaurant.html'
    ]);
} else {
  console.log(`Workbox load error`);
}
