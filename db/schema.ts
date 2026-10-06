import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";

export const monitors = sqliteTable("monitors", {
  id: text("id").primaryKey(), name: text("name").notNull(), retailer: text("retailer").notNull(),
  url: text("url").notNull().unique(), kind: text("kind").notNull(), enabled: integer("enabled").notNull().default(1),
  maxPrice: real("max_price"), status: text("status").notNull().default("unknown"), detail: text("detail").notNull().default("Noch nicht geprüft"),
  uvpPrice: real("uvp_price"), uvpSource: text("uvp_source"), branchStock: text("branch_stock").notNull().default("[]"),
  price: real("price"), image: text("image"), seller: text("seller"), channel: text("channel").notNull().default("online"),
  location: text("location"), checkedAt: integer("checked_at"), nextCheckAt: integer("next_check_at").notNull().default(0),
  lastStock: text("last_stock"), version: integer("version").notNull().default(0),
});
export const drops = sqliteTable("drops", {
  id: text("id").primaryKey(), monitorId: text("monitor_id").notNull(), version: integer("version").notNull(),
  title: text("title").notNull(), url: text("url").notNull(), retailer: text("retailer").notNull(),
  price: real("price"), channel: text("channel").notNull(), location: text("location"), kind: text("kind").notNull(),
  uvpPrice: real("uvp_price"), uvpSource: text("uvp_source"), branchStock: text("branch_stock").notNull().default("[]"),
  createdAt: integer("created_at").notNull(), pushState: text("push_state").notNull().default("pending"),
}, table => [uniqueIndex("drops_monitor_version").on(table.monitorId, table.version)]);
export const devices = sqliteTable("devices", { endpoint: text("endpoint").primaryKey(), subscription: text("subscription").notNull(), createdAt: integer("created_at").notNull(), lastError: text("last_error") });
export const meta = sqliteTable("meta", { key: text("key").primaryKey(), value: text("value").notNull() });

export const observations = sqliteTable("observations", {
  id:text("id").primaryKey(),retailer:text("retailer").notNull(),address:text("address"),product:text("product").notNull(),
  kind:text("kind").notNull(),source:text("source").notNull(),observedAt:integer("observed_at").notNull(),createdAt:integer("created_at").notNull(),expectedAt:integer("expected_at"),
  timePrecision:text("time_precision").notNull().default("day"),
  sourceUrl:text("source_url"),note:text("note").notNull(),price:real("price"),uvpPrice:real("uvp_price"),uvpSource:text("uvp_source"),
  reviewed:integer("reviewed").notNull().default(0),pushState:text("push_state").notNull().default("pending"),
});
export const communitySources = sqliteTable("community_sources", {
  id:text("id").primaryKey(),name:text("name").notNull(),url:text("url").notNull().unique(),
  status:text("status").notNull().default("unchecked"),detail:text("detail").notNull().default("Noch nicht geprüft"),checkedAt:integer("checked_at"),nextCheckAt:integer("next_check_at").notNull().default(0),
});
export const communityPosts = sqliteTable("community_posts", {
  id:text("id").primaryKey(),title:text("title").notNull(),excerpt:text("excerpt").notNull(),url:text("url").notNull(),
  publishedAt:integer("published_at").notNull(),fetchedAt:integer("fetched_at").notNull(),retailers:text("retailers").notNull(),
});
