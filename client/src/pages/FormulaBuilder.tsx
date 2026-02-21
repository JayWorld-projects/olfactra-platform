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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import { LONGEVITY_LABELS, LONGEVITY_COLORS, CATEGORY_COLORS } from "@shared/perfumery";
import {
  ArrowLeft, Plus, Trash2, Scale, Download, Loader2, FlaskConical,
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
    <DashboardLayout navItems={navItems} currentPath="/formulas" title="JayLabs Perfumery">
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
    onSuccess: () => utils.formula.get.invalidate({ id: formulaId }),
  });
  const deleteFormulaMutation = trpc.formula.delete.useMutation({
    onSuccess: () => { toast.success("Formula deleted"); setLocation("/formulas"); },
  });
  const addIngredientMutation = trpc.formula.addIngredient.useMutation({
    onSuccess: () => { utils.formula.get.invalidate({ id: formulaId }); setShowAddIngredient(false); toast.success("Ingredient added"); },
  });
  const updateIngredientMutation = trpc.formula.updateIngredient.useMutation({
    onSuccess: () => utils.formula.get.invalidate({ id: formulaId }),
  });
  const removeIngredientMutation = trpc.formula.removeIngredient.useMutation({
    onSuccess: () => { utils.formula.get.invalidate({ id: formulaId }); toast.success("Ingredient removed"); },
  });

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

  const formulaIngredients = formula?.ingredients || [];
  const concentrateWeight = useMemo(() =>
    formulaIngredients.reduce((sum: number, fi: any) => sum + parseFloat(fi.weight || "0"), 0),
    [formulaIngredients]
  );
  const solventWeight = parseFloat(formula?.solventWeight || "0");
  const totalWeight = concentrateWeight + solventWeight;
  const concentrationPercent = totalWeight > 0 ? (concentrateWeight / totalWeight) * 100 : 0;

  const totalCost = useMemo(() =>
    formulaIngredients.reduce((sum: number, fi: any) => {
      const w = parseFloat(fi.weight || "0");
      const cpg = parseFloat(fi.ingredient?.costPerGram || "0");
      return sum + (w * cpg);
    }, 0),
    [formulaIngredients]
  );

  const ifraWarnings = useMemo(() => {
    const warnings: { name: string; current: number; limit: number }[] = [];
    formulaIngredients.forEach((fi: any) => {
      if (!fi.ingredient?.ifraLimit) return;
      const limit = parseFloat(fi.ingredient.ifraLimit);
      const w = parseFloat(fi.weight || "0");
      const dil = parseFloat(fi.dilutionPercent || "100") / 100;
      const effectiveWeight = w * dil;
      const pct = totalWeight > 0 ? (effectiveWeight / totalWeight) * 100 : 0;
      if (pct > limit) warnings.push({ name: fi.ingredient.name, current: pct, limit });
    });
    return warnings;
  }, [formulaIngredients, totalWeight]);

  const pyramidData = useMemo(() => {
    const levels: Record<number, { weight: number; items: { name: string; weight: number; category: string }[] }> = {};
    for (let i = 0; i <= 5; i++) levels[i] = { weight: 0, items: [] };
    formulaIngredients.forEach((fi: any) => {
      const l = fi.ingredient?.longevity ?? 2;
      const w = parseFloat(fi.weight || "0");
      levels[l].weight += w;
      levels[l].items.push({ name: fi.ingredient?.name || "Unknown", weight: w, category: fi.ingredient?.category || "Unknown" });
    });
    return levels;
  }, [formulaIngredients]);

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
    addIngredientMutation.mutate({ formulaId, ingredientId: parseInt(selectedIngredientId), weight: addWeight, dilutionPercent: addDilution });
  };

  const handleWeightChange = useCallback((fiId: number, newWeight: string) => {
    updateIngredientMutation.mutate({ id: fiId, weight: newWeight });
  }, [updateIngredientMutation]);

  const handleDilutionChange = useCallback((fiId: number, newDilution: string) => {
    updateIngredientMutation.mutate({ id: fiId, dilutionPercent: newDilution });
  }, [updateIngredientMutation]);

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
        updateFormulaMutation.mutate({ id: formulaId, solventWeight: newSolventWeight.toFixed(3), totalWeight: (concentrateWeight + newSolventWeight).toFixed(3) });
        setShowScale(false);
        toast.success("Concentration adjusted");
        return;
      }
    }
    const promises = formulaIngredients.map((fi: any) => {
      const newWeight = (parseFloat(fi.weight || "0") * factor).toFixed(3);
      return updateIngredientMutation.mutateAsync({ id: fi.id, weight: newWeight });
    });
    const newSolvent = (solventWeight * factor).toFixed(3);
    updateFormulaMutation.mutate({ id: formulaId, solventWeight: newSolvent, totalWeight: (totalWeight * factor).toFixed(3) });
    Promise.all(promises).then(() => {
      utils.formula.get.invalidate({ id: formulaId });
      setShowScale(false);
      toast.success("Formula scaled");
    });
  };

  const generateExport = (format: string) => {
    if (!formula) return;
    const lines = formulaIngredients.map((fi: any) => ({
      name: fi.ingredient?.name || "Unknown",
      weight: parseFloat(fi.weight || "0").toFixed(3),
      dilution: fi.dilutionPercent || "100",
      pct: totalWeight > 0 ? ((parseFloat(fi.weight || "0") / totalWeight) * 100).toFixed(2) : "0",
      category: fi.ingredient?.category || "",
      longevity: fi.ingredient?.longevity != null ? (LONGEVITY_LABELS[fi.ingredient.longevity] || `Level ${fi.ingredient.longevity}`) : "",
    }));

    if (format === "pdf") {
      generatePdfExport(formula, lines);
      return;
    }

    let content = "";
    if (format === "markdown") {
      content = `# ${formula.name}\n\n`;
      if (formula.description) content += `${formula.description}\n\n`;
      content += `| Ingredient | Weight (g) | Dilution (%) | Concentration (%) | Category |\n`;
      content += `|---|---|---|---|---|\n`;
      lines.forEach(l => { content += `| ${l.name} | ${l.weight} | ${l.dilution}% | ${l.pct}% | ${l.category} |\n`; });
      content += `\n**Solvent (${formula.solvent || "Ethanol"}):** ${solventWeight.toFixed(3)}g\n`;
      content += `**Total Weight:** ${totalWeight.toFixed(3)}g\n`;
      content += `**Concentration:** ${concentrationPercent.toFixed(2)}%\n`;
      content += `**Estimated Cost:** $${totalCost.toFixed(2)}\n`;
    } else if (format === "csv") {
      content = "Ingredient,Weight (g),Dilution (%),Concentration (%),Category\n";
      lines.forEach(l => { content += `"${l.name}",${l.weight},${l.dilution},${l.pct},"${l.category}"\n`; });
      content += `"${formula.solvent || "Ethanol"} (Solvent)",${solventWeight.toFixed(3)},100,${totalWeight > 0 ? ((solventWeight / totalWeight) * 100).toFixed(2) : "0"},Solvent\n`;
    } else if (format === "tsv") {
      content = "Ingredient\tWeight (g)\tDilution (%)\tConcentration (%)\tCategory\n";
      lines.forEach(l => { content += `${l.name}\t${l.weight}\t${l.dilution}\t${l.pct}\t${l.category}\n`; });
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

  const generatePdfExport = (formula: any, lines: { name: string; weight: string; dilution: string; pct: string; category: string; longevity: string }[]) => {
    const now = new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
    const htmlContent = `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; color: #1a1a1a; padding: 40px; background: white; }
  .header { border-bottom: 3px solid #006778; padding-bottom: 20px; margin-bottom: 30px; }
  .brand { font-family: 'Playfair Display', serif; font-size: 12px; color: #006778; text-transform: uppercase; letter-spacing: 3px; margin-bottom: 4px; }
  .formula-name { font-family: 'Playfair Display', serif; font-size: 28px; font-weight: 700; color: #101820; margin-bottom: 6px; }
  .date { font-size: 11px; color: #666; }
  .description { font-size: 13px; color: #444; margin-bottom: 24px; line-height: 1.5; }
  .stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 28px; }
  .stat-card { background: #f8f9fa; border: 1px solid #e9ecef; border-radius: 8px; padding: 14px; }
  .stat-label { font-size: 10px; text-transform: uppercase; letter-spacing: 1px; color: #888; margin-bottom: 4px; }
  .stat-value { font-size: 20px; font-weight: 600; color: #101820; }
  .stat-value.accent { color: #D7A22A; }
  .stat-value.teal { color: #006778; }
  table { width: 100%; border-collapse: collapse; margin-bottom: 24px; }
  th { background: #006778; color: white; font-size: 11px; text-transform: uppercase; letter-spacing: 0.5px; padding: 10px 12px; text-align: left; font-weight: 500; }
  th:nth-child(3), th:nth-child(4), th:nth-child(5), th:nth-child(6) { text-align: right; }
  td { padding: 9px 12px; font-size: 12px; border-bottom: 1px solid #eee; }
  td:nth-child(3), td:nth-child(4), td:nth-child(5), td:nth-child(6) { text-align: right; font-variant-numeric: tabular-nums; }
  tr:nth-child(even) { background: #fafafa; }
  tr.solvent-row { background: #f0f7f9; font-style: italic; }
  tr.total-row { background: #006778; color: white; font-weight: 600; }
  tr.total-row td { border-bottom: none; }
  .pyramid-section { margin-bottom: 24px; }
  .pyramid-title { font-family: 'Playfair Display', serif; font-size: 16px; font-weight: 700; color: #101820; margin-bottom: 12px; }
  .pyramid-bar { display: flex; align-items: center; margin-bottom: 6px; }
  .pyramid-label { width: 120px; font-size: 11px; font-weight: 500; color: #444; }
  .pyramid-track { flex: 1; height: 16px; background: #f0f0f0; border-radius: 8px; overflow: hidden; margin-right: 10px; }
  .pyramid-fill { height: 100%; border-radius: 8px; }
  .pyramid-value { font-size: 11px; color: #666; width: 80px; text-align: right; font-variant-numeric: tabular-nums; }
  .footer { margin-top: 30px; padding-top: 16px; border-top: 1px solid #ddd; display: flex; justify-content: space-between; align-items: center; }
  .footer-brand { font-family: 'Playfair Display', serif; font-size: 14px; color: #006778; }
  .footer-note { font-size: 10px; color: #999; }
  @media print { body { padding: 20px; } }
</style>
</head>
<body>
  <div class="header">
    <div class="brand">JayLabs Perfumery</div>
    <div class="formula-name">${formula.name}</div>
    <div class="date">${now} &bull; Status: ${formula.status === "final" ? "Final" : "Draft"}</div>
  </div>
  ${formula.description ? `<div class="description">${formula.description}</div>` : ""}
  <div class="stats-grid">
    <div class="stat-card"><div class="stat-label">Concentrate</div><div class="stat-value">${concentrateWeight.toFixed(3)}g</div></div>
    <div class="stat-card"><div class="stat-label">Total Weight</div><div class="stat-value">${totalWeight.toFixed(3)}g</div></div>
    <div class="stat-card"><div class="stat-label">Concentration</div><div class="stat-value teal">${concentrationPercent.toFixed(1)}%</div></div>
    <div class="stat-card"><div class="stat-label">Estimated Cost</div><div class="stat-value accent">$${totalCost.toFixed(2)}</div></div>
  </div>
  <table>
    <thead><tr><th>Ingredient</th><th>Category</th><th>Weight (g)</th><th>Dilution</th><th>% of Total</th><th>Longevity</th></tr></thead>
    <tbody>
      ${lines.map(l => `<tr><td>${l.name}</td><td>${l.category}</td><td>${l.weight}</td><td>${l.dilution}%</td><td>${l.pct}%</td><td>${l.longevity}</td></tr>`).join("")}
      <tr class="solvent-row"><td>${formula.solvent || "Ethanol"} (Solvent)</td><td>Solvent</td><td>${solventWeight.toFixed(3)}</td><td>100%</td><td>${totalWeight > 0 ? ((solventWeight / totalWeight) * 100).toFixed(2) : "0"}%</td><td>&mdash;</td></tr>
      <tr class="total-row"><td><strong>Total</strong></td><td></td><td><strong>${totalWeight.toFixed(3)}</strong></td><td></td><td><strong>100%</strong></td><td></td></tr>
    </tbody>
  </table>
  <div class="pyramid-section">
    <div class="pyramid-title">Fragrance Pyramid</div>
    ${[0,1,2,3,4,5].map(level => {
      const data = pyramidData[level];
      const pct = concentrateWeight > 0 ? (data.weight / concentrateWeight) * 100 : 0;
      const colors: Record<number, string> = { 0: "#f97316", 1: "#eab308", 2: "#84cc16", 3: "#22c55e", 4: "#0ea5e9", 5: "#8b5cf6" };
      return `<div class="pyramid-bar"><span class="pyramid-label">${LONGEVITY_LABELS[level]}</span><div class="pyramid-track"><div class="pyramid-fill" style="width:${Math.max(pct, pct > 0 ? 2 : 0)}%;background:${colors[level]}"></div></div><span class="pyramid-value">${data.weight.toFixed(3)}g (${pct.toFixed(1)}%)</span></div>`;
    }).join("")}
  </div>
  <div class="footer">
    <div class="footer-brand">JayLabs Perfumery Studio</div>
    <div class="footer-note">Generated on ${now}</div>
  </div>
</body>
</html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.print();
      }, 500);
      toast.success("PDF ready — use your browser's print dialog to save");
    } else {
      toast.error("Pop-up blocked. Please allow pop-ups and try again.");
    }
    setShowExport(false);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
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
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/formulas")} className="hover:bg-secondary">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1 min-w-0">
          {editingName ? (
            <Input
              value={nameValue}
              onChange={e => setNameValue(e.target.value)}
              onBlur={() => { if (nameValue.trim()) updateFormulaMutation.mutate({ id: formulaId, name: nameValue.trim() }); setEditingName(false); }}
              onKeyDown={e => { if (e.key === "Enter") { if (nameValue.trim()) updateFormulaMutation.mutate({ id: formulaId, name: nameValue.trim() }); setEditingName(false); } }}
              autoFocus
              className="text-xl font-serif font-bold h-auto py-1 bg-background border-border/50"
            />
          ) : (
            <h2
              className="text-xl font-serif font-bold cursor-pointer hover:text-primary transition-colors truncate"
              onClick={() => { setNameValue(formula.name); setEditingName(true); }}
            >
              {formula.name}
            </h2>
          )}
          <p className="text-sm text-muted-foreground truncate">{formula.description || "Click name to edit"}</p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Button variant="outline" size="sm" onClick={() => setShowScale(true)} className="border-border/50">
            <Scale className="size-3.5" /> Scale
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowExport(true)} className="border-border/50">
            <Download className="size-3.5" /> Export
          </Button>
          <Button
            variant="outline" size="sm"
            className={formula.status === "draft" ? "border-accent/50 text-accent hover:bg-accent/10" : "border-border/50"}
            onClick={() => {
              updateFormulaMutation.mutate({ id: formulaId, status: formula.status === "draft" ? "final" : "draft" });
              toast.success(`Status changed to ${formula.status === "draft" ? "final" : "draft"}`);
            }}
          >
            {formula.status === "draft" ? "Finalize" : "Revert to Draft"}
          </Button>
          <Button variant="outline" size="sm" className="text-destructive border-border/50 hover:bg-destructive/10" onClick={() => setShowDelete(true)}>
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* IFRA Warnings */}
      {ifraWarnings.length > 0 && (
        <Card className="border-amber-500/50 bg-amber-500/10">
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-2 text-amber-400 mb-2">
              <AlertTriangle className="size-4" />
              <span className="font-medium text-sm">IFRA Limit Warnings</span>
            </div>
            {ifraWarnings.map((w, i) => (
              <p key={i} className="text-xs text-amber-300/80">
                {w.name}: {w.current.toFixed(2)}% (limit: {w.limit}%)
              </p>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        {[
          { label: "Concentrate", value: `${concentrateWeight.toFixed(3)}g` },
          { label: "Total", value: `${totalWeight.toFixed(3)}g` },
          { label: "Concentration", value: `${concentrationPercent.toFixed(1)}%` },
          { label: "Est. Cost", value: `$${totalCost.toFixed(2)}`, accent: true },
        ].map(stat => (
          <Card key={stat.label} className="bg-card border-border/50">
            <CardContent className="pt-3 pb-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{stat.label}</p>
              <p className={`text-lg font-semibold tabular-nums ${stat.accent ? "text-accent" : "text-foreground"}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="bg-card border-border/50">
          <CardContent className="pt-3 pb-3">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Solvent</p>
            <div className="flex items-center gap-1.5">
              <Input
                type="number" step="0.001"
                value={solventWeight || ""}
                onChange={e => {
                  const val = e.target.value;
                  updateFormulaMutation.mutate({ id: formulaId, solventWeight: val, totalWeight: (concentrateWeight + parseFloat(val || "0")).toFixed(3) });
                }}
                className="h-7 text-sm w-20 bg-background border-border/50 tabular-nums"
              />
              <span className="text-xs text-muted-foreground">g</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="ingredients" className="space-y-4">
        <TabsList className="bg-secondary">
          <TabsTrigger value="ingredients">Ingredients ({formulaIngredients.length})</TabsTrigger>
          <TabsTrigger value="pyramid">Fragrance Pyramid</TabsTrigger>
          <TabsTrigger value="categories">Category Breakdown</TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients">
          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base font-semibold">Formula Ingredients</CardTitle>
              <Button size="sm" onClick={() => { setShowAddIngredient(true); setIngredientSearch(""); setSelectedIngredientId(""); setAddWeight("1.000"); setAddDilution("100"); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Plus className="size-3.5" /> Add
              </Button>
            </CardHeader>
            <CardContent className="p-0">
              {formulaIngredients.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <div className="size-12 rounded-xl bg-secondary flex items-center justify-center">
                    <FlaskConical className="size-6 text-muted-foreground" />
                  </div>
                  <p className="text-sm text-muted-foreground">Add ingredients to start building your formula.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-border/50">
                        <TableHead className="text-muted-foreground">Ingredient</TableHead>
                        <TableHead className="text-muted-foreground">Category</TableHead>
                        <TableHead className="text-right w-28 text-muted-foreground">Weight (g)</TableHead>
                        <TableHead className="text-right w-24 text-muted-foreground">Dilution %</TableHead>
                        <TableHead className="text-right w-20 text-muted-foreground">% of Total</TableHead>
                        <TableHead className="text-right w-20 text-muted-foreground">Cost</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formulaIngredients.map((fi: any) => {
                        const w = parseFloat(fi.weight || "0");
                        const pct = totalWeight > 0 ? (w / totalWeight) * 100 : 0;
                        const cost = w * parseFloat(fi.ingredient?.costPerGram || "0");
                        return (
                          <TableRow key={fi.id} className="border-border/30">
                            <TableCell>
                              <span className="font-medium text-sm text-foreground">{fi.ingredient?.name || "Unknown"}</span>
                              {fi.ingredient?.longevity != null && (
                                <Badge variant="outline" className="ml-2 text-[9px] border-primary/30 text-primary">
                                  {LONGEVITY_LABELS[fi.ingredient.longevity] || `L${fi.ingredient.longevity}`}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-xs text-muted-foreground">{fi.ingredient?.category || "—"}</TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number" step="0.001" min="0"
                                value={fi.weight}
                                onChange={e => handleWeightChange(fi.id, e.target.value)}
                                className="h-7 text-sm text-right w-24 ml-auto bg-background border-border/50 tabular-nums"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <Input
                                type="number" step="1" min="1" max="100"
                                value={fi.dilutionPercent || "100"}
                                onChange={e => handleDilutionChange(fi.id, e.target.value)}
                                className="h-7 text-sm text-right w-20 ml-auto bg-background border-border/50 tabular-nums"
                              />
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums">{pct.toFixed(2)}%</TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-accent">${cost.toFixed(2)}</TableCell>
                            <TableCell>
                              <Button variant="ghost" size="icon" className="size-7 text-destructive hover:bg-destructive/10" onClick={() => removeIngredientMutation.mutate({ id: fi.id })}>
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
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-base font-semibold">Fragrance Pyramid</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[0, 1, 2, 3, 4, 5].map(level => {
                  const data = pyramidData[level];
                  const pct = concentrateWeight > 0 ? (data.weight / concentrateWeight) * 100 : 0;
                  return (
                    <div key={level} className="space-y-1.5">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-foreground">{LONGEVITY_LABELS[level]}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {data.weight.toFixed(3)}g ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.max(pct, pct > 0 ? 2 : 0)}%`, backgroundColor: LONGEVITY_COLORS[level] }}
                        />
                      </div>
                      {data.items.length > 0 && (
                        <div className="flex flex-wrap gap-1 ml-1">
                          {data.items.map((item, idx) => (
                            <span key={idx} className="text-[10px] text-muted-foreground">
                              {item.name} ({item.weight.toFixed(3)}g){idx < data.items.length - 1 ? "," : ""}
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
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-base font-semibold">Category Breakdown</CardTitle></CardHeader>
            <CardContent>
              {categoryBreakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">No ingredients added yet.</p>
              ) : (
                <div className="space-y-4">
                  {categoryBreakdown.map(([cat, weight]) => {
                    const pct = concentrateWeight > 0 ? (weight / concentrateWeight) * 100 : 0;
                    const color = CATEGORY_COLORS[cat] || "#6b7280";
                    return (
                      <div key={cat} className="space-y-1.5">
                        <div className="flex items-center justify-between text-sm">
                          <span className="font-medium text-foreground">{cat}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {weight.toFixed(3)}g ({pct.toFixed(1)}%)
                          </span>
                        </div>
                        <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
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
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card">
          <DialogHeader><DialogTitle className="font-serif">Add Ingredient to Formula</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="text-sm">Search Ingredient</Label>
              <Input placeholder="Type to search..." value={ingredientSearch} onChange={e => setIngredientSearch(e.target.value)} className="mt-1.5 bg-background border-border/50" />
            </div>
            <div>
              <Label className="text-sm">Select Ingredient</Label>
              <Select value={selectedIngredientId} onValueChange={setSelectedIngredientId}>
                <SelectTrigger className="mt-1.5 bg-background border-border/50">
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
                <Label className="text-sm">Weight (g)</Label>
                <Input type="number" step="0.001" min="0" value={addWeight} onChange={e => setAddWeight(e.target.value)} className="mt-1.5 bg-background border-border/50" />
              </div>
              <div>
                <Label className="text-sm">Dilution (%)</Label>
                <Input type="number" step="1" min="1" max="100" value={addDilution} onChange={e => setAddDilution(e.target.value)} className="mt-1.5 bg-background border-border/50" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddIngredient(false)}>Cancel</Button>
            <Button onClick={handleAddIngredient} disabled={!selectedIngredientId || addIngredientMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {addIngredientMutation.isPending ? "Adding..." : "Add to Formula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scale Dialog */}
      <Dialog open={showScale} onOpenChange={setShowScale}>
        <DialogContent className="bg-card">
          <DialogHeader><DialogTitle className="font-serif">Scale Formula</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="text-sm">Scale Method</Label>
              <Select value={scaleMethod} onValueChange={setScaleMethod}>
                <SelectTrigger className="mt-1.5 bg-background border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="factor">Scale by Factor</SelectItem>
                  <SelectItem value="targetWeight">Target Total Weight</SelectItem>
                  <SelectItem value="targetConcentration">Target Concentration %</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-sm">
                {scaleMethod === "factor" ? "Factor (e.g., 2 = double)" : scaleMethod === "targetWeight" ? "Target Weight (g)" : "Target Concentration (%)"}
              </Label>
              <Input type="number" step="0.001" value={scaleValue} onChange={e => setScaleValue(e.target.value)} className="mt-1.5 bg-background border-border/50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScale(false)}>Cancel</Button>
            <Button onClick={handleScale} className="bg-primary hover:bg-primary/90 text-primary-foreground">Apply Scale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="bg-card">
          <DialogHeader><DialogTitle className="font-serif">Export Formula</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <Button variant="outline" className="justify-start border-border/50 hover:bg-secondary" onClick={() => generateExport("pdf")}>
              <Download className="size-4" /> Export as PDF (Print)
            </Button>
            <Button variant="outline" className="justify-start border-border/50 hover:bg-secondary" onClick={() => generateExport("markdown")}>
              <Download className="size-4" /> Export as Markdown (.md)
            </Button>
            <Button variant="outline" className="justify-start border-border/50 hover:bg-secondary" onClick={() => generateExport("csv")}>
              <Download className="size-4" /> Export as CSV
            </Button>
            <Button variant="outline" className="justify-start border-border/50 hover:bg-secondary" onClick={() => generateExport("tsv")}>
              <Download className="size-4" /> Export as TSV
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Formula</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{formula.name}"? This will remove all ingredients and cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => deleteFormulaMutation.mutate({ id: formulaId })}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
