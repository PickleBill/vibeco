import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { ensureSession } from "@/lib/ensureSession";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import Simulate from "./pages/Simulate.tsx";
import Auth from "./pages/Auth.tsx";
import Report from "./pages/Report.tsx";
import MySimulations from "./pages/MySimulations.tsx";
import Portfolio from "./pages/Portfolio.tsx";
import SignalBoard from "./pages/SignalBoard.tsx";
// Inbox route hidden until Sprint 3 (auto-evaluate flywheel wiring)
// import Inbox from "./pages/Inbox.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

const App = () => {
  // Ensure every visitor has a private (anonymous) session so their reports
  // are owned by a stable auth.uid() and isolated from other visitors.
  useEffect(() => {
    ensureSession();
  }, []);

  return (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/simulate" element={<Simulate />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/my-simulations" element={<MySimulations />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/signal" element={<SignalBoard />} />
          {/* <Route path="/inbox" element={<Inbox />} /> hidden until Sprint 3 */}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  );
};

export default App;
