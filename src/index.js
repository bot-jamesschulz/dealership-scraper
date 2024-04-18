// Local Testing
// const fs = require('fs/promises');
// const puppeteer = require('puppeteer-extra');
// const StealthPlugin = require('puppeteer-extra-plugin-stealth');
// const dbTable = 'listings_duplicate';

const puppeteerCore = require("puppeteer-core");
const { addExtra } = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const puppeteer = addExtra(puppeteerCore);
const dbTable = 'listings';

require('dotenv').config();
const chromium = require("@sparticuz/chromium");
const allPageListings = require ('./allPageListings');
const condition = require ('./condition');
const groupListingData = require ('./groupListingData');
const getInventoryPages = require ('./getInventoryPages');
const delay = require('./delay');
const validateListings = require('./validation/validateListings');
const { dbInsert } = require('./db/dbInsert');
const { dbDelete } = require('./db/dbDelete');
const getProxy = require('./getProxy');

puppeteer.use(StealthPlugin());

exports.handler = async (event) => {
  console.log('event', event);
  const timeout = 2000;
  const url = event.url;
  const dealershipHostname = new URL(url).hostname;
  const listings = [];
  const conditionsSearched= new Set();
  let browser;

  console.log('url', url)
 
  let inventoryUrl;
  let proxyUrl;

  try {
     proxyUrl = await getProxy();
     console.log('proxy url', proxyUrl)
     if (!proxyUrl) return { statusCode: 500 }
  } catch (e) {
    console.log('error retrieving proxy', e)
    return { statusCode: 500 }
  }

  try {

    // browser = await puppeteer.launch({
    //   args: [...chromium.args, `--proxy-server=${proxyUrl}`, "--disable-notifications"]
    // })

    browser = await puppeteer.launch({
      executablePath: await chromium.executablePath(),
      headless: true,
      args: [...chromium.args, `--proxy-server=${proxyUrl}`, "--disable-notifications"]
    })
    
    console.log('connected', browser.connected);
    console.log('url', url);
    console.log('browser version', await browser.version());
    console.log('user agent', await browser.userAgent());
    const context = browser.defaultBrowserContext();
    console.log('incognito?',  context.isIncognito())
    
    const inventoryPages = await getInventoryPages(url, browser); 
    
    console.log('inventory pages', inventoryPages?.keys())

    // Extract listing from each type of inventory page (e.g. 'new', 'used')
    for (const  [ inventoryType, page ] of inventoryPages){
      try {

        // If we have listings in new and used then close out the remaining pages
        
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
        if (unfilteredListingDataPages.length > 0) {
          const validatedListingPages = [];

          const filteredListingUrls = listings.map(listing => listing?.url);

          try {
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

          if (validatedListingPages.length > 0) {

            const groupedListingPages = validatedListingPages.map(pageListings =>  groupListingData(pageListings))

            groupedListingPages.forEach(pageListings => {

              listings.push(pageListings.map(listing => ({
                ...listing,
                dealership: dealershipHostname,
                condition: condition(inventoryType)
              })))
            });

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

    }
    
  } catch(err) {
    console.log(`Error getting listings for ${url}`, err)
  } finally {


    try {
      
      if (browser && browser.connected) {
        const childProcess = browser.process()
        if (childProcess) {
          childProcess.kill(9)
        }
        console.log("all pages closed"); 
      }   
    } catch (err) {
        console.log(`Error closing browser:`, err);
    }
  } 
  try {
    const deleteErrors = await dbDelete(dbTable, dealershipHostname)

    if (deleteErrors) {
      console.log('error inserting into db', deleteErrors);
    }
    
    const insertErrors = await dbInsert(dbTable, listings)

    if (insertErrors) {
      console.log('errors inserting into db', insertErrors);
    }
  } catch (err) {
    console.log('Error updating listings in db:', err);
  }

  const response = {
    statusCode: 200
  };

  return response;
}


