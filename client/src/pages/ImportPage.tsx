import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import {
  Upload, FileText, CheckCircle, AlertCircle, Loader2, ClipboardPaste,
  FileSpreadsheet, FileType, ArrowRight, ArrowLeft, Search, Replace,
  ChevronDown, ChevronUp, AlertTriangle, Save, Sparkles, X, Check,
  HelpCircle, Link2, Unlink2, Eye
} from "lucide-react";
import { useState, useRef, useCallback, useMemo } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

// ─── Types ──────────────────────────────────────────────────────────────────

type ParsedIngredient = {
  originalName: string;
  weight: string | null;
  percentage: string | null;
  dilution: string | null;
  notes: string | null;
};

type MatchResult = ParsedIngredient & {
  matchStatus: "exact" | "close" | "none";
  matchedIngredientId: number | null;
  matchedIngredientName: string | null;
  matchConfidence: "high" | "medium" | "low" | null;
  similarityScore: number | null;
};

type SubstituteSuggestion = {
  ingredientId: number;
  name: string;
  confidence: "high" | "medium" | "low";
  explanation: string;
  expectedImpact: string;
};

type UserDecision = {
  action: "accept" | "substitute" | "manual" | "unresolved";
  ingredientId: number | null;
  ingredientName: string | null;
  matchType: "exact" | "close" | "substitute" | "manual" | "unresolved";
  matchConfidence: "high" | "medium" | "low" | null;
  substitutionReason: string | null;
};

type WizardStep = "input" | "preview" | "match" | "save";

// ─── CSV Parsing (client-side for ingredient library import) ────────────────

type LibraryParsedRow = {
  name: string;
  casNumber: string;
  supplier: string;
  category: string;
  inventoryAmount: string;
  costPerGram: string;
  ifraLimit: string;
  longevity: number;
  description: string;
};

function parseTSV(text: string): LibraryParsedRow[] {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const rows: LibraryParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.length < 1 || !cols[0]?.trim()) continue;
    const extraDesc = cols.slice(8).filter(c => c.trim()).join(" ").trim();
    const mainDesc = (cols[8] || "").trim();
    const fullDesc = [mainDesc, extraDesc].filter(Boolean).join(" ");
    rows.push({
      name: (cols[0] || "").trim(),
      casNumber: (cols[1] || "").trim(),
      supplier: (cols[2] || "").trim(),
      category: (cols[3] || "").trim(),
      inventoryAmount: (cols[4] || "").trim(),
      costPerGram: (cols[5] || "").trim(),
      ifraLimit: (cols[6] || "").trim(),
      longevity: parseInt(cols[7] || "2") || 2,
      description: fullDesc,
    });
  }
  return rows;
}

function parseCSVLib(text: string): LibraryParsedRow[] {
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
      else if (ch === ",") { current.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        current.push(field); field = "";
        if (current.some(c => c.trim())) lines.push(current);
        current = [];
      } else { field += ch; }
    }
  }
  current.push(field);
  if (current.some(c => c.trim())) lines.push(current);
  if (lines.length < 2) return [];
  const header = lines[0].map(h => h.trim().toLowerCase());
  const rows: LibraryParsedRow[] = [];
  const findCol = (names: string[]) => {
    for (const n of names) { const idx = header.findIndex(h => h.includes(n)); if (idx >= 0) return idx; }
    return -1;
  };
  const nameIdx = findCol(["name"]);
  const casIdx = findCol(["cas", "botanical"]);
  const supplierIdx = findCol(["supplier"]);
  const categoryIdx = findCol(["category"]);
  const inventoryIdx = findCol(["inventory", "amount", "stock"]);
  const costIdx = findCol(["cost"]);
  const ifraIdx = findCol(["ifra", "limit"]);
  const longevityIdx = findCol(["longevity", "substantivity"]);
  const descIdx = findCol(["description", "desc"]);
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    const name = nameIdx >= 0 ? (cols[nameIdx] || "").trim() : "";
    if (!name) continue;
    rows.push({
      name,
      casNumber: casIdx >= 0 ? (cols[casIdx] || "").trim() : "",
      supplier: supplierIdx >= 0 ? (cols[supplierIdx] || "").trim() : "",
      category: categoryIdx >= 0 ? (cols[categoryIdx] || "").trim() : "",
      inventoryAmount: inventoryIdx >= 0 ? (cols[inventoryIdx] || "").trim() : "",
      costPerGram: costIdx >= 0 ? (cols[costIdx] || "").trim() : "",
      ifraLimit: ifraIdx >= 0 ? (cols[ifraIdx] || "").trim() : "",
      longevity: longevityIdx >= 0 ? parseInt(cols[longevityIdx] || "2") || 2 : 2,
      description: descIdx >= 0 ? (cols[descIdx] || "").trim() : "",
    });
  }
  return rows;
}

// ─── Main Component ─────────────────────────────────────────────────────────

export default function ImportPage() {
  const { loading } = useAuth();
  const navItems = useNavItems();
  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <DashboardLayout navItems={navItems} currentPath="/import" title="Olfactra">
      <ImportContent />
    </DashboardLayout>
  );
}

function ImportContent() {
  const [activeTab, setActiveTab] = useState<"library" | "formula">("formula");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-foreground">Import</h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Import ingredient libraries or analyze external formulas against your library.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="bg-secondary/50">
          <TabsTrigger value="formula" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Sparkles className="size-4 mr-1.5" />
            Import Formula
          </TabsTrigger>
          <TabsTrigger value="library" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
            <Upload className="size-4 mr-1.5" />
            Import Materials
          </TabsTrigger>
        </TabsList>

        <TabsContent value="formula" className="mt-4">
          <FormulaImportWizard />
        </TabsContent>

        <TabsContent value="library" className="mt-4">
          <LibraryImportSection />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ─── Formula Import Wizard ──────────────────────────────────────────────────

function FormulaImportWizard() {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<WizardStep>("input");
  const [sourceType, setSourceType] = useState<"pasted" | "csv" | "pdf">("pasted");
  const [rawInput, setRawInput] = useState("");
  const [parsedIngredients, setParsedIngredients] = useState<ParsedIngredient[]>([]);
  const [formulaName, setFormulaName] = useState("");
  const [solvent, setSolvent] = useState("Ethanol");
  const [totalWeight, setTotalWeight] = useState<string | null>(null);
  const [calculationBasis, setCalculationBasis] = useState<string>("weight");
  const [matchResults, setMatchResults] = useState<MatchResult[]>([]);
  const [userDecisions, setUserDecisions] = useState<Map<number, UserDecision>>(new Map());
  const [substituteSuggestions, setSubstituteSuggestions] = useState<Map<number, SubstituteSuggestion[]>>(new Map());
  const [loadingSubs, setLoadingSubs] = useState<Set<number>>(new Set());
  const [isParsing, setIsParsing] = useState(false);
  const [isMatching, setIsMatching] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [manualMapOpen, setManualMapOpen] = useState<number | null>(null);
  const [manualSearchQuery, setManualSearchQuery] = useState("");

  const fileRef = useRef<HTMLInputElement>(null);

  const parseTextMutation = trpc.formulaImport.parseText.useMutation();
  const parseCSVMutation = trpc.formulaImport.parseCSV.useMutation();
  const parsePDFMutation = trpc.formulaImport.parsePDF.useMutation();
  const matchMutation = trpc.formulaImport.matchIngredients.useMutation();
  const substituteMutation = trpc.formulaImport.suggestSubstitutes.useMutation();
  const saveMutation = trpc.formulaImport.saveImportedFormula.useMutation();

  const ingredientsList = trpc.ingredient.list.useQuery();

  // Step indicators
  const steps: { key: WizardStep; label: string; num: number }[] = [
    { key: "input", label: "Input", num: 1 },
    { key: "preview", label: "Preview", num: 2 },
    { key: "match", label: "Match Report", num: 3 },
    { key: "save", label: "Save", num: 4 },
  ];

  const currentStepIdx = steps.findIndex(s => s.key === step);

  // ─── Handlers ───────────────────────────────────────────────────────

  const handleParse = async () => {
    if (!rawInput.trim()) {
      toast.error("Please provide formula text or upload a file.");
      return;
    }
    setIsParsing(true);
    try {
      let result;
      if (sourceType === "csv") {
        result = await parseCSVMutation.mutateAsync({ text: rawInput });
        // CSV parser returns just ingredients, set defaults
        setParsedIngredients(result.ingredients);
        setCalculationBasis("weight");
      } else {
        // For pasted text and PDF, use AI parsing
        const mutation = sourceType === "pdf" ? parsePDFMutation : parseTextMutation;
        result = await mutation.mutateAsync({ text: rawInput });
        setParsedIngredients(result.ingredients);
        if (result.formulaName) setFormulaName(result.formulaName);
        if (result.solvent) setSolvent(result.solvent);
        if (result.totalWeight) setTotalWeight(result.totalWeight);
        if (result.calculationBasis) setCalculationBasis(result.calculationBasis);
      }

      if (result.ingredients.length === 0) {
        toast.error("No ingredients could be extracted from the input.");
        setIsParsing(false);
        return;
      }

      toast.success(`Parsed ${result.ingredients.length} ingredients`);
      setStep("preview");
    } catch (err: any) {
      toast.error("Parsing failed: " + (err.message || "Unknown error"));
    }
    setIsParsing(false);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.name.endsWith(".pdf")) {
      setSourceType("pdf");
      // Extract text from PDF using pdfjs-dist
      const reader = new FileReader();
      reader.onload = async (ev) => {
        try {
          const typedArray = new Uint8Array(ev.target?.result as ArrayBuffer);
          const pdfjsLib = await import("pdfjs-dist");
          pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
            "pdfjs-dist/build/pdf.worker.min.mjs",
            import.meta.url
          ).toString();
          const pdf = await pdfjsLib.getDocument({ data: typedArray }).promise;
          let fullText = "";
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            const pageText = content.items.map((item: any) => item.str).join(" ");
            fullText += pageText + "\n";
          }
          setRawInput(fullText);
          toast.success(`PDF loaded: ${pdf.numPages} page(s), text extracted`);
        } catch {
          toast.error("Failed to extract text from PDF. Try pasting the text directly.");
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      // CSV/TSV
      setSourceType("csv");
      const reader = new FileReader();
      reader.onload = (ev) => {
        const text = ev.target?.result as string;
        setRawInput(text);
        toast.success(`File loaded: ${file.name}`);
      };
      reader.readAsText(file);
    }
  };

  const handleMatch = async () => {
    setIsMatching(true);
    try {
      const result = await matchMutation.mutateAsync({ ingredients: parsedIngredients });
      setMatchResults(result.results);

      // Set initial user decisions based on match results
      const decisions = new Map<number, UserDecision>();
      result.results.forEach((r, idx) => {
        if (r.matchStatus === "exact" || r.matchStatus === "close") {
          decisions.set(idx, {
            action: "accept",
            ingredientId: r.matchedIngredientId,
            ingredientName: r.matchedIngredientName,
            matchType: r.matchStatus as "exact" | "close",
            matchConfidence: r.matchConfidence,
            substitutionReason: null,
          });
        } else {
          decisions.set(idx, {
            action: "unresolved",
            ingredientId: null,
            ingredientName: null,
            matchType: "unresolved",
            matchConfidence: null,
            substitutionReason: null,
          });
        }
      });
      setUserDecisions(decisions);

      const matched = result.results.filter(r => r.matchStatus === "exact").length;
      const close = result.results.filter(r => r.matchStatus === "close").length;
      const unmatched = result.results.filter(r => r.matchStatus === "none").length;
      toast.success(`Matching complete: ${matched} exact, ${close} close, ${unmatched} unmatched`);
      setStep("match");
    } catch (err: any) {
      toast.error("Matching failed: " + (err.message || "Unknown error"));
    }
    setIsMatching(false);
  };

  const handleGetSubstitutes = async (idx: number) => {
    const item = matchResults[idx];
    if (!item) return;
    setLoadingSubs(prev => new Set(prev).add(idx));
    try {
      const result = await substituteMutation.mutateAsync({
        ingredientName: item.originalName,
        ingredientNotes: item.notes,
      });
      setSubstituteSuggestions(prev => new Map(prev).set(idx, result.suggestions));
      if (result.suggestions.length === 0) {
        toast.info(result.noSubstituteReason || "No suitable substitutes found in your library.");
      }
    } catch {
      toast.error("Failed to get substitute suggestions");
    }
    setLoadingSubs(prev => { const s = new Set(prev); s.delete(idx); return s; });
  };

  const handleAcceptSubstitute = (idx: number, sub: SubstituteSuggestion) => {
    setUserDecisions(prev => {
      const m = new Map(prev);
      m.set(idx, {
        action: "substitute",
        ingredientId: sub.ingredientId,
        ingredientName: sub.name,
        matchType: "substitute",
        matchConfidence: sub.confidence,
        substitutionReason: sub.explanation,
      });
      return m;
    });
    toast.success(`Substituted with ${sub.name}`);
  };

  const handleManualMap = (idx: number, ingredientId: number, ingredientName: string) => {
    setUserDecisions(prev => {
      const m = new Map(prev);
      m.set(idx, {
        action: "manual",
        ingredientId,
        ingredientName,
        matchType: "manual",
        matchConfidence: "high",
        substitutionReason: `Manually mapped from "${matchResults[idx]?.originalName}"`,
      });
      return m;
    });
    setManualMapOpen(null);
    setManualSearchQuery("");
    toast.success(`Manually mapped to ${ingredientName}`);
  };

  const handleLeaveUnresolved = (idx: number) => {
    setUserDecisions(prev => {
      const m = new Map(prev);
      m.set(idx, {
        action: "unresolved",
        ingredientId: null,
        ingredientName: null,
        matchType: "unresolved",
        matchConfidence: null,
        substitutionReason: null,
      });
      return m;
    });
  };

  const handleSave = async () => {
    if (!formulaName.trim()) {
      toast.error("Please enter a formula name.");
      return;
    }

    // Build ingredient list from decisions (only resolved ones)
    const resolvedIngredients = matchResults
      .map((r, idx) => {
        const decision = userDecisions.get(idx);
        if (!decision || !decision.ingredientId) return null;
        return {
          ingredientId: decision.ingredientId,
          weight: r.weight || "1",
          dilutionPercent: r.dilution || undefined,
          note: r.notes || undefined,
          originalName: r.originalName,
          matchType: decision.matchType as "exact" | "close" | "substitute" | "manual" | "unresolved",
          matchConfidence: decision.matchConfidence || undefined,
          substitutionReason: decision.substitutionReason || undefined,
        };
      })
      .filter(Boolean) as any[];

    if (resolvedIngredients.length === 0) {
      toast.error("No resolved ingredients to save. Please match or substitute at least one ingredient.");
      return;
    }

    setIsSaving(true);
    try {
      const result = await saveMutation.mutateAsync({
        name: formulaName,
        description: `Imported and Analyzed (${sourceType})`,
        solvent,
        sourceType,
        originalData: rawInput.substring(0, 50000), // Limit stored data
        ingredients: resolvedIngredients,
      });
      toast.success(`Formula saved with ${result.addedCount} ingredients!`);
      setLocation(`/formulas/${result.formulaId}`);
    } catch (err: any) {
      toast.error("Save failed: " + (err.message || "Unknown error"));
    }
    setIsSaving(false);
  };

  // ─── Computed values ────────────────────────────────────────────────

  const matchSummary = useMemo(() => {
    const exact = matchResults.filter(r => r.matchStatus === "exact").length;
    const close = matchResults.filter(r => r.matchStatus === "close").length;
    const none = matchResults.filter(r => r.matchStatus === "none").length;
    const resolved = Array.from(userDecisions.values()).filter(d => d.ingredientId !== null).length;
    const unresolved = Array.from(userDecisions.values()).filter(d => d.ingredientId === null).length;
    return { exact, close, none, resolved, unresolved, total: matchResults.length };
  }, [matchResults, userDecisions]);

  const filteredLibrary = useMemo(() => {
    if (!ingredientsList.data || !manualSearchQuery.trim()) return ingredientsList.data || [];
    const q = manualSearchQuery.toLowerCase();
    return ingredientsList.data.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.category || "").toLowerCase().includes(q) ||
      (i.casNumber || "").includes(q)
    );
  }, [ingredientsList.data, manualSearchQuery]);

  // ─── Render ─────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-2">
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
              i <= currentStepIdx
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-muted-foreground"
            }`}>
              <span className="size-5 rounded-full bg-white/20 flex items-center justify-center text-xs font-bold">
                {i < currentStepIdx ? <Check className="size-3" /> : s.num}
              </span>
              {s.label}
            </div>
            {i < steps.length - 1 && (
              <ArrowRight className={`size-4 ${i < currentStepIdx ? "text-primary" : "text-muted-foreground/30"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Input */}
      {step === "input" && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Formula Input</CardTitle>
            <CardDescription>Paste a formula, upload a CSV, or upload a PDF to begin analysis.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Tabs value={sourceType} onValueChange={(v) => { setSourceType(v as any); setRawInput(""); }}>
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="pasted" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <ClipboardPaste className="size-4 mr-1.5" />
                  Paste Text
                </TabsTrigger>
                <TabsTrigger value="csv" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FileSpreadsheet className="size-4 mr-1.5" />
                  Upload CSV
                </TabsTrigger>
                <TabsTrigger value="pdf" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                  <FileType className="size-4 mr-1.5" />
                  Upload PDF
                </TabsTrigger>
              </TabsList>

              <TabsContent value="pasted" className="mt-4">
                <Textarea
                  placeholder="Paste your formula here...&#10;&#10;Example:&#10;Bergamot 2.5g&#10;Linalool 1.0g (10% dilution)&#10;Iso E Super 3.0g&#10;Ethanol 20g (solvent)"
                  value={rawInput}
                  onChange={(e) => setRawInput(e.target.value)}
                  className="min-h-[200px] font-mono text-sm bg-background"
                />
              </TabsContent>

              <TabsContent value="csv" className="mt-4 space-y-3">
                <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFileUpload} className="hidden" />
                <div
                  className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-all hover:bg-secondary/30"
                  onClick={() => fileRef.current?.click()}
                >
                  <div className="size-10 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-2">
                    <FileSpreadsheet className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Click to upload CSV or TSV</p>
                  <p className="text-xs text-muted-foreground mt-1">Expected columns: ingredient name, weight, percentage, dilution, notes</p>
                </div>
                {rawInput && (
                  <div className="flex items-center gap-2 text-sm">
                    <FileText className="size-4 text-primary" />
                    <span className="font-medium text-foreground">File loaded</span>
                    <Badge variant="secondary">{rawInput.split("\n").length} lines</Badge>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="pdf" className="mt-4 space-y-3">
                <input ref={fileRef} type="file" accept=".pdf" onChange={handleFileUpload} className="hidden" />
                <div
                  className="border-2 border-dashed border-border/50 rounded-xl p-8 text-center cursor-pointer hover:border-primary/50 transition-all hover:bg-secondary/30"
                  onClick={() => fileRef.current?.click()}
                >
                  <div className="size-10 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-2">
                    <FileType className="size-5 text-muted-foreground" />
                  </div>
                  <p className="text-sm font-medium text-foreground">Click to upload PDF</p>
                  <p className="text-xs text-muted-foreground mt-1">Text will be extracted and parsed by AI</p>
                </div>
                {rawInput && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="size-4 text-primary" />
                      <span className="font-medium text-foreground">PDF text extracted</span>
                      <Badge variant="secondary">{rawInput.length} characters</Badge>
                    </div>
                    <Textarea
                      value={rawInput}
                      onChange={(e) => setRawInput(e.target.value)}
                      className="min-h-[120px] font-mono text-xs bg-background"
                      placeholder="Extracted text will appear here. You can edit before parsing."
                    />
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end">
              <Button
                onClick={handleParse}
                disabled={isParsing || !rawInput.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {isParsing ? (
                  <><Loader2 className="size-4 animate-spin" /> Parsing...</>
                ) : (
                  <><Sparkles className="size-4" /> Parse Formula</>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Parsed Preview */}
      {step === "preview" && (
        <div className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold">Parsed Preview</CardTitle>
                  <CardDescription>Review the extracted ingredients before matching against your library.</CardDescription>
                </div>
                <Badge variant="secondary" className="text-sm">{parsedIngredients.length} ingredients</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {calculationBasis && (
                <div className="text-xs text-muted-foreground bg-secondary/30 px-3 py-2 rounded-lg">
                  Calculation basis: <span className="font-medium text-foreground">{calculationBasis}</span>
                  {totalWeight && <> | Total weight: <span className="font-medium text-foreground">{totalWeight}g</span></>}
                  {parsedIngredients.some(p => !p.dilution) && (
                    <span className="ml-2 text-amber-600">
                      <AlertTriangle className="size-3 inline mr-1" />
                      Some ingredients have no dilution specified — flagged for review
                    </span>
                  )}
                </div>
              )}

              <div className="overflow-x-auto max-h-[400px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="sticky top-0 bg-card z-10 text-muted-foreground">#</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-muted-foreground">Ingredient Name</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-muted-foreground">Weight (g)</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-muted-foreground">%</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-muted-foreground">Dilution %</TableHead>
                      <TableHead className="sticky top-0 bg-card z-10 text-muted-foreground">Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {parsedIngredients.map((p, i) => (
                      <TableRow key={i} className="border-border/30">
                        <TableCell className="text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                        <TableCell className="font-medium text-sm text-foreground">{p.originalName}</TableCell>
                        <TableCell className="text-sm tabular-nums">{p.weight || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-sm tabular-nums">{p.percentage || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-sm tabular-nums">
                          {p.dilution ? (
                            p.dilution
                          ) : (
                            <span className="text-amber-600 text-xs flex items-center gap-1">
                              <AlertTriangle className="size-3" /> Not specified
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground max-w-[200px] truncate">{p.notes || "—"}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Editable formula metadata */}
              <div className="grid grid-cols-3 gap-4 pt-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Formula Name</label>
                  <Input
                    value={formulaName}
                    onChange={(e) => setFormulaName(e.target.value)}
                    placeholder="Enter formula name..."
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Solvent</label>
                  <Input
                    value={solvent}
                    onChange={(e) => setSolvent(e.target.value)}
                    placeholder="e.g., Ethanol"
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Total Weight</label>
                  <Input
                    value={totalWeight || ""}
                    onChange={(e) => setTotalWeight(e.target.value || null)}
                    placeholder="Auto-calculated"
                    className="bg-background"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("input")} className="border-border/50">
              <ArrowLeft className="size-4" /> Back to Input
            </Button>
            <Button
              onClick={handleMatch}
              disabled={isMatching}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isMatching ? (
                <><Loader2 className="size-4 animate-spin" /> Matching...</>
              ) : (
                <><Search className="size-4" /> Match Against Library</>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Step 3: Match Report */}
      {step === "match" && (
        <div className="space-y-4">
          {/* Summary cards */}
          <div className="grid grid-cols-4 gap-3">
            <Card className="bg-emerald-50 border-emerald-200">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="text-2xl font-bold text-emerald-700">{matchSummary.exact}</div>
                <div className="text-xs text-emerald-600 font-medium">Exact Match</div>
              </CardContent>
            </Card>
            <Card className="bg-amber-50 border-amber-200">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="text-2xl font-bold text-amber-700">{matchSummary.close}</div>
                <div className="text-xs text-amber-600 font-medium">Close Match</div>
              </CardContent>
            </Card>
            <Card className="bg-red-50 border-red-200">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="text-2xl font-bold text-red-700">{matchSummary.none}</div>
                <div className="text-xs text-red-600 font-medium">No Match</div>
              </CardContent>
            </Card>
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-4 pb-3 text-center">
                <div className="text-2xl font-bold text-primary">{matchSummary.resolved}</div>
                <div className="text-xs text-primary/70 font-medium">Resolved</div>
              </CardContent>
            </Card>
          </div>

          {/* Match Report Table */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Match Report</CardTitle>
              <CardDescription>Review matches and resolve unmatched ingredients before saving.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-muted-foreground">#</TableHead>
                      <TableHead className="text-muted-foreground">Original Name</TableHead>
                      <TableHead className="text-muted-foreground">Weight</TableHead>
                      <TableHead className="text-muted-foreground">Status</TableHead>
                      <TableHead className="text-muted-foreground">Matched To</TableHead>
                      <TableHead className="text-muted-foreground">Confidence</TableHead>
                      <TableHead className="text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchResults.map((r, idx) => {
                      const decision = userDecisions.get(idx);
                      const subs = substituteSuggestions.get(idx) || [];
                      const isLoadingSub = loadingSubs.has(idx);

                      return (
                        <MatchReportRow
                          key={idx}
                          idx={idx}
                          result={r}
                          decision={decision}
                          substitutes={subs}
                          isLoadingSub={isLoadingSub}
                          onGetSubstitutes={() => handleGetSubstitutes(idx)}
                          onAcceptSubstitute={(sub) => handleAcceptSubstitute(idx, sub)}
                          onManualMap={() => { setManualMapOpen(idx); setManualSearchQuery(""); }}
                          onLeaveUnresolved={() => handleLeaveUnresolved(idx)}
                          onAcceptMatch={() => {
                            if (r.matchedIngredientId) {
                              setUserDecisions(prev => {
                                const m = new Map(prev);
                                m.set(idx, {
                                  action: "accept",
                                  ingredientId: r.matchedIngredientId,
                                  ingredientName: r.matchedIngredientName,
                                  matchType: r.matchStatus === "none" ? "unresolved" : r.matchStatus,
                                  matchConfidence: r.matchConfidence,
                                  substitutionReason: null,
                                });
                                return m;
                              });
                            }
                          }}
                        />
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("preview")} className="border-border/50">
              <ArrowLeft className="size-4" /> Back to Preview
            </Button>
            <Button
              onClick={() => setStep("save")}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              Continue to Save <ArrowRight className="size-4" />
            </Button>
          </div>

          {/* Manual Map Dialog */}
          <Dialog open={manualMapOpen !== null} onOpenChange={(open) => { if (!open) setManualMapOpen(null); }}>
            <DialogContent className="max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
              <DialogHeader>
                <DialogTitle className="text-foreground">
                  Map "{manualMapOpen !== null ? matchResults[manualMapOpen]?.originalName : ""}" to Library Ingredient
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-3 flex-1 overflow-hidden flex flex-col">
                <Input
                  placeholder="Search your library..."
                  value={manualSearchQuery}
                  onChange={(e) => setManualSearchQuery(e.target.value)}
                  className="bg-background"
                />
                <div className="overflow-y-auto flex-1 max-h-[400px] space-y-1">
                  {filteredLibrary.slice(0, 50).map(ing => (
                    <div
                      key={ing.id}
                      className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-secondary/50 cursor-pointer transition-colors"
                      onClick={() => manualMapOpen !== null && handleManualMap(manualMapOpen, ing.id, ing.name)}
                    >
                      <div>
                        <span className="text-sm font-medium text-foreground">{ing.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">{ing.category || ""}</span>
                      </div>
                      <Link2 className="size-4 text-muted-foreground" />
                    </div>
                  ))}
                  {filteredLibrary.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">No ingredients found</p>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      )}

      {/* Step 4: Save */}
      {step === "save" && (
        <div className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Save Imported Formula</CardTitle>
              <CardDescription>
                Review the final formula details and save. The formula will be marked as "Imported and Analyzed" with full traceability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Formula Name *</label>
                  <Input
                    value={formulaName}
                    onChange={(e) => setFormulaName(e.target.value)}
                    placeholder="Enter formula name..."
                    className="bg-background"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-1 block">Solvent</label>
                  <Input
                    value={solvent}
                    onChange={(e) => setSolvent(e.target.value)}
                    className="bg-background"
                  />
                </div>
              </div>

              {/* Summary */}
              <div className="bg-secondary/30 rounded-lg p-4 space-y-2">
                <div className="text-sm font-medium text-foreground">Import Summary</div>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Source:</span>{" "}
                    <Badge variant="secondary" className="ml-1">{sourceType.toUpperCase()}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Total parsed:</span>{" "}
                    <span className="font-medium text-foreground">{matchResults.length}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Will be saved:</span>{" "}
                    <span className="font-medium text-emerald-600">{matchSummary.resolved}</span>
                  </div>
                </div>
                {matchSummary.unresolved > 0 && (
                  <div className="text-xs text-amber-600 flex items-center gap-1 mt-1">
                    <AlertTriangle className="size-3" />
                    {matchSummary.unresolved} ingredient(s) will be skipped (unresolved)
                  </div>
                )}
              </div>

              {/* Final ingredient list */}
              <div className="overflow-x-auto max-h-[300px]">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-muted-foreground">#</TableHead>
                      <TableHead className="text-muted-foreground">Original Name</TableHead>
                      <TableHead className="text-muted-foreground">Mapped To</TableHead>
                      <TableHead className="text-muted-foreground">Weight</TableHead>
                      <TableHead className="text-muted-foreground">Match Type</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {matchResults.map((r, idx) => {
                      const decision = userDecisions.get(idx);
                      if (!decision?.ingredientId) return (
                        <TableRow key={idx} className="border-border/30 opacity-40">
                          <TableCell className="text-xs tabular-nums">{idx + 1}</TableCell>
                          <TableCell className="text-sm">{r.originalName}</TableCell>
                          <TableCell className="text-xs text-muted-foreground italic">Skipped</TableCell>
                          <TableCell className="text-sm tabular-nums">{r.weight || "—"}</TableCell>
                          <TableCell><Badge variant="outline" className="text-xs border-muted-foreground/30">Unresolved</Badge></TableCell>
                        </TableRow>
                      );
                      return (
                        <TableRow key={idx} className="border-border/30">
                          <TableCell className="text-xs tabular-nums">{idx + 1}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">{r.originalName}</TableCell>
                          <TableCell className="text-sm font-medium text-foreground">{decision.ingredientName}</TableCell>
                          <TableCell className="text-sm tabular-nums">{r.weight || "1"}</TableCell>
                          <TableCell>
                            <MatchTypeBadge type={decision.matchType} confidence={decision.matchConfidence} />
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              <div className="bg-primary/5 border border-primary/20 rounded-lg p-3 text-xs text-primary/80">
                <strong>Metadata stored:</strong> Source type ({sourceType}), analysis date, original ingredient names, match types, confidence levels, and substitution decisions are all preserved for traceability.
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setStep("match")} className="border-border/50">
              <ArrowLeft className="size-4" /> Back to Match Report
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !formulaName.trim() || matchSummary.resolved === 0}
              className="bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {isSaving ? (
                <><Loader2 className="size-4 animate-spin" /> Saving...</>
              ) : (
                <><Save className="size-4" /> Save Formula ({matchSummary.resolved} ingredients)</>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Match Report Row ───────────────────────────────────────────────────────

function MatchReportRow({
  idx, result, decision, substitutes, isLoadingSub,
  onGetSubstitutes, onAcceptSubstitute, onManualMap, onLeaveUnresolved, onAcceptMatch,
}: {
  idx: number;
  result: MatchResult;
  decision?: UserDecision;
  substitutes: SubstituteSuggestion[];
  isLoadingSub: boolean;
  onGetSubstitutes: () => void;
  onAcceptSubstitute: (sub: SubstituteSuggestion) => void;
  onManualMap: () => void;
  onLeaveUnresolved: () => void;
  onAcceptMatch: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <>
      <TableRow className={`border-border/30 ${
        decision?.action === "unresolved" && result.matchStatus === "none" ? "bg-red-50/50" : ""
      }`}>
        <TableCell className="text-xs text-muted-foreground tabular-nums">{idx + 1}</TableCell>
        <TableCell className="text-sm font-medium text-foreground">{result.originalName}</TableCell>
        <TableCell className="text-sm tabular-nums">{result.weight || "—"}</TableCell>
        <TableCell>
          <MatchStatusBadge status={result.matchStatus} />
        </TableCell>
        <TableCell className="text-sm">
          {decision?.ingredientName ? (
            <span className="text-foreground font-medium">{decision.ingredientName}</span>
          ) : result.matchedIngredientName ? (
            <span className="text-muted-foreground">{result.matchedIngredientName}</span>
          ) : (
            <span className="text-muted-foreground italic">—</span>
          )}
        </TableCell>
        <TableCell>
          {decision?.matchConfidence && (
            <ConfidenceBadge confidence={decision.matchConfidence} />
          )}
        </TableCell>
        <TableCell>
          <div className="flex items-center gap-1">
            {result.matchStatus === "close" && decision?.action !== "accept" && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onAcceptMatch}>
                    <Check className="size-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Accept close match</TooltipContent>
              </Tooltip>
            )}
            {result.matchStatus === "none" && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 px-2 text-xs"
                      onClick={onGetSubstitutes}
                      disabled={isLoadingSub}
                    >
                      {isLoadingSub ? <Loader2 className="size-3 animate-spin" /> : <Replace className="size-3" />}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Find substitutes</TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={onManualMap}>
                      <Link2 className="size-3" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>Manual map</TooltipContent>
                </Tooltip>
              </>
            )}
            {(substitutes.length > 0 || result.matchStatus === "none") && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setExpanded(!expanded)}>
                    {expanded ? <ChevronUp className="size-3" /> : <ChevronDown className="size-3" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{expanded ? "Collapse" : "Expand details"}</TooltipContent>
              </Tooltip>
            )}
          </div>
        </TableCell>
      </TableRow>

      {/* Expanded substitution suggestions */}
      {expanded && (
        <TableRow className="border-border/30">
          <TableCell colSpan={7} className="bg-secondary/20 p-3">
            {substitutes.length > 0 ? (
              <div className="space-y-2">
                <div className="text-xs font-medium text-muted-foreground mb-2">Substitute Suggestions:</div>
                {substitutes.map((sub, si) => (
                  <div key={si} className="flex items-start gap-3 bg-card rounded-lg p-3 border border-border/30">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-medium text-foreground">{sub.name}</span>
                        <ConfidenceBadge confidence={sub.confidence} />
                      </div>
                      <p className="text-xs text-muted-foreground">{sub.explanation}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        <strong>Impact:</strong> {sub.expectedImpact}
                      </p>
                      {sub.confidence === "low" && (
                        <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                          <AlertTriangle className="size-3" />
                          Low confidence — user confirmation recommended
                        </p>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0 h-8 text-xs border-primary/30 text-primary hover:bg-primary/10"
                      onClick={() => onAcceptSubstitute(sub)}
                    >
                      <Check className="size-3 mr-1" /> Use This
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2 mt-2">
                  <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onManualMap}>
                    <Link2 className="size-3 mr-1" /> Manual Map
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs text-muted-foreground" onClick={onLeaveUnresolved}>
                    <Unlink2 className="size-3 mr-1" /> Leave Unresolved
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-center py-3">
                <p className="text-sm text-muted-foreground mb-2">No substitute suggestions yet.</p>
                <div className="flex justify-center gap-2">
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onGetSubstitutes} disabled={isLoadingSub}>
                    {isLoadingSub ? <Loader2 className="size-3 animate-spin mr-1" /> : <Replace className="size-3 mr-1" />}
                    Find Substitutes
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 text-xs" onClick={onManualMap}>
                    <Link2 className="size-3 mr-1" /> Manual Map
                  </Button>
                  <Button size="sm" variant="ghost" className="h-8 text-xs text-muted-foreground" onClick={onLeaveUnresolved}>
                    <Unlink2 className="size-3 mr-1" /> Leave Unresolved
                  </Button>
                </div>
              </div>
            )}
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

// ─── Badge Components ───────────────────────────────────────────────────────

function MatchStatusBadge({ status }: { status: "exact" | "close" | "none" }) {
  if (status === "exact") return <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200 text-xs">Exact</Badge>;
  if (status === "close") return <Badge className="bg-amber-100 text-amber-700 border-amber-200 text-xs">Close</Badge>;
  return <Badge className="bg-red-100 text-red-700 border-red-200 text-xs">No Match</Badge>;
}

function ConfidenceBadge({ confidence }: { confidence: "high" | "medium" | "low" }) {
  if (confidence === "high") return <Badge variant="outline" className="text-xs border-emerald-300 text-emerald-600">High</Badge>;
  if (confidence === "medium") return <Badge variant="outline" className="text-xs border-amber-300 text-amber-600">Medium</Badge>;
  return <Badge variant="outline" className="text-xs border-red-300 text-red-600">Low</Badge>;
}

function MatchTypeBadge({ type, confidence }: { type: string; confidence: string | null }) {
  const colors: Record<string, string> = {
    exact: "bg-emerald-100 text-emerald-700 border-emerald-200",
    close: "bg-amber-100 text-amber-700 border-amber-200",
    substitute: "bg-blue-100 text-blue-700 border-blue-200",
    manual: "bg-purple-100 text-purple-700 border-purple-200",
    unresolved: "bg-red-100 text-red-700 border-red-200",
  };
  return (
    <Badge className={`text-xs ${colors[type] || colors.unresolved}`}>
      {type.charAt(0).toUpperCase() + type.slice(1)}
      {confidence && <span className="ml-1 opacity-70">({confidence})</span>}
    </Badge>
  );
}

// ─── Library Import Section (preserved from original) ───────────────────────

function LibraryImportSection() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<LibraryParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count: number } | null>(null);

  const utils = trpc.useUtils();
  const bulkImportMutation = trpc.ingredient.bulkImport.useMutation({
    onSuccess: (data) => {
      setImportResult({ success: true, count: data.count });
      utils.ingredient.list.invalidate();
      utils.ingredient.categories.invalidate();
      utils.ingredient.suppliers.invalidate();
      toast.success(`Successfully imported ${data.count} ingredients`);
      setImporting(false);
    },
    onError: (err) => {
      setImportResult({ success: false, count: 0 });
      toast.error("Import failed: " + err.message);
      setImporting(false);
    },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      let rows: LibraryParsedRow[];
      if (file.name.endsWith(".tsv") || file.name.endsWith(".txt")) { rows = parseTSV(text); }
      else { rows = parseCSVLib(text); }
      setParsed(rows);
      if (rows.length === 0) toast.error("No valid rows found in the file.");
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (parsed.length === 0) return;
    setImporting(true);
    const batchSize = 50;
    const batches: LibraryParsedRow[][] = [];
    for (let i = 0; i < parsed.length; i += batchSize) batches.push(parsed.slice(i, i + batchSize));

    let imported = 0;
    const importBatch = async (idx: number) => {
      if (idx >= batches.length) {
        setImportResult({ success: true, count: imported });
        utils.ingredient.list.invalidate();
        utils.ingredient.categories.invalidate();
        toast.success(`Successfully imported ${imported} ingredients`);
        setImporting(false);
        return;
      }
      try {
        const result = await bulkImportMutation.mutateAsync({ ingredients: batches[idx] });
        imported += result.count;
        await importBatch(idx + 1);
      } catch {
        setImportResult({ success: false, count: imported });
        toast.error(`Import partially failed at batch ${idx + 1}`);
        setImporting(false);
      }
    };
    importBatch(0);
  };

  return (
    <div className="space-y-4">
      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Upload Ingredient Library</CardTitle>
          <CardDescription className="text-muted-foreground">
            Supported formats: CSV, TSV. Expected columns: Name, CAS/Botanical, Supplier, Category, Inventory Amount, Cost per Gram, IFRA Limit, Longevity, Description.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" />
          <div
            className="border-2 border-dashed border-border/50 rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 transition-all hover:bg-secondary/30"
            onClick={() => fileRef.current?.click()}
          >
            <div className="size-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
              <Upload className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">CSV, TSV, or TXT files</p>
          </div>

          {fileName && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-primary" />
              <span className="font-medium text-foreground">{fileName}</span>
              <Badge variant="secondary" className="bg-secondary text-secondary-foreground">{parsed.length} rows parsed</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {parsed.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Preview ({parsed.length} ingredients)</CardTitle>
              <CardDescription className="text-muted-foreground">Review the parsed data before importing.</CardDescription>
            </div>
            <Button onClick={handleImport} disabled={importing} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {importing ? (
                <><Loader2 className="size-4 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="size-4" /> Import All ({parsed.length})</>
              )}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    {["#", "Name", "CAS", "Supplier", "Category", "Stock", "$/g", "IFRA", "Long."].map(h => (
                      <TableHead key={h} className="sticky top-0 bg-card text-muted-foreground z-10">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.slice(0, 50).map((row, i) => (
                    <TableRow key={i} className="border-border/30">
                      <TableCell className="text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate text-foreground">{row.name}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate font-mono">{row.casNumber || "—"}</TableCell>
                      <TableCell className="text-xs">{row.supplier || "—"}</TableCell>
                      <TableCell className="text-xs">{row.category || "—"}</TableCell>
                      <TableCell className="text-xs">{row.inventoryAmount || "—"}</TableCell>
                      <TableCell className="text-xs text-accent">{row.costPerGram || "—"}</TableCell>
                      <TableCell className="text-xs">{row.ifraLimit || "—"}</TableCell>
                      <TableCell className="text-xs tabular-nums">{row.longevity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsed.length > 50 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Showing first 50 of {parsed.length} rows
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {importResult && (
        <Card className={`border-border/50 ${importResult.success ? "bg-emerald-50 border-emerald-200" : "bg-red-50 border-red-200"}`}>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            {importResult.success ? (
              <><CheckCircle className="size-5 text-emerald-600" /><span className="text-sm font-medium text-emerald-700">Successfully imported {importResult.count} ingredients into your library.</span></>
            ) : (
              <><AlertCircle className="size-5 text-red-600" /><span className="text-sm font-medium text-red-700">Import failed. Please check your file format and try again.</span></>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
