import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import {
  listIngredients,
  createFormula,
  addFormulaIngredient,
  createFormulaVersion,
} from "./db";
import { stringSimilarity } from "string-similarity-js";

// ─── Types ──────────────────────────────────────────────────────────────────

export type ParsedIngredient = {
  originalName: string;
  weight: string | null;
  percentage: string | null;
  dilution: string | null;
  notes: string | null;
};

export type MatchResult = {
  originalName: string;
  weight: string | null;
  percentage: string | null;
  dilution: string | null;
  notes: string | null;
  matchStatus: "exact" | "close" | "none";
  matchedIngredientId: number | null;
  matchedIngredientName: string | null;
  matchConfidence: "high" | "medium" | "low" | null;
  similarityScore: number | null;
};

export type SubstituteSuggestion = {
  ingredientId: number;
  name: string;
  confidence: "high" | "medium" | "low";
  explanation: string;
  expectedImpact: string;
};

// ─── Parsing helpers ────────────────────────────────────────────────────────

function parseCSVForFormula(text: string): ParsedIngredient[] {
  const lines: string[][] = [];
  let current: string[] = [];
  let inQuotes = false;
  let field = "";

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === "," || ch === "\t") { current.push(field.trim()); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        current.push(field.trim()); field = "";
        if (current.some(c => c)) lines.push(current);
        current = [];
      } else { field += ch; }
    }
  }
  current.push(field.trim());
  if (current.some(c => c)) lines.push(current);

  if (lines.length < 2) return [];

  const header = lines[0].map(h => h.toLowerCase().trim());

  // Auto-detect columns
  const findCol = (names: string[]) => {
    for (const n of names) {
      const idx = header.findIndex(h => h.includes(n));
      if (idx >= 0) return idx;
    }
    return -1;
  };

  const nameIdx = findCol(["ingredient", "name", "material", "raw material"]);
  const weightIdx = findCol(["weight", "grams", "amount", "qty"]);
  const pctIdx = findCol(["percent", "%", "pct", "proportion"]);
  const dilIdx = findCol(["dilution", "dil"]);
  const notesIdx = findCol(["note", "comment", "remark"]);

  // If no name column found, assume first column is name
  const effectiveNameIdx = nameIdx >= 0 ? nameIdx : 0;

  const results: ParsedIngredient[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    const name = (cols[effectiveNameIdx] || "").trim();
    if (!name) continue;

    results.push({
      originalName: name,
      weight: weightIdx >= 0 ? (cols[weightIdx] || "").trim() || null : null,
      percentage: pctIdx >= 0 ? (cols[pctIdx] || "").trim() || null : null,
      dilution: dilIdx >= 0 ? (cols[dilIdx] || "").trim() || null : null,
      notes: notesIdx >= 0 ? (cols[notesIdx] || "").trim() || null : null,
    });
  }
  return results;
}

// ─── Matching logic ─────────────────────────────────────────────────────────

function normalizeIngredientName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[™®©]/g, "")
    .replace(/\s*\(.*?\)\s*/g, " ")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function matchIngredients(
  parsed: ParsedIngredient[],
  library: Array<{ id: number; name: string; casNumber: string | null; description: string | null; category: string | null }>
): MatchResult[] {
  // Build lookup maps
  const exactNameMap = new Map<string, typeof library[0]>();
  const normalizedNameMap = new Map<string, typeof library[0]>();

  for (const ing of library) {
    exactNameMap.set(ing.name.toLowerCase().trim(), ing);
    normalizedNameMap.set(normalizeIngredientName(ing.name), ing);
  }

  return parsed.map(p => {
    const lowerName = p.originalName.toLowerCase().trim();
    const normalizedName = normalizeIngredientName(p.originalName);

    // 1) Exact name match
    const exactMatch = exactNameMap.get(lowerName);
    if (exactMatch) {
      return {
        ...p,
        matchStatus: "exact" as const,
        matchedIngredientId: exactMatch.id,
        matchedIngredientName: exactMatch.name,
        matchConfidence: "high" as const,
        similarityScore: 1.0,
      };
    }

    // 2) Normalized name match (strips TM, parenthetical, etc.)
    const normalizedMatch = normalizedNameMap.get(normalizedName);
    if (normalizedMatch) {
      return {
        ...p,
        matchStatus: "exact" as const,
        matchedIngredientId: normalizedMatch.id,
        matchedIngredientName: normalizedMatch.name,
        matchConfidence: "high" as const,
        similarityScore: 0.95,
      };
    }

    // 3) CAS number match — check if the parsed name looks like a CAS number or contains one
    const casPattern = /\b\d{2,7}-\d{2}-\d\b/;
    const casMatch = p.originalName.match(casPattern);
    if (casMatch) {
      const casNum = casMatch[0];
      const casMapped = library.find(i => i.casNumber === casNum);
      if (casMapped) {
        return {
          ...p,
          matchStatus: "exact" as const,
          matchedIngredientId: casMapped.id,
          matchedIngredientName: casMapped.name,
          matchConfidence: "high" as const,
          similarityScore: 0.95,
        };
      }
    }

    // 4) Fuzzy name similarity
    let bestScore = 0;
    let bestMatch: typeof library[0] | null = null;

    for (const ing of library) {
      const score = stringSimilarity(normalizedName, normalizeIngredientName(ing.name));
      if (score > bestScore) {
        bestScore = score;
        bestMatch = ing;
      }
    }

    // Also check if the parsed name is a substring of a library name or vice versa
    for (const ing of library) {
      const normLib = normalizeIngredientName(ing.name);
      if (normLib.includes(normalizedName) || normalizedName.includes(normLib)) {
        const subScore = Math.max(0.75, bestScore);
        if (subScore > bestScore) {
          bestScore = subScore;
          bestMatch = ing;
        }
      }
    }

    if (bestScore >= 0.7 && bestMatch) {
      return {
        ...p,
        matchStatus: "close" as const,
        matchedIngredientId: bestMatch.id,
        matchedIngredientName: bestMatch.name,
        matchConfidence: bestScore >= 0.85 ? "high" as const : "medium" as const,
        similarityScore: Math.round(bestScore * 100) / 100,
      };
    }

    // No match
    return {
      ...p,
      matchStatus: "none" as const,
      matchedIngredientId: null,
      matchedIngredientName: null,
      matchConfidence: null,
      similarityScore: bestScore > 0 ? Math.round(bestScore * 100) / 100 : null,
    };
  });
}

// ─── Router ─────────────────────────────────────────────────────────────────

export const formulaImportRouter = router({
  // Parse freeform text using AI
  parseText: protectedProcedure
    .input(z.object({ text: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const prompt = `You are an expert perfumer. Parse the following formula text and extract a structured ingredient list.

For each ingredient found, extract:
- name: the ingredient name
- weight: weight in grams (if available, as a number string)
- percentage: percentage of total (if available, as a number string)
- dilution: dilution percentage (if available, as a number string)
- notes: any additional notes

IMPORTANT:
- If weight is given in other units, convert to grams
- If only percentages are given without weights, set weight to null
- If dilution is not mentioned, set it to null (do NOT assume 100%)
- Clean up ingredient names (remove extra whitespace, standardize capitalization)

Input text:
${input.text}

Return a JSON object:
{
  "ingredients": [
    { "name": "string", "weight": "string or null", "percentage": "string or null", "dilution": "string or null", "notes": "string or null" }
  ],
  "formulaName": "string or null",
  "totalWeight": "string or null",
  "solvent": "string or null",
  "calculationBasis": "weight" or "percentage" or "both"
}`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert perfumer and formula parser. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "parsed_formula",
            strict: true,
            schema: {
              type: "object",
              properties: {
                ingredients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      weight: { type: ["string", "null"] },
                      percentage: { type: ["string", "null"] },
                      dilution: { type: ["string", "null"] },
                      notes: { type: ["string", "null"] },
                    },
                    required: ["name", "weight", "percentage", "dilution", "notes"],
                    additionalProperties: false,
                  },
                },
                formulaName: { type: ["string", "null"] },
                totalWeight: { type: ["string", "null"] },
                solvent: { type: ["string", "null"] },
                calculationBasis: { type: "string", enum: ["weight", "percentage", "both"] },
              },
              required: ["ingredients", "formulaName", "totalWeight", "solvent", "calculationBasis"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = result.choices[0]?.message?.content;
      if (!rawContent || typeof rawContent !== "string") throw new Error("AI parsing failed");

      const parsed = JSON.parse(rawContent);
      const ingredients: ParsedIngredient[] = (parsed.ingredients || []).map((i: any) => ({
        originalName: i.name || "",
        weight: i.weight || null,
        percentage: i.percentage || null,
        dilution: i.dilution || null,
        notes: i.notes || null,
      }));

      return {
        ingredients,
        formulaName: parsed.formulaName || null,
        totalWeight: parsed.totalWeight || null,
        solvent: parsed.solvent || null,
        calculationBasis: parsed.calculationBasis || "weight",
      };
    }),

  // Parse CSV text (client reads the file and sends text)
  parseCSV: protectedProcedure
    .input(z.object({ text: z.string().min(1) }))
    .mutation(({ input }) => {
      const ingredients = parseCSVForFormula(input.text);
      return { ingredients };
    }),

  // Parse PDF text (client extracts text and sends it, or sends base64)
  parsePDF: protectedProcedure
    .input(z.object({ text: z.string().min(1) }))
    .mutation(async ({ input }) => {
      // The PDF text has already been extracted on the client side
      // We use AI to parse the extracted text just like freeform text
      const prompt = `You are an expert perfumer. The following text was extracted from a PDF document containing a perfumery formula. Parse it and extract a structured ingredient list.

For each ingredient found, extract:
- name: the ingredient name
- weight: weight in grams (if available, as a number string)
- percentage: percentage of total (if available, as a number string)
- dilution: dilution percentage (if available, as a number string)
- notes: any additional notes

IMPORTANT:
- If weight is given in other units, convert to grams
- If only percentages are given without weights, set weight to null
- If dilution is not mentioned, set it to null (do NOT assume 100%)
- Clean up ingredient names (remove extra whitespace, standardize capitalization)
- The text may contain headers, footers, page numbers — ignore those

Extracted PDF text:
${input.text}

Return a JSON object:
{
  "ingredients": [
    { "name": "string", "weight": "string or null", "percentage": "string or null", "dilution": "string or null", "notes": "string or null" }
  ],
  "formulaName": "string or null",
  "totalWeight": "string or null",
  "solvent": "string or null",
  "calculationBasis": "weight" or "percentage" or "both"
}`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert perfumer and formula parser. Return only valid JSON." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "parsed_formula",
            strict: true,
            schema: {
              type: "object",
              properties: {
                ingredients: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      name: { type: "string" },
                      weight: { type: ["string", "null"] },
                      percentage: { type: ["string", "null"] },
                      dilution: { type: ["string", "null"] },
                      notes: { type: ["string", "null"] },
                    },
                    required: ["name", "weight", "percentage", "dilution", "notes"],
                    additionalProperties: false,
                  },
                },
                formulaName: { type: ["string", "null"] },
                totalWeight: { type: ["string", "null"] },
                solvent: { type: ["string", "null"] },
                calculationBasis: { type: "string", enum: ["weight", "percentage", "both"] },
              },
              required: ["ingredients", "formulaName", "totalWeight", "solvent", "calculationBasis"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = result.choices[0]?.message?.content;
      if (!rawContent || typeof rawContent !== "string") throw new Error("AI parsing failed");

      const parsed = JSON.parse(rawContent);
      const ingredients: ParsedIngredient[] = (parsed.ingredients || []).map((i: any) => ({
        originalName: i.name || "",
        weight: i.weight || null,
        percentage: i.percentage || null,
        dilution: i.dilution || null,
        notes: i.notes || null,
      }));

      return {
        ingredients,
        formulaName: parsed.formulaName || null,
        totalWeight: parsed.totalWeight || null,
        solvent: parsed.solvent || null,
        calculationBasis: parsed.calculationBasis || "weight",
      };
    }),

  // Match parsed ingredients against user's library
  matchIngredients: protectedProcedure
    .input(z.object({
      ingredients: z.array(z.object({
        originalName: z.string(),
        weight: z.string().nullable(),
        percentage: z.string().nullable(),
        dilution: z.string().nullable(),
        notes: z.string().nullable(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      const library = await listIngredients(ctx.user.id);
      const results = matchIngredients(input.ingredients, library);
      return { results };
    }),

  // Get AI substitute suggestions for unmatched ingredients
  suggestSubstitutes: protectedProcedure
    .input(z.object({
      ingredientName: z.string(),
      ingredientNotes: z.string().nullable(),
      basis: z.enum(["as-dosed", "neat-active"]).optional().default("neat-active"),
    }))
    .mutation(async ({ ctx, input }) => {
      const library = await listIngredients(ctx.user.id);

      const libraryList = library.map(i =>
        `- ID:${i.id} | ${i.name} | Category: ${i.category || "N/A"} | Longevity: ${i.longevity ?? "N/A"}/5 | Desc: ${(i.description || "N/A").substring(0, 100)}`
      ).join("\n");

      const basisInstructions = input.basis === "as-dosed"
        ? `SUBSTITUTION BASIS: AS-DOSED (practical/workflow focus)
- Prioritize workflow practicality and dilution realities
- Rank substitutes by how easy they are to work with at typical dosages
- Impact notes (expectedImpact) should emphasize: weighing and handling, dilution compatibility, solvent considerations, practical shelf life
- Consider whether the substitute is commonly available at similar dilutions
- Focus on "drop-in replacement" viability from a practical standpoint`
        : `SUBSTITUTION BASIS: NEAT/ACTIVE (olfactive equivalence focus)
- Prioritize olfactive equivalence and formula balance
- Rank substitutes by how closely they match the olfactory contribution of the neat/active material
- Impact notes (expectedImpact) should emphasize: scent strength, diffusion, longevity, accord balance, sillage
- Focus on matching the olfactory "role" this ingredient plays in the formula`;

      const prompt = `You are an expert perfumer. I need substitute suggestions for an ingredient that is NOT in my library.

Missing ingredient: "${input.ingredientName}"
${input.ingredientNotes ? `Additional context: ${input.ingredientNotes}` : ""}

${basisInstructions}

My available ingredients library:
${libraryList}

Suggest 3 to 5 substitute candidates from my library ONLY. For each:
1. Consider odor descriptors, category placement (top/heart/base), functional role (floralizer, fixative, citrus booster, woody amber, musk, etc.)
2. Consider any "similar to" or comparison data
3. Provide a confidence level (high, medium, low)
4. If confidence is low, note "low confidence, user confirmation recommended"
5. If no reasonable substitute exists, return an empty array
6. Write the explanation and expectedImpact based on the ${input.basis === "as-dosed" ? "as-dosed practical" : "neat/active olfactive"} criteria above

Return JSON:
{
  "suggestions": [
    {
      "ingredientId": <number from the ID field>,
      "name": "<ingredient name>",
      "confidence": "high" | "medium" | "low",
      "explanation": "<why this is a good substitute>",
      "expectedImpact": "<how the formula will be affected>"
    }
  ],
  "noSubstituteReason": "<if no substitutes found, explain why, otherwise null>"
}`;

      const result = await invokeLLM({
        messages: [
          { role: "system", content: "You are an expert perfumer. Return only valid JSON. Do not hallucinate supplier data, availability, or regulatory limits." },
          { role: "user", content: prompt },
        ],
        response_format: {
          type: "json_schema",
          json_schema: {
            name: "substitute_suggestions",
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
                      confidence: { type: "string", enum: ["high", "medium", "low"] },
                      explanation: { type: "string" },
                      expectedImpact: { type: "string" },
                    },
                    required: ["ingredientId", "name", "confidence", "explanation", "expectedImpact"],
                    additionalProperties: false,
                  },
                },
                noSubstituteReason: { type: ["string", "null"] },
              },
              required: ["suggestions", "noSubstituteReason"],
              additionalProperties: false,
            },
          },
        },
      });

      const rawContent = result.choices[0]?.message?.content;
      if (!rawContent || typeof rawContent !== "string") return { suggestions: [], noSubstituteReason: "AI analysis failed" };

      try {
        const parsed = JSON.parse(rawContent);
        // Validate ingredient IDs exist in library
        const validIds = new Set(library.map(i => i.id));
        parsed.suggestions = (parsed.suggestions || []).filter((s: any) => validIds.has(s.ingredientId));
        return parsed;
      } catch {
        return { suggestions: [], noSubstituteReason: "Failed to parse AI response" };
      }
    }),

  // Save the analyzed formula
  saveImportedFormula: protectedProcedure
    .input(z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      solvent: z.string().optional(),
      solventWeight: z.string().optional(),
      sourceType: z.enum(["pasted", "csv", "pdf"]),
      originalData: z.string(),
      ingredients: z.array(z.object({
        ingredientId: z.number(),
        weight: z.string(),
        dilutionPercent: z.string().optional(),
        note: z.string().optional(),
        originalName: z.string(),
        matchType: z.enum(["exact", "close", "substitute", "manual", "unresolved"]),
        matchConfidence: z.enum(["high", "medium", "low"]).optional(),
        substitutionReason: z.string().optional(),
      })),
    }))
    .mutation(async ({ ctx, input }) => {
      // Create the formula with import metadata
      const formulaId = await createFormula({
        name: input.name,
        description: input.description || `Imported and Analyzed (${input.sourceType})`,
        userId: ctx.user.id,
        solvent: input.solvent,
        solventWeight: input.solventWeight,
        sourceType: input.sourceType,
        importedAt: new Date(),
        originalData: input.originalData,
      });

      // Add ingredients with matching metadata
      let addedCount = 0;
      for (const item of input.ingredients) {
        await addFormulaIngredient({
          formulaId,
          ingredientId: item.ingredientId,
          weight: item.weight,
          dilutionPercent: item.dilutionPercent,
          note: item.note,
          originalName: item.originalName,
          matchType: item.matchType,
          matchConfidence: item.matchConfidence || null,
          substitutionReason: item.substitutionReason || null,
        });
        addedCount++;
      }

      // Auto-save v1: create initial version snapshot
      try {
        await createFormulaVersion(formulaId, ctx.user.id, "auto-save: Import Formula");
      } catch (e) {
        console.warn("Failed to create auto-save version on import:", e);
      }

      return { formulaId, addedCount };
    }),
});
