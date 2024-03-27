require('dotenv').config();
const waitForStaticPage = require('./waitForStaticPage');

const proxyUsername = process.env.PROXY_USERNAME;
const proxyPassword = process.env.PROXY_PASSWORD;


async function goToNewTab(url, browser) {
    let page;

    try {
        if (!browser.connected) return null;
        console.log('testo')
        page = await browser.newPage();

        await page.authenticate({
        username: proxyUsername,
        password: proxyPassword
        });

        await page.setRequestInterception(true);
        
        const blankImage = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAHzwGA78JN5wAAAABJRU5ErkJggg==';
        page.on('request', (request) => {
        if (request.isInterceptResolutionHandled()) return;
        if (request.resourceType() === "image") {
            request.respond({
            status: 200,
            contentType: 'image/png',
            body: Buffer.from(blankImage, 'base64')
            });  
        } else {
            request.continue();
        }
        });

        page.on("console", (log) => {
          if(log.text().includes('aabaa')) {
            console.log(`Log from client: [${log.text()}] `)
          }  
        });

        // page.on('request', async (req) => {
        //   //console.log('request POST data', await req.fetchPostData());
        //   console.log('request headers', await req.headers());
        //   console.log('resource type', await req.resourceType());
        //   console.log('initiator', await req.initiator());
        // });
        // let bytesTotal = 0;

        // page.on('response', async (res) => {
        //   const req = await res.request();

        //   console.log('res headers', await res.headers());
        //   console.log('res status', await res.status());
        //   // try {
        //   //   console.log('res json', await res.json());
        //   // } catch(err) {

        //   //}

        //   // const headers = res.headers();
        //   // if ('content-length' in headers) {
        //   //     const length = parseInt(headers['content-length']);
        //   //     bytesTotal += length;
        //   //     console.log('total MBs so far', bytesTotal/1000000);
        //   // }
        //   // console.log('response to this request url of:', await req.url());
        //   // console.log('response to this request with headers:', await req.headers());
        //   // console.log('response to this request with resource type:', await req.resourceType());
        //   // console.log('response headers', await res.headers());
        //   // console.log('response url', await res.url());
        //   // console.log('res status', await res.status());
        //   // console.log('remote address', await res.remoteAddress());
        // });
        
        console.log('testp')
        await page.goto(url,{ waitUntil: 'load'});
         await waitForStaticPage(page);
        
        console.log('testq')
        return page;
    } catch(err) {
        console.log('testr')
        console.log("Error going to new tab:", err);
        return null;
    }
}

module.exports = goToNewTab;