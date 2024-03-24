const waitForNewContent = require('./waitForNewContent');

/**
 * 
 * @param {*} page 
 */
async function waitForStaticPage(page, attempts = 0) {
    const viewportWidth = 1920; // px 
    const maxAttempts = 5;
    let pageLoaded;
  
    while(!pageLoaded && attempts <= maxAttempts) {
      try { 
        console.log('testb');
        await waitForNewContent(page);
        console.log('testb2');
  
        if (!page) continue;
  
        pageLoaded = await page.evaluate(() => document.readyState === 'complete');
  
        if (!pageLoaded) continue;
  
        const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    
        // Set the viewport size to cover the entire page height
        await page.setViewport({ width: viewportWidth, height: pageHeight});
    
        await page.evaluate(async () => {
          // Scroll viewport across the entire page to make sure all content is loaded
          await new Promise((resolve) => {
            let totalHeight = 0;
            const distance = 400;
            const timer = setInterval(() => {
              var scrollHeight = document.body.scrollHeight;
              window.scrollBy(0, distance);
              totalHeight += distance;
    
              if(totalHeight >= scrollHeight - window.innerHeight) {
                clearInterval(timer);
                resolve();
              }
            }, 100);
          });
        });
  
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