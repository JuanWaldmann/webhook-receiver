

async function responseCheck(){
    const response = await fetch("https://httpbin.org/status/200,500");
    console.log(response.ok)
    console.log(response.status)
}
