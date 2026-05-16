CREATE TABLE "ask_docs_feedback" (
	"id" text PRIMARY KEY NOT NULL,
	"org_id" text,
	"user_id" text,
	"session_id" text,
	"locale" text NOT NULL,
	"page_path" text NOT NULL,
	"rating" integer NOT NULL,
	"message" text,
	"source" text DEFAULT 'ask-docs' NOT NULL,
	"user_agent" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "ask_docs_feedback_rating_chk" CHECK ("ask_docs_feedback"."rating" IN (-1, 1))
);
--> statement-breakpoint
CREATE INDEX "ask_docs_feedback_locale_created_idx" ON "ask_docs_feedback" USING btree ("locale","created_at");