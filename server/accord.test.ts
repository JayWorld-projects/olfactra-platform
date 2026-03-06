import { vi, describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Tests for Accord Builder AI feature:
 * - Accord generation from prompt
 * - Accord save/delete operations
 * - Accord to formula insertion
 */

// ─── Mock Data ─────────────────────────────────────────────────────────────
const mockIngredient = {
  id: 1,
  userId: 1,
  name: "Ambroxan",
  casNumber: "3738-00-9",
  supplier: "Firmenich",
  category: "Amber",
  inventoryAmount: "50ml",
  costPerGram: "1.20",
  ifraLimit: null,
  longevity: 4,
  description: "Warm amber woody scent",
  pyramidPosition: "base",
  manualNotes: null,
  aiNotes: null,
  manualNotesUpdatedAt: null,
  aiNotesUpdatedAt: null,
  lastEditedAt: null,
  lastEditedBySource: null,
  createdAt: new Date("2025-01-01"),
  updatedAt: new Date("2025-01-01"),
};

const mockIngredient2 = {
  ...mockIngredient,
  id: 2,
  name: "Vanillin",
  category: "Gourmand",
  description: "Sweet vanilla scent",
  pyramidPosition: "base",
};

const mockIngredient3 = {
  ...mockIngredient,
  id: 3,
  name: "Labdanum",
  category: "Amber",
  description: "Resinous amber scent",
  pyramidPosition: "base",
};

let mockAccords: Array<{
  id: number;
  userId: number;
  name: string;
  description: string | null;
  scentFamily: string | null;
  estimatedLongevity: string | null;
  explanation: string | null;
  createdAt: Date;
}> = [];

let mockAccordIngredients: Array<{
  id: number;
  accordId: number;
  ingredientId: number;
  percentage: string;
}> = [];

let nextAccordId = 1;
let nextAccordIngId = 1;
let lastCreatedFormulaId = 100;

// ─── Mock DB ───────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getIngredient: vi.fn(async () => mockIngredient),
  updateIngredient: vi.fn(async () => {}),
  listIngredients: vi.fn(async () => [mockIngredient, mockIngredient2, mockIngredient3]),
  createIngredient: vi.fn(async () => 1),
  bulkCreateIngredients: vi.fn(async () => {}),
  deleteIngredient: vi.fn(async () => {}),
  getIngredientCategories: vi.fn(async () => ["Amber", "Gourmand"]),
  getIngredientSuppliers: vi.fn(async () => ["Firmenich"]),
  getIngredientUsage: vi.fn(async () => []),
  listFavorites: vi.fn(async () => []),
  addFavorite: vi.fn(async () => {}),
  removeFavorite: vi.fn(async () => {}),
  batchUpdateInventory: vi.fn(async () => {}),
  listFormulas: vi.fn(async () => []),
  getFormula: vi.fn(async () => undefined),
  createFormula: vi.fn(async () => {
    lastCreatedFormulaId += 1;
    return lastCreatedFormulaId;
  }),
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
  addIngredientDilution: vi.fn(async () => 99),
  updateIngredientDilution: vi.fn(async () => {}),
  deleteIngredientDilution: vi.fn(async () => {}),
  listIngredientCategories: vi.fn(async () => []),
  createIngredientCategory: vi.fn(async () => 1),
  updateIngredientCategory: vi.fn(async () => {}),
  deleteIngredientCategory: vi.fn(async () => {}),
  seedIngredientCategories: vi.fn(async () => 5),
  listAccords: vi.fn(async (userId: number) => {
    return mockAccords
      .filter((a) => a.userId === userId)
      .map((a) => ({
        ...a,
        ingredients: mockAccordIngredients
          .filter((ai) => ai.accordId === a.id)
          .map((ai) => ({
            ...ai,
            ingredientName: ai.ingredientId === 1 ? "Ambroxan" : ai.ingredientId === 2 ? "Vanillin" : "Labdanum",
            ingredientCategory: "Amber",
          })),
      }));
  }),
  getAccord: vi.fn(async (id: number, userId: number) => {
    const accord = mockAccords.find((a) => a.id === id && a.userId === userId);
    if (!accord) return undefined;
    return {
      ...accord,
      ingredients: mockAccordIngredients
        .filter((ai) => ai.accordId === accord.id)
        .map((ai) => ({
          ...ai,
          ingredientName: ai.ingredientId === 1 ? "Ambroxan" : "Vanillin",
          ingredientCategory: "Amber",
        })),
    };
  }),
  saveAccord: vi.fn(async (_userId: number, data: any, ingredientList?: any[]) => {
    const id = nextAccordId++;
    mockAccords.push({
      id,
      userId: _userId,
      name: data.name,
      description: data.description || null,
      scentFamily: data.scentFamily || null,
      estimatedLongevity: data.estimatedLongevity || null,
      explanation: data.explanation || null,
      createdAt: new Date(),
    });
    const ings = ingredientList || data.ingredients || [];
    for (const ing of ings) {
      mockAccordIngredients.push({
        id: nextAccordIngId++,
        accordId: id,
        ingredientId: ing.ingredientId,
        percentage: ing.percentage,
      });
    }
    return id;
  }),
  deleteAccord: vi.fn(async (id: number, userId: number) => {
    mockAccords = mockAccords.filter((a) => !(a.id === id && a.userId === userId));
    mockAccordIngredients = mockAccordIngredients.filter((ai) => ai.accordId !== id);
  }),
}));

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn(async () => ({
    choices: [{
      message: {
        content: JSON.stringify({
          accords: [
            {
              name: "Warm Amber Accord",
              description: "A warm, resinous amber blend",
              scentFamily: "Amber",
              estimatedLongevity: "8-10 hours",
              explanation: "Ambroxan provides warmth while Vanillin adds sweetness.",
              ingredients: [
                { ingredientId: 1, name: "Ambroxan", percentage: "50" },
                { ingredientId: 2, name: "Vanillin", percentage: "30" },
                { ingredientId: 3, name: "Labdanum", percentage: "20" },
              ],
            },
            {
              name: "Deep Amber Accord",
              description: "A deep, rich amber composition",
              scentFamily: "Amber",
              estimatedLongevity: "10-12 hours",
              explanation: "Labdanum leads with resinous depth.",
              ingredients: [
                { ingredientId: 3, name: "Labdanum", percentage: "45" },
                { ingredientId: 1, name: "Ambroxan", percentage: "35" },
                { ingredientId: 2, name: "Vanillin", percentage: "20" },
              ],
            },
          ],
        }),
      },
    }],
  })),
}));

// ─── Test Context ──────────────────────────────────────────────────────────
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

// ─── Tests ─────────────────────────────────────────────────────────────────
describe("accord.generate", () => {
  it("should generate accord variations from a prompt", async () => {
    const result = await caller.accord.generate({
      prompt: "Warm amber accord",
      variationCount: 2,
    });

    expect(result).toBeDefined();
    expect(result.accords).toBeDefined();
    expect(Array.isArray(result.accords)).toBe(true);
    expect(result.accords.length).toBeGreaterThan(0);
  });

  it("should include required fields in each generated accord", async () => {
    const result = await caller.accord.generate({
      prompt: "Warm amber accord",
      variationCount: 2,
    });

    const accord = result.accords[0];
    expect(accord.name).toBeDefined();
    expect(accord.description).toBeDefined();
    expect(accord.scentFamily).toBeDefined();
    expect(accord.estimatedLongevity).toBeDefined();
    expect(accord.explanation).toBeDefined();
    expect(accord.ingredients).toBeDefined();
    expect(accord.ingredients.length).toBeGreaterThan(0);
  });

  it("should include ingredient details in each variation", async () => {
    const result = await caller.accord.generate({
      prompt: "Warm amber accord",
      variationCount: 2,
    });

    const ingredient = result.accords[0].ingredients[0];
    expect(ingredient.ingredientId).toBeDefined();
    expect(ingredient.name).toBeDefined();
    expect(ingredient.percentage).toBeDefined();
  });
});

describe("accord.save", () => {
  beforeEach(() => {
    mockAccords = [];
    mockAccordIngredients = [];
    nextAccordId = 1;
    nextAccordIngId = 1;
  });

  it("should save an accord with ingredients", async () => {
    const result = await caller.accord.save({
      name: "Test Amber Accord",
      description: "A warm amber blend",
      scentFamily: "Amber",
      estimatedLongevity: "8-10 hours",
      explanation: "Ambroxan for warmth, Vanillin for sweetness.",
      ingredients: [
        { ingredientId: 1, percentage: "60" },
        { ingredientId: 2, percentage: "40" },
      ],
    });

    expect(result).toBeDefined();
    // saveAccord returns the id directly
    expect(result).toBe(1);
  });

  it("should persist saved accord in the list", async () => {
    await caller.accord.save({
      name: "Saved Accord",
      ingredients: [{ ingredientId: 1, percentage: "100" }],
    });

    const list = await caller.accord.list();
    expect(list.length).toBe(1);
    expect(list[0].name).toBe("Saved Accord");
    expect(list[0].ingredients.length).toBe(1);
  });
});

describe("accord.delete", () => {
  beforeEach(() => {
    mockAccords = [];
    mockAccordIngredients = [];
    nextAccordId = 1;
    nextAccordIngId = 1;
  });

  it("should delete a saved accord", async () => {
    await caller.accord.save({
      name: "To Delete",
      ingredients: [{ ingredientId: 1, percentage: "100" }],
    });

    const listBefore = await caller.accord.list();
    expect(listBefore.length).toBe(1);

    await caller.accord.delete({ id: 1 });

    const listAfter = await caller.accord.list();
    expect(listAfter.length).toBe(0);
  });
});

describe("accord.sendToFormula", () => {
  it("should create a formula from accord ingredients", async () => {
    const result = await caller.accord.sendToFormula({
      name: "Amber Accord Formula",
      description: "Created from accord",
      ingredients: [
        { ingredientId: 1, percentage: "60" },
        { ingredientId: 2, percentage: "40" },
      ],
      totalWeight: "10",
    });

    expect(result).toBeDefined();
    expect(result.formulaId).toBeDefined();
    expect(typeof result.formulaId).toBe("number");
  });
});
