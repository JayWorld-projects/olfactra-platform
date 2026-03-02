import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import {
  Plus, Pencil, Trash2, Check, X, Loader2, Palette, GripVertical,
  BookOpen, AlertTriangle, Sparkles,
} from "lucide-react";
import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function CategoryManager() {
  const { loading } = useAuth();
  const navItems = useNavItems();
  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <DashboardLayout navItems={navItems} currentPath="/categories" title="Olfactra">
      <CategoryManagerContent />
    </DashboardLayout>
  );
}

// ─── Preset color palette for quick selection ─────────────────────────────
const COLOR_PRESETS = [
  "#ef4444", "#f97316", "#f59e0b", "#facc15", "#84cc16",
  "#22c55e", "#4ade80", "#86efac", "#06b6d4", "#38bdf8",
  "#7dd3fc", "#6366f1", "#8b5cf6", "#c084fc", "#d946ef",
  "#f472b6", "#fda4af", "#f9a8d4", "#a16207", "#b45309",
  "#92400e", "#78716c", "#6b7280", "#94a3b8", "#d4d4d8",
  "#a3e635", "#65a30d", "#fde68a",
];

function CategoryManagerContent() {
  const utils = trpc.useUtils();
  const { data: categories, isLoading } = trpc.category.list.useQuery();
  const { data: counts } = trpc.category.counts.useQuery();
  const seedMutation = trpc.category.seed.useMutation({
    onSuccess: (data) => {
      utils.category.list.invalidate();
      utils.category.counts.invalidate();
      toast.success(data.message);
    },
    onError: (err) => toast.error(err.message),
  });
  const createMutation = trpc.category.create.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      toast.success("Category created");
    },
    onError: (err) => toast.error(err.message),
  });
  const updateMutation = trpc.category.update.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
    },
  });
  const renameMutation = trpc.category.rename.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      utils.ingredient.list.invalidate();
      toast.success("Category renamed");
    },
    onError: (err) => toast.error(err.message),
  });
  const deleteMutation = trpc.category.delete.useMutation({
    onSuccess: () => {
      utils.category.list.invalidate();
      utils.category.counts.invalidate();
      toast.success("Category deleted");
    },
    onError: (err) => toast.error(err.message),
  });

  const [newName, setNewName] = useState("");
  const [newColor, setNewColor] = useState("#6b7280");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editColor, setEditColor] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<{ id: number; name: string } | null>(null);
  const [colorPickerId, setColorPickerId] = useState<number | "new" | null>(null);

  // Build a map of category name -> ingredient count
  const countMap = useMemo(() => {
    const map: Record<string, number> = {};
    if (counts) {
      for (const c of counts) {
        if (c.category) map[c.category] = Number(c.count);
      }
    }
    return map;
  }, [counts]);

  const handleCreate = useCallback(() => {
    const trimmed = newName.trim();
    if (!trimmed) return;
    // Check for duplicates
    if (categories?.some(c => c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("A category with this name already exists");
      return;
    }
    createMutation.mutate({ name: trimmed, color: newColor, sortOrder: (categories?.length || 0) });
    setNewName("");
    setNewColor("#6b7280");
  }, [newName, newColor, categories, createMutation]);

  const startEdit = useCallback((cat: { id: number; name: string; color: string | null }) => {
    setEditingId(cat.id);
    setEditName(cat.name);
    setEditColor(cat.color || "#6b7280");
    setColorPickerId(null);
  }, []);

  const saveEdit = useCallback(() => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) return;
    const original = categories?.find(c => c.id === editingId);
    if (!original) return;

    // Check for duplicate names (excluding current)
    if (categories?.some(c => c.id !== editingId && c.name.toLowerCase() === trimmed.toLowerCase())) {
      toast.error("A category with this name already exists");
      return;
    }

    // If name changed, use rename (which also updates ingredients)
    if (original.name !== trimmed) {
      renameMutation.mutate({ id: editingId, oldName: original.name, newName: trimmed });
    }
    // If color changed, update it
    if (original.color !== editColor) {
      updateMutation.mutate({ id: editingId, color: editColor });
    }
    setEditingId(null);
  }, [editingId, editName, editColor, categories, renameMutation, updateMutation]);

  const handleColorChange = useCallback((id: number, color: string) => {
    updateMutation.mutate({ id, color });
    setColorPickerId(null);
  }, [updateMutation]);

  const handleDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id });
    setDeleteTarget(null);
  }, [deleteTarget, deleteMutation]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-96 mt-2" />
        </div>
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  const isEmpty = !categories || categories.length === 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-serif font-bold text-foreground">Category Manager</h2>
          <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
            Create, rename, and color-assign ingredient categories. Changes propagate to all ingredients.
          </p>
        </div>
        {isEmpty && (
          <Button
            onClick={() => seedMutation.mutate()}
            disabled={seedMutation.isPending}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            {seedMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            Auto-seed from Library
          </Button>
        )}
      </div>

      {/* Add New Category */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-medium flex items-center gap-2">
            <Plus className="size-4 text-primary" />
            Add New Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            {/* Color selector */}
            <div className="relative">
              <button
                onClick={() => setColorPickerId(colorPickerId === "new" ? null : "new")}
                className="size-9 rounded-lg border-2 border-border hover:border-primary/50 transition-colors shrink-0"
                style={{ backgroundColor: newColor }}
                title="Pick color"
              />
              {colorPickerId === "new" && (
                <div className="absolute top-full left-0 mt-2 z-50 bg-popover border border-border rounded-xl shadow-lg p-3 w-[240px]">
                  <div className="grid grid-cols-7 gap-1.5">
                    {COLOR_PRESETS.map(c => (
                      <button
                        key={c}
                        onClick={() => { setNewColor(c); setColorPickerId(null); }}
                        className={`size-7 rounded-md border-2 transition-all hover:scale-110 ${
                          newColor === c ? "border-foreground ring-2 ring-primary/30" : "border-transparent"
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                  <Separator className="my-2" />
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-muted-foreground">Custom:</label>
                    <input
                      type="color"
                      value={newColor}
                      onChange={(e) => setNewColor(e.target.value)}
                      className="size-7 rounded cursor-pointer border-0 p-0"
                    />
                    <span className="text-xs font-mono text-muted-foreground">{newColor}</span>
                  </div>
                </div>
              )}
            </div>
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Category name..."
              className="flex-1"
              onKeyDown={(e) => { if (e.key === "Enter") handleCreate(); }}
            />
            <Button
              onClick={handleCreate}
              disabled={!newName.trim() || createMutation.isPending}
              size="sm"
              className="gap-2"
            >
              {createMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              Add
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Category List */}
      {isEmpty ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Palette className="size-12 text-muted-foreground/30 mx-auto mb-4" />
            <p className="text-muted-foreground text-sm">
              No categories yet. Add one above or click "Auto-seed from Library" to populate from your existing ingredients.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Palette className="size-4 text-primary" />
              Categories
              <span className="text-xs text-muted-foreground font-normal ml-1">
                ({categories.length} total)
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-border">
              {categories.map((cat) => {
                const ingredientCount = countMap[cat.name] || 0;
                const isEditing = editingId === cat.id;

                return (
                  <div
                    key={cat.id}
                    className="flex items-center gap-3 px-4 py-3 hover:bg-muted/30 transition-colors group"
                  >
                    {/* Color dot / picker */}
                    <div className="relative">
                      {isEditing ? (
                        <>
                          <button
                            onClick={() => setColorPickerId(colorPickerId === cat.id ? null : cat.id)}
                            className="size-8 rounded-lg border-2 border-border hover:border-primary/50 transition-colors shrink-0"
                            style={{ backgroundColor: editColor }}
                            title="Change color"
                          />
                          {colorPickerId === cat.id && (
                            <div className="absolute top-full left-0 mt-2 z-50 bg-popover border border-border rounded-xl shadow-lg p-3 w-[240px]">
                              <div className="grid grid-cols-7 gap-1.5">
                                {COLOR_PRESETS.map(c => (
                                  <button
                                    key={c}
                                    onClick={() => { setEditColor(c); setColorPickerId(null); }}
                                    className={`size-7 rounded-md border-2 transition-all hover:scale-110 ${
                                      editColor === c ? "border-foreground ring-2 ring-primary/30" : "border-transparent"
                                    }`}
                                    style={{ backgroundColor: c }}
                                  />
                                ))}
                              </div>
                              <Separator className="my-2" />
                              <div className="flex items-center gap-2">
                                <label className="text-xs text-muted-foreground">Custom:</label>
                                <input
                                  type="color"
                                  value={editColor}
                                  onChange={(e) => setEditColor(e.target.value)}
                                  className="size-7 rounded cursor-pointer border-0 p-0"
                                />
                                <span className="text-xs font-mono text-muted-foreground">{editColor}</span>
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setColorPickerId(colorPickerId === cat.id ? null : cat.id);
                          }}
                          className="size-8 rounded-lg border-2 border-transparent hover:border-border transition-colors shrink-0 cursor-pointer"
                          style={{ backgroundColor: cat.color || "#6b7280" }}
                          title="Click to change color"
                        />
                      )}
                      {/* Quick color picker when not in edit mode */}
                      {!isEditing && colorPickerId === cat.id && (
                        <div className="absolute top-full left-0 mt-2 z-50 bg-popover border border-border rounded-xl shadow-lg p-3 w-[240px]">
                          <div className="grid grid-cols-7 gap-1.5">
                            {COLOR_PRESETS.map(c => (
                              <button
                                key={c}
                                onClick={() => handleColorChange(cat.id, c)}
                                className={`size-7 rounded-md border-2 transition-all hover:scale-110 ${
                                  (cat.color || "#6b7280") === c ? "border-foreground ring-2 ring-primary/30" : "border-transparent"
                                }`}
                                style={{ backgroundColor: c }}
                              />
                            ))}
                          </div>
                          <Separator className="my-2" />
                          <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground">Custom:</label>
                            <input
                              type="color"
                              value={cat.color || "#6b7280"}
                              onChange={(e) => handleColorChange(cat.id, e.target.value)}
                              className="size-7 rounded cursor-pointer border-0 p-0"
                            />
                            <span className="text-xs font-mono text-muted-foreground">{cat.color || "#6b7280"}</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Name */}
                    {isEditing ? (
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="flex-1 h-8"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter") saveEdit();
                          if (e.key === "Escape") setEditingId(null);
                        }}
                      />
                    ) : (
                      <span className="flex-1 text-sm font-medium text-foreground">{cat.name}</span>
                    )}

                    {/* Ingredient count badge */}
                    <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full shrink-0">
                      {ingredientCount} {ingredientCount === 1 ? "ingredient" : "ingredients"}
                    </span>

                    {/* Actions */}
                    {isEditing ? (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-green-600 hover:text-green-700 hover:bg-green-50"
                          onClick={saveEdit}
                          disabled={renameMutation.isPending || updateMutation.isPending}
                        >
                          {renameMutation.isPending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => { setEditingId(null); setColorPickerId(null); }}
                        >
                          <X className="size-4" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8"
                          onClick={() => startEdit({ id: cat.id, name: cat.name, color: cat.color })}
                          title="Rename"
                        >
                          <Pencil className="size-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="size-8 text-destructive hover:text-destructive"
                          onClick={() => setDeleteTarget({ id: cat.id, name: cat.name })}
                          title="Delete"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Delete confirmation dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && countMap[deleteTarget.name] ? (
                <>
                  <span className="flex items-center gap-2 text-amber-600 mb-2">
                    <AlertTriangle className="size-4" />
                    This category has {countMap[deleteTarget.name]} ingredient{countMap[deleteTarget.name] !== 1 ? "s" : ""} assigned to it.
                  </span>
                  Deleting "{deleteTarget?.name}" will remove the category record. Ingredients currently assigned to this category will keep their category label but it won't appear in the manager.
                </>
              ) : (
                <>Are you sure you want to delete "{deleteTarget?.name}"? This action cannot be undone.</>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
