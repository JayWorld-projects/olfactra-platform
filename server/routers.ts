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

        const prompt = `You are a master perfumer. A client describes a scent concept:

"${input.concept}"

Here is the client's available ingredient library:
${ingredientList}

Based on this concept and ONLY using ingredients from the library above, create 2-3 formula suggestions. For each formula:

1. Give it a creative name
2. List the ingredients with suggested weights in grams (totaling around 10-20g concentrate)
3. Suggest a solvent weight (ethanol) for an EdP concentration (~15-20%)
4. Explain your reasoning for each ingredient choice
5. Describe the expected scent profile and evolution (top → heart → base)

Format each formula clearly with ingredient names and weights. Stay within IFRA limits where specified.`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are a master perfumer with decades of experience creating fine fragrances. You understand scent families, accords, and how materials interact. Always suggest formulas that are balanced and wearable." },
            { role: "user", content: prompt },
          ],
        });
        return { content: result.choices[0]?.message?.content || "Unable to generate suggestions." };
      }),
  }),
});

export type AppRouter = typeof appRouter;
