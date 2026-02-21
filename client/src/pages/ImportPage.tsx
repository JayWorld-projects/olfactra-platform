import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from "lucide-react";
import { useState, useRef } from "react";
import { toast } from "sonner";

type ParsedRow = {
  name: string;
  casNumber: string;
  supplier: string;
  category: string;
  inventoryAmount: string;
  costPerGram: string;
  ifraLimit: string;
  longevity: number;
  description: string;
};

function parseTSV(text: string): ParsedRow[] {
  const lines = text.split("\n").filter(l => l.trim());
  if (lines.length < 2) return [];
  const rows: ParsedRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split("\t");
    if (cols.length < 1 || !cols[0]?.trim()) continue;
    const extraDesc = cols.slice(8).filter(c => c.trim()).join(" ").trim();
    const mainDesc = (cols[8] || "").trim();
    const fullDesc = [mainDesc, extraDesc].filter(Boolean).join(" ");
    rows.push({
      name: (cols[0] || "").trim(),
      casNumber: (cols[1] || "").trim(),
      supplier: (cols[2] || "").trim(),
      category: (cols[3] || "").trim(),
      inventoryAmount: (cols[4] || "").trim(),
      costPerGram: (cols[5] || "").trim(),
      ifraLimit: (cols[6] || "").trim(),
      longevity: parseInt(cols[7] || "2") || 2,
      description: fullDesc,
    });
  }
  return rows;
}

function parseCSV(text: string): ParsedRow[] {
  const lines: string[][] = [];
  let current: string[] = [];
  let inQuotes = false;
  let field = "";
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') { field += '"'; i++; }
      else if (ch === '"') { inQuotes = false; }
      else { field += ch; }
    } else {
      if (ch === '"') { inQuotes = true; }
      else if (ch === ",") { current.push(field); field = ""; }
      else if (ch === "\n" || ch === "\r") {
        if (ch === "\r" && text[i + 1] === "\n") i++;
        current.push(field); field = "";
        if (current.some(c => c.trim())) lines.push(current);
        current = [];
      } else { field += ch; }
    }
  }
  current.push(field);
  if (current.some(c => c.trim())) lines.push(current);

  if (lines.length < 2) return [];
  const header = lines[0].map(h => h.trim().toLowerCase());
  const rows: ParsedRow[] = [];

  const findCol = (names: string[]) => {
    for (const n of names) { const idx = header.findIndex(h => h.includes(n)); if (idx >= 0) return idx; }
    return -1;
  };

  const nameIdx = findCol(["name"]);
  const casIdx = findCol(["cas", "botanical"]);
  const supplierIdx = findCol(["supplier"]);
  const categoryIdx = findCol(["category"]);
  const inventoryIdx = findCol(["inventory", "amount", "stock"]);
  const costIdx = findCol(["cost"]);
  const ifraIdx = findCol(["ifra", "limit"]);
  const longevityIdx = findCol(["longevity", "substantivity"]);
  const descIdx = findCol(["description", "desc"]);

  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i];
    const name = nameIdx >= 0 ? (cols[nameIdx] || "").trim() : "";
    if (!name) continue;
    rows.push({
      name,
      casNumber: casIdx >= 0 ? (cols[casIdx] || "").trim() : "",
      supplier: supplierIdx >= 0 ? (cols[supplierIdx] || "").trim() : "",
      category: categoryIdx >= 0 ? (cols[categoryIdx] || "").trim() : "",
      inventoryAmount: inventoryIdx >= 0 ? (cols[inventoryIdx] || "").trim() : "",
      costPerGram: costIdx >= 0 ? (cols[costIdx] || "").trim() : "",
      ifraLimit: ifraIdx >= 0 ? (cols[ifraIdx] || "").trim() : "",
      longevity: longevityIdx >= 0 ? parseInt(cols[longevityIdx] || "2") || 2 : 2,
      description: descIdx >= 0 ? (cols[descIdx] || "").trim() : "",
    });
  }
  return rows;
}

export default function ImportPage() {
  const { loading } = useAuth();
  const navItems = useNavItems();
  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <DashboardLayout navItems={navItems} currentPath="/import" title="Olfactra">
      <ImportContent />
    </DashboardLayout>
  );
}

function ImportContent() {
  const fileRef = useRef<HTMLInputElement>(null);
  const [parsed, setParsed] = useState<ParsedRow[]>([]);
  const [fileName, setFileName] = useState("");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ success: boolean; count: number } | null>(null);

  const utils = trpc.useUtils();
  const bulkImportMutation = trpc.ingredient.bulkImport.useMutation({
    onSuccess: (data) => {
      setImportResult({ success: true, count: data.count });
      utils.ingredient.list.invalidate();
      utils.ingredient.categories.invalidate();
      utils.ingredient.suppliers.invalidate();
      toast.success(`Successfully imported ${data.count} ingredients`);
      setImporting(false);
    },
    onError: (err) => {
      setImportResult({ success: false, count: 0 });
      toast.error("Import failed: " + err.message);
      setImporting(false);
    },
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    setImportResult(null);
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      let rows: ParsedRow[];
      if (file.name.endsWith(".tsv") || file.name.endsWith(".txt")) { rows = parseTSV(text); }
      else { rows = parseCSV(text); }
      setParsed(rows);
      if (rows.length === 0) toast.error("No valid rows found in the file.");
    };
    reader.readAsText(file);
  };

  const handleImport = () => {
    if (parsed.length === 0) return;
    setImporting(true);
    const batchSize = 50;
    const batches: ParsedRow[][] = [];
    for (let i = 0; i < parsed.length; i += batchSize) batches.push(parsed.slice(i, i + batchSize));

    let imported = 0;
    const importBatch = async (idx: number) => {
      if (idx >= batches.length) {
        setImportResult({ success: true, count: imported });
        utils.ingredient.list.invalidate();
        utils.ingredient.categories.invalidate();
        toast.success(`Successfully imported ${imported} ingredients`);
        setImporting(false);
        return;
      }
      try {
        const result = await bulkImportMutation.mutateAsync({ ingredients: batches[idx] });
        imported += result.count;
        await importBatch(idx + 1);
      } catch {
        setImportResult({ success: false, count: imported });
        toast.error(`Import partially failed at batch ${idx + 1}`);
        setImporting(false);
      }
    };
    importBatch(0);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold text-foreground">Import Materials</h2>
        <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
          Upload your ingredient library from a CSV or TSV file. The system will parse and preview the data before importing.
        </p>
      </div>

      <Card className="bg-card border-border/50">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">Upload File</CardTitle>
          <CardDescription className="text-muted-foreground">
            Supported formats: CSV, TSV. Expected columns: Name, CAS/Botanical, Supplier, Category, Inventory Amount, Cost per Gram, IFRA Limit, Longevity, Description.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <input ref={fileRef} type="file" accept=".csv,.tsv,.txt" onChange={handleFile} className="hidden" />
          <div
            className="border-2 border-dashed border-border/50 rounded-xl p-10 text-center cursor-pointer hover:border-primary/50 transition-all hover:bg-secondary/30"
            onClick={() => fileRef.current?.click()}
          >
            <div className="size-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-3">
              <Upload className="size-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground">Click to upload or drag and drop</p>
            <p className="text-xs text-muted-foreground mt-1">CSV, TSV, or TXT files</p>
          </div>

          {fileName && (
            <div className="flex items-center gap-2 text-sm">
              <FileText className="size-4 text-primary" />
              <span className="font-medium text-foreground">{fileName}</span>
              <Badge variant="secondary" className="bg-secondary text-secondary-foreground">{parsed.length} rows parsed</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      {parsed.length > 0 && (
        <Card className="bg-card border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <div>
              <CardTitle className="text-base font-semibold">Preview ({parsed.length} ingredients)</CardTitle>
              <CardDescription className="text-muted-foreground">Review the parsed data before importing.</CardDescription>
            </div>
            <Button onClick={handleImport} disabled={importing} className="bg-primary hover:bg-primary/90 text-primary-foreground">
              {importing ? (
                <><Loader2 className="size-4 animate-spin" /> Importing...</>
              ) : (
                <><Upload className="size-4" /> Import All ({parsed.length})</>
              )}
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto max-h-96">
              <Table>
                <TableHeader>
                  <TableRow className="border-border/50">
                    {["#", "Name", "CAS", "Supplier", "Category", "Stock", "$/g", "IFRA", "Long."].map(h => (
                      <TableHead key={h} className="sticky top-0 bg-card text-muted-foreground z-10">{h}</TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.slice(0, 50).map((row, i) => (
                    <TableRow key={i} className="border-border/30">
                      <TableCell className="text-xs text-muted-foreground tabular-nums">{i + 1}</TableCell>
                      <TableCell className="font-medium text-sm max-w-[200px] truncate text-foreground">{row.name}</TableCell>
                      <TableCell className="text-xs max-w-[150px] truncate font-mono">{row.casNumber || "—"}</TableCell>
                      <TableCell className="text-xs">{row.supplier || "—"}</TableCell>
                      <TableCell className="text-xs">{row.category || "—"}</TableCell>
                      <TableCell className="text-xs">{row.inventoryAmount || "—"}</TableCell>
                      <TableCell className="text-xs text-accent">{row.costPerGram || "—"}</TableCell>
                      <TableCell className="text-xs">{row.ifraLimit || "—"}</TableCell>
                      <TableCell className="text-xs tabular-nums">{row.longevity}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {parsed.length > 50 && (
                <p className="text-xs text-muted-foreground text-center py-3">
                  Showing first 50 of {parsed.length} rows
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {importResult && (
        <Card className={`border-border/50 ${importResult.success ? "bg-emerald-500/10 border-emerald-500/30" : "bg-destructive/10 border-destructive/30"}`}>
          <CardContent className="pt-4 pb-4 flex items-center gap-3">
            {importResult.success ? (
              <><CheckCircle className="size-5 text-emerald-400" /><span className="text-sm font-medium text-emerald-300">Successfully imported {importResult.count} ingredients into your library.</span></>
            ) : (
              <><AlertCircle className="size-5 text-destructive" /><span className="text-sm font-medium text-destructive">Import failed. Please check your file format and try again.</span></>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
