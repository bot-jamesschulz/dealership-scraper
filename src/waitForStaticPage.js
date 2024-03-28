const waitForNewContent = require('./waitForNewContent');
const scrollPage = require('./scrollPage');

/**
 * 
 * @param {*} page 
 */
async function waitForStaticPage(page, maxAttempts = 5) {
    
    let attempts = 0;
    let pageLoaded;
  
    while(!pageLoaded && attempts <= maxAttempts) {
      try { 
        console.log('testb');
        await waitForNewContent(page);
        console.log('testb2');
  
        if (!page) continue;
  
        pageLoaded = await page.evaluate(() => document.readyState === 'complete');
  
        if (!pageLoaded) continue;
    
        await scrollPage(page);
  
        // wait for new lazy loaded content triggered by scrolling
        await waitForNewContent(page, {minFulfilled: 0});
      } catch(err) {
        console.log('Error checking loaded state:', err)
        pageLoaded = false;
      }
  
      if (attempts > maxAttempts) {    
        throw new Error('Max attempts for network idle reached');
      }  
      attempts++;
    }
  
    console.log("Page is static");
    return;
  }

  module.exports = waitForStaticPage;