import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

// Mock the database module
vi.mock("./db", () => {
  const mockIngredients = [
    {
      id: 1, userId: 1, name: "Linalool", casNumber: "78-70-6",
      supplier: "Perfumers Apprentice", category: "Floral",
      inventoryAmount: "30ml", costPerGram: "0.500", ifraLimit: "25.000",
      longevity: 2, description: "Fresh floral woody",
      createdAt: new Date(), updatedAt: new Date(),
    },
    {
      id: 2, userId: 1, name: "Vanillin", casNumber: "121-33-5",
      supplier: "Perfumers Apprentice", category: "Gourmand",
      inventoryAmount: "50g", costPerGram: "0.200", ifraLimit: null,
      longevity: 5, description: "Sweet vanilla",
      createdAt: new Date(), updatedAt: new Date(),
    },
    {
      id: 3, userId: 1, name: "Limonene", casNumber: "5989-27-5",
      supplier: "Perfumers Apprentice", category: "Citrus",
      inventoryAmount: "15ml", costPerGram: "0.100", ifraLimit: "10.000",
      longevity: 0, description: "Fresh citrus orange peel",
      createdAt: new Date(), updatedAt: new Date(),
    },
  ];

  const mockFormulas = [
    {
      id: 1, userId: 1, name: "Test Formula", description: "A test",
      solvent: "Ethanol", solventWeight: "80.000", totalWeight: "100.000",
      status: "draft" as const, createdAt: new Date(), updatedAt: new Date(),
    },
  ];

  const mockFormulaIngredients = [
    {
      id: 1, formulaId: 1, ingredientId: 1, weight: "10.000",
      dilutionPercent: "100", note: null, createdAt: new Date(),
      ingredient: mockIngredients[0],
    },
    {
      id: 2, formulaId: 1, ingredientId: 2, weight: "5.000",
      dilutionPercent: "100", note: null, createdAt: new Date(),
      ingredient: mockIngredients[1],
    },
  ];

  let nextIngredientId = 4;
  let nextFormulaId = 2;
  let nextFiId = 3;

  return {
    listIngredients: vi.fn().mockImplementation(async (userId: number, opts?: any) => {
      let results = mockIngredients.filter(i => i.userId === userId);
      if (opts?.search) {
        results = results.filter(i => i.name.toLowerCase().includes(opts.search.toLowerCase()));
      }
      if (opts?.category) {
        results = results.filter(i => i.category === opts.category);
      }
      return results;
    }),
    getIngredient: vi.fn().mockImplementation(async (id: number, userId: number) => {
      return mockIngredients.find(i => i.id === id && i.userId === userId);
    }),
    createIngredient: vi.fn().mockImplementation(async () => nextIngredientId++),
    bulkCreateIngredients: vi.fn().mockResolvedValue(undefined),
    updateIngredient: vi.fn().mockResolvedValue(undefined),
    deleteIngredient: vi.fn().mockResolvedValue(undefined),
    getIngredientCategories: vi.fn().mockImplementation(async () => ["Floral", "Gourmand", "Citrus"]),
    getIngredientSuppliers: vi.fn().mockImplementation(async () => ["Perfumers Apprentice"]),
    getIngredientUsage: vi.fn().mockImplementation(async (ingredientId: number) => {
      return mockFormulaIngredients
        .filter(fi => fi.ingredientId === ingredientId)
        .map(fi => ({
          formulaIngredientId: fi.id,
          formulaId: fi.formulaId,
          weight: fi.weight,
          dilutionPercent: fi.dilutionPercent,
          formulaName: "Test Formula",
          formulaTotalWeight: "100.000",
        }));
    }),
    listFormulas: vi.fn().mockImplementation(async (userId: number) => {
      return mockFormulas.filter(f => f.userId === userId);
    }),
    getFormula: vi.fn().mockImplementation(async (id: number, userId: number) => {
      return mockFormulas.find(f => f.id === id && f.userId === userId);
    }),
    createFormula: vi.fn().mockImplementation(async () => nextFormulaId++),
    updateFormula: vi.fn().mockResolvedValue(undefined),
    deleteFormula: vi.fn().mockResolvedValue(undefined),
    getFormulaIngredients: vi.fn().mockImplementation(async (formulaId: number) => {
      return mockFormulaIngredients.filter(fi => fi.formulaId === formulaId);
    }),
    addFormulaIngredient: vi.fn().mockImplementation(async () => nextFiId++),
    updateFormulaIngredient: vi.fn().mockResolvedValue(undefined),
    removeFormulaIngredient: vi.fn().mockResolvedValue(undefined),
    listFavorites: vi.fn().mockImplementation(async (userId: number) => {
      return userId === 1 ? [1, 3] : [];
    }),
    addFavorite: vi.fn().mockResolvedValue(undefined),
    removeFavorite: vi.fn().mockResolvedValue(undefined),
    batchUpdateInventory: vi.fn().mockResolvedValue(undefined),
    upsertUser: vi.fn().mockResolvedValue(undefined),
    getUserByOpenId: vi.fn().mockResolvedValue(undefined),
    getDb: vi.fn().mockResolvedValue(null),
  };
});

// Mock the LLM module
vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [{ message: { content: "Mock AI response about the ingredient." } }],
  }),
}));

function createAuthContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-123",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

function createUnauthContext(): TrpcContext {
  return {
    user: null,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: vi.fn(),
    } as unknown as TrpcContext["res"],
  };
}

describe("ingredient router", () => {
  it("lists all ingredients for the user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ingredient.list({});
    expect(result).toHaveLength(3);
    expect(result[0].name).toBe("Linalool");
  });

  it("filters ingredients by search term", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ingredient.list({ search: "linalool" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Linalool");
  });

  it("filters ingredients by category", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ingredient.list({ category: "Citrus" });
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Limonene");
  });

  it("gets a single ingredient by id", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ingredient.get({ id: 1 });
    expect(result).toBeDefined();
    expect(result?.name).toBe("Linalool");
    expect(result?.casNumber).toBe("78-70-6");
  });

  it("creates a new ingredient", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ingredient.create({
      name: "Hedione",
      casNumber: "24851-98-7",
      supplier: "Perfumers Apprentice",
      category: "Floral",
      costPerGram: "0.300",
      longevity: 3,
    });
    expect(typeof result).toBe("number");
  });

  it("updates an ingredient", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.ingredient.update({ id: 1, name: "Linalool Updated" });
    // Should not throw
  });

  it("deletes an ingredient", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.ingredient.delete({ id: 1 });
    // Should not throw
  });

  it("gets ingredient categories", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ingredient.categories();
    expect(result).toContain("Floral");
    expect(result).toContain("Gourmand");
    expect(result).toContain("Citrus");
  });

  it("gets ingredient suppliers", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ingredient.suppliers();
    expect(result).toContain("Perfumers Apprentice");
  });

  it("bulk imports ingredients", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ingredient.bulkImport({
      ingredients: [
        { name: "Coumarin", casNumber: "91-64-5", category: "Sweet" },
        { name: "Eugenol", casNumber: "97-53-0", category: "Spicy" },
      ],
    });
    expect(result.count).toBe(2);
  });

  it("gets ingredient usage in formulas", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ingredient.usage({ id: 1 });
    expect(result).toHaveLength(1);
    expect(result[0].formulaName).toBe("Test Formula");
    expect(result[0].weight).toBe("10.000");
  });

  it("fetches AI info for an ingredient", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ingredient.aiInfo({
      ingredientName: "Linalool",
      casNumber: "78-70-6",
    });
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("rejects unauthenticated access to ingredient list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.ingredient.list({})).rejects.toThrow();
  });
});

describe("formula router", () => {
  it("lists all formulas for the user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.formula.list();
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("Test Formula");
  });

  it("gets a formula with ingredients", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.formula.get({ id: 1 });
    expect(result).toBeDefined();
    expect(result?.name).toBe("Test Formula");
    expect(result?.ingredients).toHaveLength(2);
    expect(result?.ingredients[0].ingredient?.name).toBe("Linalool");
  });

  it("creates a new formula", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.formula.create({
      name: "Summer Breeze",
      description: "A fresh citrus floral",
    });
    expect(result.id).toBeDefined();
    expect(typeof result.id).toBe("number");
  });

  it("updates a formula", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.formula.update({
      id: 1,
      name: "Updated Formula",
      solventWeight: "75.000",
      totalWeight: "95.000",
      status: "final",
    });
    // Should not throw
  });

  it("deletes a formula", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.formula.delete({ id: 1 });
    // Should not throw
  });

  it("adds an ingredient to a formula", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.formula.addIngredient({
      formulaId: 1,
      ingredientId: 3,
      weight: "2.500",
      dilutionPercent: "10",
    });
    expect(result.id).toBeDefined();
  });

  it("updates a formula ingredient weight", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.formula.updateIngredient({
      id: 1,
      weight: "12.000",
    });
    // Should not throw
  });

  it("removes an ingredient from a formula", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.formula.removeIngredient({ id: 1 });
    // Should not throw
  });

  it("generates scent concept suggestions", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.formula.scentConcept({
      concept: "A warm summer evening on a Mediterranean terrace with jasmine and sea salt",
    });
    expect(result.content).toBeDefined();
    expect(typeof result.content).toBe("string");
    expect(result.content.length).toBeGreaterThan(0);
  });

  it("rejects unauthenticated access to formula list", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.formula.list()).rejects.toThrow();
  });

  it("validates formula name is required", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.formula.create({ name: "" })).rejects.toThrow();
  });
});

describe("favorites router", () => {
  it("lists favorite ingredient IDs for the user", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    const result = await caller.ingredient.favorites();
    expect(result).toEqual([1, 3]);
  });

  it("adds an ingredient to favorites", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.ingredient.addFavorite({ ingredientId: 2 });
    // Should not throw
  });

  it("removes an ingredient from favorites", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.ingredient.removeFavorite({ ingredientId: 1 });
    // Should not throw
  });

  it("rejects unauthenticated access to favorites", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(caller.ingredient.favorites()).rejects.toThrow();
  });
});

describe("batch inventory update", () => {
  it("updates multiple ingredient inventories at once", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await caller.ingredient.batchUpdateInventory({
      updates: [
        { id: 1, inventoryAmount: "50ml" },
        { id: 2, inventoryAmount: "100g" },
      ],
    });
    // Should not throw
  });

  it("rejects empty batch update", async () => {
    const ctx = createAuthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.ingredient.batchUpdateInventory({ updates: [] })
    ).rejects.toThrow();
  });

  it("rejects unauthenticated batch update", async () => {
    const ctx = createUnauthContext();
    const caller = appRouter.createCaller(ctx);
    await expect(
      caller.ingredient.batchUpdateInventory({
        updates: [{ id: 1, inventoryAmount: "50ml" }],
      })
    ).rejects.toThrow();
  });
});

describe("shared perfumery constants", () => {
  it("has correct longevity labels", async () => {
    const { LONGEVITY_LABELS } = await import("@shared/perfumery");
    expect(LONGEVITY_LABELS[0]).toBe("Extremely Volatile");
    expect(LONGEVITY_LABELS[5]).toBe("Base Note");
    expect(Object.keys(LONGEVITY_LABELS)).toHaveLength(6);
  });

  it("has correct longevity colors", async () => {
    const { LONGEVITY_COLORS } = await import("@shared/perfumery");
    expect(Object.keys(LONGEVITY_COLORS)).toHaveLength(6);
    Object.values(LONGEVITY_COLORS).forEach(color => {
      expect(color).toMatch(/^#[0-9a-f]{6}$/);
    });
  });

  it("has category colors for common categories", async () => {
    const { CATEGORY_COLORS } = await import("@shared/perfumery");
    expect(CATEGORY_COLORS["Floral"]).toBeDefined();
    expect(CATEGORY_COLORS["Woody"]).toBeDefined();
    expect(CATEGORY_COLORS["Citrus"]).toBeDefined();
    expect(CATEGORY_COLORS["Gourmand"]).toBeDefined();
  });
});
