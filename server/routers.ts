import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import { z } from "zod";
import {
  listIngredients, getIngredient, createIngredient, bulkCreateIngredients,
  updateIngredient, deleteIngredient, getIngredientCategories, getIngredientSuppliers,
  listFormulas, getFormula, createFormula, updateFormula, deleteFormula,
  getFormulaIngredients, addFormulaIngredient, updateFormulaIngredient,
  removeFormulaIngredient, getIngredientUsage,
  listFavorites, addFavorite, removeFavorite, batchUpdateInventory,
} from "./db";
import { invokeLLM } from "./_core/llm";

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  ingredient: router({
    list: protectedProcedure
      .input(z.object({ search: z.string().optional(), category: z.string().optional() }).optional())
      .query(({ ctx, input }) => listIngredients(ctx.user.id, input)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => getIngredient(input.id, ctx.user.id)),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        casNumber: z.string().optional(),
        supplier: z.string().optional(),
        category: z.string().optional(),
        inventoryAmount: z.string().optional(),
        costPerGram: z.string().optional(),
        ifraLimit: z.string().optional(),
        longevity: z.number().min(0).max(5).optional(),
        description: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => createIngredient({ ...input, userId: ctx.user.id })),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        casNumber: z.string().optional(),
        supplier: z.string().optional(),
        category: z.string().optional(),
        inventoryAmount: z.string().optional(),
        costPerGram: z.string().optional(),
        ifraLimit: z.string().optional(),
        longevity: z.number().min(0).max(5).optional(),
        description: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return updateIngredient(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteIngredient(input.id, ctx.user.id)),

    categories: protectedProcedure.query(({ ctx }) => getIngredientCategories(ctx.user.id)),
    suppliers: protectedProcedure.query(({ ctx }) => getIngredientSuppliers(ctx.user.id)),

    usage: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getIngredientUsage(input.id)),

    favorites: protectedProcedure.query(({ ctx }) => listFavorites(ctx.user.id)),

    addFavorite: protectedProcedure
      .input(z.object({ ingredientId: z.number() }))
      .mutation(({ ctx, input }) => addFavorite(ctx.user.id, input.ingredientId)),

    removeFavorite: protectedProcedure
      .input(z.object({ ingredientId: z.number() }))
      .mutation(({ ctx, input }) => removeFavorite(ctx.user.id, input.ingredientId)),

    batchUpdateInventory: protectedProcedure
      .input(z.object({
        updates: z.array(z.object({ id: z.number(), inventoryAmount: z.string() })).min(1)
      }))
      .mutation(({ ctx, input }) => batchUpdateInventory(ctx.user.id, input.updates)),

    bulkImport: protectedProcedure
      .input(z.object({
        ingredients: z.array(z.object({
          name: z.string().min(1),
          casNumber: z.string().optional(),
          supplier: z.string().optional(),
          category: z.string().optional(),
          inventoryAmount: z.string().optional(),
          costPerGram: z.string().optional(),
          ifraLimit: z.string().optional(),
          longevity: z.number().min(0).max(5).optional(),
          description: z.string().optional(),
        }))
      }))
      .mutation(async ({ ctx, input }) => {
        const data = input.ingredients.map(i => ({ ...i, userId: ctx.user.id }));
        await bulkCreateIngredients(data);
        return { count: data.length };
      }),

    aiInfo: protectedProcedure
      .input(z.object({ ingredientName: z.string(), casNumber: z.string().optional() }))
      .mutation(async ({ input }) => {
        const prompt = `You are an expert perfumer and fragrance chemist. Provide detailed information about the following perfumery ingredient:

Name: ${input.ingredientName}
${input.casNumber ? `CAS Number: ${input.casNumber}` : ""}

Please provide the following information in a well-structured format:

1. **Chemical Identity**: CAS number, IUPAC name, molecular formula, molecular weight
2. **Olfactory Profile**: Detailed scent description, odor strength, character
3. **Substantivity/Longevity**: Classification (top/heart/base), tenacity on blotter, skin performance
4. **Usage in Perfumery**: Common usage levels, recommended dosage ranges, blending tips
5. **Safety Data**: IFRA restrictions, skin sensitization potential, phototoxicity concerns
6. **Historical Usage**: Notable perfumes or fragrance families that use this material
7. **Natural Occurrence**: Where this molecule is found in nature (if applicable)
8. **Blending Suggestions**: Materials that pair well with this ingredient`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert perfumer and fragrance chemist with deep knowledge of raw materials, safety data, and formulation techniques." },
            { role: "user", content: prompt },
          ],
        });
        return { content: result.choices[0]?.message?.content || "No information available." };
      }),
  }),

  formula: router({
    list: protectedProcedure.query(({ ctx }) => listFormulas(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const formula = await getFormula(input.id, ctx.user.id);
        if (!formula) return null;
        const items = await getFormulaIngredients(formula.id);
        return { ...formula, ingredients: items };
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        solvent: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createFormula({ ...input, userId: ctx.user.id });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        solvent: z.string().optional(),
        solventWeight: z.string().optional(),
        totalWeight: z.string().optional(),
        status: z.enum(["draft", "final"]).optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return updateFormula(id, ctx.user.id, data);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteFormula(input.id, ctx.user.id)),

    addIngredient: protectedProcedure
      .input(z.object({
        formulaId: z.number(),
        ingredientId: z.number(),
        weight: z.string(),
        dilutionPercent: z.string().optional(),
        note: z.string().optional(),
      }))
      .mutation(async ({ input }) => {
        const id = await addFormulaIngredient(input);
        return { id };
      }),

    updateIngredient: protectedProcedure
      .input(z.object({
        id: z.number(),
        weight: z.string().optional(),
        dilutionPercent: z.string().optional(),
        note: z.string().optional(),
      }))
      .mutation(({ input }) => {
        const { id, ...data } = input;
        return updateFormulaIngredient(id, data);
      }),

    removeIngredient: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => removeFormulaIngredient(input.id)),

    scentConcept: protectedProcedure
      .input(z.object({ concept: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        const allIngredients = await listIngredients(ctx.user.id);
        const ingredientList = allIngredients.map(i =>
          `- ${i.name} (Category: ${i.category || "N/A"}, Longevity: ${i.longevity ?? "N/A"}/5, IFRA Limit: ${i.ifraLimit || "N/A"}%)`
        ).join("\n");

        const prompt = `You are a master perfumer and scent formulator with expertise across multiple product categories. A client describes a scent concept:

"${input.concept}"

Here is the client's available ingredient library (fragrance raw materials):
${ingredientList}

Using ONLY ingredients from the library above, create complete recipes for ALL SEVEN of the following product types. Each recipe should capture the described scent concept adapted to that product's requirements.

---

## 1. PERFUME (Eau de Parfum)
Create 2 formula variations:
- List ingredients with weights in grams (10-20g concentrate total)
- Suggest ethanol solvent weight for EdP concentration (~15-20%)
- Describe scent evolution (top → heart → base)
- Stay within IFRA limits

## 2. CANDLE
Create 1 candle fragrance recipe:
- Specify fragrance load percentage (typically 6-10% of wax weight)
- Base it on 1 lb (454g) of soy wax
- List the fragrance oil blend with weights in grams
- Note flash point considerations
- Suggest wick size and burn notes

## 3. LOTION / BODY CREAM
Create 1 scented lotion recipe:
- Specify fragrance load (typically 1-3% of total weight)
- Base it on 500g total batch
- List the fragrance blend with weights in grams
- Note any skin-safe usage limits (IFRA Category 5A)
- Suggest a carrier/base recommendation

## 4. BODY WASH / SHOWER GEL
Create 1 scented body wash recipe:
- Specify fragrance load (typically 1-2% of total weight)
- Base it on 500g total batch
- List the fragrance blend with weights in grams
- Note which ingredients perform well in wash-off products
- Consider top-heavy composition for shower impact

## 5. INCENSE
Create 1 incense blend recipe:
- Specify the blend for stick or cone incense
- List ingredients with weights in grams for a small batch
- Note which materials are suitable for combustion
- Suggest a binder (e.g., makko powder) and proportions
- Describe the smoke character

## 6. BODY SPRAY / BODY MIST
Create 1 body spray recipe:
- Specify fragrance load (typically 3-5% of total)
- Base it on 100ml total
- List the fragrance blend with weights in grams
- Use a lighter, fresher interpretation of the concept
- Note alcohol/water ratio

## 7. HUMIDIFIER / DIFFUSER OIL
Create 1 essential/fragrance oil blend for humidifiers:
- List ingredients with drops or grams for a small blend (10-15ml total)
- Note which materials are water-soluble or suitable for ultrasonic diffusers
- Suggest usage rate (drops per water tank fill)
- Consider room-filling projection and safety for enclosed spaces

---

For EACH product type:
- Give the recipe a creative name
- List all ingredients with exact weights/measurements
- Explain your ingredient choices briefly
- Include any safety notes or tips specific to that product type

Format with clear markdown headers (## for product type, ### for recipe name). Use tables for ingredient lists where appropriate.`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are a master perfumer and product formulator with decades of experience creating fragrances for perfumes, candles, body care, incense, and home fragrance products. You understand how fragrance materials behave differently across product types — combustion for incense, wash-off for body wash, skin safety for lotions, and air diffusion for humidifiers. Always create balanced, safe, and effective formulas. Use markdown formatting with clear headers and tables." },
            { role: "user", content: prompt },
          ],
        });
        return { content: result.choices[0]?.message?.content || "Unable to generate suggestions." };
      }),
  }),
});

export type AppRouter = typeof appRouter;
