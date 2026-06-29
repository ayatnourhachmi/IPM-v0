import Link from "next/link";

type ExternalToolPageProps = {
    searchParams?: {
        tool?: string | string[];
    };
};

const toolContent = {
    startupconnect: {
        eyebrow: "StartupConnect AI",
        title: "Startup ecosystem scouting",
        description: "Explore startups matched to the active business need, compare maturity signals, and shortlist candidates for a partner conversation.",
        primaryMetric: "42",
        primaryLabel: "Matched startups",
        secondaryMetric: "8",
        secondaryLabel: "High-fit candidates",
        tabs: ["Fit", "Funding", "Maturity", "Region"],
        rows: [
            ["DataBridge Labs", "Customer support automation", "92%", "Series A"],
            ["OpsPilot AI", "Workflow copilot for service teams", "88%", "Seed"],
            ["NexuSense", "Predictive issue routing", "84%", "Series B"],
            ["ClearDesk", "Agent-assist knowledge retrieval", "79%", "Seed"],
        ],
        insights: [
            "Strongest overlap appears in customer support automation and ticket triage.",
            "Two candidates already integrate with ServiceNow and Microsoft Azure.",
            "Recommended next action: request technical due-diligence material for the top two candidates.",
        ],
    },
    aiwatch: {
        eyebrow: "AI Watch",
        title: "Market and technology intelligence",
        description: "Track AI market signals, regulatory movement, competitor activity, and capability trends related to the active business need.",
        primaryMetric: "18",
        primaryLabel: "Relevant signals",
        secondaryMetric: "5",
        secondaryLabel: "Priority alerts",
        tabs: ["Signals", "Regulation", "Competitors", "KPIs"],
        rows: [
            ["EU AI Act readiness", "Compliance impact for AI support tools", "High", "Regulatory"],
            ["Agentic service desks", "Rising adoption in enterprise operations", "High", "Market"],
            ["Azure AI Studio", "New governance features for model operations", "Medium", "Technology"],
            ["Customer support deflection", "Benchmark target ranges updated", "Medium", "KPI"],
        ],
        insights: [
            "Regulatory readiness should be treated as a delivery constraint.",
            "Market signals support prioritizing agent-assist and automated triage capabilities.",
            "Recommended next action: add compliance and model monitoring checks to the recommendation bundle.",
        ],
    },
};

export default function ExternalToolMockupPage({ searchParams }: ExternalToolPageProps) {
    const toolParam = Array.isArray(searchParams?.tool) ? searchParams?.tool[0] : searchParams?.tool;
    const tool = toolParam === "aiwatch" ? toolContent.aiwatch : toolContent.startupconnect;

    return (
        <main className="external-tool-page">
            <header className="external-tool-topbar">
                <Link href="/discovery" className="external-tool-back">Back to Discovery</Link>
                <span className="external-tool-status">Mockup preview</span>
            </header>

            <section className="external-tool-hero">
                <div>
                    <p className="external-tool-eyebrow">{tool.eyebrow}</p>
                    <h1>{tool.title}</h1>
                    <p>{tool.description}</p>
                </div>
                <div className="external-tool-metrics" aria-label="Tool metrics">
                    <div>
                        <strong>{tool.primaryMetric}</strong>
                        <span>{tool.primaryLabel}</span>
                    </div>
                    <div>
                        <strong>{tool.secondaryMetric}</strong>
                        <span>{tool.secondaryLabel}</span>
                    </div>
                </div>
            </section>

            <section className="external-tool-shell">
                <aside className="external-tool-sidebar">
                    <h2>Workspace</h2>
                    {tool.tabs.map((tab, index) => (
                        <button key={tab} type="button" className={index === 0 ? "is-active" : ""}>
                            {tab}
                        </button>
                    ))}
                </aside>

                <section className="external-tool-results">
                    <div className="external-tool-panel-head">
                        <div>
                            <h2>Ranked findings</h2>
                            <p>Mock data based on the current discovery context.</p>
                        </div>
                        <button type="button">Export shortlist</button>
                    </div>

                    <div className="external-tool-table">
                        {tool.rows.map(([name, summary, score, category]) => (
                            <article key={name}>
                                <div>
                                    <h3>{name}</h3>
                                    <p>{summary}</p>
                                </div>
                                <span>{score}</span>
                                <em>{category}</em>
                            </article>
                        ))}
                    </div>
                </section>

                <aside className="external-tool-insights">
                    <h2>AI notes</h2>
                    {tool.insights.map((insight, index) => (
                        <p key={insight}>
                            <strong>{index + 1}</strong>
                            {insight}
                        </p>
                    ))}
                </aside>
            </section>
        </main>
    );
}
