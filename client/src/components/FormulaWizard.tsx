import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { trpc } from "@/lib/trpc";
import { CATEGORY_COLORS, LONGEVITY_LABELS } from "@shared/perfumery";
import {
  ArrowLeft, ArrowRight, Check, FlaskConical, Loader2, Plus,
  Search, Sparkles, Save, RefreshCw, X, Beaker, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type Step = "ingredients" | "concept" | "result";

interface GeneratedFormula {
  name: string;
  description: string;
  ingredients: { ingredientId: number; name: string; weight: string; note: string }[];
  solventWeight: string;
  solvent: string;
  perfumerNotes: string;
}

interface FormulaWizardProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onFormulaSaved: (formulaId: number) => void;
}

const PRODUCT_TYPES = [
  { value: "perfume", label: "Perfume (EdP)" },
  { value: "candle", label: "Candle" },
  { value: "lotion", label: "Lotion" },
  { value: "bodywash", label: "Body Wash" },
  { value: "incense", label: "Incense" },
  { value: "bodyspray", label: "Body Spray" },
  { value: "humidifier", label: "Humidifier Oil" },
] as const;

export default function FormulaWizard({ open, onOpenChange, onFormulaSaved }: FormulaWizardProps) {
  const [step, setStep] = useState<Step>("ingredients");
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [concept, setConcept] = useState("");
  const [productType, setProductType] = useState<string>("perfume");
  const [generatedFormula, setGeneratedFormula] = useState<GeneratedFormula | null>(null);
  const [savedFormulas, setSavedFormulas] = useState<number[]>([]);
  const [showPerfumerNotes, setShowPerfumerNotes] = useState(false);

  const { activeWorkspaceId } = useWorkspace();

  const { data: allIngredients } = trpc.ingredient.list.useQuery();
  const { data: wsIngredientIds } = trpc.workspace.ingredients.useQuery(
    { workspaceId: activeWorkspaceId! },
    { enabled: !!activeWorkspaceId }
  );

  const generateMutation = trpc.formula.generateFromIngredients.useMutation({
    onSuccess: (data) => {
      setGeneratedFormula(data);
      setStep("result");
    },
    onError: (err) => {
      toast.error("Generation failed: " + err.message);
    },
  });

  const saveMutation = trpc.formula.saveGeneratedFormula.useMutation({
    onSuccess: (data) => {
      setSavedFormulas(prev => [...prev, data.formulaId]);
      toast.success(`Formula saved! (${data.addedCount} ingredients)`);
    },
    onError: () => {
      toast.error("Failed to save formula");
    },
  });

  const utils = trpc.useUtils();

  // Filter ingredients by workspace if active
  const ingredients = useMemo(() => {
    if (!allIngredients) return [];
    if (activeWorkspaceId && wsIngredientIds) {
      const wsIds = new Set((wsIngredientIds as any[]).map((i: any) => i.id));
      return allIngredients.filter(i => wsIds.has(i.id));
    }
    return allIngredients;
  }, [allIngredients, activeWorkspaceId, wsIngredientIds]);

  // Group ingredients by category
  const categories = useMemo(() => {
    const cats = new Set<string>();
    ingredients.forEach(i => cats.add(i.category || "Uncategorized"));
    return Array.from(cats).sort();
  }, [ingredients]);

  // Filtered ingredients
  const filteredIngredients = useMemo(() => {
    let list = ingredients;
    if (categoryFilter !== "all") {
      list = list.filter(i => (i.category || "Uncategorized") === categoryFilter);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(i => i.name.toLowerCase().includes(q) || (i.category || "").toLowerCase().includes(q));
    }
    return list;
  }, [ingredients, categoryFilter, search]);

  // Group filtered ingredients by category for display
  const groupedIngredients = useMemo(() => {
    const groups: Record<string, typeof filteredIngredients> = {};
    filteredIngredients.forEach(i => {
      const cat = i.category || "Uncategorized";
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(i);
    });
    return Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));
  }, [filteredIngredients]);

  const toggleIngredient = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = () => {
    setSelectedIds(new Set(filteredIngredients.map(i => i.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleGenerate = () => {
    if (selectedIds.size === 0) {
      toast.error("Please select at least one ingredient");
      return;
    }
    if (!concept.trim()) {
      toast.error("Please enter a scent concept");
      return;
    }
    generateMutation.mutate({
      ingredientIds: Array.from(selectedIds),
      concept: concept.trim(),
      productType: productType as any,
    });
  };

  const handleRegenerate = () => {
    generateMutation.mutate({
      ingredientIds: Array.from(selectedIds),
      concept: concept.trim(),
      productType: productType as any,
    });
  };

  const handleSave = () => {
    if (!generatedFormula) return;
    saveMutation.mutate({
      name: generatedFormula.name,
      description: generatedFormula.description,
      solvent: generatedFormula.solvent,
      solventWeight: generatedFormula.solventWeight,
      ingredients: generatedFormula.ingredients.map(i => ({
        ingredientId: i.ingredientId,
        weight: i.weight,
        note: i.note,
      })),
    });
    utils.formula.list.invalidate();
  };

  const handleSaveAndOpen = () => {
    if (!generatedFormula) return;
    saveMutation.mutate({
      name: generatedFormula.name,
      description: generatedFormula.description,
      solvent: generatedFormula.solvent,
      solventWeight: generatedFormula.solventWeight,
      ingredients: generatedFormula.ingredients.map(i => ({
        ingredientId: i.ingredientId,
        weight: i.weight,
        note: i.note,
      })),
    }, {
      onSuccess: (data) => {
        setSavedFormulas(prev => [...prev, data.formulaId]);
        toast.success(`Formula saved! (${data.addedCount} ingredients)`);
        utils.formula.list.invalidate();
        onFormulaSaved(data.formulaId);
        resetWizard();
      },
    });
  };

  const resetWizard = () => {
    setStep("ingredients");
    setSelectedIds(new Set());
    setSearch("");
    setCategoryFilter("all");
    setConcept("");
    setProductType("perfume");
    setGeneratedFormula(null);
    setSavedFormulas([]);
    setShowPerfumerNotes(false);
  };

  const handleClose = (open: boolean) => {
    if (!open) resetWizard();
    onOpenChange(open);
  };

  const selectedIngredients = useMemo(() => {
    return ingredients.filter(i => selectedIds.has(i.id));
  }, [ingredients, selectedIds]);

  const totalConcentrateWeight = useMemo(() => {
    if (!generatedFormula) return 0;
    return generatedFormula.ingredients.reduce((sum, i) => sum + parseFloat(i.weight || "0"), 0);
  }, [generatedFormula]);

  const isSaved = generatedFormula ? savedFormulas.length > 0 && saveMutation.isSuccess : false;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-serif flex items-center gap-2">
            <Sparkles className="size-5 text-accent" />
            {step === "ingredients" && "Step 1: Select Ingredients"}
            {step === "concept" && "Step 2: Describe Your Idea"}
            {step === "result" && "Generated Formula"}
          </DialogTitle>
          {/* Step indicator */}
          <div className="flex items-center gap-2 mt-2">
            {(["ingredients", "concept", "result"] as Step[]).map((s, idx) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`size-7 rounded-full flex items-center justify-center text-xs font-bold transition-colors ${
                  step === s ? "bg-accent text-accent-foreground" :
                  (["ingredients", "concept", "result"].indexOf(step) > idx) ? "bg-accent/30 text-accent" :
                  "bg-secondary text-muted-foreground"
                }`}>
                  {(["ingredients", "concept", "result"].indexOf(step) > idx) ? <Check className="size-3.5" /> : idx + 1}
                </div>
                {idx < 2 && <div className={`w-8 h-0.5 ${
                  (["ingredients", "concept", "result"].indexOf(step) > idx) ? "bg-accent/50" : "bg-border"
                }`} />}
              </div>
            ))}
          </div>
        </DialogHeader>

        {/* Step 1: Ingredient Selection */}
        {step === "ingredients" && (
          <div className="flex-1 overflow-hidden flex flex-col gap-3 min-h-0">
            {/* Search and filters */}
            <div className="flex gap-2 shrink-0">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
                <Input
                  className="pl-9 bg-background border-border/50"
                  placeholder="Search ingredients..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48 bg-background border-border/50">
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(c => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Selection controls */}
            <div className="flex items-center justify-between shrink-0">
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={selectAll}>Select All ({filteredIngredients.length})</Button>
                <Button variant="outline" size="sm" onClick={deselectAll}>Deselect All</Button>
              </div>
              <Badge variant="secondary" className="text-sm">
                {selectedIds.size} selected
              </Badge>
            </div>

            {activeWorkspaceId && (
              <div className="text-xs text-accent bg-accent/10 rounded px-2 py-1 shrink-0">
                Showing ingredients from active workspace
              </div>
            )}

            {/* Ingredient grid */}
            <div className="flex-1 overflow-y-auto min-h-0 space-y-3 pr-1">
              {groupedIngredients.map(([category, items]) => (
                <div key={category}>
                  <div className="flex items-center gap-2 mb-1.5 sticky top-0 bg-card py-1 z-10">
                    <div className="size-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] || "#888" }} />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{category}</span>
                    <span className="text-xs text-muted-foreground">({items.length})</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                    {items.map(ing => {
                      const isSelected = selectedIds.has(ing.id);
                      return (
                        <button
                          key={ing.id}
                          onClick={() => toggleIngredient(ing.id)}
                          className={`text-left px-2.5 py-1.5 rounded-md text-sm transition-all border ${
                            isSelected
                              ? "bg-accent/15 border-accent/50 text-foreground"
                              : "bg-secondary/30 border-transparent text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <div className={`size-3.5 rounded border flex items-center justify-center shrink-0 ${
                              isSelected ? "bg-accent border-accent" : "border-border"
                            }`}>
                              {isSelected && <Check className="size-2.5 text-accent-foreground" />}
                            </div>
                            <span className="truncate text-xs font-medium">{ing.name}</span>
                          </div>
                          {ing.longevity !== null && (
                            <span className="text-[10px] text-muted-foreground ml-5">
                              {LONGEVITY_LABELS[ing.longevity] || ""}
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Concept Input */}
        {step === "concept" && (
          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Selected ingredients summary */}
            <Card className="bg-secondary/30 border-border/30">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">Selected Ingredients ({selectedIds.size})</span>
                  <Button variant="ghost" size="sm" onClick={() => setStep("ingredients")} className="text-xs text-muted-foreground">
                    <ArrowLeft className="size-3" /> Edit
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {selectedIngredients.slice(0, 20).map(ing => (
                    <Badge key={ing.id} variant="outline" className="text-[11px] border-border/50 text-foreground">
                      {ing.name}
                    </Badge>
                  ))}
                  {selectedIngredients.length > 20 && (
                    <Badge variant="secondary" className="text-[11px]">
                      +{selectedIngredients.length - 20} more
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Product type */}
            <div>
              <Label className="text-sm font-medium">Product Type</Label>
              <Select value={productType} onValueChange={setProductType}>
                <SelectTrigger className="mt-1.5 bg-background border-border/50">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRODUCT_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Concept input */}
            <div>
              <Label className="text-sm font-medium">Your Scent Idea / Concept *</Label>
              <Textarea
                className="mt-1.5 bg-background border-border/50 min-h-[120px]"
                placeholder="Describe the scent you're imagining... e.g., 'A warm evening walk through a Mediterranean garden after rain, with hints of citrus and herbs drying in the sun'"
                value={concept}
                onChange={e => setConcept(e.target.value)}
              />
              <p className="text-xs text-muted-foreground mt-1.5">
                Be as descriptive as you like — moods, memories, places, seasons, or abstract ideas all work.
              </p>
            </div>
          </div>
        )}

        {/* Step 3: Generated Result */}
        {step === "result" && generatedFormula && (
          <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
            {/* Formula header */}
            <div className="space-y-1">
              <h3 className="text-lg font-serif font-bold text-foreground">{generatedFormula.name}</h3>
              <p className="text-sm text-muted-foreground italic">{generatedFormula.description}</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-2">
              <Card className="bg-secondary/30 border-border/30">
                <CardContent className="py-2 px-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Ingredients</p>
                  <p className="text-lg font-bold text-accent">{generatedFormula.ingredients.length}</p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/30 border-border/30">
                <CardContent className="py-2 px-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Concentrate</p>
                  <p className="text-lg font-bold text-foreground">{totalConcentrateWeight.toFixed(2)}g</p>
                </CardContent>
              </Card>
              <Card className="bg-secondary/30 border-border/30">
                <CardContent className="py-2 px-3 text-center">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Solvent</p>
                  <p className="text-lg font-bold text-foreground">{parseFloat(generatedFormula.solventWeight || "0").toFixed(1)}g</p>
                </CardContent>
              </Card>
            </div>

            {/* Ingredients table */}
            <div className="overflow-x-auto rounded-lg border border-border/30">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/30">
                    <TableHead className="text-muted-foreground text-xs">Ingredient</TableHead>
                    <TableHead className="text-right text-muted-foreground text-xs">Weight (g)</TableHead>
                    <TableHead className="text-muted-foreground text-xs">Role</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {generatedFormula.ingredients.map((ing, idx) => (
                    <TableRow key={idx} className="border-border/20">
                      <TableCell className="font-medium text-sm text-foreground">{ing.name}</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-accent font-medium">{parseFloat(ing.weight).toFixed(3)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground max-w-[200px]">{ing.note}</TableCell>
                    </TableRow>
                  ))}
                  {generatedFormula.solventWeight && parseFloat(generatedFormula.solventWeight) > 0 && (
                    <TableRow className="border-border/20 bg-secondary/20">
                      <TableCell className="font-medium text-sm text-muted-foreground">{generatedFormula.solvent || "Ethanol"} (solvent)</TableCell>
                      <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{parseFloat(generatedFormula.solventWeight).toFixed(3)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">Carrier/diluent</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {/* Perfumer's notes */}
            <div>
              <button
                onClick={() => setShowPerfumerNotes(!showPerfumerNotes)}
                className="flex items-center gap-1.5 text-sm text-accent hover:text-accent/80 transition-colors"
              >
                {showPerfumerNotes ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
                Perfumer's Notes
              </button>
              {showPerfumerNotes && (
                <Card className="mt-2 bg-accent/5 border-accent/20">
                  <CardContent className="py-3 px-4">
                    <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{generatedFormula.perfumerNotes}</p>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Saved formulas indicator */}
            {savedFormulas.length > 0 && (
              <div className="text-xs text-accent bg-accent/10 rounded px-3 py-2">
                {savedFormulas.length} formula{savedFormulas.length > 1 ? "s" : ""} saved from this session. You can keep generating more variations!
              </div>
            )}
          </div>
        )}

        {/* Loading state for generation */}
        {step === "concept" && generateMutation.isPending && (
          <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-50 rounded-lg">
            <Loader2 className="size-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Generating your formula...</p>
            <p className="text-xs text-muted-foreground">The AI is crafting a balanced blend from your ingredients</p>
          </div>
        )}

        {step === "result" && generateMutation.isPending && (
          <div className="absolute inset-0 bg-card/80 backdrop-blur-sm flex flex-col items-center justify-center gap-3 z-50 rounded-lg">
            <Loader2 className="size-8 animate-spin text-accent" />
            <p className="text-sm text-muted-foreground">Generating a new variation...</p>
          </div>
        )}

        {/* Footer actions */}
        <DialogFooter className="shrink-0 flex-row gap-2">
          {step === "ingredients" && (
            <>
              <Button variant="outline" onClick={() => handleClose(false)}>Cancel</Button>
              <Button
                onClick={() => setStep("concept")}
                disabled={selectedIds.size === 0}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Next: Describe Idea <ArrowRight className="size-4" />
              </Button>
            </>
          )}
          {step === "concept" && (
            <>
              <Button variant="outline" onClick={() => setStep("ingredients")}>
                <ArrowLeft className="size-4" /> Back
              </Button>
              <Button
                onClick={handleGenerate}
                disabled={!concept.trim() || generateMutation.isPending}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                {generateMutation.isPending ? (
                  <><Loader2 className="size-4 animate-spin" /> Generating...</>
                ) : (
                  <><Sparkles className="size-4" /> Generate Formula</>
                )}
              </Button>
            </>
          )}
          {step === "result" && generatedFormula && (
            <>
              <Button variant="outline" onClick={() => setStep("concept")}>
                <ArrowLeft className="size-4" /> Edit Idea
              </Button>
              <Button
                variant="outline"
                onClick={handleRegenerate}
                disabled={generateMutation.isPending}
              >
                <RefreshCw className={`size-4 ${generateMutation.isPending ? "animate-spin" : ""}`} />
                Regenerate
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {saveMutation.isPending ? (
                  <><Loader2 className="size-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="size-4" /> Save Formula</>
                )}
              </Button>
              <Button
                onClick={handleSaveAndOpen}
                disabled={saveMutation.isPending}
                className="bg-accent hover:bg-accent/90 text-accent-foreground"
              >
                <FlaskConical className="size-4" /> Save & Open
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
