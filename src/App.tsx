import { useEffect, lazy, Suspense } from "react";
import { MotionConfig } from "framer-motion";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation } from "react-router-dom";
const Examples = lazy(() => import("./pages/Examples"));
const AboutBill = lazy(() => import("./pages/AboutBill"));
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
const Simulate = lazy(() => import("./pages/Simulate.tsx"));
const Auth = lazy(() => import("./pages/Auth.tsx"));
const Report = lazy(() => import("./pages/Report.tsx"));
const MySimulations = lazy(() => import("./pages/MySimulations.tsx"));
const Portfolio = lazy(() => import("./pages/Portfolio.tsx"));
const SignalBoard = lazy(() => import("./pages/SignalBoard.tsx"));
const Hub = lazy(() => import("./pages/Hub.tsx"));
// Inbox route hidden until Sprint 3 (auto-evaluate flywheel wiring)
// import Inbox from "./pages/Inbox.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

function RoutePosition() {
  const {pathname, hash} = useLocation();
  useEffect(() => {
    if (!hash) { window.scrollTo(0,0); return; }
    let stopped = false;
    const scroll = () => {
      if(stopped)return;
      let id: string;
      try { id=decodeURIComponent(hash.slice(1)); } catch { return; }
      const target = document.getElementById(id);
      if (target) { target.scrollIntoView({behavior:'auto',block:'start'}); observer.disconnect(); }
    };
    const observer=new MutationObserver(scroll);
    observer.observe(document.body,{childList:true,subtree:true});
    const frame=requestAnimationFrame(scroll);
    return () => { stopped=true; observer.disconnect(); cancelAnimationFrame(frame); };
  },[pathname,hash]);
  return null;
}
const App = () => {
  return (
  <QueryClientProvider client={queryClient}>
    <MotionConfig reducedMotion="user"><TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter><RoutePosition />
        <Suspense fallback={<main id="main-content" className="min-h-screen flex items-center justify-center" role="status">Opening VibeCo…</main>}><Routes>
          <Route path="/" element={<Index />} />
          <Route path="/examples" element={<Examples />} />
          <Route path="/about" element={<AboutBill />} />
          <Route path="/simulate" element={<Simulate />} />
          <Route path="/auth" element={<Auth />} />
          <Route path="/report/:id" element={<Report />} />
          <Route path="/my-simulations" element={<MySimulations />} />
          <Route path="/portfolio" element={<Portfolio />} />
          <Route path="/signal" element={<SignalBoard />} />
          <Route path="/hub" element={<Hub />} />
          {/* <Route path="/inbox" element={<Inbox />} /> hidden until Sprint 3 */}
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes></Suspense>
      </BrowserRouter>
    </TooltipProvider></MotionConfig>
  </QueryClientProvider>
  );
};

export default App;
