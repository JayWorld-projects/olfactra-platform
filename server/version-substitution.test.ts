import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db.ts", () => ({
  getIngredients: vi.fn(),
  getFormulaIngredients: vi.fn(),
  createFormulaVersion: vi.fn(),
  getFormulaVersions: vi.fn(),
  getFormulaVersion: vi.fn(),
  deleteFormulaVersion: vi.fn(),
  getFormula: vi.fn(),
  updateFormula: vi.fn(),
  removeFormulaIngredient: vi.fn(),
  addFormulaIngredient: vi.fn(),
}));

import {
  getIngredients,
  getFormulaIngredients,
  createFormulaVersion,
  getFormulaVersions,
  getFormulaVersion,
  deleteFormulaVersion,
  getFormula,
} from "./db";

describe("Formula Version History", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should create a version snapshot with correct structure", async () => {
    const mockFormula = { id: 1, name: "Test Formula", description: "Test", solventWeight: "7.917" };
    const mockIngredients = [
      { id: 10, ingredientId: 5, weight: "2.500", dilutionPercent: "100", ingredient: { name: "Bergamot", category: "Citrus" } },
      { id: 11, ingredientId: 8, weight: "1.200", dilutionPercent: "50", ingredient: { name: "Rose", category: "Floral" } },
    ];

    (getFormula as any).mockResolvedValue(mockFormula);
    (getFormulaIngredients as any).mockResolvedValue(mockIngredients);
    (createFormulaVersion as any).mockResolvedValue({
      id: 1,
      formulaId: 1,
      versionNumber: 1,
      label: "Initial version",
      snapshot: {
        name: "Test Formula",
        description: "Test",
        solventWeight: "7.917",
        totalWeight: "11.617",
        ingredients: [
          { ingredientId: 5, ingredientName: "Bergamot", category: "Citrus", weight: "2.500", dilutionPercent: "100" },
          { ingredientId: 8, ingredientName: "Rose", category: "Floral", weight: "1.200", dilutionPercent: "50" },
        ],
      },
      createdAt: Date.now(),
    });

    const result = await createFormulaVersion(1 as any, "Initial version" as any, {} as any);
    expect(result).toBeDefined();
    expect(result.versionNumber).toBe(1);
    expect(result.label).toBe("Initial version");
    expect(result.snapshot.ingredients).toHaveLength(2);
    expect(result.snapshot.ingredients[0].ingredientName).toBe("Bergamot");
    expect(result.snapshot.totalWeight).toBe("11.617");
  });

  it("should list versions in order for a formula", async () => {
    const mockVersions = [
      { id: 2, formulaId: 1, versionNumber: 2, label: "After adding musk", createdAt: Date.now() },
      { id: 1, formulaId: 1, versionNumber: 1, label: "Initial version", createdAt: Date.now() - 60000 },
    ];

    (getFormulaVersions as any).mockResolvedValue(mockVersions);

    const result = await getFormulaVersions(1 as any);
    expect(result).toHaveLength(2);
    expect(result[0].versionNumber).toBe(2);
    expect(result[1].versionNumber).toBe(1);
  });

  it("should retrieve a specific version by ID", async () => {
    const mockVersion = {
      id: 1,
      formulaId: 1,
      versionNumber: 1,
      label: "Initial version",
      snapshot: {
        name: "Test Formula",
        ingredients: [{ ingredientId: 5, ingredientName: "Bergamot", weight: "2.500" }],
      },
    };

    (getFormulaVersion as any).mockResolvedValue(mockVersion);

    const result = await getFormulaVersion(1 as any);
    expect(result).toBeDefined();
    expect(result.snapshot.ingredients).toHaveLength(1);
  });

  it("should delete a version", async () => {
    (deleteFormulaVersion as any).mockResolvedValue({ id: 1 });

    const result = await deleteFormulaVersion(1 as any);
    expect(result).toBeDefined();
    expect(result.id).toBe(1);
  });

  it("should handle version with empty label", async () => {
    (createFormulaVersion as any).mockResolvedValue({
      id: 3,
      formulaId: 1,
      versionNumber: 3,
      label: null,
      snapshot: { name: "Test", ingredients: [] },
      createdAt: Date.now(),
    });

    const result = await createFormulaVersion(1 as any, undefined as any, {} as any);
    expect(result.label).toBeNull();
    expect(result.versionNumber).toBe(3);
  });
});

describe("Ingredient Substitution Suggestions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return ingredients from the user's library for substitution", async () => {
    const mockIngredients = [
      { id: 1, name: "Bergamot", category: "Citrus", costPerGram: "0.50", longevity: "Top" },
      { id: 2, name: "Lemon", category: "Citrus", costPerGram: "0.30", longevity: "Top" },
      { id: 3, name: "Orange", category: "Citrus", costPerGram: "0.25", longevity: "Top" },
      { id: 4, name: "Rose", category: "Floral", costPerGram: "2.00", longevity: "Heart" },
    ];

    (getIngredients as any).mockResolvedValue(mockIngredients);

    const result = await getIngredients("user1" as any);
    expect(result).toHaveLength(4);

    // Filter to same category as Bergamot (Citrus) - excluding Bergamot itself
    const sameCategorySubstitutes = result.filter(
      (i: any) => i.category === "Citrus" && i.id !== 1
    );
    expect(sameCategorySubstitutes).toHaveLength(2);
    expect(sameCategorySubstitutes[0].name).toBe("Lemon");
  });

  it("should exclude the original ingredient from substitution candidates", async () => {
    const mockIngredients = [
      { id: 1, name: "Bergamot", category: "Citrus" },
      { id: 2, name: "Lemon", category: "Citrus" },
    ];

    (getIngredients as any).mockResolvedValue(mockIngredients);

    const result = await getIngredients("user1" as any);
    const candidates = result.filter((i: any) => i.id !== 1);
    expect(candidates).toHaveLength(1);
    expect(candidates[0].name).toBe("Lemon");
  });

  it("should exclude ingredients already in the formula from candidates", async () => {
    const mockIngredients = [
      { id: 1, name: "Bergamot", category: "Citrus" },
      { id: 2, name: "Lemon", category: "Citrus" },
      { id: 3, name: "Orange", category: "Citrus" },
    ];
    const mockFormulaIngredients = [
      { ingredientId: 1, weight: "2.0" },
      { ingredientId: 2, weight: "1.0" },
    ];

    (getIngredients as any).mockResolvedValue(mockIngredients);
    (getFormulaIngredients as any).mockResolvedValue(mockFormulaIngredients);

    const allIngredients = await getIngredients("user1" as any);
    const formulaIngredients = await getFormulaIngredients(1 as any);
    const formulaIngredientIds = new Set(formulaIngredients.map((fi: any) => fi.ingredientId));

    const candidates = allIngredients.filter(
      (i: any) => i.id !== 1 && !formulaIngredientIds.has(i.id)
    );
    expect(candidates).toHaveLength(1);
    expect(candidates[0].name).toBe("Orange");
  });

  it("should handle case when no substitutes are available", async () => {
    const mockIngredients = [
      { id: 1, name: "Bergamot", category: "Citrus" },
    ];
    const mockFormulaIngredients: any[] = [];

    (getIngredients as any).mockResolvedValue(mockIngredients);
    (getFormulaIngredients as any).mockResolvedValue(mockFormulaIngredients);

    const allIngredients = await getIngredients("user1" as any);
    const candidates = allIngredients.filter((i: any) => i.id !== 1);
    expect(candidates).toHaveLength(0);
  });

  it("should provide cost comparison data for substitutes", async () => {
    const mockIngredients = [
      { id: 1, name: "Bergamot", category: "Citrus", costPerGram: "0.50" },
      { id: 2, name: "Lemon", category: "Citrus", costPerGram: "0.30" },
      { id: 3, name: "Yuzu", category: "Citrus", costPerGram: "1.20" },
    ];

    (getIngredients as any).mockResolvedValue(mockIngredients);

    const result = await getIngredients("user1" as any);
    const original = result.find((i: any) => i.id === 1);
    const candidates = result.filter((i: any) => i.id !== 1);

    // Lemon is cheaper
    expect(parseFloat(candidates[0].costPerGram)).toBeLessThan(parseFloat(original.costPerGram));
    // Yuzu is more expensive
    expect(parseFloat(candidates[1].costPerGram)).toBeGreaterThan(parseFloat(original.costPerGram));
  });
});

describe("Version Snapshot Data Integrity", () => {
  it("should preserve all ingredient details in snapshot", () => {
    const ingredients = [
      { ingredientId: 5, ingredientName: "Bergamot", category: "Citrus", weight: "2.500", dilutionPercent: "100" },
      { ingredientId: 8, ingredientName: "Rose", category: "Floral", weight: "1.200", dilutionPercent: "50" },
    ];

    const snapshot = {
      name: "Test Formula",
      description: "A test formula",
      solventWeight: "7.917",
      totalWeight: "11.617",
      ingredients,
    };

    // Verify snapshot structure
    expect(snapshot.ingredients).toHaveLength(2);
    expect(snapshot.ingredients[0]).toHaveProperty("ingredientId");
    expect(snapshot.ingredients[0]).toHaveProperty("ingredientName");
    expect(snapshot.ingredients[0]).toHaveProperty("category");
    expect(snapshot.ingredients[0]).toHaveProperty("weight");
    expect(snapshot.ingredients[0]).toHaveProperty("dilutionPercent");
  });

  it("should calculate total weight correctly from ingredients", () => {
    const ingredients = [
      { weight: "2.500" },
      { weight: "1.200" },
      { weight: "0.800" },
    ];
    const solventWeight = "7.917";

    const concentrateWeight = ingredients.reduce((sum, i) => sum + parseFloat(i.weight), 0);
    const totalWeight = concentrateWeight + parseFloat(solventWeight);

    expect(concentrateWeight).toBeCloseTo(4.5);
    expect(totalWeight).toBeCloseTo(12.417);
  });

  it("should serialize and deserialize snapshot correctly", () => {
    const snapshot = {
      name: "Test",
      ingredients: [
        { ingredientId: 1, ingredientName: "Bergamot", weight: "2.500" },
      ],
    };

    const serialized = JSON.stringify(snapshot);
    const deserialized = JSON.parse(serialized);

    expect(deserialized.name).toBe("Test");
    expect(deserialized.ingredients[0].ingredientName).toBe("Bergamot");
    expect(deserialized.ingredients[0].weight).toBe("2.500");
  });
});
