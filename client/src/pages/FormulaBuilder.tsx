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
import { Textarea } from "@/components/ui/textarea";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import { LONGEVITY_LABELS, LONGEVITY_COLORS, CATEGORY_COLORS } from "@shared/perfumery";
import {
  ArrowLeft, Plus, Trash2, Scale, Download, Loader2, FlaskConical,
  AlertTriangle, Save, Copy, Tag, StickyNote, X, Check, Pencil, DollarSign, TrendingUp, BarChart3, Info,
  History, RotateCcw, ArrowRightLeft, Sparkles, ChevronDown, ChevronUp, LockKeyhole, RefreshCw, Beaker,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import DerivedFormulaDialog from "@/components/DerivedFormulaDialog";

export default function FormulaBuilder() {
  const { loading } = useAuth();
  const navItems = useNavItems();
  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <DashboardLayout navItems={navItems} currentPath="/formulas" title="Olfactra">
      <BuilderContent />
    </DashboardLayout>
  );
}

/* ─── Editable cell that saves on blur ─── */
function EditableNumberCell({ value, onSave, step = "0.001", min = "0", max, className }: {
  value: string; onSave: (v: string) => void; step?: string; min?: string; max?: string; className?: string;
}) {
  const [local, setLocal] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setLocal(value); }, [value]);

  const commit = () => {
    const trimmed = local.trim();
    if (trimmed !== value && trimmed !== "") {
      onSave(trimmed);
    } else if (trimmed === "") {
      setLocal(value); // revert
    }
  };

  return (
    <Input
      ref={inputRef}
      type="number" step={step} min={min} max={max}
      value={local}
      onChange={e => setLocal(e.target.value)}
      onBlur={commit}
      onKeyDown={e => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
      className={`editable-field ${className}`}
    />
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
  const [showDuplicate, setShowDuplicate] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descValue, setDescValue] = useState("");
  const [duplicateName, setDuplicateName] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#006778");
  const [noteContent, setNoteContent] = useState("");
  const [editingNoteId, setEditingNoteId] = useState<number | null>(null);
  const [editingNoteContent, setEditingNoteContent] = useState("");
  const [showSaveVersion, setShowSaveVersion] = useState(false);
  const [versionLabel, setVersionLabel] = useState("");
  const [showRevert, setShowRevert] = useState<number | null>(null);
  const [compareVersions, setCompareVersions] = useState<[number | null, number | null]>([null, null]);
  const [showSubstitution, setShowSubstitution] = useState<{ ingredientId: number; ingredientName: string; fiId: number } | null>(null);
  const [substitutionBasis, setSubstitutionBasis] = useState<"as-dosed" | "neat-active">("neat-active");
  const [showDerived, setShowDerived] = useState(false);

  const { activeWorkspaceId } = useWorkspace();

  const { data: formula, isLoading } = trpc.formula.get.useQuery({ id: formulaId });
  const { data: allIngredients } = trpc.ingredient.list.useQuery({});
  const { data: workspaceData } = trpc.workspace.get.useQuery(
    { id: activeWorkspaceId! },
    { enabled: !!activeWorkspaceId }
  );

  // Filter ingredients by active workspace for the ingredient picker
  const availableIngredients = useMemo(() => {
    if (!allIngredients) return [];
    if (!activeWorkspaceId || !workspaceData) return allIngredients;
    const wsIds = new Set(workspaceData.ingredientIds);
    return allIngredients.filter(i => wsIds.has(i.id));
  }, [allIngredients, activeWorkspaceId, workspaceData]);
  const { data: formulaTags } = trpc.formula.getFormulaTags.useQuery({ formulaId });
  const { data: allTags } = trpc.formula.listTags.useQuery();
  const { data: notes } = trpc.formula.listNotes.useQuery({ formulaId });
  const { data: versions } = trpc.version.list.useQuery({ formulaId });
  const utils = trpc.useUtils();

  const invalidateFormula = () => utils.formula.get.invalidate({ id: formulaId });

  const updateFormulaMutation = trpc.formula.update.useMutation({
    onSuccess: () => { invalidateFormula(); },
  });
  const generateAINotesMutation = trpc.formula.generateAINotes.useMutation({
    onSuccess: () => { invalidateFormula(); utils.formula.listNotes.invalidate({ formulaId }); toast.success("AI notes generated"); },
    onError: (err) => { toast.error(`AI notes failed: ${err.message}`); },
  });
  const deleteFormulaMutation = trpc.formula.delete.useMutation({
    onSuccess: () => { toast.success("Formula deleted"); setLocation("/formulas"); },
  });
  const addIngredientMutation = trpc.formula.addIngredient.useMutation({
    onSuccess: () => { invalidateFormula(); setShowAddIngredient(false); toast.success("Ingredient added"); autoSnapshot("Add Ingredient"); },
  });
  const updateIngredientMutation = trpc.formula.updateIngredient.useMutation({ onSuccess: invalidateFormula });
  const updateFormulaIngredientMutation = trpc.formula.updateIngredient.useMutation({ onSuccess: invalidateFormula });
  const removeIngredientMutation = trpc.formula.removeIngredient.useMutation({
    onSuccess: () => { invalidateFormula(); toast.success("Ingredient removed"); autoSnapshot("Remove Ingredient"); },
  });
  const cloneMutation = trpc.formula.clone.useMutation({
    onSuccess: (data) => { toast.success("Formula duplicated"); setShowDuplicate(false); setLocation(`/formulas/${data.id}`); },
  });
  const createTagMutation = trpc.formula.createTag.useMutation({
    onSuccess: () => { utils.formula.listTags.invalidate(); setNewTagName(""); toast.success("Tag created"); },
  });
  const deleteTagMutation = trpc.formula.deleteTag.useMutation({
    onSuccess: () => { utils.formula.listTags.invalidate(); utils.formula.getFormulaTags.invalidate({ formulaId }); },
  });
  const assignTagMutation = trpc.formula.assignTag.useMutation({
    onSuccess: () => utils.formula.getFormulaTags.invalidate({ formulaId }),
  });
  const unassignTagMutation = trpc.formula.unassignTag.useMutation({
    onSuccess: () => utils.formula.getFormulaTags.invalidate({ formulaId }),
  });
  const addNoteMutation = trpc.formula.addNote.useMutation({
    onSuccess: () => { utils.formula.listNotes.invalidate({ formulaId }); setNoteContent(""); toast.success("Note added"); },
  });
  const updateNoteMutation = trpc.formula.updateNote.useMutation({
    onSuccess: () => { utils.formula.listNotes.invalidate({ formulaId }); setEditingNoteId(null); toast.success("Note updated"); },
  });
  const deleteNoteMutation = trpc.formula.deleteNote.useMutation({
    onSuccess: () => { utils.formula.listNotes.invalidate({ formulaId }); toast.success("Note deleted"); },
  });
  const createVersionMutation = trpc.version.create.useMutation({
    onSuccess: (data) => { utils.version.list.invalidate({ formulaId }); setShowSaveVersion(false); setVersionLabel(""); toast.success(`Saved as Version ${data.versionNumber}`); },
  });
  
  // Auto-save helper for major actions (lightweight v1)
  const autoSnapshot = useCallback((action: string) => {
    if (!formula) return;
    const timestamp = new Date().toLocaleString();
    createVersionMutation.mutate({
      formulaId,
      label: `Auto-save: ${action} (${timestamp})`,
    });
  }, [formulaId, formula, createVersionMutation]);
  const revertVersionMutation = trpc.version.revert.useMutation({
    onSuccess: (data) => { invalidateFormula(); utils.version.list.invalidate({ formulaId }); setShowRevert(null); toast.success(`Reverted to Version ${data.versionNumber}`); },
  });
  const deleteVersionMutation = trpc.version.delete.useMutation({
    onSuccess: () => { utils.version.list.invalidate({ formulaId }); toast.success("Version deleted"); },
  });
  const substitutionMutation = trpc.substitution.suggest.useMutation();

  const [selectedIngredientId, setSelectedIngredientId] = useState<string>("");
  const [addWeight, setAddWeight] = useState("1.000");
  const [addDilution, setAddDilution] = useState("100");
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [universalDilutionInput, setUniversalDilutionInput] = useState("");
  const [showNeatView, setShowNeatView] = useState(false);
  const [normalizeMode, setNormalizeMode] = useState<"as-dosed" | "neat">("as-dosed");

  const filteredAddIngredients = useMemo(() => {
    if (!availableIngredients) return [];
    const existingIds = new Set(formula?.ingredients?.map((fi: any) => fi.ingredientId) || []);
    return availableIngredients.filter(i =>
      !existingIds.has(i.id) &&
      (!ingredientSearch || i.name.toLowerCase().includes(ingredientSearch.toLowerCase()))
    );
  }, [availableIngredients, formula, ingredientSearch]);

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

  const concentrateWeightNeat = useMemo(() =>
    formulaIngredients.reduce((sum: number, fi: any) => {
      const w = parseFloat(fi.weight || "0");
      const dilutionPct = parseFloat(fi.dilutionPercent || "100");
      return sum + (w * (dilutionPct / 100));
    }, 0),
    [formulaIngredients]
  );

  const percentagesSum = useMemo(() => {
    const basis = showNeatView ? concentrateWeightNeat : concentrateWeight;
    return formulaIngredients.reduce((sum: number, fi: any) => {
      const w = parseFloat(fi.weight || "0");
      const dilutionPct = parseFloat(fi.dilutionPercent || "100");
      const displayWeight = showNeatView ? (w * (dilutionPct / 100)) : w;
      return sum + (basis > 0 ? (displayWeight / basis) * 100 : 0);
    }, 0);
  }, [formulaIngredients, showNeatView, concentrateWeight, concentrateWeightNeat]);

  const percentageWarning = Math.abs(percentagesSum - 100) > 0.5;

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

  // ─── Cost Breakdown Data ───
  const costBreakdownData = useMemo(() => {
    const items = formulaIngredients.map((fi: any) => {
      const w = parseFloat(fi.weight || "0");
      const cpg = parseFloat(fi.ingredient?.costPerGram || "0");
      const cost = w * cpg;
      return {
        id: fi.id,
        name: fi.ingredient?.name || "Unknown",
        category: fi.ingredient?.category || "Uncategorized",
        weight: w,
        costPerGram: cpg,
        totalCost: cost,
        hasCostData: cpg > 0,
      };
    }).sort((a, b) => b.totalCost - a.totalCost);

    const categoryCosts: Record<string, { cost: number; weight: number; items: number }> = {};
    items.forEach(item => {
      if (!categoryCosts[item.category]) categoryCosts[item.category] = { cost: 0, weight: 0, items: 0 };
      categoryCosts[item.category].cost += item.totalCost;
      categoryCosts[item.category].weight += item.weight;
      categoryCosts[item.category].items += 1;
    });
    const categoryList = Object.entries(categoryCosts).sort((a, b) => b[1].cost - a[1].cost);

    const ingredientsWithCost = items.filter(i => i.hasCostData).length;
    const ingredientsWithoutCost = items.filter(i => !i.hasCostData).length;
    const costPerGramFormula = totalWeight > 0 ? totalCost / totalWeight : 0;
    const costPerMl = costPerGramFormula * 0.85; // approximate density for alcohol-based perfume
    const costFor30ml = costPerMl * 30;
    const costFor50ml = costPerMl * 50;
    const costFor100ml = costPerMl * 100;
    const maxItemCost = items.length > 0 ? Math.max(...items.map(i => i.totalCost)) : 0;
    const maxCatCost = categoryList.length > 0 ? Math.max(...categoryList.map(c => c[1].cost)) : 0;

    return {
      items,
      categoryList,
      ingredientsWithCost,
      ingredientsWithoutCost,
      costPerGramFormula,
      costPerMl,
      costFor30ml,
      costFor50ml,
      costFor100ml,
      maxItemCost,
      maxCatCost,
    };
  }, [formulaIngredients, totalCost, totalWeight]);

  const handleAddIngredient = () => {
    if (!selectedIngredientId) return;
    addIngredientMutation.mutate({ formulaId, ingredientId: parseInt(selectedIngredientId), weight: addWeight, dilutionPercent: addDilution });
  };

  const handleWeightSave = useCallback((fiId: number, newWeight: string) => {
    updateIngredientMutation.mutate({ id: fiId, weight: newWeight });
  }, [updateIngredientMutation]);

  const handleDilutionSave = useCallback((fiId: number, newDilution: string) => {
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
      invalidateFormula();
      setShowScale(false);
      toast.success("Formula scaled");
      autoSnapshot(`Scale Formula (${scaleMethod}: ${scaleValue})`);
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
    const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;700&family=Inter:wght@300;400;500;600&display=swap');
*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Inter',sans-serif;color:#1a1a1a;padding:40px;background:white}
.header{border-bottom:3px solid #006778;padding-bottom:20px;margin-bottom:30px}.brand{font-family:'Playfair Display',serif;font-size:12px;color:#006778;text-transform:uppercase;letter-spacing:3px;margin-bottom:4px}
.formula-name{font-family:'Playfair Display',serif;font-size:28px;font-weight:700;color:#101820;margin-bottom:6px}.date{font-size:11px;color:#666}
.description{font-size:13px;color:#444;margin-bottom:24px;line-height:1.5}
.stats-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-bottom:28px}
.stat-card{background:#f8f9fa;border:1px solid #e9ecef;border-radius:8px;padding:14px}.stat-label{font-size:10px;text-transform:uppercase;letter-spacing:1px;color:#888;margin-bottom:4px}
.stat-value{font-size:20px;font-weight:600;color:#101820}.stat-value.accent{color:#D7A22A}.stat-value.teal{color:#006778}
table{width:100%;border-collapse:collapse;margin-bottom:24px}th{background:#006778;color:white;font-size:11px;text-transform:uppercase;letter-spacing:.5px;padding:10px 12px;text-align:left;font-weight:500}
th:nth-child(3),th:nth-child(4),th:nth-child(5),th:nth-child(6){text-align:right}td{padding:9px 12px;font-size:12px;border-bottom:1px solid #eee}
td:nth-child(3),td:nth-child(4),td:nth-child(5),td:nth-child(6){text-align:right;font-variant-numeric:tabular-nums}tr:nth-child(even){background:#fafafa}
tr.solvent-row{background:#f0f7f9;font-style:italic}tr.total-row{background:#006778;color:white;font-weight:600}tr.total-row td{border-bottom:none}
.pyramid-section{margin-bottom:24px}.pyramid-title{font-family:'Playfair Display',serif;font-size:16px;font-weight:700;color:#101820;margin-bottom:12px}
.pyramid-bar{display:flex;align-items:center;margin-bottom:6px}.pyramid-label{width:120px;font-size:11px;font-weight:500;color:#444}
.pyramid-track{flex:1;height:16px;background:#f0f0f0;border-radius:8px;overflow:hidden;margin-right:10px}.pyramid-fill{height:100%;border-radius:8px}
.pyramid-value{font-size:11px;color:#666;width:80px;text-align:right;font-variant-numeric:tabular-nums}
.footer{margin-top:30px;padding-top:16px;border-top:1px solid #ddd;display:flex;justify-content:space-between;align-items:center}
.footer-brand{font-family:'Playfair Display',serif;font-size:14px;color:#006778}.footer-note{font-size:10px;color:#999}
@media print{body{padding:20px}}</style></head><body>
<div class="header"><div class="brand">Olfactra</div><div class="formula-name">${formula.name}</div><div class="date">${now} &bull; Status: ${formula.status === "final" ? "Final" : "Draft"}</div></div>
${formula.description ? `<div class="description">${formula.description}</div>` : ""}
<div class="stats-grid">
<div class="stat-card"><div class="stat-label">Concentrate</div><div class="stat-value">${concentrateWeight.toFixed(3)}g</div></div>
<div class="stat-card"><div class="stat-label">Total Weight</div><div class="stat-value">${totalWeight.toFixed(3)}g</div></div>
<div class="stat-card"><div class="stat-label">Concentration</div><div class="stat-value teal">${concentrationPercent.toFixed(1)}%</div></div>
<div class="stat-card"><div class="stat-label">Estimated Cost</div><div class="stat-value accent">$${totalCost.toFixed(2)}</div></div>
</div>
<table><thead><tr><th>Ingredient</th><th>Category</th><th>Weight (g)</th><th>Dilution</th><th>% of Total</th><th>Longevity</th></tr></thead><tbody>
${lines.map(l => `<tr><td>${l.name}</td><td>${l.category}</td><td>${l.weight}</td><td>${l.dilution}%</td><td>${l.pct}%</td><td>${l.longevity}</td></tr>`).join("")}
<tr class="solvent-row"><td>${formula.solvent || "Ethanol"} (Solvent)</td><td>Solvent</td><td>${solventWeight.toFixed(3)}</td><td>100%</td><td>${totalWeight > 0 ? ((solventWeight / totalWeight) * 100).toFixed(2) : "0"}%</td><td>&mdash;</td></tr>
<tr class="total-row"><td><strong>Total</strong></td><td></td><td><strong>${totalWeight.toFixed(3)}</strong></td><td></td><td><strong>100%</strong></td><td></td></tr>
</tbody></table>
<div class="pyramid-section"><div class="pyramid-title">Fragrance Pyramid</div>
${[0,1,2,3,4,5].map(level => {
  const data = pyramidData[level];
  const pct = concentrateWeight > 0 ? (data.weight / concentrateWeight) * 100 : 0;
  const colors: Record<number, string> = { 0: "#f97316", 1: "#eab308", 2: "#84cc16", 3: "#22c55e", 4: "#0ea5e9", 5: "#8b5cf6" };
  return `<div class="pyramid-bar"><span class="pyramid-label">${LONGEVITY_LABELS[level]}</span><div class="pyramid-track"><div class="pyramid-fill" style="width:${Math.max(pct, pct > 0 ? 2 : 0)}%;background:${colors[level]}"></div></div><span class="pyramid-value">${data.weight.toFixed(3)}g (${pct.toFixed(1)}%)</span></div>`;
}).join("")}
</div>
<div class="footer"><div class="footer-brand">Olfactra</div><div class="footer-note">Generated on ${now}</div></div>
</body></html>`;

    const printWindow = window.open("", "_blank");
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      setTimeout(() => printWindow.print(), 500);
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

  const assignedTagIds = new Set((formulaTags || []).map((t: any) => t.id));
  const TAG_COLORS = ["#006778", "#D7A22A", "#22c55e", "#8b5cf6", "#f97316", "#ec4899", "#0ea5e9", "#ef4444"];

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
              onKeyDown={e => { if (e.key === "Enter") { if (nameValue.trim()) updateFormulaMutation.mutate({ id: formulaId, name: nameValue.trim() }); setEditingName(false); } if (e.key === "Escape") setEditingName(false); }}
              autoFocus
              className="text-xl font-serif font-bold h-auto py-1 bg-background border-border/50"
            />
          ) : (
            <h2
              className="text-xl font-serif font-bold cursor-pointer hover:text-primary transition-colors truncate group flex items-center gap-2"
              onClick={() => { setNameValue(formula.name); setEditingName(true); }}
            >
              {formula.name}
              <Pencil className="size-3.5 opacity-0 group-hover:opacity-50 transition-opacity" />
            </h2>
          )}
          {editingDesc ? (
            <Input
              value={descValue}
              onChange={e => setDescValue(e.target.value)}
              onBlur={() => { updateFormulaMutation.mutate({ id: formulaId, description: descValue.trim() }); setEditingDesc(false); }}
              onKeyDown={e => { if (e.key === "Enter") { updateFormulaMutation.mutate({ id: formulaId, description: descValue.trim() }); setEditingDesc(false); } if (e.key === "Escape") setEditingDesc(false); }}
              autoFocus placeholder="Add a description..."
              className="text-sm h-auto py-0.5 bg-background border-border/50 mt-1"
            />
          ) : (
            <p
              className="text-sm text-muted-foreground truncate cursor-pointer hover:text-foreground/70 transition-colors"
              onClick={() => { setDescValue(formula.description || ""); setEditingDesc(true); }}
            >
              {formula.description || "Click to add description..."}
            </p>
          )}
          {/* Tags */}
          <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
            {(formulaTags || []).map((tag: any) => (
              <Badge key={tag.id} variant="outline" className="text-[10px] cursor-pointer hover:opacity-70" style={{ borderColor: tag.color, color: tag.color }}
                onClick={() => unassignTagMutation.mutate({ formulaId, tagId: tag.id })}>
                {tag.name} <X className="size-2.5 ml-1" />
              </Badge>
            ))}
            <Button variant="ghost" size="sm" className="h-5 px-1.5 text-[10px] text-muted-foreground hover:text-primary" onClick={() => setShowTagManager(true)}>
              <Tag className="size-3" /> Tags
            </Button>
          </div>
        </div>
        <div className="flex gap-2 shrink-0 flex-wrap justify-end">
          <Button variant="default" size="sm" onClick={() => { autoSnapshot("Manual Save"); toast.success("Snapshot saved"); }} className="bg-primary text-primary-foreground">
            <Save className="size-3.5" /> Save
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setDuplicateName(`${formula.name} (Copy)`); setShowDuplicate(true); }} className="border-border/50">
            <Copy className="size-3.5" /> Duplicate
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowScale(true)} className="border-border/50">
            <Scale className="size-3.5" /> Scale
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowExport(true)} className="border-border/50">
            <Download className="size-3.5" /> Export
          </Button>
          <Button variant="outline" size="sm" onClick={() => setShowDerived(true)} className="border-accent/50 text-accent hover:bg-accent/10">
            <Beaker className="size-3.5" /> Product Version
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

      {/* Derived Formula Info Banner */}
      {formula.parentFormulaId && (
        <DerivedInfoBanner formulaId={formulaId} parentFormulaId={formula.parentFormulaId} formula={formula} />
      )}

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
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">{stat.label}</p>
              <p className={`text-lg font-semibold tabular-nums ${stat.accent ? "text-accent" : "text-foreground"}`}>{stat.value}</p>
            </CardContent>
          </Card>
        ))}
        <Card className="bg-card border-border/50">
          <CardContent className="pt-3 pb-3">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Solvent</p>
            <div className="flex items-center gap-1.5">
              <EditableNumberCell
                value={String(solventWeight || "0")}
                onSave={(val) => {
                  updateFormulaMutation.mutate({ id: formulaId, solventWeight: val, totalWeight: (concentrateWeight + parseFloat(val || "0")).toFixed(3) });
                }}
                className="h-7 text-sm w-20 tabular-nums"
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
          <TabsTrigger value="notes">Notes ({notes?.length || 0})</TabsTrigger>
          <TabsTrigger value="costs"><DollarSign className="size-3.5 mr-1" />Cost Breakdown</TabsTrigger>
          <TabsTrigger value="history"><History className="size-3.5 mr-1" />History ({versions?.length || 0})</TabsTrigger>
        </TabsList>

        <TabsContent value="ingredients">
          {/* Universal Dilution Control */}
          <Card className="bg-card border-border/50 mb-4">
            <CardContent className="pt-4 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex-1">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1.5 block">Set Universal Dilution %</label>
                  <input
                    type="number"
                    min="0.1"
                    max="100"
                    step="0.1"
                    value={universalDilutionInput}
                    onChange={(e) => setUniversalDilutionInput(e.target.value)}
                    placeholder="e.g., 50"
                    className="h-8 px-2 text-sm editable-field focus:outline-none focus:ring-1 focus:ring-primary w-24 tabular-nums"
                  />
                  <p className="text-xs text-muted-foreground mt-1">Apply to all ingredients</p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    const val = parseFloat(universalDilutionInput);
                    if (isNaN(val) || val <= 0 || val > 100) {
                      toast.error("Dilution must be between 0 and 100");
                      return;
                    }
                    formulaIngredients.forEach((fi: any) => {
                      updateFormulaIngredientMutation.mutate({ id: fi.id, dilutionPercent: val.toString() });
                    });
                    toast.success(`Applied ${val}% dilution to all ingredients`);
                    autoSnapshot(`Apply Universal Dilution ${val}%`);
                  }}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground mt-5"
                >
                  Apply
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card border-border/50">
            <CardHeader className="flex flex-row items-center justify-between py-3">
              <CardTitle className="text-base font-semibold">Formula Ingredients</CardTitle>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => setShowNeatView(!showNeatView)} className="text-xs border-border/50">
                  {showNeatView ? "Neat/Active" : "As-Dosed"}
                </Button>
                <Button size="sm" onClick={() => { setShowAddIngredient(true); setIngredientSearch(""); setSelectedIngredientId(""); setAddWeight("1.000"); setAddDilution("100"); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="size-3.5" /> Add
                </Button>
              </div>
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
                        <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Ingredient</TableHead>
                        <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Category</TableHead>
                        <TableHead className="text-right w-28 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Weight (g)</TableHead>
                        <TableHead className="text-right w-24 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Dilution %</TableHead>
                        <TableHead className="text-right w-20 text-muted-foreground text-xs font-semibold uppercase tracking-wider">% of Total</TableHead>
                        <TableHead className="text-right w-20 text-muted-foreground text-xs font-semibold uppercase tracking-wider">Cost</TableHead>
                        <TableHead className="w-10"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {formulaIngredients.map((fi: any) => {
                        const w = parseFloat(fi.weight || "0");
                        const dilutionPct = parseFloat(fi.dilutionPercent || "100");
                        const neatW = w * (dilutionPct / 100);
                        const basis = showNeatView ? concentrateWeightNeat : concentrateWeight;
                        const pct = basis > 0 ? ((showNeatView ? neatW : w) / basis) * 100 : 0;
                        const cost = w * parseFloat(fi.ingredient?.costPerGram || "0");
                        return (
                          <TableRow key={fi.id} className="border-border/30 hover:bg-secondary/30 transition-colors">
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
                              <EditableNumberCell
                                value={fi.weight}
                                onSave={(val) => handleWeightSave(fi.id, val)}
                                step="0.001" min="0"
                                className="h-7 text-sm text-right w-24 ml-auto tabular-nums"
                              />
                            </TableCell>
                            <TableCell className="text-right">
                              <EditableNumberCell
                                value={fi.dilutionPercent || "100"}
                                onSave={(val) => handleDilutionSave(fi.id, val)}
                                step="1" min="1" max="100"
                                className="h-7 text-sm text-right w-20 ml-auto tabular-nums"
                              />
                            </TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-muted-foreground">{pct.toFixed(2)}%</TableCell>
                            <TableCell className="text-right text-sm tabular-nums text-accent">${cost.toFixed(2)}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-0.5">
                                <Button variant="ghost" size="icon" className="size-7 text-primary hover:bg-primary/10" title="Find substitutes"
                                  onClick={() => {
                                    setShowSubstitution({ ingredientId: fi.ingredientId, ingredientName: fi.ingredient?.name || "Unknown", fiId: fi.id });
                                    substitutionMutation.mutate({ ingredientId: fi.ingredientId, ingredientName: fi.ingredient?.name || "Unknown", formulaId, basis: substitutionBasis });
                                  }}>
                                  <ArrowRightLeft className="size-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-7 text-destructive hover:bg-destructive/10" onClick={() => removeIngredientMutation.mutate({ id: fi.id })}>
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
            {formulaIngredients.length > 0 && (
              <CardContent className="pt-3 pb-3 border-t border-border/30 space-y-2">
                {percentageWarning && (
                  <div className="flex items-center gap-2 text-amber-600 text-xs">
                    <AlertTriangle className="size-3.5" />
                    <span>Percentages sum to {percentagesSum.toFixed(1)}% (expected 100%)</span>
                  </div>
                )}
                <Button variant="outline" size="sm" onClick={() => {
                  const basis = normalizeMode === "as-dosed" ? concentrateWeight : concentrateWeightNeat;
                  formulaIngredients.forEach((fi: any) => {
                    const w = parseFloat(fi.weight || "0");
                    const dilutionPct = parseFloat(fi.dilutionPercent || "100");
                    const activeWeight = w * (dilutionPct / 100);
                    const normalizeBy = normalizeMode === "as-dosed" ? w : activeWeight;
                    const newWeight = basis > 0 ? (normalizeBy / basis) * 100 : 0;
                    updateFormulaIngredientMutation.mutate({ id: fi.id, weight: newWeight.toFixed(3) });
                  });
                  toast.success(`Normalized to 100% (${normalizeMode})`);
                  autoSnapshot(`Normalize to 100% (${normalizeMode})`);
                }} className="text-xs border-border/50">
                  Normalize to 100% ({normalizeMode})
                </Button>
              </CardContent>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="pyramid">
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-base">Fragrance Pyramid</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {[0, 1, 2, 3, 4, 5].map(level => {
                const data = pyramidData[level];
                const pct = concentrateWeight > 0 ? (data.weight / concentrateWeight) * 100 : 0;
                return (
                  <div key={level} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium" style={{ color: LONGEVITY_COLORS[level] }}>{LONGEVITY_LABELS[level]}</span>
                      <span className="tabular-nums text-muted-foreground">{data.weight.toFixed(3)}g ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, pct > 0 ? 1 : 0)}%`, backgroundColor: LONGEVITY_COLORS[level] }} />
                    </div>
                    {data.items.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {data.items.map((item, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] border-border/30">{item.name} ({item.weight.toFixed(3)}g)</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="categories">
          <Card className="bg-card border-border/50">
            <CardHeader><CardTitle className="text-base">Category Breakdown</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {categoryBreakdown.map(([cat, weight]) => {
                const pct = concentrateWeight > 0 ? (weight / concentrateWeight) * 100 : 0;
                const color = CATEGORY_COLORS[cat] || "#888";
                return (
                  <div key={cat} className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{cat}</span>
                      <span className="tabular-nums text-muted-foreground">{weight.toFixed(3)}g ({pct.toFixed(1)}%)</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(pct, pct > 0 ? 1 : 0)}%`, backgroundColor: color }} />
                    </div>
                  </div>
                );
              })}
              {categoryBreakdown.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No ingredients yet.</p>}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notes Tab */}
        <TabsContent value="notes">
          {/* AI Generated Notes Block */}
          {(() => {
            const aiNote = (notes || []).find((n: any) => n.content.startsWith("## AI Generated Notes"));
            const manualNotes = (notes || []).filter((n: any) => !n.content.startsWith("## AI Generated Notes"));
            return (
              <>
                {/* Generate AI Notes Button (always visible) */}
                <Card className="bg-card border-border/50 mb-4">
                  <CardContent className="py-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Sparkles className="size-4 text-primary" />
                        <span className="text-sm font-medium">AI-Powered Notes</span>
                        {formula?.aiNotesLastGeneratedAt && (
                          <span className="text-[10px] text-muted-foreground ml-2">Last generated: {new Date(formula.aiNotesLastGeneratedAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}</span>
                        )}
                      </div>
                      <Button
                        size="sm"
                        onClick={() => generateAINotesMutation.mutate({ formulaId })}
                        disabled={generateAINotesMutation.isPending || formulaIngredients.length === 0}
                        className="bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {generateAINotesMutation.isPending ? (
                          <><Loader2 className="size-3.5 animate-spin mr-1" /> Generating...</>
                        ) : aiNote ? (
                          <><RefreshCw className="size-3.5 mr-1" /> Regenerate AI Notes</>
                        ) : (
                          <><Sparkles className="size-3.5 mr-1" /> Generate AI Notes</>
                        )}
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* AI Notes Read-Only Block */}
                {aiNote && (
                  <Card className="bg-blue-50 border-blue-200 border-2 mb-4">
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <LockKeyhole className="size-3.5 text-blue-600" />
                          <CardTitle className="text-base text-blue-900">AI Generated Notes</CardTitle>
                          <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded">Read-only</span>
                        </div>
                        <Button size="sm" variant="outline" className="text-xs border-blue-300 text-blue-700 hover:bg-blue-100" onClick={() => {
                          addNoteMutation.mutate({ formulaId, content: `[Copied from AI Notes — ${new Date().toLocaleDateString()}]\n\n${aiNote.content.replace("## AI Generated Notes\n\n", "")}` });
                          toast.success("AI notes copied to manual notes — you can now edit the copy");
                        }}>
                          <Copy className="size-3 mr-1" /> Copy to Manual Notes
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="text-sm space-y-2 pt-0">
                      {aiNote.content.split("\n").map((line: string, idx: number) => {
                        if (line.startsWith("### ")) return <h4 key={idx} className="font-semibold text-blue-900 mt-3 mb-0.5 text-sm">{line.replace(/^###\s*/, "")}</h4>;
                        if (line.startsWith("## ")) return null; // Skip the title, already in header
                        if (line.startsWith("**AI Notes")) return <p key={idx} className="text-[11px] text-blue-600 italic">{line.replace(/\*\*/g, "")}</p>;
                        if (line.startsWith("- ")) return <li key={idx} className="ml-4 text-foreground/80 list-disc">{line.replace(/^-\s*/, "")}</li>;
                        if (line.trim()) return <p key={idx} className="text-foreground/80 leading-relaxed">{line}</p>;
                        return null;
                      })}
                    </CardContent>
                  </Card>
                )}

                {/* Manual Notes */}
                <Card className="bg-card border-border/50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2"><StickyNote className="size-4" /> Manual Notes</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Add note */}
                    <div className="flex gap-2">
                      <Textarea
                        placeholder="Add a note... (e.g., 'Day 3: top notes faded, increase bergamot')"
                        value={noteContent}
                        onChange={e => setNoteContent(e.target.value)}
                        className="bg-background border-border/50 min-h-[60px] text-sm"
                      />
                      <Button size="sm" className="bg-primary hover:bg-primary/90 text-primary-foreground shrink-0 self-end"
                        disabled={!noteContent.trim() || addNoteMutation.isPending}
                        onClick={() => addNoteMutation.mutate({ formulaId, content: noteContent.trim() })}>
                        {addNoteMutation.isPending ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
                      </Button>
                    </div>
                    {/* Filtered manual notes list (excludes AI notes) */}
                    {manualNotes.length === 0 ? (
                      <p className="text-sm text-muted-foreground text-center py-6">No manual notes yet. Add observations from your testing sessions.</p>
                    ) : (
                      <div className="space-y-3">
                        {manualNotes.map((note: any) => (
                          <div key={note.id} className="bg-secondary/50 rounded-lg p-3 space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-muted-foreground">
                                {new Date(note.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                              </span>
                              <div className="flex gap-1">
                                <Button variant="ghost" size="icon" className="size-6 text-muted-foreground hover:text-foreground"
                                  onClick={() => { setEditingNoteId(note.id); setEditingNoteContent(note.content); }}>
                                  <Pencil className="size-3" />
                                </Button>
                                <Button variant="ghost" size="icon" className="size-6 text-destructive hover:bg-destructive/10"
                                  onClick={() => deleteNoteMutation.mutate({ id: note.id })}>
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                            {editingNoteId === note.id ? (
                              <div className="flex gap-2">
                                <Textarea value={editingNoteContent} onChange={e => setEditingNoteContent(e.target.value)} className="bg-background border-border/50 min-h-[40px] text-sm" />
                                <div className="flex flex-col gap-1 shrink-0">
                                  <Button size="icon" className="size-6 bg-primary" onClick={() => updateNoteMutation.mutate({ id: note.id, content: editingNoteContent.trim() })}><Check className="size-3" /></Button>
                                  <Button size="icon" variant="ghost" className="size-6" onClick={() => setEditingNoteId(null)}><X className="size-3" /></Button>
                                </div>
                              </div>
                            ) : (
                              <p className="text-sm text-foreground/90 whitespace-pre-wrap">{note.content}</p>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </>
            );
          })()}
        </TabsContent>
        {/* Cost Breakdown Tab */}
        <TabsContent value="costs">
          <div className="space-y-4">
            {/* Cost Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Card className="bg-card border-border/50">
                <CardContent className="pt-3 pb-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total Material Cost</p>
                  <p className="text-lg font-semibold tabular-nums text-accent">${totalCost.toFixed(2)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50">
                <CardContent className="pt-3 pb-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost per Gram</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">${costBreakdownData.costPerGramFormula.toFixed(4)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50">
                <CardContent className="pt-3 pb-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Cost per mL (est.)</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">${costBreakdownData.costPerMl.toFixed(4)}</p>
                </CardContent>
              </Card>
              <Card className="bg-card border-border/50">
                <CardContent className="pt-3 pb-3">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Data Coverage</p>
                  <p className="text-lg font-semibold tabular-nums text-foreground">
                    {costBreakdownData.ingredientsWithCost}/{costBreakdownData.ingredientsWithCost + costBreakdownData.ingredientsWithoutCost}
                  </p>
                  {costBreakdownData.ingredientsWithoutCost > 0 && (
                    <p className="text-[9px] text-amber-400 flex items-center gap-1 mt-0.5">
                      <Info className="size-3" />{costBreakdownData.ingredientsWithoutCost} missing cost data
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Bottle Cost Estimates */}
            <Card className="bg-card border-border/50">
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2"><TrendingUp className="size-4 text-primary" /> Bottle Cost Estimates</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-muted-foreground mb-3">Estimated material cost per bottle at current concentration ({concentrationPercent.toFixed(1)}%). Based on ~0.85 g/mL density for alcohol-based fragrances.</p>
                <div className="grid grid-cols-3 gap-3">
                  {[
                    { size: "30 mL", cost: costBreakdownData.costFor30ml },
                    { size: "50 mL", cost: costBreakdownData.costFor50ml },
                    { size: "100 mL", cost: costBreakdownData.costFor100ml },
                  ].map(bottle => (
                    <div key={bottle.size} className="bg-secondary/50 rounded-lg p-3 text-center">
                      <p className="text-xs text-muted-foreground">{bottle.size}</p>
                      <p className="text-xl font-bold tabular-nums text-accent">${bottle.cost.toFixed(2)}</p>
                      <p className="text-[9px] text-muted-foreground">materials only</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Per-Ingredient Cost Table */}
            <Card className="bg-card border-border/50">
              <CardHeader className="py-3">
                <CardTitle className="text-base flex items-center gap-2"><BarChart3 className="size-4 text-primary" /> Ingredient Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                {costBreakdownData.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-6">No ingredients yet.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="border-border/50">
                          <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Ingredient</TableHead>
                          <TableHead className="text-muted-foreground text-xs font-semibold uppercase tracking-wider">Category</TableHead>
                          <TableHead className="text-right text-muted-foreground text-xs font-semibold uppercase tracking-wider">Weight (g)</TableHead>
                          <TableHead className="text-right text-muted-foreground text-xs font-semibold uppercase tracking-wider">$/gram</TableHead>
                          <TableHead className="text-right text-muted-foreground text-xs font-semibold uppercase tracking-wider">Cost</TableHead>
                          <TableHead className="text-right text-muted-foreground text-xs font-semibold uppercase tracking-wider">% of Total</TableHead>
                          <TableHead className="w-40"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {costBreakdownData.items.map(item => {
                          const pctOfCost = totalCost > 0 ? (item.totalCost / totalCost) * 100 : 0;
                          const barWidth = costBreakdownData.maxItemCost > 0 ? (item.totalCost / costBreakdownData.maxItemCost) * 100 : 0;
                          return (
                            <TableRow key={item.id} className="border-border/30 hover:bg-secondary/30 transition-colors">
                              <TableCell>
                                <span className="font-medium text-sm text-foreground">{item.name}</span>
                              </TableCell>
                              <TableCell className="text-xs text-muted-foreground">{item.category}</TableCell>
                              <TableCell className="text-right text-sm tabular-nums">{item.weight.toFixed(3)}</TableCell>
                              <TableCell className="text-right text-sm tabular-nums">
                                {item.hasCostData ? `$${item.costPerGram.toFixed(4)}` : <span className="text-amber-400 text-xs">N/A</span>}
                              </TableCell>
                              <TableCell className="text-right text-sm tabular-nums text-accent font-medium">
                                {item.hasCostData ? `$${item.totalCost.toFixed(2)}` : "—"}
                              </TableCell>
                              <TableCell className="text-right text-sm tabular-nums">{item.hasCostData ? `${pctOfCost.toFixed(1)}%` : <span className="text-muted-foreground">—</span>}</TableCell>
                              <TableCell>
                                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                                  <div className="h-full rounded-full bg-accent/70 transition-all" style={{ width: `${barWidth}%` }} />
                                </div>
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

            {/* Category Cost Breakdown */}
            <Card className="bg-card border-border/50">
              <CardHeader className="py-3">
                <CardTitle className="text-base">Cost by Category</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {costBreakdownData.categoryList.map(([cat, data]) => {
                  const pct = totalCost > 0 ? (data.cost / totalCost) * 100 : 0;
                  const barWidth = costBreakdownData.maxCatCost > 0 ? (data.cost / costBreakdownData.maxCatCost) * 100 : 0;
                  const color = CATEGORY_COLORS[cat] || "#888";
                  return (
                    <div key={cat} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium">{cat} <span className="text-xs text-muted-foreground">({data.items} ingredient{data.items !== 1 ? "s" : ""})</span></span>
                        <span className="tabular-nums text-accent">${data.cost.toFixed(2)} <span className="text-muted-foreground text-xs">({pct.toFixed(1)}%)</span></span>
                      </div>
                      <div className="h-3 bg-secondary rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.max(barWidth, barWidth > 0 ? 1 : 0)}%`, backgroundColor: color }} />
                      </div>
                    </div>
                  );
                })}
                {costBreakdownData.categoryList.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No ingredients yet.</p>}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <div className="space-y-4">
            <Card className="bg-card border-border/50">
              <CardHeader className="flex flex-row items-center justify-between py-3">
                <CardTitle className="text-base font-semibold">Version History</CardTitle>
                <Button size="sm" onClick={() => { setShowSaveVersion(true); setVersionLabel(""); }} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Save className="size-3.5 mr-1" /> Save Snapshot
                </Button>
              </CardHeader>
              <CardContent>
                {(!versions || versions.length === 0) ? (
                  <div className="flex flex-col items-center gap-3 py-10 text-center">
                    <div className="size-12 rounded-xl bg-secondary flex items-center justify-center">
                      <History className="size-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">No versions saved yet. Save a snapshot to track changes over time.</p>
                    <Button variant="outline" size="sm" onClick={() => { setShowSaveVersion(true); setVersionLabel(""); }}>
                      <Save className="size-3.5 mr-1" />Save First Snapshot
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {versions.map((v: any) => {
                      const snapshot = v.snapshot as any;
                      const isExpanded = compareVersions[0] === v.id || compareVersions[1] === v.id;
                      return (
                        <Card key={v.id} className={`border-border/30 transition-all ${isExpanded ? "bg-primary/5 border-primary/30" : "bg-secondary/30"}`}>
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="size-8 rounded-lg bg-primary/10 flex items-center justify-center">
                                  <span className="text-xs font-bold text-primary">v{v.versionNumber}</span>
                                </div>
                                <div>
                                  <p className="text-sm font-medium">{v.label || `Version ${v.versionNumber}`}</p>
                                  <p className="text-[11px] text-muted-foreground">
                                    {new Date(v.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                                    {snapshot?.ingredients && <span className="ml-2">· {snapshot.ingredients.length} ingredients</span>}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setCompareVersions(prev => prev[0] === v.id ? [null, prev[1]] : [v.id, prev[1]])}>
                                  {isExpanded ? <ChevronUp className="size-3 mr-1" /> : <ChevronDown className="size-3 mr-1" />}
                                  {isExpanded ? "Collapse" : "Details"}
                                </Button>
                                <Button variant="ghost" size="sm" className="h-7 text-xs text-primary" onClick={() => setShowRevert(v.id)}>
                                  <RotateCcw className="size-3 mr-1" />Revert
                                </Button>
                                <Button variant="ghost" size="icon" className="size-7 text-destructive hover:bg-destructive/10" onClick={() => deleteVersionMutation.mutate({ id: v.id })}>
                                  <Trash2 className="size-3" />
                                </Button>
                              </div>
                            </div>
                            {isExpanded && snapshot && (
                              <div className="mt-3 pt-3 border-t border-border/30">
                                <div className="grid grid-cols-3 gap-3 mb-3">
                                  <div className="text-center p-2 bg-background rounded-lg">
                                    <p className="text-xs text-muted-foreground">Ingredients</p>
                                    <p className="text-lg font-semibold">{snapshot.ingredients?.length || 0}</p>
                                  </div>
                                  <div className="text-center p-2 bg-background rounded-lg">
                                    <p className="text-xs text-muted-foreground">Total Weight</p>
                                    <p className="text-lg font-semibold">{parseFloat(snapshot.totalWeight || "0").toFixed(1)}g</p>
                                  </div>
                                  <div className="text-center p-2 bg-background rounded-lg">
                                    <p className="text-xs text-muted-foreground">Solvent</p>
                                    <p className="text-lg font-semibold">{parseFloat(snapshot.solventWeight || "0").toFixed(1)}g</p>
                                  </div>
                                </div>
                                <div className="overflow-x-auto">
                                  <Table>
                                    <TableHeader>
                                      <TableRow className="border-border/30">
                                        <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Ingredient</TableHead>
                                        <TableHead className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Category</TableHead>
                                        <TableHead className="text-right text-xs text-muted-foreground font-semibold uppercase tracking-wider">Weight (g)</TableHead>
                                        <TableHead className="text-right text-xs text-muted-foreground font-semibold uppercase tracking-wider">Dilution %</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {(snapshot.ingredients || []).map((ing: any, idx: number) => (
                                        <TableRow key={idx} className="border-border/20">
                                          <TableCell className="text-xs font-medium py-2">{ing.ingredientName}</TableCell>
                                          <TableCell className="text-xs text-muted-foreground py-2">{ing.category || "—"}</TableCell>
                                          <TableCell className="text-right text-xs tabular-nums py-2">{parseFloat(ing.weight || "0").toFixed(3)}</TableCell>
                                          <TableCell className="text-right text-xs tabular-nums py-2">{ing.dilutionPercent || "100"}%</TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* ─── Dialogs ─── */}

      {/* Save Version Dialog */}
      <Dialog open={showSaveVersion} onOpenChange={setShowSaveVersion}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader><DialogTitle>Save Version Snapshot</DialogTitle></DialogHeader>
          <p className="text-sm text-muted-foreground">This will save a snapshot of the current formula state that you can revert to later.</p>
          <div>
            <Label className="text-xs text-muted-foreground">Version Label (optional)</Label>
            <Input placeholder="e.g., Before adding musk notes" value={versionLabel} onChange={e => setVersionLabel(e.target.value)} className="bg-background border-border/50" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSaveVersion(false)}>Cancel</Button>
            <Button onClick={() => createVersionMutation.mutate({ formulaId, label: versionLabel.trim() || undefined })} disabled={createVersionMutation.isPending} className="bg-primary text-primary-foreground">
              {createVersionMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <><Save className="size-3.5 mr-1" />Save Snapshot</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Revert Confirmation */}
      <AlertDialog open={showRevert !== null} onOpenChange={(open) => !open && setShowRevert(null)}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Revert to this version?</AlertDialogTitle>
            <AlertDialogDescription>This will replace the current formula ingredients and settings with the saved snapshot. Your current state will be lost unless you save a version first.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-primary text-primary-foreground" onClick={() => showRevert && revertVersionMutation.mutate({ formulaId, versionId: showRevert })}>
              <RotateCcw className="size-3.5 mr-1" />Revert
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Substitution Dialog */}
      <Dialog open={showSubstitution !== null} onOpenChange={(open) => !open && setShowSubstitution(null)}>
        <DialogContent className="bg-card border-border/50 max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="size-4 text-primary" />
              Substitutes for {showSubstitution?.ingredientName}
            </DialogTitle>
          </DialogHeader>
          <div className="flex items-center gap-3 px-1 pb-1">
            <span className="text-xs font-medium text-muted-foreground">Substitution Basis:</span>
            <div className="flex items-center gap-1 bg-secondary/50 rounded-md p-0.5">
              <button
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  substitutionBasis === "as-dosed"
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setSubstitutionBasis("as-dosed");
                  if (showSubstitution) {
                    substitutionMutation.mutate({ ingredientId: showSubstitution.ingredientId, ingredientName: showSubstitution.ingredientName, formulaId, basis: "as-dosed" });
                  }
                }}
              >
                As-Dosed
              </button>
              <button
                className={`px-2.5 py-1 text-xs rounded transition-colors ${
                  substitutionBasis === "neat-active"
                    ? "bg-primary text-primary-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                onClick={() => {
                  setSubstitutionBasis("neat-active");
                  if (showSubstitution) {
                    substitutionMutation.mutate({ ingredientId: showSubstitution.ingredientId, ingredientName: showSubstitution.ingredientName, formulaId, basis: "neat-active" });
                  }
                }}
              >
                Neat/Active
              </button>
            </div>
          </div>
          {substitutionMutation.isPending ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Loader2 className="size-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Finding similar ingredients in your library...</p>
            </div>
          ) : substitutionMutation.isError ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <AlertTriangle className="size-8 text-destructive" />
              <p className="text-sm text-muted-foreground">Failed to find substitutes. Please try again.</p>
              <Button variant="outline" size="sm" onClick={() => showSubstitution && substitutionMutation.mutate({ ingredientId: showSubstitution.ingredientId, ingredientName: showSubstitution.ingredientName, formulaId, basis: substitutionBasis })}>
                Retry
              </Button>
            </div>
          ) : (substitutionMutation.data?.suggestions || []).length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8">
              <Info className="size-8 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">No suitable substitutes found in your library.</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-[400px] overflow-y-auto pr-1">
              {(substitutionMutation.data?.suggestions || []).map((s: any, idx: number) => (
                <Card key={idx} className="bg-secondary/50 border-border/30">
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">{s.name}</span>
                        <Badge variant="outline" className="text-[10px] border-primary/40 text-primary">{s.similarity}% match</Badge>
                        <Badge variant="outline" className={`text-[10px] ${
                          s.costComparison === "cheaper" ? "border-green-500/40 text-green-400" :
                          s.costComparison === "more expensive" ? "border-amber-500/40 text-amber-400" :
                          "border-border/50 text-muted-foreground"
                        }`}>
                          {s.costComparison === "cheaper" ? "↓ Cheaper" : s.costComparison === "more expensive" ? "↑ Pricier" : "≈ Similar cost"}
                        </Badge>
                      </div>
                      <Button size="sm" variant="outline" className="h-7 text-xs border-primary/40 text-primary hover:bg-primary/10"
                        onClick={() => {
                          if (!showSubstitution) return;
                          // Remove old ingredient and add new one with same weight
                          const oldFi = formulaIngredients.find((fi: any) => fi.id === showSubstitution.fiId);
                          const weight = oldFi?.weight || "1.000";
                          const dilution = oldFi?.dilutionPercent || "100";
                          removeIngredientMutation.mutate({ id: showSubstitution.fiId }, {
                            onSuccess: () => {
                              addIngredientMutation.mutate({ formulaId, ingredientId: s.ingredientId, weight, dilutionPercent: dilution }, {
                                onSuccess: () => { toast.success(`Swapped ${showSubstitution.ingredientName} → ${s.name}`); setShowSubstitution(null); },
                              });
                            },
                          });
                        }}>
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

      {/* Add Ingredient Dialog */}
      <Dialog open={showAddIngredient} onOpenChange={setShowAddIngredient}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader><DialogTitle>Add Ingredient</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Search Ingredient</Label>
              <Input placeholder="Type to search..." value={ingredientSearch} onChange={e => setIngredientSearch(e.target.value)} className="bg-background border-border/50" />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Select Ingredient</Label>
              <Select value={selectedIngredientId} onValueChange={setSelectedIngredientId}>
                <SelectTrigger className="bg-background border-border/50"><SelectValue placeholder="Choose ingredient..." /></SelectTrigger>
                <SelectContent className="max-h-60">
                  {filteredAddIngredients.map(i => (
                    <SelectItem key={i.id} value={String(i.id)}>{i.name} {i.category ? `(${i.category})` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Weight (g)</Label>
                <Input type="number" step="0.001" min="0" value={addWeight} onChange={e => setAddWeight(e.target.value)} className="bg-background border-border/50" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Dilution %</Label>
                <Input type="number" step="1" min="1" max="100" value={addDilution} onChange={e => setAddDilution(e.target.value)} className="bg-background border-border/50" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddIngredient(false)}>Cancel</Button>
            <Button onClick={handleAddIngredient} disabled={!selectedIngredientId || addIngredientMutation.isPending} className="bg-primary text-primary-foreground">
              {addIngredientMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Add to Formula"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Scale Dialog */}
      <Dialog open={showScale} onOpenChange={setShowScale}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader><DialogTitle>Scale Formula</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Scale Method</Label>
              <Select value={scaleMethod} onValueChange={setScaleMethod}>
                <SelectTrigger className="bg-background border-border/50"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="factor">Scale by Factor</SelectItem>
                  <SelectItem value="targetWeight">Target Total Weight</SelectItem>
                  <SelectItem value="targetConcentration">Target Concentration %</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">
                {scaleMethod === "factor" ? "Factor (e.g., 2 = double)" : scaleMethod === "targetWeight" ? "Target Weight (g)" : "Target Concentration (%)"}
              </Label>
              <Input type="number" step="0.01" value={scaleValue} onChange={e => setScaleValue(e.target.value)} className="bg-background border-border/50" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowScale(false)}>Cancel</Button>
            <Button onClick={handleScale} className="bg-primary text-primary-foreground">Apply Scale</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Export Dialog */}
      <Dialog open={showExport} onOpenChange={setShowExport}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader><DialogTitle>Export Formula</DialogTitle></DialogHeader>
          <div className="grid grid-cols-2 gap-3">
            {[
              { format: "pdf", label: "PDF (Print)", desc: "Branded print layout" },
              { format: "markdown", label: "Markdown", desc: "Formatted text file" },
              { format: "csv", label: "CSV", desc: "Spreadsheet compatible" },
              { format: "tsv", label: "TSV", desc: "Tab-separated values" },
            ].map(opt => (
              <Button key={opt.format} variant="outline" className="h-auto py-3 flex-col items-start border-border/50 hover:border-primary/50" onClick={() => generateExport(opt.format)}>
                <span className="font-medium text-sm">{opt.label}</span>
                <span className="text-[10px] text-muted-foreground">{opt.desc}</span>
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>

      {/* Duplicate Dialog */}
      <Dialog open={showDuplicate} onOpenChange={setShowDuplicate}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader><DialogTitle>Duplicate Formula</DialogTitle></DialogHeader>
          <div>
            <Label className="text-xs text-muted-foreground">New Formula Name</Label>
            <Input value={duplicateName} onChange={e => setDuplicateName(e.target.value)} className="bg-background border-border/50" />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDuplicate(false)}>Cancel</Button>
            <Button onClick={() => cloneMutation.mutate({ id: formulaId, name: duplicateName.trim() })} disabled={!duplicateName.trim() || cloneMutation.isPending} className="bg-primary text-primary-foreground">
              {cloneMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : "Duplicate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Tag Manager Dialog */}
      <Dialog open={showTagManager} onOpenChange={setShowTagManager}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader><DialogTitle>Manage Tags</DialogTitle></DialogHeader>
          <div className="space-y-4">
            {/* Create new tag */}
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">New Tag</Label>
                <Input placeholder="e.g., Spring 2026" value={newTagName} onChange={e => setNewTagName(e.target.value)} className="bg-background border-border/50" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Color</Label>
                <div className="flex gap-1">
                  {TAG_COLORS.map(c => (
                    <button key={c} className={`size-6 rounded-full border-2 transition-all ${newTagColor === c ? "border-foreground scale-110" : "border-transparent"}`}
                      style={{ backgroundColor: c }} onClick={() => setNewTagColor(c)} />
                  ))}
                </div>
              </div>
              <Button size="sm" className="bg-primary text-primary-foreground" disabled={!newTagName.trim()} onClick={() => createTagMutation.mutate({ name: newTagName.trim(), color: newTagColor })}>
                <Plus className="size-3.5" />
              </Button>
            </div>
            {/* Existing tags */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Assign Tags</Label>
              {(allTags || []).length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-4">No tags yet. Create one above.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(allTags || []).map((tag: any) => {
                    const isAssigned = assignedTagIds.has(tag.id);
                    return (
                      <div key={tag.id} className="flex items-center gap-1">
                        <Button
                          variant={isAssigned ? "default" : "outline"} size="sm"
                          className={`h-7 text-xs ${isAssigned ? "" : "border-border/50"}`}
                          style={isAssigned ? { backgroundColor: tag.color, borderColor: tag.color } : { borderColor: tag.color, color: tag.color }}
                          onClick={() => isAssigned ? unassignTagMutation.mutate({ formulaId, tagId: tag.id }) : assignTagMutation.mutate({ formulaId, tagId: tag.id })}
                        >
                          {isAssigned && <Check className="size-3 mr-1" />}
                          {tag.name}
                        </Button>
                        <Button variant="ghost" size="icon" className="size-5 text-destructive hover:bg-destructive/10" onClick={() => deleteTagMutation.mutate({ id: tag.id })}>
                          <X className="size-3" />
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Derived Formula Dialog */}
      <DerivedFormulaDialog
        open={showDerived}
        onOpenChange={setShowDerived}
        formulaId={formulaId}
        formulaName={formula.name}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="bg-card border-border/50">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Formula</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete "{formula.name}" and all its ingredients. This action cannot be undone.</AlertDialogDescription>
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

/* ─── Derived Formula Info Banner ─── */
function DerivedInfoBanner({ formulaId, parentFormulaId, formula }: { formulaId: number; parentFormulaId: number; formula: any }) {
  const [, setLocation] = useLocation();
  const { data: parentInfo } = trpc.derived.getParent.useQuery({ parentFormulaId });

  return (
    <Card className="border-violet-500/30 bg-violet-500/5">
      <CardContent className="pt-3 pb-3">
        <div className="flex items-center gap-2 flex-wrap">
          <Beaker className="size-4 text-violet-400" />
          <span className="text-sm font-medium text-violet-300">Derived Formula</span>
          {formula.productType && (
            <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-400">
              {formula.productType}
            </Badge>
          )}
          {formula.fragranceLoadPercent && (
            <Badge variant="outline" className="text-[10px] border-violet-500/40 text-violet-400">
              {formula.fragranceLoadPercent}% load
            </Badge>
          )}
          <span className="text-xs text-muted-foreground">from</span>
          {parentInfo ? (
            <button
              className="text-xs text-accent hover:underline font-medium"
              onClick={() => setLocation(`/formulas/${parentInfo.id}`)}
            >
              {parentInfo.name}
            </button>
          ) : (
            <span className="text-xs text-muted-foreground italic">Parent formula</span>
          )}
        </div>
        {formula.mixingProcedure && (
          <details className="mt-2">
            <summary className="text-xs text-violet-400/80 cursor-pointer hover:text-violet-300 transition-colors">
              View Mixing Procedure
            </summary>
            <pre className="mt-2 text-xs text-foreground/80 whitespace-pre-wrap leading-relaxed bg-secondary/20 rounded-md p-3 border border-border/20">
              {formula.mixingProcedure}
            </pre>
          </details>
        )}
      </CardContent>
    </Card>
  );
}
