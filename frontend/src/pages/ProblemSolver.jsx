import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const API_BASE_URL = "http://127.0.0.1:8000";
const AI_REQUEST_TIMEOUT_MS = 35000;

function ProblemSolver() {
  const [problemTitle, setProblemTitle] = useState("");
  const [problemDescription, setProblemDescription] = useState("");
  const [context, setContext] = useState("");
  const [constraints, setConstraints] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [generatedSolution, setGeneratedSolution] = useState("");

  const [solutionVersions, setSolutionVersions] = useState([]);
  const [activeVersionIndex, setActiveVersionIndex] = useState(0);

  const [regenerationInstructions, setRegenerationInstructions] =
    useState("");

  const [regenerating, setRegenerating] = useState(false);
  const [regenerationError, setRegenerationError] = useState("");
  const [showRegenerateModal, setShowRegenerateModal] = useState(false);

  // Save to Workspace state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [loadingSaveOptions, setLoadingSaveOptions] = useState(false);
  const [savingSolution, setSavingSolution] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveSuccess, setSaveSuccess] = useState("");

  const markdownComponents = {
    h1: ({ children }) => (
      <h1 className="mb-4 mt-10 border-b border-slate-700 pb-3 text-2xl font-bold tracking-tight text-white first:mt-0">
        {children}
      </h1>
    ),

    h2: ({ children }) => (
      <h2 className="mb-4 mt-7 rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-xl font-bold text-white">
        {children}
      </h2>
    ),

    h3: ({ children }) => (
      <h3 className="mb-3 mt-5 border-l-4 border-cyan-500 pl-3 text-base font-semibold uppercase tracking-wide text-cyan-300">
        {children}
      </h3>
    ),

    p: ({ children }) => (
      <p className="mb-4 leading-7 text-slate-200">
        {children}
      </p>
    ),

    ul: ({ children }) => (
      <ul className="mb-5 list-disc space-y-2 pl-6 leading-7 text-slate-200 marker:text-cyan-400">
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol className="mb-5 list-decimal space-y-3 pl-7 leading-7 text-slate-200 marker:font-semibold marker:text-cyan-400">
        {children}
      </ol>
    ),

    li: ({ children }) => (
      <li className="pl-1">{children}</li>
    ),

    strong: ({ children }) => (
      <strong className="font-semibold text-white">
        {children}
      </strong>
    ),

    em: ({ children }) => (
      <em className="text-slate-300">{children}</em>
    ),

    blockquote: ({ children }) => (
      <blockquote className="my-5 rounded-r-lg border-l-4 border-cyan-500 bg-slate-900/70 px-4 py-3 italic text-slate-300">
        {children}
      </blockquote>
    ),

    hr: () => <hr className="my-8 border-slate-700" />,

    code: ({ children }) => (
      <code className="rounded bg-slate-900 px-1.5 py-0.5 text-cyan-300">
        {children}
      </code>
    ),

    pre: ({ children }) => (
      <pre className="mb-5 overflow-x-auto rounded-lg border border-slate-700 bg-slate-950 p-4 text-sm text-slate-200">
        {children}
      </pre>
    ),

    table: ({ children }) => (
      <div className="my-6 overflow-x-auto rounded-lg border border-slate-700">
        <table className="w-full border-collapse bg-slate-950/50">
          {children}
        </table>
      </div>
    ),

    thead: ({ children }) => (
      <thead className="bg-slate-800">{children}</thead>
    ),

    tbody: ({ children }) => (
      <tbody className="divide-y divide-slate-800">{children}</tbody>
    ),

    tr: ({ children }) => (
      <tr className="transition-colors hover:bg-slate-900/70">
        {children}
      </tr>
    ),

    th: ({ children }) => (
      <th className="border-r border-slate-700 px-4 py-3 text-left text-sm font-semibold text-white last:border-r-0">
        {children}
      </th>
    ),

    td: ({ children }) => (
      <td className="border-r border-slate-800 px-4 py-3 align-top text-slate-200 last:border-r-0">
        {children}
      </td>
    ),
  };

  const handleAnalyzeProblem = async () => {
    if (loading) {
      return;
    }

    const cleanedTitle = problemTitle.trim();
    const cleanedDescription = problemDescription.trim();
    const cleanedContext = context.trim();
    const cleanedConstraints = constraints.trim();

    setError("");
    setGeneratedSolution("");
    setSolutionVersions([]);
    setActiveVersionIndex(0);
    setRegenerationInstructions("");
    setRegenerationError("");
    setShowRegenerateModal(false);
    setShowSaveModal(false);
    setSaveError("");
    setSaveSuccess("");

    if (cleanedTitle.length < 2) {
      setError("Problem title must contain at least 2 characters.");
      return;
    }

    if (cleanedTitle.length > 100) {
      setError("Problem title cannot be longer than 100 characters.");
      return;
    }

    if (cleanedDescription.length < 10) {
      setError(
        "Problem description must contain at least 10 characters."
      );
      return;
    }

    if (cleanedDescription.length > 5000) {
      setError(
        "Problem description cannot be longer than 5,000 characters."
      );
      return;
    }

    if (cleanedContext.length > 2500) {
      setError(
        "Additional context cannot be longer than 2,500 characters."
      );
      return;
    }

    if (cleanedConstraints.length > 2500) {
      setError(
        "Constraints cannot be longer than 2,500 characters."
      );
      return;
    }

    setLoading(true);

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, AI_REQUEST_TIMEOUT_MS);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(
        "http://127.0.0.1:8000/problem-solver/analyze",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title: cleanedTitle,
            description: cleanedDescription,
            context: cleanedContext,
            constraints: cleanedConstraints,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        let message =
          "Something went wrong while analyzing the problem. Please try again.";

        if (typeof errorData?.detail === "string") {
          message = errorData.detail;
        } else if (response.status === 400) {
          message =
            "Please check the problem information and try again.";
        } else if (response.status === 401) {
          message =
            "Your session has expired. Please sign in again.";
        } else if (response.status === 403) {
          message =
            "You are not authorized to perform this action.";
        } else if (response.status === 422) {
          message =
            "Please enter a valid problem title and a more detailed description.";
        } else if (response.status === 429) {
          message =
            "The AI service is receiving too many requests. Please wait a moment and try again.";
        } else if (response.status === 502) {
          message =
            "The AI service could not complete the analysis. Please try again.";
        } else if (response.status === 503) {
          message =
            "The AI service is temporarily unavailable. Please try again later.";
        } else if (response.status === 504) {
          message =
            "The AI request took too long. Please try again.";
        }

        throw new Error(message);
      }

      const data = await response.json();

      if (!data?.solution || !data.solution.trim()) {
        throw new Error(
          "The AI did not return a solution. Please try again."
        );
      }

      
      const initialSolution = data.solution.trim();

      setGeneratedSolution(initialSolution);

      setSolutionVersions([
        {
          solution: initialSolution,
          instructions: "",
          createdAt: new Date().toISOString(),
        },
      ]);

      setActiveVersionIndex(0);
      setRegenerationInstructions("");
      setRegenerationError("");


    } catch (err) {
      console.error("Problem Solver error:", err);

      if (
        err instanceof DOMException &&
        err.name === "AbortError"
      ) {
        setError(
          "The AI request took too long. Please try analyzing the problem again."
        );
      } else if (err instanceof TypeError) {
        setError(
          "Could not connect to the server. Make sure the backend is running and try again."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while analyzing the problem. Please try again."
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const handleRegenerateSolution = async () => {
    if (regenerating || !generatedSolution) {
      return;
    }

    const cleanedInstructions = regenerationInstructions.trim();

    if (cleanedInstructions.length > 2500) {
      setRegenerationError(
        "Regeneration instructions cannot be longer than 2,500 characters."
      );
      return;
    }

    setRegenerationError("");
    setRegenerating(true);

    const controller = new AbortController();

    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, AI_REQUEST_TIMEOUT_MS);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(
        "http://127.0.0.1:8000/problem-solver/regenerate",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            original_solution: generatedSolution,
            instructions: cleanedInstructions,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        let message =
          "Something went wrong while regenerating the solution. Please try again.";

        if (typeof errorData?.detail === "string") {
          message = errorData.detail;
        } else if (response.status === 401) {
          message =
            "Your session has expired. Please sign in again.";
        } else if (response.status === 403) {
          message =
            "You are not authorized to perform this action.";
        } else if (response.status === 422) {
          message =
            "Please check your regeneration instructions and try again.";
        } else if (response.status === 429) {
          message =
            "The AI service is receiving too many requests. Please wait a moment and try again.";
        } else if (response.status === 502) {
          message =
            "The AI service could not regenerate the solution. Please try again.";
        } else if (response.status === 503) {
          message =
            "The AI service is temporarily unavailable. Please try again later.";
        } else if (response.status === 504) {
          message =
            "The AI request took too long. Please try again.";
        }

        throw new Error(message);
      }

      const data = await response.json();

      if (!data?.solution || !data.solution.trim()) {
        throw new Error(
          "The AI did not return a regenerated solution. Please try again."
        );
      }

      const regeneratedSolution = data.solution.trim();

      const newVersion = {
        solution: regeneratedSolution,
        instructions: cleanedInstructions,
        createdAt: new Date().toISOString(),
      };

      setSolutionVersions((previousVersions) => {
        const updatedVersions = [
          ...previousVersions,
          newVersion,
        ];

        setActiveVersionIndex(updatedVersions.length - 1);

        return updatedVersions;
      });

      setGeneratedSolution(regeneratedSolution);
      setRegenerationInstructions("");
      setShowRegenerateModal(false);
    } catch (err) {
      console.error("Problem Solver regeneration error:", err);

      if (
        err instanceof DOMException &&
        err.name === "AbortError"
      ) {
        setRegenerationError(
          "The AI request took too long. Please try regenerating the solution again."
        );
      } else if (err instanceof TypeError) {
        setRegenerationError(
          "Could not connect to the server. Make sure the backend is running and try again."
        );
      } else {
        setRegenerationError(
          err instanceof Error
            ? err.message
            : "Something went wrong while regenerating the solution. Please try again."
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      setRegenerating(false);
    }
  };

  const loadSaveOptions = async () => {
    if (loadingSaveOptions) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setSaveError("Your session has expired. Please sign in again.");
      setShowSaveModal(true);
      return;
    }

    setLoadingSaveOptions(true);
    setSaveError("");
    setSaveSuccess("");
    setSelectedWorkspaceId("");
    setShowSaveModal(true);

    try {
      const response = await fetch(`${API_BASE_URL}/workspaces/`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
      });

      if (response.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("tanioSession");
        localStorage.removeItem("tanioUser");

        throw new Error("Your session has expired. Please sign in again.");
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Unable to load your workspaces."
        );
      }

      const workspaceData = await response.json();

      setWorkspaces(Array.isArray(workspaceData) ? workspaceData : []);
    } catch (err) {
      console.error("Problem Solver save options error:", err);

      setSaveError(
        err instanceof Error
          ? err.message
          : "Unable to load your workspaces."
      );
    } finally {
      setLoadingSaveOptions(false);
    }
  };

  const closeSaveModal = () => {
    if (savingSolution) {
      return;
    }

    setShowSaveModal(false);
    setSelectedWorkspaceId("");
    setSaveError("");
  };

  const handleSaveSolution = async () => {
    if (savingSolution || !generatedSolution) {
      return;
    }

    if (!selectedWorkspaceId) {
      setSaveError("Please choose a workspace.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setSaveError("Your session has expired. Please sign in again.");
      return;
    }

    const cleanedTitle = problemTitle.trim();

    if (!cleanedTitle) {
      setSaveError("The problem needs a title before it can be saved.");
      return;
    }

    const currentVersion = solutionVersions[activeVersionIndex];

    if (!currentVersion?.solution?.trim() || solutionVersions.length === 0) {
      setSaveError("Problem Solver version history is unavailable.");
      return;
    }

    setSavingSolution(true);
    setSaveError("");
    setSaveSuccess("");

    try {
      // Step 1: create a brand-new project in the selected workspace.
      const projectResponse = await fetch(`${API_BASE_URL}/projects/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          title: cleanedTitle,
          description: `Problem Solver project created from the problem: ${cleanedTitle}`,
          workspace_id: Number(selectedWorkspaceId),
        }),
      });

      if (projectResponse.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("tanioSession");
        localStorage.removeItem("tanioUser");
        throw new Error("Your session has expired. Please sign in again.");
      }

      if (!projectResponse.ok) {
        const errorData = await projectResponse.json().catch(() => null);
        throw new Error(
          errorData?.detail ||
            "Tanio could not create a project for this solution. Please try again."
        );
      }

      const newProject = await projectResponse.json();

      if (!newProject?.id) {
        throw new Error(
          "The new project was created, but Tanio could not read its project ID."
        );
      }

      // Step 2: save the selected version as the main Content Library item.
      const contentResponse = await fetch(`${API_BASE_URL}/content/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          project_id: Number(newProject.id),
          title: cleanedTitle,
          content_type: "Problem Solver",
          body: currentVersion.solution,
        }),
      });

      if (contentResponse.status === 401) {
        localStorage.removeItem("token");
        localStorage.removeItem("tanioSession");
        localStorage.removeItem("tanioUser");
        throw new Error("Your session has expired. Please sign in again.");
      }

      if (!contentResponse.ok) {
        const errorData = await contentResponse.json().catch(() => null);
        throw new Error(
          errorData?.detail ||
            "The project was created, but the solution could not be saved. Please try again."
        );
      }

      const savedContent = await contentResponse.json();

      if (!savedContent?.id) {
        throw new Error(
          "The solution was saved, but Tanio could not read its content ID."
        );
      }

      // Step 3: persist Version 1 and every regenerated version.
      for (const version of solutionVersions) {
        const versionResponse = await fetch(
          `${API_BASE_URL}/content/${savedContent.id}/versions`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
            body: JSON.stringify({
              body: version.solution,
              regeneration_instructions:
                version.instructions?.trim() || null,
            }),
          }
        );

        if (versionResponse.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("tanioSession");
          localStorage.removeItem("tanioUser");
          throw new Error("Your session has expired. Please sign in again.");
        }

        if (!versionResponse.ok) {
          const errorData = await versionResponse.json().catch(() => null);
          throw new Error(
            errorData?.detail ||
              "The solution was saved, but its generation history could not be saved completely."
          );
        }
      }

      const selectedWorkspace = workspaces.find(
        (workspace) =>
          String(workspace.id) === String(selectedWorkspaceId)
      );

      setSaveSuccess(
        `"${cleanedTitle}" was created as its own project in ${
          selectedWorkspace?.name ||
          selectedWorkspace?.title ||
          "your workspace"
        } and saved to the Content Library with ${solutionVersions.length} version${
          solutionVersions.length === 1 ? "" : "s"
        }.`
      );

      setShowSaveModal(false);
      setSelectedWorkspaceId("");
    } catch (err) {
      console.error("Problem Solver save error:", err);

      setSaveError(
        err instanceof Error
          ? err.message
          : "This solution could not be saved. Please try again."
      );
    } finally {
      setSavingSolution(false);
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
            Describe a problem and let AI help you analyze possible
            solutions.
          </p>
        </div>

        {/* Problem Form */}
        <div className="mb-8 rounded-xl border border-slate-800 bg-slate-900 p-6">
          <div className="mb-6">
            <h2 className="text-xl font-bold">
              Describe Your Problem
            </h2>

            <p className="mt-1 text-sm text-slate-400">
              Give Tanio the information it needs to understand the
              problem.
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
                <span className="ml-2 text-xs text-slate-600">
                  Optional
                </span>
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
                <span className="ml-2 text-xs text-slate-600">
                  Optional
                </span>
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

              <p className="mt-1 text-sm text-red-300">
                {error}
              </p>

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
          aria-busy={loading || regenerating}
        >
          <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-bold">
                Generated Solution
              </h2>

              <p className="mt-1 text-sm text-slate-400">
                Tanio&apos;s structured analysis, possible solutions,
                recommendation, and action plan will appear here.
              </p>
            </div>

            {generatedSolution && !loading && (
              <div className="flex shrink-0 flex-wrap gap-3">
                <button
                  type="button"
                  onClick={loadSaveOptions}
                  disabled={regenerating || savingSolution}
                  className="rounded-lg bg-violet-600 px-5 py-2.5 font-semibold text-white transition-colors hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save to Workspace
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setRegenerationError("");
                    setShowRegenerateModal(true);
                  }}
                  disabled={regenerating || savingSolution}
                  className="rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Regenerate
                </button>
              </div>
            )}
          </div>

          {saveSuccess && (
            <div
              className="mb-5 rounded-lg border border-emerald-800 bg-emerald-950/40 p-4"
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold text-emerald-300">
                Saved successfully
              </p>
              <p className="mt-1 text-sm text-emerald-300">
                {saveSuccess}
              </p>
            </div>
          )}

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
            <div className="space-y-5">
              {/* Version History */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/40 p-4">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-semibold text-white">
                      Solution Versions
                    </h3>
                    <p className="mt-1 text-sm text-slate-500">
                      Switch between the original solution and regenerated versions.
                    </p>
                  </div>

                  <span className="text-sm text-slate-400">
                    Version {activeVersionIndex + 1} of {solutionVersions.length}
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {solutionVersions.map((version, index) => (
                    <button
                      key={`${version.createdAt}-${index}`}
                      type="button"
                      onClick={() => {
                        setActiveVersionIndex(index);
                        setGeneratedSolution(version.solution);
                        setRegenerationError("");
                      }}
                      disabled={regenerating}
                      className={`rounded-lg border px-3 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50 ${
                        activeVersionIndex === index
                          ? "border-cyan-500 bg-cyan-500/10 text-cyan-300"
                          : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:text-white"
                      }`}
                    >
                      {index === 0 ? "Version 1 · Original" : `Version ${index + 1}`}
                    </button>
                  ))}
                </div>

                {solutionVersions[activeVersionIndex]?.instructions && (
                  <div className="mt-4 rounded-lg border border-slate-800 bg-slate-900/70 p-3">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Regeneration Instructions
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {solutionVersions[activeVersionIndex].instructions}
                    </p>
                  </div>
                )}
              </div>

              {/* Solution Content */}
              <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-5 sm:p-6">
                {regenerating && (
                  <div
                    className="mb-5 flex items-center gap-3 rounded-lg border border-cyan-900 bg-cyan-950/30 p-4"
                    role="status"
                    aria-live="polite"
                  >
                    <div
                      className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400"
                      aria-hidden="true"
                    />
                    <div>
                      <p className="font-medium text-cyan-200">
                        Regenerating solution...
                      </p>
                      <p className="mt-1 text-sm text-slate-400">
                        Tanio is applying your instructions while preserving the existing solution where possible.
                      </p>
                    </div>
                  </div>
                )}

                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {generatedSolution}
                </ReactMarkdown>
              </div>

            </div>
          ) : (
            <div className="flex min-h-48 items-center justify-center rounded-lg border border-dashed border-slate-800 bg-slate-950/30 p-6">
              <div className="max-w-md text-center">
                <p className="font-medium text-slate-400">
                  No solution generated yet
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  Enter your problem above and select Analyze Problem
                  to get started.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSaveModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-workspace-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !savingSolution) {
              closeSaveModal();
            }
          }}
        >
          <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="save-workspace-modal-title"
                  className="text-2xl font-bold text-white"
                >
                  Save to Workspace
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Choose a workspace for this Problem Solver result.
                  Tanio will create a new project automatically, save the selected
                  solution to your Content Library, and preserve the complete generation
                  history.
                </p>
              </div>

              <button
                type="button"
                onClick={closeSaveModal}
                disabled={savingSolution}
                className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close save modal"
              >
                ×
              </button>
            </div>

            <div className="mt-6 rounded-lg border border-slate-800 bg-slate-950/50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Solution
              </p>
              <p className="mt-1 font-semibold text-white">
                {problemTitle.trim() || "Untitled Problem"}
              </p>
              <p className="mt-2 text-sm text-slate-400">
                Saving Version {activeVersionIndex + 1} of {solutionVersions.length} · All versions will be preserved
              </p>
            </div>

            {loadingSaveOptions ? (
              <div
                className="mt-6 flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/50 p-4"
                role="status"
                aria-live="polite"
              >
                <div
                  className="h-5 w-5 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400"
                  aria-hidden="true"
                />
                <p className="text-sm text-slate-300">
                  Loading your workspaces...
                </p>
              </div>
            ) : (
              <div className="mt-6 space-y-5">
                <div>
                  <label
                    htmlFor="save-workspace-select"
                    className="mb-2 block text-sm font-semibold text-slate-300"
                  >
                    Workspace
                  </label>

                  <select
                    id="save-workspace-select"
                    value={selectedWorkspaceId}
                    onChange={(event) => {
                      setSelectedWorkspaceId(event.target.value);
                      setSaveError("");
                    }}
                    disabled={savingSolution}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white outline-none transition focus:border-cyan-500 disabled:opacity-50"
                  >
                    <option value="">Choose a workspace</option>
                    {workspaces.map((workspace) => (
                      <option key={workspace.id} value={workspace.id}>
                        {workspace.name || workspace.title || `Workspace #${workspace.id}`}
                      </option>
                    ))}
                  </select>
                </div>

              </div>
            )}

            {saveError && (
              <div
                className="mt-4 rounded-lg border border-red-800 bg-red-950/50 p-4"
                role="alert"
                aria-live="polite"
              >
                <p className="font-semibold text-red-300">Save failed</p>
                <p className="mt-1 text-sm text-red-300">{saveError}</p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeSaveModal}
                disabled={savingSolution}
                className="rounded-lg bg-slate-700 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveSolution}
                disabled={
                  loadingSaveOptions ||
                  savingSolution ||
                  !selectedWorkspaceId ||
                  !generatedSolution
                }
                className="rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingSolution ? "Saving..." : "Save Solution"}
              </button>
            </div>
          </div>
        </div>
      )}

      {showRegenerateModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="regenerate-modal-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !regenerating) {
              setShowRegenerateModal(false);
              setRegenerationError("");
            }
          }}
        >
          <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="regenerate-modal-title"
                  className="text-2xl font-bold text-white"
                >
                  Regenerate Solution
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Tell Tanio what you want changed in the new version.
                  You can also leave this blank for a general regeneration.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!regenerating) {
                    setShowRegenerateModal(false);
                    setRegenerationError("");
                  }
                }}
                disabled={regenerating}
                className="rounded-lg px-2 py-1 text-2xl leading-none text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close regeneration modal"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              <label
                htmlFor="regeneration-instructions"
                className="mb-2 block text-sm font-semibold text-slate-300"
              >
                What would you like to change?
              </label>

              <textarea
                id="regeneration-instructions"
                value={regenerationInstructions}
                onChange={(event) => {
                  setRegenerationInstructions(event.target.value);

                  if (regenerationError) {
                    setRegenerationError("");
                  }
                }}
                rows={6}
                maxLength={2500}
                placeholder="e.g. Make the action plan more detailed, reduce the cost, and keep the rest mostly the same."
                disabled={regenerating}
                className="w-full resize-y rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
              />

              <div className="mt-2 flex items-center justify-between gap-4 text-xs text-slate-500">
                <span>Optional</span>
                <span>{regenerationInstructions.length}/2500</span>
              </div>
            </div>

            {regenerationError && (
              <div
                className="mt-4 rounded-lg border border-red-800 bg-red-950/50 p-4"
                role="alert"
                aria-live="polite"
              >
                <p className="font-semibold text-red-300">
                  Regeneration failed
                </p>

                <p className="mt-1 text-sm text-red-300">
                  {regenerationError}
                </p>
              </div>
            )}

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setShowRegenerateModal(false);
                  setRegenerationError("");
                }}
                disabled={regenerating}
                className="rounded-lg bg-slate-700 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleRegenerateSolution}
                disabled={regenerating || loading || !generatedSolution}
                className="rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {regenerating ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProblemSolver;