/* Org notification Web Push — scope is site root; click opens linkedPath from payload. */
self.addEventListener("push", (event) => {
  let data = { title: "Afenda", body: "", url: null, noticeId: null }
  try {
    if (event.data) {
      data = { ...data, ...event.data.json() }
    }
  } catch {
    /* ignore malformed payload */
  }

  const title = data.title || "Afenda"
  const options = {
    body: data.body || "",
    tag: data.noticeId ? `org-notice:${data.noticeId}` : undefined,
    data: { url: data.url || "/" },
    icon: "/icons/lynx/Lynx-transfrom-1.png",
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const rawUrl = event.notification.data?.url
  if (!rawUrl || typeof rawUrl !== "string") return

  const locale = self.location.pathname.split("/").filter(Boolean)[0] || "en"
  const href =
    rawUrl.startsWith("/") && !rawUrl.startsWith(`/${locale}/`)
      ? `/${locale}${rawUrl}`
      : rawUrl

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ("focus" in client) {
            client.navigate(href)
            return client.focus()
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(href)
        }
      })
  )
})
