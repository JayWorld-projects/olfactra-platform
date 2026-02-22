import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, FlaskConical, ArrowRight, ArrowLeft, Check, Info, Beaker, BookOpen } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

interface DerivedFormulaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  formulaId: number;
  formulaName: string;
}

type Step = "configure" | "preview" | "save";

export default function DerivedFormulaDialog({ open, onOpenChange, formulaId, formulaName }: DerivedFormulaDialogProps) {
  const [, setLocation] = useLocation();
  const [step, setStep] = useState<Step>("configure");

  // Step 1: Configuration
  const [productTypeId, setProductTypeId] = useState<string>("");
  const [batchSizeValue, setBatchSizeValue] = useState("100");
  const [batchSizeUnit, setBatchSizeUnit] = useState("g");
  const [fragranceLoadPercent, setFragranceLoadPercent] = useState(18);

  // Step 2: Preview data
  const [previewData, setPreviewData] = useState<any>(null);
  const [mixingProcedure, setMixingProcedure] = useState<any>(null);

  // Step 3: Save
  const [derivedName, setDerivedName] = useState("");

  const { data: productTypes } = trpc.derived.productTypes.useQuery();
  const previewMutation = trpc.derived.preview.useMutation();
  const mixingMutation = trpc.derived.generateMixingProcedure.useMutation();
  const saveMutation = trpc.derived.save.useMutation();
  const utils = trpc.useUtils();

  const selectedProductType = useMemo(() => {
    return productTypes?.find(pt => pt.id === productTypeId);
  }, [productTypes, productTypeId]);

  // When product type changes, update default fragrance load
  const handleProductTypeChange = (id: string) => {
    setProductTypeId(id);
    const pt = productTypes?.find(p => p.id === id);
    if (pt) {
      setFragranceLoadPercent(pt.defaultLoad);
    }
  };

  const handlePreview = () => {
    const bsv = parseFloat(batchSizeValue);
    if (!productTypeId || isNaN(bsv) || bsv <= 0) {
      toast.error("Please fill in all configuration fields");
      return;
    }
    previewMutation.mutate({
      parentFormulaId: formulaId,
      productTypeId,
      batchSizeValue: bsv,
      batchSizeUnit: batchSizeUnit as "g" | "ml" | "oz" | "kg",
      fragranceLoadPercent,
    }, {
      onSuccess: (data) => {
        setPreviewData(data);
        setDerivedName(`${formulaName} — ${data.productType.name}`);
        setStep("preview");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleGenerateMixing = () => {
    if (!previewData) return;
    mixingMutation.mutate({
      parentFormulaName: formulaName,
      productTypeName: previewData.productType.name,
      productTypeId: previewData.productType.id,
      carrierName: previewData.carrierName,
      fragranceMass: previewData.fragranceMass,
      carrierMass: previewData.carrierMass,
      batchSizeGrams: previewData.batchSizeGrams,
      fragranceLoadPercent: previewData.fragranceLoadPercent,
      ingredients: previewData.scaledIngredients.map((si: any) => ({
        name: si.ingredientName,
        weight: si.scaledWeight,
        category: si.category,
      })),
    }, {
      onSuccess: (data) => {
        setMixingProcedure(data);
        toast.success("Mixing procedure generated");
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const handleSave = () => {
    if (!previewData || !derivedName.trim()) return;
    const mixingText = mixingProcedure
      ? [
          ...mixingProcedure.steps,
          "",
          `Aging: ${mixingProcedure.agingSuggestion}`,
          `Storage: ${mixingProcedure.storageTip}`,
        ].join("\n")
      : undefined;

    saveMutation.mutate({
      name: derivedName.trim(),
      parentFormulaId: formulaId,
      productTypeId: previewData.productType.id,
      productTypeName: previewData.productType.name,
      batchSizeValue: previewData.batchSizeValue,
      batchSizeUnit: previewData.batchSizeUnit,
      fragranceLoadPercent: previewData.fragranceLoadPercent,
      carrierName: previewData.carrierName,
      carrierMass: previewData.carrierMass,
      fragranceMass: previewData.fragranceMass,
      batchSizeGrams: previewData.batchSizeGrams,
      mixingProcedure: mixingText,
      ingredients: previewData.scaledIngredients.map((si: any) => ({
        ingredientId: si.ingredientId,
        weight: si.scaledWeight.toFixed(3),
        dilutionPercent: si.dilutionPercent,
      })),
    }, {
      onSuccess: (data) => {
        toast.success("Derived formula saved!");
        utils.formula.list.invalidate();
        onOpenChange(false);
        resetState();
        setLocation(`/formulas/${data.formulaId}`);
      },
      onError: (err) => toast.error(err.message),
    });
  };

  const resetState = () => {
    setStep("configure");
    setProductTypeId("");
    setBatchSizeValue("100");
    setBatchSizeUnit("g");
    setFragranceLoadPercent(18);
    setPreviewData(null);
    setMixingProcedure(null);
    setDerivedName("");
  };

  const handleClose = (open: boolean) => {
    if (!open) resetState();
    onOpenChange(open);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="bg-card border-border/50 max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="font-serif flex items-center gap-2">
            <Beaker className="size-5 text-accent" />
            Generate Product Version
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            Create a derived product formula from <span className="text-foreground font-medium">"{formulaName}"</span>
          </p>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center gap-2 py-2">
          {[
            { id: "configure", label: "Configure", num: 1 },
            { id: "preview", label: "Preview", num: 2 },
            { id: "save", label: "Save", num: 3 },
          ].map((s, i) => (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 && <div className={`h-px w-6 ${step === s.id || (s.id === "save" && step === "save") || (s.id === "preview" && step !== "configure") ? "bg-accent" : "bg-border"}`} />}
              <div className={`flex items-center gap-1.5 text-xs font-medium ${
                step === s.id ? "text-accent" : (
                  (s.id === "configure" && step !== "configure") ||
                  (s.id === "preview" && step === "save")
                ) ? "text-muted-foreground" : "text-muted-foreground/50"
              }`}>
                <div className={`size-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                  step === s.id ? "bg-accent text-accent-foreground" : (
                    (s.id === "configure" && step !== "configure") ||
                    (s.id === "preview" && step === "save")
                  ) ? "bg-muted text-muted-foreground" : "bg-muted/50 text-muted-foreground/50"
                }`}>
                  {(s.id === "configure" && step !== "configure") || (s.id === "preview" && step === "save")
                    ? <Check className="size-3" />
                    : s.num}
                </div>
                {s.label}
              </div>
            </div>
          ))}
        </div>

        {/* Step 1: Configure */}
        {step === "configure" && (
          <div className="space-y-4">
            {/* Product Type */}
            <div>
              <Label className="text-xs text-muted-foreground">Product Type</Label>
              <Select value={productTypeId} onValueChange={handleProductTypeChange}>
                <SelectTrigger className="bg-background border-border/50 mt-1">
                  <SelectValue placeholder="Select product type..." />
                </SelectTrigger>
                <SelectContent>
                  {(productTypes || []).map(pt => (
                    <SelectItem key={pt.id} value={pt.id}>
                      <div className="flex flex-col">
                        <span>{pt.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProductType && (
                <p className="text-xs text-muted-foreground mt-1.5">
                  {selectedProductType.description} — Carrier: {selectedProductType.carrier}
                </p>
              )}
            </div>

            {/* Batch Size */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs text-muted-foreground">Batch Size</Label>
                <Input
                  type="number" step="0.1" min="0.1"
                  value={batchSizeValue}
                  onChange={e => setBatchSizeValue(e.target.value)}
                  className="bg-background border-border/50 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Unit</Label>
                <Select value={batchSizeUnit} onValueChange={setBatchSizeUnit}>
                  <SelectTrigger className="bg-background border-border/50 mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="g">Grams (g)</SelectItem>
                    <SelectItem value="ml">Milliliters (ml)</SelectItem>
                    <SelectItem value="oz">Ounces (oz)</SelectItem>
                    <SelectItem value="kg">Kilograms (kg)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {batchSizeUnit === "ml" && selectedProductType && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <Info className="size-3.5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300/80">
                  Volume will be converted to weight using an estimated density of ~{selectedProductType.id === "body_oil" ? "0.92" : selectedProductType.id === "reed_diffuser" ? "1.02" : selectedProductType.id === "lotion" ? "1.00" : "0.789"} g/ml for this carrier type. This is an approximation.
                </p>
              </div>
            )}

            {/* Fragrance Load */}
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs text-muted-foreground">Fragrance Load</Label>
                <span className="text-sm font-mono font-bold text-accent">{fragranceLoadPercent}%</span>
              </div>
              <Slider
                value={[fragranceLoadPercent]}
                onValueChange={([v]) => setFragranceLoadPercent(v)}
                min={selectedProductType?.defaultLoadMin ? Math.max(0.5, selectedProductType.defaultLoadMin - 5) : 1}
                max={selectedProductType?.defaultLoadMax ? Math.min(50, selectedProductType.defaultLoadMax + 10) : 30}
                step={0.5}
                className="mt-2"
              />
              {selectedProductType && (
                <div className="flex justify-between mt-1">
                  <span className="text-[10px] text-muted-foreground">
                    Typical: {selectedProductType.defaultLoadMin}–{selectedProductType.defaultLoadMax}%
                  </span>
                  <button
                    className="text-[10px] text-accent hover:underline"
                    onClick={() => setFragranceLoadPercent(selectedProductType.defaultLoad)}
                  >
                    Reset to default ({selectedProductType.defaultLoad}%)
                  </button>
                </div>
              )}
            </div>

            {/* Quick Summary */}
            {productTypeId && batchSizeValue && (
              <Card className="bg-secondary/30 border-border/30">
                <CardContent className="pt-3 pb-3">
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Fragrance</p>
                      <p className="text-sm font-mono font-bold text-foreground">
                        {(parseFloat(batchSizeValue || "0") * fragranceLoadPercent / 100).toFixed(1)}{batchSizeUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Carrier</p>
                      <p className="text-sm font-mono font-bold text-foreground">
                        {(parseFloat(batchSizeValue || "0") * (100 - fragranceLoadPercent) / 100).toFixed(1)}{batchSizeUnit}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Total</p>
                      <p className="text-sm font-mono font-bold text-accent">
                        {parseFloat(batchSizeValue || "0").toFixed(1)}{batchSizeUnit}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Step 2: Preview */}
        {step === "preview" && previewData && (
          <div className="space-y-4">
            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Product", value: previewData.productType.name },
                { label: "Batch", value: `${previewData.batchSizeGrams.toFixed(1)}g` },
                { label: "Fragrance", value: `${previewData.fragranceMass.toFixed(3)}g (${previewData.fragranceLoadPercent}%)` },
                { label: "Carrier", value: `${previewData.carrierMass.toFixed(3)}g` },
              ].map(item => (
                <div key={item.label} className="rounded-lg border border-border/30 bg-secondary/20 px-3 py-2">
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{item.label}</p>
                  <p className="text-xs font-medium text-foreground mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            {previewData.densityNote && (
              <div className="flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/5 px-3 py-2">
                <Info className="size-3.5 text-amber-400 mt-0.5 shrink-0" />
                <p className="text-xs text-amber-300/80">{previewData.densityNote}</p>
              </div>
            )}

            {/* Scaled Ingredients Table */}
            <div>
              <h4 className="text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wider">Scaled Ingredients</h4>
              <div className="rounded-lg border border-border/30 overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-secondary/30">
                      <TableHead className="text-xs h-8">Ingredient</TableHead>
                      <TableHead className="text-xs h-8 text-right">Original</TableHead>
                      <TableHead className="text-xs h-8 text-right">Scaled</TableHead>
                      <TableHead className="text-xs h-8 text-right">% of Batch</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {previewData.scaledIngredients.map((si: any) => (
                      <TableRow key={si.ingredientId} className="hover:bg-secondary/10">
                        <TableCell className="text-xs py-1.5">
                          <div className="flex items-center gap-1.5">
                            {si.ingredientName}
                            {si.category && (
                              <Badge variant="outline" className="text-[9px] px-1 py-0 h-4">{si.category}</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs py-1.5 text-right font-mono text-muted-foreground">
                          {si.originalWeight.toFixed(3)}g
                        </TableCell>
                        <TableCell className="text-xs py-1.5 text-right font-mono font-medium">
                          {si.scaledWeight.toFixed(3)}g
                        </TableCell>
                        <TableCell className="text-xs py-1.5 text-right font-mono text-muted-foreground">
                          {((si.scaledWeight / previewData.batchSizeGrams) * 100).toFixed(2)}%
                        </TableCell>
                      </TableRow>
                    ))}
                    {/* Carrier row */}
                    <TableRow className="bg-secondary/10 border-t border-border/30">
                      <TableCell className="text-xs py-1.5 font-medium">
                        <div className="flex items-center gap-1.5">
                          <FlaskConical className="size-3 text-accent" />
                          {previewData.carrierName.split("(")[0].trim()}
                        </div>
                      </TableCell>
                      <TableCell className="text-xs py-1.5 text-right font-mono text-muted-foreground">—</TableCell>
                      <TableCell className="text-xs py-1.5 text-right font-mono font-medium">
                        {previewData.carrierMass.toFixed(3)}g
                      </TableCell>
                      <TableCell className="text-xs py-1.5 text-right font-mono text-muted-foreground">
                        {((previewData.carrierMass / previewData.batchSizeGrams) * 100).toFixed(2)}%
                      </TableCell>
                    </TableRow>
                    {/* Total row */}
                    <TableRow className="border-t-2 border-accent/30">
                      <TableCell className="text-xs py-1.5 font-bold">Total</TableCell>
                      <TableCell className="text-xs py-1.5 text-right"></TableCell>
                      <TableCell className="text-xs py-1.5 text-right font-mono font-bold text-accent">
                        {previewData.batchSizeGrams.toFixed(3)}g
                      </TableCell>
                      <TableCell className="text-xs py-1.5 text-right font-mono font-bold text-accent">100%</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>

            {/* Mixing Procedure */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Mixing Procedure</h4>
                <Button
                  variant="outline" size="sm"
                  className="h-7 text-xs border-accent/50 text-accent hover:bg-accent/10"
                  onClick={handleGenerateMixing}
                  disabled={mixingMutation.isPending}
                >
                  {mixingMutation.isPending ? (
                    <><Loader2 className="size-3 animate-spin mr-1" /> Generating...</>
                  ) : mixingProcedure ? (
                    <><BookOpen className="size-3 mr-1" /> Regenerate</>
                  ) : (
                    <><BookOpen className="size-3 mr-1" /> Generate Mixing Steps</>
                  )}
                </Button>
              </div>
              {mixingProcedure ? (
                <Card className="bg-secondary/20 border-border/30">
                  <CardContent className="pt-3 pb-3 space-y-2">
                    <ol className="space-y-1.5">
                      {mixingProcedure.steps.map((step: string, i: number) => (
                        <li key={i} className="text-xs text-foreground/90 leading-relaxed flex gap-2">
                          <span className="text-accent font-mono font-bold shrink-0">{i + 1}.</span>
                          <span>{step.replace(/^Step \d+:\s*/i, "")}</span>
                        </li>
                      ))}
                    </ol>
                    <div className="border-t border-border/30 pt-2 mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground/80">Aging:</span> {mixingProcedure.agingSuggestion}</p>
                      <p className="text-xs text-muted-foreground"><span className="font-medium text-foreground/80">Storage:</span> {mixingProcedure.storageTip}</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                <div className="rounded-lg border border-dashed border-border/40 bg-secondary/10 px-4 py-6 text-center">
                  <BookOpen className="size-5 text-muted-foreground/50 mx-auto mb-2" />
                  <p className="text-xs text-muted-foreground">Click "Generate Mixing Steps" for AI-generated step-by-step instructions.</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Optional — you can save without a mixing procedure.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Save */}
        {step === "save" && previewData && (
          <div className="space-y-4">
            <div>
              <Label className="text-xs text-muted-foreground">Derived Formula Name</Label>
              <Input
                value={derivedName}
                onChange={e => setDerivedName(e.target.value)}
                className="bg-background border-border/50 mt-1"
                placeholder="e.g., My EDP — Spring Edition"
              />
            </div>

            <Card className="bg-secondary/20 border-border/30">
              <CardContent className="pt-3 pb-3 space-y-2">
                <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Summary</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div><span className="text-muted-foreground">Parent:</span> <span className="font-medium">{formulaName}</span></div>
                  <div><span className="text-muted-foreground">Product:</span> <span className="font-medium">{previewData.productType.name}</span></div>
                  <div><span className="text-muted-foreground">Batch:</span> <span className="font-medium">{previewData.batchSizeGrams.toFixed(1)}g</span></div>
                  <div><span className="text-muted-foreground">Load:</span> <span className="font-medium">{previewData.fragranceLoadPercent}%</span></div>
                  <div><span className="text-muted-foreground">Ingredients:</span> <span className="font-medium">{previewData.scaledIngredients.length}</span></div>
                  <div><span className="text-muted-foreground">Mixing:</span> <span className="font-medium">{mixingProcedure ? "Included" : "Not generated"}</span></div>
                </div>
              </CardContent>
            </Card>

            <div className="flex items-start gap-2 rounded-md border border-border/30 bg-secondary/10 px-3 py-2">
              <Info className="size-3.5 text-muted-foreground mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                The derived formula will be saved as a new independent formula linked to its parent. It can be edited, scaled, exported, and versioned like any other formula. Status: <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4 ml-1">Derived</Badge>
              </p>
            </div>
          </div>
        )}

        {/* Footer Navigation */}
        <DialogFooter className="flex justify-between sm:justify-between">
          <div>
            {step !== "configure" && (
              <Button
                variant="outline" size="sm"
                onClick={() => setStep(step === "save" ? "preview" : "configure")}
              >
                <ArrowLeft className="size-3.5 mr-1" /> Back
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => handleClose(false)}>
              Cancel
            </Button>
            {step === "configure" && (
              <Button
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={handlePreview}
                disabled={!productTypeId || !batchSizeValue || previewMutation.isPending}
              >
                {previewMutation.isPending ? (
                  <><Loader2 className="size-3.5 animate-spin mr-1" /> Calculating...</>
                ) : (
                  <>Preview <ArrowRight className="size-3.5 ml-1" /></>
                )}
              </Button>
            )}
            {step === "preview" && (
              <Button
                size="sm"
                className="bg-accent text-accent-foreground hover:bg-accent/90"
                onClick={() => setStep("save")}
              >
                Continue to Save <ArrowRight className="size-3.5 ml-1" />
              </Button>
            )}
            {step === "save" && (
              <Button
                size="sm"
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                onClick={handleSave}
                disabled={!derivedName.trim() || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <><Loader2 className="size-3.5 animate-spin mr-1" /> Saving...</>
                ) : (
                  <><Check className="size-3.5 mr-1" /> Save Derived Formula</>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
