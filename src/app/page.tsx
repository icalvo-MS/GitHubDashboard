import { GitHubService } from "@/services/github-service";
import { auth, signOut } from "@/auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CopilotUsageChart } from "@/components/copilot-usage-chart";
import { CopilotLanguageChart } from "@/components/copilot-language-chart";
import { CopilotAcceptanceLanguageChart } from "@/components/copilot-acceptance-language-chart";
import { CopilotImpactScorecard } from "@/components/copilot-impact-scorecard";
import { CopilotEngagementBreakdown } from "@/components/copilot-engagement-breakdown";
import { CopilotAdoptionTrends } from "@/components/copilot-adoption-trends";
import { DateRangeSelector } from "@/components/date-range-selector";
import { InfoTooltip } from "@/components/info-tooltip";

export default async function Dashboard(props: {
  searchParams: Promise<{ range?: string; tab?: string; billingYear?: string; billingMonth?: string }>;
}) {
  const searchParams = await props.searchParams;
  const range = searchParams.range || "30";
  const activeTab = searchParams.tab || "overview";
  const session = await auth();

  // For demonstration, we'll try to fetch the authenticated user if the token is present
  let user = null;
  let error = null;

  let org = null;
  let copilotSeats = null;
  let copilotUsage = null;
  let orgEvents: any[] = [];

  try {
    if (process.env.GITHUB_TOKEN) {
      const { data: userData } = await import("@/lib/github").then(m => m.githubClient.rest.users.getAuthenticated());
      user = userData;
      console.log("User Data:", { login: user.login, public_repos: user.public_repos });

      if (process.env.NEXT_PUBLIC_GITHUB_ORG) {
        try {
          const { data: orgData } = await import("@/lib/github").then(m => m.githubClient.rest.orgs.get({ org: process.env.NEXT_PUBLIC_GITHUB_ORG! }));
          org = orgData;
          console.log("Org Data:", { login: org.login, public_repos: org.public_repos, total_private_repos: org.total_private_repos });

          // Fetch Copilot Data
          const { GitHubService } = await import("@/services/github-service");
          copilotSeats = await GitHubService.getCopilotSeats(process.env.NEXT_PUBLIC_GITHUB_ORG!);
          try {
            copilotUsage = await GitHubService.getCopilotUsage(process.env.NEXT_PUBLIC_GITHUB_ORG!);
            console.log("Full Metrics Payload Length:", copilotUsage?.length);
            if (copilotUsage?.length > 0) {
              const first = copilotUsage[0];
              const middle = copilotUsage[Math.floor(copilotUsage.length / 2)];
              const last = copilotUsage[copilotUsage.length - 1];
              console.log("Structure Check (First/Mid/Last):");
              [first, middle, last].forEach((d, i) => {
                console.log(`Day ${i}:`, Object.keys(d));
              });
            }
          } catch (usageError: any) {
            console.error("Error calling getCopilotUsage:", usageError);
            // Pass error to UI for debugging
            copilotUsage = null;
            error = `Copilot Usage Error: ${usageError.message || JSON.stringify(usageError)}`;
          }

          // Fetch Org Events
          orgEvents = await GitHubService.getOrgEvents(process.env.NEXT_PUBLIC_GITHUB_ORG!);
        } catch (orgError) {
          console.error("Failed to fetch Org:", orgError);
        }
      }
    }
  } catch (e) {
    console.error("Failed to fetch user", e);
    error = "Failed to authenticate with GitHub. Please check your token.";
  }

  // Artificial delay to show loading UX
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Filter copilotUsage data based on the selected range
  let filteredUsage = copilotUsage;
  if (copilotUsage && range !== 'total') {
    const rangeInt = parseInt(range);
    filteredUsage = copilotUsage.slice(-rangeInt);
  }

  // Calculate active users from the last day of usage data if available
  const lastDayUsage = copilotUsage && copilotUsage.length > 0 ? copilotUsage[copilotUsage.length - 1] : null;
  const activeUsers = lastDayUsage ? (lastDayUsage.total_active_users || 0) : null;

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-bold tracking-tight">GitHub & Copilot Dashboard</h1>
          <p className="text-muted-foreground">Comprehensive insights for your organization metrics.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-4 border-l pl-4 ml-2">
            <div className="flex flex-col items-end">
              <span className="text-[10px] text-muted-foreground uppercase tracking-wider">Data Source</span>
              {user ? <span className="text-sm font-medium">{user.login}</span> : <span className="text-destructive text-sm">No Token</span>}
            </div>

            <div className="h-8 w-[1px] bg-border mx-2" />

            <div className="flex items-center gap-3">
              {session?.user?.image && (
                <img src={session.user.image} alt={session.user.name || "User"} className="w-8 h-8 rounded-full border" />
              )}
              <div className="flex flex-col items-start">
                <span className="text-sm font-medium">{session?.user?.name}</span>
                <form action={async () => {
                  "use server"
                  await signOut()
                }}>
                  <button type="submit" className="text-xs text-muted-foreground hover:text-red-500 transition-colors">Sign Out</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-destructive/15 text-destructive p-4 rounded-md">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs defaultValue={activeTab} className="space-y-6">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="overview" asChild>
            <a href={`?tab=overview&range=${range}`}>Overview</a>
          </TabsTrigger>
          <TabsTrigger value="premium-requests" asChild>
            <a href={`?tab=premium-requests`}>Premium Requests</a>
          </TabsTrigger>
        </TabsList>

        {/* ─── OVERVIEW TAB ──────────────────────────────────────────────────── */}
        <TabsContent value="overview" className="space-y-6">
          {/* Date range selector – only shown on overview tab */}
          <div className="flex justify-end">
            <DateRangeSelector />
          </div>

          {/* Impact Scorecard Section */}
          <CopilotImpactScorecard
            org={org}
            user={user}
            copilotSeats={copilotSeats}
            activeUsers={activeUsers}
            lastDayUsage={lastDayUsage}
          />

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <CopilotAdoptionTrends data={filteredUsage ?? undefined} />
            <CopilotEngagementBreakdown data={filteredUsage ?? undefined} />
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <CardTitle className="flex items-center gap-2">
                      Usage Trend
                      <InfoTooltip
                        title="Adoption Vector"
                        content="Tracks daily unique engaged users. Helps identify day-over-day adoption and weekly peak load."
                        insight="Weekend dips are normal; look for multi-week uptrends as teams onboard projects."
                      />
                    </CardTitle>
                    <CardDescription>Daily engaged users over the selected period</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pl-2">
                {filteredUsage ? (
                  <CopilotUsageChart data={filteredUsage} />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground italic border rounded-md border-dashed">
                    Connect GitHub and check Org permissions to see usage data
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="col-span-3 h-full">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Language Breakdown
                  <InfoTooltip
                    title="Tech Stack Affinity"
                    content="Shows which languages are benefiting most from Copilot completions."
                    insight="Dominance of Typescript/React suggests frontend teams find modern AI suggestions most relevant."
                  />
                </CardTitle>
                <CardDescription>Top active languages (Selected Period)</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {filteredUsage ? (
                  <CopilotLanguageChart data={filteredUsage} />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground italic border rounded-md border-dashed">
                    Loading language metrics...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
            <Card className="col-span-7">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Acceptance Rate by Language
                  <InfoTooltip
                    title="Technology Effectiveness"
                    content="Measures the percentage of Copilot suggestions that are actually accepted by developers, broken down by programming language."
                    insight="High acceptance rates in specific languages indicate where Copilot provides the most accurate and useful code completions."
                  />
                </CardTitle>
                <CardDescription>Percentage of suggestions accepted per language (Selected Period)</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredUsage ? (
                  <CopilotAcceptanceLanguageChart data={filteredUsage} />
                ) : (
                  <div className="h-[300px] flex items-center justify-center text-muted-foreground italic border rounded-md border-dashed">
                    Loading acceptance metrics...
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7 mt-4">
            <Card className="col-span-7">
              <CardHeader>
                <CardTitle>Recent Activity ({org?.login || 'Org'})</CardTitle>
                <CardDescription>Latest public events from the organization</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {orgEvents.length > 0 ? (
                    orgEvents.map((event: any) => (
                      <div key={event.id} className="flex items-center text-sm p-3 rounded-lg bg-muted/50 border border-transparent hover:border-border transition-colors">
                        <div className="grid gap-1">
                          <p className="font-medium leading-none">
                            {event.actor.login}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            <span className="font-semibold text-primary">{event.type.replace('Event', '')}</span> in {event.repo.name.split('/')[1] || event.repo.name}
                          </p>
                        </div>
                        <div className="ml-auto font-medium text-[10px] uppercase text-muted-foreground bg-background px-2 py-1 rounded border">
                          {formatTime(event.created_at)}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-muted-foreground col-span-3 py-10 text-center italic">No recent public activity found.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ─── PREMIUM REQUESTS TAB ──────────────────────────────────────────── */}
        <TabsContent value="premium-requests" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Premium Request Analytics</CardTitle>
              <CardDescription>Coming soon — per-user billing data will appear here.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-48 flex items-center justify-center text-muted-foreground italic border rounded-md border-dashed">
                Billing data loading…
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
