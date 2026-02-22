import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, GitCompareArrows, Check, Minus, Equal } from "lucide-react";
import { useLocation, useParams } from "wouter";
import { useMemo } from "react";
import { LONGEVITY_LABELS, CATEGORY_COLORS } from "@shared/perfumery";

export default function FormulaCompare() {
  const { loading } = useAuth();
  const navItems = useNavItems();
  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <DashboardLayout navItems={navItems} currentPath="/formulas" title="Olfactra">
      <FormulaCompareContent />
    </DashboardLayout>
  );
}

interface FormulaIngredientItem {
  id: number;
  ingredientId: number;
  weight: string;
  dilutionPercent: string | null;
  note: string | null;
  ingredient: {
    id: number;
    name: string;
    category: string | null;
    longevity: number | null;
    casNumber: string | null;
    ifraLimit: string | null;
  } | null;
}

function FormulaCompareContent() {
  const [, setLocation] = useLocation();
  const params = useParams<{ idA: string; idB: string }>();
  const idA = parseInt(params.idA || "0");
  const idB = parseInt(params.idB || "0");

  const { data, isLoading } = trpc.formula.compare.useQuery(
    { formulaIdA: idA, formulaIdB: idB },
    { enabled: idA > 0 && idB > 0 }
  );

  const analysis = useMemo(() => {
    if (!data) return null;

    const ingredientsA = data.formulaA.ingredients as FormulaIngredientItem[];
    const ingredientsB = data.formulaB.ingredients as FormulaIngredientItem[];

    const mapA = new Map(ingredientsA.map(i => [i.ingredientId, i]));
    const mapB = new Map(ingredientsB.map(i => [i.ingredientId, i]));

    const allIngredientIds = Array.from(new Set([...Array.from(mapA.keys()), ...Array.from(mapB.keys())]));

    const shared: { id: number; name: string; category: string | null; longevity: number | null; weightA: string; weightB: string; pctA: number; pctB: number }[] = [];
    const onlyA: { id: number; name: string; category: string | null; longevity: number | null; weight: string; pct: number }[] = [];
    const onlyB: { id: number; name: string; category: string | null; longevity: number | null; weight: string; pct: number }[] = [];

    const totalWeightA = ingredientsA.reduce((sum, i) => sum + parseFloat(i.weight || "0"), 0);
    const totalWeightB = ingredientsB.reduce((sum, i) => sum + parseFloat(i.weight || "0"), 0);

    for (const ingId of Array.from(allIngredientIds)) {
      const inA = mapA.get(ingId);
      const inB = mapB.get(ingId);
      const name = inA?.ingredient?.name || inB?.ingredient?.name || "Unknown";
      const category = inA?.ingredient?.category || inB?.ingredient?.category || null;
      const longevity = inA?.ingredient?.longevity ?? inB?.ingredient?.longevity ?? null;

      if (inA && inB) {
        shared.push({
          id: ingId,
          name,
          category,
          longevity,
          weightA: inA.weight,
          weightB: inB.weight,
          pctA: totalWeightA > 0 ? (parseFloat(inA.weight) / totalWeightA) * 100 : 0,
          pctB: totalWeightB > 0 ? (parseFloat(inB.weight) / totalWeightB) * 100 : 0,
        });
      } else if (inA) {
        onlyA.push({
          id: ingId,
          name,
          category,
          longevity,
          weight: inA.weight,
          pct: totalWeightA > 0 ? (parseFloat(inA.weight) / totalWeightA) * 100 : 0,
        });
      } else if (inB) {
        onlyB.push({
          id: ingId,
          name,
          category,
          longevity,
          weight: inB.weight,
          pct: totalWeightB > 0 ? (parseFloat(inB.weight) / totalWeightB) * 100 : 0,
        });
      }
    }

    // Category breakdown
    const categoriesA: Record<string, number> = {};
    const categoriesB: Record<string, number> = {};
    ingredientsA.forEach(i => {
      const cat = i.ingredient?.category || "Uncategorized";
      categoriesA[cat] = (categoriesA[cat] || 0) + parseFloat(i.weight || "0");
    });
    ingredientsB.forEach(i => {
      const cat = i.ingredient?.category || "Uncategorized";
      categoriesB[cat] = (categoriesB[cat] || 0) + parseFloat(i.weight || "0");
    });
    const allCategories = Array.from(new Set([...Object.keys(categoriesA), ...Object.keys(categoriesB)])).sort();

    return {
      shared: shared.sort((a, b) => a.name.localeCompare(b.name)),
      onlyA: onlyA.sort((a, b) => a.name.localeCompare(b.name)),
      onlyB: onlyB.sort((a, b) => a.name.localeCompare(b.name)),
      totalWeightA,
      totalWeightB,
      countA: ingredientsA.length,
      countB: ingredientsB.length,
      categoriesA,
      categoriesB,
      allCategories,
    };
  }, [data]);

  if (isLoading) {
    return <ComparisonSkeleton />;
  }

  if (!data || !analysis) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setLocation("/formulas")} className="text-muted-foreground">
          <ArrowLeft className="size-4" /> Back to Formulas
        </Button>
        <Card className="py-16 bg-card border-border/50">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <p className="text-muted-foreground">One or both formulas could not be found.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const { formulaA, formulaB } = data;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/formulas")} className="text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
        </Button>
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2.5">
            <GitCompareArrows className="size-5 text-accent" /> Formula Comparison
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Comparing <span className="text-primary font-medium">{formulaA.name}</span> vs <span className="text-primary font-medium">{formulaB.name}</span>
          </p>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="bg-card border-primary/20 shadow-sm">
          <CardContent className="pt-5 pb-5">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Formula A</p>
            <h3 className="font-serif font-bold text-foreground text-lg leading-tight">{formulaA.name}</h3>
            <div className="flex gap-4 mt-3 text-sm text-muted-foreground">
              <span>{analysis.countA} ingredients</span>
              <span className="text-primary font-medium">{analysis.totalWeightA.toFixed(3)}g</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-accent/20 shadow-sm">
          <CardContent className="pt-5 pb-5 text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Overlap</p>
            <div className="text-3xl font-bold text-accent">{analysis.shared.length}</div>
            <p className="text-sm text-muted-foreground mt-1.5">shared ingredients</p>
            <div className="flex justify-center gap-5 mt-3 text-sm">
              <span className="text-primary">{analysis.onlyA.length} unique to A</span>
              <span className="text-primary">{analysis.onlyB.length} unique to B</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-primary/20 shadow-sm">
          <CardContent className="pt-5 pb-5 text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-1.5">Formula B</p>
            <h3 className="font-serif font-bold text-foreground text-lg leading-tight">{formulaB.name}</h3>
            <div className="flex gap-4 mt-3 text-sm text-muted-foreground justify-end">
              <span>{analysis.countB} ingredients</span>
              <span className="text-primary font-medium">{analysis.totalWeightB.toFixed(3)}g</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Shared Ingredients */}
      {analysis.shared.length > 0 && (
        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="font-serif text-lg flex items-center gap-2.5">
              <Equal className="size-5 text-accent" /> Shared Ingredients ({analysis.shared.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-2">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/50">
                    <th className="text-left py-2.5 pr-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">Ingredient</th>
                    <th className="text-left py-2.5 pr-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">Category</th>
                    <th className="text-left py-2.5 pr-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">Longevity</th>
                    <th className="text-right py-2.5 pr-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">Weight A</th>
                    <th className="text-right py-2.5 pr-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">% A</th>
                    <th className="text-right py-2.5 pr-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">Weight B</th>
                    <th className="text-right py-2.5 pr-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">% B</th>
                    <th className="text-right py-2.5 text-xs text-muted-foreground uppercase tracking-wider font-medium">Diff</th>
                  </tr>
                </thead>
                <tbody>
                  {analysis.shared.map(item => {
                    const wA = parseFloat(item.weightA);
                    const wB = parseFloat(item.weightB);
                    const diff = wB - wA;
                    const diffPct = wA > 0 ? ((diff / wA) * 100) : 0;
                    return (
                      <tr key={item.id} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                        <td className="py-3 pr-4 font-medium text-foreground">{item.name}</td>
                        <td className="py-3 pr-4">
                          {item.category && (
                            <Badge variant="outline" className="text-xs" style={{
                              borderColor: (CATEGORY_COLORS as Record<string, string>)[item.category] || "#666",
                              color: (CATEGORY_COLORS as Record<string, string>)[item.category] || "#666",
                            }}>
                              {item.category}
                            </Badge>
                          )}
                        </td>
                        <td className="py-3 pr-4 text-sm text-muted-foreground">
                          {item.longevity !== null ? (LONGEVITY_LABELS as Record<number, string>)[item.longevity] || `${item.longevity}/5` : "—"}
                        </td>
                        <td className="py-3 pr-4 text-right font-mono text-sm tabular-nums">{wA.toFixed(3)}g</td>
                        <td className="py-3 pr-4 text-right font-mono text-sm tabular-nums text-muted-foreground">{item.pctA.toFixed(1)}%</td>
                        <td className="py-3 pr-4 text-right font-mono text-sm tabular-nums">{wB.toFixed(3)}g</td>
                        <td className="py-3 pr-4 text-right font-mono text-sm tabular-nums text-muted-foreground">{item.pctB.toFixed(1)}%</td>
                        <td className="py-3 text-right font-mono text-sm tabular-nums">
                          <span className={diff > 0 ? "text-green-600 dark:text-green-400" : diff < 0 ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}>
                            {diff > 0 ? "+" : ""}{diff.toFixed(3)}g
                            {wA > 0 && diff !== 0 && (
                              <span className="text-xs ml-1 opacity-70">({diffPct > 0 ? "+" : ""}{diffPct.toFixed(0)}%)</span>
                            )}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Unique Ingredients Side by Side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Only in A */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="font-serif text-base flex items-center gap-2">
              <Minus className="size-4 text-red-500 dark:text-red-400" /> Only in {formulaA.name} ({analysis.onlyA.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {analysis.onlyA.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No unique ingredients</p>
            ) : (
              <div className="space-y-0.5">
                {analysis.onlyA.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      {item.category && (
                        <Badge variant="outline" className="text-xs" style={{
                          borderColor: (CATEGORY_COLORS as Record<string, string>)[item.category] || "#666",
                          color: (CATEGORY_COLORS as Record<string, string>)[item.category] || "#666",
                        }}>
                          {item.category}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-mono tabular-nums text-muted-foreground">
                      {parseFloat(item.weight).toFixed(3)}g <span className="text-xs opacity-70">({item.pct.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Only in B */}
        <Card className="bg-card border-border/50 shadow-sm">
          <CardHeader className="pb-3 pt-5">
            <CardTitle className="font-serif text-base flex items-center gap-2">
              <Check className="size-4 text-green-500 dark:text-green-400" /> Only in {formulaB.name} ({analysis.onlyB.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="pb-3">
            {analysis.onlyB.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">No unique ingredients</p>
            ) : (
              <div className="space-y-0.5">
                {analysis.onlyB.map(item => (
                  <div key={item.id} className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-secondary/30 transition-colors">
                    <div className="flex items-center gap-2.5">
                      <span className="text-sm font-medium text-foreground">{item.name}</span>
                      {item.category && (
                        <Badge variant="outline" className="text-xs" style={{
                          borderColor: (CATEGORY_COLORS as Record<string, string>)[item.category] || "#666",
                          color: (CATEGORY_COLORS as Record<string, string>)[item.category] || "#666",
                        }}>
                          {item.category}
                        </Badge>
                      )}
                    </div>
                    <div className="text-sm font-mono tabular-nums text-muted-foreground">
                      {parseFloat(item.weight).toFixed(3)}g <span className="text-xs opacity-70">({item.pct.toFixed(1)}%)</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Category Comparison */}
      <Card className="bg-card border-border/50 shadow-sm">
        <CardHeader className="pb-3 pt-5">
          <CardTitle className="font-serif text-lg">Category Breakdown Comparison</CardTitle>
        </CardHeader>
        <CardContent className="pb-2">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/50">
                  <th className="text-left py-2.5 pr-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">Category</th>
                  <th className="text-right py-2.5 pr-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">{formulaA.name} (g)</th>
                  <th className="text-right py-2.5 pr-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">%</th>
                  <th className="py-2.5 px-4 text-center text-xs text-muted-foreground uppercase tracking-wider font-medium">Visual</th>
                  <th className="text-right py-2.5 pr-4 text-xs text-muted-foreground uppercase tracking-wider font-medium">{formulaB.name} (g)</th>
                  <th className="text-right py-2.5 text-xs text-muted-foreground uppercase tracking-wider font-medium">%</th>
                </tr>
              </thead>
              <tbody>
                {analysis.allCategories.map(cat => {
                  const wA = analysis.categoriesA[cat] || 0;
                  const wB = analysis.categoriesB[cat] || 0;
                  const pctA = analysis.totalWeightA > 0 ? (wA / analysis.totalWeightA) * 100 : 0;
                  const pctB = analysis.totalWeightB > 0 ? (wB / analysis.totalWeightB) * 100 : 0;
                  const maxPct = Math.max(pctA, pctB, 1);
                  const color = (CATEGORY_COLORS as Record<string, string>)[cat] || "#888";

                  return (
                    <tr key={cat} className="border-b border-border/30 hover:bg-secondary/30 transition-colors">
                      <td className="py-3 pr-4 font-medium text-foreground">{cat}</td>
                      <td className="py-3 pr-4 text-right font-mono text-sm tabular-nums">{wA > 0 ? wA.toFixed(3) : "—"}</td>
                      <td className="py-3 pr-4 text-right font-mono text-sm tabular-nums text-muted-foreground">{wA > 0 ? pctA.toFixed(1) + "%" : "—"}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-1.5 h-5">
                          <div className="flex-1 flex justify-end">
                            <div
                              className="h-3.5 rounded-l-sm"
                              style={{ width: `${(pctA / maxPct) * 100}%`, backgroundColor: color, opacity: 0.65, minWidth: wA > 0 ? "4px" : "0" }}
                            />
                          </div>
                          <div className="w-px h-5 bg-border shrink-0" />
                          <div className="flex-1">
                            <div
                              className="h-3.5 rounded-r-sm"
                              style={{ width: `${(pctB / maxPct) * 100}%`, backgroundColor: color, opacity: 0.65, minWidth: wB > 0 ? "4px" : "0" }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="py-3 pr-4 text-right font-mono text-sm tabular-nums">{wB > 0 ? wB.toFixed(3) : "—"}</td>
                      <td className="py-3 text-right font-mono text-sm tabular-nums text-muted-foreground">{wB > 0 ? pctB.toFixed(1) + "%" : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Layout-matched loading skeleton for the Formula Comparison page.
 * Mirrors: header → 3 summary cards → shared ingredients table → unique ingredients side-by-side.
 */
function ComparisonSkeleton() {
  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Skeleton className="size-8 rounded-lg shrink-0" />
        <div className="space-y-2">
          <Skeleton className="h-7 w-52 rounded-lg" />
          <Skeleton className="h-4 w-72 rounded-md" />
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
            <Skeleton className="h-3 w-20 rounded" />
            <Skeleton className="h-5 w-40 rounded-md" />
            <div className="flex gap-4">
              <Skeleton className="h-3 w-24 rounded" />
              <Skeleton className="h-3 w-16 rounded" />
            </div>
          </div>
        ))}
      </div>

      {/* Shared ingredients table */}
      <div className="rounded-xl border border-border/50 bg-card">
        <div className="p-5 pb-3">
          <Skeleton className="h-5 w-48 rounded-md" />
        </div>
        <div className="border-t border-border/40 px-5 py-2.5 flex gap-6">
          <Skeleton className="h-3 w-28 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
          <Skeleton className="h-3 w-12 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="border-t border-border/20 px-5 py-3.5 flex items-center gap-6">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-4 w-14 rounded-full" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="h-4 w-16 rounded" />
            <Skeleton className="h-4 w-12 rounded" />
            <Skeleton className="h-4 w-20 rounded" />
          </div>
        ))}
      </div>

      {/* Unique ingredients side-by-side */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <div key={i} className="rounded-xl border border-border/50 bg-card p-5 space-y-3">
            <Skeleton className="h-5 w-44 rounded-md" />
            {Array.from({ length: 3 }).map((_, j) => (
              <div key={j} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-2">
                  <Skeleton className="h-4 w-28 rounded" />
                  <Skeleton className="h-4 w-14 rounded-full" />
                </div>
                <Skeleton className="h-4 w-20 rounded" />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
