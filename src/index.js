const fs = require('fs/promises');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const dbTable = 'listings_duplicate';

// const puppeteerCore = require("puppeteer-core");
// const { addExtra } = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// const puppeteer = addExtra(puppeteerCore);
// const dbTable = 'listings';

require('dotenv').config();
const chromium = require("@sparticuz/chromium");
const allPageListings = require ('./allPageListings');
const condition = require ('./condition');
const groupListingData = require ('./groupListingData');
const getInventoryPages = require ('./getInventoryPages');
const delay = require('./delay');
const validateListings = require('./validation/validateListings');
const { dbInsert } = require('./db/dbInsert');
const proxyUrl = process.env.PROXY_URL;


const makes = ['agusta', 'aprilia', 'benelli', 'bmw', 'can-am', 'cf moto', 'ducati', 'greenger', 'guzzi', 'harley',  'hisun', 'honda', 'husqvarna', 'indian', 'karavan', 'kawasaki', 'ktm', 'kymco', 'mv agusta', 'polaris', 'royal enfield ', 'ssr', 'stacyc', 'suzuki', 'triumph', 'yamaha', 'beta', 'kayo', 'moke'];


// add stealth plugin and use defaults (all evasion techniques)

puppeteer.use(StealthPlugin());

exports.handler = async (event) => {
  console.log('event');
  console.log('event', event);
  const timeout = 2000;
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
        const unfilteredListingDataPages = await allPageListings(page, inventoryType, responseCount);
        console.log('allPageListings returned')
        if (unfilteredListingDataPages.length > 0) {
          console.log('indexA');
          const validatedListingPages = [];

          const filteredListingUrls = listings.map(listing => listing?.url);
          console.log('indexB');

          try {
            //console.log('unfiltered listings', unfilteredListings.map(el => el.innerText))
            for (const data of unfilteredListingDataPages) {
              const validationResults = validateListings(data.listings, filteredListingUrls, inventoryUrl);
              if (validationResults.size > 0) {
                validatedListingPages.push({
                  listings: validationResults,
                  mileages: data.listingMileages,
                  prices: data.listingPrices,
                  imgs: data.listingImgs
                })
              }
            }
          } catch (err) {
            console.log('Error validating listings', err);
          }

          // console.log('validated listings', validatedListingPages)

          if (validatedListingPages.length > 0) {

            const groupedListingPages = validatedListingPages.map(pageListings =>  groupListingData(pageListings))

            groupedListingPages.forEach(pageListings => {

              listings.push(pageListings.map(listing => ({
                ...listing,
                dealership: new URL(url).hostname,
                condition: condition(inventoryType)
              })))
            });

            // console.log('listings', listings)

            conditionsSearched.add(inventoryType);
          }
        }
      } catch(err) {
        console.log(`error getting ${inventoryType} listings`, err);
      } finally {
        try {
          if (page && !page.isClosed()) await Promise.race([
            page?.close(),
            delay(timeout)
          ]);
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


