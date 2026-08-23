import { decimal, int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const storeCategories = mysqlTable("storeCategories", {
  id: int("id").autoincrement().primaryKey(), title: varchar("title", { length: 120 }).notNull(), slug: varchar("slug", { length: 140 }).notNull().unique(), description: text("description"), heroImageUrl: text("heroImageUrl"), cloudinaryPublicId: varchar("cloudinaryPublicId", { length: 255 }), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const categoryImages = mysqlTable("categoryImages", {
  id: int("id").autoincrement().primaryKey(), categoryId: int("categoryId").notNull(), title: varchar("title", { length: 160 }).notNull(), imageUrl: text("imageUrl").notNull(), cloudinaryPublicId: varchar("cloudinaryPublicId", { length: 255 }).notNull(), altText: varchar("altText", { length: 255 }), createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export const saleOverrides = mysqlTable("saleOverrides", {
  id: int("id").autoincrement().primaryKey(), productHandle: varchar("productHandle", { length: 180 }).notNull().unique(), regularPrice: decimal("regularPrice", { precision: 12, scale: 2 }).notNull(), salePrice: decimal("salePrice", { precision: 12, scale: 2 }), discountPercent: int("discountPercent"), enabled: int("enabled").default(1).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const hiddenProducts = mysqlTable("hiddenProducts", {
  id: int("id").autoincrement().primaryKey(), productHandle: varchar("productHandle", { length: 180 }).notNull().unique(), hiddenAt: timestamp("hiddenAt").defaultNow().notNull(),
});

export const orders = mysqlTable("orders", {
  id: int("id").autoincrement().primaryKey(), orderNumber: varchar("orderNumber", { length: 32 }).notNull().unique(), customerName: varchar("customerName", { length: 160 }).notNull(), email: varchar("email", { length: 320 }).notNull(), phone: varchar("phone", { length: 40 }).notNull(), addressLine1: varchar("addressLine1", { length: 255 }).notNull(), addressLine2: varchar("addressLine2", { length: 255 }), city: varchar("city", { length: 120 }).notNull(), postalCode: varchar("postalCode", { length: 24 }), paymentMethod: mysqlEnum("paymentMethod", ["cod", "bank_transfer"]).notNull(), paymentStatus: mysqlEnum("paymentStatus", ["cash_due", "awaiting_transfer", "transfer_reference_submitted", "paid"]).notNull(), bankTransferReference: varchar("bankTransferReference", { length: 160 }), fulfillmentStatus: mysqlEnum("fulfillmentStatus", ["placed", "processing", "fulfilled", "cancelled"]).default("placed").notNull(), currencyCode: varchar("currencyCode", { length: 3 }).notNull(), subtotal: decimal("subtotal", { precision: 12, scale: 2 }).notNull(), total: decimal("total", { precision: 12, scale: 2 }).notNull(), createdAt: timestamp("createdAt").defaultNow().notNull(), updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export const orderItems = mysqlTable("orderItems", {
  id: int("id").autoincrement().primaryKey(), orderId: int("orderId").notNull(), productHandle: varchar("productHandle", { length: 180 }).notNull(), productTitle: varchar("productTitle", { length: 255 }).notNull(), productImageUrl: text("productImageUrl"), variantTitle: varchar("variantTitle", { length: 160 }), regularPrice: decimal("regularPrice", { precision: 12, scale: 2 }), salePrice: decimal("salePrice", { precision: 12, scale: 2 }), unitPrice: decimal("unitPrice", { precision: 12, scale: 2 }).notNull(), quantity: int("quantity").notNull(), lineTotal: decimal("lineTotal", { precision: 12, scale: 2 }).notNull(),
});
export type StoreCategory = typeof storeCategories.$inferSelect;
export type CategoryImage = typeof categoryImages.$inferSelect;
export type SaleOverride = typeof saleOverrides.$inferSelect;
export type HiddenProduct = typeof hiddenProducts.$inferSelect;
export type StoreOrder = typeof orders.$inferSelect;
