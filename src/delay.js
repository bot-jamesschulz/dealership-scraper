async function delay(length) {
    await new Promise(resolve => setTimeout(resolve, length));
}

module.exports = delay;