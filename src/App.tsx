import { lazy, Suspense } from "react";
import { Switch, Route, Redirect, Router as WouterRouter } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import { AppLayout } from "@/components/layout/AppLayout";
import { Loader, ErrorBoundary, RouteErrorBoundary } from "@/components/Common";
import { FeederProvider } from "@/components/Feeder";

const Dashboard = lazy(() => import("@/pages/Dashboard"));
const Audit = lazy(() => import("@/pages/Audit"));
const ChangeManagement = lazy(() => import("@/pages/ChangeManagement"));
const ConfigBackups = lazy(() => import("@/pages/ConfigBackups"));
const ToolInventory = lazy(() => import("@/pages/ToolInventory"));
const ToolDetail = lazy(() => import("@/pages/ToolDetail"));
const AddTool = lazy(() => import("@/pages/AddTool"));
const Feasibility = lazy(() => import("@/pages/Feasibility"));
const Search = lazy(() => import("@/pages/Search"));
const Settings = lazy(() => import("@/pages/Settings"));
const NotFound = lazy(() => import("@/pages/NotFound"));
const CauseDetail = lazy(() => import("@/pages/CauseDetail"));
const ControlDetail = lazy(() => import("@/pages/ControlDetail"));
const OemDetail = lazy(() => import("@/pages/OemDetail"));
const OemsOverview = lazy(() => import("@/pages/OemsOverview"));
const SnapshotDetail = lazy(() => import("@/pages/SnapshotDetail"));
const VulnInsint = lazy(() => import("@/pages/VulnInsint"));
const VulnOsint = lazy(() => import("@/pages/VulnOsint"));
const AuditChecklist = lazy(() => import("@/pages/AuditChecklist"));
const AuditDocs = lazy(() => import("@/pages/AuditDocs"));
const Sops = lazy(() => import("@/pages/Sops"));
const Policies = lazy(() => import("@/pages/Policies"));
const AdminLogin = lazy(() => import("@/pages/AdminLogin"));
const AdminOverview = lazy(() => import("@/pages/AdminOverview"));
const AdminTools = lazy(() => import("@/pages/AdminTools"));
const AdminIntegrations = lazy(() => import("@/pages/AdminIntegrations"));
const AdminWebhook = lazy(() => import("@/pages/AdminWebhook"));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

function Router() {
  return (
    <AppLayout>
      <Suspense
        fallback={
          <div className="flex justify-center py-20">
            <Loader size="lg" />
          </div>
        }
      >
        <RouteErrorBoundary>
          <Switch>
            {/* Tool Landscape */}
            <Route path="/" component={Dashboard} />
            <Route path="/oems-overview" component={OemsOverview} />

            {/* Config Mgmt */}
            <Route path="/config/changes/:snapshotId" component={ChangeManagement} />
            <Route path="/config/changes" component={ChangeManagement} />
            <Route path="/config/backups" component={ConfigBackups} />
            {/* Legacy redirects */}
            <Route path="/change/:snapshotId">
              {(params) => <Redirect to={`/config/changes/${params.snapshotId}`} />}
            </Route>
            <Route path="/change">
              <Redirect to="/config/changes" />
            </Route>

            {/* Vuln Mgmt */}
            <Route path="/vuln/insint" component={VulnInsint} />
            <Route path="/vuln/osint" component={VulnOsint} />
            <Route path="/vuln">
              <Redirect to="/vuln/insint" />
            </Route>

            {/* Audit */}
            <Route path="/audit/by-framework/:framework" component={Audit} />
            <Route path="/audit/by-framework" component={Audit} />
            <Route path="/audit/checklist" component={AuditChecklist} />
            <Route path="/audit/docs" component={AuditDocs} />
            {/*
              Legacy redirect for the prior /audit/:framework shape.
              The specific routes above (`by-framework`, `checklist`, `docs`) match first
              and never reach this wildcard, so we only need to guard the actual collisions
              and forward everything else to the new path.
            */}
            <Route path="/audit/:framework">
              {(params) =>
                params.framework === "checklist" || params.framework === "docs" ? (
                  <NotFound />
                ) : (
                  <Redirect to={`/audit/by-framework/${params.framework}`} />
                )
              }
            </Route>
            <Route path="/audit">
              <Redirect to="/audit/by-framework" />
            </Route>

            {/* SOPs + Policies */}
            <Route path="/sops/policies" component={Policies} />
            <Route path="/sops" component={Sops} />

            {/* Tools (utility) */}
            <Route path="/tools" component={ToolInventory} />
            <Route path="/tools/new" component={AddTool} />
            <Route path="/tools/:id" component={ToolDetail} />

            {/* Detail pages */}
            <Route path="/causes/:flag" component={CauseDetail} />
            <Route path="/controls/:framework/:controlId" component={ControlDetail} />
            <Route path="/oems/:oem" component={OemDetail} />
            <Route path="/snapshots/:id" component={SnapshotDetail} />
            <Route path="/feasibility" component={Feasibility} />
            <Route path="/search" component={Search} />
            <Route path="/settings" component={Settings} />

            {/* Admin */}
            <Route path="/admin/login" component={AdminLogin} />
            <Route path="/admin/tools" component={AdminTools} />
            <Route path="/admin/integrations" component={AdminIntegrations} />
            <Route path="/admin/webhooks/:toolId" component={AdminWebhook} />
            <Route path="/admin" component={AdminOverview} />

            <Route component={NotFound} />
          </Switch>
        </RouteErrorBoundary>
      </Suspense>
    </AppLayout>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider attribute="class" defaultTheme="dark" storageKey="abcl-secviz-theme">
        <QueryClientProvider client={queryClient}>
          <FeederProvider>
            <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
              <Router />
            </WouterRouter>
            <Toaster position="bottom-right" />
          </FeederProvider>
        </QueryClientProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
