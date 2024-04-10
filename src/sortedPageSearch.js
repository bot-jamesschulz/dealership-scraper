const getNewUrl = require('./getNewUrl');

/**
 * Retrieves sorted anchor hrefs based on search criteria.
 * @param {Page} page - The Puppeteer page object.
 * @param {string[]} keywords - An array of keywords to search for.
 * @param {string} anchorContentSearch - The keyword to search for in the text content of the anchors.
 * @returns {Object} - An object containing the sorted hrefs.
 */
async function sortedPageSearch(page, keywords, anchorContentSearch, innerTextSearch) {
    let sortedHrefs = {};
    console.log(`innerTextSearch: ${innerTextSearch}`)
    
    const timeout = new Promise(resolve => setTimeout(() => resolve(), 5000));
  
    console.log('page', page)
  
    await Promise.race([search(), timeout]);
  
    return sortedHrefs;
  
    async function search() {
      try {
        // Search for keywords in the text content of the anchors
        if (keywords.length > 0 && !innerTextSearch) {
          for (const keyword of keywords) {
            const xpath = `xpath/.//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${keyword}")]`; 
            const elementHandles = await page.$$(xpath);
            if (elementHandles.length > 0) {
              // // Pull the hrefs from the anchors
              
              const hrefs = await Promise.all(elementHandles.map(async elem => await page.evaluate(element => element.getAttribute('href'), elem)));
              let matchingHref;    
              if (keyword === 'new') {
                matchingHref = hrefs?.find(href => 
                  href?.toLowerCase().includes(keyword) 
                  && !href?.toLowerCase().includes('news')
                );
              } else if (keyword === 'all') {
                matchingHref = hrefs?.find(href => 
                  href?.toLowerCase().includes(keyword) 
                  && !href?.toLowerCase().includes('gallery')
                );
              } else {
                matchingHref = hrefs?.find(href => href?.toLowerCase().includes(keyword));
              }
              if (matchingHref) {
                sortedHrefs[keyword] = getNewUrl(matchingHref,page);
                
              }
            }
          }
  
        } else if (innerTextSearch) {
          
          // Keywords to search for in the innerText, if found, then add the href.
          for (const keyword of keywords) {
            const xpath = `xpath/.//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${keyword}")]`; 
            const elementHandles = await page.$$(xpath);
            const elementInfo = await Promise.all(elementHandles.map(async elem => await page.evaluate(element => ({ href: element.getAttribute('href'), innerText: element.innerText }), elem)));
            console.log("searching in innertTexts", keyword)
            
            let matchingHref;
            console.log('inner texts:', elementInfo.map(el => el?.innerText))
            if (keyword === 'new') {
              
              matchingHref = elementInfo?.find(elem => 
                elem?.innerText?.toLowerCase().includes(keyword) 
                && !elem?.innerText?.toLowerCase().includes('news')
              )?.href;
            } else if (keyword === 'all') {
              matchingHref = elementInfo?.find(elem => 
                elem?.innerText?.toLowerCase().includes(keyword) 
                && !elem?.innerText?.toLowerCase().includes('gallery')
              )?.href;
            } else { 
              matchingHref = elementInfo?.find(elem => elem?.innerText?.toLowerCase().includes(keyword))?.href;
            }
            if (matchingHref) {
              sortedHrefs[keyword] = getNewUrl(matchingHref,page);
            }
          } 
        // Search for keywords in the hrefs
        } else if (anchorContentSearch && keywords.length === 0) {
          console.log('searching hrefs')
          const xpath = `xpath/.//a[contains(translate(@href, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${anchorContentSearch}")]`; 
          const elementHandles = await page.$$(xpath);
          
          if (elementHandles.length > 0) {
            // Pull the hrefs from the anchors
            const href = await page.evaluate(element => element.getAttribute('href'), elementHandles[0]);
            if (href) {
              sortedHrefs[anchorContentSearch] = getNewUrl(href,page);
            }
          }
  
        }
      } catch (err) {
        console.log("Error getting sorted anchor hrefs:", err);
      } 
    }
  }

  module.exports = sortedPageSearch;