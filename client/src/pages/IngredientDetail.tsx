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
import { ArrowLeft, Edit, Trash2, Sparkles, Loader2 } from "lucide-react";
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
    <DashboardLayout navItems={navItems} currentPath="/library" title="JayLabs Perfumery Studio">
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
  const utils = trpc.useUtils();

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
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
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

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => setLocation("/library")}>
          <ArrowLeft className="size-4" />
        </Button>
        <div className="flex-1">
          <h2 className="text-xl font-serif font-bold">{ingredient.name}</h2>
          {ingredient.casNumber && <p className="text-sm text-muted-foreground">{ingredient.casNumber}</p>}
        </div>
        <Button variant="outline" size="sm" onClick={openEdit}>
          <Edit className="size-3.5" /> Edit
        </Button>
        <Button variant="outline" size="sm" className="text-destructive" onClick={() => setShowDelete(true)}>
          <Trash2 className="size-3.5" />
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Properties</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground block text-xs">Category</span>
                  <span className="font-medium">{ingredient.category || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Supplier</span>
                  <span className="font-medium">{ingredient.supplier || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Inventory</span>
                  <span className="font-medium">{ingredient.inventoryAmount || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Cost per Gram</span>
                  <span className="font-medium">{ingredient.costPerGram ? `$${ingredient.costPerGram}` : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">IFRA Limit</span>
                  <span className="font-medium">{ingredient.ifraLimit ? `${ingredient.ifraLimit}%` : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-xs">Longevity</span>
                  <Badge variant="outline" className="text-xs">
                    {ingredient.longevity != null ? LONGEVITY_LABELS[ingredient.longevity] || `Level ${ingredient.longevity}` : "—"}
                  </Badge>
                </div>
              </div>
              {ingredient.description && (
                <>
                  <Separator className="my-4" />
                  <div>
                    <span className="text-muted-foreground block text-xs mb-1">Description</span>
                    <p className="text-sm whitespace-pre-wrap">{ingredient.description}</p>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {usage && usage.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Usage in Formulas</CardTitle></CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Formula</TableHead>
                      <TableHead className="text-right">Weight (g)</TableHead>
                      <TableHead className="text-right">Dilution</TableHead>
                      <TableHead className="text-right">Concentration</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usage.map((u: any) => {
                      const totalW = parseFloat(u.formulaTotalWeight || "0");
                      const w = parseFloat(u.weight || "0");
                      const conc = totalW > 0 ? ((w / totalW) * 100).toFixed(2) : "—";
                      return (
                        <TableRow key={u.formulaIngredientId} className="cursor-pointer" onClick={() => setLocation(`/formulas/${u.formulaId}`)}>
                          <TableCell className="font-medium">{u.formulaName}</TableCell>
                          <TableCell className="text-right">{parseFloat(u.weight).toFixed(3)}</TableCell>
                          <TableCell className="text-right">{u.dilutionPercent}%</TableCell>
                          <TableCell className="text-right">{conc}%</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> AI Ingredient Info
              </CardTitle>
            </CardHeader>
            <CardContent>
              {aiContent ? (
                <div className="prose prose-sm max-w-none text-sm">
                  <Streamdown>{aiContent}</Streamdown>
                </div>
              ) : (
                <div className="text-center space-y-3">
                  <p className="text-sm text-muted-foreground">
                    Get detailed information about this ingredient including safety data, olfactory profile, and blending suggestions.
                  </p>
                  <Button
                    size="sm"
                    onClick={() => aiInfoMutation.mutate({ ingredientName: ingredient.name, casNumber: ingredient.casNumber || undefined })}
                    disabled={aiInfoMutation.isPending}
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

      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Ingredient</DialogTitle></DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Name *</Label>
              <Input value={editData.name || ""} onChange={e => setEditData(p => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>CAS / Botanical</Label>
                <Input value={editData.casNumber || ""} onChange={e => setEditData(p => ({ ...p, casNumber: e.target.value }))} />
              </div>
              <div>
                <Label>Supplier</Label>
                <Input value={editData.supplier || ""} onChange={e => setEditData(p => ({ ...p, supplier: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Category</Label>
                <Input value={editData.category || ""} onChange={e => setEditData(p => ({ ...p, category: e.target.value }))} />
              </div>
              <div>
                <Label>Inventory Amount</Label>
                <Input value={editData.inventoryAmount || ""} onChange={e => setEditData(p => ({ ...p, inventoryAmount: e.target.value }))} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label>Cost/gram ($)</Label>
                <Input type="number" step="0.001" value={editData.costPerGram || ""} onChange={e => setEditData(p => ({ ...p, costPerGram: e.target.value }))} />
              </div>
              <div>
                <Label>IFRA Limit (%)</Label>
                <Input type="number" step="0.001" value={editData.ifraLimit || ""} onChange={e => setEditData(p => ({ ...p, ifraLimit: e.target.value }))} />
              </div>
              <div>
                <Label>Longevity (0-5)</Label>
                <Input type="number" min={0} max={5} value={editData.longevity ?? 2} onChange={e => setEditData(p => ({ ...p, longevity: parseInt(e.target.value) || 0 }))} />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={editData.description || ""} onChange={e => setEditData(p => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEdit(false)}>Cancel</Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={showDelete} onOpenChange={setShowDelete}>
        <AlertDialogContent>
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
