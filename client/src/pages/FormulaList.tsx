import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import { FlaskConical, Plus, Loader2 } from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";

export default function FormulaList() {
  const { loading } = useAuth();
  const navItems = useNavItems();
  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <DashboardLayout navItems={navItems} currentPath="/formulas" title="JayLabs Perfumery">
      <FormulaListContent />
    </DashboardLayout>
  );
}

function FormulaListContent() {
  const [, setLocation] = useLocation();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const { data: formulas, isLoading } = trpc.formula.list.useQuery();
  const utils = trpc.useUtils();

  const createMutation = trpc.formula.create.useMutation({
    onSuccess: (data) => {
      utils.formula.list.invalidate();
      setShowCreate(false);
      setName("");
      setDescription("");
      toast.success("Formula created");
      setLocation(`/formulas/${data.id}`);
    },
  });

  const handleCreate = () => {
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), description: description.trim() || undefined });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Formulas</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{formulas?.length ?? 0} formulas</p>
        </div>
        <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
          <Plus className="size-4" /> New Formula
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : !formulas || formulas.length === 0 ? (
        <Card className="py-16 bg-card border-border/50">
          <CardContent className="flex flex-col items-center gap-4 text-center">
            <div className="size-12 rounded-xl bg-secondary flex items-center justify-center">
              <FlaskConical className="size-6 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground text-sm">No formulas yet. Create your first formula to get started.</p>
            <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              <Plus className="size-4" /> Create Formula
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {formulas.map(formula => (
            <Card
              key={formula.id}
              className="cursor-pointer group hover:border-primary/40 transition-all bg-card border-border/50"
              onClick={() => setLocation(`/formulas/${formula.id}`)}
            >
              <CardContent className="pt-4 pb-4 space-y-2.5">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{formula.name}</h3>
                  <Badge
                    variant={formula.status === "final" ? "default" : "secondary"}
                    className={`text-[11px] ${formula.status === "final" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}
                  >
                    {formula.status}
                  </Badge>
                </div>
                {formula.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">{formula.description}</p>
                )}
                <div className="flex gap-3 text-xs text-muted-foreground">
                  <span>Solvent: {formula.solvent || "Ethanol"}</span>
                  {formula.totalWeight && parseFloat(formula.totalWeight) > 0 && (
                    <span className="text-accent font-medium">Total: {parseFloat(formula.totalWeight).toFixed(3)}g</span>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Updated {new Date(formula.updatedAt).toLocaleDateString()}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={showCreate} onOpenChange={setShowCreate}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="font-serif">Create New Formula</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4">
            <div>
              <Label className="text-sm">Formula Name *</Label>
              <Input
                className="mt-1.5 bg-background border-border/50"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="e.g., Summer Evening EdP"
                onKeyDown={e => e.key === "Enter" && handleCreate()}
              />
            </div>
            <div>
              <Label className="text-sm">Description</Label>
              <Input
                className="mt-1.5 bg-background border-border/50"
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Brief description of the fragrance concept"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button onClick={handleCreate} disabled={!name.trim() || createMutation.isPending} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {createMutation.isPending ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
