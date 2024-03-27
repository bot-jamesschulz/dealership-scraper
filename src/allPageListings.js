const pageListings = require ('./pageListings');
const getNextPage = require ('./getNextPage');
const isNewListings = require ('./isNewListings');

/**
 * Retrieves all listings from a given page and its subsequent pages.
 * 
 * @param {Page} page - The Puppeteer page object.
 * @param {string} inventoryType - The type of inventory to search for (new, used, etc).
 * @param {Array} listingData - The array ob objects containing ungoruped listings and their attributes.
 * @returns {Promise<Array>} - A promise that resolves to an array of listings data.
 */
async function allPageListings(page, inventoryType, responseCount, listingData = []) {
    try {
      // Search for listings on the current page
      const url= page.url();
      console.log("getting listings on:", url);
      
    
      console.log('testw')
      const listings = await pageListings(page)
  
      console.log('testx')
  
      // Add listings to the accumulator
      if (listings) {
          console.log('testy')
          listingData.push(listings)
      }
      console.log('testz')
  
      
      //console.log(`Listings for page ${listingData.length + 1}: ${url}`);
      //logNestedObject(listings);
      
      console.log('resCount before newPage:', responseCount.count);
      const currResponseCount = responseCount.count;
  
      // Retrieve the next page
      const nextPage = await getNextPage(page, inventoryType);
      console.log("getNextPage returned");
      if (!nextPage) {
        console.log("No clickable next page elements found");
        return;
      }
  
      console.log("Next page loaded")
      const nextPagelistingData = await pageListings(nextPage);
  
      const nextResponseCount = responseCount.count;
      console.log('resCount after newPage:', responseCount.count);
  
      let continueListingSearch = isNewListings(listingData.map(data => data.listings).flat(), nextPagelistingData?.listings) && currResponseCount !== nextResponseCount;
      // Compare the current page listings to the next page listings
      // Keep searching if they are different
      console.log('different listings?', continueListingSearch)
  
      if (continueListingSearch) {
        await allPageListings(nextPage, inventoryType, responseCount, listingData);
      }
  
      console.log("End of inventory"); 
    } catch (err) {
      console.error('Error getting listings:', err);
    } finally {
      return listingData;
    }
  }

  module.exports = allPageListings;