import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Library from "./pages/Library";
import IngredientDetail from "./pages/IngredientDetail";
import FormulaList from "./pages/FormulaList";
import FormulaBuilder from "./pages/FormulaBuilder";
import ScentConcept from "./pages/ScentConcept";
import ImportPage from "./pages/ImportPage";
import FormulaCompare from "./pages/FormulaCompare";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/library" component={Library} />
      <Route path="/library/:id" component={IngredientDetail} />
      <Route path="/formulas" component={FormulaList} />
      <Route path="/formulas/compare/:idA/:idB" component={FormulaCompare} />
      <Route path="/formulas/:id" component={FormulaBuilder} />
      <Route path="/concept" component={ScentConcept} />
      <Route path="/import" component={ImportPage} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
