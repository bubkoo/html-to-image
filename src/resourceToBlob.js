const TIMEOUT = 30000

export default function resourceToBlob(url, { cacheBust, imagePlaceholder }) {
  if (cacheBust) {
    // Cache bypass so we dont have CORS issues with cached images
    // Source: https://developer.mozilla.org/en/docs/Web/API/XMLHttpRequest/Using_XMLHttpRequest#Bypassing_the_cache
    url += ((/\?/).test(url) ? '&' : '?') + (new Date()).getTime() // eslint-disable-line
  }

  let placeholder = ''
  if (imagePlaceholder) {
    const split = imagePlaceholder.split(/,/)
    if (split && split[1]) {
      placeholder = split[1] // eslint-disable-line
    }
  }

  return new Promise(((resolve) => {
    const req = new XMLHttpRequest()

    const fail = (message) => {
      console.error(message) // eslint-disable-line
    }

    const timeout = () => {
      fail(`Timeout of ${TIMEOUT}ms occured while fetching resource: ${url}`)
      resolve(placeholder)
    }

    const done = () => {
      if (req.readyState !== 4) {
        return
      }

      if (req.status !== 200) {
        fail(`Cannot fetch resource: ${url}, status: ${req.status}`)
        resolve(placeholder)

        return
      }

      const encoder = new FileReader()
      encoder.onloadend = () => {
        const content = encoder.result.split(/,/)[1]
        resolve(content)
      }
      encoder.readAsDataURL(req.response)
    }

    req.onreadystatechange = done
    req.ontimeout = timeout
    req.responseType = 'blob'
    req.timeout = TIMEOUT
    req.open('GET', url, true)
    req.send()
  }))
}
