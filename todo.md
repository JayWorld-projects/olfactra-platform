# Project TODO

- [x] Database schema for raw materials, formulas, formula entries, dilutions
- [x] Global theming and design system (dark mode, perfumery-inspired palette)
- [x] Dashboard layout with sidebar navigation
- [x] Raw materials library with ingredient cards (Name, CAS, Supplier, Category, Inventory, Cost/g, IFRA limit, Longevity, Description)
- [x] CSV/TSV import functionality to upload and parse ingredient lists
- [x] Ingredient editing interface (add, update, delete with all fields)
- [x] Supplier dropdown and category selection management
- [x] Cost calculator for raw materials
- [x] Formula builder with ingredient selection from library
- [x] Formula entry weights with 3 decimal place precision
- [x] Dilution management for formula entries
- [x] Formula scaling engine (scale by factor, target weight, target concentration)
- [x] Preserve weight/percentage/exchange solvent scaling methods
- [x] Fragrance pyramid visualization (5 substantivity levels)
- [x] Formula category breakdown visualization
- [x] Formula export to Markdown, CSV/TSV
- [x] Usage tracking table on ingredient cards (formulas using material, sorted by concentration)
- [x] Scent concept to formula generator (AI-powered, describe memory/place → ingredient suggestions)
- [x] Ingredient information retrieval (AI-powered deep info on demand)
- [x] Seed database with user's 282-ingredient JayLabs library from TSV
- [x] Vitest unit tests for server-side procedures
- [x] Fix: User unable to log into the site
- [x] Fix: Login loop persists after first OAuth fix - cookie not being retained by browser (added localStorage token fallback)
- [x] Redesign: Jacksonville Jaguars color palette (teal #006778, gold #D7A22A, black #101820)
- [x] Redesign: Modernize UI with cleaner layout, better spacing, and visual hierarchy
- [x] Redesign: Simplify navigation for easy understanding
- [x] Redesign: Update all pages (Dashboard, Library, Formulas, Scent Lab, Import, Ingredient Detail)
- [x] Redesign: Dark theme with teal/gold accents
- [x] Feature: Favorites/Frequently Used section on Library page with star toggle and quick-access panel
- [x] Feature: PDF export for formulas with JayLabs branding
- [x] Feature: Batch inventory update mode on Library page for bulk stock quantity editing
- [x] Feature: Multi-product recipe generation from scent concepts (perfume, candles, lotions, body wash, incense, body sprays, humidifier oils)
- [x] Update AI prompt to generate recipes for all 7 product types
- [x] Redesign Scent Lab UI to display tabbed/sectioned multi-product results
- [x] Feature: Selectable product types before generation (only generate what you want)
- [x] Feature: Proper post-generation filtering (All shows everything, clicking a type shows only that recipe)
- [x] Feature: Save AI-generated recipes to main formula list
- [x] Feature: Clone Formula - duplicate an existing formula with all ingredients into a new editable copy
- [x] Feature: Formula Comparison View - side-by-side comparison of two formulas showing shared/unique ingredients
- [x] Fix: Scent Lab recipe generation not returning any formulas when user clicks Generate (was working, user confirmed)
- [x] Feature: Scent Lab generation history - persist past generations in database
- [x] Feature: Retrieve and view past Scent Lab generations
- [x] Feature: Save complete generation (all recipes at once) to formulas list
- [x] Feature: Add date/time stamps to saved recipes and generation history
- [x] Fix: Scent Lab product type selection and filtering is buggy and not functioning correctly
- [x] Fix: Some product recipes returning with zero ingredients after generation
- [x] Fix: Formula builder - unable to correctly change weight, dilution, or percentage values (local state with blur-to-save)
- [x] Feature: Save changes button on formula builder (auto-saves on blur)
- [x] Feature: Rename formula from formula builder (click name to edit inline)
- [x] Feature: Duplicate formula from formula builder (Duplicate button with name dialog)
- [x] Feature: Formula tagging/labeling system (e.g., "Spring 2026", "Client A") with tag manager dialog
- [x] Feature: Formula notes/journal with timestamped entries for recording observations
- [x] Feature: Random inspiration prompt generator on Scent Lab page (46 prompts across 6 categories with shuffle)
- [x] Feature: Workspace system - create named workspaces with all or selected ingredients
- [x] Feature: Workspace database schema (workspaces table + workspace_ingredients junction table)
- [x] Feature: Workspace CRUD operations (create, read, update, delete)
- [x] Feature: Workspace management page with ingredient selection UI
- [x] Feature: Workspace switcher in sidebar/header for quick context switching
- [x] Feature: Filter Library, Formula Builder, and Scent Lab by active workspace
- [x] Feature: Ingredient cost tracking per formula - cost breakdown showing total formula cost based on weights and cost-per-gram
- [x] Feature: Cost breakdown tab in Formula Builder with summary cards, bottle estimates, per-ingredient table, and category breakdown
- [x] Fix: Handle N/A display for ingredients missing cost data in cost breakdown
- [x] Feature: New formula creation flow - select multiple ingredients at once (no weights)
- [x] Feature: Enter a scent idea/concept for the selected ingredients
- [x] Feature: AI auto-generate formula with weights from selected ingredients + idea
- [x] Feature: Save generated formula and continue generating more variations from same idea
- [x] Feature: Multi-step wizard UI (pick ingredients → enter idea → generate → save/regenerate)
- [x] Fix: AI ingredient ID matching with name-based fallback for reliable formula generation
- [x] Feature: Formula version history - save snapshots each time a formula is edited
- [x] Feature: Expand version details to view full ingredient snapshot
- [x] Feature: Revert formula to a previous version with confirmation dialog
- [x] Feature: Version history tab in Formula Builder with save/expand/revert/delete
- [x] Feature: AI ingredient substitution suggestions - suggest similar alternatives from library with match %, cost comparison, and reasoning
- [x] Feature: Substitution dialog in Formula Builder with one-click swap-in-place functionality
- [x] Rebrand: Change platform name from "JayLabs Perfumery" to "Olfactra" (all 10 page references updated)
- [x] Rebrand: Switch from dark theme to white/light background design (light theme with deep purple accents)
- [x] Rebrand: Upload new Olfactra logo to S3 CDN
- [x] Rebrand: Update all page references, sidebar, headers, and meta titles to Olfactra
- [x] Rebrand: Verify text visibility and contrast on light background across all pages (Dashboard, Library, Formulas, Scent Lab, Workspaces)

## UPGRADE 1: ENHANCE EXISTING NOTES, BULK DILUTION, AND LIVE TOTALS

- [x] Feature: AI-generated notes append-only block with structured content (server procedure added)
- [x] Feature: Copy AI Notes to Manual Notes button to create editable version (implemented and tested)
- [x] Feature: Lock AI Generated Notes block from direct editing (read-only blue card with LockKeyhole icon)
- [x] Feature: Regenerate AI notes updates only AI block, preserves manual notes (implemented)
- [x] Feature: Bulk Set Universal Dilution % control with Apply button (implemented and tested)
- [x] Feature: Per-ingredient dilution override after universal dilution applied (editable cells remain independent)
- [x] Feature: Real-time recalculation of totals and percentages on weight/dilution changes (useMemo calculations)
- [x] Feature: Display both as-dosed and neat/active weight calculations (concentrateWeightNeat computed)
- [x] Feature: Toggle between As-dosed and Neat/active percentage views (default As-dosed) (tested)
- [x] Feature: Normalize to 100% button with option to choose normalization basis (as-dosed default)
- [x] Feature: Warning when percentages do not equal 100% (amber warning with sum display)

## NEXT STEPS: AI NOTES UI + AUTO-SAVE V1

- [x] Feature: Read-only/locked AI Generated Notes block in Notes tab (blue card with lock indicator)
- [x] Feature: Copy AI Notes to Manual Notes button with formatting preservation (copies with timestamp marker)
- [x] Feature: Verify manual notes remain fully editable after copy (independent from AI block)
- [x] Feature: Regenerate AI notes updates only AI block, never overwrites manual notes (separate note entries)
- [x] Feature: Lightweight auto-save v1 - snapshot on Save button click (auto-save: Save timestamp)
- [x] Feature: Lightweight auto-save v1 - snapshot on Add/Remove Ingredient (auto-save: Add/Remove Ingredient timestamp)
- [x] Feature: Auto-snapshots include full ingredient list with weights and dilution %
- [x] Feature: Manual version snapshots still available via Save Snapshot button


## AUTO-SAVE V1 TRIGGER EXPANSION

- [x] Feature: Auto-snapshot on Apply Universal Dilution % (already wired in previous phase)
- [x] Feature: Auto-snapshot on Normalize to 100% (already wired in previous phase)
- [x] Feature: Auto-snapshot on Manual Save action (Save button added to formula header)
- [x] Feature: Auto-snapshot on Scale Formula (added with scale method and value in label)
- [x] Feature: Auto-snapshot on Import Formula (Upgrade Prompt 2 — wired in formulaImport.saveImportedFormula)
- [x] Feature: Auto-snapshot on Generate Product Version (Upgrade Prompt 3 — wired in derivedFormula.saveDerivedFormula)
- [x] Verify: Snapshot payload confirmed — includes formula id, version number, timestamp, action type label, and full ingredient table (name, category, weight, dilution %, solvent, total weight)

## UPGRADE 2: FORMULA IMPORT, ANALYSIS, MATCHING, AND SUBSTITUTION

- [x] Feature: Formula input via pasted text (freeform AI parsing)
- [x] Feature: Formula input via CSV upload (structured column mapping)
- [x] Feature: Formula input via PDF upload (text extraction + AI parsing)
- [x] Feature: Column mapping preview for ambiguous CSV/PDF structures
- [x] Feature: Formula parsing and standardization (normalize units, preserve originals)
- [x] Feature: Parsed preview table before matching begins
- [x] Feature: Ingredient matching against library (exact name, synonym, CAS, fuzzy)
- [x] Feature: Match status display (exact match, close match, no match)
- [x] Feature: AI-powered substitute suggestions for unmatched ingredients (3-5 candidates)
- [x] Feature: Substitute confidence levels (high, medium, low) with explanations
- [x] Feature: Match Report UI with sections (matched, unmatched, substitutions)
- [x] Feature: User actions on match report (accept substitute, choose different, leave unresolved, manual map)
- [x] Feature: Save analyzed formula with original data, resolved mappings, and metadata
- [x] Feature: Store sourceType, importedAt, originalData on formulas table
- [x] Feature: Store originalName, matchType, matchConfidence, substitutionReason on formula_ingredients table
- [x] Feature: Mark imported formulas as "Imported and Analyzed"
- [x] Feature: Multi-step import wizard UI on /import page (Input → Preview → Match Report → Save)
- [x] Tests: Server-side tests for parsing, matching, and substitution procedures (12 tests, all passing)

## ADD-ON: SUBSTITUTION BASIS TOGGLE (AS-DOSED VS NEAT/ACTIVE)

- [x] Feature: Add substitutionBasis parameter to server-side substitution procedures (as-dosed vs neat/active)
- [x] Feature: As-dosed basis prioritizes workflow practicality, dilution realities, weighing/handling impact notes
- [x] Feature: Neat/active basis prioritizes olfactive equivalence, formula balance, strength/diffusion/longevity impact notes
- [x] Feature: Substitution Basis toggle in Formula Builder substitution dialog (default: Neat/active)
- [x] Feature: Substitution Basis toggle in Import Match Report substitute suggestions (default: Neat/active)
- [x] Feature: Switching basis and regenerating produces different ranking/impact explanations
- [x] Feature: Toggle does NOT change formula values — only affects substitution ranking and impact notes
- [x] Tests: Server-side tests for basis-aware substitution procedures (4 new tests, all passing)

## UPGRADE 3: DERIVED PRODUCT FORMULAS

- [x] Schema: Add parentFormulaId, productType, fragranceLoadPercent, batchSize, batchSizeUnit, mixingProcedure to formulas table
- [x] Schema: Push migrations for new nullable fields
- [x] Server: Calculation logic (fragrance_mass, carrier_mass, ingredient scaling, carrier selection by product type)
- [x] Server: Density conversion assumptions for unit handling (ml→g for ethanol, carrier oil, etc.)
- [x] Server: AI-generated step-by-step mixing procedure per product type
- [x] Server: Save derived formula with status "Derived" and all metadata (parentFormulaId, productType, fragranceLoadPercent, batchSize, batchSizeUnit, mixingProcedure)
- [x] Server: Auto-snapshot on derived formula creation
- [x] Server: Warning when deleting a parent formula that has derived children (no cascade delete)
- [x] UI: "Generate Product Version" button in Formula Builder header toolbar
- [x] UI: Multi-step dialog (Product Type → Batch Size → Fragrance Load → Preview & Save)
- [x] UI: Product type selection with recommended fragrance load defaults
- [x] UI: Batch size input with unit selection (ml, g, oz, kg)
- [x] UI: Fragrance load % input with recommended range per product type
- [x] UI: Full formula preview with fragrance ingredients, carrier components, total batch confirmation
- [x] UI: Mixing procedure display in preview
- [x] UI: "Derived" badge on formula list for derived formulas
- [x] UI: Parent formula link on derived formulas (clickable back-link)
- [x] UI: "Has derivatives" indicator on parent formulas in list
- [x] UI: Info banner on derived Formula Builder view ("Derived from [Parent Name]")
- [x] UI: Mixing Procedure section in derived formula view
- [x] Tests: Server-side tests for derived formula calculation and saving procedures (18 tests, all passing)
