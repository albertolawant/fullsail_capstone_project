import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import {
  notifyProblemAnalysisComplete,
  notifyProblemRegenerated,
  notifyProblemSaved,
} from "../utils/notifications";

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
  const [showSolutionModal, setShowSolutionModal] = useState(false);
  const [solutionCopied, setSolutionCopied] = useState(false);
  const [solutionModalPosition, setSolutionModalPosition] = useState({ x: 0, y: 0 });
  const solutionModalDragRef = useRef(null);

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

      notifyProblemAnalysisComplete(cleanedTitle);
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
            title: problemTitle.trim(),
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

      notifyProblemRegenerated(problemTitle.trim());
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

      notifyProblemSaved(cleanedTitle);

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

  const handleCopySolution = async () => {
    if (!generatedSolution) {
      return;
    }

    try {
      await navigator.clipboard.writeText(generatedSolution);
      setSolutionCopied(true);
      window.setTimeout(() => setSolutionCopied(false), 1800);
    } catch (copyError) {
      console.error("Could not copy Problem Solver output:", copyError);
    }
  };

  const handleSolutionModalDragStart = (event) => {
    if (event.button !== 0) {
      return;
    }

    const target = event.target;

    if (target instanceof HTMLElement && target.closest("button")) {
      return;
    }

    event.preventDefault();

    solutionModalDragRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: solutionModalPosition.x,
      originY: solutionModalPosition.y,
    };

    const handlePointerMove = (moveEvent) => {
      const dragState = solutionModalDragRef.current;

      if (!dragState) {
        return;
      }

      setSolutionModalPosition({
        x: dragState.originX + moveEvent.clientX - dragState.startX,
        y: dragState.originY + moveEvent.clientY - dragState.startY,
      });
    };

    const handlePointerUp = () => {
      solutionModalDragRef.current = null;
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };

    window.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
  };

  const clearError = () => {
    if (error) {
      setError("");
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-slate-950 px-3 py-4 text-white sm:px-4 lg:px-5 xl:px-6">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-[-12rem] h-[32rem] w-[32rem] rounded-full bg-cyan-500/[0.06] blur-3xl" />
        <div className="absolute right-[-10rem] top-[18rem] h-[28rem] w-[28rem] rounded-full bg-violet-500/[0.045] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      </div>

      <div className="relative z-10 w-full">
        {/* Hero Header */}
        <div className="group relative mb-5 overflow-hidden rounded-[22px] border border-cyan-400/20 bg-slate-950/80 shadow-[0_30px_100px_rgba(0,0,0,0.34)] ring-1 ring-white/[0.035] backdrop-blur-2xl">
          {/* Ambient hero lighting */}
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 -top-32 h-72 w-72 rounded-full bg-cyan-400/[0.13] blur-[90px]" />
            <div className="absolute left-[35%] -top-40 h-80 w-80 rounded-full bg-sky-500/[0.07] blur-[110px]" />
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-violet-500/[0.08] blur-[100px]" />
            <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.025)_38%,transparent_62%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/70 to-transparent" />
            <div className="absolute bottom-0 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          </div>

          <div className="relative flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between xl:px-7 xl:py-6">
            <div className="flex min-w-0 items-center gap-5">
              <div className="relative flex h-[68px] w-[68px] shrink-0 items-center justify-center">
                <div className="absolute inset-0 rounded-[20px] bg-cyan-400/15 blur-xl transition duration-500 group-hover:bg-cyan-400/25" />
                <div className="absolute inset-0 rotate-6 rounded-[20px] border border-cyan-400/15 bg-cyan-500/[0.04]" />
                <div className="relative flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-[18px] border border-cyan-300/30 bg-gradient-to-br from-cyan-400/25 via-sky-500/10 to-slate-950 text-[28px] text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_35px_rgba(34,211,238,0.14)]">
                  <span className="absolute inset-0 bg-gradient-to-br from-white/[0.12] via-transparent to-transparent" />
                  <span className="relative drop-shadow-[0_0_12px_rgba(103,232,249,0.75)]">✦</span>
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-cyan-400/20 bg-cyan-400/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                    Tanio Intelligence
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300/90">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,0.85)]" />
                    Online
                  </span>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <h1 className="bg-gradient-to-r from-white via-slate-100 to-cyan-200 bg-clip-text text-3xl font-black tracking-[-0.035em] text-transparent sm:text-4xl">
                    Problem Solver
                  </h1>

                  <span className="rounded-full border border-cyan-400/25 bg-cyan-400/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300 shadow-[0_0_16px_rgba(34,211,238,0.08)]">
                    Beta
                  </span>
                </div>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Transform complex problems into structured insights, practical solutions, and clear next steps.
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-cyan-400/15 bg-gradient-to-br from-slate-950/80 via-slate-950/60 to-cyan-950/25 p-[1px] shadow-[0_16px_45px_rgba(0,0,0,0.20)] xl:min-w-[470px]">
              <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-cyan-400/[0.08] blur-3xl" />
              <div className="relative flex items-center gap-4 rounded-[15px] bg-slate-950/65 px-4 py-3.5">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-300/25 bg-cyan-400/[0.08] text-lg text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.10)]">
                  <span className="absolute h-6 w-6 animate-ping rounded-full border border-cyan-400/10" />
                  <span className="relative">◎</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-bold text-white">
                      AI Analysis Engine
                    </p>
                    <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                      Ready
                    </span>
                  </div>

                  <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
                    Analyze → compare → recommend → act
                  </p>

                  <div className="mt-2.5 flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-1 flex-1 rounded-full bg-cyan-400/70 shadow-[0_0_8px_rgba(34,211,238,0.35)]" />
                    <span className="h-1 flex-1 rounded-full bg-sky-400/55" />
                    <span className="h-1 flex-1 rounded-full bg-violet-400/45" />
                    <span className="h-1 flex-1 rounded-full bg-emerald-400/45" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Workspace */}
        <div className="grid items-stretch gap-4 2xl:gap-5 xl:grid-cols-2">
          {/* Problem Form */}
          <section className="relative flex min-h-[740px] flex-col overflow-hidden rounded-2xl border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.06),transparent_26%),linear-gradient(to_bottom,rgba(15,23,42,0.98),rgba(15,23,42,0.84))] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.24)] ring-1 ring-white/[0.02] backdrop-blur sm:p-6 xl:h-[930px] xl:min-h-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/45 to-transparent" />
            <div className="mb-6 flex items-start gap-3 border-b border-slate-800/70 pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/15 to-slate-900 text-xl text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
                ✎
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  Describe Your Problem
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  Give Tanio the information it needs to understand and analyze the problem.
                </p>
              </div>
            </div>

            {/* Scrollable Form Fields */}
            <div className="min-h-0 flex-1 overflow-visible">
            {/* Problem Title */}
            <div className="mb-5">
              <label
                htmlFor="problem-title"
                className="mb-2 block text-sm font-medium text-slate-300"
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
                className="w-full rounded-xl border border-slate-700/90 bg-slate-950/70 px-4 py-3.5 text-white shadow-inner shadow-black/10 placeholder:text-slate-600 transition-all focus:border-cyan-400/70 focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="mb-2 block text-sm font-medium text-slate-300"
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
                rows={7}
                maxLength={5000}
                placeholder="Describe the problem, what is happening, and why it needs to be solved..."
                disabled={loading}
                className="w-full resize-y rounded-xl border border-slate-700/90 bg-slate-950/70 px-4 py-3.5 text-white shadow-inner shadow-black/10 placeholder:text-slate-600 transition-all focus:border-cyan-400/70 focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50 xl:resize-none"
              />

              <div className="mt-2 flex justify-between gap-4 text-xs text-slate-500">
                <span>Provide at least 10 characters.</span>
                <span>{problemDescription.length}/5000</span>
              </div>
            </div>

            {/* Additional Information */}
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="problem-context"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Additional Context
                  <span className="ml-2 text-xs font-normal text-slate-500">
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
                  className="w-full resize-y rounded-xl border border-slate-700/90 bg-slate-950/70 px-4 py-3.5 text-white shadow-inner shadow-black/10 placeholder:text-slate-600 transition-all focus:border-cyan-400/70 focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50 xl:resize-none"
                />

                <p className="mt-2 text-right text-xs text-slate-500">
                  {context.length}/2500
                </p>
              </div>

              <div>
                <label
                  htmlFor="problem-constraints"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Constraints
                  <span className="ml-2 text-xs font-normal text-slate-500">
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
                  className="w-full resize-y rounded-xl border border-slate-700/90 bg-slate-950/70 px-4 py-3.5 text-white shadow-inner shadow-black/10 placeholder:text-slate-600 transition-all focus:border-cyan-400/70 focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50 xl:resize-none"
                />

                <p className="mt-2 text-right text-xs text-slate-500">
                  {constraints.length}/2500
                </p>
              </div>
            </div>

            </div>

            {/* Fixed Analyze Action */}
            <div className="mt-4 shrink-0 border-t border-slate-800/80 pt-4">
            <button
              type="button"
              onClick={handleAnalyzeProblem}
              disabled={
                loading ||
                problemTitle.trim().length < 2 ||
                problemDescription.trim().length < 10
              }
              className="group inline-flex items-center justify-center gap-2 self-start rounded-xl border border-cyan-300/40 bg-gradient-to-r from-cyan-400 to-sky-400 px-6 py-3 font-bold text-slate-950 shadow-[0_14px_36px_rgba(34,211,238,0.16)] transition-all hover:-translate-y-0.5 hover:from-cyan-300 hover:to-sky-300 hover:shadow-[0_18px_44px_rgba(34,211,238,0.22)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden="true">✦</span>
              {loading ? "Analyzing Problem..." : "Analyze Problem"}
            </button>

            {error && (
              <div
                className="mt-4 rounded-xl border border-red-800 bg-red-950/50 p-4"
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
          </section>

          {/* Generated Solution */}
          <section
            className="relative flex min-h-[740px] flex-col overflow-hidden rounded-2xl border border-cyan-500/20 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.07),transparent_28%),linear-gradient(to_bottom,rgba(15,23,42,0.98),rgba(15,23,42,0.84))] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.26)] ring-1 ring-white/[0.02] backdrop-blur sm:p-6 xl:h-[930px] xl:min-h-0"
            aria-busy={loading || regenerating}
          >
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/55 to-transparent" />
            <div className="mb-4 flex items-start justify-between gap-4 border-b border-slate-800/70 pb-4">
              <div className="flex min-w-0 items-start gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/15 to-slate-900 text-xl text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
                  ▤
                </div>
                <div className="min-w-0">
                  <h2 className="text-xl font-bold text-white">
                    Generated Solution
                  </h2>
                  <p className="mt-1 text-sm leading-6 text-slate-400">
                    Tanio&apos;s structured analysis, possible solutions, recommendation, and action plan will appear here.
                  </p>
                </div>
              </div>

              {generatedSolution && !loading && (
                <div className="flex shrink-0 items-center gap-2">
                  <button
                    type="button"
                    onClick={handleCopySolution}
                    className="inline-flex items-center gap-2 rounded-xl border border-slate-700/80 bg-slate-950/55 px-3.5 py-2.5 text-sm font-semibold text-slate-300 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-500/30 hover:text-cyan-100"
                    aria-label="Copy generated solution"
                  >
                    <span aria-hidden="true">{solutionCopied ? "✓" : "⧉"}</span>
                    <span className="hidden sm:inline">{solutionCopied ? "Copied" : "Copy"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setSolutionModalPosition({ x: 0, y: 0 });
                      setShowSolutionModal(true);
                    }}
                    className="inline-flex items-center gap-2 rounded-xl border border-cyan-500/20 bg-cyan-500/[0.06] px-3.5 py-2.5 text-sm font-semibold text-cyan-100 shadow-sm transition-all hover:-translate-y-0.5 hover:border-cyan-400/40 hover:bg-cyan-500/10 hover:shadow-[0_10px_28px_rgba(34,211,238,0.1)]"
                    aria-label="Expand generated solution"
                  >
                    <span aria-hidden="true">⛶</span>
                    <span className="hidden sm:inline">Expand</span>
                  </button>
                </div>
              )}
            </div>

            {saveSuccess && (
              <div
                className="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/40 p-4"
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

            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-cyan-500/10 bg-gradient-to-b from-slate-950/75 to-slate-950/55 shadow-inner shadow-black/25 ring-1 ring-white/[0.025]">
              {generatedSolution && !loading && (
                <div className="flex items-center justify-between gap-3 border-b border-slate-800/80 bg-slate-900/70 px-4 py-2.5">
                  <div className="flex min-w-0 items-center gap-2 text-xs text-slate-400">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.65)]" />
                    <span className="truncate">{problemTitle.trim() || "Untitled Problem"}</span>
                  </div>
                  <span className="shrink-0 rounded-full border border-cyan-500/20 bg-cyan-500/[0.07] px-2.5 py-1 text-[11px] font-semibold text-cyan-300">
                    Version {activeVersionIndex + 1} of {solutionVersions.length}
                  </span>
                </div>
              )}
              {loading ? (
                <div
                  className="flex flex-1 items-center justify-center p-8"
                  role="status"
                  aria-live="polite"
                >
                  <div className="text-center">
                    <div
                      className="mx-auto mb-4 h-9 w-9 animate-spin rounded-full border-2 border-slate-700 border-t-cyan-400"
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
                <div className="relative flex-1 overflow-y-auto scroll-smooth p-5 [scrollbar-color:rgb(71_85_105)_transparent] [scrollbar-width:thin] sm:p-6">
                  {regenerating && (
                    <div
                      className="sticky top-0 z-10 mb-5 flex items-center gap-3 rounded-xl border border-cyan-900 bg-cyan-950/90 p-4 backdrop-blur"
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
              ) : (
                <div className="flex flex-1 items-center justify-center p-8">
                  <div className="max-w-md text-center">
                    <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-cyan-500/20 bg-cyan-500/10 text-3xl text-cyan-300 shadow-lg shadow-cyan-950/20">
                      ▤
                    </div>
                    <div className="mt-6 flex justify-center gap-3 text-cyan-400" aria-hidden="true">
                      <span>✦</span>
                      <span className="text-xl">✦</span>
                      <span>✦</span>
                    </div>
                    <p className="mt-5 text-lg font-semibold text-slate-200">
                      Your solution will appear here
                    </p>
                    <p className="mt-2 text-sm leading-6 text-slate-500">
                      Fill out the problem details and click &quot;Analyze Problem&quot; to get started.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </section>
        </div>

        {/* Bottom Panels */}
        <div className="mt-4 grid items-stretch gap-4 2xl:gap-5 xl:grid-cols-2">
          {/* Version History */}
          <section className="relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-2xl border border-cyan-500/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.045),transparent_24%),linear-gradient(to_bottom,rgba(15,23,42,0.96),rgba(15,23,42,0.82))] p-5 shadow-[0_22px_65px_rgba(0,0,0,0.20)] ring-1 ring-white/[0.02] backdrop-blur sm:p-6 xl:h-[340px] xl:min-h-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent" />
            <div className="flex items-start gap-3 border-b border-slate-800/70 pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/15 to-slate-900 text-xl text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
                ↻
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">
                  Solution Versions
                </h2>
                <p className="mt-1 text-sm text-slate-400">
                  View and manage different versions of your solution.
                </p>
              </div>
            </div>

            {solutionVersions.length > 0 ? (
              <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 [scrollbar-color:rgb(51_65_85)_transparent] [scrollbar-width:thin]">
                {solutionVersions.map((version, index) => {
                  const isActive = activeVersionIndex === index;
                  const createdLabel = version.createdAt
                    ? new Date(version.createdAt).toLocaleString([], {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })
                    : "Generated just now";

                  return (
                    <button
                      key={`${version.createdAt}-${index}`}
                      type="button"
                      onClick={() => {
                        setActiveVersionIndex(index);
                        setGeneratedSolution(version.solution);
                        setRegenerationError("");
                      }}
                      disabled={regenerating}
                      className={`group flex w-full items-center justify-between gap-4 rounded-xl border p-4 text-left transition-all disabled:cursor-not-allowed disabled:opacity-50 ${
                        isActive
                          ? "border-cyan-400/60 bg-gradient-to-r from-cyan-500/[0.08] to-slate-950/55 shadow-[0_0_24px_rgba(34,211,238,0.08)]"
                          : "border-slate-800 bg-slate-950/55 hover:border-slate-700 hover:bg-slate-950/80"
                      }`}
                    >
                      <div className="flex min-w-0 items-center gap-3">
                        <div
                          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border ${
                            isActive
                              ? "border-cyan-400/30 bg-cyan-500/10 text-cyan-300"
                              : "border-slate-700 bg-slate-900 text-slate-400"
                          }`}
                        >
                          ▤
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-white">
                            Version {index + 1}
                            {index === 0 ? " · Original" : ""}
                          </p>
                          <p className="mt-0.5 truncate text-xs text-slate-500">
                            {createdLabel}
                          </p>
                          {version.instructions && (
                            <p className="mt-1 truncate text-xs text-slate-400">
                              {version.instructions}
                            </p>
                          )}
                        </div>
                      </div>

                      <span
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-semibold ${
                          isActive
                            ? "border-cyan-400/40 bg-cyan-400 text-slate-950"
                            : "border-slate-700 bg-slate-900 text-slate-400"
                        }`}
                      >
                        {isActive ? "Current" : "View"}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="mt-5 flex min-h-32 items-center justify-center rounded-xl border border-slate-800 bg-slate-950/55 p-6 text-center">
                <div>
                  <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-xl bg-slate-900 text-slate-500">
                    ↻
                  </div>
                  <p className="mt-3 font-medium text-slate-300">
                    No solutions yet
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    Generate a solution to see version history here.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* Actions */}
          <section className="relative flex h-full min-h-[300px] flex-col overflow-hidden rounded-2xl border border-violet-500/10 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.05),transparent_24%),linear-gradient(to_bottom,rgba(15,23,42,0.96),rgba(15,23,42,0.82))] p-5 shadow-[0_22px_65px_rgba(0,0,0,0.20)] ring-1 ring-white/[0.02] backdrop-blur sm:p-6 xl:h-[340px] xl:min-h-0">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent" />
            <div className="flex items-start gap-3 border-b border-slate-800/70 pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/15 to-slate-900 text-xl text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
                ⚡
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Actions</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Refine, save, or manage your solution.
                </p>
              </div>
            </div>

            <div className="mt-5 flex min-h-0 flex-1 flex-col justify-center space-y-3">
              <div className="group flex flex-col gap-3 rounded-xl border border-violet-500/15 bg-gradient-to-r from-violet-950/15 via-slate-950/55 to-slate-950/70 p-3 transition hover:border-violet-400/25 hover:from-violet-950/25 hover:to-slate-950/80 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={() => {
                    setRegenerationError("");
                    setShowRegenerateModal(true);
                  }}
                  disabled={!generatedSolution || regenerating || savingSolution}
                  className="inline-flex min-w-[230px] items-center justify-center gap-2 rounded-lg border border-violet-400/30 bg-gradient-to-r from-violet-500/20 via-purple-500/15 to-slate-900 px-4 py-3 font-semibold text-violet-100 shadow-[0_10px_28px_rgba(139,92,246,0.10)] transition-all hover:-translate-y-0.5 hover:border-violet-400/55 hover:from-violet-500/30 hover:via-purple-500/20 hover:text-white hover:shadow-[0_14px_34px_rgba(139,92,246,0.18)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-slate-700 disabled:from-slate-800 disabled:via-slate-800 disabled:to-slate-900 disabled:text-slate-500 disabled:shadow-none disabled:opacity-50"
                >
                  <span aria-hidden="true">↻</span>
                  Regenerate Solution
                </button>
                <p className="text-sm text-slate-500">
                  Create a new version with specific instructions.
                </p>
              </div>

              <div className="group flex flex-col gap-3 rounded-xl border border-emerald-500/15 bg-gradient-to-r from-emerald-950/15 via-slate-950/55 to-slate-950/70 p-3 transition hover:border-emerald-400/25 hover:from-emerald-950/25 hover:to-slate-950/80 sm:flex-row sm:items-center">
                <button
                  type="button"
                  onClick={loadSaveOptions}
                  disabled={!generatedSolution || regenerating || savingSolution}
                  className="inline-flex min-w-[230px] items-center justify-center gap-2 rounded-lg border border-emerald-400/30 bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-slate-900 px-4 py-3 font-semibold text-emerald-100 shadow-[0_10px_28px_rgba(16,185,129,0.10)] transition-all hover:-translate-y-0.5 hover:border-emerald-400/55 hover:from-emerald-500/30 hover:via-teal-500/20 hover:text-white hover:shadow-[0_14px_34px_rgba(16,185,129,0.18)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:border-slate-700 disabled:from-slate-800 disabled:via-slate-800 disabled:to-slate-900 disabled:text-slate-500 disabled:shadow-none disabled:opacity-50"
                >
                  <span aria-hidden="true">▣</span>
                  Save to Workspace
                </button>
                <p className="text-sm text-slate-500">
                  Save this solution to your workspace for future reference.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>

      {showSolutionModal && generatedSolution && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/85 px-2 pb-4 pt-35 backdrop-blur-sm sm:px-3 sm:pb-5 sm:pt-35"
          role="dialog"
          aria-modal="true"
          aria-labelledby="expanded-solution-title"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) {
              setShowSolutionModal(false);
            }
          }}
        >
          <div
            className="relative flex h-[82vh] w-[98vw] max-w-[2000px] flex-col overflow-hidden rounded-2xl border border-cyan-500/20 bg-slate-950 shadow-[0_30px_100px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.03]"
            style={{
              transform: `translate3d(${solutionModalPosition.x}px, ${solutionModalPosition.y}px, 0)`,
            }}
          >
            <div
              onPointerDown={handleSolutionModalDragStart}
              className="flex cursor-grab select-none items-center justify-between gap-4 border-b border-slate-800/80 bg-slate-900/80 px-5 py-4 active:cursor-grabbing sm:px-6"
              title="Drag to move"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300">
                    ▤
                  </div>
                  <div className="min-w-0">
                    <h2
                      id="expanded-solution-title"
                      className="truncate text-xl font-bold text-white"
                    >
                      {problemTitle.trim() || "Generated Solution"}
                    </h2>
                    <p className="mt-0.5 text-sm text-slate-400">
                      Full-screen solution view · Version {activeVersionIndex + 1} of {solutionVersions.length}
                    </p>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setShowSolutionModal(false)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-700 bg-slate-950/70 text-xl text-slate-400 transition hover:border-slate-600 hover:bg-slate-800 hover:text-white"
                aria-label="Close expanded solution"
              >
                ×
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-950/40 px-5 py-5 [scrollbar-color:rgb(71_85_105)_transparent] [scrollbar-width:thin] sm:px-6 sm:py-6">
              {regenerating && (
                <div
                  className="sticky top-0 z-10 mb-5 flex items-center gap-3 rounded-xl border border-cyan-900 bg-cyan-950/95 p-4 backdrop-blur"
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

              <div className="w-full rounded-2xl border border-slate-800/80 bg-slate-900/35 p-5 shadow-inner shadow-black/15 sm:p-7 lg:p-9">
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  components={markdownComponents}
                >
                  {generatedSolution}
                </ReactMarkdown>
              </div>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-800/80 bg-slate-900/80 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
              <p className="text-sm text-slate-500">
                Scroll through the full response without changing the page layout.
              </p>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleCopySolution}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                >
                  {solutionCopied ? "Copied" : "Copy Solution"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSolutionModal(false);
                    setRegenerationError("");
                    setShowRegenerateModal(true);
                  }}
                  disabled={regenerating || savingSolution}
                  className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Regenerate
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSolutionModal(false);
                    loadSaveOptions();
                  }}
                  disabled={regenerating || savingSolution}
                  className="rounded-lg bg-cyan-400 px-4 py-2 text-sm font-bold text-slate-950 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Save to Workspace
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
