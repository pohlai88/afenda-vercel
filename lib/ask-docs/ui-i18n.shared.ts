import { defineI18nUI } from "fumadocs-ui/i18n"

import { askDocsI18n } from "#lib/ask-docs/source"

/**
 * Fumadocs UI translations for the ask-docs language switcher and search chrome.
 * English keys are retained where locale-specific copy is not yet translated.
 */
export const askDocsUI = defineI18nUI(askDocsI18n, {
  en: {
    displayName: "English",
  },
  "zh-CN": {
    displayName: "简体中文",
    search: "搜索文档",
  },
  vi: {
    displayName: "Tiếng Việt",
    search: "Tìm kiếm tài liệu",
  },
  ms: {
    displayName: "Bahasa Melayu",
    search: "Cari dokumentasi",
  },
})
