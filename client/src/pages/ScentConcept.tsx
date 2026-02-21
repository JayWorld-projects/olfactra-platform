import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import {
  Sparkles, Loader2, Lightbulb, Flame, Droplets, Wind,
  Bath, SprayCan, CloudFog, GlassWater, Save, Check, BookmarkPlus,
  History, Trash2, Clock, ChevronRight, ArrowLeft, SaveAll
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";

type ProductTypeKey = "perfume" | "candle" | "lotion" | "bodywash" | "incense" | "bodyspray" | "humidifier";

const PRODUCT_TYPES: { key: ProductTypeKey; label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; borderColor: string; parseKeys: string[] }[] = [
  { key: "perfume", label: "Perfume", icon: Droplets, color: "text-purple-400", bgColor: "bg-purple-400/10", borderColor: "border-purple-400/30", parseKeys: ["perfume", "eau de"] },
  { key: "candle", label: "Candle", icon: Flame, color: "text-orange-400", bgColor: "bg-orange-400/10", borderColor: "border-orange-400/30", parseKeys: ["candle"] },
  { key: "lotion", label: "Lotion", icon: GlassWater, color: "text-pink-400", bgColor: "bg-pink-400/10", borderColor: "border-pink-400/30", parseKeys: ["lotion", "body cream"] },
  { key: "bodywash", label: "Body Wash", icon: Bath, color: "text-blue-400", bgColor: "bg-blue-400/10", borderColor: "border-blue-400/30", parseKeys: ["body wash", "shower"] },
  { key: "incense", label: "Incense", icon: Wind, color: "text-amber-400", bgColor: "bg-amber-400/10", borderColor: "border-amber-400/30", parseKeys: ["incense"] },
  { key: "bodyspray", label: "Body Spray", icon: SprayCan, color: "text-teal-400", bgColor: "bg-teal-400/10", borderColor: "border-teal-400/30", parseKeys: ["body spray", "body mist"] },
  { key: "humidifier", label: "Humidifier Oil", icon: CloudFog, color: "text-cyan-400", bgColor: "bg-cyan-400/10", borderColor: "border-cyan-400/30", parseKeys: ["humidifier", "diffuser"] },
];

const EXAMPLE_CONCEPTS = [
  "A warm summer evening on a Mediterranean terrace, with jasmine blooming on old stone walls and the faint scent of sea salt in the air.",
  "Walking through a cedar forest after rain, with damp earth, moss-covered bark, and a hint of wild berries.",
  "A cozy winter library with leather-bound books, a crackling fireplace, and a cup of spiced chai.",
  "A fresh spring morning in a Japanese garden with cherry blossoms, green tea, and clean linen drying in the breeze.",
];

interface ParsedSection {
  key: ProductTypeKey;
  title: string;
  content: string;
  rawContent: string;
}

function parseProductSections(content: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = content.split("\n");
  let currentKey: ProductTypeKey | "" = "";
  let currentTitle = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^##\s*\d*\.?\s*(.*)/i);
    if (headerMatch) {
      if (currentKey && currentLines.length > 0) {
        const rawContent = currentLines.join("\n").trim();
        sections.push({ key: currentKey, title: currentTitle, content: rawContent, rawContent: `## ${currentTitle}\n${rawContent}` });
      }
      const headerText = headerMatch[1];
      const headerLower = headerText.toLowerCase();
      currentTitle = headerText;
      currentKey = "";
      for (const pt of PRODUCT_TYPES) {
        if (pt.parseKeys.some(k => headerLower.includes(k))) {
          currentKey = pt.key;
          break;
        }
      }
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentKey && currentLines.length > 0) {
    const rawContent = currentLines.join("\n").trim();
    sections.push({ key: currentKey, title: currentTitle, content: rawContent, rawContent: `## ${currentTitle}\n${rawContent}` });
  }
  return sections;
}

function extractIngredientsFromSection(content: string): { ingredientName: string; weight: string }[] {
  const ingredients: { ingredientName: string; weight: string }[] = [];
  const lines = content.split("\n");
  let inTable = false;
  let nameCol = -1;
  let weightCol = -1;

  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.split("|").filter(c => c.trim() !== "");
      if (!inTable) {
        cells.forEach((cell, idx) => {
          const cl = cell.trim().toLowerCase();
          if (cl.includes("ingredient") || cl.includes("material") || cl.includes("name") || cl.includes("component") || cl.includes("fragrance")) {
            nameCol = idx;
          }
          if (cl.includes("weight") || cl.includes("amount") || cl.includes("grams") || cl.includes("quantity") || cl.includes("g)")) {
            weightCol = idx;
          }
        });
        inTable = true;
      } else if (trimmed.includes("---")) {
        continue;
      } else if (nameCol >= 0 && weightCol >= 0 && nameCol < cells.length && weightCol < cells.length) {
        const name = cells[nameCol].trim().replace(/\*\*/g, "");
        const weightRaw = cells[weightCol].trim().replace(/[^\d.]/g, "");
        if (name && weightRaw && !isNaN(parseFloat(weightRaw))) {
          ingredients.push({ ingredientName: name, weight: weightRaw });
        }
      }
    } else {
      if (inTable && nameCol >= 0) {
        inTable = false;
        nameCol = -1;
        weightCol = -1;
      }
    }
  }
  return ingredients;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export default function ScentConcept() {
  const { loading } = useAuth();
  const navItems = useNavItems();
  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <DashboardLayout navItems={navItems} currentPath="/concept" title="JayLabs Perfumery">
      <ScentConceptContent />
    </DashboardLayout>
  );
}

function ScentConceptContent() {
  const [concept, setConcept] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>("all");
  const [selectedTypes, setSelectedTypes] = useState<Set<ProductTypeKey>>(new Set(PRODUCT_TYPES.map(p => p.key)));
  const [generatedTypes, setGeneratedTypes] = useState<ProductTypeKey[]>([]);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [savingSection, setSavingSection] = useState<ParsedSection | null>(null);
  const [formulaName, setFormulaName] = useState("");
  const [showHistory, setShowHistory] = useState(false);
  const [viewingHistoryId, setViewingHistoryId] = useState<number | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [, navigate] = useLocation();

  const utils = trpc.useUtils();

  // Fetch generation history
  const historyQuery = trpc.formula.generationHistory.useQuery(undefined, {
    staleTime: 30_000,
  });

  // Fetch a specific generation when viewing history
  const viewingGeneration = trpc.formula.getGeneration.useQuery(
    { id: viewingHistoryId! },
    { enabled: viewingHistoryId !== null }
  );

  const scentMutation = trpc.formula.scentConcept.useMutation({
    onSuccess: (data) => {
      setResult(data.content as string);
      setGeneratedTypes(data.selectedTypes as ProductTypeKey[]);
      setActiveFilter("all");
      setGeneratedAt(new Date());
      setViewingHistoryId(null);
      utils.formula.generationHistory.invalidate();
    },
    onError: () => toast.error("Failed to generate recipes. Please try again."),
  });

  const saveMutation = trpc.formula.saveFromConcept.useMutation({
    onSuccess: (data) => {
      toast.success(`Formula saved with ${data.addedCount} of ${data.totalRequested} ingredients matched. Opening formula...`);
      utils.formula.list.invalidate();
      setSaveDialogOpen(false);
      setSavingSection(null);
      setFormulaName("");
      setTimeout(() => navigate(`/formulas/${data.formulaId}`), 500);
    },
    onError: () => toast.error("Failed to save formula. Please try again."),
  });

  const deleteGenerationMutation = trpc.formula.deleteGeneration.useMutation({
    onSuccess: () => {
      toast.success("Generation deleted from history.");
      utils.formula.generationHistory.invalidate();
      if (viewingHistoryId) {
        setViewingHistoryId(null);
        setResult(null);
        setGeneratedAt(null);
      }
    },
    onError: () => toast.error("Failed to delete generation."),
  });

  const toggleType = useCallback((key: ProductTypeKey) => {
    setSelectedTypes(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        if (next.size > 1) next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedTypes(new Set(PRODUCT_TYPES.map(p => p.key)));
  }, []);

  const handleGenerate = () => {
    if (!concept.trim()) { toast.error("Please describe a scent concept first."); return; }
    if (selectedTypes.size === 0) { toast.error("Please select at least one product type."); return; }
    setResult(null);
    setActiveFilter("all");
    setViewingHistoryId(null);
    scentMutation.mutate({ concept: concept.trim(), selectedTypes: Array.from(selectedTypes) });
  };

  const handleLoadHistory = (gen: { id: number; concept: string; selectedTypes: unknown; content: string; createdAt: Date }) => {
    setViewingHistoryId(gen.id);
    setConcept(gen.concept);
    const types = gen.selectedTypes as ProductTypeKey[];
    setGeneratedTypes(types);
    setResult(gen.content);
    setActiveFilter("all");
    setGeneratedAt(new Date(gen.createdAt));
    setShowHistory(false);
  };

  const sections = useMemo(() => result ? parseProductSections(result) : [], [result]);

  const handleSaveClick = (section: ParsedSection) => {
    setSavingSection(section);
    const pt = PRODUCT_TYPES.find(p => p.key === section.key);
    setFormulaName(`${pt?.label || section.key} - ${concept.slice(0, 40)}${concept.length > 40 ? "..." : ""}`);
    setSaveDialogOpen(true);
  };

  const handleSaveAllClick = () => {
    if (sections.length === 0) return;
    let saved = 0;
    const total = sections.length;
    for (const section of sections) {
      const pt = PRODUCT_TYPES.find(p => p.key === section.key);
      const ingredients = extractIngredientsFromSection(section.content);
      const name = `${pt?.label || section.key} - ${concept.slice(0, 40)}${concept.length > 40 ? "..." : ""}`;
      saveMutation.mutate({
        name,
        description: `Scent concept: "${concept.slice(0, 200)}"`,
        productType: pt?.label || section.key,
        ingredients,
      }, {
        onSuccess: () => {
          saved++;
          if (saved === total) {
            toast.success(`All ${total} recipes saved to your formulas list!`);
          }
        },
      });
    }
  };

  const handleSaveConfirm = () => {
    if (!savingSection || !formulaName.trim()) return;
    const ingredients = extractIngredientsFromSection(savingSection.content);
    if (ingredients.length === 0) {
      toast.error("Could not extract ingredients from this recipe. You may need to add them manually after saving.");
    }
    const pt = PRODUCT_TYPES.find(p => p.key === savingSection.key);
    saveMutation.mutate({
      name: formulaName.trim(),
      description: `Scent concept: "${concept.slice(0, 200)}"`,
      productType: pt?.label || savingSection.key,
      ingredients,
    });
  };

  const historyItems = historyQuery.data || [];

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Scent Lab</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Describe a memory, place, or feeling. Select which product types you want, then generate recipes from your ingredient library.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowHistory(!showHistory)}
          className="gap-1.5 border-border/50 text-muted-foreground hover:text-foreground shrink-0"
        >
          <History className="size-4" />
          History
          {historyItems.length > 0 && (
            <Badge variant="secondary" className="ml-1 text-xs px-1.5 py-0 h-5 bg-primary/20 text-primary">
              {historyItems.length}
            </Badge>
          )}
        </Button>
      </div>

      {/* History Panel */}
      {showHistory && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <History className="size-4 text-primary" /> Generation History
              </CardTitle>
              <Button variant="ghost" size="sm" onClick={() => setShowHistory(false)} className="text-muted-foreground hover:text-foreground text-xs">
                Close
              </Button>
            </div>
            <CardDescription className="text-muted-foreground">
              Click any past generation to reload it. All generations are automatically saved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No generation history yet. Create your first recipe above!</p>
            ) : (
              <ScrollArea className="max-h-[400px]">
                <div className="space-y-2">
                  {historyItems.map((gen) => {
                    const types = gen.selectedTypes as ProductTypeKey[];
                    const isActive = viewingHistoryId === gen.id;
                    return (
                      <div
                        key={gen.id}
                        className={`group flex items-start gap-3 p-3 rounded-lg border transition-all cursor-pointer ${
                          isActive
                            ? "bg-primary/10 border-primary/30"
                            : "bg-secondary/20 border-border/30 hover:border-primary/30 hover:bg-secondary/40"
                        }`}
                        onClick={() => handleLoadHistory(gen)}
                      >
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-foreground truncate">
                            "{gen.concept.slice(0, 80)}{gen.concept.length > 80 ? "..." : ""}"
                          </p>
                          <div className="flex items-center gap-2 mt-1.5">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Clock className="size-3" /> {formatDate(gen.createdAt)}
                            </span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {types.map(t => {
                              const pt = PRODUCT_TYPES.find(p => p.key === t);
                              if (!pt) return null;
                              const Icon = pt.icon;
                              return (
                                <Badge key={t} variant="outline" className={`text-[10px] gap-0.5 px-1.5 py-0 h-5 ${pt.borderColor} ${pt.color}`}>
                                  <Icon className="size-2.5" /> {pt.label}
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="size-7 p-0 text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteGenerationMutation.mutate({ id: gen.id });
                            }}
                          >
                            <Trash2 className="size-3.5" />
                          </Button>
                          <ChevronRight className="size-4 text-muted-foreground/50" />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </ScrollArea>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Concept Input */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-accent" /> Describe Your Scent Concept
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Be as descriptive as possible — include sensory details, emotions, settings, or specific scent references.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe a memory, place, or feeling you want to capture..."
                value={concept}
                onChange={e => setConcept(e.target.value)}
                rows={4}
                className="resize-none bg-background border-border/50 focus:border-primary"
              />

              {/* Product Type Selection */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium text-foreground">Select Product Types</Label>
                  <button
                    onClick={selectAll}
                    className="text-xs text-primary hover:text-primary/80 transition-colors"
                  >
                    Select All
                  </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PRODUCT_TYPES.map(pt => {
                    const Icon = pt.icon;
                    const isSelected = selectedTypes.has(pt.key);
                    return (
                      <button
                        key={pt.key}
                        onClick={() => toggleType(pt.key)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg border text-sm font-medium transition-all ${
                          isSelected
                            ? `${pt.bgColor} ${pt.color} ${pt.borderColor}`
                            : "bg-card/50 text-muted-foreground/60 border-border/20 hover:border-border/40"
                        }`}
                      >
                        <Icon className="size-4 shrink-0" />
                        <span className="truncate">{pt.label}</span>
                        {isSelected && <Check className="size-3 ml-auto shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Button
                onClick={handleGenerate}
                disabled={scentMutation.isPending || !concept.trim() || selectedTypes.size === 0}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {scentMutation.isPending ? (
                  <><Loader2 className="size-4 animate-spin" /> Generating {selectedTypes.size} Recipe{selectedTypes.size > 1 ? "s" : ""}...</>
                ) : (
                  <><Sparkles className="size-4" /> Generate {selectedTypes.size} Recipe{selectedTypes.size > 1 ? "s" : ""}</>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Loading State */}
          {scentMutation.isPending && (
            <Card className="bg-card border-border/50">
              <CardContent className="py-12 flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="size-16 rounded-full border-2 border-primary/20 flex items-center justify-center">
                    <Loader2 className="size-8 text-primary animate-spin" />
                  </div>
                </div>
                <div className="text-center space-y-1">
                  <p className="text-foreground font-medium">Crafting your recipes...</p>
                  <p className="text-muted-foreground text-sm">Generating formulas for {selectedTypes.size} product type{selectedTypes.size > 1 ? "s" : ""} from your library</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {PRODUCT_TYPES.filter(pt => selectedTypes.has(pt.key)).map(pt => {
                    const Icon = pt.icon;
                    return (
                      <Badge key={pt.key} variant="outline" className={`${pt.borderColor} ${pt.color} text-xs gap-1`}>
                        <Icon className="size-3" /> {pt.label}
                      </Badge>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-4">
              {/* Timestamp and Actions Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-3">
                  {/* Product Type Filter Tabs */}
                  <div className="flex flex-wrap gap-2">
                    <button
                      onClick={() => setActiveFilter("all")}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                        activeFilter === "all"
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-card text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                      }`}
                    >
                      All ({sections.length})
                    </button>
                    {PRODUCT_TYPES.filter(pt => generatedTypes.includes(pt.key)).map(pt => {
                      const Icon = pt.icon;
                      const hasSection = sections.some(s => s.key === pt.key);
                      return (
                        <button
                          key={pt.key}
                          onClick={() => hasSection && setActiveFilter(pt.key)}
                          disabled={!hasSection}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border flex items-center gap-1.5 ${
                            activeFilter === pt.key
                              ? `${pt.bgColor} ${pt.color} ${pt.borderColor}`
                              : hasSection
                                ? "bg-card text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                                : "bg-card/50 text-muted-foreground/40 border-border/20 cursor-not-allowed"
                          }`}
                        >
                          <Icon className="size-3.5" /> {pt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {generatedAt && (
                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="size-3" /> {formatDate(generatedAt)}
                    </span>
                  )}
                  {sections.length > 1 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSaveAllClick}
                      disabled={saveMutation.isPending}
                      className="gap-1.5 text-xs border-accent/30 text-accent hover:bg-accent/10"
                    >
                      <SaveAll className="size-3.5" /> Save All ({sections.length})
                    </Button>
                  )}
                </div>
              </div>

              {/* Recipe Content - All view */}
              {activeFilter === "all" ? (
                <div className="space-y-4">
                  {sections.map((section) => {
                    const pt = PRODUCT_TYPES.find(p => p.key === section.key);
                    if (!pt) return null;
                    const Icon = pt.icon;
                    return (
                      <Card key={section.key} className="bg-card border-border/50">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-semibold flex items-center gap-2">
                              <Icon className={`size-4 ${pt.color}`} /> {pt.label} Recipe
                            </CardTitle>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSaveClick(section)}
                              className={`gap-1.5 text-xs ${pt.borderColor} ${pt.color} hover:${pt.bgColor}`}
                            >
                              <BookmarkPlus className="size-3.5" /> Save to Formulas
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="prose prose-sm prose-invert max-w-none [&_table]:w-full [&_table]:border-collapse [&_th]:bg-secondary/50 [&_th]:text-foreground [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:border [&_th]:border-border/30 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:border [&_td]:border-border/30 [&_h3]:text-accent [&_h2]:text-primary [&_strong]:text-foreground">
                            <Streamdown>{section.content}</Streamdown>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              ) : (
                /* Single product view */
                (() => {
                  const section = sections.find(s => s.key === activeFilter);
                  const pt = PRODUCT_TYPES.find(p => p.key === activeFilter);
                  if (!section || !pt) return null;
                  const Icon = pt.icon;
                  return (
                    <Card className="bg-card border-border/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-semibold flex items-center gap-2">
                            <Icon className={`size-4 ${pt.color}`} /> {pt.label} Recipe
                          </CardTitle>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveClick(section)}
                            className={`gap-1.5 text-xs ${pt.borderColor} ${pt.color} hover:${pt.bgColor}`}
                          >
                            <BookmarkPlus className="size-3.5" /> Save to Formulas
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm prose-invert max-w-none [&_table]:w-full [&_table]:border-collapse [&_th]:bg-secondary/50 [&_th]:text-foreground [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:border [&_th]:border-border/30 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:border [&_td]:border-border/30 [&_h3]:text-accent [&_h2]:text-primary [&_strong]:text-foreground">
                          <Streamdown>{section.content}</Streamdown>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })()
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Inspiration */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Lightbulb className="size-4 text-accent" /> Inspiration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {EXAMPLE_CONCEPTS.map((ex, i) => (
                <button
                  key={i}
                  className="w-full text-left p-3 rounded-lg border border-border/30 hover:border-primary/40 hover:bg-secondary/50 transition-all text-sm text-muted-foreground hover:text-foreground leading-relaxed"
                  onClick={() => setConcept(ex)}
                >
                  "{ex.slice(0, 80)}..."
                </button>
              ))}
            </CardContent>
          </Card>

          {/* Recent History (sidebar compact view) */}
          {historyItems.length > 0 && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <History className="size-4 text-primary" /> Recent
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {historyItems.slice(0, 5).map((gen) => {
                  const types = gen.selectedTypes as ProductTypeKey[];
                  const isActive = viewingHistoryId === gen.id;
                  return (
                    <button
                      key={gen.id}
                      onClick={() => handleLoadHistory(gen)}
                      className={`w-full text-left p-2.5 rounded-lg border transition-all ${
                        isActive
                          ? "bg-primary/10 border-primary/30"
                          : "border-border/30 hover:border-primary/30 hover:bg-secondary/40"
                      }`}
                    >
                      <p className="text-xs font-medium text-foreground truncate">
                        {gen.concept.slice(0, 60)}{gen.concept.length > 60 ? "..." : ""}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <Clock className="size-2.5 text-muted-foreground" />
                        <span className="text-[10px] text-muted-foreground">{formatDate(gen.createdAt)}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {types.slice(0, 4).map(t => {
                          const pt = PRODUCT_TYPES.find(p => p.key === t);
                          if (!pt) return null;
                          const Icon = pt.icon;
                          return (
                            <span key={t} className={`${pt.color}`}>
                              <Icon className="size-3" />
                            </span>
                          );
                        })}
                        {types.length > 4 && (
                          <span className="text-[10px] text-muted-foreground">+{types.length - 4}</span>
                        )}
                      </div>
                    </button>
                  );
                })}
                {historyItems.length > 5 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowHistory(true)}
                    className="w-full text-xs text-muted-foreground hover:text-foreground"
                  >
                    View all {historyItems.length} generations
                  </Button>
                )}
              </CardContent>
            </Card>
          )}

          {/* Tips */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground">Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs text-muted-foreground leading-relaxed">
              <p>Select only the product types you need to get more focused, detailed recipes.</p>
              <p>Click <strong className="text-foreground">Save to Formulas</strong> on any recipe, or <strong className="text-foreground">Save All</strong> to add every recipe at once.</p>
              <p>All generations are automatically saved to your history. Click <strong className="text-foreground">History</strong> to reload any past generation.</p>
              <p>The AI matches ingredient names from your library — check the formula builder after saving to verify all ingredients were matched.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save to Formulas Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="size-5 text-primary" /> Save Recipe to Formulas
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              This will create a new formula in your formula list with the ingredients from this recipe. You can edit it further in the Formula Builder.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Formula Name</Label>
              <Input
                value={formulaName}
                onChange={e => setFormulaName(e.target.value)}
                placeholder="Enter a name for this formula..."
                className="bg-background border-border/50"
              />
            </div>
            {savingSection && (
              <div className="p-3 rounded-lg bg-secondary/30 border border-border/30">
                <p className="text-xs text-muted-foreground mb-1">Product Type</p>
                <p className="text-sm text-foreground font-medium">
                  {PRODUCT_TYPES.find(p => p.key === savingSection.key)?.label || savingSection.key}
                </p>
                <p className="text-xs text-muted-foreground mt-2 mb-1">Detected Ingredients</p>
                <p className="text-sm text-foreground">
                  {extractIngredientsFromSection(savingSection.content).length} ingredients found in recipe tables
                </p>
              </div>
            )}
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSaveDialogOpen(false)} className="border-border/50">
                Cancel
              </Button>
              <Button
                onClick={handleSaveConfirm}
                disabled={!formulaName.trim() || saveMutation.isPending}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {saveMutation.isPending ? (
                  <><Loader2 className="size-4 animate-spin" /> Saving...</>
                ) : (
                  <><Save className="size-4" /> Save Formula</>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
