import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  listIngredients, getFormula, getFormulaIngredients,
  createFormula, addFormulaIngredient, updateFormula,
  createFormulaVersion, listFormulas,
} from "./db";
import { invokeLLM } from "./_core/llm";

// ─── Product Type Definitions ─────────────────────────────────────────────────

export const PRODUCT_TYPES = [
  {
    id: "edp",
    name: "Fine Fragrance EDP",
    carrier: "Ethanol (SDA 40-B or perfumer's alcohol)",
    defaultLoadMin: 15,
    defaultLoadMax: 20,
    defaultLoad: 18,
    densityGPerMl: 0.789,
    description: "Eau de Parfum — high concentration, long-lasting fine fragrance",
  },
  {
    id: "edt",
    name: "Fine Fragrance EDT",
    carrier: "Ethanol (SDA 40-B or perfumer's alcohol)",
    defaultLoadMin: 8,
    defaultLoadMax: 12,
    defaultLoad: 10,
    densityGPerMl: 0.789,
    description: "Eau de Toilette — lighter concentration, everyday wear",
  },
  {
    id: "body_spray",
    name: "Body Spray",
    carrier: "Ethanol (SDA 40-B or perfumer's alcohol)",
    defaultLoadMin: 3,
    defaultLoadMax: 5,
    defaultLoad: 4,
    densityGPerMl: 0.789,
    description: "Light body mist — low concentration, refreshing application",
  },
  {
    id: "body_oil",
    name: "Body Oil",
    carrier: "Carrier oil (jojoba, sweet almond, or fractionated coconut)",
    defaultLoadMin: 2,
    defaultLoadMax: 5,
    defaultLoad: 3,
    densityGPerMl: 0.92,
    description: "Scented body oil — skin-nourishing, moderate sillage",
  },
  {
    id: "room_spray",
    name: "Room Spray",
    carrier: "Ethanol (SDA 40-B or denatured alcohol)",
    defaultLoadMin: 5,
    defaultLoadMax: 10,
    defaultLoad: 8,
    densityGPerMl: 0.789,
    description: "Air freshener spray — moderate concentration for room scenting",
  },
  {
    id: "reed_diffuser",
    name: "Reed Diffuser Oil",
    carrier: "Diffuser base (DPG or reed diffuser base oil)",
    defaultLoadMin: 20,
    defaultLoadMax: 30,
    defaultLoad: 25,
    densityGPerMl: 1.02,
    description: "Reed diffuser — high concentration for slow passive diffusion",
  },
  {
    id: "lotion",
    name: "Scented Lotion / Cream",
    carrier: "Unscented lotion base",
    defaultLoadMin: 1,
    defaultLoadMax: 3,
    defaultLoad: 2,
    densityGPerMl: 1.0,
    description: "Scented body lotion — low concentration, skin-safe",
  },
] as const;

export type ProductTypeId = (typeof PRODUCT_TYPES)[number]["id"];

// ─── Unit Conversion ──────────────────────────────────────────────────────────

function convertToGrams(value: number, unit: string, densityGPerMl: number): number {
  switch (unit) {
    case "g":
      return value;
    case "ml":
      return value * densityGPerMl;
    case "oz":
      return value * 28.3495;
    case "kg":
      return value * 1000;
    default:
      return value;
  }
}

// ─── Calculation Logic ────────────────────────────────────────────────────────

export function calculateDerivedFormula(params: {
  parentIngredients: Array<{ ingredientId: number; weight: string; dilutionPercent: string | null; note: string | null; ingredient: any }>;
  productTypeId: string;
  batchSizeValue: number;
  batchSizeUnit: string;
  fragranceLoadPercent: number;
}) {
  const { parentIngredients, productTypeId, batchSizeValue, batchSizeUnit, fragranceLoadPercent } = params;
  const productType = PRODUCT_TYPES.find(pt => pt.id === productTypeId);
  if (!productType) throw new Error("Invalid product type");

  // Convert batch size to grams
  const batchSizeGrams = convertToGrams(batchSizeValue, batchSizeUnit, productType.densityGPerMl);

  // Calculate fragrance and carrier masses
  const fragranceMass = batchSizeGrams * (fragranceLoadPercent / 100);
  const carrierMass = batchSizeGrams - fragranceMass;

  // Calculate parent formula total weight (sum of all ingredient weights)
  const parentTotalWeight = parentIngredients.reduce((sum, fi) => sum + parseFloat(fi.weight || "0"), 0);
  if (parentTotalWeight === 0) throw new Error("Parent formula has no ingredient weights");

  // Scale each parent ingredient proportionally to fit fragranceMass
  const scaleFactor = fragranceMass / parentTotalWeight;
  const scaledIngredients = parentIngredients.map(fi => ({
    ingredientId: fi.ingredientId,
    ingredientName: fi.ingredient?.name || "Unknown",
    category: fi.ingredient?.category || null,
    originalWeight: parseFloat(fi.weight || "0"),
    scaledWeight: parseFloat(fi.weight || "0") * scaleFactor,
    dilutionPercent: fi.dilutionPercent || "100",
    note: fi.note,
  }));

  return {
    productType,
    batchSizeGrams,
    batchSizeValue,
    batchSizeUnit,
    fragranceLoadPercent,
    fragranceMass,
    carrierMass,
    carrierName: productType.carrier,
    scaleFactor,
    scaledIngredients,
    densityNote: batchSizeUnit === "ml"
      ? `Volume converted to weight using estimated density of ${productType.densityGPerMl} g/ml for ${productType.carrier.split("(")[0].trim()}.`
      : undefined,
  };
}

// ─── Router ───────────────────────────────────────────────────────────────────

export const derivedFormulaRouter = router({
  // Get product type definitions for the UI
  productTypes: protectedProcedure.query(() => {
    return PRODUCT_TYPES.map(pt => ({
      id: pt.id,
      name: pt.name,
      carrier: pt.carrier,
      defaultLoadMin: pt.defaultLoadMin,
      defaultLoadMax: pt.defaultLoadMax,
      defaultLoad: pt.defaultLoad,
      description: pt.description,
    }));
  }),

  // Preview the derived formula before saving
  preview: protectedProcedure
    .input(z.object({
      parentFormulaId: z.number(),
      productTypeId: z.string(),
      batchSizeValue: z.number().positive(),
      batchSizeUnit: z.enum(["g", "ml", "oz", "kg"]),
      fragranceLoadPercent: z.number().min(0.1).max(100),
    }))
    .mutation(async ({ ctx, input }) => {
      const formula = await getFormula(input.parentFormulaId, ctx.user.id);
      if (!formula) throw new Error("Parent formula not found");
      const parentIngredients = await getFormulaIngredients(formula.id);

      const result = calculateDerivedFormula({
        parentIngredients,
        productTypeId: input.productTypeId,
        batchSizeValue: input.batchSizeValue,
        batchSizeUnit: input.batchSizeUnit,
        fragranceLoadPercent: input.fragranceLoadPercent,
      });

      return {
        parentFormulaName: formula.name,
        ...result,
        scaledIngredients: result.scaledIngredients.map(si => ({
          ingredientId: si.ingredientId,
          ingredientName: si.ingredientName,
          category: si.category,
          originalWeight: si.originalWeight,
          scaledWeight: parseFloat(si.scaledWeight.toFixed(3)),
          dilutionPercent: si.dilutionPercent,
        })),
        fragranceMass: parseFloat(result.fragranceMass.toFixed(3)),
        carrierMass: parseFloat(result.carrierMass.toFixed(3)),
        batchSizeGrams: parseFloat(result.batchSizeGrams.toFixed(3)),
      };
    }),

  // Generate AI mixing procedure
  generateMixingProcedure: protectedProcedure
    .input(z.object({
      parentFormulaName: z.string(),
      productTypeName: z.string(),
      productTypeId: z.string(),
      carrierName: z.string(),
      fragranceMass: z.number(),
      carrierMass: z.number(),
      batchSizeGrams: z.number(),
      fragranceLoadPercent: z.number(),
      ingredients: z.array(z.object({
        name: z.string(),
        weight: z.number(),
        category: z.string().nullable(),
      })),
    }))
    .mutation(async ({ input }) => {
      const ingredientList = input.ingredients
        .map(i => `- ${i.name}: ${i.weight.toFixed(3)}g (${i.category || "N/A"})`)
        .join("\n");

      const prompt = `You are an expert perfumer and product formulator. Generate a clear, step-by-step mixing procedure for the following derived product formula.

Product Type: ${input.productTypeName}
Parent Concentrate: ${input.parentFormulaName}
Fragrance Load: ${input.fragranceLoadPercent}%
Total Batch Size: ${input.batchSizeGrams.toFixed(1)}g
Fragrance Portion: ${input.fragranceMass.toFixed(3)}g
Carrier: ${input.carrierName} — ${input.carrierMass.toFixed(3)}g

Fragrance Ingredients (scaled):
${ingredientList}

Generate a practical mixing procedure that includes:
1. Equipment needed (beakers, scale, stirring rod, etc.)
2. Step-by-step mixing order (typically base notes first, then heart, then top)
3. How to combine the fragrance concentrate with the carrier
4. Mixing technique (stir gently, avoid shaking for alcohol-based, etc.)
5. Aging/resting recommendation specific to this product type
6. Storage recommendations

Keep it concise but thorough. Use numbered steps. Be specific about temperatures if relevant.
Do NOT include any regulatory or compliance claims.

Return ONLY a JSON object:
{
  "steps": ["Step 1: ...", "Step 2: ...", ...],
  "agingSuggestion": "Recommended aging period and conditions",
  "storageTip": "How to store the finished product"
}`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert perfumer and product formulator. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "mixing_procedure",
            strict: true,
            schema: {
              type: "object",
              properties: {
                steps: { type: "array", items: { type: "string" } },
                agingSuggestion: { type: "string" },
                storageTip: { type: "string" },
              },
              required: ["steps", "agingSuggestion", "storageTip"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = result.choices[0]?.message?.content;
      if (!rawContent || typeof rawContent !== "string") throw new Error("Failed to generate mixing procedure");
      return JSON.parse(rawContent);
    }),

  // Save the derived formula
  save: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      parentFormulaId: z.number(),
      productTypeId: z.string(),
      productTypeName: z.string(),
      batchSizeValue: z.number().positive(),
      batchSizeUnit: z.enum(["g", "ml", "oz", "kg"]),
      fragranceLoadPercent: z.number().min(0.1).max(100),
      carrierName: z.string(),
      carrierMass: z.number(),
      fragranceMass: z.number(),
      batchSizeGrams: z.number(),
      mixingProcedure: z.string().optional(),
      ingredients: z.array(z.object({
        ingredientId: z.number(),
        weight: z.string(),
        dilutionPercent: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify parent exists
      const parent = await getFormula(input.parentFormulaId, ctx.user.id);
      if (!parent) throw new Error("Parent formula not found");

      // Create the derived formula
      const formulaId = await createFormula({
        name: input.name,
        description: `Derived ${input.productTypeName} from "${parent.name}" — ${input.fragranceLoadPercent}% fragrance load, ${input.batchSizeValue}${input.batchSizeUnit} batch`,
        userId: ctx.user.id,
        solvent: input.carrierName,
        solventWeight: input.carrierMass.toFixed(3),
        totalWeight: input.batchSizeGrams.toFixed(3),
        status: "draft",
        parentFormulaId: input.parentFormulaId,
        productType: input.productTypeName,
        fragranceLoadPercent: input.fragranceLoadPercent.toFixed(2),
        batchSize: input.batchSizeGrams.toFixed(3),
        batchSizeUnit: input.batchSizeUnit,
        mixingProcedure: input.mixingProcedure || null,
      });

      // Add all scaled fragrance ingredients
      for (const ing of input.ingredients) {
        await addFormulaIngredient({
          formulaId,
          ingredientId: ing.ingredientId,
          weight: ing.weight,
          dilutionPercent: ing.dilutionPercent || "100",
        });
      }

      // Auto-snapshot
      await createFormulaVersion(formulaId, ctx.user.id, `Auto-save: Derived formula created from "${parent.name}" (${input.productTypeName})`);

      return { formulaId };
    }),

  // Check if a formula has derived children (for delete warning)
  getDerivedCount: protectedProcedure
    .input(z.object({ formulaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const allFormulas = await listFormulas(ctx.user.id);
      const derivedCount = allFormulas.filter(f => f.parentFormulaId === input.formulaId).length;
      return { count: derivedCount };
    }),

  // List derived formulas for a parent
  listDerived: protectedProcedure
    .input(z.object({ parentFormulaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const allFormulas = await listFormulas(ctx.user.id);
      return allFormulas.filter(f => f.parentFormulaId === input.parentFormulaId);
    }),

  // Get parent formula info for a derived formula
  getParent: protectedProcedure
    .input(z.object({ parentFormulaId: z.number() }))
    .query(async ({ ctx, input }) => {
      const parent = await getFormula(input.parentFormulaId, ctx.user.id);
      if (!parent) return null;
      return { id: parent.id, name: parent.name };
    }),
});
