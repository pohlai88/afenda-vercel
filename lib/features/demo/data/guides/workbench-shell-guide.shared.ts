import type { DemoGuideContent } from "../../schemas/demo-guide.shared"

export const WORKBENCH_SHELL_DEMO_GUIDE = {
  title: "How to use the Workbench Shell",
  purpose:
    "After sign-in, every ERP surface mounts inside AppShell: utility bar, primary rail, command layer, and scrollable main workspace.",
  steps: [
    {
      title: "Utility bar",
      description:
        "Org switcher, quick create, uploads, and marketplace entry live in the top chrome — consistent across modules.",
    },
    {
      title: "Primary rail",
      description:
        "Module navigation and workbench memory (pins, recents) anchor the left edge without nesting a second fixed sidebar inside main.",
    },
    {
      title: "Command layer",
      description:
        "Keyboard-first search and operational shortcuts summon from the command palette without leaving the current route.",
    },
  ],
  productionActions: [
    "Switch organization",
    "Pin a workbench view",
    "Open command palette (⌘K)",
  ],
  demoLimitations: [
    "This catalog page explains shell regions — it does not mount a signed-in session.",
    "Interactive shell preview runs in development at /playground/shell-preview only.",
  ],
} as const satisfies DemoGuideContent
