function LearningStudio() {
  const studyTools = [
    {
      name: "Lessons",
      icon: "▤",
      description:
        "Explore a topic through structured lessons with clear explanations and examples.",
    },
    {
      name: "Flashcards",
      icon: "◇",
      description:
        "Review important terms and concepts with flashcards built around your topic.",
    },
    {
      name: "Quizzes",
      icon: "✓",
      description:
        "Check your understanding with practice questions based on what you study.",
    },
  ];

  return (
    <main className="min-h-screen w-full bg-slate-950 p-5 text-white sm:p-8">
      <section className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-3xl"
            aria-hidden="true"
          >
            🎓
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
              Tanio AI
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Learning Studio
            </h1>
          </div>
        </div>

        <p className="mt-5 max-w-2xl leading-relaxed text-slate-400">
          Your space for turning topics into lessons, flashcards, and quizzes.
        </p>

        <div className="mt-7 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
          <h2 className="text-lg font-semibold text-cyan-200">
            Study tools are on the way
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-400">
            Lesson generation, flashcards, quizzes, and saving options are
            currently in development.
          </p>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {studyTools.map((tool) => (
            <article
              key={tool.name}
              className="rounded-xl border border-slate-700 bg-slate-950/60 p-5"
            >
              <span
                className="flex h-10 w-10 items-center justify-center rounded-lg bg-cyan-400/10 text-xl text-cyan-300"
                aria-hidden="true"
              >
                {tool.icon}
              </span>

              <h2 className="mt-4 text-lg font-semibold text-white">
                {tool.name}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {tool.description}
              </p>
              <p className="mt-4 text-xs font-semibold text-cyan-300">
                Coming soon
              </p>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}

export default LearningStudio;