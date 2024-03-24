function isNewListings(oldListingsData, newListingsData) {
    const oldListingsSet = new Set(oldListingsData?.map((elem) => elem?.href));
    // console.log('new listings', newListingsData.filter((newListing) => !oldListingsSet.has(newListing?.href)).map(elem => elem.href))
    // console.log('old listings set', oldListingsSet)
    return newListingsData?.some((newListing) => !oldListingsSet?.has(newListing?.href));
}

module.exports = isNewListings;