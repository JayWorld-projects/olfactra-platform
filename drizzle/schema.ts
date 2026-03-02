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
  manualNotes: text("manualNotes"),
  aiNotes: text("aiNotes"),
  manualNotesUpdatedAt: timestamp("manualNotesUpdatedAt"),
  aiNotesUpdatedAt: timestamp("aiNotesUpdatedAt"),
  lastEditedAt: timestamp("lastEditedAt"),
  lastEditedBySource: varchar("lastEditedBySource", { length: 20 }).default("user"),
  pyramidPosition: varchar("pyramidPosition", { length: 20 }),
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
  aiNotesLastGeneratedAt: timestamp("aiNotesLastGeneratedAt"),
  sourceType: varchar("sourceType", { length: 20 }),
  importedAt: timestamp("importedAt"),
  originalData: text("originalData"),
  parentFormulaId: int("parentFormulaId"),
  productType: varchar("productType", { length: 50 }),
  fragranceLoadPercent: decimal("fragranceLoadPercent", { precision: 6, scale: 2 }),
  batchSize: decimal("batchSize", { precision: 12, scale: 3 }),
  batchSizeUnit: varchar("batchSizeUnit", { length: 10 }),
  mixingProcedure: text("mixingProcedure"),
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
  originalName: varchar("originalName", { length: 255 }),
  matchType: varchar("matchType", { length: 20 }),
  matchConfidence: varchar("matchConfidence", { length: 10 }),
  substitutionReason: text("substitutionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FormulaIngredient = typeof formulaIngredients.$inferSelect;
export type InsertFormulaIngredient = typeof formulaIngredients.$inferInsert;

export const favorites = mysqlTable("favorites", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  ingredientId: int("ingredientId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type Favorite = typeof favorites.$inferSelect;
export type InsertFavorite = typeof favorites.$inferInsert;

export const scentGenerations = mysqlTable("scent_generations", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  concept: text("concept").notNull(),
  selectedTypes: json("selectedTypes").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type ScentGeneration = typeof scentGenerations.$inferSelect;
export type InsertScentGeneration = typeof scentGenerations.$inferInsert;

export const formulaTags = mysqlTable("formula_tags", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).default("#006778"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FormulaTag = typeof formulaTags.$inferSelect;
export type InsertFormulaTag = typeof formulaTags.$inferInsert;

export const formulaTagAssignments = mysqlTable("formula_tag_assignments", {
  id: int("id").autoincrement().primaryKey(),
  formulaId: int("formulaId").notNull(),
  tagId: int("tagId").notNull(),
});

export type FormulaTagAssignment = typeof formulaTagAssignments.$inferSelect;
export type InsertFormulaTagAssignment = typeof formulaTagAssignments.$inferInsert;

export const formulaNotes = mysqlTable("formula_notes", {
  id: int("id").autoincrement().primaryKey(),
  formulaId: int("formulaId").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type FormulaNoteRow = typeof formulaNotes.$inferSelect;
export type InsertFormulaNote = typeof formulaNotes.$inferInsert;

export const workspaces = mysqlTable("workspaces", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Workspace = typeof workspaces.$inferSelect;
export type InsertWorkspace = typeof workspaces.$inferInsert;

export const workspaceIngredients = mysqlTable("workspace_ingredients", {
  id: int("id").autoincrement().primaryKey(),
  workspaceId: int("workspaceId").notNull(),
  ingredientId: int("ingredientId").notNull(),
});

export type WorkspaceIngredient = typeof workspaceIngredients.$inferSelect;
export type InsertWorkspaceIngredient = typeof workspaceIngredients.$inferInsert;

export const ingredientCategories = mysqlTable("ingredient_categories", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  name: varchar("name", { length: 100 }).notNull(),
  color: varchar("color", { length: 20 }).default("#6b7280"),
  sortOrder: int("sortOrder").default(0),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type IngredientCategory = typeof ingredientCategories.$inferSelect;
export type InsertIngredientCategory = typeof ingredientCategories.$inferInsert;

export const ingredientDilutions = mysqlTable("ingredient_dilutions", {
  id: int("id").autoincrement().primaryKey(),
  ingredientId: int("ingredientId").notNull(),
  userId: int("userId").notNull(),
  percentage: decimal("percentage", { precision: 8, scale: 4 }).notNull(),
  solvent: varchar("solvent", { length: 255 }).default("Ethanol"),
  notes: text("notes"),
  dateCreated: timestamp("dateCreated").defaultNow().notNull(),
});

export type IngredientDilution = typeof ingredientDilutions.$inferSelect;
export type InsertIngredientDilution = typeof ingredientDilutions.$inferInsert;

export const formulaVersions = mysqlTable("formula_versions", {
  id: int("id").autoincrement().primaryKey(),
  formulaId: int("formulaId").notNull(),
  versionNumber: int("versionNumber").notNull(),
  label: varchar("label", { length: 255 }),
  snapshot: json("snapshot").notNull(), // { name, description, solvent, solventWeight, ingredients: [{ingredientId, ingredientName, weight, dilutionPercent, note}] }
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type FormulaVersion = typeof formulaVersions.$inferSelect;
export type InsertFormulaVersion = typeof formulaVersions.$inferInsert;
