function isNewListings(oldListingsData, newListingsData) {
    const oldListingsSet = new Set(oldListingsData?.map((elem) => elem?.href));
    return newListingsData?.some((newListing) => !oldListingsSet?.has(newListing?.href));
}

module.exports = isNewListings;