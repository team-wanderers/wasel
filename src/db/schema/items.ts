import { relations } from "drizzle-orm";
import {
  doublePrecision,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const itemStatusEnum = pgEnum("item_status", [
  "open",
  "matched",
  "claimed",
  "recovered",
  "closed",
]);

export const itemCategoryEnum = pgEnum("item_category", [
  "documents",
  "electronics",
  "keys",
  "bags",
  "jewelry",
  "pets",
  "other",
]);

function itemColumns() {
  return {
    title: text("title").notNull(),
    description: text("description").notNull(),
    category: itemCategoryEnum("category").notNull(),
    status: itemStatusEnum("status").notNull().default("open"),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    secretDetails: text("secret_details"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  };
}

export const lostItems = pgTable(
  "lost_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...itemColumns(),
    lostAt: timestamp("lost_at", { withTimezone: true }),
  },
  (t) => [
    index("lost_items_user_id_idx").on(t.userId),
    index("lost_items_status_idx").on(t.status),
    index("lost_items_category_idx").on(t.category),
    index("lost_items_title_trgm_idx").using("gin", t.title.op("gin_trgm_ops")),
    index("lost_items_description_trgm_idx").using("gin", t.description.op("gin_trgm_ops")),
  ],
);

export const foundItems = pgTable(
  "found_items",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ...itemColumns(),
    foundAt: timestamp("found_at", { withTimezone: true }),
  },
  (t) => [
    index("found_items_user_id_idx").on(t.userId),
    index("found_items_status_idx").on(t.status),
    index("found_items_category_idx").on(t.category),
    index("found_items_title_trgm_idx").using("gin", t.title.op("gin_trgm_ops")),
    index("found_items_description_trgm_idx").using("gin", t.description.op("gin_trgm_ops")),
  ],
);

export const itemMedia = pgTable(
  "item_media",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    lostItemId: uuid("lost_item_id").references(() => lostItems.id, {
      onDelete: "cascade",
    }),
    foundItemId: uuid("found_item_id").references(() => foundItems.id, {
      onDelete: "cascade",
    }),
    path: text("path").notNull(),
    mime: text("mime").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    index("item_media_lost_item_id_idx").on(t.lostItemId),
    index("item_media_found_item_id_idx").on(t.foundItemId),
  ],
);

export const lostItemsRelations = relations(lostItems, ({ one, many }) => ({
  user: one(users, {
    fields: [lostItems.userId],
    references: [users.id],
  }),
  media: many(itemMedia),
}));

export const foundItemsRelations = relations(foundItems, ({ one, many }) => ({
  user: one(users, {
    fields: [foundItems.userId],
    references: [users.id],
  }),
  media: many(itemMedia),
}));

export const itemMediaRelations = relations(itemMedia, ({ one }) => ({
  lostItem: one(lostItems, {
    fields: [itemMedia.lostItemId],
    references: [lostItems.id],
  }),
  foundItem: one(foundItems, {
    fields: [itemMedia.foundItemId],
    references: [foundItems.id],
  }),
}));
