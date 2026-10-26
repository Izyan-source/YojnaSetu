import { useCallback, useEffect, useState } from 'react'

const currentLocation = () => window.location.pathname + window.location.search + window.location.hash
export function decodeSegment(value) {
  try { return decodeURIComponent(value) } catch { return value }
}

// Keep native URLs and browser history without introducing another routing dependency.
export function useNavigation() {
  const [location, setLocation] = useState(currentLocation)
  const url = new URL(location, window.location.origin)
  const pathname = url.pathname.replace(/\/$/, '') || '/'

  useEffect(() => {
    const sync = () => setLocation(currentLocation())
    window.addEventListener('popstate', sync)
    window.addEventListener('hashchange', sync)
    return () => {
      window.removeEventListener('popstate', sync)
      window.removeEventListener('hashchange', sync)
    }
  }, [])

  const navigate = useCallback((destination, { replace = false } = {}) => {
    const target = new URL(destination, window.location.href)
    const next = target.pathname + target.search + target.hash
    if (next === currentLocation()) {
      if (target.hash) document.getElementById(decodeSegment(target.hash.slice(1)))?.scrollIntoView()
      else window.scrollTo(0, 0)
      return
    }
    window.history[replace ? 'replaceState' : 'pushState']({}, '', next)
    setLocation(next)
  }, [])

  function handleNavigation(event) {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return
    const anchor = event.target.closest('a[href]')
    if (!anchor || (anchor.target && anchor.target !== '_self') || anchor.hasAttribute('download')) return
    const target = new URL(anchor.href, window.location.href)
    // API resources and external links retain their native browser behavior.
    if (target.origin !== window.location.origin || target.pathname.startsWith('/api/')) return
    event.preventDefault()
    navigate(target.href)
    if (target.hash === '#main-content') document.getElementById('main-content')?.focus()
  }

  return { location, pathname, search: url.search, hash: url.hash, navigate, handleNavigation }
}
