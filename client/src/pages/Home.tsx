import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Beaker, BookOpen, FlaskConical, Import, Sparkles, LogIn, Droplets, ArrowRight, Layers } from "lucide-react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: <Droplets className="size-4" /> },
  { label: "Library", href: "/library", icon: <BookOpen className="size-4" /> },
  { label: "Formulas", href: "/formulas", icon: <FlaskConical className="size-4" /> },
  { label: "Scent Lab", href: "/concept", icon: <Sparkles className="size-4" /> },
  { label: "Workspaces", href: "/workspaces", icon: <Layers className="size-4" /> },
  { label: "Import", href: "/import", icon: <Import className="size-4" /> },
];

export function useNavItems() {
  return NAV_ITEMS;
}

export default function Home() {
  const { user, loading, isAuthenticated } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) return <DashboardLayoutSkeleton />;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4">
        <div className="max-w-lg text-center space-y-6">
          <div className="flex justify-center">
            <div className="size-16 rounded-2xl bg-primary/15 flex items-center justify-center ring-1 ring-primary/20">
              <Droplets className="size-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">Olfactra</h1>
          <p className="text-muted-foreground text-base leading-relaxed">
            Composing fragrance. Manage raw materials, build formulas, and explore scent concepts with AI assistance.
          </p>
          <Button
            size="lg"
            onClick={() => { window.location.href = getLoginUrl(); }}
            className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20"
          >
            <LogIn className="size-4" />
            Sign In to Get Started
          </Button>
        </div>
      </div>
    );
  }

  return (
    <DashboardLayout
      navItems={NAV_ITEMS}
      currentPath="/"
      title="Olfactra"
      subtitle="Dashboard"
    >
      <DashboardContent />
    </DashboardLayout>
  );
}

function DashboardContent() {
  const [, setLocation] = useLocation();
  const { data: ingredientsList } = trpc.ingredient.list.useQuery({});
  const { data: formulasList } = trpc.formula.list.useQuery();
  const { data: categories } = trpc.ingredient.categories.useQuery();

  const totalIngredients = ingredientsList?.length ?? 0;
  const totalFormulas = formulasList?.length ?? 0;
  const totalCategories = categories?.length ?? 0;

  const longevityDist: Record<number, number> = {};
  ingredientsList?.forEach(i => {
    const l = i.longevity ?? -1;
    if (l >= 0) longevityDist[l] = (longevityDist[l] || 0) + 1;
  });

  const categoryDist: Record<string, number> = {};
  ingredientsList?.forEach(i => {
    const c = i.category?.trim() || "Uncategorized";
    categoryDist[c] = (categoryDist[c] || 0) + 1;
  });

  const topCategories = Object.entries(categoryDist).sort((a, b) => b[1] - a[1]).slice(0, 8);

  const statCards = [
    { label: "Raw Materials", value: totalIngredients, sub: "ingredients in your library", href: "/library", icon: <BookOpen className="size-5" /> },
    { label: "Formulas", value: totalFormulas, sub: "formulas created", href: "/formulas", icon: <FlaskConical className="size-5" /> },
    { label: "Categories", value: totalCategories, sub: "scent families", href: "/library", icon: <Beaker className="size-5" /> },
  ];

  const quickActions = [
    { label: "Import Materials", sub: "Upload CSV/TSV ingredient lists", href: "/import", icon: <Import className="size-5 text-primary" /> },
    { label: "Create Formula", sub: "Build a new fragrance formula", href: "/formulas", icon: <FlaskConical className="size-5 text-accent" /> },
    { label: "Scent Lab", sub: "Describe a concept, get formula suggestions", href: "/concept", icon: <Sparkles className="size-5 text-accent" /> },
  ];

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-serif font-bold text-foreground">Welcome back</h2>
        <p className="text-muted-foreground mt-1 text-sm">Here is an overview of your perfumery workspace.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {statCards.map(card => (
          <Card
            key={card.label}
            className="cursor-pointer group hover:border-primary/40 transition-all bg-card border-border/50"
            onClick={() => setLocation(card.href)}
          >
            <CardContent className="p-5">
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">{card.label}</p>
                  <p className="text-3xl font-bold text-foreground mt-1">{card.value}</p>
                  <p className="text-xs text-muted-foreground mt-1">{card.sub}</p>
                </div>
                <div className="size-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary/20 transition-colors">
                  {card.icon}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Actions + Top Categories */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Quick Actions */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {quickActions.map(action => (
              <button
                key={action.label}
                onClick={() => setLocation(action.href)}
                className="flex items-center gap-4 w-full rounded-xl p-3 hover:bg-secondary/70 transition-colors text-left group"
              >
                <div className="size-10 rounded-lg bg-secondary flex items-center justify-center shrink-0">
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground">{action.label}</p>
                  <p className="text-xs text-muted-foreground">{action.sub}</p>
                </div>
                <ArrowRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </CardContent>
        </Card>

        {/* Top Categories */}
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ingredients yet. Import your library to get started.</p>
            ) : (
              <div className="space-y-3">
                {topCategories.map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-28 truncate text-foreground">{cat}</span>
                    <div className="flex-1 bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${(count / totalIngredients) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right tabular-nums">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Longevity Distribution */}
      {totalIngredients > 0 && Object.keys(longevityDist).length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-semibold">Longevity Distribution</CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">Substantivity levels across your library (0 = most volatile, 5 = base note)</p>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-3 h-36">
              {[0, 1, 2, 3, 4, 5].map(level => {
                const count = longevityDist[level] || 0;
                const maxCount = Math.max(...Object.values(longevityDist), 1);
                const height = (count / maxCount) * 100;
                const labels = ["Volatile", "Top", "Top-Heart", "Heart", "Heart-Base", "Base"];
                return (
                  <div key={level} className="flex-1 flex flex-col items-center gap-1.5">
                    <span className="text-xs font-medium text-muted-foreground tabular-nums">{count}</span>
                    <div className="w-full rounded-t-md overflow-hidden" style={{ height: `${Math.max(height, 6)}%` }}>
                      <div className="w-full h-full bg-gradient-to-t from-primary/80 to-primary/40 rounded-t-md" />
                    </div>
                    <span className="text-[11px] text-muted-foreground text-center leading-tight">{labels[level]}</span>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
