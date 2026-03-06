import { useAuth } from "@/_core/hooks/useAuth";
import { trpc } from "@/lib/trpc";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { useNavItems } from "@/pages/Home";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Sparkles, Music, Save, FlaskConical, Loader2, Trash2,
  Clock, Leaf, ChevronDown, ChevronUp, BookOpen, ArrowRightLeft,
  Percent, X, Scale, Info, AlertTriangle,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

/* ─── Types ─── */
interface EditableIngredient {
  ingredientId: number;
  name: string;
  percentage: string;
  category?: string | null;
}

interface GeneratedAccord {
  name: string;
  description: string;
  scentFamily: string;
  estimatedLongevity: string;
  explanation: string;
  ingredients: { ingredientId: number; name: string; percentage: string }[];
}

interface SavedAccord {
  id: number;
  name: string;
  description: string | null;
  scentFamily: string | null;
  estimatedLongevity: string | null;
  explanation: string | null;
  createdAt: Date;
  ingredients: { id: number; ingredientId: number; percentage: string; ingredientName: string | null; ingredientCategory: string | null }[];
}

/* ─── Utility: normalize percentages to sum to 100 ─── */
function normalizePercentages(ingredients: EditableIngredient[]): EditableIngredient[] {
  const values = ingredients.map(i => parseFloat(i.percentage) || 0);
  const total = values.reduce((s, v) => s + v, 0);
  if (total === 0) {
    // Distribute equally
    const equal = (100 / ingredients.length).toFixed(1);
    return ingredients.map(i => ({ ...i, percentage: equal }));
  }
  return ingredients.map((ing, idx) => ({
    ...ing,
    percentage: ((values[idx] / total) * 100).toFixed(1),
  }));
}

function computeTotal(ingredients: EditableIngredient[]): number {
  return ingredients.reduce((s, i) => s + (parseFloat(i.percentage) || 0), 0);
}

/* ─── Main Page ─── */
export default function AccordBuilder() {
  const { loading, isAuthenticated } = useAuth();
  const navItems = useNavItems();

  if (loading) return <DashboardLayoutSkeleton />;
  if (!isAuthenticated) {
    window.location.href = "/";
    return null;
  }

  return (
    <DashboardLayout navItems={navItems} currentPath="/accord-builder">
      <AccordBuilderContent />
    </DashboardLayout>
  );
}

/* ─── Content ─── */
function AccordBuilderContent() {
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [variationCount, setVariationCount] = useState(3);
  const [generatedAccords, setGeneratedAccords] = useState<GeneratedAccord[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [totalWeight, setTotalWeight] = useState("10");

  // Editable state for generated accords: map from index to edited ingredients
  const [editedGenerated, setEditedGenerated] = useState<Map<number, EditableIngredient[]>>(new Map());

  const savedAccords = trpc.accord.list.useQuery();
  const generateMutation = trpc.accord.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedAccords(data.accords || []);
      setEditedGenerated(new Map()); // Reset edits
      setExpandedCards(new Set(data.accords.map((_: any, i: number) => i)));
      toast.success(`Generated ${data.accords.length} accord variation${data.accords.length !== 1 ? "s" : ""}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const saveMutation = trpc.accord.save.useMutation({
    onSuccess: () => {
      savedAccords.refetch();
      toast.success("Accord saved to library");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.accord.delete.useMutation({
    onSuccess: () => {
      savedAccords.refetch();
      toast.success("Accord deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const sendToFormulaMutation = trpc.accord.sendToFormula.useMutation({
    onSuccess: (data) => {
      toast.success("Formula created from accord");
      setLocation(`/formulas/${data.formulaId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const handleGenerate = () => {
    if (!prompt.trim()) {
      toast.error("Please enter a description for your accord");
      return;
    }
    setGeneratedAccords([]);
    setEditedGenerated(new Map());
    generateMutation.mutate({ prompt: prompt.trim(), variationCount });
  };

  const toggleCard = (index: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Get the current (possibly edited) ingredients for a generated accord
  const getGeneratedIngredients = useCallback((index: number, accord: GeneratedAccord): EditableIngredient[] => {
    if (editedGenerated.has(index)) return editedGenerated.get(index)!;
    return accord.ingredients.map(i => ({
      ingredientId: i.ingredientId,
      name: i.name,
      percentage: i.percentage.replace(/%/g, '').trim(),
    }));
  }, [editedGenerated]);

  const updateGeneratedIngredients = useCallback((index: number, ingredients: EditableIngredient[]) => {
    setEditedGenerated(prev => {
      const next = new Map(prev);
      next.set(index, ingredients);
      return next;
    });
  }, []);

  const handleSave = (accord: GeneratedAccord, index: number) => {
    const ingredients = getGeneratedIngredients(index, accord);
    saveMutation.mutate({
      name: accord.name,
      description: accord.description,
      scentFamily: accord.scentFamily,
      estimatedLongevity: accord.estimatedLongevity,
      explanation: accord.explanation,
      ingredients: ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        percentage: i.percentage,
      })),
    });
  };

  const handleSendToFormulaGenerated = (accord: GeneratedAccord, index: number) => {
    const ingredients = getGeneratedIngredients(index, accord);
    sendToFormulaMutation.mutate({
      name: accord.name,
      description: accord.description || undefined,
      ingredients: ingredients.map(i => ({
        ingredientId: i.ingredientId,
        percentage: i.percentage,
      })),
      totalWeight,
    });
  };

  const handleSendToFormulaSaved = (accord: SavedAccord, editedIngredients: EditableIngredient[]) => {
    sendToFormulaMutation.mutate({
      name: accord.name,
      description: accord.description || undefined,
      ingredients: editedIngredients.map(i => ({
        ingredientId: i.ingredientId,
        percentage: i.percentage,
      })),
      totalWeight,
    });
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-serif font-bold text-foreground">Accord Builder</h1>
        <p className="text-muted-foreground mt-1">
          Generate fragrance accords from descriptive prompts using your ingredient library
        </p>
      </div>

      <Tabs defaultValue="generate" className="space-y-6">
        <TabsList>
          <TabsTrigger value="generate" className="gap-1.5">
            <Sparkles className="size-3.5" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="library" className="gap-1.5">
            <BookOpen className="size-3.5" />
            Saved Accords
            {savedAccords.data && savedAccords.data.length > 0 && (
              <Badge variant="secondary" className="ml-1 text-xs">{savedAccords.data.length}</Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── Generate Tab ─── */}
        <TabsContent value="generate" className="space-y-6">
          {/* Prompt Card */}
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-medium flex items-center gap-2">
                <Music className="size-4 text-primary" />
                Describe Your Accord
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Textarea
                  placeholder="Create a creamy sandalwood accord..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[80px] resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1.5">
                  Describe the scent profile, mood, or ingredients you want in your accord
                </p>
              </div>
              <div className="flex items-end gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Variations</Label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button
                        key={n}
                        onClick={() => setVariationCount(n)}
                        className={`size-8 rounded-md text-sm font-medium transition-colors ${
                          variationCount === n
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-muted-foreground hover:bg-muted/80"
                        }`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Total Weight (g)</Label>
                  <Input
                    type="number"
                    value={totalWeight}
                    onChange={(e) => setTotalWeight(e.target.value)}
                    className="w-24"
                    min="1"
                    step="1"
                  />
                </div>
                <div className="flex-1" />
                <Button
                  onClick={handleGenerate}
                  disabled={generateMutation.isPending || !prompt.trim()}
                  className="bg-primary hover:bg-primary/90"
                >
                  {generateMutation.isPending ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="size-4" />
                      Generate Accord
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Loading State */}
          {generateMutation.isPending && (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-3">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm">Composing accord variations from your library...</p>
            </div>
          )}

          {/* Generated Accords */}
          {generatedAccords.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-lg font-medium text-foreground">
                Generated Variations
              </h2>
              <div className="grid gap-4">
                {generatedAccords.map((accord, index) => (
                  <EditableAccordCard
                    key={index}
                    accord={accord}
                    index={index}
                    expanded={expandedCards.has(index)}
                    onToggle={() => toggleCard(index)}
                    ingredients={getGeneratedIngredients(index, accord)}
                    onIngredientsChange={(ings) => updateGeneratedIngredients(index, ings)}
                    onSave={() => handleSave(accord, index)}
                    onSendToFormula={() => handleSendToFormulaGenerated(accord, index)}
                    saving={saveMutation.isPending}
                    sending={sendToFormulaMutation.isPending}
                    accordDescription={accord.description}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty state */}
          {!generateMutation.isPending && generatedAccords.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <Music className="size-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">Enter a scent description above and generate your first accord</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {["Warm amber accord", "Fresh citrus lift", "Creamy sandalwood base", "Dark leather accord", "Marine aquatic blend"].map((ex) => (
                  <button
                    key={ex}
                    onClick={() => setPrompt(ex)}
                    className="text-xs px-3 py-1.5 rounded-full border border-border text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}
        </TabsContent>

        {/* ─── Saved Accords Tab ─── */}
        <TabsContent value="library" className="space-y-4">
          {savedAccords.isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="size-6 animate-spin text-primary" />
            </div>
          )}
          {savedAccords.data && savedAccords.data.length === 0 && (
            <div className="text-center py-16 text-muted-foreground">
              <BookOpen className="size-10 mx-auto mb-3 opacity-40" />
              <p className="text-sm">No saved accords yet. Generate and save your first accord.</p>
            </div>
          )}
          {savedAccords.data && savedAccords.data.length > 0 && (
            <div className="grid gap-4">
              {savedAccords.data.map((accord: SavedAccord) => (
                <SavedAccordCard
                  key={accord.id}
                  accord={accord}
                  onDelete={() => deleteMutation.mutate({ id: accord.id })}
                  onSendToFormula={(editedIngs) => handleSendToFormulaSaved(accord, editedIngs)}
                  deleting={deleteMutation.isPending}
                  sending={sendToFormulaMutation.isPending}
                  totalWeight={totalWeight}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

/* ─── Percentage Total Badge ─── */
function TotalBadge({ total }: { total: number }) {
  const rounded = Math.round(total * 10) / 10;
  const isExact = Math.abs(rounded - 100) < 0.05;
  const isClose = Math.abs(rounded - 100) < 1;
  return (
    <Badge
      variant="outline"
      className={`text-xs font-mono gap-1 ${
        isExact
          ? "border-green-500/50 text-green-600 bg-green-50"
          : isClose
            ? "border-amber-500/50 text-amber-600 bg-amber-50"
            : "border-red-500/50 text-red-600 bg-red-50"
      }`}
    >
      <Percent className="size-3" />
      {rounded.toFixed(1)}%
    </Badge>
  );
}

/* ─── Editable Ingredient Table ─── */
function EditableIngredientTable({
  ingredients,
  onChange,
  onSwapRequest,
  showCategory,
}: {
  ingredients: EditableIngredient[];
  onChange: (ingredients: EditableIngredient[]) => void;
  onSwapRequest: (ingredientId: number, ingredientName: string) => void;
  showCategory?: boolean;
}) {
  const total = computeTotal(ingredients);

  const updatePercentage = (idx: number, value: string) => {
    const next = [...ingredients];
    next[idx] = { ...next[idx], percentage: value };
    onChange(next);
  };

  const removeIngredient = (idx: number) => {
    if (ingredients.length <= 1) {
      toast.error("An accord must have at least one ingredient");
      return;
    }
    const next = ingredients.filter((_, i) => i !== idx);
    onChange(next);
  };

  const handleNormalize = () => {
    onChange(normalizePercentages(ingredients));
    toast.success("Percentages normalized to 100%");
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Ingredients
        </h4>
        <div className="flex items-center gap-2">
          <TotalBadge total={total} />
          {Math.abs(total - 100) >= 0.05 && (
            <Button
              size="sm"
              variant="outline"
              className="h-6 text-xs px-2 gap-1"
              onClick={handleNormalize}
            >
              <Scale className="size-3" />
              Normalize
            </Button>
          )}
        </div>
      </div>
      <div className="rounded-lg border overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-muted/50">
              <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ingredient</th>
              {showCategory && (
                <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Category</th>
              )}
              <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider w-28">Percentage</th>
              <th className="text-center px-2 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider w-20">Actions</th>
            </tr>
          </thead>
          <tbody>
            {ingredients.map((ing, i) => (
              <tr key={`${ing.ingredientId}-${i}`} className="border-t group hover:bg-accent/20 transition-colors">
                <td className="px-3 py-2 text-foreground">{ing.name}</td>
                {showCategory && (
                  <td className="px-3 py-2 text-muted-foreground text-xs">{ing.category || "—"}</td>
                )}
                <td className="px-3 py-1.5 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Input
                      type="number"
                      value={ing.percentage}
                      onChange={(e) => updatePercentage(i, e.target.value)}
                      className="w-20 h-7 text-right font-mono text-sm px-2 border-border/50 focus:border-primary"
                      min="0"
                      max="100"
                      step="0.1"
                    />
                    <span className="text-xs text-muted-foreground">%</span>
                  </div>
                </td>
                <td className="px-2 py-1.5 text-center">
                  <div className="flex items-center justify-center gap-0.5">
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-primary"
                      title="Swap ingredient"
                      onClick={() => onSwapRequest(ing.ingredientId, ing.name)}
                    >
                      <ArrowRightLeft className="size-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                      title="Remove ingredient"
                      onClick={() => removeIngredient(i)}
                    >
                      <X className="size-3" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ─── Swap Dialog ─── */
function SwapDialog({
  open,
  onClose,
  ingredientId,
  ingredientName,
  accordIngredientIds,
  accordContext,
  onSwap,
}: {
  open: boolean;
  onClose: () => void;
  ingredientId: number;
  ingredientName: string;
  accordIngredientIds: number[];
  accordContext?: string;
  onSwap: (newIngredientId: number, newName: string) => void;
}) {
  const swapMutation = trpc.accord.suggestSwap.useMutation();

  // Auto-trigger fetch when dialog opens
  useEffect(() => {
    if (open && ingredientId) {
      swapMutation.mutate({
        ingredientId,
        ingredientName,
        accordIngredientIds,
        accordContext,
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ingredientId]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="bg-card border-border/50 max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="size-4 text-primary" />
            Swap: {ingredientName}
          </DialogTitle>
        </DialogHeader>

        {swapMutation.isPending ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Loader2 className="size-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Finding similar ingredients in your library...</p>
          </div>
        ) : swapMutation.isError ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <AlertTriangle className="size-8 text-destructive" />
            <p className="text-sm text-muted-foreground">Failed to find substitutes. Please try again.</p>
            <Button variant="outline" size="sm" onClick={() => swapMutation.mutate({
              ingredientId, ingredientName, accordIngredientIds, accordContext,
            })}>
              Retry
            </Button>
          </div>
        ) : (swapMutation.data?.suggestions || []).length === 0 ? (
          <div className="flex flex-col items-center gap-3 py-8">
            <Info className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">No suitable substitutes found in your library.</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
            {(swapMutation.data?.suggestions || []).map((s: any, idx: number) => (
              <Card key={idx} className="bg-secondary/50 border-border/30">
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-sm">{s.name}</span>
                      <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">{s.similarity}% match</Badge>
                      <Badge variant="outline" className={`text-[10px] ${
                        s.costComparison === "cheaper" ? "border-green-500/40 text-green-600" :
                        s.costComparison === "more expensive" ? "border-amber-500/40 text-amber-600" :
                        "border-border/50 text-muted-foreground"
                      }`}>
                        {s.costComparison === "cheaper" ? "↓ Cheaper" : s.costComparison === "more expensive" ? "↑ Pricier" : "≈ Similar cost"}
                      </Badge>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10 shrink-0"
                      onClick={() => {
                        onSwap(s.ingredientId, s.name);
                        onClose();
                      }}
                    >
                      <ArrowRightLeft className="size-3 mr-1" />Swap
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.reason}</p>
                  <p className="text-xs text-foreground/70"><span className="font-medium">Difference:</span> {s.difference}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/* ─── Editable Accord Card (Generated) ─── */
function EditableAccordCard({
  accord,
  index,
  expanded,
  onToggle,
  ingredients,
  onIngredientsChange,
  onSave,
  onSendToFormula,
  saving,
  sending,
  accordDescription,
}: {
  accord: GeneratedAccord;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  ingredients: EditableIngredient[];
  onIngredientsChange: (ingredients: EditableIngredient[]) => void;
  onSave: () => void;
  onSendToFormula: () => void;
  saving: boolean;
  sending: boolean;
  accordDescription?: string;
}) {
  const [swapTarget, setSwapTarget] = useState<{ id: number; name: string } | null>(null);

  const handleSwap = (newId: number, newName: string) => {
    if (!swapTarget) return;
    const next = ingredients.map(i =>
      i.ingredientId === swapTarget.id
        ? { ...i, ingredientId: newId, name: newName }
        : i
    );
    onIngredientsChange(next);
    toast.success(`Swapped ${swapTarget.name} → ${newName}`);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={onToggle}
        >
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-medium text-muted-foreground bg-muted rounded-full size-6 flex items-center justify-center shrink-0">
              {index + 1}
            </span>
            <div className="min-w-0">
              <h3 className="font-medium text-foreground truncate">{accord.name}</h3>
              <p className="text-xs text-muted-foreground truncate">{accord.description}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <Badge variant="outline" className="text-xs gap-1">
              <Leaf className="size-3" />
              {accord.scentFamily}
            </Badge>
            <Badge variant="outline" className="text-xs gap-1">
              <Clock className="size-3" />
              {accord.estimatedLongevity}
            </Badge>
            {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </div>
        </div>

        {expanded && (
          <CardContent className="pt-0 pb-4 px-5 space-y-4 border-t">
            {/* Editable Ingredients Table */}
            <div className="mt-4">
              <EditableIngredientTable
                ingredients={ingredients}
                onChange={onIngredientsChange}
                onSwapRequest={(id, name) => setSwapTarget({ id, name })}
              />
            </div>

            {/* Explanation */}
            {accord.explanation && (
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                <h4 className="text-xs font-medium text-primary uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="size-3" />
                  Perfumer's Insight
                </h4>
                <p className="text-sm text-foreground/80 leading-relaxed">{accord.explanation}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" variant="outline" onClick={onSave} disabled={saving}>
                {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Save className="size-3.5" />}
                Save Accord
              </Button>
              <Button size="sm" onClick={onSendToFormula} disabled={sending} className="bg-primary hover:bg-primary/90">
                {sending ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5" />}
                Send to Formula Builder
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Swap Dialog */}
      {swapTarget && (
        <SwapDialog
          open={!!swapTarget}
          onClose={() => setSwapTarget(null)}
          ingredientId={swapTarget.id}
          ingredientName={swapTarget.name}
          accordIngredientIds={ingredients.map(i => i.ingredientId)}
          accordContext={accordDescription}
          onSwap={handleSwap}
        />
      )}
    </>
  );
}

/* ─── Saved Accord Card ─── */
function SavedAccordCard({
  accord,
  onDelete,
  onSendToFormula,
  deleting,
  sending,
  totalWeight,
}: {
  accord: SavedAccord;
  onDelete: () => void;
  onSendToFormula: (editedIngredients: EditableIngredient[]) => void;
  deleting: boolean;
  sending: boolean;
  totalWeight: string;
}) {
  const [expanded, setExpanded] = useState(false);

  // Local editable state for this saved accord
  const [editedIngredients, setEditedIngredients] = useState<EditableIngredient[]>(() =>
    accord.ingredients.map(i => ({
      ingredientId: i.ingredientId,
      name: i.ingredientName || `Ingredient #${i.ingredientId}`,
      percentage: i.percentage.replace(/%/g, '').trim(),
      category: i.ingredientCategory,
    }))
  );

  const [swapTarget, setSwapTarget] = useState<{ id: number; name: string } | null>(null);

  const handleSwap = (newId: number, newName: string) => {
    if (!swapTarget) return;
    const next = editedIngredients.map(i =>
      i.ingredientId === swapTarget.id
        ? { ...i, ingredientId: newId, name: newName }
        : i
    );
    setEditedIngredients(next);
    toast.success(`Swapped ${swapTarget.name} → ${newName}`);
  };

  return (
    <>
      <Card className="overflow-hidden">
        <div
          className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-accent/30 transition-colors"
          onClick={() => setExpanded(!expanded)}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h3 className="font-medium text-foreground truncate">{accord.name}</h3>
              <p className="text-xs text-muted-foreground">
                {editedIngredients.length} ingredients
                {accord.scentFamily && <> · {accord.scentFamily}</>}
                {accord.estimatedLongevity && <> · {accord.estimatedLongevity}</>}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 ml-3">
            <span className="text-xs text-muted-foreground">
              {accord.createdAt ? new Date(accord.createdAt).toLocaleDateString() : ""}
            </span>
            {expanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
          </div>
        </div>

        {expanded && (
          <CardContent className="pt-0 pb-4 px-5 space-y-4 border-t">
            {/* Description */}
            {accord.description && (
              <p className="text-sm text-muted-foreground mt-3 italic">{accord.description}</p>
            )}

            {/* Editable Ingredients Table */}
            <div className="mt-2">
              <EditableIngredientTable
                ingredients={editedIngredients}
                onChange={setEditedIngredients}
                onSwapRequest={(id, name) => setSwapTarget({ id, name })}
                showCategory
              />
            </div>

            {/* Explanation */}
            {accord.explanation && (
              <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
                <h4 className="text-xs font-medium text-primary uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <Sparkles className="size-3" />
                  Perfumer's Insight
                </h4>
                <p className="text-sm text-foreground/80 leading-relaxed">{accord.explanation}</p>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-2 pt-1">
              <Button size="sm" onClick={() => onSendToFormula(editedIngredients)} disabled={sending} className="bg-primary hover:bg-primary/90">
                {sending ? <Loader2 className="size-3.5 animate-spin" /> : <FlaskConical className="size-3.5" />}
                Send to Formula Builder
              </Button>
              <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={onDelete} disabled={deleting}>
                {deleting ? <Loader2 className="size-3.5 animate-spin" /> : <Trash2 className="size-3.5" />}
                Delete
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Swap Dialog */}
      {swapTarget && (
        <SwapDialog
          open={!!swapTarget}
          onClose={() => setSwapTarget(null)}
          ingredientId={swapTarget.id}
          ingredientName={swapTarget.name}
          accordIngredientIds={editedIngredients.map(i => i.ingredientId)}
          accordContext={accord.description || undefined}
          onSwap={handleSwap}
        />
      )}
    </>
  );
}
