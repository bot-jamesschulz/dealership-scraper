/**
 * Waits for the network to become idle
 * 
 * @param {Page} page - The Puppeteer page object.
 * @param {Object}  - An object containing options
 */
async function waitForNewContent(page, { idleTime = 750, timeout = 4000, minFulfilled = 5 } = {}) {
  let requests = 0;
  let finishedRequests = 0;
  let prevRequests = 0;
  let prevFinishedRequests = 0;
  let pageLoaded = false;

  const requestHandler = (request) => {
    requests++;
    if (request.isInterceptResolutionHandled()) return;
    request.continue();  
  };

  const requestFinishedHandler = (request) => {
    finishedRequests++;
    if (request.isInterceptResolutionHandled()) return;
    request.continue();   
  };

  const requestFailedHandler = (request) => {
    finishedRequests++;
    if (request.isInterceptResolutionHandled()) return;
    request.continue();   
  };

  const loadListener = () => {
    console.log('load event fired')
    pageLoaded = true;
  };

  return new Promise((resolve) => {

    page.on('request', requestHandler);
    page.on('requestfinished', requestFinishedHandler);
    page.on('requestfailed', requestFailedHandler);
    page.on('load', loadListener);

    const timeoutID = setTimeout(() => {
      console.log('Timed out waiting for idle')
      clearInterval(intervalID);
      page.off('request', requestHandler);
      page.off('requestfinished', requestFinishedHandler);
      page.off('requestfailed', requestFailedHandler);
      page.off('load', loadListener);

      resolve();

    },timeout);

    const intervalID = setInterval(() => {
      
      console.log('network status:', `\n requests ${requests} \n prevRequests ${prevRequests} \n finishedRequests ${finishedRequests} \n prevfinishedRequests ${prevFinishedRequests}`);
      
      if ((requests === prevRequests 
        && finishedRequests === prevFinishedRequests 
        && finishedRequests >= requests 
        && finishedRequests >= minFulfilled)
      || pageLoaded) {
        console.log('new content loaded ##############')
        clearTimeout(timeoutID);
        clearInterval(intervalID);

        page.off('request', requestHandler);
        page.off('requestfinished', requestFinishedHandler);
        page.off('requestfailed', requestFailedHandler);
        page.off('load', loadListener);

        resolve();

      } else {
        
        prevRequests = requests;
        prevFinishedRequests = finishedRequests;
      }
    }, idleTime);
  });
}

module.exports = waitForNewContent;