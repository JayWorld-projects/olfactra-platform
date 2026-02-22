import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Mock helpers ───────────────────────────────────────────────────────────

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAuthContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "test-user-import",
    email: "test@example.com",
    name: "Test User",
    loginMethod: "manus",
    role: "user",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

// ─── Mock the LLM ──────────────────────────────────────────────────────────

vi.mock("./_core/llm", () => ({
  invokeLLM: vi.fn().mockResolvedValue({
    choices: [
      {
        message: {
          content: JSON.stringify({
            ingredients: [
              { name: "Bergamot", weight: "2.5", percentage: "10", dilution: null, notes: "top note" },
              { name: "Iso E Super", weight: "3.0", percentage: "12", dilution: "10", notes: null },
              { name: "Ethanol", weight: "20", percentage: null, dilution: null, notes: "solvent" },
            ],
            formulaName: "Test Cologne",
            totalWeight: "25.5",
            solvent: "Ethanol",
            calculationBasis: "weight",
          }),
        },
      },
    ],
  }),
}));

// ─── Mock the DB ────────────────────────────────────────────────────────────

vi.mock("./db", () => ({
  listIngredients: vi.fn().mockResolvedValue([
    { id: 1, name: "Bergamot", casNumber: "8007-75-8", description: "Fresh citrus", category: "Top" },
    { id: 2, name: "Iso E Super", casNumber: "54464-57-2", description: "Woody amber", category: "Base" },
    { id: 3, name: "Linalool", casNumber: "78-70-6", description: "Floral woody", category: "Heart" },
    { id: 4, name: "Hedione", casNumber: "24851-98-7", description: "Jasmine transparent", category: "Heart" },
    { id: 5, name: "Ambroxan", casNumber: "6790-58-5", description: "Amber musky", category: "Base" },
  ]),
  createFormula: vi.fn().mockResolvedValue(42),
  addFormulaIngredient: vi.fn().mockResolvedValue(1),
  createFormulaVersion: vi.fn().mockResolvedValue(1),
}));

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("formulaImport", () => {
  describe("parseText", () => {
    it("parses freeform text into structured ingredients via AI", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.formulaImport.parseText({
        text: "Bergamot 2.5g\nIso E Super 3.0g (10% dilution)\nEthanol 20g (solvent)",
      });

      expect(result.ingredients).toHaveLength(3);
      expect(result.ingredients[0].originalName).toBe("Bergamot");
      expect(result.ingredients[0].weight).toBe("2.5");
      expect(result.formulaName).toBe("Test Cologne");
      expect(result.solvent).toBe("Ethanol");
      expect(result.calculationBasis).toBe("weight");
    });

    it("rejects empty input", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.formulaImport.parseText({ text: "" })
      ).rejects.toThrow();
    });
  });

  describe("parseCSV", () => {
    it("parses CSV text with header row", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const csvText = `Ingredient,Weight,Percentage,Dilution,Notes
Bergamot,2.5,10,,top note
Iso E Super,3.0,12,10,
Linalool,1.0,4,,floral`;

      const result = await caller.formulaImport.parseCSV({ text: csvText });

      expect(result.ingredients).toHaveLength(3);
      expect(result.ingredients[0].originalName).toBe("Bergamot");
      expect(result.ingredients[0].weight).toBe("2.5");
      expect(result.ingredients[0].percentage).toBe("10");
      expect(result.ingredients[0].dilution).toBe(null); // empty field
      expect(result.ingredients[0].notes).toBe("top note");
      expect(result.ingredients[1].dilution).toBe("10");
    });

    it("handles TSV format", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const tsvText = "Name\tWeight\tPercentage\nBergamot\t2.5\t10\nLinalool\t1.0\t4";

      const result = await caller.formulaImport.parseCSV({ text: tsvText });

      expect(result.ingredients).toHaveLength(2);
      expect(result.ingredients[0].originalName).toBe("Bergamot");
    });

    it("returns empty array for header-only CSV", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.formulaImport.parseCSV({ text: "Ingredient,Weight" });

      expect(result.ingredients).toHaveLength(0);
    });
  });

  describe("matchIngredients", () => {
    it("matches exact ingredient names", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.formulaImport.matchIngredients({
        ingredients: [
          { originalName: "Bergamot", weight: "2.5", percentage: null, dilution: null, notes: null },
          { originalName: "Iso E Super", weight: "3.0", percentage: null, dilution: null, notes: null },
        ],
      });

      expect(result.results).toHaveLength(2);
      expect(result.results[0].matchStatus).toBe("exact");
      expect(result.results[0].matchedIngredientId).toBe(1);
      expect(result.results[0].matchedIngredientName).toBe("Bergamot");
      expect(result.results[0].matchConfidence).toBe("high");
    });

    it("matches case-insensitively", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.formulaImport.matchIngredients({
        ingredients: [
          { originalName: "bergamot", weight: "2.5", percentage: null, dilution: null, notes: null },
          { originalName: "ISO E SUPER", weight: "3.0", percentage: null, dilution: null, notes: null },
        ],
      });

      expect(result.results[0].matchStatus).toBe("exact");
      expect(result.results[1].matchStatus).toBe("exact");
    });

    it("reports no match for unknown ingredients", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.formulaImport.matchIngredients({
        ingredients: [
          { originalName: "Galaxolide XYZ-999", weight: "1.0", percentage: null, dilution: null, notes: null },
        ],
      });

      expect(result.results[0].matchStatus).toBe("none");
      expect(result.results[0].matchedIngredientId).toBe(null);
    });

    it("matches by CAS number in the ingredient name", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.formulaImport.matchIngredients({
        ingredients: [
          { originalName: "CAS 8007-75-8", weight: "2.5", percentage: null, dilution: null, notes: null },
        ],
      });

      expect(result.results[0].matchStatus).toBe("exact");
      expect(result.results[0].matchedIngredientName).toBe("Bergamot");
    });
  });

  describe("suggestSubstitutes", () => {
    it("returns substitute suggestions from AI", async () => {
      // Re-mock LLM for this specific test
      const { invokeLLM } = await import("./_core/llm");
      (invokeLLM as any).mockResolvedValueOnce({
        choices: [
          {
            message: {
              content: JSON.stringify({
                suggestions: [
                  {
                    ingredientId: 3,
                    name: "Linalool",
                    confidence: "medium",
                    explanation: "Similar floral character",
                    expectedImpact: "Slightly different top note",
                  },
                ],
                noSubstituteReason: null,
              }),
            },
          },
        ],
      });

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.formulaImport.suggestSubstitutes({
        ingredientName: "Linalyl Acetate",
        ingredientNotes: "floral fruity",
      });

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });
  });

  describe("saveImportedFormula", () => {
    it("saves a formula with import metadata", async () => {
      const { createFormula, addFormulaIngredient } = await import("./db");

      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      const result = await caller.formulaImport.saveImportedFormula({
        name: "Imported Cologne",
        sourceType: "pasted",
        originalData: "Bergamot 2.5g\nIso E Super 3.0g",
        ingredients: [
          {
            ingredientId: 1,
            weight: "2.5",
            originalName: "Bergamot",
            matchType: "exact",
            matchConfidence: "high",
          },
          {
            ingredientId: 2,
            weight: "3.0",
            originalName: "Iso E Super",
            matchType: "exact",
            matchConfidence: "high",
          },
        ],
      });

      expect(result.formulaId).toBe(42);
      expect(result.addedCount).toBe(2);
      expect(createFormula).toHaveBeenCalledWith(
        expect.objectContaining({
          name: "Imported Cologne",
          sourceType: "pasted",
          userId: 1,
        })
      );
      expect(addFormulaIngredient).toHaveBeenCalledTimes(2);
    });

    it("rejects empty formula name", async () => {
      const { ctx } = createAuthContext();
      const caller = appRouter.createCaller(ctx);

      await expect(
        caller.formulaImport.saveImportedFormula({
          name: "",
          sourceType: "csv",
          originalData: "test",
          ingredients: [
            { ingredientId: 1, weight: "1", originalName: "Test", matchType: "exact" },
          ],
        })
      ).rejects.toThrow();
    });
  });
});
