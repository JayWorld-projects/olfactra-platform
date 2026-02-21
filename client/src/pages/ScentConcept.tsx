import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import {
  Sparkles, Loader2, Lightbulb, Flame, Droplets, Wind,
  Bath, SprayCan, CloudFog, GlassWater
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const PRODUCT_TYPES = [
  { key: "perfume", label: "Perfume", icon: Droplets, color: "text-purple-400", bgColor: "bg-purple-400/10", borderColor: "border-purple-400/30" },
  { key: "candle", label: "Candle", icon: Flame, color: "text-orange-400", bgColor: "bg-orange-400/10", borderColor: "border-orange-400/30" },
  { key: "lotion", label: "Lotion", icon: GlassWater, color: "text-pink-400", bgColor: "bg-pink-400/10", borderColor: "border-pink-400/30" },
  { key: "body wash", label: "Body Wash", icon: Bath, color: "text-blue-400", bgColor: "bg-blue-400/10", borderColor: "border-blue-400/30" },
  { key: "incense", label: "Incense", icon: Wind, color: "text-amber-400", bgColor: "bg-amber-400/10", borderColor: "border-amber-400/30" },
  { key: "body spray", label: "Body Spray", icon: SprayCan, color: "text-teal-400", bgColor: "bg-teal-400/10", borderColor: "border-teal-400/30" },
  { key: "humidifier", label: "Humidifier Oil", icon: CloudFog, color: "text-cyan-400", bgColor: "bg-cyan-400/10", borderColor: "border-cyan-400/30" },
] as const;

const EXAMPLE_CONCEPTS = [
  "A warm summer evening on a Mediterranean terrace, with jasmine blooming on old stone walls and the faint scent of sea salt in the air.",
  "Walking through a cedar forest after rain, with damp earth, moss-covered bark, and a hint of wild berries.",
  "A cozy winter library with leather-bound books, a crackling fireplace, and a cup of spiced chai.",
  "A fresh spring morning in a Japanese garden with cherry blossoms, green tea, and clean linen drying in the breeze.",
];

function parseProductSections(content: string): { key: string; content: string }[] {
  const sections: { key: string; content: string }[] = [];
  const lines = content.split("\n");
  let currentKey = "";
  let currentLines: string[] = [];

  for (const line of lines) {
    const headerMatch = line.match(/^##\s*\d*\.?\s*(.*)/i);
    if (headerMatch) {
      if (currentKey && currentLines.length > 0) {
        sections.push({ key: currentKey, content: currentLines.join("\n").trim() });
      }
      const headerText = headerMatch[1].toLowerCase();
      if (headerText.includes("perfume") || headerText.includes("eau de")) {
        currentKey = "perfume";
      } else if (headerText.includes("candle")) {
        currentKey = "candle";
      } else if (headerText.includes("lotion") || headerText.includes("body cream")) {
        currentKey = "lotion";
      } else if (headerText.includes("body wash") || headerText.includes("shower")) {
        currentKey = "body wash";
      } else if (headerText.includes("incense")) {
        currentKey = "incense";
      } else if (headerText.includes("body spray") || headerText.includes("body mist")) {
        currentKey = "body spray";
      } else if (headerText.includes("humidifier") || headerText.includes("diffuser")) {
        currentKey = "humidifier";
      } else {
        currentKey = headerText;
      }
      currentLines = [];
    } else {
      currentLines.push(line);
    }
  }
  if (currentKey && currentLines.length > 0) {
    sections.push({ key: currentKey, content: currentLines.join("\n").trim() });
  }
  return sections;
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
  const [activeProduct, setActiveProduct] = useState<string>("all");

  const scentMutation = trpc.formula.scentConcept.useMutation({
    onSuccess: (data) => {
      setResult(data.content as string);
      setActiveProduct("all");
    },
    onError: () => toast.error("Failed to generate recipes. Please try again."),
  });

  const handleGenerate = () => {
    if (!concept.trim()) { toast.error("Please describe a scent concept first."); return; }
    setResult(null);
    setActiveProduct("all");
    scentMutation.mutate({ concept: concept.trim() });
  };

  const sections = useMemo(() => result ? parseProductSections(result) : [], [result]);

  const filteredContent = useMemo(() => {
    if (!result || activeProduct === "all") return result;
    const section = sections.find(s => s.key === activeProduct);
    return section?.content || result;
  }, [result, activeProduct, sections]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-foreground">Scent Lab</h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Describe a memory, place, or feeling and get complete recipes for perfume, candles, lotions, body wash, incense, body sprays, and humidifier oils — all from your ingredient library.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Concept Input */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-accent" /> Describe Your Scent Concept
              </CardTitle>
              <CardDescription className="text-muted-foreground">
                Be as descriptive as possible. You'll receive recipes for 7 different product types.
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
              <Button
                onClick={handleGenerate}
                disabled={scentMutation.isPending || !concept.trim()}
                className="w-full sm:w-auto bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {scentMutation.isPending ? (
                  <><Loader2 className="size-4 animate-spin" /> Generating All Recipes...</>
                ) : (
                  <><Sparkles className="size-4" /> Generate 7 Product Recipes</>
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
                  <p className="text-muted-foreground text-sm">Generating formulas for all 7 product types from your library</p>
                </div>
                <div className="flex flex-wrap justify-center gap-2 mt-2">
                  {PRODUCT_TYPES.map(pt => {
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
              {/* Product Type Filter Tabs */}
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setActiveProduct("all")}
                  className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border ${
                    activeProduct === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-card text-muted-foreground border-border/50 hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  All Recipes
                </button>
                {PRODUCT_TYPES.map(pt => {
                  const Icon = pt.icon;
                  const hasSection = sections.some(s => s.key === pt.key);
                  return (
                    <button
                      key={pt.key}
                      onClick={() => setActiveProduct(pt.key)}
                      disabled={!hasSection}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all border flex items-center gap-1.5 ${
                        activeProduct === pt.key
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

              {/* Recipe Content */}
              <Card className="bg-card border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base font-semibold flex items-center gap-2">
                    {activeProduct === "all" ? (
                      <>
                        <Sparkles className="size-4 text-accent" /> Complete Recipe Collection
                        <Badge variant="outline" className="text-xs border-accent/30 text-accent ml-auto">
                          {sections.length} product types
                        </Badge>
                      </>
                    ) : (
                      (() => {
                        const pt = PRODUCT_TYPES.find(p => p.key === activeProduct);
                        if (!pt) return null;
                        const Icon = pt.icon;
                        return <><Icon className={`size-4 ${pt.color}`} /> {pt.label} Recipe</>;
                      })()
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="prose prose-sm prose-invert max-w-none [&_table]:w-full [&_table]:border-collapse [&_th]:bg-secondary/50 [&_th]:text-foreground [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_th]:text-xs [&_th]:font-semibold [&_th]:border [&_th]:border-border/30 [&_td]:px-3 [&_td]:py-2 [&_td]:text-sm [&_td]:border [&_td]:border-border/30 [&_h3]:text-accent [&_h2]:text-primary [&_strong]:text-foreground">
                    <Streamdown>{filteredContent || ""}</Streamdown>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Product Types Legend */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Recipe Types</CardTitle>
              <CardDescription className="text-muted-foreground text-xs">
                Each concept generates recipes for all 7 product types
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-1.5">
              {PRODUCT_TYPES.map(pt => {
                const Icon = pt.icon;
                return (
                  <div key={pt.key} className={`flex items-center gap-2.5 p-2 rounded-lg ${pt.bgColor}`}>
                    <Icon className={`size-4 ${pt.color} shrink-0`} />
                    <span className="text-sm text-foreground">{pt.label}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>

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
        </div>
      </div>
    </div>
  );
}
