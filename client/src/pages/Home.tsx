import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getLoginUrl } from "@/const";
import { trpc } from "@/lib/trpc";
import { Beaker, BookOpen, FlaskConical, Import, Sparkles, LogIn, Droplets } from "lucide-react";
import { useLocation } from "wouter";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";

const NAV_ITEMS = [
  { label: "Dashboard", href: "/", icon: <Droplets className="size-4" /> },
  { label: "Library", href: "/library", icon: <BookOpen className="size-4" /> },
  { label: "Formulas", href: "/formulas", icon: <FlaskConical className="size-4" /> },
  { label: "Scent Lab", href: "/concept", icon: <Sparkles className="size-4" /> },
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
            <div className="size-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <Droplets className="size-8 text-primary" />
            </div>
          </div>
          <h1 className="text-3xl font-serif font-bold text-foreground">JayLabs Perfumery Studio</h1>
          <p className="text-muted-foreground text-lg">
            Your personal perfumery workbench. Manage raw materials, build formulas, and explore scent concepts with AI assistance.
          </p>
          <Button size="lg" onClick={() => { window.location.href = getLoginUrl(); }}>
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
      title="JayLabs Perfumery Studio"
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

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-foreground">Welcome back</h2>
        <p className="text-muted-foreground mt-1">Here is an overview of your perfumery workspace.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/library")}>
          <CardHeader className="pb-2">
            <CardDescription>Raw Materials</CardDescription>
            <CardTitle className="text-3xl">{totalIngredients}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">ingredients in your library</p>
          </CardContent>
        </Card>
        <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setLocation("/formulas")}>
          <CardHeader className="pb-2">
            <CardDescription>Formulas</CardDescription>
            <CardTitle className="text-3xl">{totalFormulas}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">formulas created</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Categories</CardDescription>
            <CardTitle className="text-3xl">{totalCategories}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">scent families in library</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Top Categories</CardTitle>
          </CardHeader>
          <CardContent>
            {topCategories.length === 0 ? (
              <p className="text-sm text-muted-foreground">No ingredients yet. Import your library to get started.</p>
            ) : (
              <div className="space-y-3">
                {topCategories.map(([cat, count]) => (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-32 truncate">{cat}</span>
                    <div className="flex-1 bg-muted rounded-full h-2.5 overflow-hidden">
                      <div
                        className="bg-primary h-full rounded-full transition-all"
                        style={{ width: `${(count / totalIngredients) * 100}%` }}
                      />
                    </div>
                    <span className="text-sm text-muted-foreground w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Quick Actions</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-3">
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => setLocation("/import")}>
              <Import className="size-4 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-medium">Import Materials</div>
                <div className="text-xs text-muted-foreground">Upload CSV/TSV ingredient lists</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => setLocation("/formulas")}>
              <FlaskConical className="size-4 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-medium">Create Formula</div>
                <div className="text-xs text-muted-foreground">Build a new fragrance formula</div>
              </div>
            </Button>
            <Button variant="outline" className="justify-start h-auto py-3" onClick={() => setLocation("/concept")}>
              <Sparkles className="size-4 mr-3 text-primary" />
              <div className="text-left">
                <div className="font-medium">Scent Lab</div>
                <div className="text-xs text-muted-foreground">Describe a concept, get formula suggestions</div>
              </div>
            </Button>
          </CardContent>
        </Card>
      </div>

      {totalIngredients > 0 && Object.keys(longevityDist).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Longevity Distribution</CardTitle>
            <CardDescription>Substantivity levels across your library (0 = most volatile, 5 = base note)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-2 h-32">
              {[0, 1, 2, 3, 4, 5].map(level => {
                const count = longevityDist[level] || 0;
                const maxCount = Math.max(...Object.values(longevityDist), 1);
                const height = (count / maxCount) * 100;
                const labels = ["Volatile", "Top", "Top-Heart", "Heart", "Heart-Base", "Base"];
                return (
                  <div key={level} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-xs font-medium text-muted-foreground">{count}</span>
                    <div className="w-full bg-muted rounded-t" style={{ height: `${Math.max(height, 4)}%` }}>
                      <div className="w-full h-full bg-primary/70 rounded-t" />
                    </div>
                    <span className="text-[10px] text-muted-foreground text-center leading-tight">{labels[level]}</span>
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
