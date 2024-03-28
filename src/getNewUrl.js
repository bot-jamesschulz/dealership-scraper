function getNewUrl(href,page) {
    try {
        const newUrl = new URL(href,  page.url())
        return newUrl.href;
    } catch (err) {
        console.log("Error creating new url:", err)
        return null
    }
}

module.exports = getNewUrl;