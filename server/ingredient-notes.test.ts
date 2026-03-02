import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Tests for Upgrade 4: Ingredient Notes (manual + AI), traceability timestamps,
 * and copy-AI-to-manual behavior.
 *
 * These tests mock the database layer to validate procedure logic without
 * requiring a live database connection.
 */

// ─── Mock DB ────────────────────────────────────────────────────────────────
const mockIngredient = {
  id: 1,
  userId: 1,
  name: "Linalool",
  casNumber: "78-70-6",
  supplier: "Firmenich",
  category: "Floral",
  inventoryAmount: "50ml",
  costPerGram: "0.25",
  ifraLimit: "5",
  longevity: 3,
  description: "Fresh floral lavender-like scent",
  manualNotes: null as string | null,
  aiNotes: null as string | null,
  manualNotesUpdatedAt: null as Date | null,
  aiNotesUpdatedAt: null as Date | null,
  lastEditedAt: null as Date | null,
  lastEditedBySource: null as string | null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

let storedIngredient = { ...mockIngredient };
let lastUpdateData: Record<string, unknown> = {};

vi.mock("./db", () => ({
  getIngredient: vi.fn(async (id: number, userId: number) => {
    if (id === storedIngredient.id && userId === storedIngredient.userId) {
      return { ...storedIngredient };
    }
    return undefined;
  }),
  updateIngredient: vi.fn(async (_id: number, _userId: number, data: Record<string, unknown>) => {
    lastUpdateData = data;
    Object.assign(storedIngredient, data);
  }),
  listIngredients: vi.fn(async () => [storedIngredient]),
  createIngredient: vi.fn(async () => 1),
  bulkCreateIngredients: vi.fn(async () => {}),
  deleteIngredient: vi.fn(async () => {}),
  getIngredientCategories: vi.fn(async () => ["Floral"]),
  getIngredientSuppliers: vi.fn(async () => ["Firmenich"]),
  getIngredientUsage: vi.fn(async () => []),
  listFavorites: vi.fn(async () => []),
  addFavorite: vi.fn(async () => {}),
  removeFavorite: vi.fn(async () => {}),
  batchUpdateInventory: vi.fn(async () => {}),
  listFormulas: vi.fn(async () => []),
  getFormula: vi.fn(async () => undefined),
  createFormula: vi.fn(async () => 1),
  updateFormula: vi.fn(async () => {}),
  deleteFormula: vi.fn(async () => {}),
  getFormulaIngredients: vi.fn(async () => []),
  addFormulaIngredient: vi.fn(async () => 1),
  updateFormulaIngredient: vi.fn(async () => {}),
  removeFormulaIngredient: vi.fn(async () => {}),
  cloneFormula: vi.fn(async () => 1),
  saveGeneration: vi.fn(async () => 1),
  listGenerations: vi.fn(async () => []),
  getGeneration: vi.fn(async () => undefined),
  deleteGeneration: vi.fn(async () => {}),
  listTags: vi.fn(async () => []),
  createTag: vi.fn(async () => 1),
  deleteTag: vi.fn(async () => {}),
  getFormulaTags: vi.fn(async () => []),
  assignTag: vi.fn(async () => {}),
  unassignTag: vi.fn(async () => {}),
  listFormulaNotes: vi.fn(async () => []),
  addFormulaNote: vi.fn(async () => 1),
  updateFormulaNote: vi.fn(async () => {}),
  deleteFormulaNote: vi.fn(async () => {}),
  listWorkspacesWithCounts: vi.fn(async () => []),
  getWorkspace: vi.fn(async () => undefined),
  createWorkspace: vi.fn(async () => 1),
  updateWorkspace: vi.fn(async () => {}),
  deleteWorkspace: vi.fn(async () => {}),
  getWorkspaceIngredientIds: vi.fn(async () => []),
  setWorkspaceIngredients: vi.fn(async () => {}),
  createFormulaVersion: vi.fn(async () => 1),
  listFormulaVersions: vi.fn(async () => []),
  getFormulaVersion: vi.fn(async () => undefined),
  revertFormulaToVersion: vi.fn(async () => {}),
  deleteFormulaVersion: vi.fn(async () => {}),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{ message: { content: "## AI Generated Notes\n\nLinalool is a naturally occurring terpene alcohol." } }],
  })),
}));

// ─── Test Context ───────────────────────────────────────────────────────────
function createTestContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-user",
      email: "test@example.com",
      name: "Test User",
      loginMethod: "manus",
      role: "user",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────
describe("ingredient.saveManualNotes", () => {
  beforeEach(() => {
    storedIngredient = { ...mockIngredient };
    lastUpdateData = {};
  });

  it("saves manual notes and sets manualNotesUpdatedAt", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await caller.ingredient.saveManualNotes({
      id: 1,
      manualNotes: "My custom notes about Linalool",
    });

    expect(lastUpdateData.manualNotes).toBe("My custom notes about Linalool");
    expect(lastUpdateData.manualNotesUpdatedAt).toBeInstanceOf(Date);
    expect(lastUpdateData.lastEditedAt).toBeInstanceOf(Date);
    expect(lastUpdateData.lastEditedBySource).toBe("user");
  });

  it("allows saving empty notes to clear them", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await caller.ingredient.saveManualNotes({
      id: 1,
      manualNotes: "",
    });

    expect(lastUpdateData.manualNotes).toBe("");
    expect(lastUpdateData.lastEditedBySource).toBe("user");
  });
});

describe("ingredient.generateAiNotes", () => {
  beforeEach(() => {
    storedIngredient = { ...mockIngredient };
    lastUpdateData = {};
  });

  it("generates AI notes, saves to DB, and returns content", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ingredient.generateAiNotes({
      id: 1,
      ingredientName: "Linalool",
      casNumber: "78-70-6",
    });

    expect(result.content).toContain("AI Generated Notes");
    expect(lastUpdateData.aiNotes).toContain("AI Generated Notes");
    expect(lastUpdateData.aiNotesUpdatedAt).toBeInstanceOf(Date);
    expect(lastUpdateData.lastEditedAt).toBeInstanceOf(Date);
    expect(lastUpdateData.lastEditedBySource).toBe("ai");
  });

  it("does NOT overwrite existing manual notes when generating AI notes", async () => {
    storedIngredient.manualNotes = "My important manual notes";
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await caller.ingredient.generateAiNotes({
      id: 1,
      ingredientName: "Linalool",
    });

    // Manual notes should be untouched — updateIngredient should NOT include manualNotes
    expect(lastUpdateData.manualNotes).toBeUndefined();
    // AI notes should be set
    expect(lastUpdateData.aiNotes).toBeDefined();
  });
});

describe("ingredient.copyAiToManualNotes", () => {
  beforeEach(() => {
    storedIngredient = { ...mockIngredient };
    lastUpdateData = {};
  });

  it("copies AI notes to manual notes when no existing manual notes", async () => {
    storedIngredient.aiNotes = "AI generated content about Linalool";
    storedIngredient.manualNotes = null;
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ingredient.copyAiToManualNotes({ id: 1 });

    expect(result.manualNotes).toContain("AI generated content about Linalool");
    expect(result.manualNotes).toContain("Copied from AI Notes on");
    expect(lastUpdateData.lastEditedBySource).toBe("user");
    expect(lastUpdateData.manualNotesUpdatedAt).toBeInstanceOf(Date);
  });

  it("appends AI notes to existing manual notes with separator", async () => {
    storedIngredient.aiNotes = "New AI content";
    storedIngredient.manualNotes = "Existing manual notes";
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.ingredient.copyAiToManualNotes({ id: 1 });

    expect(result.manualNotes).toContain("Existing manual notes");
    expect(result.manualNotes).toContain("---");
    expect(result.manualNotes).toContain("New AI content");
  });

  it("throws error when no AI notes exist to copy", async () => {
    storedIngredient.aiNotes = null;
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await expect(caller.ingredient.copyAiToManualNotes({ id: 1 })).rejects.toThrow("No AI notes to copy");
  });
});

describe("ingredient.update traceability", () => {
  beforeEach(() => {
    storedIngredient = { ...mockIngredient };
    lastUpdateData = {};
  });

  it("sets lastEditedAt and lastEditedBySource=user on property update", async () => {
    const ctx = createTestContext();
    const caller = appRouter.createCaller(ctx);

    await caller.ingredient.update({
      id: 1,
      name: "Linalool (updated)",
    });

    expect(lastUpdateData.lastEditedAt).toBeInstanceOf(Date);
    expect(lastUpdateData.lastEditedBySource).toBe("user");
    expect(lastUpdateData.name).toBe("Linalool (updated)");
  });
});
