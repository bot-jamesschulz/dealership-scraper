async function getProxy() {
    const url = new URL('https://proxy.webshare.io/api/v2/proxy/list/')
    url.searchParams.append('mode', 'direct')

    const req = await fetch(url.href, {
        method: "GET",
        headers: {
          Authorization: "Token ghtd9unh2krx8nqoigt7qswl5vdqsju33a27ioa2"
        }
    })
     
    const res = await req.json()

    const info = res.results[0]
    
    return `${info.proxy_address}:${info.port}`

}

module.exports = getProxy;