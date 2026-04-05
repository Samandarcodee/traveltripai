import { Switch, Route, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/not-found";
import { Layout } from "@/components/layout";

import Dashboard from "@/pages/dashboard";
import Chat from "@/pages/chat";
import Conversations from "@/pages/conversations";
import ConversationDetail from "@/pages/conversation-detail";
import Leads from "@/pages/leads";
import LeadDetail from "@/pages/lead-detail";
import Promotions from "@/pages/promotions";
import Stats from "@/pages/stats";
import CallAnalysis from "@/pages/call-analysis";
import Pipeline from "@/pages/pipeline";
import TemplatesPage from "@/pages/templates";

const queryClient = new QueryClient();

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/chat" component={Chat} />
        <Route path="/conversations" component={Conversations} />
        <Route path="/conversations/:id" component={ConversationDetail} />
        <Route path="/leads" component={Leads} />
        <Route path="/leads/:id" component={LeadDetail} />
        <Route path="/pipeline" component={Pipeline} />
        <Route path="/promotions" component={Promotions} />
        <Route path="/templates" component={TemplatesPage} />
        <Route path="/stats" component={Stats} />
        <Route path="/call-analysis" component={CallAnalysis} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
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

export default App;
