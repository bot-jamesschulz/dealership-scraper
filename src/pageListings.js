const findClosestImgs = require('./findClosestImgs')
const getListingData = require('./getListingData')

/**
 * Retrieves the listings of vehicles from a web page.
 * 
 * @param {Page} page - The Puppeteer page object.
 * @param {Object}  - An options object specifying if images should be retrieved.
 * @returns {Object} - An object containing the vehicle information.
 */
async function pageListings(page) {
    const TIMEOUT = 10000; // ms
    
    console.log('getting listings')
  
    let listings;
  
    const timeout = new Promise((_,reject) => {
      setTimeout(() => {
        reject(new Error('timed out'));
      }, TIMEOUT); 
    });
  
    try {
      listings = await Promise.race([getListingData(page), timeout]);
      console.log('racea done')
    } catch (err) {
      console.log('error waiting for listings', err);
    }
  
    let listingsWithImage;
    try {
      listingsWithImage = findClosestImgs(listings);
    } catch (err) {
      console.log('error finding closest images', err)
    }
   
    return listingsWithImage;
    
  }
  module.exports = pageListings;