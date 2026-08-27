const CACHE_VERSION = 'v11'
const CACHE_PREFIX = 'sudoku-'
const CACHE_NAME = `${CACHE_PREFIX}${CACHE_VERSION}`
const BASE_PATH = new URL(self.registration.scope).pathname
const INDEX_PATH = `${BASE_PATH}index.html`

const STATIC_PATHS = [
  `${BASE_PATH}manifest.webmanifest`,
  `${BASE_PATH}favicon-32.png`,
  `${BASE_PATH}apple-touch-icon.png`,
  `${BASE_PATH}icons/icon-192.png`,
  `${BASE_PATH}icons/icon-512.png`,
]

function isCacheable(response) {
  return response.ok && (response.type === 'basic' || response.type === 'default')
}

async function fetchAndCache(cache, url) {
  const response = await fetch(new Request(url, { cache: 'reload' }))
  if (isCacheable(response)) await cache.put(url, response)
}

async function precacheAppShell() {
  const cache = await caches.open(CACHE_NAME)
  const indexResponse = await fetch(new Request(INDEX_PATH, { cache: 'reload' }))
  if (!isCacheable(indexResponse)) throw new Error('Unable to cache the app shell')

  const html = await indexResponse.clone().text()
  await Promise.all([
    cache.put(INDEX_PATH, indexResponse.clone()),
    cache.put(BASE_PATH, indexResponse.clone()),
  ])

  const discoveredPaths = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/g)]
    .map((match) => new URL(match[1], self.registration.scope))
    .filter(
      (url) =>
        url.origin === self.location.origin && url.pathname.startsWith(BASE_PATH),
    )
    .map((url) => url.href)

  await Promise.allSettled(
    [...new Set([...STATIC_PATHS, ...discoveredPaths])].map((url) =>
      fetchAndCache(cache, url),
    ),
  )
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      await precacheAppShell()
      await self.skipWaiting()
    })(),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(
        keys
          .filter((key) => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
          .map((key) => caches.delete(key)),
      )
      await self.clients.claim()
    })(),
  )
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)
  if (url.origin !== self.location.origin || !url.pathname.startsWith(BASE_PATH)) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request)
          if (isCacheable(response)) {
            const cache = await caches.open(CACHE_NAME)
            await Promise.all([
              cache.put(request, response.clone()),
              cache.put(INDEX_PATH, response.clone()),
            ])
          }
          return response
        } catch {
          return (
            (await caches.match(request, { ignoreSearch: true })) ??
            (await caches.match(INDEX_PATH)) ??
            (await caches.match(BASE_PATH)) ??
            Response.error()
          )
        }
      })(),
    )
    return
  }

  event.respondWith(
    (async () => {
      const cached = await caches.match(request)
      if (cached) return cached

      try {
        const response = await fetch(request)
        if (isCacheable(response)) {
          const cache = await caches.open(CACHE_NAME)
          await cache.put(request, response.clone())
        }
        return response
      } catch {
        return Response.error()
      }
    })(),
  )
})
