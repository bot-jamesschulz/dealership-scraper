const getNewUrl = require('./getNewUrl');

/**
 * Checks if the next href is valid based on certain conditions.
 * @param {Page} page - The Puppeteer page object.
 * @param {string} url - The current URL.
 * @param {string} href - The href of the next page navigation element to be validated.
 * @param {string} inventoryType - The type of inventory (new, used...).
 * @returns {boolean} - Returns true if the next href is valid, otherwise false.
 */
function isValidNextHref(page, url, href, inventoryType) {

    try {
      const nextPageUrl = getNewUrl(href,page);
      console.log(`nextPageUrl: ${nextPageUrl} | url: ${url} | inventoryType: ${inventoryType}`)
    
      const includesInventoryType = nextPageUrl.toLowerCase().includes(inventoryType);
      
      const currentDomain = new URL(url)?.hostname;
      const nextPageDomain = new URL(nextPageUrl)?.hostname;
  
      console.log(`currentDomain: ${currentDomain} | nextPageDomain: ${nextPageDomain} | inventoryType: ${inventoryType} | includesInventoryType: ${includesInventoryType}`)
      
      return currentDomain == nextPageDomain;
    } catch (err) {
      console.log("Error validating href:", err)
    }
  }

  module.exports = isValidNextHref;