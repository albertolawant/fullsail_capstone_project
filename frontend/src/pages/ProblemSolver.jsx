import { useState } from "react";

function ProblemSolver() {
  const [problemTitle, setProblemTitle] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [context, setContext] = useState("");
  const [constraints, setConstraints] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedSolution, setGeneratedSolution] = useState("");

  const handleAnalyzeProblem = async () => {
    const cleanedTitle = problemTitle.trim();
    const cleanedDescription = problemDescription.trim();

    setError("");
    setGeneratedSolution("");

    if (cleanedTitle.length < 2) {
      setError("Problem title must contain at least 2 characters.");
      return;
    }

    if (cleanedDescription.length < 10) {
      setError("Problem description must contain at least 10 characters.");
      return;
    }

    setLoading(true);

    try {

      await new Promise((resolve) => setTimeout(resolve, 1000));

      setGeneratedSolution(
        "Your AI-generated solution will appear here once the Problem Solver backend is connected."
      );
    } catch (err) {
      console.error("Problem Solver error:", err);

      setError(
        "Something went wrong while analyzing the problem. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const clearError = () => {
    if (error) {
      setError("");
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 p-4 text-white sm:p-6 lg:p-8">
      <div className="mx-auto w-full max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Problem Solver</h1>

          <p className="mt-2 text-slate-400">
            Describe a problem and let AI help you analyze possible solutions.
          </p>
        </div>

        {/* Problem Form */}
        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold">Describe Your Problem</h2>

            <p className="mt-1 text-sm text-slate-400">
              Give Tanio the information it needs to understand the problem.
            </p>
          </div>

          {/* Problem Title */}
          <div className="mb-5">
            <label
              htmlFor="problem-title"
              className="mb-2 block text-sm text-slate-400"
            >
              Problem Title
            </label>

            <input
              id="problem-title"
              type="text"
              value={problemTitle}
              onChange={(event) => {
                setProblemTitle(event.target.value);
                clearError();
              }}
              maxLength={100}
              placeholder="e.g. Low customer retention"
              disabled={loading}
              className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />

            <div className="mt-2 flex justify-between gap-4 text-xs text-slate-500">
              <span>Use between 2 and 100 characters.</span>
              <span>{problemTitle.length}/100</span>
            </div>
          </div>

          {/* Problem Description */}
          <div className="mb-5">
            <label
              htmlFor="problem-description"
              className="mb-2 block text-sm text-slate-400"
            >
              Problem Description
            </label>

            <textarea
              id="problem-description"
              value={problemDescription}
              onChange={(event) => {
                setProblemDescription(event.target.value);
                clearError();
              }}
              rows={6}
              maxLength={5000}
              placeholder="Describe the problem, what is happening, and why it needs to be solved..."
              disabled={loading}
              className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
            />

            <div className="mt-2 flex justify-between gap-4 text-xs text-slate-500">
              <span>Provide at least 10 characters.</span>
              <span>{problemDescription.length}/5000</span>
            </div>
          </div>

          {/* Additional Information */}
          <div className="mb-6 grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="problem-context"
                className="mb-2 block text-sm text-slate-400"
              >
                Additional Context
                <span className="ml-2 text-xs text-slate-600">Optional</span>
              </label>

              <textarea
                id="problem-context"
                value={context}
                onChange={(event) => {
                  setContext(event.target.value);
                  clearError();
                }}
                rows={5}
                maxLength={2500}
                placeholder="Add background information, relevant details, or anything else Tanio should consider..."
                disabled={loading}
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />

              <p className="mt-2 text-right text-xs text-slate-500">
                {context.length}/2500
              </p>
            </div>

            <div>
              <label
                htmlFor="problem-constraints"
                className="mb-2 block text-sm text-slate-400"
              >
                Constraints
                <span className="ml-2 text-xs text-slate-600">Optional</span>
              </label>

              <textarea
                id="problem-constraints"
                value={constraints}
                onChange={(event) => {
                  setConstraints(event.target.value);
                  clearError();
                }}
                rows={5}
                maxLength={2500}
                placeholder="Add limitations such as budget, time, resources, requirements, or restrictions..."
                disabled={loading}
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />

              <p className="mt-2 text-right text-xs text-slate-500">
                {constraints.length}/2500
              </p>
            </div>
          </div>

          {/* Analyze Button */}
          <button
            type="button"
            onClick={handleAnalyzeProblem}
            disabled={
              loading ||
              problemTitle.trim().length < 2 ||
              problemDescription.trim().length < 10
            }
            className="rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? "Analyzing Problem..." : "Analyze Problem"}
          </button>

          {/* Error State */}
          {error && (
            <div
              className="mt-4 rounded-lg border border-red-800 bg-red-950/50 p-4"
              role="alert"
              aria-live="polite"
            >
              <p className="font-semibold text-red-300">
                Something went wrong
              </p>

              <p className="mt-1 text-sm text-red-300">{error}</p>

              <button
                type="button"
                onClick={handleAnalyzeProblem}
                disabled={loading}
                className="mt-3 rounded-lg bg-red-800 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Generated Solution */}
        <div
          className="rounded-xl border border-slate-800 bg-slate-900 p-6"
          aria-busy={loading}
        >
          <div className="mb-5">
            <h2 className="text-xl font-bold">Generated Solution</h2>

            <p className="mt-1 text-sm text-slate-400">
              Tanio's analysis and recommended solution will appear here.
            </p>
          </div>

          {loading ? (
            <div
              className="flex min-h-48 items-center justify-center"
              role="status"
              aria-live="polite"
            >
              <div className="text-center">
                <div
                  className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400"
                  aria-hidden="true"
                />

                <p className="font-medium text-slate-300">
                  Analyzing your problem...
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  Tanio is reviewing the information you provided.
                </p>
              </div>
            </div>
          ) : generatedSolution ? (
            <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-5">
              <p className="leading-relaxed text-slate-200">
                {generatedSolution}
              </p>
            </div>
          ) : (
            <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/30 p-6">
              <div className="max-w-md text-center">
                <p className="font-medium text-slate-400">
                  No solution generated yet
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Enter your problem above and select Analyze Problem to get
                  started.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ProblemSolver;