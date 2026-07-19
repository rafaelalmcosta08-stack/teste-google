import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function cleanImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  const currentUrl = url.trim()

  // 1. Google Drive direct link transformation
  if (currentUrl.includes('drive.google.com') || currentUrl.includes('docs.google.com')) {
    const match = currentUrl.match(/\/d\/([a-zA-Z0-9_-]+)/) || currentUrl.match(/[?&]id=([a-zA-Z0-9_-]+)/);
    if (match && match[1]) {
      return `https://lh3.googleusercontent.com/d/${match[1]}`
    }
  }

  // 2. Google Image Search URL / imgres extraction
  const imgurlMatch = currentUrl.match(/[?&]imgurl=([^&]+)/)
  if (imgurlMatch && imgurlMatch[1]) {
    try {
      return decodeURIComponent(imgurlMatch[1])
    } catch (_) {
      return imgurlMatch[1]
    }
  }

  // 3. Generic query redirect extraction if it contains an image extension
  const qMatch = currentUrl.match(/[?&](?:q|url)=([^&]+)/)
  if (qMatch && qMatch[1]) {
    try {
      const decoded = decodeURIComponent(qMatch[1])
      if (/\.(?:jpe?g|png|gif|webp|svg|bmp)(?:\?.*)?$/i.test(decoded)) {
        return decoded
      }
    } catch (_) {}
  }

  return currentUrl
}

