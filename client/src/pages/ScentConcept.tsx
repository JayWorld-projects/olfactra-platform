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
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import {
  Sparkles, Loader2, Lightbulb, Flame, Droplets, Wind,
  Bath, SprayCan, CloudFog, GlassWater, Save, Check, BookmarkPlus,
  History, Trash2, Clock, ChevronRight, SaveAll, Shuffle, Dices
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";
import { useLocation } from "wouter";
import { useWorkspace } from "@/contexts/WorkspaceContext";

type ProductTypeKey = "perfume" | "candle" | "lotion" | "bodywash" | "incense" | "bodyspray" | "humidifier";

const PRODUCT_TYPES: { key: ProductTypeKey; label: string; icon: React.ComponentType<{ className?: string }>; color: string; bgColor: string; borderColor: string; parseKeys: string[] }[] = [
  { key: "perfume", label: "Perfume", icon: Droplets, color: "text-purple-400", bgColor: "bg-purple-400/10", borderColor: "border-purple-400/30", parseKeys: ["perfume", "eau de parfum", "edp"] },
  { key: "candle", label: "Candle", icon: Flame, color: "text-orange-400", bgColor: "bg-orange-400/10", borderColor: "border-orange-400/30", parseKeys: ["candle"] },
  { key: "lotion", label: "Lotion", icon: GlassWater, color: "text-pink-400", bgColor: "bg-pink-400/10", borderColor: "border-pink-400/30", parseKeys: ["lotion", "body cream"] },
  { key: "bodywash", label: "Body Wash", icon: Bath, color: "text-blue-400", bgColor: "bg-blue-400/10", borderColor: "border-blue-400/30", parseKeys: ["bodywash", "body wash", "shower gel", "shower"] },
  { key: "incense", label: "Incense", icon: Wind, color: "text-amber-400", bgColor: "bg-amber-400/10", borderColor: "border-amber-400/30", parseKeys: ["incense"] },
  { key: "bodyspray", label: "Body Spray", icon: SprayCan, color: "text-teal-400", bgColor: "bg-teal-400/10", borderColor: "border-teal-400/30", parseKeys: ["bodyspray", "body spray", "body mist"] },
  { key: "humidifier", label: "Humidifier Oil", icon: CloudFog, color: "text-cyan-400", bgColor: "bg-cyan-400/10", borderColor: "border-cyan-400/30", parseKeys: ["humidifier", "diffuser"] },
];

const INSPIRATION_PROMPTS = [
  // Nature & Outdoors
  "A warm summer evening on a Mediterranean terrace, with jasmine blooming on old stone walls and the faint scent of sea salt in the air.",
  "Walking through a cedar forest after rain, with damp earth, moss-covered bark, and a hint of wild berries.",
  "A fresh spring morning in a Japanese garden with cherry blossoms, green tea, and clean linen drying in the breeze.",
  "Standing at the edge of a Hawaiian waterfall surrounded by tropical flowers, wet volcanic rock, and mist.",
  "A lavender field in Provence at golden hour, warm wind carrying honey and dried herbs.",
  "Deep inside a mossy Pacific Northwest old-growth forest, ferns dripping with morning dew.",
  "A desert oasis at dusk — warm sand, date palms, cool water, and the first stars appearing.",
  "Walking barefoot on a Caribbean beach at sunrise, coconut palms, salt air, and driftwood.",
  "An alpine meadow in full bloom after snowmelt, wildflowers, cold streams, and pine resin.",
  "A misty Scottish highland morning with heather, peat smoke, and wet wool.",
  // Memories & Nostalgia
  "A cozy winter library with leather-bound books, a crackling fireplace, and a cup of spiced chai.",
  "Grandmother's kitchen on Thanksgiving — cinnamon, clove, baked apples, and buttery pie crust.",
  "A childhood summer at the lake house — sunscreen, freshly cut grass, and campfire smoke at dusk.",
  "Christmas morning — fresh pine tree, orange peel, nutmeg, and the warmth of a wool blanket.",
  "The first warm day of spring when you open all the windows — fresh air, clean cotton, and lilac.",
  "A rainy afternoon in a Parisian café — espresso, croissants, old wood, and petrichor from the street.",
  "Late night in a jazz club — bourbon, tobacco leaf, worn velvet, and sandalwood.",
  "Your first apartment — fresh paint, new books, cheap candles, and takeout.",
  "A road trip through the American Southwest — sagebrush, red dust, leather seats, and cold cola.",
  "Saturday morning farmers market — peaches, basil, sourdough bread, and fresh-cut flowers.",
  // Moods & Emotions
  "The feeling of confidence before a big night out — something bold, magnetic, and unforgettable.",
  "Deep relaxation after a spa day — eucalyptus steam, warm stones, and clean skin.",
  "The excitement of falling in love — something intoxicating, warm, slightly reckless.",
  "Quiet solitude on a Sunday morning — soft linen, black coffee, a good book, and rain outside.",
  "The energy of a rooftop party at sunset — champagne, citrus, warm skin, and city lights.",
  "Meditative calm — temple incense, sandalwood, still water, and deep breathing.",
  "Cozy hygge vibes — candlelight, cinnamon rolls, cashmere, and a crackling fire.",
  "Mysterious and seductive — dark plum, oud, black amber, and a whisper of smoke.",
  // Places & Travel
  "A Moroccan souk at midday — saffron, cumin, leather, rose water, and cedar.",
  "A luxury hotel lobby in Dubai — white marble, oud, rose, and chilled champagne.",
  "An Italian lemon grove on the Amalfi Coast — bright citrus, warm stone, and sea breeze.",
  "A Tokyo street at night — green tea, yuzu, clean rain on neon-lit pavement.",
  "An old English garden in June — roses, freshly mowed lawn, and afternoon tea.",
  "A Balinese temple at dawn — frangipani, incense, tropical rain, and warm stone.",
  "New York City in autumn — roasted chestnuts, cold air, concrete, and fallen leaves.",
  "A vineyard in Tuscany during harvest — ripe grapes, sun-warmed earth, and oak barrels.",
  // Abstract & Artistic
  "The color gold translated into scent — warm, luminous, rich, and radiant.",
  "What midnight blue smells like — deep, cool, velvety, with a spark of silver.",
  "A scent inspired by silk — smooth, slightly sweet, with an elegant coolness.",
  "The sound of rain translated into fragrance — fresh, rhythmic, soothing, and green.",
  "A fragrance that captures the feeling of floating in warm water under the stars.",
  "What a perfect sunset smells like — warm amber light fading into cool violet dusk.",
  // Seasonal
  "Peak summer energy — watermelon, sunscreen, hot pavement, and pool water.",
  "Crisp autumn walk — fallen leaves, apple cider, woodsmoke, and cold air.",
  "First snowfall of winter — clean ice, wool scarves, pine needles, and hot chocolate.",
  "Spring awakening — wet soil, hyacinth, fresh rain, and new green leaves.",
];

function getRandomPrompts(count: number): string[] {
  const shuffled = [...INSPIRATION_PROMPTS].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
}

interface ParsedSection {
  key: ProductTypeKey;
  title: string;
  content: string;
  rawContent: string;
}

/**
 * Robust parser that handles various LLM formatting styles:
 * - "## PERFUME", "## 1. PERFUME (Eau de Parfum)", "## PERFUME (Eau de Parfum)"
 * - Numbered headers like "## 1. CANDLE"
 * - Ensures ### sub-headers stay within their parent ## section
 */
function parseProductSections(content: string): ParsedSection[] {
  const sections: ParsedSection[] = [];
  const lines = content.split("\n");
  let currentKey: ProductTypeKey | "" = "";
  let currentTitle = "";
  let currentLines: string[] = [];

  const matchProductType = (headerText: string): ProductTypeKey | null => {
    const cleaned = headerText.toLowerCase()
      .replace(/^\d+\.\s*/, "") // remove leading numbers like "1. "
      .trim();
    for (const pt of PRODUCT_TYPES) {
      if (pt.parseKeys.some(k => cleaned.includes(k) || cleaned.startsWith(k))) {
        return pt.key;
      }
    }
    return null;
  };

  for (const line of lines) {
    // Only match ## headers (not ### or deeper) for section splitting
    const h2Match = line.match(/^##\s+(?!\#)(.*)/);
    if (h2Match) {
      const headerText = h2Match[1].trim();
      const matchedKey = matchProductType(headerText);

      if (matchedKey) {
        // Save previous section if exists
        if (currentKey && currentLines.length > 0) {
          const rawContent = currentLines.join("\n").trim();
          if (rawContent.length > 0) {
            sections.push({ key: currentKey, title: currentTitle, content: rawContent, rawContent: `## ${currentTitle}\n${rawContent}` });
          }
        }
        currentKey = matchedKey;
        currentTitle = headerText;
        currentLines = [];
      } else {
        // Unknown ## header — treat as content within current section
        currentLines.push(line);
      }
    } else {
      currentLines.push(line);
    }
  }

  // Don't forget the last section
  if (currentKey && currentLines.length > 0) {
    const rawContent = currentLines.join("\n").trim();
    if (rawContent.length > 0) {
      sections.push({ key: currentKey, title: currentTitle, content: rawContent, rawContent: `## ${currentTitle}\n${rawContent}` });
    }
  }

  // Deduplicate: if multiple sections have the same key, merge them
  const merged = new Map<ProductTypeKey, ParsedSection>();
  for (const s of sections) {
    if (merged.has(s.key)) {
      const existing = merged.get(s.key)!;
      existing.content += "\n\n" + s.content;
      existing.rawContent += "\n\n" + s.rawContent;
    } else {
      merged.set(s.key, { ...s });
    }
  }

  return Array.from(merged.values());
}

/**
 * Robust ingredient extractor that handles:
 * - Markdown tables with various column names
 * - Bullet lists with "ingredient - Xg" or "ingredient: Xg" patterns
 * - Bold ingredient names
 */
function extractIngredientsFromSection(content: string): { ingredientName: string; weight: string }[] {
  const ingredients: { ingredientName: string; weight: string }[] = [];
  const seen = new Set<string>();
  const lines = content.split("\n");
  let inTable = false;
  let nameCol = -1;
  let weightCol = -1;

  for (const line of lines) {
    const trimmed = line.trim();

    // Table parsing
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed.split("|").filter(c => c.trim() !== "");

      if (!inTable) {
        // Header row — find name and weight columns
        cells.forEach((cell, idx) => {
          const cl = cell.trim().toLowerCase();
          if (cl.includes("ingredient") || cl.includes("material") || cl.includes("name") || cl.includes("component") || cl.includes("fragrance") || cl.includes("raw material")) {
            nameCol = idx;
          }
          if (cl.includes("weight") || cl.includes("amount") || cl.includes("grams") || cl.includes("quantity") || cl.includes("(g)") || cl.includes("g)") || cl.includes("drops")) {
            weightCol = idx;
          }
        });
        inTable = true;
      } else if (trimmed.includes("---") || trimmed.includes(":--")) {
        // Separator row
        continue;
      } else if (nameCol >= 0 && weightCol >= 0 && nameCol < cells.length && weightCol < cells.length) {
        const name = cells[nameCol].trim().replace(/\*\*/g, "").replace(/^\s*\d+\.\s*/, "");
        const weightRaw = cells[weightCol].trim().replace(/[^\d.]/g, "");
        if (name && weightRaw && !isNaN(parseFloat(weightRaw)) && parseFloat(weightRaw) > 0) {
          // Skip total/sum rows
          const nameLower = name.toLowerCase();
          if (!nameLower.includes("total") && !nameLower.includes("sum") && !nameLower.includes("concentrate")) {
            const key = name.toLowerCase();
            if (!seen.has(key)) {
              seen.add(key);
              ingredients.push({ ingredientName: name, weight: weightRaw });
            }
          }
        }
      }
    } else {
      if (inTable) {
        inTable = false;
        nameCol = -1;
        weightCol = -1;
      }

      // Bullet list parsing as fallback: "- Ingredient Name: 2.5g" or "* Ingredient: 2.5 g"
      const bulletMatch = trimmed.match(/^[-*]\s+\*?\*?(.+?)\*?\*?\s*[:–—-]\s*(\d+\.?\d*)\s*(?:g|grams?|drops?|ml)/i);
      if (bulletMatch) {
        const name = bulletMatch[1].trim().replace(/\*\*/g, "");
        const weight = bulletMatch[2];
        const nameLower = name.toLowerCase();
        if (!nameLower.includes("total") && !nameLower.includes("sum") && !seen.has(nameLower)) {
          seen.add(nameLower);
          ingredients.push({ ingredientName: name, weight });
        }
      }
    }
  }
  return ingredients;
}

function formatDate(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleString(undefined, {
    month: "short", day: "numeric", year: "numeric",
    hour: "numeric", minute: "2-digit", hour12: true,
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
  const [inspirationPrompts, setInspirationPrompts] = useState<string[]>(() => getRandomPrompts(4));

  const shufflePrompts = useCallback(() => {
    setInspirationPrompts(getRandomPrompts(4));
  }, []);
  const [, navigate] = useLocation();
  const { activeWorkspaceId } = useWorkspace();
  const { data: workspacesList } = trpc.workspace.list.useQuery();

  const utils = trpc.useUtils();

  const historyQuery = trpc.formula.generationHistory.useQuery(undefined, { staleTime: 30_000 });

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
      toast.success(`Formula saved with ${data.addedCount} of ${data.totalRequested} ingredients matched.`);
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
      toast.success("Generation deleted.");
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

  const deselectAll = useCallback(() => {
    // Keep at least one selected
    setSelectedTypes(new Set([PRODUCT_TYPES[0].key]));
  }, []);

  const handleGenerate = () => {
    if (!concept.trim()) { toast.error("Please describe a scent concept first."); return; }
    if (selectedTypes.size === 0) { toast.error("Select at least one product type."); return; }
    setResult(null);
    setActiveFilter("all");
    setViewingHistoryId(null);
    scentMutation.mutate({
      concept: concept.trim(),
      selectedTypes: Array.from(selectedTypes),
      ...(activeWorkspaceId ? { workspaceId: activeWorkspaceId } : {}),
    });
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

  // Filter sections based on active filter
  const visibleSections = useMemo(() => {
    if (activeFilter === "all") return sections;
    return sections.filter(s => s.key === activeFilter);
  }, [sections, activeFilter]);

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
      toast.error("Could not extract ingredients. You can add them manually after saving.");
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
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Scent Lab</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Describe a memory, place, or feeling. Select product types, then generate recipes from your ingredient library.
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
              Click any past generation to reload it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {historyItems.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">No history yet. Generate your first recipe above!</p>
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
                Be descriptive — include sensory details, emotions, settings, or scent references.
                {activeWorkspaceId && workspacesList && (
                  <span className="block mt-1 text-primary text-xs">
                    Using workspace: {workspacesList.find(w => w.id === activeWorkspaceId)?.name}
                  </span>
                )}
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
                  <div className="flex gap-2">
                    <button onClick={selectAll} className="text-xs text-primary hover:text-primary/80 transition-colors">
                      All
                    </button>
                    <span className="text-xs text-muted-foreground/40">|</span>
                    <button onClick={deselectAll} className="text-xs text-muted-foreground hover:text-foreground transition-colors">
                      Reset
                    </button>
                  </div>
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
                <div className="size-16 rounded-full border-2 border-primary/20 flex items-center justify-center">
                  <Loader2 className="size-8 text-primary animate-spin" />
                </div>
                <div className="text-center space-y-1">
                  <p className="text-foreground font-medium">Crafting your recipes...</p>
                  <p className="text-muted-foreground text-sm">This may take up to 2 minutes for multiple product types</p>
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
          {result && !scentMutation.isPending && (
            <div className="space-y-4">
              {/* Filter Bar */}
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex flex-wrap gap-1.5">
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
                  {sections.map(section => {
                    const pt = PRODUCT_TYPES.find(p => p.key === section.key);
                    if (!pt) return null;
                    const Icon = pt.icon;
                    const ingredientCount = extractIngredientsFromSection(section.content).length;
                    return (
                      <button
                        key={section.key}
                        onClick={() => setActiveFilter(section.key)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border flex items-center gap-1.5 ${
                          activeFilter === section.key
                            ? `${pt.bgColor} ${pt.color} ${pt.borderColor}`
                            : "bg-card text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                        }`}
                      >
                        <Icon className="size-3.5" /> {pt.label}
                        {ingredientCount > 0 && (
                          <span className="text-[10px] opacity-60">({ingredientCount})</span>
                        )}
                      </button>
                    );
                  })}
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

              {/* Recipe Cards */}
              {visibleSections.length === 0 && (
                <Card className="bg-card border-border/50">
                  <CardContent className="py-8 text-center">
                    <p className="text-muted-foreground text-sm">No recipes found for this filter. Try selecting "All" to see all generated recipes.</p>
                  </CardContent>
                </Card>
              )}

              <div className="space-y-4">
                {visibleSections.map((section) => {
                  const pt = PRODUCT_TYPES.find(p => p.key === section.key);
                  if (!pt) return null;
                  const Icon = pt.icon;
                  const ingredientCount = extractIngredientsFromSection(section.content).length;
                  return (
                    <Card key={section.key} className="bg-card border-border/50">
                      <CardHeader className="pb-3">
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <div className={`size-8 rounded-lg ${pt.bgColor} flex items-center justify-center shrink-0`}>
                              <Icon className={`size-4 ${pt.color}`} />
                            </div>
                            <div className="min-w-0">
                              <CardTitle className="text-base font-semibold">{pt.label} Recipe</CardTitle>
                              <p className="text-xs text-muted-foreground">
                                {ingredientCount > 0 ? `${ingredientCount} ingredients detected` : "Review recipe below"}
                              </p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSaveClick(section)}
                            className={`gap-1.5 text-xs ${pt.borderColor} ${pt.color} hover:${pt.bgColor} shrink-0`}
                          >
                            <BookmarkPlus className="size-3.5" /> Save
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="prose prose-sm prose-invert max-w-none [&_table]:w-full [&_table]:border-collapse [&_th]:bg-secondary/50 [&_th]:text-foreground [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:border [&_th]:border-border/30 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:border [&_td]:border-border/30 [&_h3]:text-accent [&_strong]:text-foreground">
                          <Streamdown>{section.content}</Streamdown>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Inspiration */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base font-semibold flex items-center gap-2">
                  <Dices className="size-4 text-accent" /> Inspiration
                </CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={shufflePrompts}
                  className="gap-1.5 text-xs text-muted-foreground hover:text-accent h-7 px-2"
                >
                  <Shuffle className="size-3.5" /> Shuffle
                </Button>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Click any prompt to use it, or shuffle for new ideas.</p>
            </CardHeader>
            <CardContent className="space-y-2">
              {inspirationPrompts.map((prompt, i) => (
                <button
                  key={`${prompt.slice(0, 20)}-${i}`}
                  className="w-full text-left p-3 rounded-lg border border-border/30 hover:border-accent/40 hover:bg-accent/5 transition-all text-sm text-muted-foreground hover:text-foreground leading-relaxed group"
                  onClick={() => setConcept(prompt)}
                >
                  <span className="line-clamp-3">"{prompt}"</span>
                </button>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={shufflePrompts}
                className="w-full gap-1.5 text-xs border-border/30 text-muted-foreground hover:text-accent hover:border-accent/40 mt-1"
              >
                <Shuffle className="size-3.5" /> Show Me More Ideas
              </Button>
            </CardContent>
          </Card>

          {/* Recent History */}
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
              <p>Select only the product types you need for faster, more focused recipes.</p>
              <p>Click <strong className="text-foreground">Save</strong> on any recipe to add it to your formulas, or <strong className="text-foreground">Save All</strong> for the entire batch.</p>
              <p>Use the filter tabs to view one product type at a time after generation.</p>
              <p>All generations are auto-saved to History for later retrieval.</p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Save Dialog */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent className="bg-card border-border/50">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Save className="size-5 text-primary" /> Save Recipe to Formulas
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Create a new formula from this recipe. You can edit it in the Formula Builder after saving.
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
                  {extractIngredientsFromSection(savingSection.content).length} ingredients found
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
