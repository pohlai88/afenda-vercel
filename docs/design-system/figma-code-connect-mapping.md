# Afenda Figma Code Connect Mapping

This document defines the canonical mapping between Figma variables/components and Afenda ERP code primitives.

## Token parity

- Figma variable collection: `afenda/semantic`
- Code token source: `app/globals.css`
- Tailwind usage: semantic utilities only (`bg-primary`, `text-muted-foreground`, `border-border`)

### Required color mapping

- `color.background.default` -> `--background` -> `bg-background`
- `color.text.default` -> `--foreground` -> `text-foreground`
- `color.action.primary` -> `--primary` -> `bg-primary`
- `color.status.success` -> `--success` -> `bg-success`
- `color.status.warning` -> `--warning` -> `bg-warning`
- `color.status.info` -> `--info` -> `bg-info`
- `color.status.critical` -> `--critical` -> `bg-critical`
- `color.data.positive` -> `--data-positive`
- `color.data.negative` -> `--data-negative`
- `color.data.neutral` -> `--data-neutral`

### Required radius mapping

- `radius.control` -> `rounded-lg` (`uiRadius.control`)
- `radius.chip` -> `rounded-md` (`uiRadius.chip`)
- `radius.surface` -> `rounded-2xl` (`uiRadius.surface`)

## Component naming parity

Use this format in Figma component names:

- `Button/variant={default|outline|secondary|ghost|destructive|link}/size={default|xs|sm|lg|icon}`
- `Card/size={default|sm}`
- `Badge/variant={default|secondary|destructive|outline|ghost|link}`
- `Input/state={default|invalid|disabled}`

The variant vocabulary must match code enums in `lib/design-system.ts` and component CVA definitions.

## Slot parity

Figma layer names should mirror `data-slot` values.

Examples:

- `button-root` -> `data-slot="button"`
- `dialog-content` -> `data-slot="dialog-content"`
- `table-head` -> `data-slot="table-head"`
- `sidebar-menu-button` -> `data-slot="sidebar-menu-button"`

## MCP workflow

1. Discover existing component first: `search_design_system`
2. Implement or adapt component in code
3. Extract design context when needed: `get_design_context`
4. Create/update map: `add_code_connect_map`
5. Publish mapping set: `send_code_connect_mappings`

## Rule

Do not introduce new variant names in Figma without updating code primitives and `lib/design-system.ts` in the same change.
