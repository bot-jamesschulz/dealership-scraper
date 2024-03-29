async function getListingData(page) {
  
    let listingData;
  
    try {
  
      // Make sure lazy loaded images get loaded
      console.log('testa');
      
      // Extract the images/listings from the page, keyed by their position in the DOM
      listingData = await page.evaluate(async () => {
        console.log('Page evaluation start');
  
        const mileageVocab = ['mile', 'odometer']
        const minImgDist = 10;
        const maxTextLength = 250;
        let prevImgIndex = 0;
        const listings = [];
        const listingImgs = {};
        const listingPrices = [];
        const listingMileages = [];     
        const elementNodes = document.querySelectorAll('*');
        const elements = Array.from(elementNodes);
  
        for (const [index, element] of elements.entries()) {

          if (!element) continue;

          // Get text content and associated hrefs
          const backgroundImg = window.getComputedStyle(element).backgroundImage === 'none' 
            ? null
            : window.getComputedStyle(element).backgroundImage;

          const trimmedText = element.innerText
            ?.trim()
            .replace(/\r?\n|\r|\s+/,' ');
            
          let wholeText;
          const children = element.childNodes;
          for (const child of children) {
            if (child.nodeType === Node.TEXT_NODE) {
              wholeText = child.wholeText;
              break;
            }
          }
              
          // Looking for price

          if (wholeText?.includes('$') && wholeText?.length < maxTextLength) {
            // console.log('aabaa $$', wholeText)
            const priceRegex = /\$[\d,]+/;

            let price = trimmedText?.match(priceRegex);
            let currElement = element;
            while (!price && currElement.parentNode) {
              currElement = currElement.parentNode;
              price = currElement?.innerText?.match(priceRegex);
            } 
            
            const trimmedPrice = price?.[0].replace(/\D/g, "");
            if (trimmedPrice) {
              listingPrices[index] = trimmedPrice;       
            }
             console.log('aabaa trimmedPrice', index, trimmedPrice)
          }

          // Looking for mileage
          if (wholeText && mileageVocab.find(vocab => wholeText.toLowerCase().includes(vocab))) {
            const mileageRegex = /[\d,]+/g;
            const trimmedText = element.innerText
              ?.trim()
              .replace(/\r?\n|\r|\s+/,' ');
            

            let mileage = trimmedText?.match(mileageRegex);

            // console.log('aabaa initial mileage:', mileage?.[0], trimmedText)
            
            // First check to see if mileage is present in the previous element
            // const strictMileage = /^[0-9.,!]+$/;
            const maxTextLength = 15;
            if (!mileage) {
              
              const prevElem = element.previousSibling;
              const prevElemInnerText = prevElem?.innerText;
              if (prevElemInnerText?.length < maxTextLength) {
                mileage = prevElemInnerText?.match(mileageRegex)
              }  
            }

            // If not present in previous element then find it ahead
            let currElement = element;
            let offset = 0;
            while (!mileage && index + offset < elements.length) {
              offset++;
              currElement = elements[index + offset];
              const currElemInnerText = currElement?.innerText;
              if (currElemInnerText?.length < maxTextLength) {
                mileage = currElemInnerText?.match(mileageRegex);
              }
            } 

            const trimmedMileage = mileage?.[mileage.length - 1].replace(/\D/g, "");
            
            listingMileages[index] = trimmedMileage;
          }
          // Looking for listings
          if (trimmedText && element.tagName === "A") {
            // console.log('aabaa trimmedText', element.getAttribute("href"))
            listings.push({
              listingIndex: index,
              innerText: trimmedText, 
              href: element.getAttribute("href")
            });
          }
  
          // Get images
          let closestImgDist = Math.abs(prevImgIndex-index);
  
          if (closestImgDist <= minImgDist) continue;
          
          // Make sure that the image isn't part of a subsection/gallery of images
          if ((element.tagName === 'IMG') || (element.tagName === 'INPUT') 
          && (element.hasAttribute('src') || element.hasAttribute('srcset'))) {
            const waitInterval = 100; // Time to wait before checking the src attribute again
            const maxWaitTime = 500; // Maximum wait time for checking src
            let elapsedTime = 0;
            let waitCount = 0;
            
            // Wait for src attribute to be set
            const waitForSrc = async () => {
              
              if (element.getAttribute('src')) {
                // console.log('aabaa in src')
                let url;
                try {
                  url = new URL(element.getAttribute('src'), window.location.href )
                } catch (err) {}
  
                if (url.href.startsWith('http')) {
                  //console.log('src')
                  listingImgs[index] = url.href; // Save the img's url with an associated element index, for use later to find closest listing element
                  prevImgIndex = index;
                  return;
                }
              }
              //console.log('aabaa looking for srcset')
              if (element.getAttribute('srcset')) {
                // console.log('aabaa in srcset')
                let url;
                url = element.getAttribute('srcset');
                const endOfUrl = url.indexOf(' ');
                const firstUrl = endOfUrl !== -1 ? url.substring(0, endOfUrl) : url;
                listingImgs[index] = firstUrl; // Save the img's url with an associated element index, for use later to find closest listing element
                prevImgIndex = index;
  
                return;
              }
              elapsedTime += waitInterval;
              ++waitCount;
              if (elapsedTime < maxWaitTime) {
                console.log(' a')
                await new Promise(resolve => setTimeout(resolve, waitInterval));
                console.log(' b')
                await waitForSrc();
                console.log(' c')
              }
            };
            console.log(' d')
            
            await waitForSrc();
            console.log(' e')
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

        return {listings, listingImgs, listingPrices, listingMileages};
      });
      // console.log('page data', listingData?.listingImgs);
    } catch(err) {
      console.log('error retrieving data/images from the DOM',err)
      return;
    }
    console.log('testv');
  
    return listingData;
    //console.log('images:',  listingImgs, 'length', Object.keys(listingImgs).length);
    //console.log("Searching for listings on:", page.url())
  }
  

  module.exports = getListingData;