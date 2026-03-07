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

## UI REFINEMENT v1.1: VISUAL STYLING

- [x] Typography: Adjust font weights, sizes, line heights, heading hierarchy for readability
- [x] Color: Refine semantic color tokens, improve contrast, align with Olfactra brand (calm, precise, professional)
- [x] Tables: Improve spacing, alignment, and density in Formula Builder, Library, and Import pages
- [x] Toggles: Improve visual clarity of calculated vs editable fields
- [x] Verify: All changes compatible with v1.0 manual (no workflow, logic, or behavior changes)

## UI REFINEMENT v1.2: SIDEBAR & MICRO-ANIMATIONS

- [x] Sidebar: Refine item spacing, padding, and vertical rhythm
- [x] Sidebar: Improve active state contrast and hover transitions
- [x] Sidebar: Adjust icon sizing and alignment
- [x] Sidebar: Refine user profile area at bottom
- [x] Animations: Smooth tab switch transitions
- [x] Animations: Card hover and entrance transitions
- [x] Animations: Dialog open/close transitions
- [x] Verify: All changes compatible with v1.0 manual (no new concepts, labels, or behaviors)

## UI REFINEMENT v1.3: IFRA BANNER & LOADING SKELETON

- [x] IFRA banner: Soften corners and integrate with card aesthetic
- [x] IFRA banner: Maintain clear amber warning visibility
- [x] Skeleton: Formula Builder loading skeleton with layout-matched placeholders
- [x] Skeleton: Calm, non-distracting appearance (no flashy shimmer)
- [x] Verify: No new wording, behaviors, or controls introduced
- [x] Verify: All changes compatible with v1.0 manual

## UI REFINEMENT v1.4: LIBRARY/IMPORT SKELETONS & COMPARISON STYLING

- [x] Skeleton: Library page loading skeleton with layout-matched placeholders
- [x] Skeleton: Import page loading skeleton (component created, Import uses DashboardLayoutSkeleton for auth)
- [x] Skeleton: Same calm pulse animation as Formula Builder skeleton
- [x] Comparison: Align spacing, table styling, and card hierarchy with v1.1–v1.3 aesthetics
- [x] Verify: No new logic, controls, metrics, or terminology
- [x] Verify: All changes compatible with v1.0 manual

## UI REFINEMENT v1.5: FORMULA LIST SKELETON & SCENT LAB STYLING

- [x] Skeleton: FormulaList page loading skeleton with layout-matched card grid placeholders
- [x] Skeleton: Same calm pulse animation as other skeletons
- [x] Scent Lab: Refine generation wizard styling (input area, product type selectors)
- [x] Scent Lab: Refine result cards and recipe display to match v1.1–v1.4 aesthetics
- [x] Scent Lab: Align table headers, spacing, and card hierarchy
- [x] Verify: No changes to logic, workflows, terminology, or order of operations
- [x] Verify: All changes compatible with v1.0 manual

## BUG FIXES

- [ ] Bug: Platform stuck on loading page when previewing

## UPGRADE 4: LIBRARY ENHANCEMENTS + INGREDIENT USAGE TRACE + IFRA WARNING EMPHASIS

### Phase 1: Data Model Changes
- [x] Schema: Add manualNotes (text, nullable) to ingredients table
- [x] Schema: Add aiNotes (text, nullable) to ingredients table
- [x] Schema: Add manualNotesUpdatedAt (datetime, nullable) to ingredients table
- [x] Schema: Add aiNotesUpdatedAt (datetime, nullable) to ingredients table
- [x] Schema: Add lastEditedAt (datetime, nullable) to ingredients table
- [x] Schema: Add lastEditedBySource (text, nullable, default 'user') to ingredients table
- [x] Schema: Push migration with no breaking changes

### Phase 2: Library List View Cleanup
- [x] UI: Library list rows show ingredient name only (primary text)
- [x] UI: Keep existing category grouping headers/colors
- [x] UI: No secondary metadata text lines on list rows
- [x] UI: Keep search behavior unchanged

### Phase 3A: Ingredient Detail — Header + Properties Card
- [x] UI: Show ingredient name, CAS, FEMA, category, supplier in header card
- [x] UI: Properties editable inline or via Edit button
- [x] Server: Update lastEditedAt and lastEditedBySource=user on property edit

### Phase 3B: Ingredient Detail — Notes Section
- [x] UI: Manual Notes tab/block (editable, user can type and save)
- [x] Server: Update manualNotesUpdatedAt and lastEditedAt on manual notes save
- [x] UI: AI Notes block with "Generate AI Ingredient Notes" button
- [x] Server: AI notes generation procedure (structured ingredient info)
- [x] UI: AI Notes block is read-only by default
- [x] UI: "Copy AI Notes to Manual Notes" button (same pattern as formula AI notes)
- [x] Server: Update aiNotesUpdatedAt, lastEditedAt, lastEditedBySource=ai on AI generate/save
- [x] Behavior: Regenerating AI notes never overwrites manual notes

### Phase 3C: Description Formatting Improvement
- [x] UI: Display description with preserved line breaks
- [x] UI: Format single-blob descriptions into readable paragraphs and bullet points
- [x] UI: If user edits description, store as plain text with preserved line breaks

### Phase 3D: Usage in Formulas Section
- [x] Server: Query formulas using this ingredient by ingredientId
- [x] UI: "Usage in Formulas" section showing formula name (clickable), weight, dilution %, % of total
- [x] UI: Default to as-dosed basis
- [x] UI: Works for created, imported, and derived formulas

### Phase 3E: Dilutions List
- [x] Verify: Existing dilution management remains intact and unbroken

### Phase 4: Traceability
- [x] UI: Show Date Added timestamp in ingredient detail
- [x] UI: Show Last Edited timestamp (lastEditedAt) in ingredient detail
- [x] UI: Show Manual Notes Updated timestamp (manualNotesUpdatedAt) in ingredient detail
- [x] UI: Show AI Notes Updated timestamp (aiNotesUpdatedAt) in ingredient detail
- [x] Behavior: AI generation sets lastEditedBySource=ai

### Phase 5: IFRA Warning Red Text
- [x] UI: IFRA warning text color set to red in Formula Builder
- [x] UI: IFRA warning text color set to red in any other formula views (FormulaCompare only has ifraLimit in type def, no warning display)
- [x] UI: Keep existing banner styling, only change warning text color (changed amber to red)
- [x] UI: Do not change compliance logic (logic unchanged)

### Quality Bar
- [x] Tests: Ingredient notes save and regenerate behavior (8 tests passing)
- [x] Tests: Last edited timestamps and sources (covered in ingredient-notes.test.ts)
- [x] Tests: Usage in formulas query correctness (existing getIngredientUsage tested via mock)
- [x] Tests: Editable properties persistence (covered by update traceability test)
- [x] Tests: IFRA warning red text rendering (visual change, verified in code)
- [x] Verify: All 56 tests pass across 5 test files (2 corrupted test files from hibernation removed/recreated)
- [x] Verify: Server compiles cleanly (TypeScript: No errors, LSP: No errors)

## UPGRADE 4B: AI NOTES TESTING + PYRAMID SELECTOR + DILUTION TRACKING

### AI Notes End-to-End Testing
- [x] Test AI Notes generation on real ingredients via browser
- [x] Test Copy AI Notes to Manual Notes flow via browser
- [x] Verify AI notes are read-only by default
- [x] Verify manual notes remain untouched after AI regeneration

### Fragrance Pyramid Position Selector
- [x] Schema: Add pyramidPosition field to ingredients table (enum: top, top-heart, heart, heart-base, base, unknown)
- [x] Server: Include pyramidPosition in ingredient CRUD procedures
- [x] UI: Add visual pyramid position selector to ingredient detail view
- [x] UI: Selector shows 6 positions with icons (Top, Top-Heart, Heart, Heart-Base, Base, Unknown)
- [x] UI: Clicking a position saves immediately (optimistic update)

### Dilution Tracking Section
- [x] Schema: Create ingredient_dilutions table (id, ingredientId, userId, percentage, solvent, dateCreated, notes)
- [x] Server: CRUD procedures for dilutions (list, add, update, delete)
- [x] UI: Dilutions section in ingredient detail with add form
- [x] UI: Table showing concentration, solvent, date, and delete action
- [x] UI: Default note that neat (100%) is assumed] UI: Default 100% neat entry shown if no dilutions exist

### Quality Bar
- [x] Tests: Pyramid position save/update (3 tests passing)
- [x] Tests: Dilution CRUD operations (3 tests passing)
- [x] Verify: All existing tests still pass (62 total across 5 files)
- [x] Verify: Server compiles cleanly (TypeScript: No errors, LSP: No errors)

## UX: COLLAPSIBLE NOTES SECTIONS
- [x] UI: Manual Notes section collapsible with expand/minimize toggle
- [x] UI: AI Generated Notes section collapsible with expand/minimize toggle
- [x] UI: Default state — collapsed showing 2-line preview; expanded when editing or clicking
- [x] UI: Hover transitions on expand/collapse with chevron indicators

## FEATURE: CATEGORY MANAGER PAGE
### Schema + Server
- [x] Schema: Create ingredient_categories table (id, userId, name, color, sortOrder, createdAt)
- [x] Server: CRUD procedures for categories (list, create, rename, updateColor, reorder, delete)
- [x] Server: Seed procedure to auto-populate from existing ingredient categories + CATEGORY_COLORS
- [x] Server: Category deletion handling (warns if ingredients assigned, deletes record)

### Category Manager Page UI
- [x] UI: Dedicated /categories route with sidebar nav entry
- [x] UI: List all categories with color dot, name, and ingredient count
- [x] UI: Create new category with name and color picker
- [x] UI: Inline rename category (Enter to save, Escape to cancel)
- [x] UI: Color picker with 28 preset colors + custom hex input
- [x] UI: Delete category with confirmation dialog (warns about assigned ingredients)
- [x] UI: Visual style consistent with Olfactra design language

### Integration
- [x] Nav: Add Categories entry to sidebar navigation (Palette icon)
- [x] Route: /categories registered in App.tsx
- [x] Integration: Library page category headers use colors from categories table
- [x] Integration: Ingredient detail category badge uses color from categories table

### Quality Bar
- [x] Tests: Category CRUD operations (9 tests passing)
- [x] Tests: Category rename propagation (covered in rename test)
- [x] Verify: All 71 tests pass across 6 test files
- [x] Verify: Server compiles cleanly (TypeScript: No errors)

## FIX: ALL IFRA LIMIT WARNING TEXT IN RED
- [x] Audit all IFRA warning/limit text across all pages (6 files checked)
- [x] Update all IFRA warning text to red color
- [x] Verify no IFRA warning text remains in non-red color
  - FormulaBuilder: IFRA warnings banner already red (from Upgrade 4)
  - IngredientDetail: IFRA Limit label + value now red in properties card and edit form
  - Library: IFRA Limit label + input now red in add ingredient form
  - ImportPage: IFRA column header + cell values now red
  - FormulaCompare: ifraLimit only in type definition, not rendered — no change needed

## FEATURE: ACCORD BUILDER AI

### Phase 1: Data Model
- [x] Schema: Create accords table (id, userId, name, description, scentFamily, estimatedLongevity, explanation, createdAt)
- [x] Schema: Create accord_ingredients table (id, accordId, ingredientId, percentage)
- [x] Push migration with no breaking changes

### Phase 2: Server CRUD
- [x] Server: List accords procedure (with ingredients populated)
- [x] Server: Get single accord procedure
- [x] Server: Save accord procedure
- [x] Server: Delete accord procedure
- [x] Server: Update accord procedure

### Phase 3: AI Accord Generation
- [x] Server: Generate accord from prompt procedure
- [x] Server: Generate variations (3-5) from prompt
- [x] Server: Only use ingredients from user's library
- [x] Server: Reference ingredient metadata (category, description, pyramid position, longevity)
- [x] Server: Each accord has 3-7 ingredients with percentages summing to 100%
- [x] Server: Include educational explanation for each accord
- [x] Server: Include dominant scent family and estimated longevity

### Phase 4: Accord Builder Page UI
- [x] UI: New /accord-builder route
- [x] UI: Prompt field with placeholder "Create a creamy sandalwood accord"
- [x] UI: Generate Accord button (with variation count selector 1-5)
- [x] UI: Generate Variations via variation count selector
- [x] UI: Display area for generated accord cards (expandable)
- [x] UI: Each card shows: name, ingredient list with %, scent family, longevity, explanation
- [x] UI: "Save Accord" button on each card
- [x] UI: "Send to Formula Builder" button on each card
- [x] UI: Loading states during AI generation
- [x] UI: Example prompt suggestions (quick-fill buttons)

### Phase 5: Accord Library
- [x] UI: Saved accords section/tab on Accord Builder page
- [x] UI: List saved accords with name, description, ingredient count, date
- [x] UI: Click to expand/view accord details
- [x] UI: Delete saved accord
- [x] UI: Send saved accord to Formula Builder

### Phase 6: Formula Builder Integration
- [x] Server: Create formula from accord procedure (creates new formula draft with accord ingredients)
- [x] UI: "Send to Formula Builder" creates new formula draft and navigates to it
- [x] Verify: Existing formula logic unchanged (no existing code modified)

### Phase 7: Navigation
- [x] Nav: Add "Accord Builder" to sidebar navigation (Music icon)
- [x] Route: Register /accord-builder in App.tsx

### Quality Bar
- [x] Tests: Accord generation procedure (3 tests passing)
- [x] Tests: Accord save/delete operations (3 tests passing)
- [x] Tests: Accord to formula insertion (1 test passing)
- [x] Verify: All 78 tests pass across 7 test files
- [x] Verify: Server compiles cleanly (TypeScript: No errors)

## FEATURE: ACCORD INGREDIENT EDITING

### Inline Percentage Editing
- [x] UI: Make ingredient percentages editable inline on accord cards (generated + saved)
- [x] UI: Show running total percentage with visual indicator (green if 100%, amber/red otherwise)
- [x] UI: "Normalize" button to recalculate percentages to sum to 100%
- [x] UI: Preserve accord name, description, scent family, longevity, and explanation during edits
- [x] UI: Allow removing an ingredient from an accord (minimum 1 ingredient guard)

### Ingredient Swap
- [x] UI: "Swap" button on each ingredient row in an accord card
- [x] Server: New accord.suggestSwap procedure (AI-powered, accord-context-aware substitution)
- [x] UI: Show swap suggestions from user's library with match %, cost comparison, and reasoning
- [x] UI: Selecting a swap replaces the ingredient, keeps the percentage
- [x] UI: Accord identity (name, explanation) preserved after swap unless regenerated

### Normalization
- [x] Logic: Normalize percentages proportionally to sum to exactly 100%
- [x] Logic: Handle edge cases (single ingredient, all zero, etc.)
- [x] UI: Visual feedback when total drifts from 100% (amber badge + Normalize button appears)

### Quality Bar
- [x] Tests: suggestSwap procedure (5 tests — suggestions returned, required fields, valid IDs, excludes accord ingredients, cost comparison values)
- [x] Tests: sendToFormula with edited percentages (3 tests — weight calculation, swapped IDs, decimal normalization)
- [x] Tests: save with edited ingredients (3 tests — non-round percentages, swapped ingredient, reduced ingredient count)
- [x] Verify: All 89 tests pass across 8 test files
- [x] Verify: Formula Builder logic unchanged
- [x] Verify: Server compiles cleanly (TypeScript: No errors)

## PRE-GITHUB SECURITY AND DEPLOYMENT PREP

### Phase 1: Secret Audit
- [x] Search entire project for hardcoded secrets (API keys, DB creds, auth secrets, tokens)
- [x] Produce audit report: secrets found, file paths, remediation status (docs/secret-audit-report.md)

### Phase 2: Environment Variable Setup
- [x] Create .env.example with all required variable names (blank values) — docs/env-example.txt
- [x] Ensure app loads env vars correctly in dev and production (already uses server/_core/env.ts)
- [x] No hardcoded secrets found — all already use env var access

### Phase 3: Git Safety
- [x] Ensure .gitignore covers .env, .env.*, .manus/, .manus-logs/, client/public/__manus__/, build artifacts
- [x] Confirm .env.example is NOT ignored (!.env.example rule added)
- [x] Flagged and removed: .manus/db/ query logs (15 files with DB host/user), client/public/__manus__/ debug collector

### Phase 4: Code Updates
- [x] No code changes needed — all secrets already read from env vars via server/_core/env.ts
- [x] Behavior identical — no feature logic changes
- [x] Frontend only exposes VITE_* prefixed vars (public by Vite convention)

### Phase 5: Deployment Readiness
- [x] Created docs/deployment.md with full env var documentation
- [x] Documented required vars, purpose, local setup, Cloudflare setup
- [x] GitHub prep checklist and Cloudflare deployment checklist included

### Phase 6: Validation
- [x] TypeScript check: 0 errors
- [x] Test suite: 89 tests passing across 8 files, 0 regressions
- [x] Production build: successful (37.65s)
- [x] Final summary produced (see delivery message)

## GIT HISTORY PURGE (Pre-GitHub Export)

- [x] .manus/db/ and client/public/__manus__/ already removed from git index (previous checkpoint)
- [x] .gitignore blocks .manus/, .manus-logs/, client/public/__manus__/ going forward
- [x] Redacted DB hostname, username, and DB name from docs/secret-audit-report.md
- [x] Note: git-filter-repo history rewrite incompatible with Manus checkpoint system — use BFG Repo Cleaner after GitHub export to purge old commits if needed
- [x] Save clean checkpoint before GitHub export
