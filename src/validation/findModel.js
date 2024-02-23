import Fuse from 'fuse.js'

const ACCURACY_THRESHOLD = 0.4;
const IDENTICAL_MATCH = 0;

const options = {
  includeScore: true,
  includeMatches: true,
  threshold: ACCURACY_THRESHOLD,
  minMatchCharLength: 2
}

const fuse = new Fuse([],options);

/**
 * Finds the model, or approximate model using a fuzzy search, of a bike listing based on a given list of models and search indices.
 * 
 * @param {string} listing - The bike listing to search within.
 * @param {string[]} models - The list of models to search for.
 * @param {number[]} searchIndices - The indices within the listing to search for the models. Typically these are the end indices of the make and year.
 * @returns {string|null} - The extracted model from the listing, or null if no match is found.
 */
export default function findModel(listing, models, searchIndices) {

  let bestMatch;
  let extractedModel;
  let searchedModel;

  for (const model of models) {

    let modelMatch;
    let modelMatchIndices;

    // Search at given indices
    for (const index of searchIndices) {
      if (index === ' ') index + 1;
      // get substring to search
      let start = index + 2;
      let end = start + model.length - 1;
      let searchSpace = listing.slice(start, end + 1);
    
      let results;

      try {
        fuse.setCollection([searchSpace]);
        results = fuse.search(model)[0];
      } catch (err) {
        console.log(`Error performing fuzzy search on \n model: ${model} \n searchSpace: ${searchSpace} \n listing: ${listing} \n error: ${err}`);
        continue;
      }

      if (!results) continue;
      
      // Update best match for the current model
      if (!modelMatch || results.score < modelMatch?.score) {
        modelMatch = results;
        modelMatchIndices = { start, end };
      }
    }

    if (!modelMatch) continue;
    
    if (modelMatch.score > ACCURACY_THRESHOLD) continue;
      
    // Update the best match if it's a lower score or the length is longer meaning we have a more descript match (e.g. "ninja" vs "ninja 300")
    if (!bestMatch 
      || modelMatch.score < bestMatch.score 
      || (modelMatch.score === bestMatch.score && modelMatch.item.length > bestMatch.item.length)) {
      
      const modelExtracted = extractModel(listing, modelMatch.score, modelMatchIndices);
      
      // Check that the first characters of the searched model and the extracted mode are the same, so we can avoid false positives
      if (model[0] !== modelExtracted[0]) continue;

      bestMatch = modelMatch;           
      searchedModel = model;
      extractedModel = modelExtracted;              
    }


    // if (bestMatch?.score > IDENTICAL_MATCH) {
    //     console.log(`MODEL SEARCHED: ${searchedModel} \n bestMatch:`, bestMatch);
    // }

    
  }

  return extractedModel ? { extractedModel, searchedModel } : null;

}
/**
 * Extracts the model from a bike listing based on the provided start and end indices.
 * If there is an imperfect match and a single character at the end of the match, it removes it.
 * If there is no imperfect match, it moves the end index to the end of the word.
 * @param {string} listing - The bike listing string.
 * @param {number} score - The match score.
 * @param {object} indices - The start and end indices of the model in the listing.
 * @returns {string} - The extracted model.
 */
function extractModel(listing, score, { start, end }) {
  
  // If we have an imperfect match and a single char at the end of our match we want to remove it since it's most likely an erroneous character (e.g. the 'n' in new)
  if (score !== IDENTICAL_MATCH && listing[end] === ' ') {
    return listing.slice(start, end).trim()
  } else {
    // Move the end index to the end of the word
    while (listing[end + 1] && listing[end + 1] !== ' ') {
      end++;
    }
    return listing.slice(start, end + 1).trim();
  }
}


