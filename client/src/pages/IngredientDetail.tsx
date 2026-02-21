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
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import { LONGEVITY_LABELS } from "@shared/perfumery";
import { ArrowLeft, Edit, Trash2, Sparkles, Loader2, Star } from "lucide-react";
import { useState } from "react";
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

function DetailContent() {
  const [, setLocation] = useLocation();
  const params = useParams<{ id: string }>();
  const ingredientId = parseInt(params.id || "0");
  const [showEdit, setShowEdit] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
  const [aiContent, setAiContent] = useState<string | null>(null);

  const { data: ingredient, isLoading } = trpc.ingredient.get.useQuery({ id: ingredientId });
  const { data: usage } = trpc.ingredient.usage.useQuery({ id: ingredientId });
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

  const aiInfoMutation = trpc.ingredient.aiInfo.useMutation({
    onSuccess: (data) => setAiContent(data.content as string),
  });

  const updateMutation = trpc.ingredient.update.useMutation({
    onSuccess: () => {
      utils.ingredient.get.invalidate({ id: ingredientId });
      setShowEdit(false);
      toast.success("Ingredient updated");
    },
  });

  const [editData, setEditData] = useState<Record<string, any>>({});

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

  const properties = [
    { label: "Category", value: ingredient.category },
    { label: "Supplier", value: ingredient.supplier },
    { label: "Inventory", value: ingredient.inventoryAmount },
    { label: "Cost per Gram", value: ingredient.costPerGram ? `$${ingredient.costPerGram}` : null },
    { label: "IFRA Limit", value: ingredient.ifraLimit ? `${ingredient.ifraLimit}%` : null },
  ];

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/library")} className="hover:bg-secondary">
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-serif font-bold text-foreground">{ingredient.name}</h2>
          {ingredient.casNumber && <p className="text-sm text-muted-foreground font-mono">{ingredient.casNumber}</p>}
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
        {/* Left column */}
        <div className="lg:col-span-2 space-y-5">
          {/* Properties */}
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold">Properties</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-5 text-sm">
                {properties.map(p => (
                  <div key={p.label}>
                    <span className="text-muted-foreground block text-xs mb-1">{p.label}</span>
                    <span className="font-medium text-foreground">{p.value || "—"}</span>
                  </div>
                ))}
                <div>
                  <span className="text-muted-foreground block text-xs mb-1">Longevity</span>
                  <Badge variant="outline" className="text-xs border-primary/30 text-primary">
                    {ingredient.longevity != null ? LONGEVITY_LABELS[ingredient.longevity] || `Level ${ingredient.longevity}` : "—"}
                  </Badge>
                </div>
              </div>
              {ingredient.description && (
                <>
                  <Separator className="my-4 bg-border/50" />
                  <div>
                    <span className="text-muted-foreground block text-xs mb-1.5">Description</span>
                    <p className="text-sm whitespace-pre-wrap text-foreground leading-relaxed">{ingredient.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Usage */}
          {usage && usage.length > 0 && (
            <Card className="bg-card border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold">Usage in Formulas</CardTitle>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50">
                      <TableHead className="text-muted-foreground">Formula</TableHead>
                      <TableHead className="text-right text-muted-foreground">Weight (g)</TableHead>
                      <TableHead className="text-right text-muted-foreground">Dilution</TableHead>
                      <TableHead className="text-right text-muted-foreground">Concentration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usage.map((u: any) => {
                      const totalW = parseFloat(u.formulaTotalWeight || "0");
                      const w = parseFloat(u.weight || "0");
                      const conc = totalW > 0 ? ((w / totalW) * 100).toFixed(2) : "—";
                      return (
                        <TableRow key={u.formulaIngredientId} className="cursor-pointer hover:bg-secondary/50 border-border/30" onClick={() => setLocation(`/formulas/${u.formulaId}`)}>
                          <TableCell className="font-medium text-foreground">{u.formulaName}</TableCell>
                          <TableCell className="text-right tabular-nums">{parseFloat(u.weight).toFixed(3)}</TableCell>
                          <TableCell className="text-right tabular-nums">{u.dilutionPercent}%</TableCell>
                          <TableCell className="text-right tabular-nums text-accent font-medium">{conc}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right column — AI Info */}
        <div className="space-y-4">
          <Card className="bg-card border-border/50">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <Sparkles className="size-4 text-accent" /> AI Ingredient Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiContent ? (
                <div className="prose prose-sm prose-invert max-w-none text-sm">
                  <Streamdown>{aiContent}</Streamdown>
                </div>
              ) : (
                <div className="text-center space-y-4 py-2">
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Get detailed information about this ingredient including safety data, olfactory profile, and blending suggestions.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => aiInfoMutation.mutate({ ingredientName: ingredient.name, casNumber: ingredient.casNumber || undefined })}
                    disabled={aiInfoMutation.isPending}
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    {aiInfoMutation.isPending ? (
                      <><Loader2 className="size-3.5 animate-spin" /> Fetching...</>
                    ) : (
                      <><Sparkles className="size-3.5" /> Get AI Info</>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Dialog */}
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
              <Input className="mt-1.5 bg-background border-border/50" value={editData.description || ""} onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} />
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

      {/* Delete Dialog */}
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
