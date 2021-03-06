/**
 * Common database helper functions.
 */
class DBHelper {

  /**
   * Registering service worker
   */

  static registerServiceWorker(){
    if ('serviceWorker' in navigator)
      navigator.serviceWorker.register('mws-sw.js').then(function(){
        console.log('Registration worked!');
      }).catch(function(){
        console.log('Registration failed');
      });
  }

  /**
   * Open database
   */

  static openDatabase(){

    // If the browser does not suppor service worker we don't care abour having a database.
    if(!navigator.serviceWorker){
      return Promise.resolve();
    }

    return  idb.open('restaurants-db', 1, function(upgradeDb){
        const store = upgradeDb.createObjectStore('restaurants', {
            keyPath: 'id'
        });
    });
 
  }

  static openOfflineReviewsDatabase(){

    // If the browser does not suppor service worker we don't care abour having a database.
    if(!navigator.serviceWorker){
      return Promise.resolve();
    }

    return  idb.open('offline-reviews', 1, function(upgradeDb){
        const store = upgradeDb.createObjectStore('offline-reviews', {
            keyPath: 'restaurant_id'
        });
    });
 
  }

  static saveRestaurants(restaurants){

    const dbPromise = DBHelper.openDatabase();
    
    return dbPromise.then(function(db){
      if(!db) return;

      const tx = db.transaction('restaurants', 'readwrite');
      const store = tx.objectStore('restaurants');
      
      for(let i = 0; i< restaurants.length; i++){
        store.put(restaurants[i]);
      }

    });
  }

  static saveRestaurantWithReviews(restaurant, reviews){

    const dbPromise = DBHelper.openDatabase();
    
    return dbPromise.then(function(db){
      if(!db) return;
        if(restaurant){
          restaurant.reviews = reviews;
          restaurant.reviews = restaurant.reviews.map(
            function(review){
              review.offline = undefined; 
              return review;
          })
          return DBHelper.saveRestaurants([restaurant]);
        }
    });
  }

  static saveOfflineReview(review){

    const dbPromise = DBHelper.openOfflineReviewsDatabase();
    
    return dbPromise.then(function(db){
      if(!db) return;
        const tx = db.transaction('offline-reviews', 'readwrite');
        const store = tx.objectStore('offline-reviews');
        store.put(review);
    });
  }

  static getCachedOfflineReviews(){
    const dbPromise = DBHelper.openOfflineReviewsDatabase();
    
		return dbPromise.then(function(db){
      if (!db) return;

      const tx = db.transaction('offline-reviews');
      const store = tx.objectStore('offline-reviews');
      
			return store.getAll();

    });
  }

  static resendOfflineReviews(callback) {
			DBHelper.getCachedOfflineReviews().then(offlineReviews => {

        offlineReviews.forEach(review => {
					DBHelper.sendReview(review, callback);
        });
        
				DBHelper.clearOfflineReviews();
			});
	}

	static clearOfflineReviews() {
    const dbPromise = DBHelper.openOfflineReviewsDatabase();
    
		dbPromise.then(db => {
			const tx = db.transaction('offline-reviews', 'readwrite');
			const store = tx.objectStore('offline-reviews').clear();
		})
		return;
	}
 
  static getCachedRestaurants(callback){

    const dbPromise = DBHelper.openDatabase();
    
    return dbPromise.then(function(db){
      if(!db) return;

      const index = db.transaction('restaurants')
      .objectStore('restaurants');

      return index.getAll().then(function(restaurants){
        if (restaurants)
          callback(null, restaurants);  
      });      

    });
  }

  
  static getCachedRestaurant(restaurantId, callback){

    const dbPromise = DBHelper.openDatabase();
    
    return dbPromise.then(function(db){
      if(!db) return;
      
      const index = db.transaction('restaurants').objectStore('restaurants');

      return index.get(parseInt(restaurantId)).then(function(restaurant){
        if (!restaurant){
          const error = (`Restaurant with id ${restaurantId} not found`);
          callback(error, null);
        }

        return restaurant;

      }).then(function(restaurant){
        if(restaurant){
          //Getting offline reviews if there is any
          DBHelper.getCachedOfflineReviews().then(reviews => {
            const offlineReviews = reviews.filter(review => review.restaurant_id == restaurant.id).map(
              function(review){
                review.offline = true; 
                return review;
            });
            if(!restaurant.reviews) restaurant.reviews = [];
            if(!offlineReviews) offlineReviews = [];
            restaurant.reviews = restaurant.reviews.concat(offlineReviews);
            callback(null, restaurant);
          });
        }
      });
    });
  }
  

  /**
   * Database URL.
   */
  static get DATABASE_URL() {
    const port = 1337 // Change this to your server port
    return `http://localhost:${port}`;
  }


  static get RESTAURANTS_URL() {
    const port = 1337 // Change this to your server port
    return this.DATABASE_URL + '/restaurants';
  }

  static get REVIEWS_URL() {
    const port = 1337 // Change this to your server port
    return this.DATABASE_URL + '/reviews/?restaurant_id=';
  }

  /**
   * Fetch all restaurants.
   */
  static fetchRestaurants(callback) {

    // We get first cached restaurants
    DBHelper.getCachedRestaurants(callback);

    let xhr = new XMLHttpRequest();
    xhr.open('GET', DBHelper.RESTAURANTS_URL);
    xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
        const json = JSON.parse(xhr.responseText);
        const restaurants = json;
        DBHelper.saveRestaurants(restaurants);
        callback(null, restaurants);
      } else { // Oops!. Got an error from server.
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    };
    xhr.send();
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchRestaurantById(id, callback) {

    // We get first cached restaurants
    DBHelper.getCachedRestaurant(id, callback);

    let xhr = new XMLHttpRequest();
    xhr.open('GET', DBHelper.RESTAURANTS_URL+'/'+id);
    xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
        const json = JSON.parse(xhr.responseText);
        const restaurant = json;

        if (restaurant) { // Got the restaurant
          DBHelper.fetchReviewsByRestaurant(restaurant, callback);
          callback(null, restaurant);
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      } else { // Oops!. Got an error from server.
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    };
    xhr.send();
  }

  /**
   * Fetch a restaurant by its ID.
   */
  static fetchReviewsByRestaurant(restaurant, callback) {
    const id = restaurant.id;

    let xhr = new XMLHttpRequest();
    xhr.open('GET', DBHelper.REVIEWS_URL+id);
    xhr.onload = () => {
      if (xhr.status === 200) { // Got a success response from server!
        const json = JSON.parse(xhr.responseText);
        const reviews = json;

        if (reviews) { // Got the restaurant
          DBHelper.saveRestaurantWithReviews(restaurant, reviews).then(()=>DBHelper.getCachedRestaurant(id, callback)); 
        } else { // Restaurant does not exist in the database
          callback('Restaurant does not exist', null);
        }
      } else { // Oops!. Got an error from server.
        const error = (`Request failed. Returned status of ${xhr.status}`);
        callback(error, null);
      }
    };
    xhr.send();
  }


  static sendReview(review, callback){

      // We are using fetch to implement both ways to make requests (other times we have used XMLHttpRequest)
      
      return fetch(`${DBHelper.DATABASE_URL}/reviews`, {
        body: JSON.stringify(review), 
        cache: 'cache',
        credentials: 'same-origin',
        headers: {
          'content-type': 'application/json',
        },
        method: 'POST',
        mode: 'cors', 
        redirect: 'follow', 
        referrer: 'referrer', 
      })
      .then(response => DBHelper.fetchRestaurantById(review.restaurant_id, callback))
      .catch(error => {
        /**
         * We store in db to send after
         */
        review.createdAt = new Date().getTime();
        
        // Store into Indexed DB
        DBHelper.saveOfflineReview(review);

        return;
      });
  }

  /**
   * Fetch restaurants by a cuisine type with proper error handling.
   */
  static fetchRestaurantByCuisine(cuisine, callback) {
    // Fetch all restaurants  with proper error handling
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given cuisine type
        const results = restaurants.filter(r => r.cuisine_type == cuisine);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a neighborhood with proper error handling.
   */
  static fetchRestaurantByNeighborhood(neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Filter restaurants to have only given neighborhood
        const results = restaurants.filter(r => r.neighborhood == neighborhood);
        callback(null, results);
      }
    });
  }

  /**
   * Fetch restaurants by a cuisine and a neighborhood with proper error handling.
   */
  static fetchRestaurantByCuisineAndNeighborhood(cuisine, neighborhood, callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        let results = restaurants
        if (cuisine != 'all') { // filter by cuisine
          results = results.filter(r => r.cuisine_type == cuisine);
        }
        if (neighborhood != 'all') { // filter by neighborhood
          results = results.filter(r => r.neighborhood == neighborhood);
        }
        callback(null, results);
      }
    });
  }

  /**
   * Fetch all neighborhoods with proper error handling.
   */
  static fetchNeighborhoods(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all neighborhoods from all restaurants
        const neighborhoods = restaurants.map((v, i) => restaurants[i].neighborhood)
        // Remove duplicates from neighborhoods
        const uniqueNeighborhoods = neighborhoods.filter((v, i) => neighborhoods.indexOf(v) == i)
        callback(null, uniqueNeighborhoods);
      }
    });
  }

  /**
   * Fetch all cuisines with proper error handling.
   */
  static fetchCuisines(callback) {
    // Fetch all restaurants
    DBHelper.fetchRestaurants((error, restaurants) => {
      if (error) {
        callback(error, null);
      } else {
        // Get all cuisines from all restaurants
        const cuisines = restaurants.map((v, i) => restaurants[i].cuisine_type)
        // Remove duplicates from cuisines
        const uniqueCuisines = cuisines.filter((v, i) => cuisines.indexOf(v) == i)
        callback(null, uniqueCuisines);
      }
    });
  }

  /** Images srcset */
  static buildSrcSet(restaurant, altText){

  /** Media sizes
   *  Large: 700px; (>900)
   *  Medium: 450px;(900<w<600)
   *  Small: 300px; (<600)
   */

  //const dotIdx = restaurant.photograph.lastIndexOf('.');
  const rootDirectory = 'images_src/';
  //const imageName = restaurant.photograph.substr(0, dotIdx);
  const extension = '.webp';// restaurant.photograph.substr(dotIdx);

  const path = rootDirectory + restaurant.photograph;

  return `
    <source media="(min-width:900px)" 
      srcset="${path}-large_x1${extension} 1x, ${path}-large_x2${extension} 2x">
    <source media="(max-width: 900px) and (min-width: 600px)" 
      srcset="${path}-medium_x1${extension} 1x, ${path}-medium_x2${extension} 2x">
    <source media="(max-width: 600px)"
      srcset="${path}-small_x1${extension} 1x, ${path}-small_x2${extension} 2x">
    <img class="restaurant-img" src="${path}.webp" alt="${altText}">
  `;
  }

  /**
   * Restaurant page URL.
   */
  static urlForRestaurant(restaurant) {
    return (`./restaurant.html?id=${restaurant.id}`);
  }

  

  /**
   * Map marker for a restaurant.
   */
  static mapMarkerForRestaurant(restaurant, map) {
    const marker = new google.maps.Marker({
      position: restaurant.latlng,
      title: restaurant.name,
      url: DBHelper.urlForRestaurant(restaurant),
      map: map,
      animation: google.maps.Animation.DROP}
    );
    return marker;
  }

}
