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

  module.exports = findClosestImgs;