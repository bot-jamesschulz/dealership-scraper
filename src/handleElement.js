const nextElementHref = require('./nextElementHref');
const isValidNextHref = require('./isValidNextHref');
const waitForStaticPage = require('./waitForStaticPage');

/**
 * Handles the click event on the nextElement.
 * 
 * @param {Page} page - The Puppeteer page object.
 * @param {ElementHandle} nextElement - The element to be clicked.
 * @param {string} inventoryType - The type of inventory.
 * @returns {Promise<Page|null>} - The page object after the click event, or null if there was an error.
 */
async function handleElement(page, nextElement,inventoryType) {

    try {
      const href = await nextElementHref(page, nextElement);
      if (href && !isValidNextHref(page, page.url(), href, inventoryType)) {
          console.log("Invalid href", href)
          return null;
      }
  
      // Get the cursor type
      const cursorType = await page.evaluate((nextElement) => {
        const computedStyle = window.getComputedStyle(nextElement);
        return computedStyle.cursor;
      }, nextElement);
  
      // If the cursor is not a pointer, then the element is not clickable
      if (cursorType != "pointer") {
        return null
      }
    } catch (err) {
      console.log("Error checking if element is clickable", err);
    } 
  
  
    try {
  
      await nextElement.scrollIntoView();
      
  
      console.log('waiting for new page')
      
      await Promise.all([
        nextElement.click(),
        waitForStaticPage(page)
      ]);
  
      console.log('next page loaded')
  
    } catch(err) {
      console.log('teste2')
      console.log('error navigating to the next page', err)
      return null;
    }
    console.log('testf')
    return page;  
  }

  module.exports = handleElement;