ALTER TABLE "pickup_points" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "pickup_points" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "recoveries" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "recoveries" ADD COLUMN "updated_at" timestamp with time zone DEFAULT now() NOT NULL;