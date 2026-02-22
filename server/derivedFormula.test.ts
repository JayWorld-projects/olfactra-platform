import { describe, expect, it, vi, beforeEach } from "vitest";
import { calculateDerivedFormula, PRODUCT_TYPES } from "./derivedFormula";

// ─── Unit tests for calculateDerivedFormula ─────────────────────────────────

describe("calculateDerivedFormula", () => {
  const mockIngredients = [
    {
      ingredientId: 1,
      weight: "5.000",
      dilutionPercent: "100",
      note: null,
      ingredient: { name: "Bergamot", category: "Citrus" },
    },
    {
      ingredientId: 2,
      weight: "3.000",
      dilutionPercent: "10",
      note: null,
      ingredient: { name: "Iso E Super", category: "Woody" },
    },
    {
      ingredientId: 3,
      weight: "2.000",
      dilutionPercent: "100",
      note: null,
      ingredient: { name: "Linalool", category: "Floral" },
    },
  ];

  it("calculates correct fragrance and carrier masses for EDP", () => {
    const result = calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "edp",
      batchSizeValue: 100,
      batchSizeUnit: "g",
      fragranceLoadPercent: 20,
    });

    // 100g batch at 20% load = 20g fragrance, 80g carrier
    expect(result.fragranceMass).toBeCloseTo(20, 2);
    expect(result.carrierMass).toBeCloseTo(80, 2);
    expect(result.batchSizeGrams).toBe(100);
  });

  it("scales ingredients proportionally to fragrance mass", () => {
    const result = calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "edp",
      batchSizeValue: 100,
      batchSizeUnit: "g",
      fragranceLoadPercent: 20,
    });

    // Parent total = 5 + 3 + 2 = 10g
    // Scale factor = 20 / 10 = 2
    expect(result.scaleFactor).toBeCloseTo(2, 4);
    expect(result.scaledIngredients[0].scaledWeight).toBeCloseTo(10, 2); // 5 * 2
    expect(result.scaledIngredients[1].scaledWeight).toBeCloseTo(6, 2);  // 3 * 2
    expect(result.scaledIngredients[2].scaledWeight).toBeCloseTo(4, 2);  // 2 * 2
  });

  it("preserves ingredient metadata in scaled output", () => {
    const result = calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "edp",
      batchSizeValue: 50,
      batchSizeUnit: "g",
      fragranceLoadPercent: 15,
    });

    expect(result.scaledIngredients[0].ingredientName).toBe("Bergamot");
    expect(result.scaledIngredients[0].category).toBe("Citrus");
    expect(result.scaledIngredients[1].dilutionPercent).toBe("10");
    expect(result.scaledIngredients[0].originalWeight).toBe(5);
  });

  it("converts ml to grams using product-type density", () => {
    const result = calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "edp",
      batchSizeValue: 100,
      batchSizeUnit: "ml",
      fragranceLoadPercent: 18,
    });

    // EDP carrier density = 0.789 g/ml
    // 100ml * 0.789 = 78.9g batch
    expect(result.batchSizeGrams).toBeCloseTo(78.9, 1);
    expect(result.fragranceMass).toBeCloseTo(78.9 * 0.18, 1);
    expect(result.carrierMass).toBeCloseTo(78.9 * 0.82, 1);
    expect(result.densityNote).toBeDefined();
    expect(result.densityNote).toContain("0.789");
  });

  it("converts oz to grams correctly", () => {
    const result = calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "body_spray",
      batchSizeValue: 1,
      batchSizeUnit: "oz",
      fragranceLoadPercent: 4,
    });

    // 1 oz = 28.3495g
    expect(result.batchSizeGrams).toBeCloseTo(28.3495, 2);
    expect(result.fragranceMass).toBeCloseTo(28.3495 * 0.04, 2);
  });

  it("converts kg to grams correctly", () => {
    const result = calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "room_spray",
      batchSizeValue: 0.5,
      batchSizeUnit: "kg",
      fragranceLoadPercent: 8,
    });

    // 0.5 kg = 500g
    expect(result.batchSizeGrams).toBe(500);
    expect(result.fragranceMass).toBeCloseTo(40, 2);
    expect(result.carrierMass).toBeCloseTo(460, 2);
  });

  it("uses correct carrier for body oil product type", () => {
    const result = calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "body_oil",
      batchSizeValue: 50,
      batchSizeUnit: "g",
      fragranceLoadPercent: 3,
    });

    expect(result.productType.carrier).toContain("Carrier oil");
    expect(result.carrierName).toContain("Carrier oil");
    expect(result.fragranceMass).toBeCloseTo(1.5, 2);
    expect(result.carrierMass).toBeCloseTo(48.5, 2);
  });

  it("uses correct density for body oil ml conversion", () => {
    const result = calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "body_oil",
      batchSizeValue: 100,
      batchSizeUnit: "ml",
      fragranceLoadPercent: 3,
    });

    // Body oil density = 0.92 g/ml
    expect(result.batchSizeGrams).toBeCloseTo(92, 1);
  });

  it("throws error for invalid product type", () => {
    expect(() => calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "invalid_type",
      batchSizeValue: 100,
      batchSizeUnit: "g",
      fragranceLoadPercent: 10,
    })).toThrow("Invalid product type");
  });

  it("throws error when parent has no ingredient weights", () => {
    expect(() => calculateDerivedFormula({
      parentIngredients: [
        { ingredientId: 1, weight: "0", dilutionPercent: "100", note: null, ingredient: { name: "Test", category: "Test" } },
      ],
      productTypeId: "edp",
      batchSizeValue: 100,
      batchSizeUnit: "g",
      fragranceLoadPercent: 20,
    })).toThrow("Parent formula has no ingredient weights");
  });

  it("handles very small fragrance loads (body lotion)", () => {
    const result = calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "lotion",
      batchSizeValue: 200,
      batchSizeUnit: "g",
      fragranceLoadPercent: 1,
    });

    // 200g at 1% = 2g fragrance, 198g carrier
    expect(result.fragranceMass).toBeCloseTo(2, 2);
    expect(result.carrierMass).toBeCloseTo(198, 2);
    // Scale factor = 2 / 10 = 0.2
    expect(result.scaleFactor).toBeCloseTo(0.2, 4);
  });

  it("handles high fragrance loads (reed diffuser)", () => {
    const result = calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "reed_diffuser",
      batchSizeValue: 100,
      batchSizeUnit: "g",
      fragranceLoadPercent: 25,
    });

    expect(result.fragranceMass).toBeCloseTo(25, 2);
    expect(result.carrierMass).toBeCloseTo(75, 2);
    expect(result.productType.carrier).toContain("Diffuser base");
  });

  it("sum of scaled ingredients equals fragrance mass", () => {
    const result = calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "edt",
      batchSizeValue: 50,
      batchSizeUnit: "g",
      fragranceLoadPercent: 10,
    });

    const totalScaled = result.scaledIngredients.reduce((sum, si) => sum + si.scaledWeight, 0);
    expect(totalScaled).toBeCloseTo(result.fragranceMass, 4);
  });

  it("fragrance mass + carrier mass equals batch size", () => {
    const result = calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "edp",
      batchSizeValue: 75,
      batchSizeUnit: "g",
      fragranceLoadPercent: 18,
    });

    expect(result.fragranceMass + result.carrierMass).toBeCloseTo(result.batchSizeGrams, 4);
  });

  it("no density note when unit is grams", () => {
    const result = calculateDerivedFormula({
      parentIngredients: mockIngredients,
      productTypeId: "edp",
      batchSizeValue: 100,
      batchSizeUnit: "g",
      fragranceLoadPercent: 18,
    });

    expect(result.densityNote).toBeUndefined();
  });
});

// ─── Product types validation ─────────────────────────────────────────────────

describe("PRODUCT_TYPES", () => {
  it("has all expected product types", () => {
    const ids = PRODUCT_TYPES.map(pt => pt.id);
    expect(ids).toContain("edp");
    expect(ids).toContain("edt");
    expect(ids).toContain("body_spray");
    expect(ids).toContain("body_oil");
    expect(ids).toContain("room_spray");
    expect(ids).toContain("reed_diffuser");
    expect(ids).toContain("lotion");
  });

  it("each product type has valid default load range", () => {
    for (const pt of PRODUCT_TYPES) {
      expect(pt.defaultLoadMin).toBeGreaterThan(0);
      expect(pt.defaultLoadMax).toBeGreaterThan(pt.defaultLoadMin);
      expect(pt.defaultLoad).toBeGreaterThanOrEqual(pt.defaultLoadMin);
      expect(pt.defaultLoad).toBeLessThanOrEqual(pt.defaultLoadMax);
      expect(pt.densityGPerMl).toBeGreaterThan(0);
    }
  });

  it("each product type has a carrier name", () => {
    for (const pt of PRODUCT_TYPES) {
      expect(pt.carrier.length).toBeGreaterThan(0);
      expect(pt.name.length).toBeGreaterThan(0);
      expect(pt.description.length).toBeGreaterThan(0);
    }
  });
});
