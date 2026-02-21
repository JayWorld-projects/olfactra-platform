import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import { LONGEVITY_LABELS } from "@shared/perfumery";
import { BookOpen, Plus, Search, X, Star, Package, Check, Undo2, Layers } from "lucide-react";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useState, useMemo, useCallback } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Library() {
  const { loading } = useAuth();
  const navItems = useNavItems();
  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <DashboardLayout navItems={navItems} currentPath="/library" title="Olfactra">
      <LibraryContent />
    </DashboardLayout>
  );
}

function LibraryContent() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [batchEdits, setBatchEdits] = useState<Record<number, string>>({});
  const [showFavorites, setShowFavorites] = useState(false);

  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
  const { data: ingredientsList, isLoading } = trpc.ingredient.list.useQuery({});
  const { data: categories } = trpc.ingredient.categories.useQuery();
  const { data: favoriteIds } = trpc.ingredient.favorites.useQuery();
  const { data: workspaceIngredientIds } = trpc.workspace.get.useQuery(
    { id: activeWorkspaceId! },
    { enabled: !!activeWorkspaceId }
  );
  const { data: workspacesList } = trpc.workspace.list.useQuery();
  const utils = trpc.useUtils();

  // Filter ingredients by active workspace
  const workspaceFilteredIngredients = useMemo(() => {
    if (!ingredientsList) return [];
    if (!activeWorkspaceId || !workspaceIngredientIds) return ingredientsList;
    const wsIds = new Set(workspaceIngredientIds.ingredientIds);
    return ingredientsList.filter(i => wsIds.has(i.id));
  }, [ingredientsList, activeWorkspaceId, workspaceIngredientIds]);

  const createMutation = trpc.ingredient.create.useMutation({
    onSuccess: () => {
      utils.ingredient.list.invalidate();
      utils.ingredient.categories.invalidate();
      setShowAddDialog(false);
      toast.success("Ingredient added");
    },
  });

  const addFavMutation = trpc.ingredient.addFavorite.useMutation({
    onSuccess: () => utils.ingredient.favorites.invalidate(),
  });

  const removeFavMutation = trpc.ingredient.removeFavorite.useMutation({
    onSuccess: () => utils.ingredient.favorites.invalidate(),
  });

  const batchUpdateMutation = trpc.ingredient.batchUpdateInventory.useMutation({
    onSuccess: () => {
      utils.ingredient.list.invalidate();
      setBatchMode(false);
      setBatchEdits({});
      toast.success("Inventory updated successfully");
    },
    onError: () => toast.error("Failed to update inventory"),
  });

  const favSet = useMemo(() => new Set(favoriteIds || []), [favoriteIds]);

  const toggleFavorite = useCallback((e: React.MouseEvent, ingredientId: number) => {
    e.stopPropagation();
    if (favSet.has(ingredientId)) {
      removeFavMutation.mutate({ ingredientId });
    } else {
      addFavMutation.mutate({ ingredientId });
    }
  }, [favSet, addFavMutation, removeFavMutation]);

  const filtered = useMemo(() => {
    if (!workspaceFilteredIngredients) return [];
    return workspaceFilteredIngredients.filter(i => {
      const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || i.category === categoryFilter;
      const matchFav = !showFavorites || favSet.has(i.id);
      return matchSearch && matchCategory && matchFav;
    });
  }, [workspaceFilteredIngredients, search, categoryFilter, showFavorites, favSet]);

  const favoriteIngredients = useMemo(() => {
    if (!workspaceFilteredIngredients || !favoriteIds) return [];
    return workspaceFilteredIngredients.filter(i => favSet.has(i.id));
  }, [workspaceFilteredIngredients, favoriteIds, favSet]);

  const handleBatchSave = () => {
    const updates = Object.entries(batchEdits).map(([id, inventoryAmount]) => ({
      id: parseInt(id),
      inventoryAmount,
    }));
    if (updates.length === 0) {
      toast.info("No changes to save");
      return;
    }
    batchUpdateMutation.mutate({ updates });
  };

  const [formData, setFormData] = useState({
    name: "", casNumber: "", supplier: "", category: "",
    inventoryAmount: "", costPerGram: "", ifraLimit: "", longevity: 2, description: "",
  });

  const handleAdd = () => {
    createMutation.mutate({
      ...formData,
      costPerGram: formData.costPerGram || undefined,
      ifraLimit: formData.ifraLimit || undefined,
    });
  };

  const changedCount = Object.keys(batchEdits).length;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Raw Materials Library</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            {filtered.length} of {workspaceFilteredIngredients.length} ingredients
            {activeWorkspaceId && workspacesList ? (
              <span className="text-primary"> in {workspacesList.find(w => w.id === activeWorkspaceId)?.name}</span>
            ) : null}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {batchMode ? (
            <>
              <Button variant="outline" onClick={() => { setBatchMode(false); setBatchEdits({}); }} className="border-border/50">
                <Undo2 className="size-4" /> Cancel
              </Button>
              <Button onClick={handleBatchSave} disabled={changedCount === 0 || batchUpdateMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                <Check className="size-4" /> Save {changedCount > 0 ? `(${changedCount})` : ""}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setBatchMode(true)} className="border-border/50">
                <Package className="size-4" /> Batch Update
              </Button>
              <Button onClick={() => setShowAddDialog(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                <Plus className="size-4" /> Add Ingredient
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Batch Mode Banner */}
      {batchMode && (
        <Card className="border-accent/50 bg-accent/5">
          <CardContent className="py-3 flex items-center gap-3">
            <Package className="size-5 text-accent shrink-0" />
            <div>
              <p className="text-sm font-medium text-foreground">Batch Inventory Update Mode</p>
              <p className="text-xs text-muted-foreground">Edit stock quantities directly on each card, then click Save to apply all changes at once.</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Favorites Quick Access */}
      {!batchMode && favoriteIngredients.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <Star className="size-4 text-accent fill-accent" />
            <h3 className="text-sm font-semibold text-foreground">Favorites</h3>
            <span className="text-xs text-muted-foreground">({favoriteIngredients.length})</span>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
            {favoriteIngredients.map(ingredient => (
              <button
                key={ingredient.id}
                onClick={() => setLocation(`/library/${ingredient.id}`)}
                className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-card border border-border/50 hover:border-primary/40 transition-all text-left"
              >
                <Star className="size-3.5 text-accent fill-accent shrink-0" />
                <div>
                  <p className="text-xs font-medium text-foreground truncate max-w-[140px]">{ingredient.name}</p>
                  <p className="text-[10px] text-muted-foreground">{ingredient.category || "Uncategorized"}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Workspace indicator */}
      {activeWorkspaceId && workspacesList && (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-primary/10 border border-primary/20">
          <Layers className="size-4 text-primary shrink-0" />
          <span className="text-sm text-foreground">
            Workspace: <strong>{workspacesList.find(w => w.id === activeWorkspaceId)?.name}</strong>
            <span className="text-muted-foreground ml-1">({workspaceFilteredIngredients.length} ingredients)</span>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveWorkspaceId(null)}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground h-7"
          >
            <X className="size-3.5 mr-1" /> Show All
          </Button>
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search ingredients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-10 bg-card border-border/50"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="size-4 text-muted-foreground hover:text-foreground" />
            </button>
          )}
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px] bg-card border-border/50">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          variant={showFavorites ? "default" : "outline"}
          onClick={() => setShowFavorites(!showFavorites)}
          className={showFavorites ? "bg-accent hover:bg-accent/90 text-accent-foreground" : "border-border/50"}
        >
          <Star className={`size-4 ${showFavorites ? "fill-current" : ""}`} />
          {showFavorites ? "Showing Favorites" : "Favorites"}
        </Button>
      </div>

      {/* Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse bg-card border-border/50">
              <CardContent className="pt-4 space-y-3">
                <div className="h-5 bg-secondary rounded w-3/4" />
                <div className="h-4 bg-secondary rounded w-1/2" />
                <div className="h-3 bg-secondary rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-16 bg-card border-border/50">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <div className="size-12 rounded-xl bg-secondary flex items-center justify-center">
              <BookOpen className="size-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">
              {showFavorites
                ? "No favorite ingredients yet. Star ingredients to add them here."
                : ingredientsList?.length === 0
                  ? "Your library is empty. Import ingredients or add them manually."
                  : "No ingredients match your search."}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {filtered.map(ingredient => (
            <Card
              key={ingredient.id}
              className={`group hover:border-primary/40 transition-all bg-card border-border/50 ${batchMode ? "" : "cursor-pointer"}`}
              onClick={() => !batchMode && setLocation(`/library/${ingredient.id}`)}
            >
              <CardContent className="pt-4 pb-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2 text-foreground group-hover:text-primary transition-colors">{ingredient.name}</h3>
                  <div className="flex items-center gap-1 shrink-0">
                    {!batchMode && (
                      <button
                        onClick={(e) => toggleFavorite(e, ingredient.id)}
                        className="p-1 rounded hover:bg-secondary transition-colors"
                        title={favSet.has(ingredient.id) ? "Remove from favorites" : "Add to favorites"}
                      >
                        <Star className={`size-4 ${favSet.has(ingredient.id) ? "text-accent fill-accent" : "text-muted-foreground hover:text-accent"}`} />
                      </button>
                    )}
                    {ingredient.category && (
                      <Badge variant="secondary" className="text-[11px] bg-secondary text-secondary-foreground border-0">
                        {ingredient.category}
                      </Badge>
                    )}
                  </div>
                </div>
                {ingredient.casNumber && (
                  <p className="text-xs text-muted-foreground truncate font-mono">{ingredient.casNumber}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {ingredient.supplier && <span>Supplier: {ingredient.supplier}</span>}
                  {batchMode ? (
                    <div className="flex items-center gap-1.5" onClick={e => e.stopPropagation()}>
                      <span className="text-accent font-medium">Stock:</span>
                      <Input
                        value={batchEdits[ingredient.id] ?? ingredient.inventoryAmount ?? ""}
                        onChange={e => {
                          const val = e.target.value;
                          setBatchEdits(prev => {
                            const next = { ...prev };
                            if (val === (ingredient.inventoryAmount ?? "")) {
                              delete next[ingredient.id];
                            } else {
                              next[ingredient.id] = val;
                            }
                            return next;
                          });
                        }}
                        className="h-7 w-24 text-xs bg-background border-accent/30 focus:border-accent"
                      />
                    </div>
                  ) : (
                    ingredient.inventoryAmount && <span>Stock: {ingredient.inventoryAmount}</span>
                  )}
                  {ingredient.costPerGram && <span className="text-accent font-medium">${ingredient.costPerGram}/g</span>}
                </div>
                <div className="flex items-center gap-2">
                  {ingredient.longevity != null && (
                    <Badge variant="outline" className="text-[11px] border-primary/30 text-primary">
                      {LONGEVITY_LABELS[ingredient.longevity] || `Level ${ingredient.longevity}`}
                    </Badge>
                  )}
                  {ingredient.ifraLimit && (
                    <span className="text-[11px] text-muted-foreground">IFRA: {ingredient.ifraLimit}%</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto bg-card">
          <DialogHeader>
            <DialogTitle className="font-serif">Add Ingredient</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="text-sm">Name *</Label>
              <Input className="mt-1.5 bg-background border-border/50" value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">CAS / Botanical</Label>
                <Input className="mt-1.5 bg-background border-border/50" value={formData.casNumber} onChange={e => setFormData(p => ({ ...p, casNumber: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Supplier</Label>
                <Input className="mt-1.5 bg-background border-border/50" value={formData.supplier} onChange={e => setFormData(p => ({ ...p, supplier: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-sm">Category</Label>
                <Input className="mt-1.5 bg-background border-border/50" value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Inventory Amount</Label>
                <Input className="mt-1.5 bg-background border-border/50" value={formData.inventoryAmount} onChange={e => setFormData(p => ({ ...p, inventoryAmount: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label className="text-sm">Cost/gram ($)</Label>
                <Input className="mt-1.5 bg-background border-border/50" type="number" step="0.001" value={formData.costPerGram} onChange={e => setFormData(p => ({ ...p, costPerGram: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">IFRA Limit (%)</Label>
                <Input className="mt-1.5 bg-background border-border/50" type="number" step="0.001" value={formData.ifraLimit} onChange={e => setFormData(p => ({ ...p, ifraLimit: e.target.value }))} />
              </div>
              <div>
                <Label className="text-sm">Longevity (0-5)</Label>
                <Input className="mt-1.5 bg-background border-border/50" type="number" min={0} max={5} value={formData.longevity} onChange={e => setFormData(p => ({ ...p, longevity: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input className="mt-1.5 bg-background border-border/50" value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!formData.name || createMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {createMutation.isPending ? "Adding..." : "Add Ingredient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
