import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import {
  FolderOpen, Plus, Pencil, Trash2, Check, Search,
  BookOpen, CheckCircle2, Circle, Loader2, Layers, X
} from "lucide-react";
import { useState, useMemo, useCallback } from "react";
import { toast } from "sonner";

export default function Workspaces() {
  const { loading, isAuthenticated } = useAuth();
  const navItems = useNavItems();

  if (loading) return <DashboardLayoutSkeleton />;
  if (!isAuthenticated) return null;

  return (
    <DashboardLayout navItems={navItems} currentPath="/workspaces" title="Olfactra" subtitle="Workspaces">
      <WorkspacesContent />
    </DashboardLayout>
  );
}

function WorkspacesContent() {
  const { activeWorkspaceId, setActiveWorkspaceId } = useWorkspace();
  const utils = trpc.useUtils();
  const { data: workspacesList, isLoading } = trpc.workspace.list.useQuery();
  const { data: allIngredients } = trpc.ingredient.list.useQuery({});

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] = useState<{ id: number; name: string; description: string | null } | null>(null);
  const [deletingWorkspace, setDeletingWorkspace] = useState<{ id: number; name: string } | null>(null);

  // Create workspace
  const [newName, setNewName] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [selectedIngredientIds, setSelectedIngredientIds] = useState<Set<number>>(new Set());
  const [ingredientSearch, setIngredientSearch] = useState("");

  // Edit workspace
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editIngredientIds, setEditIngredientIds] = useState<Set<number>>(new Set());
  const [editIngredientSearch, setEditIngredientSearch] = useState("");

  const createMutation = trpc.workspace.create.useMutation({
    onSuccess: () => {
      utils.workspace.list.invalidate();
      setCreateOpen(false);
      setNewName("");
      setNewDescription("");
      setSelectedIngredientIds(new Set());
      toast.success("Workspace created");
    },
    onError: (err) => toast.error(err.message),
  });

  const updateMutation = trpc.workspace.update.useMutation({
    onSuccess: () => {
      utils.workspace.list.invalidate();
      toast.success("Workspace updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const setIngredientsMutation = trpc.workspace.setIngredients.useMutation({
    onSuccess: () => {
      utils.workspace.list.invalidate();
      setEditOpen(false);
      toast.success("Workspace ingredients updated");
    },
    onError: (err) => toast.error(err.message),
  });

  const deleteMutation = trpc.workspace.delete.useMutation({
    onSuccess: (_, variables) => {
      utils.workspace.list.invalidate();
      if (activeWorkspaceId === variables.id) {
        setActiveWorkspaceId(null);
      }
      setDeleteOpen(false);
      setDeletingWorkspace(null);
      toast.success("Workspace deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const filteredIngredients = useMemo(() => {
    if (!allIngredients) return [];
    if (!ingredientSearch.trim()) return allIngredients;
    const q = ingredientSearch.toLowerCase();
    return allIngredients.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.category && i.category.toLowerCase().includes(q)) ||
      (i.supplier && i.supplier.toLowerCase().includes(q))
    );
  }, [allIngredients, ingredientSearch]);

  const editFilteredIngredients = useMemo(() => {
    if (!allIngredients) return [];
    if (!editIngredientSearch.trim()) return allIngredients;
    const q = editIngredientSearch.toLowerCase();
    return allIngredients.filter(i =>
      i.name.toLowerCase().includes(q) ||
      (i.category && i.category.toLowerCase().includes(q)) ||
      (i.supplier && i.supplier.toLowerCase().includes(q))
    );
  }, [allIngredients, editIngredientSearch]);

  const toggleIngredient = useCallback((id: number, isEdit: boolean) => {
    if (isEdit) {
      setEditIngredientIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    } else {
      setSelectedIngredientIds(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    }
  }, []);

  const selectAll = useCallback((isEdit: boolean) => {
    if (!allIngredients) return;
    const allIds = new Set(allIngredients.map(i => i.id));
    if (isEdit) setEditIngredientIds(allIds);
    else setSelectedIngredientIds(allIds);
  }, [allIngredients]);

  const deselectAll = useCallback((isEdit: boolean) => {
    if (isEdit) setEditIngredientIds(new Set());
    else setSelectedIngredientIds(new Set());
  }, []);

  const openEdit = useCallback(async (ws: { id: number; name: string; description: string | null; ingredientCount: number }) => {
    setEditingWorkspace(ws);
    setEditName(ws.name);
    setEditDescription(ws.description || "");
    setEditIngredientSearch("");
    // Fetch current ingredient IDs
    try {
      const data = await utils.workspace.get.fetch({ id: ws.id });
      if (data) {
        setEditIngredientIds(new Set(data.ingredientIds));
      }
    } catch {
      setEditIngredientIds(new Set());
    }
    setEditOpen(true);
  }, [utils]);

  const handleCreate = () => {
    if (!newName.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }
    createMutation.mutate({
      name: newName.trim(),
      description: newDescription.trim() || undefined,
      ingredientIds: Array.from(selectedIngredientIds),
    });
  };

  const handleSaveEdit = () => {
    if (!editingWorkspace || !editName.trim()) return;
    // Update name/description
    updateMutation.mutate({
      id: editingWorkspace.id,
      name: editName.trim(),
      description: editDescription.trim() || undefined,
    });
    // Update ingredients
    setIngredientsMutation.mutate({
      workspaceId: editingWorkspace.id,
      ingredientIds: Array.from(editIngredientIds),
    });
  };

  const openCreate = () => {
    setNewName("");
    setNewDescription("");
    setIngredientSearch("");
    if (allIngredients) {
      setSelectedIngredientIds(new Set(allIngredients.map(i => i.id)));
    }
    setCreateOpen(true);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground flex items-center gap-2">
            <Layers className="size-6 text-primary" /> Workspaces
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Create ingredient workspaces to organize your materials into focused collections.
          </p>
        </div>
        <Button onClick={openCreate} className="gap-1.5 bg-primary hover:bg-primary/90">
          <Plus className="size-4" /> New Workspace
        </Button>
      </div>

      {/* Active workspace indicator */}
      {activeWorkspaceId && workspacesList && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/10 border border-primary/20">
          <CheckCircle2 className="size-4 text-primary shrink-0" />
          <span className="text-sm text-foreground">
            Active workspace: <strong>{workspacesList.find(w => w.id === activeWorkspaceId)?.name || "Unknown"}</strong>
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setActiveWorkspaceId(null)}
            className="ml-auto text-xs text-muted-foreground hover:text-foreground h-7"
          >
            <X className="size-3.5 mr-1" /> Clear
          </Button>
        </div>
      )}

      {/* Workspace cards */}
      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="size-6 animate-spin text-primary" />
        </div>
      ) : !workspacesList || workspacesList.length === 0 ? (
        <Card className="bg-card border-border/50">
          <CardContent className="py-16 text-center">
            <FolderOpen className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-foreground mb-2">No workspaces yet</h3>
            <p className="text-sm text-muted-foreground mb-4">
              Create a workspace to organize your ingredients into focused collections.
            </p>
            <Button onClick={openCreate} className="gap-1.5 bg-primary hover:bg-primary/90">
              <Plus className="size-4" /> Create Your First Workspace
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {workspacesList.map(ws => {
            const isActive = activeWorkspaceId === ws.id;
            return (
              <Card
                key={ws.id}
                className={`bg-card border-border/50 transition-all hover:border-primary/40 ${isActive ? "ring-2 ring-primary/50 border-primary/40" : ""}`}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base font-semibold truncate flex items-center gap-2">
                        <FolderOpen className="size-4 text-accent shrink-0" />
                        {ws.name}
                      </CardTitle>
                      {ws.description && (
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{ws.description}</p>
                      )}
                    </div>
                    {isActive && (
                      <Badge variant="outline" className="text-primary border-primary/40 text-[10px] shrink-0 ml-2">
                        Active
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center gap-2">
                    <BookOpen className="size-3.5 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                      {ws.ingredientCount} ingredient{ws.ingredientCount !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Created {new Date(ws.createdAt).toLocaleDateString()}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    {isActive ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveWorkspaceId(null)}
                        className="flex-1 text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <X className="size-3.5 mr-1" /> Deactivate
                      </Button>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveWorkspaceId(ws.id)}
                        className="flex-1 text-xs h-8 border-primary/30 text-primary hover:bg-primary/10"
                      >
                        <Check className="size-3.5 mr-1" /> Activate
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEdit(ws)}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                    >
                      <Pencil className="size-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setDeletingWorkspace(ws); setDeleteOpen(true); }}
                      className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-primary" /> Create Workspace
            </DialogTitle>
            <DialogDescription>
              Name your workspace and select which ingredients to include.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 min-h-0 flex flex-col">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                placeholder="e.g., Spring 2026 Collection"
                value={newName}
                onChange={e => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                placeholder="Brief description of this workspace..."
                value={newDescription}
                onChange={e => setNewDescription(e.target.value)}
                rows={2}
              />
            </div>
            <IngredientSelector
              ingredients={filteredIngredients}
              allIngredients={allIngredients || []}
              selectedIds={selectedIngredientIds}
              search={ingredientSearch}
              onSearchChange={setIngredientSearch}
              onToggle={(id) => toggleIngredient(id, false)}
              onSelectAll={() => selectAll(false)}
              onDeselectAll={() => deselectAll(false)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {createMutation.isPending && <Loader2 className="size-4 animate-spin mr-1" />}
              Create ({selectedIngredientIds.size} ingredients)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="size-5 text-primary" /> Edit Workspace
            </DialogTitle>
            <DialogDescription>
              Update the workspace name, description, or ingredient selection.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 flex-1 min-h-0 flex flex-col">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={editName}
                onChange={e => setEditName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Description (optional)</Label>
              <Textarea
                value={editDescription}
                onChange={e => setEditDescription(e.target.value)}
                rows={2}
              />
            </div>
            <IngredientSelector
              ingredients={editFilteredIngredients}
              allIngredients={allIngredients || []}
              selectedIds={editIngredientIds}
              search={editIngredientSearch}
              onSearchChange={setEditIngredientSearch}
              onToggle={(id) => toggleIngredient(id, true)}
              onSelectAll={() => selectAll(true)}
              onDeselectAll={() => deselectAll(true)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSaveEdit}
              disabled={!editName.trim() || setIngredientsMutation.isPending || updateMutation.isPending}
              className="bg-primary hover:bg-primary/90"
            >
              {(setIngredientsMutation.isPending || updateMutation.isPending) && <Loader2 className="size-4 animate-spin mr-1" />}
              Save ({editIngredientIds.size} ingredients)
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workspace</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete <strong>"{deletingWorkspace?.name}"</strong>? This will not delete the ingredients themselves, only the workspace grouping.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={() => deletingWorkspace && deleteMutation.mutate({ id: deletingWorkspace.id })}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && <Loader2 className="size-4 animate-spin mr-1" />}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function IngredientSelector({
  ingredients,
  allIngredients,
  selectedIds,
  search,
  onSearchChange,
  onToggle,
  onSelectAll,
  onDeselectAll,
}: {
  ingredients: any[];
  allIngredients: any[];
  selectedIds: Set<number>;
  search: string;
  onSearchChange: (s: string) => void;
  onToggle: (id: number) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
}) {
  // Group by category
  const grouped = useMemo(() => {
    const map = new Map<string, typeof ingredients>();
    for (const ing of ingredients) {
      const cat = ing.category?.trim() || "Uncategorized";
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)!.push(ing);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [ingredients]);

  return (
    <div className="flex-1 min-h-0 flex flex-col space-y-2">
      <div className="flex items-center justify-between">
        <Label className="text-sm">
          Ingredients ({selectedIds.size} of {allIngredients.length} selected)
        </Label>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={onSelectAll} className="text-xs h-7 px-2 text-primary">
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={onDeselectAll} className="text-xs h-7 px-2 text-muted-foreground">
            Deselect All
          </Button>
        </div>
      </div>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          placeholder="Search ingredients by name, category, or supplier..."
          value={search}
          onChange={e => onSearchChange(e.target.value)}
          className="pl-9"
        />
      </div>
      <ScrollArea className="flex-1 min-h-0 h-[300px] border border-border/30 rounded-lg">
        <div className="p-2 space-y-3">
          {grouped.map(([category, items]) => (
            <div key={category}>
              <div className="flex items-center justify-between px-2 py-1">
                <span className="text-xs font-semibold text-accent uppercase tracking-wider">{category}</span>
                <span className="text-[10px] text-muted-foreground">
                  {items.filter((i: any) => selectedIds.has(i.id)).length}/{items.length}
                </span>
              </div>
              <div className="space-y-0.5">
                {items.map((ing: any) => {
                  const isSelected = selectedIds.has(ing.id);
                  return (
                    <button
                      key={ing.id}
                      onClick={() => onToggle(ing.id)}
                      className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-left text-sm transition-colors ${
                        isSelected
                          ? "bg-primary/10 text-foreground"
                          : "text-muted-foreground hover:bg-secondary/50 hover:text-foreground"
                      }`}
                    >
                      {isSelected ? (
                        <CheckCircle2 className="size-4 text-primary shrink-0" />
                      ) : (
                        <Circle className="size-4 text-muted-foreground/40 shrink-0" />
                      )}
                      <span className="truncate">{ing.name}</span>
                      {ing.supplier && (
                        <span className="text-[10px] text-muted-foreground ml-auto shrink-0">{ing.supplier}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
          {grouped.length === 0 && (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No ingredients match your search.
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
