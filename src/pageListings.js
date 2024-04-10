const groupListingData = require('./groupListingData');
const getListingData = require('./getListingData');
const delay = require('./delay');

/**
 * Retrieves the listings of vehicles from a web page.
 * 
 * @param {Page} page - The Puppeteer page object.
 * @param {Object}  - An options object specifying if images should be retrieved.
 * @returns {Object} - An object containing the vehicle information.
 */
async function pageListings(page) {
    const timeout = 10000; // ms
    
    console.log('getting listings')
  
    let listingData;
  
    try {
      listingData = await Promise.race([
        getListingData(page), 
        delay(timeout)]);
    } catch (err) {
      console.log('error waiting for listings', err);
    }
   
    return listingData;
    
  }
  module.exports = pageListings;