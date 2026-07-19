/**
 * Utility to resolve and extract real direct image URLs from complex links
 * such as Google Images Search redirect links, short goo.gl links, etc.
 */
export async function resolveImageUrl(url: string): Promise<string> {
  if (!url) return ''
  let currentUrl = url.trim()

  // 1. Resolve short Google URLs (images.app.goo.gl)
  if (currentUrl.includes('images.app.goo.gl/') || currentUrl.includes('app.goo.gl/')) {
    try {
      // Fetch on the server to catch the 302 location or follow redirect
      const response = await fetch(currentUrl, {
        method: 'GET',
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        redirect: 'manual'
      })
      const location = response.headers.get('location')
      if (location) {
        currentUrl = location
      } else {
        // Fallback: follow redirect fully and read final url
        const followResponse = await fetch(currentUrl, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
          }
        })
        currentUrl = followResponse.url
      }
    } catch (err) {
      console.error('Error resolving short google image url:', err)
    }
  }

  // 2. Parse Google Image Viewer URL or Search Redirect (supports any google.com, google.com.br, google.es, etc.)
  try {
    if (currentUrl.includes('google.') && (currentUrl.includes('/imgres') || currentUrl.includes('/url'))) {
      const urlObj = new URL(currentUrl)
      
      // Check for direct 'imgurl' query parameter
      const imgUrlParam = urlObj.searchParams.get('imgurl')
      if (imgUrlParam) {
        return decodeURIComponent(imgUrlParam)
      }

      // Check for generic redirect query parameter ('q' or 'url')
      const qParam = urlObj.searchParams.get('q') || urlObj.searchParams.get('url')
      if (qParam) {
        let decoded = decodeURIComponent(qParam)
        
        // If the query target is another google image search URL, parse it recursively
        if (decoded.includes('imgres')) {
          const subUrlObj = new URL(decoded)
          const subImg = subUrlObj.searchParams.get('imgurl')
          if (subImg) return decodeURIComponent(subImg)
        }
        return decoded
      }
    }
  } catch (err) {
    console.error('Error parsing google image params:', err)
  }

  return currentUrl
}
