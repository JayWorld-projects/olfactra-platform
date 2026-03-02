export const PYRAMID_POSITIONS = [
  { value: "top", label: "Top", icon: "▲", description: "First impression, 15-30 min" },
  { value: "top-heart", label: "Top-Heart", icon: "◆", description: "Bridge note, 30 min-1 hr" },
  { value: "heart", label: "Heart", icon: "●", description: "Core character, 1-3 hrs" },
  { value: "heart-base", label: "Heart-Base", icon: "◆", description: "Transition, 3-5 hrs" },
  { value: "base", label: "Base", icon: "■", description: "Foundation, 5+ hrs" },
  { value: "unknown", label: "Unknown", icon: "?", description: "Not yet classified" },
] as const;

export type PyramidPosition = typeof PYRAMID_POSITIONS[number]["value"];

export const LONGEVITY_LABELS: Record<number, string> = {
  0: "Extremely Volatile",
  1: "Top Note",
  2: "Top-Heart",
  3: "Heart",
  4: "Heart-Base",
  5: "Base Note",
};

export const LONGEVITY_COLORS: Record<number, string> = {
  0: "#f97316",
  1: "#eab308",
  2: "#84cc16",
  3: "#22c55e",
  4: "#0ea5e9",
  5: "#8b5cf6",
};

export const CATEGORY_COLORS: Record<string, string> = {
  "Aldehydic": "#f59e0b",
  "Amber": "#d97706",
  "Animalic": "#92400e",
  "Anisic": "#a855f7",
  "Aromatic": "#16a34a",
  "Balsamic": "#b45309",
  "Caramel": "#ea580c",
  "Citrus": "#facc15",
  "Fixative": "#6b7280",
  "Floral": "#ec4899",
  "Fruity": "#f43f5e",
  "Gourmand": "#c2410c",
  "Green": "#22c55e",
  "Herbal": "#65a30d",
  "Leather": "#78350f",
  "Marine": "#0ea5e9",
  "Minty": "#14b8a6",
  "Musk": "#d946ef",
  "Nutty": "#a16207",
  "Powdery": "#f0abfc",
  "Smokey": "#57534e",
  "Spicy": "#dc2626",
  "Sweet": "#fb923c",
  "Woody": "#854d0e",
  "Green Woody Fresh": "#4ade80",
  "Solvents": "#94a3b8",
  "UV blockers, Conditioners and Preservatives": "#9ca3af",
  "JayLabs Accords & Bases": "#7c3aed",
  "Anti-oxidant": "#64748b",
};
