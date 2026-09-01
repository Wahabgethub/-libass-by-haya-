import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CartProvider } from "@/contexts/CartContext";
import { MotionConfig } from "framer-motion";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Admin from "./pages/Admin";
import ProductDetail from "./pages/ProductDetail";
import Shop from "./pages/Shop";
import Checkout from "./pages/Checkout";
import Receipt from "./pages/Receipt";
import { ProductReviewMount } from "./components/ProductReviews";
import { WhatsAppButton } from "./components/WhatsAppButton";

function ScrollToTop() {
  const [location] = useLocation();
  useEffect(() => { if ("scrollRestoration" in window.history) window.history.scrollRestoration = "manual"; }, []);
  useEffect(() => { window.scrollTo(0, 0); }, [location]);
  return null;
}

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/shop"} component={Shop} />
      <Route path={"/collections"} component={Shop} />
      <Route path={"/products/:handle"} component={ProductDetail} />
      <Route path={"/checkout"} component={Checkout} />
      <Route path={"/receipt/:orderNumber"} component={Receipt} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <MotionConfig reducedMotion="user">
      <ThemeProvider
        defaultTheme="dark"
        // switchable
      >
        <TooltipProvider>
          <CartProvider><Toaster /><ScrollToTop /><Router /><ProductReviewMount /><WhatsAppButton /></CartProvider>
        </TooltipProvider>
      </ThemeProvider>
      </MotionConfig>
    </ErrorBoundary>
  );
}

export default App;
