import { useNavigate } from "react-router-dom";

function HelpGuide() {
  const navigate = useNavigate();

  const quickStartSteps = [
    {
      number: "01",
      title: "Create a Workspace",
      description:
        "Workspaces help you organize related projects in one place.",
      actionLabel: "Open Workspaces",
      action: () => navigate("/workspaces"),
      accent: "cyan",
    },
    {
      number: "02",
      title: "Create a Project",
      description:
        "Start a project inside a workspace and choose the Tanio module you want to use.",
      actionLabel: "Open Projects",
      action: () => navigate("/projects"),
      accent: "blue",
    },
    {
      number: "03",
      title: "Launch an AI Module",
      description:
        "Use Product Architect or Tabletop Creator to generate AI-powered project content.",
      actionLabel: "Open Dashboard",
      action: () => navigate("/"),
      accent: "purple",
    },
    {
      number: "04",
      title: "Save Your Content",
      description:
        "Store generated content in your Content Library so you can return to it later.",
      actionLabel: "Open Content Library",
      action: () => navigate("/content"),
      accent: "emerald",
    },
  ];

  const sections = [
    {
      title: "Dashboard",
      subtitle: "Your home base",
      icon: "⌂",
      accent: "cyan",
      description:
        "The Dashboard gives you a quick overview of your projects, AI usage, activity, modules, and shortcuts.",
      tips: [
        "Create a new project directly from the Dashboard.",
        "Choose Product Architect or Tabletop Creator when creating a project.",
        "Use the search bar to quickly open modules and major sections.",
        "Check Recent Activity to see your latest work.",
      ],
      actionLabel: "Open Dashboard",
      action: () => navigate("/"),
    },
    {
      title: "Workspaces",
      subtitle: "Organize your work",
      icon: "🗂️",
      accent: "blue",
      description:
        "Workspaces are the top-level containers that keep related projects grouped together.",
      tips: [
        "Create separate workspaces for different ideas, teams, or goals.",
        "Every project must belong to a workspace.",
        "Use clear workspace names so projects are easy to find later.",
      ],
      actionLabel: "Open Workspaces",
      action: () => navigate("/workspaces"),
    },
    {
      title: "Projects",
      subtitle: "Where your ideas live",
      icon: "📁",
      accent: "indigo",
      description:
        "Projects hold the information and generated content for a specific product idea, campaign, or creative goal.",
      tips: [
        "Give each project a clear name and useful description.",
        "Projects can be created from the Projects page or directly from the Dashboard.",
        "When creating from the Dashboard, Tanio can automatically open your chosen module.",
      ],
      actionLabel: "Open Projects",
      action: () => navigate("/projects"),
    },
    {
      title: "Product Architect",
      subtitle: "AI product planning",
      icon: "⚡",
      accent: "cyan",
      description:
        "Product Architect helps turn an idea into structured product strategy, documentation, and branding.",
      tips: [
        "Generate Product Requirements Documents.",
        "Create user personas and user stories.",
        "Build feature lists and technical architecture.",
        "Generate and customize product logos.",
        "Use regeneration instructions to refine generated results.",
      ],
      actionLabel: "Open Product Architect",
      action: () => navigate("/product-architect"),
    },
    {
      title: "Tabletop Creator",
      subtitle: "AI tabletop design",
      icon: "🎲",
      accent: "purple",
      description:
        "Tabletop Creator helps you build complete campaigns, characters, quests, encounters, and locations.",
      tips: [
        "Start by defining your campaign name and description.",
        "Generate campaign structure, NPCs, quests, encounters, and locations.",
        "Regenerate content with custom instructions when you want changes.",
        "Save useful results into your workspace.",
      ],
      actionLabel: "Open Tabletop Creator",
      action: () => navigate("/tabletop-creator"),
    },
    {
      title: "Content Library",
      subtitle: "Your saved AI content",
      icon: "📄",
      accent: "emerald",
      description:
        "The Content Library stores the generated material you choose to save across your Tanio projects.",
      tips: [
        "Search saved content by title or type.",
        "Filter content by project.",
        "Open saved content whenever you need to revisit previous AI generations.",
        "Use version history when content has been updated.",
      ],
      actionLabel: "Open Content Library",
      action: () => navigate("/content"),
    },
  ];

  const getAccentClasses = (accent) => {
    const accents = {
      cyan: {
        icon: "border-cyan-800 bg-cyan-950/70 text-cyan-300",
        border: "hover:border-cyan-800",
        text: "text-cyan-400",
        button:
          "bg-cyan-500 text-slate-950 hover:bg-cyan-400",
      },
      blue: {
        icon: "border-blue-800 bg-blue-950/70 text-blue-300",
        border: "hover:border-blue-800",
        text: "text-blue-400",
        button:
          "bg-blue-600 text-white hover:bg-blue-500",
      },
      indigo: {
        icon: "border-indigo-800 bg-indigo-950/70 text-indigo-300",
        border: "hover:border-indigo-800",
        text: "text-indigo-400",
        button:
          "bg-indigo-600 text-white hover:bg-indigo-500",
      },
      purple: {
        icon: "border-purple-800 bg-purple-950/70 text-purple-300",
        border: "hover:border-purple-800",
        text: "text-purple-400",
        button:
          "bg-purple-600 text-white hover:bg-purple-500",
      },
      emerald: {
        icon: "border-emerald-800 bg-emerald-950/70 text-emerald-300",
        border: "hover:border-emerald-800",
        text: "text-emerald-400",
        button:
          "bg-emerald-600 text-white hover:bg-emerald-500",
      },
    };

    return accents[accent] || accents.cyan;
  };

  return (
    <main className="flex-1 bg-slate-950/30 p-6 md:p-8 lg:p-10">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 p-6 shadow-2xl shadow-black/10 md:p-8">
        <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-32 left-1/3 h-72 w-72 rounded-full bg-purple-500/10 blur-3xl" />

        <div className="relative max-w-4xl">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-cyan-800/80 bg-cyan-950/50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-cyan-300">
              Tanio Guide
            </span>

            <span className="text-xs font-medium text-slate-500">
              Getting Started & Help
            </span>
          </div>

          <h1 className="mt-5 text-3xl font-bold tracking-tight text-white md:text-4xl lg:text-5xl">
            Learn Tanio in a few minutes.
          </h1>

          <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-400 md:text-base">
            Follow the quick-start flow below or jump directly to a section to
            learn how each part of Tanio works.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                document
                  .getElementById("quick-start")
                  ?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
              }
              className="rounded-xl bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400"
            >
              Start Quick Guide
            </button>

            <button
              type="button"
              onClick={() => navigate("/")}
              className="rounded-xl border border-slate-700 bg-slate-900 px-5 py-2.5 font-semibold text-slate-300 transition hover:bg-slate-800 hover:text-white"
            >
              Back to Dashboard
            </button>
          </div>
        </div>
      </section>

      {/* Quick Start */}
      <section
        id="quick-start"
        className="mt-10 scroll-mt-24"
      >
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Getting Started
          </p>

          <h2 className="mt-1 text-2xl font-bold text-white">
            Quick Start
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            The basic Tanio workflow from start to finish.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          {quickStartSteps.map((step) => {
            const accent = getAccentClasses(step.accent);

            return (
              <article
                key={step.number}
                className={`group rounded-2xl border border-slate-800 bg-slate-900/80 p-5 transition hover:-translate-y-0.5 ${accent.border}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span
                    className={`text-sm font-bold ${accent.text}`}
                  >
                    {step.number}
                  </span>

                  <span className="text-slate-700">→</span>
                </div>

                <h3 className="mt-4 text-lg font-bold text-white">
                  {step.title}
                </h3>

                <p className="mt-2 min-h-[60px] text-sm leading-6 text-slate-400">
                  {step.description}
                </p>

                <button
                  type="button"
                  onClick={step.action}
                  className="mt-5 text-sm font-semibold text-cyan-400 transition hover:text-cyan-300"
                >
                  {step.actionLabel} →
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* How Tanio Works */}
      <section className="mt-12">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            App Guide
          </p>

          <h2 className="mt-1 text-2xl font-bold text-white">
            How Tanio Works
          </h2>

          <p className="mt-1 text-sm text-slate-400">
            Explore each major part of the platform.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
          {sections.map((section) => {
            const accent = getAccentClasses(section.accent);

            return (
              <article
                key={section.title}
                className={`group rounded-2xl border border-slate-800 bg-slate-900/75 p-6 transition hover:-translate-y-0.5 ${accent.border}`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-xl ${accent.icon}`}
                  >
                    {section.icon}
                  </div>

                  <div className="min-w-0">
                    <p
                      className={`text-xs font-semibold uppercase tracking-[0.14em] ${accent.text}`}
                    >
                      {section.subtitle}
                    </p>

                    <h3 className="mt-1 text-xl font-bold text-white">
                      {section.title}
                    </h3>

                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      {section.description}
                    </p>
                  </div>
                </div>

                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-950/50 p-4">
                  <p className="mb-3 text-sm font-semibold text-slate-300">
                    Helpful tips
                  </p>

                  <div className="space-y-2.5">
                    {section.tips.map((tip) => (
                      <div
                        key={tip}
                        className="flex items-start gap-3"
                      >
                        <span
                          className={`mt-1 text-xs ${accent.text}`}
                          aria-hidden="true"
                        >
                          ◆
                        </span>

                        <p className="text-sm leading-5 text-slate-400">
                          {tip}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={section.action}
                  className={`mt-5 inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${accent.button}`}
                >
                  {section.actionLabel}
                  <span aria-hidden="true">→</span>
                </button>
              </article>
            );
          })}
        </div>
      </section>

      {/* Product Architect vs Tabletop Creator */}
      <section className="mt-12">
        <div className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">
            Choosing a Module
          </p>

          <h2 className="mt-1 text-2xl font-bold text-white">
            Which module should I use?
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          <div className="relative overflow-hidden rounded-2xl border border-cyan-900/80 bg-gradient-to-br from-cyan-950/35 via-slate-900 to-slate-900 p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-cyan-400/10 blur-3xl" />

            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-800 bg-cyan-950/80 text-2xl">
                ⚡
              </div>

              <h3 className="mt-5 text-xl font-bold text-white">
                Use Product Architect when...
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                You&apos;re planning a product, application, startup idea,
                feature, or other software/business concept.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "PRDs",
                  "Personas",
                  "User Stories",
                  "Features",
                  "Architecture",
                  "Logos",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-cyan-900/80 bg-cyan-950/30 px-2.5 py-1 text-xs font-medium text-cyan-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-2xl border border-purple-900/80 bg-gradient-to-br from-purple-950/35 via-slate-900 to-slate-900 p-6">
            <div className="pointer-events-none absolute -right-16 -top-20 h-44 w-44 rounded-full bg-purple-400/10 blur-3xl" />

            <div className="relative">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-purple-800 bg-purple-950/80 text-2xl">
                🎲
              </div>

              <h3 className="mt-5 text-xl font-bold text-white">
                Use Tabletop Creator when...
              </h3>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                You&apos;re creating a tabletop RPG campaign, story world,
                character, adventure, quest, or encounter.
              </p>

              <div className="mt-5 flex flex-wrap gap-2">
                {[
                  "Campaigns",
                  "NPCs",
                  "Quests",
                  "Encounters",
                  "Locations",
                  "Worldbuilding",
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-lg border border-purple-900/80 bg-purple-950/30 px-2.5 py-1 text-xs font-medium text-purple-200"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tips */}
      <section className="mt-12">
        <div className="rounded-2xl border border-slate-800 bg-slate-900/75 p-6">
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-amber-800 bg-amber-950/60 text-xl">
              💡
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">
                Tips for better AI results
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                The more useful context you give Tanio, the more useful the
                generated content can be.
              </p>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="font-semibold text-white">
                Be descriptive
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Explain the purpose, audience, style, goals, and important
                details of your project instead of using only a short sentence.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="font-semibold text-white">
                Use regeneration instructions
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                If the first result is close but not perfect, tell Tanio exactly
                what you want changed when you regenerate it.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="font-semibold text-white">
                Save useful versions
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Save generated content to your workspace so you can revisit it
                later instead of relying only on the current generation.
              </p>
            </div>

            <div className="rounded-xl border border-slate-800 bg-slate-950/50 p-4">
              <p className="font-semibold text-white">
                Experiment
              </p>

              <p className="mt-2 text-sm leading-6 text-slate-400">
                Try more detailed prompts, different directions, and multiple
                versions to find the result that fits your project best.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="mt-12 pb-4">
        <div className="flex flex-col items-start justify-between gap-5 rounded-2xl border border-cyan-900/70 bg-cyan-950/20 p-6 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-white">
              Ready to start building?
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Head back to the Dashboard and create your next Tanio project.
            </p>
          </div>

          <button
            type="button"
            onClick={() => navigate("/")}
            className="shrink-0 rounded-xl bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400"
          >
            Go to Dashboard →
          </button>
        </div>
      </section>
    </main>
  );
}

export default HelpGuide;