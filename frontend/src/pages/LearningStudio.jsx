import { useEffect, useRef, useState } from "react";
import LearningMaterialView from "../components/LearningMaterialView";
import {
  LEARNING_STUDIO_CONTENT_TYPES,
  LEARNING_STUDIO_LABELS,
  getLearningMaterialFileName,
  learningMaterialToMarkdown,
  serializeLearningMaterial,
  validateLearningMaterial,
} from "../utils/learningStudioContent";
import { exportContentAsPdf } from "../utils/exportPdf";
import { exportContentAsMarkdown } from "../utils/exportMarkdown";
import { exportContentAsTxt } from "../utils/exportTxt";
import { exportContentAsDocx } from "../utils/exportDocx";
import { addRecentActivity } from "../utils/activityStorage";
import { notifyContentSaved } from "../utils/notifications";

const API_BASE_URL = "http://127.0.0.1:8000";
const GENERATION_TIMEOUT_MS = 45000;

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const OUTPUT_TYPES = [
  {
    value: "lesson",
    label: "Lesson",
    icon: "▤",
    description:
      "Learn through clear explanations, examples, and structured sections.",
  },
  {
    value: "flashcards",
    label: "Flashcards",
    icon: "◇",
    description:
      "Review important terms and concepts with question and answer cards.",
  },
  {
    value: "quiz",
    label: "Quiz",
    icon: "✓",
    description:
      "Check your understanding with practice questions about your topic.",
  },
];

const PRIMARY_BUTTON =
  "rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";

const SECONDARY_BUTTON =
  "rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";

const FIELD_CLASS =
  "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:opacity-60";

function getOutputLabel(outputType) {
  return LEARNING_STUDIO_LABELS[outputType] || "Study Material";
}

function getErrorMessage(response, data, fallback) {
  if (response.status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (response.status === 403) {
    return "You are not authorized to perform this action.";
  }

  if (response.status === 422) {
    return "Please check the information you entered.";
  }

  if (response.status === 429) {
    return "Too many requests. Please wait a moment and retry.";
  }

  if (response.status === 503) {
    return "The service is temporarily unavailable. Please retry shortly.";
  }

  if (response.status === 504) {
    return "The request took too long. Please retry.";
  }

  return fallback;
}

function LearningStudio() {
  const [topic, setTopic] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [outputType, setOutputType] = useState("lesson");
  const [topicError, setTopicError] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [lastRequest, setLastRequest] = useState(null);
  const [resultVersion, setResultVersion] = useState(0);

  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [projectsReload, setProjectsReload] = useState(0);
  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [saveTitle, setSaveTitle] = useState("");
  const [savedContentId, setSavedContentId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const topicRef = useRef(null);
  const requestControllerRef = useRef(null);
  const saveControllerRef = useRef(null);
  const exportBusyRef = useRef(false);
  const mountedRef = useRef(false);

  const busy = loading || saving || exporting;
  const selectedOutput = OUTPUT_TYPES.find(
    (type) => type.value === outputType
  );
  const displayedOutputLabel = getOutputLabel(
    generatedResult?.output_type || outputType
  );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestControllerRef.current?.abort();
      saveControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    const loadProjects = async () => {
      setProjectsLoading(true);
      setProjectsError("");

      try {
        const token = localStorage.getItem("token");

        if (!token) {
          throw new Error(
            "Your session has expired. Please sign in again."
          );
        }

        const response = await fetch(`${API_BASE_URL}/projects/`, {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null);

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              response,
              data,
              "Your projects could not be loaded."
            )
          );
        }

        if (!Array.isArray(data)) {
          throw new Error("The server returned invalid project information.");
        }

        if (controller.signal.aborted) {
          return;
        }

        setProjects(data);
        setSelectedProjectId((currentId) =>
          data.some((project) => String(project.id) === currentId)
            ? currentId
            : ""
        );
      } catch (error) {
        if (!controller.signal.aborted) {
          setProjectsError(
            error instanceof Error
              ? error.message
              : "Your projects could not be loaded."
          );
        }
      } finally {
        if (!controller.signal.aborted) {
          setProjectsLoading(false);
        }
      }
    };

    loadProjects();

    return () => controller.abort();
  }, [projectsReload]);

  const clearFeedback = () => {
    setGenerationError("");
    setStatusMessage("");
  };

  const generateStudyMaterial = async (request) => {
    if (
      requestControllerRef.current ||
      saveControllerRef.current ||
      exportBusyRef.current
    ) {
      return;
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;

    setLoading(true);
    setGenerationError("");
    setStatusMessage("");
    setLastRequest(request);

    let timedOut = false;
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, GENERATION_TIMEOUT_MS);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error(
          "Your session has expired. Please sign in again."
        );
      }

      const response = await fetch(
        `${API_BASE_URL}/learning-studio/generate`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(request),
          signal: controller.signal,
        }
      );

      const data = await response.json().catch(() => null);

      if (controller.signal.aborted) {
        if (timedOut) {
          throw new Error("Generation timed out.");
        }
        return;
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            response,
            data,
            "Your study material could not be generated."
          )
        );
      }

      validateLearningMaterial(data, request.output_type);

      if (
        data.topic !== request.topic ||
        data.learning_goal !== request.learning_goal ||
        data.experience_level !== request.experience_level
      ) {
        throw new Error(
          "The generated material did not match your study settings."
        );
      }

      if (!mountedRef.current) {
        return;
      }

      setGeneratedResult(data);
      setResultVersion((version) => version + 1);
      setSavedContentId(null);
      setSaveTitle(data.content.title);
      setSaveError("");
      setSaveMessage("");
      setExportError("");
      setStatusMessage(
        `${getOutputLabel(data.output_type)} ready. You can study, save, or export it.`
      );
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      if (controller.signal.aborted && !timedOut) {
        return;
      }

      setGenerationError(
        timedOut
          ? "Generation took too long. Your inputs are still available; please retry."
          : error instanceof TypeError
            ? "Could not connect to the server. Check that the backend is running."
            : error instanceof Error
              ? error.message
              : "Your study material could not be generated."
      );
    } finally {
      window.clearTimeout(timeoutId);

      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;
      }

      if (mountedRef.current) {
        setLoading(false);
      }
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (busy) {
      return;
    }

    clearFeedback();
    setTopicError("");

    const cleanedTopic = topic.trim();
    const cleanedGoal = learningGoal.trim();

    if (!cleanedTopic || cleanedTopic.length > 200) {
      setTopicError("Enter a topic with between 1 and 200 characters.");
      topicRef.current?.focus();
      return;
    }

    if (cleanedGoal.length > 1000) {
      setGenerationError(
        "Learning goal must be 1,000 characters or fewer."
      );
      return;
    }

    if (
      !OUTPUT_TYPES.some((type) => type.value === outputType) ||
      !EXPERIENCE_LEVELS.some(
        (level) => level.value === experienceLevel
      )
    ) {
      setGenerationError("Choose a valid output type and experience level.");
      return;
    }

    generateStudyMaterial({
      topic: cleanedTopic,
      learning_goal: cleanedGoal,
      experience_level: experienceLevel,
      output_type: outputType,
    });
  };

  const handleRegenerate = () => {
    if (!generatedResult || busy) {
      return;
    }

    generateStudyMaterial({
      topic: generatedResult.topic,
      learning_goal: generatedResult.learning_goal,
      experience_level: generatedResult.experience_level,
      output_type: generatedResult.output_type,
    });
  };

  const handleReset = () => {
    if (busy) {
      return;
    }

    setTopic("");
    setLearningGoal("");
    setExperienceLevel("beginner");
    setOutputType("lesson");
    setTopicError("");
    setGeneratedResult(null);
    setLastRequest(null);
    setSavedContentId(null);
    setSaveTitle("");
    setSaveError("");
    setSaveMessage("");
    setExportError("");
    clearFeedback();
    topicRef.current?.focus();
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (
      !generatedResult ||
      requestControllerRef.current ||
      saveControllerRef.current ||
      exportBusyRef.current
    ) {
      return;
    }

    setSaveError("");
    setSaveMessage("");

    const title = saveTitle.trim();
    const project = projects.find(
      (item) => String(item.id) === selectedProjectId
    );

    if (!title) {
      setSaveError("Enter a title before saving.");
      return;
    }

    if (!project) {
      setSaveError("Choose a project before saving.");
      return;
    }

    let body;

    try {
      body = serializeLearningMaterial(generatedResult);
    } catch (error) {
      setSaveError(error.message);
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setSaveError("Your session has expired. Please sign in again.");
      return;
    }

    const controller = new AbortController();
    saveControllerRef.current = controller;
    setSaving(true);

    const timeoutId = window.setTimeout(
      () => controller.abort(),
      30000
    );

    try {
      const response = await fetch(
        savedContentId
          ? `${API_BASE_URL}/content/${savedContentId}`
          : `${API_BASE_URL}/content/`,
        {
          method: savedContentId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            title,
            content_type:
              LEARNING_STUDIO_CONTENT_TYPES[generatedResult.output_type],
            body,
            project_id: project.id,
          }),
          signal: controller.signal,
        }
      );

      const data = await response.json().catch(() => null);

      if (controller.signal.aborted) {
        throw new Error("Saving took too long.");
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            response,
            data,
            "The learning material could not be saved."
          )
        );
      }

      if (!Number.isInteger(data?.id)) {
        throw new Error("The server did not confirm the saved material.");
      }

      if (!mountedRef.current) {
        return;
      }

      setSavedContentId(data.id);
      setSaveMessage(
        `Saved to ${project.title}. Open the Content page to study, edit, or view its history.`
      );

      // A notification failure should not turn a successful save into an error.
      try {
        notifyContentSaved(title);
        addRecentActivity({
          type: "Content Saved",
          title: `${title} saved`,
          description: `Saved Learning Studio material to ${project.title}.`,
          projectName: project.title,
        });
      } catch (notificationError) {
        console.error("Save notification failed:", notificationError);
      }
    } catch (error) {
      if (mountedRef.current) {
        setSaveError(
          controller.signal.aborted
            ? "Saving took too long. Check the Content page before retrying; the server may have completed the save."
            : error instanceof Error
              ? error.message
              : "The learning material could not be saved."
        );
      }
    } finally {
      window.clearTimeout(timeoutId);

      if (saveControllerRef.current === controller) {
        saveControllerRef.current = null;
      }

      if (mountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleExport = async (format) => {
    if (
      !generatedResult ||
      requestControllerRef.current ||
      saveControllerRef.current ||
      exportBusyRef.current
    ) {
      return;
    }

    exportBusyRef.current = true;
    setExporting(true);
    setExportError("");

    try {
      const title =
        saveTitle.trim() || generatedResult.content.title;
      const body = learningMaterialToMarkdown(generatedResult);
      const fileName = getLearningMaterialFileName(title, format);

      if (format === "pdf") {
        exportContentAsPdf(title, body, fileName);
      } else if (format === "md") {
        exportContentAsMarkdown(title, body, fileName);
      } else if (format === "txt") {
        exportContentAsTxt(title, body, fileName);
      } else if (format === "docx") {
        await exportContentAsDocx(title, body, fileName);
      }
    } catch (error) {
      if (mountedRef.current) {
        setExportError(
          error instanceof Error
            ? error.message
            : "The material could not be exported."
        );
      }
    } finally {
      exportBusyRef.current = false;

      if (mountedRef.current) {
        setExporting(false);
      }
    }
  };

  return (
    <main className="min-h-screen w-full bg-slate-950 p-5 text-white sm:p-8">
      <section className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-6 shadow-xl sm:p-8">
        <header className="flex items-center gap-4">
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
        </header>

        <p className="mt-5 max-w-2xl leading-relaxed text-slate-400">
          Turn topics into lessons, flashcards, and quizzes tailored
          to your experience level. Save your materials to a project
          or export them for later.
        </p>

        <div className="mt-8 flex flex-col gap-6">
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-labelledby="learning-form-title"
            className="min-w-0 rounded-2xl border border-slate-700 bg-slate-950/40 p-5 sm:p-6"
          >
            <h2 id="learning-form-title" className="text-xl font-bold">
              Set Up Your Study Material
            </h2>
            <p className="mt-2 text-sm text-slate-400">
              Start with what you want to learn. Your learning goal is optional.
            </p>

            <div className="mt-6">
              <label
                htmlFor="learning-topic"
                className="mb-2 block text-sm font-semibold"
              >
                Topic <span className="text-cyan-300">(required)</span>
              </label>
              <input
                ref={topicRef}
                id="learning-topic"
                type="text"
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  setTopicError("");
                  clearFeedback();
                }}
                required
                maxLength={200}
                disabled={busy}
                aria-invalid={Boolean(topicError)}
                aria-describedby={
                  topicError
                    ? "learning-topic-help learning-topic-error"
                    : "learning-topic-help"
                }
                placeholder="e.g. Python loops or network security"
                className={FIELD_CLASS}
              />
              <p
                id="learning-topic-help"
                className="mt-2 text-xs text-slate-500"
              >
                Choose a subject or concept. {topic.length}/200
              </p>
              {topicError && (
                <p
                  id="learning-topic-error"
                  role="alert"
                  className="mt-2 text-sm text-red-300"
                >
                  {topicError}
                </p>
              )}
            </div>

            <div className="mt-6">
              <label
                htmlFor="learning-goal"
                className="mb-2 block text-sm font-semibold"
              >
                Learning Goal (optional)
              </label>
              <textarea
                id="learning-goal"
                value={learningGoal}
                onChange={(event) => {
                  setLearningGoal(event.target.value);
                  clearFeedback();
                }}
                rows={4}
                maxLength={1000}
                disabled={busy}
                placeholder="What do you want to understand or achieve?"
                className={`${FIELD_CLASS} resize-y`}
              />
              <p className="mt-2 text-xs text-slate-500">
                {learningGoal.length}/1000
              </p>
            </div>

            <div className="mt-6">
              <label
                htmlFor="learning-experience"
                className="mb-2 block text-sm font-semibold"
              >
                Experience Level
              </label>
              <select
                id="learning-experience"
                value={experienceLevel}
                onChange={(event) => {
                  setExperienceLevel(event.target.value);
                  clearFeedback();
                }}
                disabled={busy}
                className={FIELD_CLASS}
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="mt-6" disabled={busy}>
              <legend className="text-sm font-semibold">Output Type</legend>
              <p className="mt-2 text-xs text-slate-400">
                Use arrow keys when a radio option is focused.
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {OUTPUT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-center gap-3 rounded-xl border p-4 focus-within:ring-2 focus-within:ring-cyan-400 ${
                      busy ? "cursor-not-allowed" : "cursor-pointer"
                    } ${
                      outputType === type.value
                        ? "border-cyan-400 bg-cyan-400/10"
                        : "border-slate-700 bg-slate-900"
                    }`}
                  >
                    <input
                      type="radio"
                      name="outputType"
                      value={type.value}
                      checked={outputType === type.value}
                      onChange={(event) => {
                        setOutputType(event.target.value);
                        clearFeedback();
                      }}
                      className="h-4 w-4 accent-cyan-400"
                    />
                    <span className="text-sm font-semibold">{type.label}</span>
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="mt-6 text-sm leading-6 text-slate-400">
              {selectedOutput?.description}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button type="submit" disabled={busy} className={PRIMARY_BUTTON}>
                {loading
                  ? "Generating..."
                  : `Generate ${getOutputLabel(outputType)}`}
              </button>
              <button
                type="button"
                onClick={handleReset}
                disabled={busy}
                className={SECONDARY_BUTTON}
              >
                Clear Form
              </button>
            </div>
          </form>

          <section
            aria-labelledby="learning-output-title"
            aria-busy={busy}
            className="w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950/40 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="learning-output-title" className="text-xl font-bold">
                Your {displayedOutputLabel}
              </h2>
              {generatedResult && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={busy}
                  className={SECONDARY_BUTTON}
                >
                  Regenerate {displayedOutputLabel}
                </button>
              )}
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Regenerate uses the displayed material’s study settings.
              For different settings, update the form and select Generate.
            </p>

            <div role="status" aria-live="polite" aria-atomic="true">
              {loading ? (
                <p className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-sm text-cyan-200">
                  Generating{" "}
                  {getOutputLabel(lastRequest?.output_type).toLowerCase()}.
                  {generatedResult
                    ? " Your current material stays visible until the new result is ready."
                    : " This may take a moment."}
                </p>
              ) : statusMessage ? (
                <p className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-200">
                  {statusMessage}
                </p>
              ) : null}
            </div>

            {generationError && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-800 bg-red-950/40 p-4"
              >
                <p className="font-semibold text-red-200">
                  Study material could not be generated
                </p>
                <p className="mt-2 text-sm text-red-300">{generationError}</p>
                {lastRequest && (
                  <>
                    <p className="mt-2 break-words text-xs text-slate-400">
                      Retry uses your last submitted settings for{" "}
                      {lastRequest.topic}.
                    </p>
                    <button
                      type="button"
                      onClick={() => generateStudyMaterial(lastRequest)}
                      disabled={busy}
                      className={`${SECONDARY_BUTTON} mt-3`}
                    >
                      Retry Generation
                    </button>
                  </>
                )}
              </div>
            )}

            {generatedResult ? (
              <>
                <dl className="mt-5 space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4 text-sm">
                  <div>
                    <dt className="text-slate-400">Topic</dt>
                    <dd className="mt-1 break-words font-semibold">
                      {generatedResult.topic}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-400">Experience Level</dt>
                    <dd className="mt-1 capitalize">
                      {generatedResult.experience_level}
                    </dd>
                  </div>
                  {generatedResult.learning_goal && (
                    <div>
                      <dt className="text-slate-400">Learning Goal</dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words">
                        {generatedResult.learning_goal}
                      </dd>
                    </div>
                  )}
                </dl>

                <section className="mt-5 rounded-xl border border-slate-700 p-4">
                  <h3 className="font-bold text-cyan-200">Save and Export</h3>

                  <form onSubmit={handleSave} className="mt-4 space-y-4">
                    <div>
                      <label
                        htmlFor="learning-save-title"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Saved Title
                      </label>
                      <input
                        id="learning-save-title"
                        value={saveTitle}
                        onChange={(event) => {
                          setSaveTitle(event.target.value);
                          setSaveError("");
                          setSaveMessage("");
                        }}
                        disabled={busy}
                        className={FIELD_CLASS}
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="learning-save-project"
                        className="mb-2 block text-sm font-semibold"
                      >
                        Project
                      </label>
                      <select
                        id="learning-save-project"
                        value={selectedProjectId}
                        onChange={(event) => {
                          setSelectedProjectId(event.target.value);
                          setSaveError("");
                          setSaveMessage("");
                        }}
                        disabled={busy || projectsLoading}
                        className={FIELD_CLASS}
                      >
                        <option value="">
                          {projectsLoading
                            ? "Loading projects..."
                            : "Choose a project"}
                        </option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.title}
                          </option>
                        ))}
                      </select>
                    </div>

                    {!projectsLoading &&
                      !projectsError &&
                      projects.length === 0 && (
                        <p className="text-sm text-slate-400">
                          Create a project on the Projects page, then reload
                          the project list here.
                        </p>
                      )}

                    {projectsError && (
                      <p role="alert" className="text-sm text-red-300">
                        {projectsError}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-3">
                      <button
                        type="submit"
                        disabled={
                          busy ||
                          projectsLoading ||
                          !selectedProjectId ||
                          !saveTitle.trim()
                        }
                        className={PRIMARY_BUTTON}
                      >
                        {saving
                          ? "Saving..."
                          : savedContentId
                            ? "Update Saved Material"
                            : "Save to Project"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setProjectsReload((value) => value + 1)}
                        disabled={busy || projectsLoading}
                        className={SECONDARY_BUTTON}
                      >
                        Reload Projects
                      </button>
                    </div>

                    {savedContentId && (
                      <p className="text-xs leading-6 text-slate-400">
                        Saving again updates this saved item and preserves its
                        previous version. Generating new material starts a new item.
                      </p>
                    )}

                    {saveError && (
                      <p role="alert" className="text-sm text-red-300">
                        {saveError}
                      </p>
                    )}
                    {saveMessage && (
                      <p role="status" className="text-sm text-emerald-300">
                        {saveMessage}
                      </p>
                    )}
                  </form>

                  <div className="mt-5 flex flex-wrap gap-3 border-t border-slate-800 pt-5">
                    {[
                      ["pdf", "PDF"],
                      ["md", "Markdown"],
                      ["txt", "TXT"],
                      ["docx", "DOCX"],
                    ].map(([format, label]) => (
                      <button
                        key={format}
                        type="button"
                        onClick={() => handleExport(format)}
                        disabled={busy}
                        className={SECONDARY_BUTTON}
                      >
                        Export {label}
                      </button>
                    ))}
                  </div>

                  <p className="mt-3 text-xs leading-6 text-slate-400">
                    Exports include the complete material. Quiz exports include
                    correct answers and explanations in an answer key.
                  </p>
                  {exporting && (
                    <p role="status" className="mt-2 text-sm text-cyan-200">
                      Preparing your export...
                    </p>
                  )}
                  {exportError && (
                    <p role="alert" className="mt-2 text-sm text-red-300">
                      {exportError}
                    </p>
                  )}
                </section>

                <LearningMaterialView
                  key={resultVersion}
                  material={generatedResult}
                  disabled={busy}
                />
              </>
            ) : !loading && !generationError ? (
              <div className="mt-5 rounded-xl border border-dashed border-slate-700 p-6 text-center">
                <span className="text-3xl text-cyan-300" aria-hidden="true">
                  {selectedOutput?.icon}
                </span>
                <p className="mt-3 font-semibold">
                  Your {getOutputLabel(outputType).toLowerCase()} will appear here
                </p>
                <p className="mt-2 text-sm text-slate-400">
                  Enter a topic, choose a format, and select Generate.
                </p>
              </div>
            ) : null}
          </section>
        </div>
      </section>
    </main>
  );
}

export default LearningStudio;