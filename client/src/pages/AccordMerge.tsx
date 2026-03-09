import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Layers, FlaskConical, Loader2, ArrowLeft, Percent,
  Scale, ChevronDown, ChevronUp, Leaf, Clock, Info,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { useNavItems } from "@/pages/Home";

/* ─── Types ─── */
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

interface AccordSelection {
  accordId: number;
  proportion: number;
}

interface MergedIngredient {
  ingredientId: number;
  name: string;
  category: string | null;
  percentage: number;
  sources: string[]; // which accords contribute this ingredient
}

/* ─── Main Page ─── */
export default function AccordMerge() {
  const { loading, isAuthenticated } = useAuth();
  const navItems = useNavItems();

  if (loading) return <DashboardLayoutSkeleton />;
  if (!isAuthenticated) {
    window.location.href = "/";
    return null;
  }

  return (
    <DashboardLayout navItems={navItems} currentPath="/accord-merge">
      <AccordMergeContent />
    </DashboardLayout>
  );
}

/* ─── Content ─── */
function AccordMergeContent() {
  const [, setLocation] = useLocation();
  const savedAccords = trpc.accord.list.useQuery();
  const mergeToFormulaMutation = trpc.accord.mergeToFormula.useMutation({
    onSuccess: (data) => {
      toast.success("Merged formula created successfully");
      setLocation(`/formulas/${data.formulaId}`);
    },
    onError: (err) => toast.error(err.message),
  });

  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [proportions, setProportions] = useState<Map<number, number>>(new Map());
  const [formulaName, setFormulaName] = useState("");
  const [formulaDescription, setFormulaDescription] = useState("");
  const [totalWeight, setTotalWeight] = useState("10");
  const [previewExpanded, setPreviewExpanded] = useState(true);

  const selectedAccords = useMemo(() => {
    if (!savedAccords.data) return [];
    return savedAccords.data.filter((a: SavedAccord) => selectedIds.has(a.id));
  }, [savedAccords.data, selectedIds]);

  const toggleAccord = useCallback((id: number) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    // Set default proportion for newly selected accords
    setProportions(prev => {
      const next = new Map(prev);
      if (!next.has(id)) {
        next.set(id, 50);
      }
      return next;
    });
  }, []);

  const updateProportion = useCallback((id: number, value: number) => {
    setProportions(prev => {
      const next = new Map(prev);
      next.set(id, value);
      return next;
    });
  }, []);

  // Compute merged preview
  const mergedPreview = useMemo((): MergedIngredient[] => {
    if (selectedAccords.length < 2) return [];

    // Normalize proportions
    const totalProportion = selectedAccords.reduce((sum, a) => sum + (proportions.get(a.id) || 50), 0);
    if (totalProportion <= 0) return [];

    const mergedMap = new Map<number, MergedIngredient>();

    for (const accord of selectedAccords) {
      const normalizedProportion = (proportions.get(accord.id) || 50) / totalProportion;
      for (const ing of accord.ingredients) {
        const pct = parseFloat(String(ing.percentage)) * normalizedProportion;
        const existing = mergedMap.get(ing.ingredientId);
        if (existing) {
          existing.percentage += pct;
          if (!existing.sources.includes(accord.name)) {
            existing.sources.push(accord.name);
          }
        } else {
          mergedMap.set(ing.ingredientId, {
            ingredientId: ing.ingredientId,
            name: ing.ingredientName || `Ingredient #${ing.ingredientId}`,
            category: ing.ingredientCategory || null,
            percentage: pct,
            sources: [accord.name],
          });
        }
      }
    }

    // Normalize to 100%
    const merged = Array.from(mergedMap.values());
    const totalPct = merged.reduce((sum, i) => sum + i.percentage, 0);
    if (totalPct > 0) {
      for (const ing of merged) {
        ing.percentage = (ing.percentage / totalPct) * 100;
      }
    }

    // Sort by percentage descending
    return merged.sort((a, b) => b.percentage - a.percentage);
  }, [selectedAccords, proportions]);

  const sharedIngredientCount = useMemo(() => {
    return mergedPreview.filter(i => i.sources.length > 1).length;
  }, [mergedPreview]);

  const handleMerge = () => {
    if (selectedAccords.length < 2) {
      toast.error("Select at least 2 accords to merge");
      return;
    }
    const accordNames = selectedAccords.map(a => a.name).join(" + ");
    const name = formulaName.trim() || `Merged: ${accordNames}`;

    mergeToFormulaMutation.mutate({
      name,
      description: formulaDescription.trim() || undefined,
      accordSelections: selectedAccords.map(a => ({
        accordId: a.id,
        proportion: proportions.get(a.id) || 50,
      })),
      totalWeight,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={() => setLocation("/accord-builder")}
        >
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <Layers className="size-6 text-primary" />
            Merge Accords
          </h1>
          <p className="text-muted-foreground mt-0.5 text-sm">
            Combine multiple saved accords into a single formula with custom proportions
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
        {/* Left Column: Accord Selection */}
        <div className="space-y-4">
          {/* Selection Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Select Accords to Merge
                </span>
                {selectedIds.size > 0 && (
                  <Badge variant="secondary" className="text-xs">
                    {selectedIds.size} selected
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {savedAccords.isLoading && (
                <div className="flex justify-center py-8">
                  <Loader2 className="size-6 animate-spin text-primary" />
                </div>
              )}
              {savedAccords.data && savedAccords.data.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="size-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">No saved accords yet. Generate and save accords first.</p>
                </div>
              )}
              {savedAccords.data && savedAccords.data.length > 0 && savedAccords.data.length < 2 && (
                <div className="text-center py-8 text-muted-foreground">
                  <Info className="size-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">You need at least 2 saved accords to merge. Currently you have {savedAccords.data.length}.</p>
                </div>
              )}
              {savedAccords.data && savedAccords.data.length >= 2 && (
                <div className="space-y-2">
                  {savedAccords.data.map((accord: SavedAccord) => (
                    <AccordSelectRow
                      key={accord.id}
                      accord={accord}
                      selected={selectedIds.has(accord.id)}
                      onToggle={() => toggleAccord(accord.id)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Proportion Sliders */}
          {selectedAccords.length >= 2 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-medium flex items-center gap-2">
                  <Scale className="size-4 text-primary" />
                  Blend Proportions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                {selectedAccords.map((accord) => {
                  const proportion = proportions.get(accord.id) || 50;
                  const totalProportion = selectedAccords.reduce((sum, a) => sum + (proportions.get(a.id) || 50), 0);
                  const normalizedPct = totalProportion > 0 ? ((proportion / totalProportion) * 100).toFixed(1) : "0.0";
                  return (
                    <div key={accord.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="text-sm font-medium truncate max-w-[200px]">{accord.name}</Label>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-muted-foreground w-12 text-right">{normalizedPct}%</span>
                          <Input
                            type="number"
                            value={proportion}
                            onChange={(e) => updateProportion(accord.id, Math.max(0, Math.min(100, parseInt(e.target.value) || 0)))}
                            className="w-16 h-7 text-right font-mono text-sm px-2"
                            min="0"
                            max="100"
                          />
                        </div>
                      </div>
                      <Slider
                        value={[proportion]}
                        onValueChange={([v]) => updateProportion(accord.id, v)}
                        min={0}
                        max={100}
                        step={1}
                        className="w-full"
                      />
                    </div>
                  );
                })}
                <p className="text-xs text-muted-foreground">
                  Proportions are relative — they will be normalized so the final blend sums to 100%.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right Column: Preview & Create */}
        <div className="space-y-4">
          {/* Formula Settings */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-medium">Formula Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Formula Name</Label>
                <Input
                  placeholder={selectedAccords.length >= 2 ? `Merged: ${selectedAccords.map(a => a.name).join(" + ")}` : "Select accords first..."}
                  value={formulaName}
                  onChange={(e) => setFormulaName(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Description (optional)</Label>
                <Input
                  placeholder="A custom blend of multiple accords..."
                  value={formulaDescription}
                  onChange={(e) => setFormulaDescription(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Total Weight (g)</Label>
                <Input
                  type="number"
                  value={totalWeight}
                  onChange={(e) => setTotalWeight(e.target.value)}
                  className="w-24"
                  min="0.1"
                  step="0.1"
                />
              </div>
            </CardContent>
          </Card>

          {/* Live Preview */}
          {mergedPreview.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div
                  className="flex items-center justify-between cursor-pointer"
                  onClick={() => setPreviewExpanded(!previewExpanded)}
                >
                  <CardTitle className="text-base font-medium flex items-center gap-2">
                    <FlaskConical className="size-4 text-primary" />
                    Merged Preview
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {mergedPreview.length} ingredients
                    </Badge>
                    {sharedIngredientCount > 0 && (
                      <Badge variant="outline" className="text-xs border-amber-500/50 text-amber-600 bg-amber-50">
                        {sharedIngredientCount} shared
                      </Badge>
                    )}
                    {previewExpanded ? <ChevronUp className="size-4 text-muted-foreground" /> : <ChevronDown className="size-4 text-muted-foreground" />}
                  </div>
                </div>
              </CardHeader>
              {previewExpanded && (
                <CardContent className="pt-0">
                  <div className="rounded-lg border overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-muted/50">
                          <th className="text-left px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider">Ingredient</th>
                          <th className="text-right px-3 py-2 font-medium text-muted-foreground text-xs uppercase tracking-wider w-20">%</th>
                        </tr>
                      </thead>
                      <tbody>
                        {mergedPreview.map((ing) => (
                          <tr key={ing.ingredientId} className="border-t hover:bg-accent/20 transition-colors">
                            <td className="px-3 py-2">
                              <div className="flex items-center gap-2">
                                <span className="text-foreground">{ing.name}</span>
                                {ing.sources.length > 1 && (
                                  <Badge variant="outline" className="text-[10px] border-amber-500/40 text-amber-600 shrink-0">
                                    shared
                                  </Badge>
                                )}
                              </div>
                              {ing.sources.length > 1 && (
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  From: {ing.sources.join(", ")}
                                </p>
                              )}
                            </td>
                            <td className="px-3 py-2 text-right font-mono text-sm">
                              {ing.percentage.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="border-t bg-muted/30">
                          <td className="px-3 py-2 font-medium text-xs text-muted-foreground uppercase">Total</td>
                          <td className="px-3 py-2 text-right font-mono text-sm font-medium text-green-600">
                            {mergedPreview.reduce((s, i) => s + i.percentage, 0).toFixed(1)}%
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          {/* Create Button */}
          <Button
            className="w-full bg-primary hover:bg-primary/90 h-11"
            disabled={selectedAccords.length < 2 || mergeToFormulaMutation.isPending}
            onClick={handleMerge}
          >
            {mergeToFormulaMutation.isPending ? (
              <Loader2 className="size-4 animate-spin mr-2" />
            ) : (
              <FlaskConical className="size-4 mr-2" />
            )}
            {selectedAccords.length < 2
              ? "Select at least 2 accords"
              : `Merge ${selectedAccords.length} Accords into Formula`
            }
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─── Accord Selection Row ─── */
function AccordSelectRow({
  accord,
  selected,
  onToggle,
}: {
  accord: SavedAccord;
  selected: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
        selected
          ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20"
          : "border-border/50 hover:border-border hover:bg-accent/20"
      }`}
      onClick={onToggle}
    >
      <Checkbox
        checked={selected}
        onCheckedChange={() => onToggle()}
        className="shrink-0"
      />
      <div className="min-w-0 flex-1">
        <h4 className="text-sm font-medium text-foreground truncate">{accord.name}</h4>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-muted-foreground">
            {accord.ingredients.length} ingredients
          </span>
          {accord.scentFamily && (
            <Badge variant="outline" className="text-[10px] gap-0.5 h-4 px-1.5">
              <Leaf className="size-2.5" />
              {accord.scentFamily}
            </Badge>
          )}
          {accord.estimatedLongevity && (
            <Badge variant="outline" className="text-[10px] gap-0.5 h-4 px-1.5">
              <Clock className="size-2.5" />
              {accord.estimatedLongevity}
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
}
