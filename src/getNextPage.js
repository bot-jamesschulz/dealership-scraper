const handleElement = require('./handleElement');
const delay = require('./delay');

// Find the next page navigation and return the navigated page
/**
 * Retrieves the next page of inventory based on the given page and inventory type.
 * @param {Page} page - The Puppeteer page object.
 * @param {string} inventoryType - The type of inventory (new, used, etc).
 * @returns {Promise<Page|null>} - A promise that resolves to the next page of inventory, or null if no next page is found.
 */
async function getNextPage(page, inventoryType) {
    const timeout = 10000;
    const xpaths = [
      `xpath/(.//*[@aria-label[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]])[position() > (last() div 2)]`,
      `xpath/(.//*[@title[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]])[position() > (last() div 2)]`,
      `xpath/(.//span[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")])[position() > (last() div 2)]`,
      `xpath/(.//*[@class[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]])[position() > (last() div 2)]`,
      `xpath/(.//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")])[position() > (last() div 2)]`,
      `xpath/(.//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ">")])[position() > (last() div 2)]`
    ];
    try {
      console.log("getting next page");
      
      for (const xpath of xpaths) {
        const elementHandles = await Promise.race([
          page.$$(xpath),
          delay(timeout)]);
        // Reverse the order so that we look from the bottom of the page up. This is to avoid false positives: for example, if there is a next element in an image carousel.
        elementHandles.reverse();
        
        // Attempt to click each element
        for (const handle of elementHandles) {
          const nextPage = await handleElement(page, handle, inventoryType);
          if (nextPage) {
            console.log("Returning next page"); 
            // Successfully retrieved the next page
            return nextPage
          }
        }
      }
      console.log('No valid next page found')
      return null;
      
    } catch (err) {
      console.error('Error getting next page:', err);
      return null;
    }
  }

  module.exports = getNextPage;