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
  cloneFormula,
  saveGeneration, listGenerations, getGeneration, deleteGeneration,
  listTags, createTag, deleteTag, getFormulaTags, assignTag, unassignTag,
  listFormulaNotes, addFormulaNote, updateFormulaNote, deleteFormulaNote,
  listWorkspacesWithCounts, getWorkspace, createWorkspace, updateWorkspace, deleteWorkspace,
  getWorkspaceIngredientIds, setWorkspaceIngredients,
  createFormulaVersion, listFormulaVersions, getFormulaVersion, revertFormulaToVersion, deleteFormulaVersion,
  listIngredientDilutions, addIngredientDilution, updateIngredientDilution, deleteIngredientDilution,
  listIngredientCategories, createIngredientCategory, updateIngredientCategory, deleteIngredientCategory,
  getIngredientCountByCategory, renameIngredientCategory,
  listAccords, getAccord, saveAccord, deleteAccord, updateAccord,
} from "./db";
import { invokeLLM } from "./_core/llm";
import { formulaImportRouter } from "./formulaImport";
import { derivedFormulaRouter } from "./derivedFormula";

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
        pyramidPosition: z.enum(["top", "top-heart", "heart", "heart-base", "base", "unknown"]).nullable().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return updateIngredient(id, ctx.user.id, {
          ...data,
          lastEditedAt: new Date(),
          lastEditedBySource: "user",
        });
      }),

    saveManualNotes: protectedProcedure
      .input(z.object({ id: z.number(), manualNotes: z.string() }))
      .mutation(({ ctx, input }) => {
        return updateIngredient(input.id, ctx.user.id, {
          manualNotes: input.manualNotes,
          manualNotesUpdatedAt: new Date(),
          lastEditedAt: new Date(),
          lastEditedBySource: "user",
        });
      }),

    generateAiNotes: protectedProcedure
      .input(z.object({ id: z.number(), ingredientName: z.string(), casNumber: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const prompt = `You are an expert perfumer and fragrance chemist. Provide a concise but comprehensive reference card for the following perfumery ingredient. Format the output with clear markdown headings and bullet points.

Ingredient: ${input.ingredientName}
${input.casNumber ? `CAS Number: ${input.casNumber}` : ""}

Include these sections:
1. **Chemical Identity** (CAS, IUPAC name, molecular formula)
2. **Olfactory Profile** (scent description, odor strength, character)
3. **Substantivity** (top/heart/base classification, tenacity)
4. **Usage in Perfumery** (typical usage levels, dosage ranges)
5. **Safety & IFRA** (restrictions, sensitization, phototoxicity)
6. **Blending Suggestions** (materials that pair well)
7. **Notable Perfumes** (famous fragrances using this material)`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert perfumer and fragrance chemist. Provide structured, factual reference information." },
            { role: "user", content: prompt },
          ],
        });
        const rawContent = result.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "No information available.";
        // Save to database
        await updateIngredient(input.id, ctx.user.id, {
          aiNotes: content,
          aiNotesUpdatedAt: new Date(),
          lastEditedAt: new Date(),
          lastEditedBySource: "ai",
        });
        return { content };
      }),

    copyAiToManualNotes: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const ingredient = await getIngredient(input.id, ctx.user.id);
        if (!ingredient?.aiNotes) throw new Error("No AI notes to copy");
        const timestamp = new Date().toLocaleString();
        const existingManual = ingredient.manualNotes || "";
        const separator = existingManual ? "\n\n---\n\n" : "";
        const newManualNotes = `${existingManual}${separator}*Copied from AI Notes on ${timestamp}:*\n\n${ingredient.aiNotes}`;
        await updateIngredient(input.id, ctx.user.id, {
          manualNotes: newManualNotes,
          manualNotesUpdatedAt: new Date(),
          lastEditedAt: new Date(),
          lastEditedBySource: "user",
        });
        return { manualNotes: newManualNotes };
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

    dilutions: protectedProcedure
      .input(z.object({ ingredientId: z.number() }))
      .query(({ ctx, input }) => listIngredientDilutions(input.ingredientId, ctx.user.id)),

    addDilution: protectedProcedure
      .input(z.object({
        ingredientId: z.number(),
        percentage: z.string(),
        solvent: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => addIngredientDilution({
        ingredientId: input.ingredientId,
        userId: ctx.user.id,
        percentage: input.percentage,
        solvent: input.solvent || "Ethanol",
        notes: input.notes || null,
      })),

    updateDilution: protectedProcedure
      .input(z.object({
        id: z.number(),
        percentage: z.string().optional(),
        solvent: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(({ ctx, input }) => {
        const { id, ...data } = input;
        return updateIngredientDilution(id, ctx.user.id, data);
      }),

    deleteDilution: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteIngredientDilution(input.id, ctx.user.id)),

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
      .input(z.object({
        concept: z.string().min(1),
        selectedTypes: z.array(z.enum(["perfume", "candle", "lotion", "bodywash", "incense", "bodyspray", "humidifier"])).min(1),
        workspaceId: z.number().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        let allIngredients = await listIngredients(ctx.user.id);
        // Filter by workspace if specified
        if (input.workspaceId) {
          const ws = await getWorkspace(input.workspaceId, ctx.user.id);
          if (ws) {
            const wsIngredientIds = await getWorkspaceIngredientIds(ws.id);
            const wsIdSet = new Set(wsIngredientIds);
            allIngredients = allIngredients.filter(i => wsIdSet.has(i.id));
          }
        }
        const ingredientList = allIngredients.map(i =>
          `- ${i.name} (Category: ${i.category || "N/A"}, Longevity: ${i.longevity ?? "N/A"}/5, IFRA Limit: ${i.ifraLimit || "N/A"}%)`
        ).join("\n");

        const typePrompts: Record<string, string> = {
          perfume: `## PERFUME\nCreate 1 formula:\n- List ingredients with weights in grams (10-20g concentrate total)\n- Suggest ethanol solvent weight for EdP concentration (~15-20%)\n- Describe scent evolution (top, heart, base)\n- Stay within IFRA limits`,
          candle: `## CANDLE\nCreate 1 candle fragrance recipe:\n- Specify fragrance load percentage (typically 6-10% of wax weight)\n- Base it on 1 lb (454g) of soy wax\n- List the fragrance oil blend with weights in grams\n- Note flash point considerations`,
          lotion: `## LOTION\nCreate 1 scented lotion recipe:\n- Specify fragrance load (typically 1-3% of total weight)\n- Base it on 500g total batch\n- List the fragrance blend with weights in grams\n- Note any skin-safe usage limits`,
          bodywash: `## BODYWASH\nCreate 1 scented body wash recipe:\n- Specify fragrance load (typically 1-2% of total weight)\n- Base it on 500g total batch\n- List the fragrance blend with weights in grams\n- Consider top-heavy composition for shower impact`,
          incense: `## INCENSE\nCreate 1 incense blend recipe:\n- Specify the blend for stick or cone incense\n- List ingredients with weights in grams for a small batch\n- Suggest a binder (e.g., makko powder) and proportions`,
          bodyspray: `## BODYSPRAY\nCreate 1 body spray recipe:\n- Specify fragrance load (typically 3-5% of total)\n- Base it on 100ml total\n- List the fragrance blend with weights in grams\n- Note alcohol/water ratio`,
          humidifier: `## HUMIDIFIER\nCreate 1 essential/fragrance oil blend for humidifiers/diffusers:\n- List ingredients with drops or grams for a small blend (10-15ml total)\n- Note which materials are suitable for ultrasonic diffusers\n- Suggest usage rate (drops per water tank fill)`,
        };

        const selectedPrompts = input.selectedTypes.map(t => typePrompts[t]).join("\n\n");
        const typeCount = input.selectedTypes.length;

        const prompt = `A client describes a scent concept:

"${input.concept}"

Available ingredient library:
${ingredientList}

Using ONLY ingredients from the library above, create recipes for ${typeCount} product type${typeCount > 1 ? "s" : ""}.

${selectedPrompts}

CRITICAL FORMATTING RULES (you MUST follow these exactly):
1. Each product type MUST start with exactly "## PERFUME", "## CANDLE", "## LOTION", "## BODYWASH", "## INCENSE", "## BODYSPRAY", or "## HUMIDIFIER" — use these EXACT headers, no numbering, no parenthetical text.
2. Do NOT use ## headers for anything else. Use ### for sub-sections within a product type.
3. Each product type MUST include a markdown table with columns: | Ingredient | Weight (g) | and at least 3 ingredient rows.
4. Give each recipe a creative name using ### header.
5. Include brief ingredient choice explanations and safety notes.
6. Every product type requested MUST have a complete recipe with ingredients — never skip one.`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are a master perfumer and product formulator. You create balanced, safe, and effective formulas. You ALWAYS format output with strict markdown: ## headers ONLY for product type sections (## PERFUME, ## CANDLE, ## LOTION, ## BODYWASH, ## INCENSE, ## BODYSPRAY, ## HUMIDIFIER), ### headers for recipe names and sub-sections. You ALWAYS include a markdown table with | Ingredient | Weight (g) | columns for every recipe. Never skip a requested product type." },
            { role: "user", content: prompt },
          ],
        });
        const rawContent = result.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : "Unable to generate suggestions.";
        // Auto-save generation to history
        let generationId: number | null = null;
        try {
          generationId = await saveGeneration({
            userId: ctx.user.id,
            concept: input.concept,
            selectedTypes: input.selectedTypes,
            content,
          });
        } catch (e) {
          console.warn("[ScentLab] Failed to save generation history:", e);
        }
        return { content, selectedTypes: input.selectedTypes, generationId };
      }),

    clone: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const newId = await cloneFormula(input.id, ctx.user.id, input.name);
        return { id: newId };
      }),

    compare: protectedProcedure
      .input(z.object({
        formulaIdA: z.number(),
        formulaIdB: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const [formulaA, formulaB] = await Promise.all([
          getFormula(input.formulaIdA, ctx.user.id),
          getFormula(input.formulaIdB, ctx.user.id),
        ]);
        if (!formulaA || !formulaB) return null;
        const [ingredientsA, ingredientsB] = await Promise.all([
          getFormulaIngredients(formulaA.id),
          getFormulaIngredients(formulaB.id),
        ]);
        return {
          formulaA: { ...formulaA, ingredients: ingredientsA },
          formulaB: { ...formulaB, ingredients: ingredientsB },
        };
      }),

    generationHistory: protectedProcedure
      .query(({ ctx }) => listGenerations(ctx.user.id)),

    getGeneration: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => getGeneration(input.id, ctx.user.id)),

    deleteGeneration: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteGeneration(input.id, ctx.user.id);
        return { success: true };
      }),

    // ─── Tags ───
    listTags: protectedProcedure.query(({ ctx }) => listTags(ctx.user.id)),

    createTag: protectedProcedure
      .input(z.object({ name: z.string().min(1), color: z.string().optional() }))
      .mutation(async ({ ctx, input }) => {
        const id = await createTag({ userId: ctx.user.id, name: input.name, color: input.color });
        return { id };
      }),

    deleteTag: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteTag(input.id, ctx.user.id);
        return { success: true };
      }),

    getFormulaTags: protectedProcedure
      .input(z.object({ formulaId: z.number() }))
      .query(({ input }) => getFormulaTags(input.formulaId)),

    assignTag: protectedProcedure
      .input(z.object({ formulaId: z.number(), tagId: z.number() }))
      .mutation(async ({ input }) => {
        await assignTag(input.formulaId, input.tagId);
        return { success: true };
      }),

    unassignTag: protectedProcedure
      .input(z.object({ formulaId: z.number(), tagId: z.number() }))
      .mutation(async ({ input }) => {
        await unassignTag(input.formulaId, input.tagId);
        return { success: true };
      }),

    // ─── Notes ───
    listNotes: protectedProcedure
      .input(z.object({ formulaId: z.number() }))
      .query(({ input }) => listFormulaNotes(input.formulaId)),

    addNote: protectedProcedure
      .input(z.object({ formulaId: z.number(), content: z.string().min(1) }))
      .mutation(async ({ input }) => {
        const id = await addFormulaNote({ formulaId: input.formulaId, content: input.content });
        return { id };
      }),

    updateNote: protectedProcedure
      .input(z.object({ id: z.number(), content: z.string().min(1) }))
      .mutation(async ({ input }) => {
        await updateFormulaNote(input.id, input.content);
        return { success: true };
      }),

    deleteNote: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input }) => {
        await deleteFormulaNote(input.id);
        return { success: true };
      }),

    generateFromIngredients: protectedProcedure
      .input(z.object({
        ingredientIds: z.array(z.number()).min(1),
        concept: z.string().min(1),
        productType: z.enum(["perfume", "candle", "lotion", "bodywash", "incense", "bodyspray", "humidifier"]).default("perfume"),
      }))
      .mutation(async ({ ctx, input }) => {
        const allIngredients = await listIngredients(ctx.user.id);
        const selectedIngredients = allIngredients.filter(i => input.ingredientIds.includes(i.id));
        if (selectedIngredients.length === 0) throw new Error("No matching ingredients found");

        const ingredientList = selectedIngredients.map(i =>
          `- ID:${i.id} "${i.name}" (Category: ${i.category || "N/A"}, Longevity: ${i.longevity ?? "N/A"}/5, Cost/g: $${i.costPerGram || "N/A"}, IFRA Limit: ${i.ifraLimit || "N/A"}%)`
        ).join("\n");

        const typeDescriptions: Record<string, string> = {
          perfume: "an Eau de Parfum (EdP) with 15-20% concentration. Target 10-20g concentrate total.",
          candle: "a candle fragrance blend at 6-10% fragrance load for 454g soy wax.",
          lotion: "a scented lotion blend at 1-3% fragrance load for 500g total.",
          bodywash: "a body wash fragrance blend at 1-2% for 500g total.",
          incense: "an incense blend for stick/cone incense.",
          bodyspray: "a body spray at 3-5% fragrance load for 100ml total.",
          humidifier: "a diffuser/humidifier oil blend (10-15ml total).",
        };

        const prompt = `You are a master perfumer. A client wants to create ${typeDescriptions[input.productType]}

Their creative concept/idea:
"${input.concept}"

They have selected these specific ingredients to work with (you MUST use ONLY these ingredients, use as many as make sense for the concept):
${ingredientList}

Create a single well-balanced formula. Return your response as a JSON object with this exact structure:
{
  "name": "Creative name for this formula",
  "description": "Brief poetic description of the scent profile and evolution",
  "ingredients": [
    { "ingredientId": <number>, "name": "<ingredient name>", "weight": "<weight in grams as string>", "note": "<brief role explanation>" }
  ],
  "solventWeight": "<solvent weight in grams if applicable>",
  "solvent": "Ethanol",
  "perfumerNotes": "Detailed explanation of why these ingredients work together for this concept"
}

IMPORTANT:
- Use ONLY ingredients from the provided list
- The ingredientId must match exactly from the list
- Weights should be realistic for the product type
- Every weight must be a string number (e.g., "2.500")
- Include at least 3 ingredients
- Stay within IFRA limits where specified
- Return ONLY the JSON object, no markdown fencing`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are a master perfumer. You return ONLY valid JSON objects with no markdown code fences or extra text. You create balanced, safe, and creative formulas." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "formula_generation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  name: { type: "string", description: "Creative name for the formula" },
                  description: { type: "string", description: "Brief poetic description" },
                  ingredients: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ingredientId: { type: "number", description: "ID from the ingredient list" },
                        name: { type: "string", description: "Ingredient name" },
                        weight: { type: "string", description: "Weight in grams" },
                        note: { type: "string", description: "Brief role explanation" },
                      },
                      required: ["ingredientId", "name", "weight", "note"],
                      additionalProperties: false,
                    },
                  },
                  solventWeight: { type: "string", description: "Solvent weight in grams" },
                  solvent: { type: "string", description: "Solvent type" },
                  perfumerNotes: { type: "string", description: "Detailed explanation" },
                },
                required: ["name", "description", "ingredients", "solventWeight", "solvent", "perfumerNotes"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = result.choices[0]?.message?.content;
        if (!rawContent || typeof rawContent !== "string") throw new Error("AI generation failed");

        try {
          const parsed = JSON.parse(rawContent);
          // Build lookup maps for matching
          const validIds = new Set(input.ingredientIds);
          const nameToId = new Map(selectedIngredients.map(i => [i.name.toLowerCase().trim(), i.id]));
          // Fix ingredient IDs: try direct match first, then name-based fallback
          parsed.ingredients = parsed.ingredients.map((ing: any) => {
            if (validIds.has(ing.ingredientId)) return ing;
            // Try name-based match
            const matchedId = nameToId.get(ing.name?.toLowerCase().trim());
            if (matchedId) return { ...ing, ingredientId: matchedId };
            // Try partial name match
            const entries = Array.from(nameToId.entries());
            for (let i = 0; i < entries.length; i++) {
              const [name, id] = entries[i];
              if (name.includes(ing.name?.toLowerCase().trim()) || ing.name?.toLowerCase().trim().includes(name)) {
                return { ...ing, ingredientId: id };
              }
            }
            return null;
          }).filter(Boolean);
          return parsed;
        } catch {
          throw new Error("Failed to parse AI response");
        }
      }),

    saveGeneratedFormula: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        solvent: z.string().optional(),
        solventWeight: z.string().optional(),
        ingredients: z.array(z.object({
          ingredientId: z.number(),
          weight: z.string(),
          note: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const formulaId = await createFormula({
          name: input.name,
          description: input.description,
          userId: ctx.user.id,
          solvent: input.solvent,
          solventWeight: input.solventWeight,
        });
        let addedCount = 0;
        for (const item of input.ingredients) {
          await addFormulaIngredient({
            formulaId,
            ingredientId: item.ingredientId,
            weight: item.weight,
            note: item.note,
          });
          addedCount++;
        }
        return { formulaId, addedCount };
      }),

    clone: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1),
      }))
      .mutation(async ({ ctx, input }) => {
        const newId = await cloneFormula(input.id, ctx.user.id, input.name);
        return { id: newId };
      }),

    compare: protectedProcedure
      .input(z.object({
        formulaIdA: z.number(),
        formulaIdB: z.number(),
      }))
      .query(async ({ ctx, input }) => {
        const [formulaA, formulaB] = await Promise.all([
          getFormula(input.formulaIdA, ctx.user.id),
          getFormula(input.formulaIdB, ctx.user.id),
        ]);
        if (!formulaA || !formulaB) return null;
        const [ingredientsA, ingredientsB] = await Promise.all([
          getFormulaIngredients(formulaA.id),
          getFormulaIngredients(formulaB.id),
        ]);
        return {
          formulaA: { ...formulaA, ingredients: ingredientsA },
          formulaB: { ...formulaB, ingredients: ingredientsB },
        };
      }),

    generationHistory: protectedProcedure
      .query(({ ctx }) => listGenerations(ctx.user.id)),

    getGeneration: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => getGeneration(input.id, ctx.user.id)),

    deleteGeneration: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteGeneration(input.id, ctx.user.id);
        return { success: true };
      }),

    saveFromConcept: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        productType: z.string(),
        ingredients: z.array(z.object({
          ingredientName: z.string(),
          weight: z.string(),
          note: z.string().optional(),
        })),
      }))
      .mutation(async ({ ctx, input }) => {
        const allIngredients = await listIngredients(ctx.user.id);
        const formulaId = await createFormula({
          name: input.name,
          description: input.description || `Generated from Scent Lab (${input.productType})`,
          userId: ctx.user.id,
        });

        let addedCount = 0;
        for (const item of input.ingredients) {
          const match = allIngredients.find(i => i.name.toLowerCase() === item.ingredientName.toLowerCase());
          if (match) {
            await addFormulaIngredient({
              formulaId,
              ingredientId: match.id,
              weight: item.weight,
              note: item.note,
            });
            addedCount++;
          }
        }
        return { formulaId, addedCount, totalRequested: input.ingredients.length };
      }),

    generateAINotes: protectedProcedure
      .input(z.object({ formulaId: z.number() }))
      .mutation(async ({ ctx, input }) => {
        const formula = await getFormula(input.formulaId, ctx.user.id);
        if (!formula) throw new Error("Formula not found");
        const ingredients = await getFormulaIngredients(formula.id);
        const allIngredients = await listIngredients(ctx.user.id);

        const ingredientDetails = ingredients.map((fi: any) => {
          const ing = allIngredients.find(i => i.id === fi.ingredientId);
          return `- ${ing?.name || "Unknown"} (${fi.weight}g, dilution: ${fi.dilutionPercent}%, IFRA: ${ing?.ifraLimit || "N/A"}%)`;
        }).join("\n");

        const prompt = `You are a master perfumer. Generate structured guidance notes for this formula:

Formula: ${formula.name}
Solvent: ${formula.solvent}
Solvent Weight: ${formula.solventWeight}g

Ingredients:
${ingredientDetails}

Generate a JSON object with these exact fields:
{
  "solventRecommendations": "Recommend solvents (DPG, ethanol, TEC, IPM, or neat) with brief why",
  "dilutionGuidance": "Identify ingredients for pre-dilution and suggest ranges",
  "maturationSuggestion": "Suggested aging window based on formula style",
  "mixingOrder": "Mixing order (base to heart to top) with special handling notes",
  "safetyReminder": "Always include: Confirm IFRA limits per material and total fragrance load.",
  "practicalUseGuidance": "Basic ranges for fine fragrance, body spray, room spray, diffuser oil"
}

Return ONLY the JSON object, no markdown fencing.`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are a master perfumer. Return ONLY valid JSON with no markdown code fences." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "ai_notes",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  solventRecommendations: { type: "string" },
                  dilutionGuidance: { type: "string" },
                  maturationSuggestion: { type: "string" },
                  mixingOrder: { type: "string" },
                  safetyReminder: { type: "string" },
                  practicalUseGuidance: { type: "string" },
                },
                required: ["solventRecommendations", "dilutionGuidance", "maturationSuggestion", "mixingOrder", "safetyReminder", "practicalUseGuidance"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = result.choices[0]?.message?.content;
        if (!rawContent || typeof rawContent !== "string") throw new Error("AI notes generation failed");

        const aiNotesData = JSON.parse(rawContent);
        const timestamp = new Date().toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
        const aiNotesBlock = `## AI Generated Notes\n\n**AI Notes last generated:** ${timestamp}\n\n### A) Solvent Recommendations\n${aiNotesData.solventRecommendations}\n\n### B) Dilution Guidance\n${aiNotesData.dilutionGuidance}\n\n### C) Maturation / Aging Suggestion\n${aiNotesData.maturationSuggestion}\n\n### D) Mixing Order / Handling\n${aiNotesData.mixingOrder}\n\n### E) Safety Reminder\n${aiNotesData.safetyReminder}\n\n### F) Practical Use Guidance\n${aiNotesData.practicalUseGuidance}`;

        // Delete any existing AI note for this formula
        const existingNotes = await listFormulaNotes(formula.id);
        const existingAiNote = existingNotes.find((n: any) => n.content.startsWith("## AI Generated Notes"));
        if (existingAiNote) {
          await deleteFormulaNote(existingAiNote.id);
        }

        // Insert the new AI note
        await addFormulaNote({ formulaId: formula.id, content: aiNotesBlock });

        // Update the formula's aiNotesLastGeneratedAt timestamp
        await updateFormula(formula.id, ctx.user.id, { aiNotesLastGeneratedAt: new Date() });

        return { aiNotesBlock, timestamp };
      }),
  }),

  workspace: router({
    list: protectedProcedure.query(({ ctx }) => listWorkspacesWithCounts(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const ws = await getWorkspace(input.id, ctx.user.id);
        if (!ws) return null;
        const ingredientIds = await getWorkspaceIngredientIds(ws.id);
        return { ...ws, ingredientIds };
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        ingredientIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createWorkspace({ name: input.name, description: input.description, userId: ctx.user.id });
        if (input.ingredientIds.length > 0) {
          await setWorkspaceIngredients(id, input.ingredientIds);
        }
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateWorkspace(id, ctx.user.id, data);
        return { success: true };
      }),

    setIngredients: protectedProcedure
      .input(z.object({
        workspaceId: z.number(),
        ingredientIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify workspace belongs to user
        const ws = await getWorkspace(input.workspaceId, ctx.user.id);
        if (!ws) throw new Error("Workspace not found");
        await setWorkspaceIngredients(input.workspaceId, input.ingredientIds);
        return { success: true, count: input.ingredientIds.length };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteWorkspace(input.id, ctx.user.id);
        return { success: true };
      }),

    ingredients: protectedProcedure
      .input(z.object({ workspaceId: z.number() }))
      .query(async ({ ctx, input }) => {
        const ws = await getWorkspace(input.workspaceId, ctx.user.id);
        if (!ws) return [];
        const ingredientIds = await getWorkspaceIngredientIds(ws.id);
        if (ingredientIds.length === 0) return [];
        const allIngredients = await listIngredients(ctx.user.id);
        return allIngredients.filter(i => ingredientIds.includes(i.id));
      }),
  }),

  version: router({
    list: protectedProcedure
      .input(z.object({ formulaId: z.number() }))
      .query(({ input }) => listFormulaVersions(input.formulaId)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getFormulaVersion(input.id)),

    create: protectedProcedure
      .input(z.object({ formulaId: z.number(), label: z.string().optional() }))
      .mutation(({ ctx, input }) => createFormulaVersion(input.formulaId, ctx.user.id, input.label)),

    revert: protectedProcedure
      .input(z.object({ formulaId: z.number(), versionId: z.number() }))
      .mutation(({ ctx, input }) => revertFormulaToVersion(input.formulaId, input.versionId, ctx.user.id)),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteFormulaVersion(input.id)),
  }),

  formulaImport: formulaImportRouter,

  derived: derivedFormulaRouter,

  category: router({
    list: protectedProcedure.query(({ ctx }) => listIngredientCategories(ctx.user.id)),

    counts: protectedProcedure.query(({ ctx }) => getIngredientCountByCategory(ctx.user.id)),

    create: protectedProcedure
      .input(z.object({ name: z.string().min(1), color: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const id = await createIngredientCategory({ ...input, userId: ctx.user.id });
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({ id: z.number(), name: z.string().min(1).optional(), color: z.string().optional(), sortOrder: z.number().optional() }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateIngredientCategory(id, ctx.user.id, data);
        return { success: true };
      }),

    rename: protectedProcedure
      .input(z.object({ id: z.number(), oldName: z.string(), newName: z.string().min(1) }))
      .mutation(async ({ ctx, input }) => {
        // Update the category record
        await updateIngredientCategory(input.id, ctx.user.id, { name: input.newName });
        // Update all ingredients with the old category name
        await renameIngredientCategory(ctx.user.id, input.oldName, input.newName);
        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteIngredientCategory(input.id, ctx.user.id);
        return { success: true };
      }),

    seed: protectedProcedure
      .mutation(async ({ ctx }) => {
        // Seed categories from existing ingredient data + CATEGORY_COLORS
        const existing = await listIngredientCategories(ctx.user.id);
        if (existing.length > 0) return { seeded: 0, message: "Categories already exist" };
        const counts = await getIngredientCountByCategory(ctx.user.id);
        const CATEGORY_COLORS: Record<string, string> = {
          "Aldehydic": "#c084fc", "Amber": "#f59e0b", "Animalic": "#78716c",
          "Aromatic": "#22c55e", "Balsamic": "#a16207", "Citrus": "#facc15",
          "Earthy": "#92400e", "Floral": "#f472b6", "Fruity": "#fb923c",
          "Green": "#4ade80", "Herbal": "#86efac", "Leather": "#78716c",
          "Marine": "#38bdf8", "Mineral": "#94a3b8", "Mossy": "#65a30d",
          "Musky": "#d4d4d8", "Ozonic": "#7dd3fc", "Powdery": "#fda4af",
          "Resinous": "#b45309", "Smoky": "#6b7280", "Spicy": "#ef4444",
          "Sweet": "#f9a8d4", "Woody": "#a16207", "Gourmand": "#f97316",
          "Aquatic": "#06b6d4", "Camphoraceous": "#a3e635", "Waxy": "#fde68a",
        };
        const categoryNames = new Set(counts.map(c => c.category).filter(Boolean));
        // Also add any from CATEGORY_COLORS that aren't in the data
        Object.keys(CATEGORY_COLORS).forEach(k => categoryNames.add(k));
        const sorted = Array.from(categoryNames).filter(Boolean).sort() as string[];
        let seeded = 0;
        for (let i = 0; i < sorted.length; i++) {
          const name = sorted[i];
          const color = CATEGORY_COLORS[name] || "#6b7280";
          await createIngredientCategory({ userId: ctx.user.id, name, color, sortOrder: i });
          seeded++;
        }
        return { seeded, message: `Seeded ${seeded} categories` };
      }),
  }),

  substitution: router({
    suggest: protectedProcedure
      .input(z.object({
        ingredientId: z.number(),
        ingredientName: z.string(),
        formulaId: z.number(),
        basis: z.enum(["as-dosed", "neat-active"]).optional().default("neat-active"),
      }))
      .mutation(async ({ ctx, input }) => {
        const allIngredients = await listIngredients(ctx.user.id);
        const formulaItems = await getFormulaIngredients(input.formulaId);
        const currentIngredient = allIngredients.find(i => i.id === input.ingredientId);
        if (!currentIngredient) throw new Error("Ingredient not found");

        // Find the formula ingredient entry to get dilution info
        const currentFi = formulaItems.find(fi => fi.ingredientId === input.ingredientId);
        const currentDilution = currentFi?.dilutionPercent || "100";
        const currentWeight = currentFi?.weight || "unknown";

        // Exclude ingredients already in the formula
        const formulaIngIds = new Set(formulaItems.map(fi => fi.ingredientId));
        const candidates = allIngredients.filter(i => !formulaIngIds.has(i.id));

        const candidateList = candidates.map(i =>
          `- ID:${i.id} | ${i.name} | Category: ${i.category || "N/A"} | Longevity: ${i.longevity ?? "N/A"}/5 | Cost: $${i.costPerGram || "N/A"}/g`
        ).join("\n");

        const basisInstructions = input.basis === "as-dosed"
          ? `SUBSTITUTION BASIS: AS-DOSED (practical/workflow focus)
- Prioritize workflow practicality and dilution realities
- Rank substitutes by how easy they are to work with at the current dosage (${currentWeight}g at ${currentDilution}% dilution)
- Impact notes should emphasize: weighing and handling, dilution compatibility, solvent considerations, practical shelf life
- Consider whether the substitute is commonly available at similar dilutions
- Focus on "drop-in replacement" viability from a practical standpoint`
          : `SUBSTITUTION BASIS: NEAT/ACTIVE (olfactive equivalence focus)
- Prioritize olfactive equivalence and formula balance
- Rank substitutes by how closely they match the olfactory contribution of the neat/active material
- Impact notes should emphasize: scent strength, diffusion, longevity, accord balance, sillage
- Consider the active concentration: ${currentWeight}g at ${currentDilution}% dilution = ${(parseFloat(currentWeight || "0") * parseFloat(currentDilution || "100") / 100).toFixed(3)}g neat/active
- Focus on matching the olfactory "role" this ingredient plays in the formula`;

        const prompt = `You are an expert perfumer. I need substitution suggestions for this ingredient in a formula:

Current ingredient: ${currentIngredient.name}
- Category: ${currentIngredient.category || "N/A"}
- Longevity: ${currentIngredient.longevity ?? "N/A"}/5
- Cost: $${currentIngredient.costPerGram || "N/A"}/g
- Description: ${currentIngredient.description || "N/A"}
- Current dosage: ${currentWeight}g at ${currentDilution}% dilution

${basisInstructions}

Available ingredients in the user's library (not already in this formula):
${candidateList}

Suggest up to 5 substitutes from the available list. For each, explain:
1. Why it's a good substitute (based on the ${input.basis === "as-dosed" ? "as-dosed practical" : "neat/active olfactive"} criteria above)
2. How it differs (${input.basis === "as-dosed" ? "practical handling differences, dilution considerations" : "what changes in the scent profile, accord impact"})
3. Whether it's a cost-effective swap

Return JSON:
{
  "suggestions": [
    {
      "ingredientId": <number>,
      "name": "<ingredient name>",
      "similarity": <number 1-100>,
      "reason": "<why this is a good substitute>",
      "difference": "<how the scent will change>",
      "costComparison": "cheaper" | "similar" | "more expensive"
    }
  ]
}`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert perfumer. Return only valid JSON." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "substitution_suggestions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ingredientId: { type: "integer" },
                        name: { type: "string" },
                        similarity: { type: "integer" },
                        reason: { type: "string" },
                        difference: { type: "string" },
                        costComparison: { type: "string", enum: ["cheaper", "similar", "more expensive"] },
                      },
                      required: ["ingredientId", "name", "similarity", "reason", "difference", "costComparison"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = result.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) || "{}";
        try {
          const parsed = JSON.parse(content);
          // Validate ingredient IDs exist
          const validIds = new Set(candidates.map(c => c.id));
          parsed.suggestions = (parsed.suggestions || []).filter((s: any) => validIds.has(s.ingredientId));
          return parsed;
        } catch {
          return { suggestions: [] };
        }
      }),
  }),

  accord: router({
    list: protectedProcedure.query(({ ctx }) => listAccords(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ ctx, input }) => getAccord(input.id, ctx.user.id)),

    save: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        scentFamily: z.string().optional(),
        estimatedLongevity: z.string().optional(),
        explanation: z.string().optional(),
        ingredients: z.array(z.object({
          ingredientId: z.number(),
          percentage: z.string(),
        })).min(1),
      }))
      .mutation(({ ctx, input }) => {
        const { ingredients, ...data } = input;
        return saveAccord(ctx.user.id, data, ingredients);
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ ctx, input }) => deleteAccord(input.id, ctx.user.id)),

    generate: protectedProcedure
      .input(z.object({
        prompt: z.string().min(1),
        variationCount: z.number().min(1).max(5).default(3),
      }))
      .mutation(async ({ ctx, input }) => {
        // Fetch all user ingredients for library filtering
        const allIngredients = await listIngredients(ctx.user.id);
        if (allIngredients.length === 0) throw new Error("Your ingredient library is empty. Add ingredients first.");

        const ingredientList = allIngredients.map(i =>
          `- ID:${i.id} "${i.name}" (Category: ${i.category || "N/A"}, Description: ${(i.description || "").slice(0, 80)}, Pyramid: ${i.pyramidPosition || "N/A"}, Longevity: ${i.longevity ?? "N/A"}/5)`
        ).join("\n");

        const prompt = `You are a master perfumer specializing in accord creation. A user wants to create fragrance accords based on this concept:

"${input.prompt}"

You MUST use ONLY ingredients from the user's personal library listed below. Do NOT invent or suggest ingredients not in this list.

Available ingredients:
${ingredientList}

Generate exactly ${input.variationCount} distinct accord variations. Each accord should:
- Contain 3-7 ingredients
- Have percentages that sum to exactly 100%
- Include a creative name
- Include a dominant scent family classification
- Include an estimated longevity (e.g., "4-6 hours", "8+ hours")
- Include a short educational explanation of why these ingredients work together

Return a JSON object with this structure:
{
  "accords": [
    {
      "name": "Creative accord name",
      "description": "Brief poetic description of the accord",
      "scentFamily": "Dominant scent family (e.g., Amber, Woody, Floral, Citrus, etc.)",
      "estimatedLongevity": "Estimated wear time",
      "explanation": "Educational explanation of why these ingredients create this accord",
      "ingredients": [
        { "ingredientId": <number>, "name": "<ingredient name>", "percentage": "<percentage as string>" }
      ]
    }
  ]
}`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are a master perfumer. Return ONLY valid JSON. Use ONLY ingredients from the provided list. Each accord must have 3-7 ingredients with percentages summing to 100%." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "accord_generation",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  accords: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        name: { type: "string" },
                        description: { type: "string" },
                        scentFamily: { type: "string" },
                        estimatedLongevity: { type: "string" },
                        explanation: { type: "string" },
                        ingredients: {
                          type: "array",
                          items: {
                            type: "object",
                            properties: {
                              ingredientId: { type: "number" },
                              name: { type: "string" },
                              percentage: { type: "string" },
                            },
                            required: ["ingredientId", "name", "percentage"],
                            additionalProperties: false,
                          },
                        },
                      },
                      required: ["name", "description", "scentFamily", "estimatedLongevity", "explanation", "ingredients"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["accords"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = result.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) || "{}";
        try {
          const parsed = JSON.parse(content);
          // Validate: only keep ingredients that exist in the user's library
          const validIds = new Set(allIngredients.map(i => i.id));
          parsed.accords = (parsed.accords || []).map((accord: any) => ({
            ...accord,
            ingredients: (accord.ingredients || []).filter((ing: any) => validIds.has(ing.ingredientId)),
          }));
          return parsed;
        } catch {
          return { accords: [] };
        }
      }),

    suggestSwap: protectedProcedure
      .input(z.object({
        ingredientId: z.number(),
        ingredientName: z.string(),
        accordIngredientIds: z.array(z.number()),
        accordContext: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allIngredients = await listIngredients(ctx.user.id);
        const currentIngredient = allIngredients.find(i => i.id === input.ingredientId);
        if (!currentIngredient) throw new Error("Ingredient not found");

        // Exclude ingredients already in the accord
        const accordIngIds = new Set(input.accordIngredientIds);
        const candidates = allIngredients.filter(i => !accordIngIds.has(i.id));

        const candidateList = candidates.map(i =>
          `- ID:${i.id} | ${i.name} | Category: ${i.category || "N/A"} | Longevity: ${i.longevity ?? "N/A"}/5 | Cost: $${i.costPerGram || "N/A"}/g`
        ).join("\n");

        const prompt = `You are an expert perfumer. I need substitution suggestions for an ingredient in a fragrance accord.

Current ingredient: ${currentIngredient.name}
- Category: ${currentIngredient.category || "N/A"}
- Longevity: ${currentIngredient.longevity ?? "N/A"}/5
- Cost: $${currentIngredient.costPerGram || "N/A"}/g
- Description: ${currentIngredient.description || "N/A"}
${input.accordContext ? `\nAccord context: ${input.accordContext}` : ""}

Available ingredients in the user's library (not already in this accord):
${candidateList}

Suggest up to 5 substitutes from the available list. For each, explain:
1. Why it's a good olfactive substitute for this accord context
2. How it differs in scent profile
3. Whether it's a cost-effective swap

Return JSON:
{
  "suggestions": [
    {
      "ingredientId": <number>,
      "name": "<ingredient name>",
      "similarity": <number 1-100>,
      "reason": "<why this is a good substitute>",
      "difference": "<how the scent will change>",
      "costComparison": "cheaper" | "similar" | "more expensive"
    }
  ]
}`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert perfumer. Return only valid JSON." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "accord_swap_suggestions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ingredientId: { type: "integer" },
                        name: { type: "string" },
                        similarity: { type: "integer" },
                        reason: { type: "string" },
                        difference: { type: "string" },
                        costComparison: { type: "string", enum: ["cheaper", "similar", "more expensive"] },
                      },
                      required: ["ingredientId", "name", "similarity", "reason", "difference", "costComparison"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = result.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) || "{}";
        try {
          const parsed = JSON.parse(content);
          const validIds = new Set(candidates.map(c => c.id));
          parsed.suggestions = (parsed.suggestions || []).filter((s: any) => validIds.has(s.ingredientId));
          return parsed;
        } catch {
          return { suggestions: [] };
        }
      }),

    sendToFormula: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        ingredients: z.array(z.object({
          ingredientId: z.number(),
          percentage: z.string(),
        })).min(1),
        totalWeight: z.string().default("10"),
      }))
      .mutation(async ({ ctx, input }) => {
        // Create a new formula draft from the accord
        const formulaId = await createFormula({
          userId: ctx.user.id,
          name: `${input.name} (Accord)`,
          description: input.description || `Generated from accord: ${input.name}`,
          status: "draft",
          sourceType: "accord",
        });
        // Add ingredients with weights calculated from percentages
        const totalWeight = parseFloat(input.totalWeight) || 10;
        for (const ing of input.ingredients) {
          const pct = parseFloat(ing.percentage) || 0;
          const weight = ((pct / 100) * totalWeight).toFixed(3);
          await addFormulaIngredient({
            formulaId,
            ingredientId: ing.ingredientId,
            weight,
            dilutionPercent: "100",
          });
        }
        // Update total weight
        await updateFormula(formulaId, ctx.user.id, {
          totalWeight: totalWeight.toFixed(3),
        });
        return { formulaId };
      }),
  }),

  workspace: router({
    list: protectedProcedure.query(({ ctx }) => listWorkspacesWithCounts(ctx.user.id)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ ctx, input }) => {
        const ws = await getWorkspace(input.id, ctx.user.id);
        if (!ws) return null;
        const ingredientIds = await getWorkspaceIngredientIds(ws.id);
        return { ...ws, ingredientIds };
      }),

    create: protectedProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        ingredientIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        const id = await createWorkspace({ name: input.name, description: input.description, userId: ctx.user.id });
        if (input.ingredientIds.length > 0) {
          await setWorkspaceIngredients(id, input.ingredientIds);
        }
        return { id };
      }),

    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
      }))
      .mutation(async ({ ctx, input }) => {
        const { id, ...data } = input;
        await updateWorkspace(id, ctx.user.id, data);
        return { success: true };
      }),

    setIngredients: protectedProcedure
      .input(z.object({
        workspaceId: z.number(),
        ingredientIds: z.array(z.number()),
      }))
      .mutation(async ({ ctx, input }) => {
        // Verify workspace belongs to user
        const ws = await getWorkspace(input.workspaceId, ctx.user.id);
        if (!ws) throw new Error("Workspace not found");
        await setWorkspaceIngredients(input.workspaceId, input.ingredientIds);
        return { success: true, count: input.ingredientIds.length };
      }),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ ctx, input }) => {
        await deleteWorkspace(input.id, ctx.user.id);
        return { success: true };
      }),

    ingredients: protectedProcedure
      .input(z.object({ workspaceId: z.number() }))
      .query(async ({ ctx, input }) => {
        const ws = await getWorkspace(input.workspaceId, ctx.user.id);
        if (!ws) return [];
        const ingredientIds = await getWorkspaceIngredientIds(ws.id);
        if (ingredientIds.length === 0) return [];
        const allIngredients = await listIngredients(ctx.user.id);
        return allIngredients.filter(i => ingredientIds.includes(i.id));
      }),
  }),

  version: router({
    list: protectedProcedure
      .input(z.object({ formulaId: z.number() }))
      .query(({ input }) => listFormulaVersions(input.formulaId)),

    get: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(({ input }) => getFormulaVersion(input.id)),

    create: protectedProcedure
      .input(z.object({ formulaId: z.number(), label: z.string().optional() }))
      .mutation(({ ctx, input }) => createFormulaVersion(input.formulaId, ctx.user.id, input.label)),

    revert: protectedProcedure
      .input(z.object({ formulaId: z.number(), versionId: z.number() }))
      .mutation(({ ctx, input }) => revertFormulaToVersion(input.formulaId, input.versionId, ctx.user.id)),

    delete: protectedProcedure
      .input(z.object({ id: z.number() }))
      .mutation(({ input }) => deleteFormulaVersion(input.id)),
  }),

  substitution: router({
    suggest: protectedProcedure
      .input(z.object({
        ingredientId: z.number(),
        ingredientName: z.string(),
        formulaId: z.number(),
      }))
      .mutation(async ({ ctx, input }) => {
        const allIngredients = await listIngredients(ctx.user.id);
        const formulaItems = await getFormulaIngredients(input.formulaId);
        const currentIngredient = allIngredients.find(i => i.id === input.ingredientId);
        if (!currentIngredient) throw new Error("Ingredient not found");

        // Exclude ingredients already in the formula
        const formulaIngIds = new Set(formulaItems.map(fi => fi.ingredientId));
        const candidates = allIngredients.filter(i => !formulaIngIds.has(i.id));

        const candidateList = candidates.map(i =>
          `- ID:${i.id} | ${i.name} | Category: ${i.category || "N/A"} | Longevity: ${i.longevity ?? "N/A"}/5 | Cost: $${i.costPerGram || "N/A"}/g`
        ).join("\n");

        const prompt = `You are an expert perfumer. I need substitution suggestions for this ingredient in a formula:

Current ingredient: ${currentIngredient.name}
- Category: ${currentIngredient.category || "N/A"}
- Longevity: ${currentIngredient.longevity ?? "N/A"}/5
- Cost: $${currentIngredient.costPerGram || "N/A"}/g
- Description: ${currentIngredient.description || "N/A"}

Available ingredients in the user's library (not already in this formula):
${candidateList}

Suggest up to 5 substitutes from the available list. For each, explain:
1. Why it's a good substitute (olfactory similarity, functional role)
2. How it differs (what changes in the scent profile)
3. Whether it's a cost-effective swap

Return JSON:
{
  "suggestions": [
    {
      "ingredientId": <number>,
      "name": "<ingredient name>",
      "similarity": <number 1-100>,
      "reason": "<why this is a good substitute>",
      "difference": "<how the scent will change>",
      "costComparison": "cheaper" | "similar" | "more expensive"
    }
  ]
}`;

        const result = await invokeLLM({
          messages: [
            { role: "system", content: "You are an expert perfumer. Return only valid JSON." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "substitution_suggestions",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  suggestions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        ingredientId: { type: "integer" },
                        name: { type: "string" },
                        similarity: { type: "integer" },
                        reason: { type: "string" },
                        difference: { type: "string" },
                        costComparison: { type: "string", enum: ["cheaper", "similar", "more expensive"] },
                      },
                      required: ["ingredientId", "name", "similarity", "reason", "difference", "costComparison"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["suggestions"],
                additionalProperties: false,
              },
            },
          },
        });

        const rawContent = result.choices[0]?.message?.content;
        const content = typeof rawContent === "string" ? rawContent : JSON.stringify(rawContent) || "{}";
        try {
          const parsed = JSON.parse(content);
          // Validate ingredient IDs exist
          const validIds = new Set(candidates.map(c => c.id));
          parsed.suggestions = (parsed.suggestions || []).filter((s: any) => validIds.has(s.ingredientId));
          return parsed;
        } catch {
          return { suggestions: [] };
        }
      }),
  }),
});

export type AppRouter = typeof appRouter;
