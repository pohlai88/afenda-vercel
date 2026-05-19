/** Pure user-agent label parser for session lists (edge/client/server safe). */

export type ParsedUserAgent = {
  browser: string
  device: string
}

export function parseUserAgentLabel(
  userAgent: string | null | undefined
): ParsedUserAgent {
  const ua = userAgent?.trim()
  if (!ua) {
    return { browser: "Unknown browser", device: "Unknown device" }
  }

  let browser = "Unknown browser"
  if (/Edg\//i.test(ua)) browser = "Microsoft Edge"
  else if (/Chrome\//i.test(ua) && !/Chromium/i.test(ua)) browser = "Chrome"
  else if (/Firefox\//i.test(ua)) browser = "Firefox"
  else if (/Safari\//i.test(ua) && !/Chrome/i.test(ua)) browser = "Safari"
  else if (/OPR\//i.test(ua) || /Opera/i.test(ua)) browser = "Opera"

  let device = "Desktop"
  if (/iPhone|iPad|iPod/i.test(ua)) device = "Apple mobile"
  else if (/Android/i.test(ua)) device = "Android"
  else if (/Windows/i.test(ua)) device = "Windows"
  else if (/Macintosh|Mac OS X/i.test(ua)) device = "macOS"
  else if (/Linux/i.test(ua)) device = "Linux"

  return { browser, device }
}
