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
import {
  Sparkles, Music, Save, FlaskConical, Loader2, Trash2,
  Clock, Leaf, ChevronDown, ChevronUp, BookOpen, Plus, ArrowRight,
} from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

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

function AccordBuilderContent() {
  const [, setLocation] = useLocation();
  const [prompt, setPrompt] = useState("");
  const [variationCount, setVariationCount] = useState(3);
  const [generatedAccords, setGeneratedAccords] = useState<GeneratedAccord[]>([]);
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [totalWeight, setTotalWeight] = useState("10");

  const savedAccords = trpc.accord.list.useQuery();
  const generateMutation = trpc.accord.generate.useMutation({
    onSuccess: (data) => {
      setGeneratedAccords(data.accords || []);
      // Auto-expand all generated cards
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

  const handleSave = (accord: GeneratedAccord) => {
    saveMutation.mutate({
      name: accord.name,
      description: accord.description,
      scentFamily: accord.scentFamily,
      estimatedLongevity: accord.estimatedLongevity,
      explanation: accord.explanation,
      ingredients: accord.ingredients.map((i) => ({
        ingredientId: i.ingredientId,
        percentage: i.percentage,
      })),
    });
  };

  const handleSendToFormula = (accord: GeneratedAccord | SavedAccord) => {
    const ingredients = accord.ingredients.map((i: any) => ({
      ingredientId: i.ingredientId,
      percentage: i.percentage,
    }));
    sendToFormulaMutation.mutate({
      name: accord.name,
      description: accord.description || undefined,
      ingredients,
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
                  <AccordCard
                    key={index}
                    accord={accord}
                    index={index}
                    expanded={expandedCards.has(index)}
                    onToggle={() => toggleCard(index)}
                    onSave={() => handleSave(accord)}
                    onSendToFormula={() => handleSendToFormula(accord)}
                    saving={saveMutation.isPending}
                    sending={sendToFormulaMutation.isPending}
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
                  onSendToFormula={() => handleSendToFormula(accord)}
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

/* ─── Accord Card (Generated) ─── */
function AccordCard({
  accord,
  index,
  expanded,
  onToggle,
  onSave,
  onSendToFormula,
  saving,
  sending,
}: {
  accord: GeneratedAccord;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  onSave: () => void;
  onSendToFormula: () => void;
  saving: boolean;
  sending: boolean;
}) {
  return (
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
          {/* Ingredients Table */}
          <div className="mt-4">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">Ingredients</h4>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Ingredient</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {accord.ingredients.map((ing, i) => (
                    <tr key={i} className="border-t">
                      <td className="px-3 py-2 text-foreground">{ing.name}</td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">{parseFloat(ing.percentage).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
  onSendToFormula: () => void;
  deleting: boolean;
  sending: boolean;
  totalWeight: string;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="overflow-hidden">
      <div
        className="flex items-center justify-between px-5 py-3.5 cursor-pointer hover:bg-accent/30 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="min-w-0">
            <h3 className="font-medium text-foreground truncate">{accord.name}</h3>
            <p className="text-xs text-muted-foreground">
              {accord.ingredients.length} ingredients
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

          {/* Ingredients Table */}
          <div className="mt-2">
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Ingredient</th>
                    <th className="text-left px-3 py-2 font-medium text-muted-foreground">Category</th>
                    <th className="text-right px-3 py-2 font-medium text-muted-foreground w-24">Percentage</th>
                  </tr>
                </thead>
                <tbody>
                  {accord.ingredients.map((ing) => (
                    <tr key={ing.id} className="border-t">
                      <td className="px-3 py-2 text-foreground">{ing.ingredientName || `Ingredient #${ing.ingredientId}`}</td>
                      <td className="px-3 py-2 text-muted-foreground text-xs">{ing.ingredientCategory || "—"}</td>
                      <td className="px-3 py-2 text-right font-mono text-foreground">{parseFloat(ing.percentage).toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
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
            <Button size="sm" onClick={onSendToFormula} disabled={sending} className="bg-primary hover:bg-primary/90">
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
  );
}
