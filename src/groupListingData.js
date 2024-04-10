function groupListingData(listingData) {

  if (!listingData || JSON.stringify(listingData) === '{}') return;

  const listingIndices = [...listingData.listings.keys()];
  const listingImgs = listingData.imgs;
  const listingPrices = listingData.prices;
  const listingMileages = listingData.mileages;

  const imgIndices = Object.keys(listingImgs); // Indices of the images
  
  let groupedListingData;
  try { 
    groupedListingData = listingIndices.map( (listingPosition, index) => {
       
      const nearestListingPosition = listingIndices[index + 1] ?
        listingIndices[index + 1] :
        listingIndices[index - 1];
        
      const defaultDistance = 250;
      const distanceToNearestListing = listingIndices.length === 1 ? 
        defaultDistance : 
        Math.abs(listingPosition - nearestListingPosition);

      // Associate image
      let closestImgIndex = imgIndices[imgIndices.length - 1]; // Default to last img
      let i = 0;  
      while (i < imgIndices.length) {

        const imgDistance = Math.abs(imgIndices[i] - listingPosition);
        const nextImgDistance = Math.abs(imgIndices[i + 1] - listingPosition);
        if (nextImgDistance > imgDistance) {
          closestImgIndex =  imgIndices[i];
          break;
        }
        i++;
      }

      // Associate price
      let closestPricePosition = listingPosition;
      let distanceToPrice = listingPosition - closestPricePosition;
      while (!listingPrices[closestPricePosition] &&
        closestPricePosition < listingPrices.length &&
        distanceToPrice < distanceToNearestListing) {
        distanceToPrice++;
        closestPricePosition++;
      }

      // Associate mileage
      let closestMileagePosition = listingPosition;
      let distanceToMileage = listingPosition - closestMileagePosition;
      while (!listingMileages[closestMileagePosition] &&
        closestMileagePosition < listingMileages.length &&
        distanceToMileage < distanceToNearestListing) {
        distanceToMileage++;
        closestMileagePosition++;
      }

      const closestImg = listingImgs[closestImgIndex];
      const closestPrice = listingPrices[closestPricePosition];
      const closestMileage = listingMileages[closestMileagePosition];

      const listing = listingData.listings.get(listingPosition);

      const groupedListing = {
        ...listing,
        imgSrc: closestImg.startsWith('//') ? `http:${closestImg}` : closestImg,
        price: closestPrice,
        mileage: closestMileage
      }
    return groupedListing;

  });
  } catch (err) {
      console.log('error parsing listing/image data', err)
  }
  return groupedListingData;
}

  module.exports = groupListingData;