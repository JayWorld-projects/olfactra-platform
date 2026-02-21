import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import { LONGEVITY_LABELS, LONGEVITY_COLORS, CATEGORY_COLORS } from "@shared/perfumery";
import {
  ArrowLeft, Plus, Trash2, Scale, Download, Loader2, Save, FlaskConical,
  AlertTriangle,
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function FormulaBuilder() {
  const { loading } = useAuth();
  const navItems = useNavItems();
  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <DashboardLayout navItems={navItems} currentPath="/formulas" title="JayLabs Perfumery Studio">
      <BuilderContent />
    </DashboardLayout>
  );
}

function BuilderContent() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const formulaId = parseInt(params.id || "0");
  const [showAddIngredient, setShowAddIngredient] = useState(false);
  const [showScale, setShowScale] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");

  const { data: formula, isLoading } = trpc.formula.get.useQuery({ id: formulaId });
  const { data: allIngredients } = trpc.ingredient.list.useQuery({});
  const utils = trpc.useUtils();

  const updateFormulaMutation = trpc.formula.update.useMutation({
    onSuccess: () => {
      utils.formula.get.invalidate({ id: formulaId });
    },
  });

  const deleteFormulaMutation = trpc.formula.delete.useMutation({
    onSuccess: () => {
      toast.success("Formula deleted");
      setLocation("/formulas");
    },
  });

  const addIngredientMutation = trpc.formula.addIngredient.useMutation({
    onSuccess: () => {
      utils.formula.get.invalidate({ id: formulaId });
      setShowAddIngredient(false);
      toast.success("Ingredient added");
    },
  });

  const updateIngredientMutation = trpc.formula.updateIngredient.useMutation({
    onSuccess: () => utils.formula.get.invalidate({ id: formulaId }),
  });

  const removeIngredientMutation = trpc.formula.removeIngredient.useMutation({
    onSuccess: () => {
      utils.formula.get.invalidate({ id: formulaId });
      toast.success("Ingredient removed");
    },
  });

  // Ingredient add state
  const [selectedIngredientId, setSelectedIngredientId] = useState<string>("");
  const [addWeight, setAddWeight] = useState("1.000");
  const [addDilution, setAddDilution] = useState("100");
  const [ingredientSearch, setIngredientSearch] = useState("");

  const filteredAddIngredients = useMemo(() => {
    if (!allIngredients) return [];
    const existingIds = new Set(formula?.ingredients?.map((fi: any) => fi.ingredientId) || []);
    return allIngredients.filter(i =>
      !existingIds.has(i.id) &&
      (!ingredientSearch || i.name.toLowerCase().includes(ingredientSearch.toLowerCase()))
    );
  }, [allIngredients, formula, ingredientSearch]);

  // Calculations
  const formulaIngredients = formula?.ingredients || [];
  const concentrateWeight = useMemo(() =>
    formulaIngredients.reduce((sum: number, fi: any) => sum + parseFloat(fi.weight || "0"), 0),
    [formulaIngredients]
  );
  const solventWeight = parseFloat(formula?.solventWeight || "0");
  const totalWeight = concentrateWeight + solventWeight;
  const concentrationPercent = totalWeight > 0 ? (concentrateWeight / totalWeight) * 100 : 0;

  // Cost calculation
  const totalCost = useMemo(() =>
    formulaIngredients.reduce((sum: number, fi: any) => {
      const w = parseFloat(fi.weight || "0");
      const cpg = parseFloat(fi.ingredient?.costPerGram || "0");
      return sum + (w * cpg);
    }, 0),
    [formulaIngredients]
  );

  // IFRA warnings
  const ifraWarnings = useMemo(() => {
    const warnings: { name: string; current: number; limit: number }[] = [];
    formulaIngredients.forEach((fi: any) => {
      if (!fi.ingredient?.ifraLimit) return;
      const limit = parseFloat(fi.ingredient.ifraLimit);
      const w = parseFloat(fi.weight || "0");
      const dil = parseFloat(fi.dilutionPercent || "100") / 100;
      const effectiveWeight = w * dil;
      const pct = totalWeight > 0 ? (effectiveWeight / totalWeight) * 100 : 0;
      if (pct > limit) {
        warnings.push({ name: fi.ingredient.name, current: pct, limit });
      }
    });
    return warnings;
  }, [formulaIngredients, totalWeight]);

  // Pyramid data
  const pyramidData = useMemo(() => {
    const levels: Record<number, { weight: number; items: { name: string; weight: number; category: string }[] }> = {};
    for (let i = 0; i <= 5; i++) levels[i] = { weight: 0, items: [] };
    formulaIngredients.forEach((fi: any) => {
      const l = fi.ingredient?.longevity ?? 2;
      const w = parseFloat(fi.weight || "0");
      levels[l].weight += w;
      levels[l].items.push({
        name: fi.ingredient?.name || "Unknown",
        weight: w,
        category: fi.ingredient?.category || "Unknown",
      });
    });
    return levels;
  }, [formulaIngredients]);

  // Category breakdown
  const categoryBreakdown = useMemo(() => {
    const cats: Record<string, number> = {};
    formulaIngredients.forEach((fi: any) => {
      const c = fi.ingredient?.category || "Uncategorized";
      cats[c] = (cats[c] || 0) + parseFloat(fi.weight || "0");
    });
    return Object.entries(cats).sort((a, b) => b[1] - a[1]);
  }, [formulaIngredients]);

  const handleAddIngredient = () => {
    if (!selectedIngredientId) return;
    addIngredientMutation.mutate({
      formulaId,
      ingredientId: parseInt(selectedIngredientId),
      weight: addWeight,
      dilutionPercent: addDilution,
    });
  };

  const handleWeightChange = useCallback((fiId: number, newWeight: string) => {
    updateIngredientMutation.mutate({ id: fiId, weight: newWeight });
  }, [updateIngredientMutation]);

  const handleDilutionChange = useCallback((fiId: number, newDilution: string) => {
    updateIngredientMutation.mutate({ id: fiId, dilutionPercent: newDilution });
  }, [updateIngredientMutation]);

  const recalcTotal = useCallback(() => {
    updateFormulaMutation.mutate({
      id: formulaId,
      totalWeight: totalWeight.toFixed(3),
      solventWeight: solventWeight.toFixed(3),
    });
  }, [formulaId, totalWeight, solventWeight, updateFormulaMutation]);

  // Scale functions
  const [scaleMethod, setScaleMethod] = useState<string>("factor");
  const [scaleValue, setScaleValue] = useState("2");

  const handleScale = () => {
    let factor = 1;
    if (scaleMethod === "factor") {
      factor = parseFloat(scaleValue) || 1;
    } else if (scaleMethod === "targetWeight") {
      const target = parseFloat(scaleValue) || totalWeight;
      factor = totalWeight > 0 ? target / totalWeight : 1;
    } else if (scaleMethod === "targetConcentration") {
      const targetConc = parseFloat(scaleValue) || concentrationPercent;
      if (targetConc > 0 && targetConc < 100) {
        const newSolventWeight = (concentrateWeight * (100 - targetConc)) / targetConc;
        updateFormulaMutation.mutate({
          id: formulaId,
          solventWeight: newSolventWeight.toFixed(3),
          totalWeight: (concentrateWeight + newSolventWeight).toFixed(3),
        });
        setShowScale(false);
        toast.success("Concentration adjusted");
        return;
      }
    }

    // Scale all ingredients
    const promises = formulaIngredients.map((fi: any) => {
      const newWeight = (parseFloat(fi.weight || "0") * factor).toFixed(3);
      return updateIngredientMutation.mutateAsync({ id: fi.id, weight: newWeight });
    });
    const newSolvent = (solventWeight * factor).toFixed(3);
    updateFormulaMutation.mutate({
      id: formulaId,
      solventWeight: newSolvent,
      totalWeight: (totalWeight * factor).toFixed(3),
    });
    Promise.all(promises).then(() => {
      utils.formula.get.invalidate({ id: formulaId });
      setShowScale(false);
      toast.success("Formula scaled");
    });
  };

  // Export
  const generateExport = (format: string) => {
    if (!formula) return;
    let content = "";
    const lines = formulaIngredients.map((fi: any) => ({
      name: fi.ingredient?.name || "Unknown",
      weight: parseFloat(fi.weight || "0").toFixed(3),
      dilution: fi.dilutionPercent || "100",
      pct: totalWeight > 0 ? ((parseFloat(fi.weight || "0") / totalWeight) * 100).toFixed(2) : "0",
      category: fi.ingredient?.category || "",
    }));

    if (format === "markdown") {
      content = `# ${formula.name}\n\n`;
      if (formula.description) content += `${formula.description}\n\n`;
      content += `| Ingredient | Weight (g) | Dilution (%) | Concentration (%) | Category |\n`;
      content += `|---|---|---|---|---|\n`;
      lines.forEach(l => {
        content += `| ${l.name} | ${l.weight} | ${l.dilution}% | ${l.pct}% | ${l.category} |\n`;
      });
      content += `\n**Solvent (${formula.solvent || "Ethanol"}):** ${solventWeight.toFixed(3)}g\n`;
      content += `**Total Weight:** ${totalWeight.toFixed(3)}g\n`;
      content += `**Concentration:** ${concentrationPercent.toFixed(2)}%\n`;
      content += `**Estimated Cost:** $${totalCost.toFixed(2)}\n`;
    } else if (format === "csv") {
      content = "Ingredient,Weight (g),Dilution (%),Concentration (%),Category\n";
      lines.forEach(l => {
        content += `"${l.name}",${l.weight},${l.dilution},${l.pct},"${l.category}"\n`;
      });
      content += `"${formula.solvent || "Ethanol"} (Solvent)",${solventWeight.toFixed(3)},100,${totalWeight > 0 ? ((solventWeight / totalWeight) * 100).toFixed(2) : "0"},Solvent\n`;
    } else if (format === "tsv") {
      content = "Ingredient\tWeight (g)\tDilution (%)\tConcentration (%)\tCategory\n";
      lines.forEach(l => {
        content += `${l.name}\t${l.weight}\t${l.dilution}\t${l.pct}\t${l.category}\n`;
      });
      content += `${formula.solvent || "Ethanol"} (Solvent)\t${solventWeight.toFixed(3)}\t100\t${totalWeight > 0 ? ((solventWeight / totalWeight) * 100).toFixed(2) : "0"}\tSolvent\n`;
    }

    const blob = new Blob([content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const ext = format === "markdown" ? "md" : format;
    a.download = `${formula.name.replace(/\s+/g, "_")}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported as ${format.toUpperCase()}`);
    setShowExport(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!formula) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Formula not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/formulas")}>
          <ArrowLeft className="size-4" /> Back to Formulas
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/formulas")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          {editingName ? (
            <Input
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={() => {
                if (nameValue.trim()) {
                  updateFormulaMutation.mutate({ id: formulaId, name: nameValue.trim() });
                }
                setEditingName(false);
              }}
              onKeyDown={e => {
                if (e.key === "Enter") {
                  if (nameValue.trim()) {
                    updateFormulaMutation.mutate({ id: formulaId, name: nameValue.trim() });
                  }
                  setEditingName(false);
                }
              }}
              autoFocus
              className="text-xl font-serif font-bold h-auto py-1"
            />
          ) : (
            <h2
              className="text-xl font-serif font-bold cursor-pointer hover:text-primary transition-colors"
              onClick={() => { setNameValue(formula.name); setEditingName(true); }}
            >
              {formula.name}
            </h2>
          )}
          <p className="text-sm text-muted-foreground">{formula.description || "No description"}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setShowScale(true)}>
            <Scale className="size-3.5" /> Scale
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowExport(true)}>
            <Download className="size-3.5" /> Export
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              updateFormulaMutation.mutate({
                id: formulaId,
                status: formula.status === "draft" ? "final" : "draft",
              });
              toast.success(`Status changed to ${formula.status === "draft" ? "final" : "draft"}`);
            }}
          >
            {formula.status === "draft" ? "Finalize" : "Revert to Draft"}
          </Button>
          <Button variant="outline" size="sm" className="text-destructive" onClick={() => setShowDelete(true)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* IFRA Warnings */}
      {ifraWarnings.length > 0 && (
        <Card className="border-orange-300 bg-orange-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-orange-700 mb-2">
              <AlertTriangle className="size-4" />
              <span className="font-medium text-sm">IFRA Limit Warnings</span>
            </div>
            {ifraWarnings.map((w, i) => (
              <p key={i} className="text-xs text-orange-600">
                {w.name}: {w.current.toFixed(2)}% (limit: {w.limit}%)
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Concentrate</p>
            <p className="text-lg font-semibold">{concentrateWeight.toFixed(3)}g</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Solvent</p>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.001"
                value={solventWeight || ""}
                onChange={e => {
                  const val = e.target.value;
                  updateFormulaMutation.mutate({
                    id: formulaId,
                    solventWeight: val,
                    totalWeight: (concentrateWeight + parseFloat(val || "0")).toFixed(3),
                  });
                }}
                className="h-7 text-sm w-24"
              />
              <span className="text-xs text-muted-foreground">g</span>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
            <p className="text-lg font-semibold">{totalWeight.toFixed(3)}g</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Concentration</p>
            <p className="text-lg font-semibold">{concentrationPercent.toFixed(1)}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-3 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Est. Cost</p>
            <p className="text-lg font-semibold">${totalCost.toFixed(2)}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="ingredients" className="space-y-4">
        <TabsList>
          <TabsTrigger value="ingredients">Ingredients ({formulaIngredients.length})</TabsTrigger>
          <TabsTrigger value="pyramid">Fragrance Pyramid</TabsTrigger>
          <TabsTrigger value="categories">Category Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base">Formula Ingredients</CardTitle>
              <Button size="sm" onClick={() => { setShowAddIngredient(true); setIngredientSearch(""); setSelectedIngredientId(""); setAddWeight("1.000"); setAddDilution("100"); }}>
                <Plus className="size-3.5" /> Add
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {formulaIngredients.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-8 text-center">
                  <FlaskConical className="size-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">Add ingredients to start building your formula.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ingredient</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="text-right w-28">Weight (g)</TableHead>
                        <TableHead className="text-right w-24">Dilution %</TableHead>
                        <TableHead className="text-right w-20">% of Total</TableHead>
                        <TableHead className="text-right w-20">Cost</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formulaIngredients.map((fi: any) => {
                        const w = parseFloat(fi.weight || "0");
                        const pct = totalWeight > 0 ? (w / totalWeight) * 100 : 0;
                        const cost = w * parseFloat(fi.ingredient?.costPerGram || "0");
                        return (
                          <TableRow key={fi.id}>
                            <TableCell>
                              <span className="font-medium text-sm">{fi.ingredient?.name || "Unknown"}</span>
                              {fi.ingredient?.longevity != null && (
                                <Badge variant="outline" className="ml-2 text-[9px]">
                                  {LONGEVITY_LABELS[fi.ingredient.longevity] || `L${fi.ingredient.longevity}`}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{fi.ingredient?.category || "—"}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="0.001"
                                min="0"
                                value={fi.weight}
                                onChange={e => handleWeightChange(fi.id, e.target.value)}
                                className="h-7 text-sm text-right w-24 ml-auto"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number"
                                step="1"
                                min="1"
                                max="100"
                                value={fi.dilutionPercent || "100"}
                                onChange={e => handleDilutionChange(fi.id, e.target.value)}
                                className="h-7 text-sm text-right w-20 ml-auto"
                              />
                            </TableCell>
                            <TableCell className="text-right text-sm">{pct.toFixed(2)}%</TableCell>
                            <TableCell className="text-right text-sm">${cost.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-7 text-destructive"
                                onClick={() => removeIngredientMutation.mutate({ id: fi.id })}
                              >
                                <Trash2 className="size-3" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pyramid">
          <Card>
            <CardHeader><CardTitle className="text-base">Fragrance Pyramid</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {[0, 1, 2, 3, 4, 5].map(level => {
                  const data = pyramidData[level];
                  const pct = concentrateWeight > 0 ? (data.weight / concentrateWeight) * 100 : 0;
                  return (
                    <div key={level} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{LONGEVITY_LABELS[level]}</span>
                        <span className="text-muted-foreground">
                          {data.weight.toFixed(3)}g ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`,
                            backgroundColor: LONGEVITY_COLORS[level],
                          }}
                        />
                      </div>
                      {data.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          {data.items.map((item, idx) => (
                            <span key={idx} className="text-[10px] text-muted-foreground">
                              {item.name} ({item.weight.toFixed(3)}g)
                              {idx < data.items.length - 1 ? "," : ""}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card>
            <CardHeader><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader>
            <CardContent>
              {categoryBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No ingredients added yet.</p>
              ) : (
                <div className="space-y-3">
                  {categoryBreakdown.map(([cat, weight]) => {
                    const pct = concentrateWeight > 0 ? (weight / concentrateWeight) * 100 : 0;
                    const color = CATEGORY_COLORS[cat] || "#6b7280";
                    return (
                      <div key={cat} className="space-y-1">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium">{cat}</span>
                          <span className="text-muted-foreground">
                            {weight.toFixed(3)}g ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all"
                            style={{ width: `${Math.max(pct, 2)}%`, backgroundColor: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Ingredient Dialog */}
      <Dialog open={showAddIngredient} onOpenChange={setShowAddIngredient}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Add Ingredient to Formula</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Search Ingredient</Label>
              <Input
                placeholder="Type to search..."
                value={ingredientSearch}
                onChange={e => setIngredientSearch(e.target.value)}
              />
            </div>
            <div>
              <Label>Select Ingredient</Label>
              <Select value={selectedIngredientId} onValueChange={setSelectedIngredientId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose an ingredient" />
                </SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredAddIngredients.map(i => (
                    <SelectItem key={i.id} value={String(i.id)}>
                      {i.name} {i.category ? `(${i.category})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Weight (g)</Label>
                <Input type="number" step="0.001" min="0" value={addWeight} onChange={e => setAddWeight(e.target.value)} />
              </div>
              <div>
                <Label>Dilution (%)</Label>
                <Input type="number" step="1" min="1" max="100" value={addDilution} onChange={e => setAddDilution(e.target.value)} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddIngredient(false)}>Cancel</Button>
            <Button onClick={handleAddIngredient} disabled={!selectedIngredientId || addIngredientMutation.isPending}>
              {addIngredientMutation.isPending ? "Adding..." : "Add to Formula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scale Dialog */}
      <Dialog open={showScale} onOpenChange={setShowScale}>
        <DialogContent>
          <DialogHeader><DialogTitle>Scale Formula</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Scale Method</Label>
              <Select value={scaleMethod} onValueChange={setScaleMethod}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="factor">Scale by Factor</SelectItem>
                  <SelectItem value="targetWeight">Target Total Weight</SelectItem>
                  <SelectItem value="targetConcentration">Target Concentration %</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>
                {scaleMethod === "factor" ? "Factor (e.g., 2 = double)" :
                  scaleMethod === "targetWeight" ? "Target Weight (g)" :
                    "Target Concentration (%)"}
              </Label>
              <Input type="number" step="0.001" value={scaleValue} onChange={e => setScaleValue(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScale(false)}>Cancel</Button>
            <Button onClick={handleScale}>Apply Scale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent>
          <DialogHeader><DialogTitle>Export Formula</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Button variant="outline" className="justify-start" onClick={() => generateExport("markdown")}>
              <Download className="size-4" /> Export as Markdown (.md)
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => generateExport("csv")}>
              <Download className="size-4" /> Export as CSV
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => generateExport("tsv")}>
              <Download className="size-4" /> Export as TSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Formula</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{formula.name}"? This will remove all ingredients and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteFormulaMutation.mutate({ id: formulaId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
