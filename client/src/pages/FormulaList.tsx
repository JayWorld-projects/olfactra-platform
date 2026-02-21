import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import { FlaskConical, Plus, Loader2, Copy, GitCompareArrows, X } from "lucide-react";
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
  const [showClone, setShowClone] = useState(false);
  const [cloneSourceId, setCloneSourceId] = useState<number | null>(null);
  const [cloneSourceName, setCloneSourceName] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [compareSelection, setCompareSelection] = useState<number[]>([]);

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

  const cloneMutation = trpc.formula.clone.useMutation({
    onSuccess: (data) => {
      utils.formula.list.invalidate();
      setShowClone(false);
      setName("");
      setCloneSourceId(null);
      setCloneSourceName("");
      toast.success("Formula cloned successfully");
      setLocation(`/formulas/${data.id}`);
    },
    onError: () => {
      toast.error("Failed to clone formula");
    },
  });

  const handleCreate = () => {
    if (!name.trim()) return;
    createMutation.mutate({ name: name.trim(), description: description.trim() || undefined });
  };

  const handleClone = () => {
    if (!name.trim() || !cloneSourceId) return;
    cloneMutation.mutate({ id: cloneSourceId, name: name.trim() });
  };

  const openCloneDialog = (e: React.MouseEvent, formulaId: number, formulaName: string) => {
    e.stopPropagation();
    setCloneSourceId(formulaId);
    setCloneSourceName(formulaName);
    setName(`${formulaName} (Copy)`);
    setShowClone(true);
  };

  const toggleCompareSelection = (e: React.MouseEvent, formulaId: number) => {
    e.stopPropagation();
    setCompareSelection(prev => {
      if (prev.includes(formulaId)) {
        return prev.filter(id => id !== formulaId);
      }
      if (prev.length >= 2) {
        return [prev[1], formulaId];
      }
      return [...prev, formulaId];
    });
  };

  const startCompare = () => {
    if (compareSelection.length === 2) {
      setLocation(`/formulas/compare/${compareSelection[0]}/${compareSelection[1]}`);
    }
  };

  const exitCompareMode = () => {
    setCompareMode(false);
    setCompareSelection([]);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Formulas</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{formulas?.length ?? 0} formulas</p>
        </div>
        <div className="flex gap-2">
          {compareMode ? (
            <>
              <Button
                onClick={startCompare}
                disabled={compareSelection.length !== 2}
                className="bg-accent hover:bg-accent/90 text-accent-foreground shadow-sm"
              >
                <GitCompareArrows className="size-4" />
                Compare ({compareSelection.length}/2)
              </Button>
              <Button variant="outline" onClick={exitCompareMode}>
                <X className="size-4" /> Cancel
              </Button>
            </>
          ) : (
            <>
              {formulas && formulas.length >= 2 && (
                <Button variant="outline" onClick={() => setCompareMode(true)}>
                  <GitCompareArrows className="size-4" /> Compare
                </Button>
              )}
              <Button onClick={() => setShowCreate(true)} className="bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm">
                <Plus className="size-4" /> New Formula
              </Button>
            </>
          )}
        </div>
      </div>

      {compareMode && (
        <div className="rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm text-accent">
          Select exactly 2 formulas to compare side by side. Click the checkboxes on formula cards.
        </div>
      )}

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
          {formulas.map(formula => {
            const isSelected = compareSelection.includes(formula.id);
            return (
              <Card
                key={formula.id}
                className={`cursor-pointer group transition-all bg-card border-border/50 ${
                  compareMode && isSelected
                    ? "border-accent ring-1 ring-accent/40"
                    : "hover:border-primary/40"
                }`}
                onClick={() => {
                  if (compareMode) {
                    toggleCompareSelection({stopPropagation: () => {}} as React.MouseEvent, formula.id);
                  } else {
                    setLocation(`/formulas/${formula.id}`);
                  }
                }}
              >
                <CardContent className="pt-4 pb-4 space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      {compareMode && (
                        <Checkbox
                          checked={isSelected}
                          onClick={(e) => toggleCompareSelection(e, formula.id)}
                          className="border-border data-[state=checked]:bg-accent data-[state=checked]:border-accent"
                        />
                      )}
                      <h3 className="font-semibold text-sm text-foreground group-hover:text-primary transition-colors">{formula.name}</h3>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {!compareMode && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-7 text-muted-foreground hover:text-accent opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => openCloneDialog(e, formula.id, formula.name)}
                          title="Clone formula"
                        >
                          <Copy className="size-3.5" />
                        </Button>
                      )}
                      <Badge
                        variant={formula.status === "final" ? "default" : "secondary"}
                        className={`text-[11px] ${formula.status === "final" ? "bg-accent text-accent-foreground" : "bg-secondary text-secondary-foreground"}`}
                      >
                        {formula.status}
                      </Badge>
                    </div>
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
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
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

      {/* Clone Dialog */}
      <Dialog open={showClone} onOpenChange={(open) => { setShowClone(open); if (!open) { setName(""); setCloneSourceId(null); setCloneSourceName(""); } }}>
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle className="font-serif flex items-center gap-2">
              <Copy className="size-5 text-accent" /> Clone Formula
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Create a copy of <span className="text-foreground font-medium">"{cloneSourceName}"</span> with all its ingredients. You can rename it below.
          </p>
          <div>
            <Label className="text-sm">New Formula Name *</Label>
            <Input
              className="mt-1.5 bg-background border-border/50"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder="e.g., Summer Evening v2"
              onKeyDown={e => e.key === "Enter" && handleClone()}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowClone(false)}>Cancel</Button>
            <Button onClick={handleClone} disabled={!name.trim() || cloneMutation.isPending} className="bg-accent hover:bg-accent/90 text-accent-foreground">
              {cloneMutation.isPending ? <><Loader2 className="size-4 animate-spin" /> Cloning...</> : <><Copy className="size-4" /> Clone</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
