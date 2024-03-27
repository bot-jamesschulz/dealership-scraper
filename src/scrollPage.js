async function scrollPage(page) {
    const viewportWidth = 1920; // px 
    
    try {
        const pageHeight = await page.evaluate(() => document.body.scrollHeight);
    
        // Set the viewport size to cover the entire page height
        await page.setViewport({ width: viewportWidth, height: pageHeight});

        await page.evaluate(async () => {
            // Scroll viewport across the entire page to make sure all content is loaded
            await new Promise((resolve) => {
                let totalHeight = 0;
                const distance = 400;
                const timer = setInterval(() => {
                    var scrollHeight = document.body.scrollHeight;
                    window.scrollBy(0, distance);
                    totalHeight += distance;

                    if(totalHeight >= scrollHeight - window.innerHeight) {
                        clearInterval(timer);
                        resolve();
                    }
                }, 100);
            });
        });
    } catch (err) {
        console.log('error scrolling page: ', err)
    }
}

module.exports = scrollPage;