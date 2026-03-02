import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import { LONGEVITY_LABELS, PYRAMID_POSITIONS } from "@shared/perfumery";
import {
  ArrowLeft, Edit, Trash2, Sparkles, Loader2, Star, Copy,
  Clock, CalendarDays, FileText, Bot, LockKeyhole, Save, Triangle,
  Plus, Droplets, X, ChevronDown, ChevronUp,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function IngredientDetail() {
  const { loading } = useAuth();
  const navItems = useNavItems();
  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <DashboardLayout navItems={navItems} currentPath="/library" title="Olfactra">
      <DetailContent />
    </DashboardLayout>
  );
}

// ─── Description Formatter ──────────────────────────────────────────────────
function formatDescription(text: string) {
  // If the text already has line breaks, preserve them
  if (text.includes("\n")) {
    return text.split("\n").map((line, i) => {
      const trimmed = line.trim();
      if (!trimmed) return <br key={i} />;
      // Check if line looks like a list item
      if (trimmed.startsWith("- ") || trimmed.startsWith("• ") || trimmed.match(/^\d+\./)) {
        return <li key={i} className="ml-4 text-sm text-foreground leading-relaxed">{trimmed.replace(/^[-•]\s*/, "").replace(/^\d+\.\s*/, "")}</li>;
      }
      return <p key={i} className="text-sm text-foreground leading-relaxed">{trimmed}</p>;
    });
  }

  // Single blob: try to format intelligently
  const sentences = text.split(/(?<=[.!?])\s+/).filter(Boolean);
  if (sentences.length <= 3) {
    return <p className="text-sm text-foreground leading-relaxed">{text}</p>;
  }

  // Check for semicolons or comma-heavy lists
  if (text.includes(";")) {
    const parts = text.split(";").map(s => s.trim()).filter(Boolean);
    return (
      <ul className="list-disc list-inside space-y-1">
        {parts.map((part, i) => (
          <li key={i} className="text-sm text-foreground leading-relaxed">{part}</li>
        ))}
      </ul>
    );
  }

  // Group into paragraphs of 2-3 sentences
  const paragraphs: string[] = [];
  for (let i = 0; i < sentences.length; i += 3) {
    paragraphs.push(sentences.slice(i, i + 3).join(" "));
  }
  return paragraphs.map((p, i) => (
    <p key={i} className="text-sm text-foreground leading-relaxed">{p}</p>
  ));
}

// ─── Timestamp Helper ───────────────────────────────────────────────────────
function formatTimestamp(date: Date | string | null | undefined) {
  if (!date) return null;
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function DetailContent() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const ingredientId = parseInt(params.id || "0");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [manualNotesText, setManualNotesText] = useState<string | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [showAddDilution, setShowAddDilution] = useState(false);
  const [newDilution, setNewDilution] = useState({ percentage: "", solvent: "Ethanol", notes: "" });
  const [manualNotesExpanded, setManualNotesExpanded] = useState(false);
  const [aiNotesExpanded, setAiNotesExpanded] = useState(false);

  const { data: ingredient, isLoading } = trpc.ingredient.get.useQuery({ id: ingredientId });
  const { data: usage } = trpc.ingredient.usage.useQuery({ id: ingredientId });
  const { data: dilutions } = trpc.ingredient.dilutions.useQuery({ ingredientId });
  const { data: favoriteIds } = trpc.ingredient.favorites.useQuery();
  const utils = trpc.useUtils();

  const isFavorite = favoriteIds?.includes(ingredientId) ?? false;
  const addFavMutation = trpc.ingredient.addFavorite.useMutation({
    onSuccess: () => { utils.ingredient.favorites.invalidate(); toast.success("Added to favorites"); },
  });
  const removeFavMutation = trpc.ingredient.removeFavorite.useMutation({
    onSuccess: () => { utils.ingredient.favorites.invalidate(); toast.success("Removed from favorites"); },
  });

  const deleteMutation = trpc.ingredient.delete.useMutation({
    onSuccess: () => {
      toast.success("Ingredient deleted");
      setLocation("/library");
    },
  });

  const updateMutation = trpc.ingredient.update.useMutation({
    onSuccess: () => {
      utils.ingredient.get.invalidate({ id: ingredientId });
      setShowEdit(false);
      toast.success("Ingredient updated");
    },
  });

  const saveManualNotesMutation = trpc.ingredient.saveManualNotes.useMutation({
    onSuccess: () => {
      utils.ingredient.get.invalidate({ id: ingredientId });
      setIsEditingNotes(false);
      setManualNotesText(null);
      toast.success("Notes saved");
    },
  });

  const generateAiNotesMutation = trpc.ingredient.generateAiNotes.useMutation({
    onSuccess: () => {
      utils.ingredient.get.invalidate({ id: ingredientId });
      toast.success("AI notes generated and saved");
    },
  });

  const copyAiToManualMutation = trpc.ingredient.copyAiToManualNotes.useMutation({
    onSuccess: () => {
      utils.ingredient.get.invalidate({ id: ingredientId });
      toast.success("AI notes copied to manual notes");
    },
  });

  const addDilutionMutation = trpc.ingredient.addDilution.useMutation({
    onSuccess: () => {
      utils.ingredient.dilutions.invalidate({ ingredientId });
      setShowAddDilution(false);
      setNewDilution({ percentage: "", solvent: "Ethanol", notes: "" });
      toast.success("Dilution added");
    },
  });

  const deleteDilutionMutation = trpc.ingredient.deleteDilution.useMutation({
    onSuccess: () => {
      utils.ingredient.dilutions.invalidate({ ingredientId });
      toast.success("Dilution removed");
    },
  });

  // Keep the old aiInfo for backward compat (ephemeral info button)
  const aiInfoMutation = trpc.ingredient.aiInfo.useMutation();

  const [editData, setEditData] = useState<Record<string, any>>({});

  // Usage calculations (as-dosed basis)
  const usageRows = useMemo(() => {
    if (!usage) return [];
    return usage.map((u: any) => {
      const totalW = parseFloat(u.formulaTotalWeight || "0");
      const w = parseFloat(u.weight || "0");
      const pctOfTotal = totalW > 0 ? ((w / totalW) * 100) : 0;
      return {
        ...u,
        weightNum: w,
        pctOfTotal,
      };
    });
  }, [usage]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!ingredient) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Ingredient not found.</p>
        <Button variant="outline" className="mt-4" onClick={() => setLocation("/library")}>
          <ArrowLeft className="size-4" /> Back to Library
        </Button>
      </div>
    );
  }

  const openEdit = () => {
    setEditData({
      name: ingredient.name,
      casNumber: ingredient.casNumber || "",
      supplier: ingredient.supplier || "",
      category: ingredient.category || "",
      inventoryAmount: ingredient.inventoryAmount || "",
      costPerGram: ingredient.costPerGram || "",
      ifraLimit: ingredient.ifraLimit || "",
      longevity: ingredient.longevity ?? 2,
      description: ingredient.description || "",
    });
    setShowEdit(true);
  };

  const handleUpdate = () => {
    updateMutation.mutate({
      id: ingredientId,
      ...editData,
      costPerGram: editData.costPerGram || undefined,
      ifraLimit: editData.ifraLimit || undefined,
    });
  };

  // Fetch category colors from DB
  const { data: dbCategories } = trpc.category.list.useQuery();
  const categoryColorMap = useMemo(() => {
    const map: Record<string, string> = {};
    if (dbCategories) {
      for (const c of dbCategories) {
        map[c.name] = c.color || "#6b7280";
      }
    }
    return map;
  }, [dbCategories]);
  const catColor = ingredient.category ? categoryColorMap[ingredient.category] || "#6b7280" : "#6b7280";

  const properties = [
    { label: "Category", value: ingredient.category, color: catColor },
    { label: "Supplier", value: ingredient.supplier },
    { label: "Inventory", value: ingredient.inventoryAmount },
    { label: "Cost per Gram", value: ingredient.costPerGram ? `$${ingredient.costPerGram}` : null },
    { label: "IFRA Limit", value: ingredient.ifraLimit ? `${ingredient.ifraLimit}%` : null },
    { label: "Longevity", value: ingredient.longevity != null ? LONGEVITY_LABELS[ingredient.longevity] || `Level ${ingredient.longevity}` : null, isBadge: true },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* ═══ SECTION A: Header ═══ */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/library")} className="hover:bg-secondary">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-serif font-bold text-foreground">{ingredient.name}</h2>
          <div className="flex items-center gap-2 mt-0.5">
            {ingredient.casNumber && <span className="text-sm text-muted-foreground font-mono">{ingredient.casNumber}</span>}
            {ingredient.category && (
              <Badge variant="secondary" className="text-xs" style={{ backgroundColor: `${catColor}18`, color: catColor, borderColor: `${catColor}30` }}>
                <div className="size-1.5 rounded-full mr-1" style={{ backgroundColor: catColor }} />
                {ingredient.category}
              </Badge>
            )}
          </div>
        </div>
        <Button
          variant="outline" size="sm"
          onClick={() => isFavorite ? removeFavMutation.mutate({ ingredientId }) : addFavMutation.mutate({ ingredientId })}
          className={`border-border/50 ${isFavorite ? "text-accent border-accent/50" : ""}`}
        >
          <Star className={`size-3.5 ${isFavorite ? "fill-accent text-accent" : ""}`} />
          {isFavorite ? "Favorited" : "Favorite"}
        </Button>
        <Button variant="outline" size="sm" onClick={openEdit} className="border-border/50">
          <Edit className="size-3.5" /> Edit
        </Button>
        <Button variant="outline" size="sm" className="text-destructive border-border/50 hover:bg-destructive/10" onClick={() => setShowDelete(true)}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ═══ Left Column ═══ */}
        <div className="lg:col-span-2 space-y-5">
          {/* ═══ Properties Card ═══ */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-sm">
                {properties.map(p => (
                  <div key={p.label}>
                    <span className="text-muted-foreground block text-xs mb-1">{p.label}</span>
                    {p.isBadge && p.value ? (
                      <Badge variant="outline" className="text-xs border-primary/30 text-primary">{p.value}</Badge>
                    ) : p.color && p.label === "Category" && p.value ? (
                      <span className="font-medium" style={{ color: p.color }}>{p.value}</span>
                    ) : (
                      <span className="font-medium text-foreground">{p.value || "—"}</span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* ═══ Fragrance Pyramid Position ═══ */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Triangle className="size-4 text-primary" /> Fragrance Pyramid
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-1.5">
                {PYRAMID_POSITIONS.map((pos) => {
                  const isActive = ingredient.pyramidPosition === pos.value;
                  return (
                    <button
                      key={pos.value}
                      onClick={() => {
                        updateMutation.mutate({ id: ingredientId, pyramidPosition: pos.value as any });
                      }}
                      className={`flex-1 flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg border transition-all text-center ${
                        isActive
                          ? "bg-primary/10 border-primary/40 text-primary shadow-sm"
                          : "border-border/30 text-muted-foreground hover:bg-secondary/50 hover:border-border/60"
                      }`}
                      title={pos.description}
                    >
                      <span className={`text-lg leading-none ${isActive ? "text-primary" : "text-muted-foreground/60"}`}>{pos.icon}</span>
                      <span className={`text-[10px] font-medium leading-tight ${isActive ? "text-primary" : ""}`}>{pos.label}</span>
                    </button>
                  );
                })}
              </div>
              {ingredient.pyramidPosition && (
                <p className="text-xs text-muted-foreground mt-2 text-center">
                  {PYRAMID_POSITIONS.find(p => p.value === ingredient.pyramidPosition)?.description}
                </p>
              )}
            </CardContent>
          </Card>

          {/* ═══ SECTION C: Description ═══ */}
          {ingredient.description && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Description</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {formatDescription(ingredient.description)}
              </CardContent>
            </Card>
          )}

          {/* ═══ SECTION B: Notes ═══ */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <FileText className="size-4 text-primary" /> Notes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              {/* Manual Notes — Collapsible */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => !isEditingNotes && ingredient.manualNotes && setManualNotesExpanded(p => !p)}
                    className="text-sm font-medium text-foreground flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    Manual Notes
                    {ingredient.manualNotes && !isEditingNotes && (
                      manualNotesExpanded
                        ? <ChevronUp className="size-3.5 text-muted-foreground" />
                        : <ChevronDown className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                  {!isEditingNotes ? (
                    <Button
                      variant="ghost" size="sm"
                      onClick={() => {
                        setManualNotesText(ingredient.manualNotes || "");
                        setIsEditingNotes(true);
                        setManualNotesExpanded(true);
                      }}
                      className="h-7 text-xs"
                    >
                      <Edit className="size-3" /> Edit
                    </Button>
                  ) : (
                    <div className="flex gap-1.5">
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => { setIsEditingNotes(false); setManualNotesText(null); }}
                        className="h-7 text-xs"
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => saveManualNotesMutation.mutate({ id: ingredientId, manualNotes: manualNotesText || "" })}
                        disabled={saveManualNotesMutation.isPending}
                        className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                      >
                        {saveManualNotesMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Save className="size-3" />}
                        Save
                      </Button>
                    </div>
                  )}
                </div>
                {isEditingNotes ? (
                  <Textarea
                    value={manualNotesText || ""}
                    onChange={e => setManualNotesText(e.target.value)}
                    placeholder="Type your notes here..."
                    className="min-h-[120px] bg-background border-border/50 text-sm"
                  />
                ) : ingredient.manualNotes ? (
                  <div>
                    {!manualNotesExpanded ? (
                      <button
                        onClick={() => setManualNotesExpanded(true)}
                        className="w-full text-left rounded-lg border border-border/30 bg-secondary/30 p-3 hover:bg-secondary/50 transition-colors cursor-pointer"
                      >
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {ingredient.manualNotes.replace(/[#*_`>\-]/g, "").slice(0, 150)}{ingredient.manualNotes.length > 150 ? "..." : ""}
                        </div>
                        <span className="text-xs text-primary mt-1 inline-block">Click to expand</span>
                      </button>
                    ) : (
                      <div className="rounded-lg border border-border/30 bg-secondary/30 p-3">
                        <div className="prose prose-sm max-w-none text-sm">
                          <Streamdown>{ingredient.manualNotes}</Streamdown>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">No manual notes yet. Click Edit to add notes.</p>
                )}
                {ingredient.manualNotesUpdatedAt && (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Clock className="size-3" /> Updated {formatTimestamp(ingredient.manualNotesUpdatedAt)}
                  </p>
                )}
              </div>

              <Separator className="bg-border/30" />

              {/* AI Notes — Collapsible */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => ingredient.aiNotes && setAiNotesExpanded(p => !p)}
                    className="text-sm font-medium text-foreground flex items-center gap-1.5 hover:text-primary transition-colors"
                  >
                    <Bot className="size-3.5 text-accent" /> AI Generated Notes
                    <LockKeyhole className="size-3 text-muted-foreground" />
                    {ingredient.aiNotes && (
                      aiNotesExpanded
                        ? <ChevronUp className="size-3.5 text-muted-foreground" />
                        : <ChevronDown className="size-3.5 text-muted-foreground" />
                    )}
                  </button>
                  <div className="flex gap-1.5">
                    {ingredient.aiNotes && (
                      <Button
                        variant="ghost" size="sm"
                        onClick={() => copyAiToManualMutation.mutate({ id: ingredientId })}
                        disabled={copyAiToManualMutation.isPending}
                        className="h-7 text-xs"
                      >
                        {copyAiToManualMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Copy className="size-3" />}
                        Copy to Manual Notes
                      </Button>
                    )}
                    <Button
                      variant="outline" size="sm"
                      onClick={() => {
                        generateAiNotesMutation.mutate({
                          id: ingredientId,
                          ingredientName: ingredient.name,
                          casNumber: ingredient.casNumber || undefined,
                        });
                        setAiNotesExpanded(true);
                      }}
                      disabled={generateAiNotesMutation.isPending}
                      className="h-7 text-xs border-accent/30 text-accent hover:bg-accent/10"
                    >
                      {generateAiNotesMutation.isPending ? (
                        <><Loader2 className="size-3 animate-spin" /> Generating...</>
                      ) : (
                        <><Sparkles className="size-3" /> {ingredient.aiNotes ? "Regenerate" : "Generate AI Notes"}</>
                      )}
                    </Button>
                  </div>
                </div>
                {ingredient.aiNotes ? (
                  <div>
                    {!aiNotesExpanded ? (
                      <button
                        onClick={() => setAiNotesExpanded(true)}
                        className="w-full text-left rounded-lg border border-accent/20 bg-accent/5 p-3 hover:bg-accent/10 transition-colors cursor-pointer"
                      >
                        <div className="text-sm text-muted-foreground line-clamp-2">
                          {ingredient.aiNotes.replace(/[#*_`>\-]/g, "").slice(0, 150)}{ingredient.aiNotes.length > 150 ? "..." : ""}
                        </div>
                        <span className="text-xs text-primary mt-1 inline-block">Click to expand</span>
                      </button>
                    ) : (
                      <div className="rounded-lg border border-accent/20 bg-accent/5 p-3">
                        <div className="prose prose-sm max-w-none text-sm">
                          <Streamdown>{ingredient.aiNotes}</Streamdown>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No AI notes yet. Click "Generate AI Notes" to get a comprehensive reference card for this ingredient.
                  </p>
                )}
                {ingredient.aiNotesUpdatedAt && (
                  <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                    <Clock className="size-3" /> Generated {formatTimestamp(ingredient.aiNotesUpdatedAt)}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* ═══ Dilutions Section ═══ */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Droplets className="size-4 text-primary" /> Dilutions
                </CardTitle>
                <Button
                  variant="ghost" size="sm"
                  onClick={() => setShowAddDilution(!showAddDilution)}
                  className="h-7 text-xs"
                >
                  {showAddDilution ? <X className="size-3" /> : <Plus className="size-3" />}
                  {showAddDilution ? "Cancel" : "Add Dilution"}
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {showAddDilution && (
                <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs">Percentage (%)</Label>
                      <Input
                        className="mt-1 bg-background border-border/50 h-8 text-sm"
                        type="number" step="0.01" min="0" max="100"
                        placeholder="e.g. 10"
                        value={newDilution.percentage}
                        onChange={e => setNewDilution(p => ({ ...p, percentage: e.target.value }))}
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Solvent</Label>
                      <Input
                        className="mt-1 bg-background border-border/50 h-8 text-sm"
                        placeholder="Ethanol"
                        value={newDilution.solvent}
                        onChange={e => setNewDilution(p => ({ ...p, solvent: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div>
                    <Label className="text-xs">Notes (optional)</Label>
                    <Input
                      className="mt-1 bg-background border-border/50 h-8 text-sm"
                      placeholder="e.g. Working dilution for testing"
                      value={newDilution.notes}
                      onChange={e => setNewDilution(p => ({ ...p, notes: e.target.value }))}
                    />
                  </div>
                  <Button
                    size="sm"
                    onClick={() => addDilutionMutation.mutate({
                      ingredientId,
                      percentage: newDilution.percentage,
                      solvent: newDilution.solvent || "Ethanol",
                      notes: newDilution.notes || undefined,
                    })}
                    disabled={!newDilution.percentage || addDilutionMutation.isPending}
                    className="h-7 text-xs bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {addDilutionMutation.isPending ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3" />}
                    Add Dilution
                  </Button>
                </div>
              )}

              {dilutions && dilutions.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-muted-foreground">Concentration</TableHead>
                      <TableHead className="text-muted-foreground">Solvent</TableHead>
                      <TableHead className="text-muted-foreground">Date</TableHead>
                      <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dilutions.map((d: any) => (
                      <TableRow key={d.id} className="border-border/30">
                        <TableCell className="font-medium tabular-nums">{parseFloat(d.percentage).toFixed(2)}%</TableCell>
                        <TableCell className="text-sm">{d.solvent || "Ethanol"}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {d.dateCreated ? new Date(d.dateCreated).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost" size="sm"
                            onClick={() => deleteDilutionMutation.mutate({ id: d.id })}
                            className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive"
                          >
                            <Trash2 className="size-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : !showAddDilution ? (
                <div className="text-center py-3">
                  <p className="text-sm text-muted-foreground italic">No dilutions recorded.</p>
                  <p className="text-xs text-muted-foreground mt-1">Neat (100%) is assumed by default.</p>
                </div>
              ) : null}
              {dilutions && dilutions.length > 0 && dilutions.every((d: any) => parseFloat(d.percentage) !== 100) && (
                <p className="text-xs text-muted-foreground italic">Note: Neat (100%) is assumed as the base concentration.</p>
              )}
            </CardContent>
          </Card>

          {/* ═══ SECTION D: Usage in Formulas ═══ */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Usage in Formulas</CardTitle>
            </CardHeader>
            <CardContent>
              {usageRows.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-muted-foreground">Formula</TableHead>
                      <TableHead className="text-right text-muted-foreground">Weight (g)</TableHead>
                      <TableHead className="text-right text-muted-foreground">Dilution</TableHead>
                      <TableHead className="text-right text-muted-foreground">% of Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usageRows.map((u: any) => (
                      <TableRow
                        key={u.formulaIngredientId}
                        className="cursor-pointer hover:bg-secondary/50 border-border/30"
                        onClick={() => setLocation(`/formulas/${u.formulaId}`)}
                      >
                        <TableCell className="font-medium text-foreground">{u.formulaName}</TableCell>
                        <TableCell className="text-right tabular-nums">{u.weightNum.toFixed(3)}</TableCell>
                        <TableCell className="text-right tabular-nums">{u.dilutionPercent}%</TableCell>
                        <TableCell className="text-right tabular-nums text-accent font-medium">{u.pctOfTotal.toFixed(2)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground italic py-2">Not used in any formulas yet.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ═══ Right Column ═══ */}
        <div className="space-y-4">
          {/* ═══ PHASE 4: Traceability Timestamps ═══ */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <CalendarDays className="size-4 text-primary" /> Timeline
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <span className="text-xs text-muted-foreground block">Date Added</span>
                <span className="text-sm font-medium text-foreground">{formatTimestamp(ingredient.createdAt) || "—"}</span>
              </div>
              {ingredient.lastEditedAt && (
                <div>
                  <span className="text-xs text-muted-foreground block">Last Edited</span>
                  <span className="text-sm font-medium text-foreground">{formatTimestamp(ingredient.lastEditedAt)}</span>
                  {ingredient.lastEditedBySource && ingredient.lastEditedBySource !== "user" && (
                    <Badge variant="secondary" className="text-xs ml-1.5">{ingredient.lastEditedBySource}</Badge>
                  )}
                </div>
              )}
              {ingredient.manualNotesUpdatedAt && (
                <div>
                  <span className="text-xs text-muted-foreground block">Manual Notes Updated</span>
                  <span className="text-sm font-medium text-foreground">{formatTimestamp(ingredient.manualNotesUpdatedAt)}</span>
                </div>
              )}
              {ingredient.aiNotesUpdatedAt && (
                <div>
                  <span className="text-xs text-muted-foreground block">AI Notes Generated</span>
                  <span className="text-sm font-medium text-foreground">{formatTimestamp(ingredient.aiNotesUpdatedAt)}</span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ═══ Legacy AI Info (ephemeral) ═══ */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-accent" /> Quick AI Lookup
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiInfoMutation.data ? (
                <div className="prose prose-sm max-w-none text-sm">
                  <Streamdown>{aiInfoMutation.data.content as string}</Streamdown>
                </div>
              ) : (
                <div className="text-center space-y-3 py-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Get a quick AI lookup for this ingredient (not saved).
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => aiInfoMutation.mutate({ ingredientName: ingredient.name, casNumber: ingredient.casNumber || undefined })}
                    disabled={aiInfoMutation.isPending}
                    className="border-accent/30 text-accent hover:bg-accent/10"
                  >
                    {aiInfoMutation.isPending ? (
                      <><Loader2 className="size-3.5 animate-spin" /> Fetching...</>
                    ) : (
                      <><Sparkles className="size-3.5" /> Quick Lookup</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* ═══ Edit Dialog ═══ */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card">
          <DialogHeader><DialogTitle className="font-serif">Edit Ingredient</DialogTitle></DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="text-sm">Name *</Label>
              <Input className="mt-1.5 bg-background border-border/50" value={editData.name || ""} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">CAS / Botanical</Label>
                <Input className="mt-1.5 bg-background border-border/50" value={editData.casNumber || ""} onChange={e => setEditData(p => ({ ...p, casNumber: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Supplier</Label>
                <Input className="mt-1.5 bg-background border-border/50" value={editData.supplier || ""} onChange={e => setEditData(p => ({ ...p, supplier: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Category</Label>
                <Input className="mt-1.5 bg-background border-border/50" value={editData.category || ""} onChange={e => setEditData(p => ({ ...p, category: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Inventory Amount</Label>
                <Input className="mt-1.5 bg-background border-border/50" value={editData.inventoryAmount || ""} onChange={e => setEditData(p => ({ ...p, inventoryAmount: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">Cost/gram ($)</Label>
                <Input className="mt-1.5 bg-background border-border/50" type="number" step="0.001" value={editData.costPerGram || ""} onChange={e => setEditData(p => ({ ...p, costPerGram: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">IFRA Limit (%)</Label>
                <Input className="mt-1.5 bg-background border-border/50" type="number" step="0.001" value={editData.ifraLimit || ""} onChange={e => setEditData(p => ({ ...p, ifraLimit: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Longevity (0-5)</Label>
                <Input className="mt-1.5 bg-background border-border/50" type="number" min={0} max={5} value={editData.longevity ?? 2} onChange={e => setEditData(p => ({ ...p, longevity: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Textarea
                className="mt-1.5 bg-background border-border/50 min-h-[80px]"
                value={editData.description || ""}
                onChange={e => setEditData(p => ({ ...p, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ═══ Delete Dialog ═══ */}
      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent className="bg-card">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Ingredient</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{ingredient.name}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => deleteMutation.mutate({ id: ingredientId })}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
