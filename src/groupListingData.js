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
        
      const nearestListingPosition = index === listingIndices.length - 1 ?
        listingIndices[index - 1] :
        listingIndices[index + 1];
      const distanceToNearestListing = Math.abs(listingPosition - nearestListingPosition);
      
      console.log('curr listing', listingPosition);
      console.log('nearest listing listing', nearestListingPosition);
      console.log('distance to nearest listing', distanceToNearestListing);

      // Associate image
      let closestImgIndex = imgIndices[imgIndices.length - 1]; // Default to last img
      let i = 0;  
      while (i < imgIndices.length) {

        const imgDistance = Math.abs(imgIndices[i] - listingPosition);
        const nextImgDistance = Math.abs(imgIndices[i + 1] - listingPosition);
        if (nextImgDistance > imgDistance) {
          //console.log(`imgIndices[i]: ${imgIndices[i]} | listingPosition: ${listingPosition}`)
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
        // console.log('price at closestPricePosition', listingPrices[closestPricePosition])
        distanceToPrice++;
        closestPricePosition++;
      }

      // Associate mileage
      let closestMileagePosition = listingPosition;
      let distanceToMileage = listingPosition - closestMileagePosition;
      while (!listingMileages[closestMileagePosition] &&
        closestMileagePosition < listingMileages.length &&
        distanceToMileage < distanceToNearestListing) {
        // console.log('mileage at closestMileagePosition', listingMileages[closestPricePosition])
        distanceToMileage++;
        closestMileagePosition++;
      }

      console.log('distanceToMileage', distanceToMileage);
      console.log('closestMileagePosition', closestMileagePosition)

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
      console.log('groupedListing', groupedListing)
    return groupedListing;

  });
  } catch (err) {
      console.log('error parsing listing/image data', err)
  }
  return groupedListingData;
}

  module.exports = groupListingData;