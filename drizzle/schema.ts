import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, decimal, json } from "drizzle-orm/mysql-core";

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

export const ingredients = mysqlTable("ingredients", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  casNumber: varchar("casNumber", { length: 255 }),
  supplier: varchar("supplier", { length: 255 }),
  category: varchar("category", { length: 100 }),
  inventoryAmount: varchar("inventoryAmount", { length: 100 }),
  costPerGram: decimal("costPerGram", { precision: 10, scale: 4 }),
  ifraLimit: decimal("ifraLimit", { precision: 10, scale: 4 }),
  longevity: int("longevity"),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Ingredient = typeof ingredients.$inferSelect;
export type InsertIngredient = typeof ingredients.$inferInsert;

export const formulas = mysqlTable("formulas", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  solvent: varchar("solvent", { length: 100 }).default("Ethanol"),
  solventWeight: decimal("solventWeight", { precision: 12, scale: 3 }).default("0"),
  totalWeight: decimal("totalWeight", { precision: 12, scale: 3 }).default("0"),
  status: mysqlEnum("status", ["draft", "final"]).default("draft").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Formula = typeof formulas.$inferSelect;
export type InsertFormula = typeof formulas.$inferInsert;

export const formulaIngredients = mysqlTable("formula_ingredients", {
  id: int("id").autoincrement().primaryKey(),
  formulaId: int("formulaId").notNull(),
  ingredientId: int("ingredientId").notNull(),
  weight: decimal("weight", { precision: 12, scale: 3 }).notNull(),
  dilutionPercent: decimal("dilutionPercent", { precision: 6, scale: 2 }).default("100"),
  note: varchar("note", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FormulaIngredient = typeof formulaIngredients.$inferSelect;
export type InsertFormulaIngredient = typeof formulaIngredients.$inferInsert;
