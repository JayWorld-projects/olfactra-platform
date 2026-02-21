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
import { BookOpen, Plus, Search, X } from "lucide-react";
import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function Library() {
  const { loading } = useAuth();
  const navItems = useNavItems();
  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <DashboardLayout navItems={navItems} currentPath="/library" title="JayLabs Perfumery Studio">
      <LibraryContent />
    </DashboardLayout>
  );
}

function LibraryContent() {
  const [, setLocation] = useLocation();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showAddDialog, setShowAddDialog] = useState(false);

  const { data: ingredientsList, isLoading } = trpc.ingredient.list.useQuery({});
  const { data: categories } = trpc.ingredient.categories.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.ingredient.create.useMutation({
    onSuccess: () => {
      utils.ingredient.list.invalidate();
      utils.ingredient.categories.invalidate();
      setShowAddDialog(false);
      toast.success("Ingredient added");
    },
  });

  const filtered = useMemo(() => {
    if (!ingredientsList) return [];
    return ingredientsList.filter(i => {
      const matchSearch = !search || i.name.toLowerCase().includes(search.toLowerCase());
      const matchCategory = categoryFilter === "all" || i.category === categoryFilter;
      return matchSearch && matchCategory;
    });
  }, [ingredientsList, search, categoryFilter]);

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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-serif font-bold">Raw Materials Library</h2>
          <p className="text-sm text-muted-foreground">{filtered.length} of {ingredientsList?.length ?? 0} ingredients</p>
        </div>
        <Button onClick={() => setShowAddDialog(true)}>
          <Plus className="size-4" /> Add Ingredient
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            placeholder="Search ingredients..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="size-4 text-muted-foreground" />
            </button>
          )}
        </div>
        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            {categories?.map(c => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="pt-4 space-y-3">
                <div className="h-5 bg-muted rounded w-3/4" />
                <div className="h-4 bg-muted rounded w-1/2" />
                <div className="h-3 bg-muted rounded w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card className="py-12">
          <CardContent className="flex flex-col items-center gap-3 text-center">
            <BookOpen className="size-10 text-muted-foreground" />
            <p className="text-muted-foreground">
              {ingredientsList?.length === 0
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
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => setLocation(`/library/${ingredient.id}`)}
            >
              <CardContent className="pt-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm leading-tight line-clamp-2">{ingredient.name}</h3>
                  {ingredient.category && (
                    <Badge variant="secondary" className="shrink-0 text-[10px]">
                      {ingredient.category}
                    </Badge>
                  )}
                </div>
                {ingredient.casNumber && (
                  <p className="text-xs text-muted-foreground truncate">{ingredient.casNumber}</p>
                )}
                <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  {ingredient.supplier && <span>Supplier: {ingredient.supplier}</span>}
                  {ingredient.inventoryAmount && <span>Stock: {ingredient.inventoryAmount}</span>}
                  {ingredient.costPerGram && <span>${ingredient.costPerGram}/g</span>}
                </div>
                <div className="flex items-center gap-2">
                  {ingredient.longevity != null && (
                    <Badge variant="outline" className="text-[10px]">
                      {LONGEVITY_LABELS[ingredient.longevity] || `Level ${ingredient.longevity}`}
                    </Badge>
                  )}
                  {ingredient.ifraLimit && (
                    <span className="text-[10px] text-muted-foreground">IFRA: {ingredient.ifraLimit}%</span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add Ingredient</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={formData.name} onChange={e => setFormData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CAS / Botanical</Label>
                <Input value={formData.casNumber} onChange={e => setFormData(p => ({ ...p, casNumber: e.target.value }))} />
              </div>
              <div>
                <Label>Supplier</Label>
                <Input value={formData.supplier} onChange={e => setFormData(p => ({ ...p, supplier: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input value={formData.category} onChange={e => setFormData(p => ({ ...p, category: e.target.value }))} />
              </div>
              <div>
                <Label>Inventory Amount</Label>
                <Input value={formData.inventoryAmount} onChange={e => setFormData(p => ({ ...p, inventoryAmount: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Cost/gram ($)</Label>
                <Input type="number" step="0.001" value={formData.costPerGram} onChange={e => setFormData(p => ({ ...p, costPerGram: e.target.value }))} />
              </div>
              <div>
                <Label>IFRA Limit (%)</Label>
                <Input type="number" step="0.001" value={formData.ifraLimit} onChange={e => setFormData(p => ({ ...p, ifraLimit: e.target.value }))} />
              </div>
              <div>
                <Label>Longevity (0-5)</Label>
                <Input type="number" min={0} max={5} value={formData.longevity} onChange={e => setFormData(p => ({ ...p, longevity: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAdd} disabled={!formData.name || createMutation.isPending}>
              {createMutation.isPending ? "Adding..." : "Add Ingredient"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
