-- Add lane column to rail_pinned_item for the three-lane memory widget.
-- Existing rows default to "pinned" automatically via the column default.
-- Application-layer enum: "pinned" | "urgent" | "todo" — enforced by Zod input schemas,
-- not a DB constraint, so adding new lanes later is migration-free.

ALTER TABLE "rail_pinned_item" ADD COLUMN "lane" text NOT NULL DEFAULT 'pinned';
