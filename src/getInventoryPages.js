const isValidInventoryPageSet = require('./isValidInventoryPageSet');
const sortedPageSearch = require('./sortedPageSearch');
const getNewUrl = require('./getNewUrl');
const goToNewTab = require('./goToNewTab');

/**
 * Retrieves the inventory pages for a given URL.
 * 
 * @param {string} url - The URL to navigate to.
 * @param {object} browser - The browser instance.
 * @returns {Map} - A Map containing the inventory pages.
 * @throws {err} - If there is an error getting the inventory pages.
 */
async function getInventoryPages (url, browser, makes) {
    const INVENTORY_KEYWORDS = ["new","used","owned","all","inventory"];
    const HOME_KEYWORDS = ["home"];
    let page, hrefs, forSaleUrl, forSaleHref;
    let inventoryPages = new Map();
    try {
      console.log('testk')
      page = await goToNewTab(url,browser);
  
      console.log('testl')
      if (!page) {
        return null;
      }
      console.log('testm')
      
      // Search for links to inventory pages
      hrefs = await sortedPageSearch(page,INVENTORY_KEYWORDS);
      console.log('testn')
      console.log("hrefs:", hrefs);
      let validInventoryPageSet = isValidInventoryPageSet(hrefs);
  
      // Try to go home
      if (!validInventoryPageSet) {
        hrefs = await sortedPageSearch(page,[],HOME_KEYWORDS);
        if (hrefs["home"]) {
          console.log("Going to home page")
          const homeUrl = getNewUrl(hrefs["home"],page);
          await page.goto(homeUrl,{ waitUntil: 'networkidle2' });
        }
  
        // Search again for links to inventory pages
        hrefs = await sortedPageSearch(page,INVENTORY_KEYWORDS);
        console.log("hrefs:", hrefs);
        validInventoryPageSet = isValidInventoryPageSet(hrefs);
      }
  
      // If there are no inventory pages, look for a for sale page.
      if (!validInventoryPageSet) {
        console.log("No inventory pages found");
        forSaleHref = await sortedPageSearch(page,[],"for sale");
        // Go to for sale page and check for inventory pages
        if (forSaleHref && forSaleHref["for sale"]) {
          console.log("Going to for sale page");
          forSaleUrl = getNewUrl(forSaleHref["for sale"],page);
          await page.goto(forSaleUrl,{ waitUntil: 'networkidle2' });
          // Search for links to inventory pages
          hrefs = await sortedPageSearch(page,INVENTORY_KEYWORDS);
          validInventoryPageSet = isValidInventoryPageSet(hrefs);
          console.log("hrefs:", hrefs);
        }
        
        // If there are still no inventory pages, look for the keywords in innerTexts rather than the hrefs.
        if (!validInventoryPageSet) {
          console.log("About to look for keywords in innerTexts");
          hrefs = await sortedPageSearch(page,INVENTORY_KEYWORDS,'',true);
          validInventoryPageSet = isValidInventoryPageSet(hrefs);
        }
      }
  
      if (forSaleHref && forSaleHref["for sale"]) {
        inventoryPages.set("inventory", await goToNewTab(forSaleHref["for sale"],browser));
        return inventoryPages;
      }
  
      if (Object.keys(hrefs).length === 0) {
        console.log('No inventory pages found')
        return null;
      }
  
      const uniqueHrefs = new Set();
  
      
      for (const href in hrefs) {
        if (hrefs.hasOwnProperty(href)  && !uniqueHrefs.has(hrefs[href])) {
          inventoryPages.set(href, await goToNewTab(hrefs[href],browser));
          uniqueHrefs.add(hrefs[href]);
        }
      }
   
    console.log("Inventory pages retrieved");
    return inventoryPages;
    } catch (err) {
      console.error('Error getting inventory pages:', err);
      return null;
    } finally {
      try {
        if (page && !page.isClosed()) await page?.close();
      } catch (err) {
          console.log(`Error closing page:`, err);
      }
    }
}

module.exports = getInventoryPages;