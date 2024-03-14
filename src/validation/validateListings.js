const fs = require('fs');
const makes = require('../../data/makeRegexes.json');
const findModel = require('./findModel.js');
const excludedWords = require('../../data/excludedWords.json');
const regexToMake = require('../../data/regexToMake.json');
const bikeData = require('../../data/bikeData.json');

module.exports = function validateListings(unfilteredListings, filteredListingUrls, inventoryHref, inventoryType) {
    console.log('validating listings')
    // Unique listing urls with appended makes to listings
    const uniqueListingUrls = new Set(filteredListingUrls);
    const results = [];
    const extractedData = [];
    const rejectedListings = [];
    const validYearPattern = /(?:(?<=^)|(?<=\s))((19|20)([0-9][0-9]))(?=\s|$)/g;
    let loopCount = 0;

    for (const listingData of unfilteredListings) {
        loopCount++;
        // console.log('LOOP COUNT: ', loopCount);
        // console.log(listingData)
        
        const url = makeUrl(listingData?.href, inventoryHref);

        if (!url || uniqueListingUrls.has(url.href))  continue;   
        
        const listingHostName = url?.hostname.replace(/^www\./, '').replace(/\.[^.]+$/, '');
        
        uniqueListingUrls.add(url);
        
        let listing = listingData?.innerText 

        let cleanedListing = listing
            .replace(/[^\w\.\/\s\u2013\u2014\u2212-]/g, '') // Remove any abnormal characters
            .replace(/\s+/g, ' ')                           // Replace consecutive spaces with a single space
            .trim();                                        // Trim leading and trailing spaces
        
        const validYears = cleanedListing.match(validYearPattern);
        const noLetters = !cleanedListing.match(/[a-zA-Z]/);
        
        if (!validYears || noLetters) continue;

        const validYear = parseInt(validYears[0]);
        const validYearLength = 4;
        const yearStartIndex = cleanedListing.indexOf(validYear);
        let yearEndIndex = yearStartIndex + validYearLength - 1;
        
        // Add a space after the year if it doesn't already have one
        if (cleanedListing[yearEndIndex + 1] && cleanedListing[yearEndIndex + 1] !== ' ') {
            cleanedListing = cleanedListing.slice(0, yearEndIndex + 1) + ' ' + cleanedListing.slice(yearEndIndex);
        }

        // remove all characters besides letters and numbers
        const alphaNumListing = cleanedListing
            .toLowerCase()
            .replace(/[^a-zA-Z0-9]/g, '');

        const hasExcludedWords = excludedWords.some(word => alphaNumListing.includes(word));

        if (hasExcludedWords) continue;

        let listingMake = null;
        let makeKey = null;
        const listingHasMake = makes.some(make => {
            const makeRegex = new RegExp(`\\b(${make})\\b`, 'i');
            const match = cleanedListing.match(makeRegex);
            
            if (match) {
                makeKey = regexToMake[make];
                listingMake = match[0];
                return true
            }
            return false;
        });
        
        // If there is no make in the listing try to find one in the href
        if (!listingHasMake) {                     
            const hostNameHasMake = makes.some(make => {
                const makeRegex = new RegExp(`(${make})`, 'i');
                const match = listingHostName.match(makeRegex);
                if (match) {
                    makeKey = regexToMake[make];
                    listingMake = match[0];
                    return true
                }
                return false;
            });         
            
            if (hostNameHasMake && listingMake) {
                
                cleanedListing = `${listingMake.charAt(0).toUpperCase() + listingMake.slice(1)} ${cleanedListing}`;
                yearEndIndex += listingMake.length -1;
                // Special case for harley websistes
            } else if (listingHostName.startsWith('hd') || listingHostName.endsWith('hd')){
                makeKey = 'harley-davidson';
                listingMake = 'Harley-Davidson';
                cleanedListing = `Harley-Davidson ${cleanedListing}`;
                yearEndIndex += listingMake.length -1;
            } else {
                rejectedListings.push(cleanedListing);
                continue;
            }
        }



        if (!makeKey) {
            console.log(`No make key for ${listingMake}: ${cleanedListing}`);
            
        }

        const makeKeyStartIndex = cleanedListing.indexOf(listingMake);
        const makeKeyEndIndex = makeKeyStartIndex + listingMake.length - 1;

        const modelData = bikeData[makeKey];
        const models = modelData.map(model => model.model);
        const listingModel = findModel(cleanedListing.toLowerCase(), models, [makeKeyEndIndex, yearEndIndex]);
        // if (true) {
        //     console.log('MODEL: -> ', listingModel?.extractedModel);
        //     console.log('LISTING: -> ', cleanedListing);
        //     console.log('\n');           
        // }    
        
        if (listingModel) { 
            results.push(cleanedListing);
            extractedData.push({
                make: makeKey,
                model: listingModel?.extractedModel,
                year: validYear,
                condition: condition(inventoryType),
                listing: cleanedListing,
                detailsUrl: url.href,
                imgSrc: listingData.img
            })
        } else {
            rejectedListings.push(cleanedListing);
        }
    }


    // fs.writeFile('./sanitizationTesting/sanitizedResults.json', JSON.stringify(results) , 'utf-8', (err) => {
    //     if (err) throw err;
    //     console.log('The file has been saved!');
    // });
    // fs.writeFile('./sanitizationTesting/extractedData.json', JSON.stringify(extractedData) , 'utf-8', (err) => {
    //     if (err) throw err;
    //     console.log('The file has been saved!');
    // });
    // fs.writeFile('./sanitizationTesting/rejectedListings.json', JSON.stringify(rejectedListings) , 'utf-8', (err) => {
    //     if (err) throw err;
    //     console.log('The file has been saved!');
    // });
    return extractedData;
}

function makeUrl(listingHref, inventoryHref) {
    try {
        return new URL(listingHref, inventoryHref);
    } catch(err) {
        console.log('error creating url from: ', listingHref)
    }
    
}

function condition(inventoryType) {
    if (inventoryType === 'new') return inventoryType;
    if (inventoryType === 'used' || inventoryType === 'owned') return 'used';

    return null;
}