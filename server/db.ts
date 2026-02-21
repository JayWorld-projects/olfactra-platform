import { eq, and, like, sql, inArray, desc, asc } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  ingredients, InsertIngredient, Ingredient,
  formulas, InsertFormula, Formula,
  formulaIngredients, InsertFormulaIngredient, FormulaIngredient,
  favorites, InsertFavorite, Favorite,
  scentGenerations, InsertScentGeneration, ScentGeneration,
  formulaTags, InsertFormulaTag, FormulaTag,
  formulaTagAssignments, InsertFormulaTagAssignment, FormulaTagAssignment,
  formulaNotes, InsertFormulaNote, FormulaNoteRow,
  workspaces, InsertWorkspace, Workspace,
  workspaceIngredients, InsertWorkspaceIngredient, WorkspaceIngredient,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }
  try {
    const values: InsertUser = { openId: user.openId };
    const updateSet: Record<string, unknown> = {};
    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];
    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };
    textFields.forEach(assignNullable);
    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }
    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }
    await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── Ingredients ─────────────────────────────────────────────────────────────

export async function listIngredients(userId: number, opts?: { search?: string; category?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [eq(ingredients.userId, userId)];
  if (opts?.search) {
    conditions.push(like(ingredients.name, `%${opts.search}%`));
  }
  if (opts?.category) {
    conditions.push(eq(ingredients.category, opts.category));
  }
  return db.select().from(ingredients).where(and(...conditions)).orderBy(asc(ingredients.name));
}

export async function getIngredient(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(ingredients).where(and(eq(ingredients.id, id), eq(ingredients.userId, userId))).limit(1);
  return result[0];
}

export async function createIngredient(data: InsertIngredient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(ingredients).values(data);
  return result[0].insertId;
}

export async function bulkCreateIngredients(data: InsertIngredient[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  if (data.length === 0) return;
  await db.insert(ingredients).values(data);
}

export async function updateIngredient(id: number, userId: number, data: Partial<InsertIngredient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(ingredients).set(data).where(and(eq(ingredients.id, id), eq(ingredients.userId, userId)));
}

export async function deleteIngredient(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(ingredients).where(and(eq(ingredients.id, id), eq(ingredients.userId, userId)));
}

export async function getIngredientCategories(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ category: ingredients.category }).from(ingredients).where(eq(ingredients.userId, userId)).orderBy(asc(ingredients.category));
  return result.map(r => r.category).filter(Boolean) as string[];
}

export async function getIngredientSuppliers(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.selectDistinct({ supplier: ingredients.supplier }).from(ingredients).where(eq(ingredients.userId, userId)).orderBy(asc(ingredients.supplier));
  return result.map(r => r.supplier).filter(Boolean) as string[];
}

// ─── Formulas ────────────────────────────────────────────────────────────────

export async function listFormulas(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(formulas).where(eq(formulas.userId, userId)).orderBy(desc(formulas.updatedAt));
}

export async function getFormula(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(formulas).where(and(eq(formulas.id, id), eq(formulas.userId, userId))).limit(1);
  return result[0];
}

export async function createFormula(data: InsertFormula) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(formulas).values(data);
  return result[0].insertId;
}

export async function updateFormula(id: number, userId: number, data: Partial<InsertFormula>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(formulas).set(data).where(and(eq(formulas.id, id), eq(formulas.userId, userId)));
}

export async function deleteFormula(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(formulaIngredients).where(eq(formulaIngredients.formulaId, id));
  await db.delete(formulas).where(and(eq(formulas.id, id), eq(formulas.userId, userId)));
}

// ─── Formula Ingredients ─────────────────────────────────────────────────────

export async function getFormulaIngredients(formulaId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(formulaIngredients).where(eq(formulaIngredients.formulaId, formulaId));
  if (rows.length === 0) return [];
  const ingredientIds = rows.map(r => r.ingredientId);
  const ingredientRows = await db.select().from(ingredients).where(inArray(ingredients.id, ingredientIds));
  const ingredientMap = new Map(ingredientRows.map(i => [i.id, i]));
  return rows.map(r => ({
    ...r,
    ingredient: ingredientMap.get(r.ingredientId) || null,
  }));
}

export async function addFormulaIngredient(data: InsertFormulaIngredient) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(formulaIngredients).values(data);
  return result[0].insertId;
}

export async function updateFormulaIngredient(id: number, data: Partial<InsertFormulaIngredient>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(formulaIngredients).set(data).where(eq(formulaIngredients.id, id));
}

export async function removeFormulaIngredient(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(formulaIngredients).where(eq(formulaIngredients.id, id));
}

export async function getIngredientUsage(ingredientId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({
    formulaIngredientId: formulaIngredients.id,
    formulaId: formulaIngredients.formulaId,
    weight: formulaIngredients.weight,
    dilutionPercent: formulaIngredients.dilutionPercent,
    formulaName: formulas.name,
    formulaTotalWeight: formulas.totalWeight,
  })
    .from(formulaIngredients)
    .innerJoin(formulas, eq(formulaIngredients.formulaId, formulas.id))
    .where(eq(formulaIngredients.ingredientId, ingredientId))
    .orderBy(desc(formulaIngredients.weight));
  return rows;
}

// ─── Favorites ──────────────────────────────────────────────────────────────

export async function listFavorites(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select().from(favorites).where(eq(favorites.userId, userId));
  return rows.map(r => r.ingredientId);
}

export async function addFavorite(userId: number, ingredientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(favorites).where(and(eq(favorites.userId, userId), eq(favorites.ingredientId, ingredientId))).limit(1);
  if (existing.length > 0) return;
  await db.insert(favorites).values({ userId, ingredientId });
}

export async function removeFavorite(userId: number, ingredientId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(favorites).where(and(eq(favorites.userId, userId), eq(favorites.ingredientId, ingredientId)));
}

// ─── Batch Inventory Update ─────────────────────────────────────────────────

export async function batchUpdateInventory(userId: number, updates: { id: number; inventoryAmount: string }[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  for (const u of updates) {
    await db.update(ingredients).set({ inventoryAmount: u.inventoryAmount }).where(and(eq(ingredients.id, u.id), eq(ingredients.userId, userId)));
  }
}

// ─── Scent Generations ────────────────────────────────────────────────────

export async function saveGeneration(data: { userId: number; concept: string; selectedTypes: string[]; content: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(scentGenerations).values({
    userId: data.userId,
    concept: data.concept,
    selectedTypes: data.selectedTypes,
    content: data.content,
  });
  return result[0].insertId;
}

export async function listGenerations(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(scentGenerations).where(eq(scentGenerations.userId, userId)).orderBy(desc(scentGenerations.createdAt));
}

export async function getGeneration(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(scentGenerations).where(and(eq(scentGenerations.id, id), eq(scentGenerations.userId, userId))).limit(1);
  return result[0];
}

export async function deleteGeneration(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(scentGenerations).where(and(eq(scentGenerations.id, id), eq(scentGenerations.userId, userId)));
}

// ─── Formula Tags ──────────────────────────────────────────────────────────

export async function listTags(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(formulaTags).where(eq(formulaTags.userId, userId)).orderBy(asc(formulaTags.name));
}

export async function createTag(data: InsertFormulaTag) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(formulaTags).values(data);
  return result[0].insertId;
}

export async function deleteTag(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(formulaTagAssignments).where(eq(formulaTagAssignments.tagId, id));
  await db.delete(formulaTags).where(and(eq(formulaTags.id, id), eq(formulaTags.userId, userId)));
}

export async function getFormulaTags(formulaId: number) {
  const db = await getDb();
  if (!db) return [];
  const assignments = await db.select().from(formulaTagAssignments).where(eq(formulaTagAssignments.formulaId, formulaId));
  if (assignments.length === 0) return [];
  const tagIds = assignments.map(a => a.tagId);
  return db.select().from(formulaTags).where(inArray(formulaTags.id, tagIds));
}

export async function assignTag(formulaId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const existing = await db.select().from(formulaTagAssignments).where(and(eq(formulaTagAssignments.formulaId, formulaId), eq(formulaTagAssignments.tagId, tagId))).limit(1);
  if (existing.length > 0) return;
  await db.insert(formulaTagAssignments).values({ formulaId, tagId });
}

export async function unassignTag(formulaId: number, tagId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(formulaTagAssignments).where(and(eq(formulaTagAssignments.formulaId, formulaId), eq(formulaTagAssignments.tagId, tagId)));
}

// ─── Formula Notes ─────────────────────────────────────────────────────────

export async function listFormulaNotes(formulaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(formulaNotes).where(eq(formulaNotes.formulaId, formulaId)).orderBy(desc(formulaNotes.createdAt));
}

export async function addFormulaNote(data: InsertFormulaNote) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(formulaNotes).values(data);
  return result[0].insertId;
}

export async function updateFormulaNote(id: number, content: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(formulaNotes).set({ content }).where(eq(formulaNotes.id, id));
}

export async function deleteFormulaNote(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.delete(formulaNotes).where(eq(formulaNotes.id, id));
}

// ─── Workspaces ───────────────────────────────────────────────────────────

export async function listWorkspaces(userId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(workspaces).where(eq(workspaces.userId, userId)).orderBy(asc(workspaces.name));
}

export async function getWorkspace(id: number, userId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(workspaces).where(and(eq(workspaces.id, id), eq(workspaces.userId, userId))).limit(1);
  return result[0];
}

export async function createWorkspace(data: InsertWorkspace) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(workspaces).values(data);
  return result[0].insertId;
}

export async function updateWorkspace(id: number, userId: number, data: { name?: string; description?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(workspaces).set(data).where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)));
}

export async function deleteWorkspace(id: number, userId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Delete all workspace ingredient associations first
  await db.delete(workspaceIngredients).where(eq(workspaceIngredients.workspaceId, id));
  await db.delete(workspaces).where(and(eq(workspaces.id, id), eq(workspaces.userId, userId)));
}

export async function getWorkspaceIngredientIds(workspaceId: number) {
  const db = await getDb();
  if (!db) return [];
  const rows = await db.select({ ingredientId: workspaceIngredients.ingredientId })
    .from(workspaceIngredients)
    .where(eq(workspaceIngredients.workspaceId, workspaceId));
  return rows.map(r => r.ingredientId);
}

export async function setWorkspaceIngredients(workspaceId: number, ingredientIds: number[]) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  // Clear existing associations
  await db.delete(workspaceIngredients).where(eq(workspaceIngredients.workspaceId, workspaceId));
  // Insert new associations
  if (ingredientIds.length > 0) {
    const values = ingredientIds.map(ingredientId => ({ workspaceId, ingredientId }));
    await db.insert(workspaceIngredients).values(values);
  }
}

export async function getWorkspaceIngredientCount(workspaceId: number) {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({ count: sql<number>`COUNT(*)` })
    .from(workspaceIngredients)
    .where(eq(workspaceIngredients.workspaceId, workspaceId));
  return result[0]?.count ?? 0;
}

export async function listWorkspacesWithCounts(userId: number) {
  const db = await getDb();
  if (!db) return [];
  const ws = await db.select().from(workspaces).where(eq(workspaces.userId, userId)).orderBy(asc(workspaces.name));
  const result = [];
  for (const w of ws) {
    const count = await getWorkspaceIngredientCount(w.id);
    result.push({ ...w, ingredientCount: count });
  }
  return result;
}

// ─── Clone Formula ─────────────────────────────────────────────────────────

export async function cloneFormula(formulaId: number, userId: number, newName: string) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const original = await getFormula(formulaId, userId);
  if (!original) throw new Error("Formula not found");
  const newId = await createFormula({
    name: newName,
    description: original.description ? `Cloned from "${original.name}". ${original.description}` : `Cloned from "${original.name}"`,
    userId,
    solvent: original.solvent,
    solventWeight: original.solventWeight,
    totalWeight: original.totalWeight,
    status: "draft",
  });
  const originalIngredients = await getFormulaIngredients(formulaId);
  for (const fi of originalIngredients) {
    await addFormulaIngredient({
      formulaId: newId,
      ingredientId: fi.ingredientId,
      weight: fi.weight,
      dilutionPercent: fi.dilutionPercent,
      note: fi.note,
    });
  }
  return newId;
}
