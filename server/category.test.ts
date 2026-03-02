import { describe, it, expect, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Tests for Category Manager: CRUD operations, seed, rename propagation.
 */

// ─── Mock Data ─────────────────────────────────────────────────────────────
let mockCategories: Array<{
  id: number;
  userId: number;
  name: string;
  color: string | null;
  sortOrder: number | null;
  createdAt: Date;
}> = [];
let nextCategoryId = 1;
let renamedIngredients: Array<{ userId: number; oldName: string; newName: string }> = [];

vi.mock("./db", () => ({
  // Category functions
  listIngredientCategories: vi.fn(async (userId: number) =>
    mockCategories.filter(c => c.userId === userId).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0))
  ),
  createIngredientCategory: vi.fn(async (data: any) => {
    const id = nextCategoryId++;
    mockCategories.push({
      id,
      userId: data.userId,
      name: data.name,
      color: data.color || null,
      sortOrder: data.sortOrder ?? null,
      createdAt: new Date(),
    });
    return id;
  }),
  updateIngredientCategory: vi.fn(async (id: number, userId: number, data: any) => {
    const cat = mockCategories.find(c => c.id === id && c.userId === userId);
    if (cat) Object.assign(cat, data);
  }),
  deleteIngredientCategory: vi.fn(async (id: number, userId: number) => {
    mockCategories = mockCategories.filter(c => !(c.id === id && c.userId === userId));
  }),
  renameIngredientCategory: vi.fn(async (userId: number, oldName: string, newName: string) => {
    renamedIngredients.push({ userId, oldName, newName });
  }),
  getIngredientCountByCategory: vi.fn(async () => [
    { category: "Floral", count: 15 },
    { category: "Woody", count: 8 },
    { category: "Citrus", count: 12 },
  ]),

  // Stub all other db functions to prevent import errors
  getIngredient: vi.fn(async () => undefined),
  updateIngredient: vi.fn(async () => {}),
  listIngredients: vi.fn(async () => []),
  createIngredient: vi.fn(async () => 1),
  bulkCreateIngredients: vi.fn(async () => {}),
  deleteIngredient: vi.fn(async () => {}),
  getIngredientCategories: vi.fn(async () => []),
  getIngredientSuppliers: vi.fn(async () => []),
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
  listIngredientDilutions: vi.fn(async () => []),
  addIngredientDilution: vi.fn(async () => 1),
  updateIngredientDilution: vi.fn(async () => {}),
  deleteIngredientDilution: vi.fn(async () => {}),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{ message: { content: "mock" } }],
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

const caller = appRouter.createCaller(createTestContext());

// ─── Tests ──────────────────────────────────────────────────────────────────
describe("category.create", () => {
  beforeEach(() => {
    mockCategories = [];
    nextCategoryId = 1;
    renamedIngredients = [];
  });

  it("creates a new category with name and color", async () => {
    const result = await caller.category.create({ name: "Floral", color: "#f472b6" });
    expect(result.id).toBe(1);
    expect(mockCategories).toHaveLength(1);
    expect(mockCategories[0].name).toBe("Floral");
    expect(mockCategories[0].color).toBe("#f472b6");
  });

  it("creates a category with default color when none provided", async () => {
    const result = await caller.category.create({ name: "Woody" });
    expect(result.id).toBe(1);
    expect(mockCategories[0].name).toBe("Woody");
  });
});

describe("category.list", () => {
  beforeEach(() => {
    mockCategories = [
      { id: 1, userId: 1, name: "Floral", color: "#f472b6", sortOrder: 0, createdAt: new Date() },
      { id: 2, userId: 1, name: "Woody", color: "#a16207", sortOrder: 1, createdAt: new Date() },
    ];
  });

  it("returns all categories for the user", async () => {
    const result = await caller.category.list();
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Floral");
    expect(result[1].name).toBe("Woody");
  });
});

describe("category.rename", () => {
  beforeEach(() => {
    mockCategories = [
      { id: 1, userId: 1, name: "Floral", color: "#f472b6", sortOrder: 0, createdAt: new Date() },
    ];
    renamedIngredients = [];
  });

  it("renames a category and propagates to ingredients", async () => {
    const result = await caller.category.rename({ id: 1, oldName: "Floral", newName: "Floral Notes" });
    expect(result.success).toBe(true);
    expect(mockCategories[0].name).toBe("Floral Notes");
    expect(renamedIngredients).toHaveLength(1);
    expect(renamedIngredients[0]).toEqual({ userId: 1, oldName: "Floral", newName: "Floral Notes" });
  });
});

describe("category.update (color)", () => {
  beforeEach(() => {
    mockCategories = [
      { id: 1, userId: 1, name: "Floral", color: "#f472b6", sortOrder: 0, createdAt: new Date() },
    ];
  });

  it("updates category color", async () => {
    const result = await caller.category.update({ id: 1, color: "#ef4444" });
    expect(result.success).toBe(true);
    expect(mockCategories[0].color).toBe("#ef4444");
  });
});

describe("category.delete", () => {
  beforeEach(() => {
    mockCategories = [
      { id: 1, userId: 1, name: "Floral", color: "#f472b6", sortOrder: 0, createdAt: new Date() },
      { id: 2, userId: 1, name: "Woody", color: "#a16207", sortOrder: 1, createdAt: new Date() },
    ];
  });

  it("deletes a category", async () => {
    const result = await caller.category.delete({ id: 1 });
    expect(result.success).toBe(true);
    expect(mockCategories).toHaveLength(1);
    expect(mockCategories[0].name).toBe("Woody");
  });
});

describe("category.seed", () => {
  beforeEach(() => {
    mockCategories = [];
    nextCategoryId = 1;
  });

  it("seeds categories from existing ingredient data when empty", async () => {
    const result = await caller.category.seed();
    expect(result.seeded).toBeGreaterThan(0);
    expect(mockCategories.length).toBeGreaterThan(0);
    // Should include at least the categories from getIngredientCountByCategory mock
    const names = mockCategories.map(c => c.name);
    expect(names).toContain("Floral");
    expect(names).toContain("Woody");
    expect(names).toContain("Citrus");
  });

  it("does not re-seed when categories already exist", async () => {
    mockCategories = [
      { id: 1, userId: 1, name: "Floral", color: "#f472b6", sortOrder: 0, createdAt: new Date() },
    ];
    const result = await caller.category.seed();
    expect(result.seeded).toBe(0);
    expect(result.message).toBe("Categories already exist");
  });
});

describe("category.counts", () => {
  it("returns ingredient counts per category", async () => {
    const result = await caller.category.counts();
    expect(result).toHaveLength(3);
    expect(result.find((c: any) => c.category === "Floral")?.count).toBe(15);
  });
});
