import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";
import { foundItems, lostItems } from "./items";

export const matchStatusEnum = pgEnum("match_status", [
  "suggested",
  "accepted",
  "rejected",
  "expired",
]);

export const claimStatusEnum = pgEnum("claim_status", [
  "pending",
  "verified",
  "rejected",
  "cancelled",
]);

export const recoveryStatusEnum = pgEnum("recovery_status", [
  "scheduled",
  "in_progress",
  "deposited",
  "completed",
  "cancelled",
]);

export const matches = pgTable(
  "matches",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lostItemId: uuid("lost_item_id")
      .notNull()
      .references(() => lostItems.id, { onDelete: "cascade" }),
    foundItemId: uuid("found_item_id")
      .notNull()
      .references(() => foundItems.id, { onDelete: "cascade" }),
    score: doublePrecision("score").notNull(),
    status: matchStatusEnum("status").notNull().default("suggested"),
    lostUserConfirmedAt: timestamp("lost_user_confirmed_at", { withTimezone: true }),
    foundUserConfirmedAt: timestamp("found_user_confirmed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("matches_lost_found_uidx").on(t.lostItemId, t.foundItemId),
    index("matches_status_idx").on(t.status),
  ],
);

export const claims = pgTable(
  "claims",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    matchId: uuid("match_id").references(() => matches.id, {
      onDelete: "set null",
    }),
    lostItemId: uuid("lost_item_id")
      .references(() => lostItems.id, { onDelete: "cascade" }),
    foundItemId: uuid("found_item_id")
      .references(() => foundItems.id, { onDelete: "cascade" }),
    claimantId: uuid("claimant_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: claimStatusEnum("status").notNull().default("pending"),
    proofDescription: text("proof_description"),
    proofMediaUrl: text("proof_media_url"),
    verificationNotes: text("verification_notes"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("claims_claimant_id_idx").on(t.claimantId),
    index("claims_status_idx").on(t.status),
    index("claims_lost_item_id_idx").on(t.lostItemId),
    index("claims_found_item_id_idx").on(t.foundItemId),
  ],
);

export const pickupPoints = pgTable("pickup_points", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  address: text("address").notNull(),
  phone: text("phone"),
  workingHours: text("working_hours"),
  lat: doublePrecision("lat"),
  lng: doublePrecision("lng"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const recoveries = pgTable(
  "recoveries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    claimId: uuid("claim_id")
      .notNull()
      .references(() => claims.id, { onDelete: "cascade" }),
    pickupPointId: uuid("pickup_point_id").references(() => pickupPoints.id, {
      onDelete: "set null",
    }),
    status: recoveryStatusEnum("status").notNull().default("scheduled"),
    scheduledAt: timestamp("scheduled_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    ownerConfirmedAt: timestamp("owner_confirmed_at", { withTimezone: true }),
    finderConfirmedAt: timestamp("finder_confirmed_at", { withTimezone: true }),
    notes: text("notes"),
    handoverCode: text("handover_code"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    uniqueIndex("recoveries_claim_id_uidx").on(t.claimId),
    index("recoveries_status_idx").on(t.status),
  ],
);

export const matchesRelations = relations(matches, ({ one }) => ({
  lostItem: one(lostItems, {
    fields: [matches.lostItemId],
    references: [lostItems.id],
  }),
  foundItem: one(foundItems, {
    fields: [matches.foundItemId],
    references: [foundItems.id],
  }),
}));

export const claimsRelations = relations(claims, ({ one, many }) => ({
  match: one(matches, {
    fields: [claims.matchId],
    references: [matches.id],
  }),
  lostItem: one(lostItems, {
    fields: [claims.lostItemId],
    references: [lostItems.id],
  }),
  foundItem: one(foundItems, {
    fields: [claims.foundItemId],
    references: [foundItems.id],
  }),
  claimant: one(users, {
    fields: [claims.claimantId],
    references: [users.id],
  }),
  recoveries: many(recoveries),
}));

export const pickupPointsRelations = relations(pickupPoints, ({ many }) => ({
  recoveries: many(recoveries),
}));

export const recoveriesRelations = relations(recoveries, ({ one }) => ({
  claim: one(claims, {
    fields: [recoveries.claimId],
    references: [claims.id],
  }),
  pickupPoint: one(pickupPoints, {
    fields: [recoveries.pickupPointId],
    references: [pickupPoints.id],
  }),
}));
