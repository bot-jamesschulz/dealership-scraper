/**
 * Retrieves the href attribute of the next anchor element in the DOM hierarchy starting from the given element.
 * @param {Page} page - The Puppeteer page object.
 * @param {Element} element - The starting element to search from.
 * @returns {Promise<string|boolean>} - The href attribute value of the next anchor element, or false if not found.
 */
async function nextElementHref(page, element) {
    return page.evaluate((element) => {
      let currentElement = element;
      do {
        if (currentElement.tagName === "A") {
          return currentElement.getAttribute("href");
        }
        currentElement = currentElement.parentElement;
      } while (currentElement);
      return false;
    }, element);
  }

  module.exports = nextElementHref;