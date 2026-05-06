import type { MetadataRoute } from "next"

import {
  APP_ICON_192_PNG,
  APP_ICON_512_PNG,
  APP_ICON_MASKABLE_512_PNG,
  SITE_DESCRIPTION,
  SITE_NAME,
} from "#lib/site"

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: SITE_NAME,
    description: SITE_DESCRIPTION,
    start_url: "/",
    display: "standalone",
    background_color: "#faf9fb",
    theme_color: "#5a4a6e",
    icons: [
      {
        src: APP_ICON_192_PNG,
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: APP_ICON_512_PNG,
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: APP_ICON_MASKABLE_512_PNG,
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  }
}
