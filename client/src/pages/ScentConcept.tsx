import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { DashboardLayoutSkeleton } from "@/components/DashboardLayoutSkeleton";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useNavItems } from "./Home";
import { trpc } from "@/lib/trpc";
import { Sparkles, Loader2, Lightbulb } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Streamdown } from "streamdown";

const EXAMPLE_CONCEPTS = [
  "A warm summer evening on a Mediterranean terrace, with jasmine blooming on old stone walls and the faint scent of sea salt in the air.",
  "Walking through a cedar forest after rain, with damp earth, moss-covered bark, and a hint of wild berries.",
  "A cozy winter library with leather-bound books, a crackling fireplace, and a cup of spiced chai.",
  "A fresh spring morning in a Japanese garden with cherry blossoms, green tea, and clean linen drying in the breeze.",
];

export default function ScentConcept() {
  const { loading } = useAuth();
  const navItems = useNavItems();
  if (loading) return <DashboardLayoutSkeleton />;

  return (
    <DashboardLayout navItems={navItems} currentPath="/concept" title="JayLabs Perfumery Studio">
      <ScentConceptContent />
    </DashboardLayout>
  );
}

function ScentConceptContent() {
  const [concept, setConcept] = useState("");
  const [result, setResult] = useState<string | null>(null);

  const scentMutation = trpc.formula.scentConcept.useMutation({
    onSuccess: (data) => {
      setResult(data.content as string);
    },
    onError: () => {
      toast.error("Failed to generate suggestions. Please try again.");
    },
  });

  const handleGenerate = () => {
    if (!concept.trim()) {
      toast.error("Please describe a scent concept first.");
      return;
    }
    setResult(null);
    scentMutation.mutate({ concept: concept.trim() });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-serif font-bold">Scent Lab</h2>
        <p className="text-muted-foreground mt-1">
          Describe a memory, place, or feeling and get formula suggestions drawn from your ingredient library.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Sparkles className="size-4 text-primary" /> Describe Your Scent Concept
              </CardTitle>
              <CardDescription>
                Be as descriptive as possible. Include sensory details, emotions, settings, or specific scent references.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Describe a memory, place, or feeling you want to capture in a fragrance..."
                value={concept}
                onChange={e => setConcept(e.target.value)}
                rows={5}
                className="resize-none"
              />
              <Button
                onClick={handleGenerate}
                disabled={scentMutation.isPending || !concept.trim()}
                className="w-full sm:w-auto"
              >
                {scentMutation.isPending ? (
                  <><Loader2 className="size-4 animate-spin" /> Generating Suggestions...</>
                ) : (
                  <><Sparkles className="size-4" /> Generate Formula Suggestions</>
                )}
              </Button>
            </CardContent>
          </Card>

          {result && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">AI Formula Suggestions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="prose prose-sm max-w-none">
                  <Streamdown>{result}</Streamdown>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Lightbulb className="size-4" /> Inspiration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {EXAMPLE_CONCEPTS.map((ex, i) => (
                <button
                  key={i}
                  className="w-full text-left p-3 rounded-lg border hover:bg-accent transition-colors text-sm text-muted-foreground hover:text-foreground"
                  onClick={() => setConcept(ex)}
                >
                  "{ex.slice(0, 80)}..."
                </button>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
