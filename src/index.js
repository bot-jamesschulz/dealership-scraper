const fs = require('fs/promises');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const validateListings = require('./validation/validateListings.js');
const { dbInsert } = require('./db/dbInsert');

const chromium = require("@sparticuz/chromium");
const http = require('http');
require('dotenv').config()

// const puppeteerCore = require("puppeteer-core");
// const { addExtra } = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// const validateListings = require('./validation/validateListings');
// const { dbInsert } = require('./db/dbInsert');
// const puppeteer = addExtra(puppeteerCore);

const makes = ['agusta', 'aprilia', 'benelli', 'bmw', 'can-am', 'cf moto', 'ducati', 'greenger', 'guzzi', 'harley',  'hisun', 'honda', 'husqvarna', 'indian', 'karavan', 'kawasaki', 'ktm', 'kymco', 'mv agusta', 'polaris', 'royal enfield ', 'ssr', 'stacyc', 'suzuki', 'triumph', 'yamaha', 'beta', 'kayo', 'moke'];
const MIN_VALID_LISTINGS = 10;
const proxyUrl = process.env.PROXY_URL;
const proxyUsername = process.env.PROXY_USERNAME;
const proxyPassword = process.env.PROXY_PASSWORD;
const dbTable = 'listings_test';

// add stealth plugin and use defaults (all evasion techniques)

puppeteer.use(StealthPlugin());

exports.handler = async (event) => {
  console.log('event');
  console.log('event', event);
  const url = event.url;
  const listings = [];
  const conditionsSearched= new Set();
  let browser;

  console.log('url', url)
 
  let inventoryUrl;

  try {

    browser = await puppeteer.launch({
      headless: false,
      args: [ "--disable-notifications"]
    })

    // browser = await puppeteer.launch({
    //   headless: false,
    //   args: [`--proxy-server=${proxyUrl}`, "--disable-notifications"]
    // })
    
    // browser = await puppeteer.launch({
    //   executablePath: await chromium.executablePath(),
    //   headless: true,
    //   args: [...chromium.args, `--proxy-server=${proxyUrl}`, "--disable-notifications"]
    // })
    console.log('connected', browser.connected);
    
    // http.get('http://api.ipify.org', (resp) => {
    //         let data = '';

    //         // A chunk of data has been received.
    //         resp.on('data', (chunk) => {
    //             data += chunk;
    //         });

    //         // The whole response has been received.
    //         resp.on('end', () => {
    //             console.log('Current IP:', data);
    //         });
    //     }).on('error', (err) => {
    //         console.error('Error fetching IP:', err);
    //     });

    console.log('url', url);
    console.log('browser version', await browser.version());
    console.log('makes', makes);
    console.log('user agent', await browser.userAgent());
    const context = browser.defaultBrowserContext();
    console.log('incognito?',  context.isIncognito())
    
    const inventoryPages = await getInventoryPages(url, browser, makes); 
    
    console.log('inventory pages', inventoryPages?.keys())

    // Extract listing from each type of inventory page (e.g. 'new', 'used')
    for (const  [ inventoryType, page ] of inventoryPages){
      console.log('testh')
      try {

        // If we have listings in new and used then close out the remaining pages
        //console.log('found listings', [...conditionsSearched]);
        
        if (conditionsSearched.has('new') 
        && (conditionsSearched.has('used') || conditionsSearched.has('owned'))) {
          console.log('found listings in all required categories... exiting');
          if (page && !page.isClosed()) await page.close();
          break;
        }

        inventoryUrl = page.url();
        
        console.log(`Getting '${inventoryType}' listings for ${inventoryUrl}`);
        
        await page.bringToFront();

        const responseCount = {count: 0};

        page.on('response', async (res) => {
           responseCount.count++;
        });


        // Iterate through all pages of the inventory type (e.g. pages 1-10 of 'new')
        const unfilteredListings = await allPageListings(page, inventoryType, responseCount);
        if (unfilteredListings.length > 0) {
          let validatedListings;

          const filteredListingUrls = listings.map(listing => listing?.url);

          try {
            //console.log('unfiltered listings', unfilteredListings.map(el => el.innerText))
            validatedListings = validateListings(unfilteredListings, filteredListingUrls, inventoryUrl, inventoryType);
          } catch (err) {
            console.log('Error validating listings', err);
          }

          
          
          if (validatedListings.length > 0) {
            listings.push(...validatedListings);
            conditionsSearched.add(inventoryType);
          }
          
        }
      } catch(err) {
        console.log(`error getting ${inventoryType} listings`, err);
      } finally {
        try {
          if (page && !page.isClosed()) await page?.close();
        } catch (err) {
          console.log(`Error closing page for ${inventoryType}:`, err);
        }
      }
      console.log('testg')

    }
    console.log('testu')
    
  } catch(err) {
    console.log(`Error getting listings for ${url}`, err)
  } finally {


    try {
      console.log('testk2')
      
      if (browser && browser.connected) {
        const childProcess = browser.process()
        if (childProcess) {
          childProcess.kill(9)
        }
        console.log("all pages closed"); 
      }   
      console.log('testl2')
    } catch (err) {
        console.log(`Error closing browser:`, err);
    }
  } 
  console.log('testi')
  try {
    const errors = await dbInsert(listings, dbTable)

    if (errors) {
      console.log('errors inserting into db', errors);
    }
  } catch (err) {
    console.log('Error inserting to db:', err);
  }

  const response = {
    statusCode: 200
  };

  return response;
}

/**
 * Waits for the network to become idle
 * 
 * @param {Page} page - The Puppeteer page object.
 * @param {Object}  - An object containing options
 */
async function waitForNewContent(page, { idleTime = 750, timeout = 4000, minFulfilled = 5 } = {}) {
  let requests = 0;
  let finishedRequests = 0;
  let prevRequests = 0;
  let prevFinishedRequests = 0;
  let pageLoaded = false;

  const requestHandler = (request) => {
    requests++;
    if (request.isInterceptResolutionHandled()) return;
    request.continue();  
  };

  const requestFinishedHandler = (request) => {
    finishedRequests++;
    if (request.isInterceptResolutionHandled()) return;
    request.continue();   
  };

  const requestFailedHandler = (request) => {
    finishedRequests++;
    if (request.isInterceptResolutionHandled()) return;
    request.continue();   
  };

  const loadListener = () => {
    console.log('load event fired')
    pageLoaded = true;
  };

  return new Promise((resolve) => {

    page.on('request', requestHandler);
    page.on('requestfinished', requestFinishedHandler);
    page.on('requestfailed', requestFailedHandler);
    page.on('load', loadListener);

    const timeoutID = setTimeout(() => {
      console.log('Timed out waiting for idle')
      clearInterval(intervalID);
      page.off('request', requestHandler);
      page.off('requestfinished', requestFinishedHandler);
      page.off('requestfailed', requestFailedHandler);
      page.off('load', loadListener);

      resolve();

    },timeout);

    const intervalID = setInterval(() => {
      
      console.log('network status:', `\n requests ${requests} \n prevRequests ${prevRequests} \n finishedRequests ${finishedRequests} \n prevfinishedRequests ${prevFinishedRequests}`);
      
      if ((requests === prevRequests 
        && finishedRequests === prevFinishedRequests 
        && finishedRequests >= requests 
        && finishedRequests >= minFulfilled)
      || pageLoaded) {
        console.log('new content loaded ##############')
        clearTimeout(timeoutID);
        clearInterval(intervalID);

        page.off('request', requestHandler);
        page.off('requestfinished', requestFinishedHandler);
        page.off('requestfailed', requestFailedHandler);
        page.off('load', loadListener);

        resolve();

      } else {
        
        prevRequests = requests;
        prevFinishedRequests = finishedRequests;
      }
    }, idleTime);
  });
}

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

async function getListingData(page) {
  
  let listingData;

  try {

    // Make sure lazy loaded images get loaded
    console.log('testa');
    
    // Extract the images/listings from the page, keyed by their position in the DOM
    listingData = await page.evaluate(async () => {
      const validYearPattern = /(?:(?<=^)|(?<=\s))(19|20)([0-9][0-9])(?=\s|$)/g;
      const MINIMUM_IMG_DIST = 10;
      let prevImgIndex = 0;
      const listingImgs = {};  
      const listingData = [];
      const elementNodes = document.querySelectorAll('*');
      const elements = Array.from(elementNodes);

      for (const [index, element] of elements.entries()) {
        // Get text content and associated hrefs
        let trimmedText = null;
        let validYear = false;
        const backgroundImg = window.getComputedStyle(element).backgroundImage === 'none' 
          ? null
          : window.getComputedStyle(element).backgroundImage;

        
        if (element?.tagName === "A") {
          const innerText = element.innerText;
          trimmedText = innerText.trim().replace(/\r?\n|\r|\s+/,' '); // Clean white space
          listingData.push({
            listingIndex: index,
            innerText: trimmedText, 
            href: element.getAttribute("href")
          });
        }

        // Get images
        let closestImgDist = Math.abs(prevImgIndex-index);

        if (closestImgDist <= MINIMUM_IMG_DIST) continue;
        
        // Make sure that the image isn't part of a subsection/gallery of images
        if ((element?.tagName === 'IMG') || (element?.tagName === 'INPUT') 
        && (element.hasAttribute('src') || element.hasAttribute('srcset'))) {
          const waitInterval = 100; // Time to wait before checking the src attribute again
          const maxWaitTime = 500; // Maximum wait time for checking src
          let elapsedTime = 0;
          console.log('src', element.getAttribute('src'))

          let waitCount = 0;
          
          // Wait for src attribute to be set
          const waitForSrc = async () => {
            
            
            console.log('src value', element.getAttribute('src'))
            console.log('||')
            if (element.getAttribute('src')) {
              let url;
              try {
                url = new URL(element.getAttribute('src'), window.location.href )
              } catch (err) {}
              console.log('src', url.href)
              // console.log(index)

              if (url.href.startsWith('http')) {
                //console.log('src')
                listingImgs[index] = url.href; // Save the img's url with an associated element index, for use later to find closest listing element
                prevImgIndex = index;
                return;
              }
            }

            if (element.getAttribute('srcset')) {
              let url;
              url = element.getAttribute('srcset');
              const endOfUrl = url.indexOf(' ');
              const firstUrl = endOfUrl !== -1 ? url.substring(0, endOfUrl) : url;
              console.log('srcset')
              // console.log(index)
              listingImgs[index] = firstUrl; // Save the img's url with an associated element index, for use later to find closest listing element
              prevImgIndex = index;

              return;
            }
            console.log('no src/scrset yet')
            elapsedTime += waitInterval;
            ++waitCount;
            console.log('waiting', waitCount)
            console.log('elapsed time', elapsedTime)
            if (elapsedTime < maxWaitTime) {
              console.log('a')
              await new Promise(resolve => setTimeout(resolve, waitInterval));
              console.log('b')
              await waitForSrc();
              console.log('c')
            }
          };
          console.log('d')
          
          await waitForSrc();
          console.log('e')
        }

        // Make sure that the background-image isn't part of a subsection/gallery of images
        if (backgroundImg) {
          const backgroundImgUrlMatch = backgroundImg.match(/url\("(.+)"\)/); // Extract the url
          const backgroundImgUrl = backgroundImgUrlMatch ? backgroundImgUrlMatch[1] : null;
          if (!backgroundImgUrl || backgroundImgUrl.includes('.gif')) continue;
          listingImgs[index] = backgroundImgUrl; // Save the img's url with an associated element index, for use later to find closest listing element
          prevImgIndex = index;         
        }
      }   
      return {listingData, listingImgs};
    });
    console.log('page data', listingData?.listingImgs);
  } catch(err) {
    console.log('error retrieving data/images from the DOM',err)
    return;
  }
  console.log('testv');

  return listingData;
  //console.log('images:',  listingImgs, 'length', Object.keys(listingImgs).length);
  //console.log("Searching for listings on:", page.url())
}

function findClosestImgs(listingData) {
  if (!listingData || JSON.stringify(listingData) === '{}') return;
  const listingsMeta = listingData.listingData;
  const listingImgs = listingData.listingImgs;
   

  let listingsWithImages;
  try { 
    listingsWithImages = listingsMeta.map( (listing) => {
        const listingIndex = listing.listingIndex;
        // Find the closest image to the listing
        let closestImg;

        const imgIndices = Object.keys(listingImgs); // Indices of the images
        let closestImgIndex = imgIndices[imgIndices.length - 1]; // Default to last img
        let i = 0; 

        while (i < imgIndices.length) {

        const imgDistance = Math.abs(imgIndices[i] - listingIndex);
        const nextImgDistance = Math.abs(imgIndices[i + 1] - listingIndex);
        if (nextImgDistance > imgDistance) {
            //console.log(`imgIndices[i]: ${imgIndices[i]} | listingIndex: ${listingIndex}`)
            closestImgIndex =  imgIndices[i];
            break;
        }
        i++;
      }  

      closestImg = listingImgs[closestImgIndex];
      //console.log(`listingIndex: ${listingIndex} \n listing: ${listing.innerText} \n  closest img index: ${closestImgIndex} \n  url: ${closestImg}`)

    return {
      innerText: listing.innerText,
      href: listing.href,
      img: closestImg.startsWith('//') ? `http:${closestImg}` : closestImg
    }

  });
  } catch (err) {
      console.log('error parsing listing/image data', err)
  }

  console.log(Object.keys(listingImgs));
  return listingsWithImages;
}

function logNestedObject(obj, indent = '') {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) {
      const value = obj[key];

      if (typeof value === 'object' && value !== null) {
        // If the value is an object, recursively log its keys and values
        console.log(`${indent}${key}:`);
        logNestedObject(value, `${indent}  `);
      } else {
        // If the value is not an object, log the key and value
        console.log(`${indent}${key}: ${value}`);
      }
    }
  }
}

function getNewUrl(href,page) {
  try {
    const newUrl = new URL(href,  page.url())
    return newUrl.href;
  } catch (err) {
    console.log("Error creating new url:", err)
    return null
  }
}

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
          console.log('tests');
          const xpath = `xpath/.//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "${keyword}")]`; 
          console.log('tests1');
          const elementHandles = await page.$$(xpath);
          console.log('testt');
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

async function goToNewTab(url, browser) {
  let page;

  try {
    if (!browser.connected) return null;
    console.log('testo')
    page = await browser.newPage();

    await page.authenticate({
      username: proxyUsername,
      password: proxyPassword
    });

    await page.setRequestInterception(true);
    
    const blankImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAHzwGA78JN5wAAAABJRU5ErkJggg==';
    page.on('request', (request) => {
      if (request.isInterceptResolutionHandled()) return;
      if (request.resourceType() === "image") {
        request.respond({
          status: 200,
          contentType: 'image/png',
          body: Buffer.from(blankImage, 'base64')
        });  
      } else {
        request.continue();
      }
    });

    // page.on("console", (log) => {
    //   if(log.text().includes('phone')) {
    //     console.log(`Log from client: [${log.text()}] `)
    //   }  
    // });

    // page.on('request', async (req) => {
    //   //console.log('request POST data', await req.fetchPostData());
    //   console.log('request headers', await req.headers());
    //   console.log('resource type', await req.resourceType());
    //   console.log('initiator', await req.initiator());
    // });
    // let bytesTotal = 0;

    // page.on('response', async (res) => {
    //   const req = await res.request();

    //   console.log('res headers', await res.headers());
    //   console.log('res status', await res.status());
    //   // try {
    //   //   console.log('res json', await res.json());
    //   // } catch(err) {

    //   //}

    //   // const headers = res.headers();
    //   // if ('content-length' in headers) {
    //   //     const length = parseInt(headers['content-length']);
    //   //     bytesTotal += length;
    //   //     console.log('total MBs so far', bytesTotal/1000000);
    //   // }
    //   // console.log('response to this request url of:', await req.url());
    //   // console.log('response to this request with headers:', await req.headers());
    //   // console.log('response to this request with resource type:', await req.resourceType());
    //   // console.log('response headers', await res.headers());
    //   // console.log('response url', await res.url());
    //   // console.log('res status', await res.status());
    //   // console.log('remote address', await res.remoteAddress());
    // });
    
    console.log('testp')
    console.log(url, browser, makes)
    await page.goto(url,{ waitUntil: 'load'});
    console.log('testq')
    return page;
  } catch(err) {
    console.log('testr')
    console.log("Error going to new tab:", err);
    return null;
  }
}

/**
 * Checks if the given inventory page set is valid.
 * @param {Object} hrefs - The inventory page set to be checked.
 * @returns {boolean} - Returns true if the inventory page set is valid, otherwise false.
 */
function isValidInventoryPageSet(hrefs) {
  if (JSON.stringify(hrefs) === '{}' || !hrefs) {
    return false;
  }

  if (hrefs['new'] && (hrefs['used'] || hrefs['owned'])) {
    return true;
  }

  if (hrefs['inventory'] || hrefs['all']) {
    return true;
  }

  return false;
}

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

async function delay(length) {
  await new Promise(resolve => setTimeout(resolve, length));
}

/**
 * Retrieves the href attribute of the next anchor element in the DOM hierarchy starting from the given element.
 * @param {Page} page - The Puppeteer page object.
 * @param {Element} element - The starting element to search from.
 * @returns {Promise<string|boolean>} - The href attribute value of the next anchor element, or false if not found.
 */
async function nextElementHref(page, element) {
  return page.evaluate((element) => {
    let currentElement = element;
    do {
      if (currentElement.tagName === "A") {
        return currentElement.getAttribute("href");
      }
      currentElement = currentElement.parentElement;
    } while (currentElement);
    return false;
  }, element);
}

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

// Find the next page navigation and return the navigated page
/**
 * Retrieves the next page of inventory based on the given page and inventory type.
 * @param {Page} page - The Puppeteer page object.
 * @param {string} inventoryType - The type of inventory (new, used, etc).
 * @returns {Promise<Page|null>} - A promise that resolves to the next page of inventory, or null if no next page is found.
 */
async function getNextPage(page, inventoryType) {
  const xpaths = [
    `xpath/.//*[@aria-label[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]]`,
    `xpath/.//*[@title[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]]`,
    `xpath/.//span[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]`,
    `xpath/.//*[@class[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]]`,
    `xpath/.//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), "next")]`,
    `xpath/.//a[contains(translate(., 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', 'abcdefghijklmnopqrstuvwxyz'), ">")]`
  ];
  try {
    console.log("getting next page");
    
    for (const xpath of xpaths) {
      const elementHandles = await page.$$(xpath);
      // Reverse the order so that we look from the bottom of the page up. This is to avoid false positives: for example, if there is a next element in an image carousel.
      elementHandles.reverse();
      // Attempt to click each element
      for (const handle of elementHandles) {
        
        console.log('testa3');
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

function isNewListings(oldListingsData, newListingsData) {
  const oldListingsSet = new Set(oldListingsData?.map((elem) => elem?.href));
  // console.log('new listings', newListingsData.filter((newListing) => !oldListingsSet.has(newListing?.href)).map(elem => elem.href))
  // console.log('old listings set', oldListingsSet)
  return newListingsData?.some((newListing) => !oldListingsSet?.has(newListing?.href));
}

/**
 * Retrieves all listings from a given page and its subsequent pages.
 * 
 * @param {Page} page - The Puppeteer page object.
 * @param {string} inventoryType - The type of inventory to search for (new, used, etc).
 * @param {Array} listingsData - The array to store the retrieved listings.
 * @returns {Promise<Array>} - A promise that resolves to an array of listings data.
 */
async function allPageListings(page, inventoryType, responseCount, listingsData = []) {
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
        listingsData.push(...listings)
    }
    console.log('testz')

    
    //console.log(`Listings for page ${listingsData.length + 1}: ${url}`);
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
    const nextPageListingsData = await pageListings(nextPage);

    const nextResponseCount = responseCount.count;
    console.log('resCount after newPage:', responseCount.count);

    let continueListingSearch = isNewListings(listingsData, nextPageListingsData) && currResponseCount !== nextResponseCount;
    // Compare the current page listings to the next page listings
    // Keep searching if they are different
    console.log('different listings?', continueListingSearch)

    if (continueListingSearch) {
      await allPageListings(nextPage, inventoryType, responseCount, listingsData);
    }

    console.log("End of inventory"); 
  } catch (err) {
    console.error('Error getting listings:', err);
  } finally {
    return listingsData;
  }
}