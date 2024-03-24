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

  module.exports = getListingData;