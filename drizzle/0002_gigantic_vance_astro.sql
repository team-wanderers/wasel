ALTER TABLE "claims" ADD COLUMN "proof_description" text;--> statement-breakpoint
ALTER TABLE "claims" ADD COLUMN "proof_media_url" text;--> statement-breakpoint
CREATE INDEX "claims_lost_item_id_idx" ON "claims" USING btree ("lost_item_id");--> statement-breakpoint
CREATE INDEX "claims_found_item_id_idx" ON "claims" USING btree ("found_item_id");