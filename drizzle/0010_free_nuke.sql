CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "found_items_title_trgm_idx" ON "found_items" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "found_items_description_trgm_idx" ON "found_items" USING gin ("description" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "lost_items_title_trgm_idx" ON "lost_items" USING gin ("title" gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "lost_items_description_trgm_idx" ON "lost_items" USING gin ("description" gin_trgm_ops);
