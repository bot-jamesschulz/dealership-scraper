/**
 * Checks if the given inventory page set is valid.
 * @param {Object} hrefs - The inventory page set to be checked.
 * @returns {boolean} - Returns true if the inventory page set is valid, otherwise false.
 */
function isValidInventoryPageSet(hrefs) {
    if (JSON.stringify(hrefs) === '{}' || !hrefs) {
      return false;
    }
  
    if (hrefs['new'] && (hrefs['used'] || hrefs['owned'])) {
      return true;
    }
  
    if (hrefs['inventory'] || hrefs['all']) {
      return true;
    }
  
    return false;

}

module.exports = isValidInventoryPageSet;