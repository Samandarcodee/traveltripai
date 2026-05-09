import React, { Suspense, lazy } from "react";
import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ErrorBoundary } from "@/components/error-boundary";
import { PageSkeleton, DashboardSkeleton, ListSkeleton } from "@/components/page-skeleton";
import { queryClient } from "@/lib/query-client";
import { Layout } from "@/components/layout";

const Dashboard = lazy(() => import("@/pages/dashboard"));
const Chat = lazy(() => import("@/pages/chat"));
const Conversations = lazy(() => import("@/pages/conversations"));
const ConversationDetail = lazy(() => import("@/pages/conversation-detail"));
const Leads = lazy(() => import("@/pages/leads"));
const LeadDetail = lazy(() => import("@/pages/lead-detail"));
const Promotions = lazy(() => import("@/pages/promotions"));
const Stats = lazy(() => import("@/pages/stats"));
const CallAnalysis = lazy(() => import("@/pages/call-analysis"));
const Pipeline = lazy(() => import("@/pages/pipeline"));
const TemplatesPage = lazy(() => import("@/pages/templates"));
const Settings = lazy(() => import("@/pages/settings"));
const NotFound = lazy(() => import("@/pages/not-found"));

function Router() {
  return (
    <Layout>
      <ErrorBoundary>
        <Switch>
          <Route path="/">
            <Suspense fallback={<DashboardSkeleton />}>
              <Dashboard />
            </Suspense>
          </Route>
          <Route path="/chat">
            <Suspense fallback={<PageSkeleton />}>
              <Chat />
            </Suspense>
          </Route>
          <Route path="/conversations">
            <Suspense fallback={<ListSkeleton />}>
              <Conversations />
            </Suspense>
          </Route>
          <Route path="/conversations/:id">
            <Suspense fallback={<PageSkeleton />}>
              <ConversationDetail />
            </Suspense>
          </Route>
          <Route path="/leads">
            <Suspense fallback={<PageSkeleton />}>
              <Leads />
            </Suspense>
          </Route>
          <Route path="/leads/:id">
            <Suspense fallback={<PageSkeleton />}>
              <LeadDetail />
            </Suspense>
          </Route>
          <Route path="/pipeline">
            <Suspense fallback={<PageSkeleton />}>
              <Pipeline />
            </Suspense>
          </Route>
          <Route path="/promotions">
            <Suspense fallback={<PageSkeleton />}>
              <Promotions />
            </Suspense>
          </Route>
          <Route path="/templates">
            <Suspense fallback={<PageSkeleton />}>
              <TemplatesPage />
            </Suspense>
          </Route>
          <Route path="/stats">
            <Suspense fallback={<PageSkeleton />}>
              <Stats />
            </Suspense>
          </Route>
          <Route path="/call-analysis">
            <Suspense fallback={<PageSkeleton />}>
              <CallAnalysis />
            </Suspense>
          </Route>
          <Route path="/settings">
            <Suspense fallback={<PageSkeleton />}>
              <Settings />
            </Suspense>
          </Route>
          <Route>
            <Suspense fallback={null}>
              <NotFound />
            </Suspense>
          </Route>
        </Switch>
      </ErrorBoundary>
    </Layout>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Router />
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}
