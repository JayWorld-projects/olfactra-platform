import { vi, describe, it, expect, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

/**
 * Tests for Accord ingredient editing features:
 * - suggestSwap: AI-powered ingredient substitution within accords
 * - sendToFormula: Verify edited percentages flow through correctly
 * - save: Verify edited ingredients persist when saved
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
  costPerGram: "0.50",
  description: "Sweet vanilla scent",
};

const mockIngredient3 = {
  ...mockIngredient,
  id: 3,
  name: "Labdanum",
  category: "Amber",
  costPerGram: "2.00",
  description: "Resinous amber scent",
};

const mockIngredient4 = {
  ...mockIngredient,
  id: 4,
  name: "Cashmeran",
  category: "Woody",
  costPerGram: "1.50",
  description: "Soft musky woody scent",
};

const mockIngredient5 = {
  ...mockIngredient,
  id: 5,
  name: "Benzoin Siam",
  category: "Balsamic",
  costPerGram: "0.80",
  description: "Sweet balsamic resin",
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
let lastFormulaIngredients: Array<{ formulaId: number; ingredientId: number; weight: string }> = [];

// Track which LLM call we're on (generate vs suggestSwap)
let llmCallCount = 0;

// ─── Mock DB ───────────────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getIngredient: vi.fn(async () => mockIngredient),
  updateIngredient: vi.fn(async () => {}),
  listIngredients: vi.fn(async () => [
    mockIngredient,
    mockIngredient2,
    mockIngredient3,
    mockIngredient4,
    mockIngredient5,
  ]),
  createIngredient: vi.fn(async () => 1),
  bulkCreateIngredients: vi.fn(async () => {}),
  deleteIngredient: vi.fn(async () => {}),
  getIngredientCategories: vi.fn(async () => ["Amber", "Gourmand", "Woody", "Balsamic"]),
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
  addFormulaIngredient: vi.fn(async (data: any) => {
    lastFormulaIngredients.push({
      formulaId: data.formulaId,
      ingredientId: data.ingredientId,
      weight: data.weight,
    });
    return 1;
  }),
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
          .map((ai) => {
            const ing = [mockIngredient, mockIngredient2, mockIngredient3, mockIngredient4, mockIngredient5]
              .find((i) => i.id === ai.ingredientId);
            return {
              ...ai,
              ingredientName: ing?.name || `Ingredient #${ai.ingredientId}`,
              ingredientCategory: ing?.category || "Unknown",
            };
          }),
      }));
  }),
  getAccord: vi.fn(async (id: number, userId: number) => {
    const accord = mockAccords.find((a) => a.id === id && a.userId === userId);
    if (!accord) return undefined;
    return {
      ...accord,
      ingredients: mockAccordIngredients
        .filter((ai) => ai.accordId === accord.id)
        .map((ai) => {
          const ing = [mockIngredient, mockIngredient2, mockIngredient3].find((i) => i.id === ai.ingredientId);
          return {
            ...ai,
            ingredientName: ing?.name || "Unknown",
            ingredientCategory: ing?.category || "Unknown",
          };
        }),
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
  invokeLLM: vi.fn(async () => {
    llmCallCount++;
    // Return swap suggestions format
    if (llmCallCount > 1) {
      return {
        choices: [{
          message: {
            content: JSON.stringify({
              suggestions: [
                {
                  ingredientId: 4,
                  name: "Cashmeran",
                  similarity: 85,
                  reason: "Cashmeran provides a similar warm, musky quality with woody undertones.",
                  difference: "Slightly more powdery and less resinous than Ambroxan.",
                  costComparison: "similar",
                },
                {
                  ingredientId: 5,
                  name: "Benzoin Siam",
                  similarity: 70,
                  reason: "Benzoin offers balsamic warmth that complements amber accords.",
                  difference: "Sweeter and more resinous, less woody.",
                  costComparison: "cheaper",
                },
              ],
            }),
          },
        }],
      };
    }
    // Return accord generation format
    return {
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
            ],
          }),
        },
      }],
    };
  }),
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

describe("accord.suggestSwap", () => {
  beforeEach(() => {
    llmCallCount = 1; // Set to 1 so next call returns swap suggestions
  });

  it("should return substitution suggestions for an ingredient", async () => {
    const result = await caller.accord.suggestSwap({
      ingredientId: 1,
      ingredientName: "Ambroxan",
      accordIngredientIds: [1, 2, 3],
      accordContext: "Warm amber accord",
    });

    expect(result).toBeDefined();
    expect(result.suggestions).toBeDefined();
    expect(Array.isArray(result.suggestions)).toBe(true);
  });

  it("should include required fields in each suggestion", async () => {
    const result = await caller.accord.suggestSwap({
      ingredientId: 1,
      ingredientName: "Ambroxan",
      accordIngredientIds: [1, 2, 3],
    });

    expect(result.suggestions.length).toBeGreaterThan(0);
    const suggestion = result.suggestions[0];
    expect(suggestion.ingredientId).toBeDefined();
    expect(suggestion.name).toBeDefined();
    expect(suggestion.similarity).toBeDefined();
    expect(suggestion.reason).toBeDefined();
    expect(suggestion.difference).toBeDefined();
    expect(suggestion.costComparison).toBeDefined();
  });

  it("should only return suggestions from user's library (valid IDs)", async () => {
    const result = await caller.accord.suggestSwap({
      ingredientId: 1,
      ingredientName: "Ambroxan",
      accordIngredientIds: [1, 2, 3],
    });

    // All returned suggestion IDs should be from our mock library
    const validIds = [1, 2, 3, 4, 5];
    for (const suggestion of result.suggestions) {
      expect(validIds).toContain(suggestion.ingredientId);
    }
  });

  it("should exclude ingredients already in the accord from suggestions", async () => {
    const result = await caller.accord.suggestSwap({
      ingredientId: 1,
      ingredientName: "Ambroxan",
      accordIngredientIds: [1, 2, 3],
    });

    // Suggestions should not include IDs 1, 2, or 3 (already in accord)
    const accordIds = [1, 2, 3];
    for (const suggestion of result.suggestions) {
      expect(accordIds).not.toContain(suggestion.ingredientId);
    }
  });

  it("should include costComparison as one of the valid values", async () => {
    const result = await caller.accord.suggestSwap({
      ingredientId: 1,
      ingredientName: "Ambroxan",
      accordIngredientIds: [1, 2, 3],
    });

    const validCosts = ["cheaper", "similar", "more expensive"];
    for (const suggestion of result.suggestions) {
      expect(validCosts).toContain(suggestion.costComparison);
    }
  });
});

describe("accord.sendToFormula with edited percentages", () => {
  beforeEach(() => {
    lastFormulaIngredients = [];
    lastCreatedFormulaId = 100;
  });

  it("should correctly calculate weights from edited percentages", async () => {
    // Simulate user editing percentages (originally 50/30/20, now 45.5/22.7/13.6/9.1/9.1 after normalize)
    const result = await caller.accord.sendToFormula({
      name: "Edited Amber Accord",
      description: "Accord with normalized percentages",
      ingredients: [
        { ingredientId: 1, percentage: "45.5" },
        { ingredientId: 2, percentage: "22.7" },
        { ingredientId: 3, percentage: "13.6" },
        { ingredientId: 4, percentage: "9.1" },
        { ingredientId: 5, percentage: "9.1" },
      ],
      totalWeight: "10",
    });

    expect(result.formulaId).toBeDefined();
    expect(typeof result.formulaId).toBe("number");

    // Verify weights were calculated correctly (percentage / 100 * totalWeight)
    expect(lastFormulaIngredients.length).toBe(5);
    expect(lastFormulaIngredients[0].weight).toBe("4.550");
    expect(lastFormulaIngredients[1].weight).toBe("2.270");
    expect(lastFormulaIngredients[2].weight).toBe("1.360");
    expect(lastFormulaIngredients[3].weight).toBe("0.910");
    expect(lastFormulaIngredients[4].weight).toBe("0.910");
  });

  it("should handle swapped ingredient IDs correctly", async () => {
    // Simulate: user swapped ingredient 1 (Ambroxan) for ingredient 4 (Cashmeran)
    const result = await caller.accord.sendToFormula({
      name: "Swapped Accord",
      ingredients: [
        { ingredientId: 4, percentage: "50" },  // was ingredient 1
        { ingredientId: 2, percentage: "30" },
        { ingredientId: 3, percentage: "20" },
      ],
      totalWeight: "10",
    });

    expect(result.formulaId).toBeDefined();
    expect(lastFormulaIngredients[0].ingredientId).toBe(4);
    expect(lastFormulaIngredients[0].weight).toBe("5.000");
  });

  it("should handle decimal percentages from normalization", async () => {
    const result = await caller.accord.sendToFormula({
      name: "Decimal Accord",
      ingredients: [
        { ingredientId: 1, percentage: "33.33" },
        { ingredientId: 2, percentage: "33.33" },
        { ingredientId: 3, percentage: "33.34" },
      ],
      totalWeight: "15",
    });

    expect(result.formulaId).toBeDefined();
    // 33.33/100 * 15 = 4.9995 → toFixed(3) = "5.000" or "4.999" depending on FP
    expect(parseFloat(lastFormulaIngredients[0].weight)).toBeCloseTo(5.0, 2);
    expect(parseFloat(lastFormulaIngredients[1].weight)).toBeCloseTo(5.0, 2);
    expect(parseFloat(lastFormulaIngredients[2].weight)).toBeCloseTo(5.0, 2);
  });
});

describe("accord.save with edited ingredients", () => {
  beforeEach(() => {
    mockAccords = [];
    mockAccordIngredients = [];
    nextAccordId = 1;
    nextAccordIngId = 1;
  });

  it("should save accord with edited (non-round) percentages", async () => {
    const id = await caller.accord.save({
      name: "Edited Accord",
      description: "Accord with normalized percentages",
      scentFamily: "Amber",
      estimatedLongevity: "8-10 hours",
      explanation: "Ambroxan provides warmth.",
      ingredients: [
        { ingredientId: 1, percentage: "45.5" },
        { ingredientId: 2, percentage: "22.7" },
        { ingredientId: 3, percentage: "13.6" },
        { ingredientId: 4, percentage: "9.1" },
        { ingredientId: 5, percentage: "9.1" },
      ],
    });

    expect(id).toBe(1);

    const list = await caller.accord.list();
    expect(list.length).toBe(1);
    expect(list[0].ingredients.length).toBe(5);
    expect(list[0].ingredients[0].percentage).toBe("45.5");
    expect(list[0].ingredients[4].percentage).toBe("9.1");
  });

  it("should save accord with swapped ingredient", async () => {
    // User swapped ingredient 1 for ingredient 4
    const id = await caller.accord.save({
      name: "Swapped Accord",
      ingredients: [
        { ingredientId: 4, percentage: "50" },  // swapped from ingredient 1
        { ingredientId: 2, percentage: "30" },
        { ingredientId: 3, percentage: "20" },
      ],
    });

    expect(id).toBe(1);

    const list = await caller.accord.list();
    expect(list[0].ingredients[0].ingredientId).toBe(4);
    expect(list[0].ingredients[0].ingredientName).toBe("Cashmeran");
  });

  it("should save accord after ingredient removal (fewer ingredients)", async () => {
    // User removed one ingredient, leaving only 2
    const id = await caller.accord.save({
      name: "Reduced Accord",
      ingredients: [
        { ingredientId: 1, percentage: "60" },
        { ingredientId: 2, percentage: "40" },
      ],
    });

    expect(id).toBe(1);

    const list = await caller.accord.list();
    expect(list[0].ingredients.length).toBe(2);
  });
});
