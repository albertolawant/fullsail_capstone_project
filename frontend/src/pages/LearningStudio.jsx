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
const UPLOAD_TIMEOUT_MS = 30000;
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const MAX_SOURCE_TEXT_LENGTH = 40000;
const SUPPORTED_EXTENSIONS = [".pdf", ".docx", ".txt"];
const QUIZ_QUESTION_COUNTS = [5, 10, 15];
const DEFAULT_QUIZ_QUESTION_COUNT = 5;

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
      "Check your understanding with questions about a topic or your class notes.",
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

  if (response.status === 413) {
    return "The file is too large. Upload a file under 5 MB.";
  }

  if (response.status === 415) {
    return "Unsupported file type. Upload a PDF, DOCX, or TXT file.";
  }

  if (response.status === 422) {
    return "Please check your inputs and uploaded file.";
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

// Every panel stays mounted to preserve its form and study progress.
function LearningStudioPanel({
  outputType,
  active,
  projects,
  projectsLoading,
  projectsError,
  onReloadProjects,
}) {
  const [topic, setTopic] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [questionCount, setQuestionCount] = useState(
    DEFAULT_QUIZ_QUESTION_COUNT
  );
  const [topicError, setTopicError] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [statusMessage, setStatusMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [lastRequest, setLastRequest] = useState(null);
  const [lastRequestFilename, setLastRequestFilename] = useState("");
  const [generatedRequest, setGeneratedRequest] = useState(null);
  const [generatedSourceFilename, setGeneratedSourceFilename] =
    useState("");
  const [resultVersion, setResultVersion] = useState(0);

  const [uploadedNotes, setUploadedNotes] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const [selectedProjectId, setSelectedProjectId] = useState("");
  const [saveTitle, setSaveTitle] = useState("");
  const [savedContentId, setSavedContentId] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saveMessage, setSaveMessage] = useState("");

  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState("");

  const topicRef = useRef(null);
  const questionCountRef = useRef(null);
  const fileInputRef = useRef(null);
  const requestControllerRef = useRef(null);
  const uploadControllerRef = useRef(null);
  const saveControllerRef = useRef(null);
  const exportBusyRef = useRef(false);
  const mountedRef = useRef(false);

  const busy = loading || uploading || saving || exporting;
  const isQuiz = outputType === "quiz";
  const selectedOutput = OUTPUT_TYPES.find(
    (type) => type.value === outputType
  );
  const displayedOutputLabel = getOutputLabel(outputType);
  const fieldId = (name) => `learning-${outputType}-${name}`;

  const hasPendingOperation = () =>
    Boolean(
      requestControllerRef.current ||
        uploadControllerRef.current ||
        saveControllerRef.current ||
        exportBusyRef.current
    );

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestControllerRef.current?.abort();
      uploadControllerRef.current?.abort();
      saveControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (projectsLoading || projectsError) {
      return;
    }

    setSelectedProjectId((currentId) =>
      projects.some((project) => String(project.id) === currentId)
        ? currentId
        : ""
    );
  }, [projects, projectsLoading, projectsError]);

  const clearFeedback = () => {
    setGenerationError("");
    setStatusMessage("");
  };

  const handleNotesUpload = async (event) => {
    const file = event.target.files?.[0];

    // Allow the same file to be selected again after an error.
    event.target.value = "";

    if (!file || !isQuiz || hasPendingOperation()) {
      return;
    }

    setUploadError("");
    clearFeedback();
    setLastRequest(null);
    setLastRequestFilename("");

    const extension = file.name
      .slice(file.name.lastIndexOf("."))
      .toLowerCase();

    if (!SUPPORTED_EXTENSIONS.includes(extension)) {
      setUploadError(
        "Unsupported file type. Upload a PDF, DOCX, or TXT file."
      );
      return;
    }

    if (file.size === 0) {
      setUploadError(
        "This file is empty. Upload notes containing text."
      );
      return;
    }

    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(
        "The file is too large. Upload a file under 5 MB."
      );
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setUploadError(
        "Your session has expired. Please sign in again."
      );
      return;
    }

    const controller = new AbortController();
    uploadControllerRef.current = controller;
    setUploading(true);

    let timedOut = false;

    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, UPLOAD_TIMEOUT_MS);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${API_BASE_URL}/learning-studio/upload-notes`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
          signal: controller.signal,
        }
      );

      const data = await response.json().catch(() => null);

      if (controller.signal.aborted) {
        if (timedOut) {
          throw new Error("Upload timed out.");
        }

        return;
      }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            response,
            data,
            "The notes could not be uploaded."
          )
        );
      }

      const sourceText = data?.source_text;
      const filename = data?.filename;

      if (
        typeof filename !== "string" ||
        !filename.trim() ||
        Array.from(filename).length > 255 ||
        typeof sourceText !== "string" ||
        !sourceText.trim() ||
        !Number.isInteger(data?.character_count) ||
        data.character_count < 1 ||
        data.character_count > MAX_SOURCE_TEXT_LENGTH ||
        data.character_count !== Array.from(sourceText).length
      ) {
        throw new Error(
          "The server did not return valid text from this file."
        );
      }

      if (!mountedRef.current) {
        return;
      }

      // Replace previous notes only after a successful upload.
      setUploadedNotes({
        filename,
        sourceText,
        characterCount: data.character_count,
      });
    } catch (error) {
      if (!mountedRef.current) {
        return;
      }

      if (controller.signal.aborted && !timedOut) {
        return;
      }

      setUploadError(
        timedOut
          ? "Reading the file took too long. Please try again or upload a smaller file."
          : error instanceof TypeError
            ? "Could not connect to the server. Check that the backend is running."
            : error instanceof Error
              ? error.message
              : "The notes could not be uploaded."
      );
    } finally {
      window.clearTimeout(timeoutId);

      if (uploadControllerRef.current === controller) {
        uploadControllerRef.current = null;
      }

      if (mountedRef.current) {
        setUploading(false);
      }
    }
  };

  const handleRemoveNotes = () => {
    if (busy || hasPendingOperation()) {
      return;
    }

    setUploadedNotes(null);
    setUploadError("");
    setLastRequest(null);
    setLastRequestFilename("");
    clearFeedback();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.focus();
    }
  };

  const generateStudyMaterial = async (
    request,
    sourceFilename = ""
  ) => {
    if (hasPendingOperation()) {
      return;
    }

    if (request.output_type !== outputType) {
      setGenerationError(
        "Choose the matching tab for this study material."
      );
      return;
    }

    if (
      isQuiz &&
      !QUIZ_QUESTION_COUNTS.includes(request.question_count)
    ) {
      setGenerationError("Choose 5, 10, or 15 quiz questions.");
      return;
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;

    setLoading(true);
    setGenerationError("");
    setStatusMessage("");
    setLastRequest({ ...request });
    setLastRequestFilename(sourceFilename);

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

      validateLearningMaterial(data, outputType);

      if (
        data.output_type !== outputType ||
        data.topic !== request.topic ||
        data.learning_goal !== request.learning_goal ||
        data.experience_level !== request.experience_level
      ) {
        throw new Error(
          "The generated material did not match your study settings."
        );
      }

      if (
        isQuiz &&
        data.content.questions.length !== request.question_count
      ) {
        throw new Error(
          `The quiz did not contain the requested ${request.question_count} questions. Please try again.`
        );
      }

      if (!mountedRef.current) {
        return;
      }

      setGeneratedResult(data);

      // Preserve the successful request, including its count and notes.
      // Form changes and failed requests do not replace this snapshot.
      setGeneratedRequest({ ...request });
      setGeneratedSourceFilename(sourceFilename);

      setResultVersion((version) => version + 1);
      setSavedContentId(null);
      setSaveTitle(data.content.title);
      setSaveError("");
      setSaveMessage("");
      setExportError("");
      setStatusMessage(
        isQuiz
          ? `Your ${request.question_count}-question quiz is ready. You can study, save, or export it.`
          : `${getOutputLabel(outputType)} ready. You can study, save, or export it.`
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

    if (busy || hasPendingOperation()) {
      return;
    }

    clearFeedback();
    setTopicError("");
    setLastRequest(null);
    setLastRequestFilename("");

    const cleanedTopic = topic.trim();
    const cleanedGoal = learningGoal.trim();

    if (!cleanedTopic || cleanedTopic.length > 200) {
      setTopicError(
        "Enter a topic with between 1 and 200 characters."
      );
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
      !EXPERIENCE_LEVELS.some(
        (level) => level.value === experienceLevel
      )
    ) {
      setGenerationError("Choose a valid experience level.");
      return;
    }

    if (
      isQuiz &&
      !QUIZ_QUESTION_COUNTS.includes(questionCount)
    ) {
      setGenerationError("Choose 5, 10, or 15 quiz questions.");
      questionCountRef.current?.focus();
      return;
    }

    const request = {
      topic: cleanedTopic,
      learning_goal: cleanedGoal,
      experience_level: experienceLevel,
      output_type: outputType,
    };

    if (isQuiz) {
      request.question_count = questionCount;

      if (uploadedNotes) {
        request.source_text = uploadedNotes.sourceText;
      }
    }

    generateStudyMaterial(
      request,
      isQuiz && uploadedNotes ? uploadedNotes.filename : ""
    );
  };

  const handleRegenerate = () => {
    if (
      !generatedResult ||
      !generatedRequest ||
      busy ||
      hasPendingOperation()
    ) {
      return;
    }

    generateStudyMaterial(
      { ...generatedRequest },
      generatedSourceFilename
    );
  };

  const handleReset = () => {
    if (busy || hasPendingOperation()) {
      return;
    }

    setTopic("");
    setLearningGoal("");
    setExperienceLevel("beginner");
    setQuestionCount(DEFAULT_QUIZ_QUESTION_COUNT);
    setTopicError("");
    setGeneratedResult(null);
    setGeneratedRequest(null);
    setGeneratedSourceFilename("");
    setLastRequest(null);
    setLastRequestFilename("");
    setUploadedNotes(null);
    setUploadError("");
    setSavedContentId(null);
    setSaveTitle("");
    setSaveError("");
    setSaveMessage("");
    setExportError("");
    clearFeedback();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }

    topicRef.current?.focus();
  };

  const handleSave = async (event) => {
    event.preventDefault();

    if (!generatedResult || hasPendingOperation()) {
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
      setSaveError(
        error instanceof Error
          ? error.message
          : "The learning material could not be prepared for saving."
      );
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setSaveError(
        "Your session has expired. Please sign in again."
      );
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
            content_type: LEARNING_STUDIO_CONTENT_TYPES[outputType],
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
        throw new Error(
          "The server did not confirm the saved material."
        );
      }

      if (!mountedRef.current) {
        return;
      }

      setSavedContentId(data.id);
      setSaveMessage(
        `Saved to ${project.title}. Open the Content page to study, edit, or view its history.`
      );

      try {
        notifyContentSaved(title);
        addRecentActivity({
          type: "Content Saved",
          title: `${title} saved`,
          description: `Saved Learning Studio material to ${project.title}.`,
          projectName: project.title,
        });
      } catch (notificationError) {
        console.error(
          "Save notification failed:",
          notificationError
        );
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
    if (!generatedResult || hasPendingOperation()) {
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
        await exportContentAsPdf(title, body, fileName);
      } else if (format === "md") {
        await exportContentAsMarkdown(title, body, fileName);
      } else if (format === "txt") {
        await exportContentAsTxt(title, body, fileName);
      } else if (format === "docx") {
        await exportContentAsDocx(title, body, fileName);
      } else {
        throw new Error("Choose a supported export format.");
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
    <div
      id={`learning-studio-panel-${outputType}`}
      role="tabpanel"
      aria-labelledby={`learning-studio-tab-${outputType}`}
      hidden={!active}
      tabIndex={0}
      className="rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
    >
      <div className="flex flex-col gap-6">
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-labelledby={fieldId("form-title")}
          className="min-w-0 rounded-2xl border border-slate-700 bg-slate-950/40 p-5 sm:p-6"
        >
          <div className="flex items-start gap-3">
            <div
              aria-hidden="true"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-cyan-400/10 text-xl text-cyan-300"
            >
              {selectedOutput?.icon}
            </div>
            <div>
              <h2
                id={fieldId("form-title")}
                className="text-xl font-bold"
              >
                Set Up Your {displayedOutputLabel}
              </h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {selectedOutput?.description}
              </p>
            </div>
          </div>

          <p className="mt-4 text-sm text-slate-400">
            {isQuiz
              ? "Enter a topic, choose your question count, and optionally upload class notes."
              : "Start with what you want to learn. Your learning goal is optional."}
          </p>

          <div className="mt-6">
            <label
              htmlFor={fieldId("topic")}
              className="mb-2 block text-sm font-semibold"
            >
              Topic{" "}
              <span className="text-cyan-300">(required)</span>
            </label>
            <input
              ref={topicRef}
              id={fieldId("topic")}
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
                  ? `${fieldId("topic-help")} ${fieldId("topic-error")}`
                  : fieldId("topic-help")
              }
              placeholder="e.g. Python loops or network security"
              className={FIELD_CLASS}
            />
            <p
              id={fieldId("topic-help")}
              className="mt-2 text-xs text-slate-500"
            >
              {isQuiz && uploadedNotes
                ? "Choose a topic covered in your uploaded notes."
                : "Choose a subject or concept."}{" "}
              {topic.length}/200
            </p>
            {topicError && (
              <p
                id={fieldId("topic-error")}
                role="alert"
                className="mt-2 text-sm text-red-300"
              >
                {topicError}
              </p>
            )}
          </div>

          {isQuiz && (
            <div className="mt-6">
              <label
                htmlFor={fieldId("question-count")}
                className="mb-2 block text-sm font-semibold"
              >
                Number of Questions
              </label>
              <select
                ref={questionCountRef}
                id={fieldId("question-count")}
                value={questionCount}
                onChange={(event) => {
                  setQuestionCount(Number(event.target.value));
                  setLastRequest(null);
                  setLastRequestFilename("");
                  clearFeedback();
                }}
                disabled={busy}
                aria-describedby={fieldId("question-count-help")}
                className={FIELD_CLASS}
              >
                {QUIZ_QUESTION_COUNTS.map((count) => (
                  <option key={count} value={count}>
                    {count} questions
                  </option>
                ))}
              </select>
              <p
                id={fieldId("question-count-help")}
                className="mt-2 text-xs leading-6 text-slate-500"
              >
                Choose 5, 10, or 15 questions for a topic-based or
                notes-based quiz. Uploaded notes must contain enough
                information for the selected count.
              </p>
            </div>
          )}

          {isQuiz && (
            <section
              aria-labelledby={fieldId("notes-title")}
              aria-busy={uploading}
              className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4"
            >
              <h3
                id={fieldId("notes-title")}
                className="font-semibold text-cyan-200"
              >
                Class Notes (optional)
              </h3>

              <p
                id={fieldId("notes-help")}
                className="mt-2 text-sm leading-6 text-slate-400"
              >
                Upload a PDF, DOCX, or TXT file under 5 MB.
                Notes can contain up to 40,000 extracted characters.
                PDFs must contain selectable text and no more than
                100 pages.
              </p>

              <p className="mt-2 text-xs leading-6 text-slate-400">
                When you generate a quiz, the extracted notes are
                sent to the AI service as source material.
              </p>

              <label
                htmlFor={fieldId("notes-file")}
                className="mb-2 mt-4 block text-sm font-semibold"
              >
                {uploadedNotes
                  ? "Replace Class Notes"
                  : "Upload Class Notes"}
              </label>

              <input
                ref={fileInputRef}
                id={fieldId("notes-file")}
                type="file"
                accept=".pdf,.docx,.txt"
                onChange={handleNotesUpload}
                disabled={busy}
                aria-invalid={Boolean(uploadError)}
                aria-describedby={
                  uploadError
                    ? `${fieldId("notes-help")} ${fieldId("notes-error")}`
                    : fieldId("notes-help")
                }
                className={`${FIELD_CLASS} file:mr-4 file:rounded-lg file:border-0 file:bg-cyan-400 file:px-3 file:py-2 file:font-semibold file:text-slate-950`}
              />

              <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
              >
                {uploading ? (
                  <p className="mt-3 text-sm text-cyan-200">
                    Uploading and reading your notes...
                  </p>
                ) : uploadedNotes ? (
                  <p className="mt-3 break-words text-sm text-emerald-300">
                    Ready: {uploadedNotes.filename} —{" "}
                    {uploadedNotes.characterCount.toLocaleString()}{" "}
                    characters extracted.
                  </p>
                ) : (
                  <p className="mt-3 text-sm text-slate-400">
                    No notes selected. The quiz will use your topic.
                  </p>
                )}
              </div>

              {uploadError && (
                <div
                  id={fieldId("notes-error")}
                  role="alert"
                  className="mt-3 rounded-lg border border-red-800 bg-red-950/40 p-3 text-sm text-red-300"
                >
                  <p>{uploadError}</p>
                  {uploadedNotes && (
                    <p className="mt-2">
                      Your previous notes, {uploadedNotes.filename},
                      are still selected. Remove them below if you
                      want to generate without notes.
                    </p>
                  )}
                </div>
              )}

              {uploadedNotes && (
                <>
                  <button
                    type="button"
                    onClick={handleRemoveNotes}
                    disabled={busy}
                    className={`${SECONDARY_BUTTON} mt-4`}
                  >
                    Remove Notes
                  </button>

                  <details className="mt-4 rounded-lg border border-slate-700 bg-slate-950/50 p-3">
                    <summary className="cursor-pointer text-sm font-semibold text-cyan-200">
                      Preview Extracted Text
                    </summary>
                    <pre className="mt-3 max-h-64 overflow-y-auto whitespace-pre-wrap break-words font-sans text-sm leading-6 text-slate-300">
                      {uploadedNotes.sourceText}
                    </pre>
                  </details>
                </>
              )}

              <p className="mt-3 text-xs leading-6 text-slate-400">
                Replacing or removing notes affects the next Generate
                Quiz request. Regenerate Quiz reuses the notes from
                the displayed quiz. Notes are cleared when you leave
                this page or select Clear This Tab.
              </p>
            </section>
          )}

          <div className="mt-6">
            <label
              htmlFor={fieldId("goal")}
              className="mb-2 block text-sm font-semibold"
            >
              Learning Goal (optional)
            </label>
            <textarea
              id={fieldId("goal")}
              value={learningGoal}
              onChange={(event) => {
                setLearningGoal(event.target.value);
                clearFeedback();
              }}
              rows={4}
              maxLength={1000}
              disabled={busy}
              aria-describedby={fieldId("goal-help")}
              placeholder="What do you want to understand or achieve?"
              className={`${FIELD_CLASS} resize-y`}
            />
            <p
              id={fieldId("goal-help")}
              className="mt-2 text-xs text-slate-500"
            >
              {learningGoal.length}/1000
            </p>
          </div>

          <div className="mt-6">
            <label
              htmlFor={fieldId("experience")}
              className="mb-2 block text-sm font-semibold"
            >
              Experience Level
            </label>
            <select
              id={fieldId("experience")}
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

          <div className="mt-6 rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4">
            <p className="text-sm font-semibold text-cyan-200">
              {displayedOutputLabel} Generator
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              This tab generates{" "}
              {displayedOutputLabel.toLowerCase()} material. Each
              tab keeps its own study settings and results while
              you stay on this page.
            </p>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="submit"
              disabled={busy}
              className={PRIMARY_BUTTON}
            >
              {uploading
                ? "Reading Notes..."
                : loading
                  ? "Generating..."
                  : `Generate ${displayedOutputLabel}`}
            </button>
            <button
              type="button"
              onClick={handleReset}
              disabled={busy}
              className={SECONDARY_BUTTON}
            >
              Clear This Tab
            </button>
          </div>
        </form>

        <section
          aria-labelledby={fieldId("output-title")}
          aria-busy={busy}
          className="w-full min-w-0 rounded-2xl border border-slate-700 bg-slate-950/40 p-5 sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2
              id={fieldId("output-title")}
              className="text-xl font-bold"
            >
              Your {displayedOutputLabel}
            </h2>

            {generatedResult && (
              <button
                type="button"
                onClick={handleRegenerate}
                disabled={busy || !generatedRequest}
                className={SECONDARY_BUTTON}
              >
                Regenerate {displayedOutputLabel}
              </button>
            )}
          </div>

          <p className="mt-2 text-sm leading-6 text-slate-400">
            {isQuiz
              ? "Regenerate uses the displayed quiz’s topic, experience level, learning goal, question count, and original notes, if any. To use different settings, update the form and select Generate Quiz."
              : "Regenerate uses the displayed material’s study settings. For different settings, update the form and select Generate."}
          </p>

          <div
            role="status"
            aria-live="polite"
            aria-atomic="true"
          >
            {loading ? (
              <p className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-sm text-cyan-200">
                {isQuiz
                  ? `Generating ${lastRequest?.question_count ?? questionCount} quiz questions.`
                  : `Generating ${displayedOutputLabel.toLowerCase()}.`}
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
              <p className="mt-2 text-sm text-red-300">
                {generationError}
              </p>

              {lastRequest && (
                <>
                  <p className="mt-2 break-words text-xs text-slate-400">
                    Retry uses your last submitted settings for{" "}
                    {lastRequest.topic}
                    {isQuiz
                      ? ` with ${lastRequest.question_count} questions`
                      : ""}
                    {lastRequestFilename
                      ? ` and notes from ${lastRequestFilename}`
                      : ""}
                    .
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      generateStudyMaterial(
                        lastRequest,
                        lastRequestFilename
                      )
                    }
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
                  <dt className="text-slate-400">
                    Experience Level
                  </dt>
                  <dd className="mt-1 capitalize">
                    {generatedResult.experience_level}
                  </dd>
                </div>

                {generatedResult.learning_goal && (
                  <div>
                    <dt className="text-slate-400">
                      Learning Goal
                    </dt>
                    <dd className="mt-1 whitespace-pre-wrap break-words">
                      {generatedResult.learning_goal}
                    </dd>
                  </div>
                )}

                {isQuiz && (
                  <>
                    <div>
                      <dt className="text-slate-400">
                        Number of Questions
                      </dt>
                      <dd className="mt-1">
                        {generatedResult.content.questions.length}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-400">
                        Quiz Source
                      </dt>
                      <dd className="mt-1 break-words">
                        {generatedSourceFilename
                          ? `Class notes: ${generatedSourceFilename}`
                          : "Topic-based generation"}
                      </dd>
                    </div>
                  </>
                )}
              </dl>

              <section className="mt-5 rounded-xl border border-slate-700 p-4">
                <h3 className="font-bold text-cyan-200">
                  Save and Export
                </h3>

                <form
                  onSubmit={handleSave}
                  className="mt-4 space-y-4"
                >
                  <div>
                    <label
                      htmlFor={fieldId("save-title")}
                      className="mb-2 block text-sm font-semibold"
                    >
                      Saved Title
                    </label>
                    <input
                      id={fieldId("save-title")}
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
                      htmlFor={fieldId("save-project")}
                      className="mb-2 block text-sm font-semibold"
                    >
                      Project
                    </label>
                    <select
                      id={fieldId("save-project")}
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
                        <option
                          key={project.id}
                          value={project.id}
                        >
                          {project.title}
                        </option>
                      ))}
                    </select>
                  </div>

                  {!projectsLoading &&
                    !projectsError &&
                    projects.length === 0 && (
                      <p className="text-sm text-slate-400">
                        Create a project on the Projects page,
                        then reload the project list here.
                      </p>
                    )}

                  {projectsError && (
                    <p
                      role="alert"
                      className="text-sm text-red-300"
                    >
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
                      onClick={onReloadProjects}
                      disabled={busy || projectsLoading}
                      className={SECONDARY_BUTTON}
                    >
                      Reload Projects
                    </button>
                  </div>

                  {savedContentId && (
                    <p className="text-xs leading-6 text-slate-400">
                      Saving again updates this saved item and
                      preserves its previous version. Generating
                      new material starts a new item.
                    </p>
                  )}

                  {saveError && (
                    <p
                      role="alert"
                      className="text-sm text-red-300"
                    >
                      {saveError}
                    </p>
                  )}

                  {saveMessage && (
                    <p
                      role="status"
                      className="text-sm text-emerald-300"
                    >
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
                  Exports include the complete material. Quiz
                  exports include correct answers and explanations
                  in an answer key.
                </p>

                {exporting && (
                  <p
                    role="status"
                    className="mt-2 text-sm text-cyan-200"
                  >
                    Preparing your export...
                  </p>
                )}

                {exportError && (
                  <p
                    role="alert"
                    className="mt-2 text-sm text-red-300"
                  >
                    {exportError}
                  </p>
                )}
              </section>

              <LearningMaterialView
                key={`${outputType}-${resultVersion}`}
                material={generatedResult}
                disabled={busy || !active}
              />
            </>
          ) : !loading && !generationError ? (
            <div className="mt-5 rounded-xl border border-dashed border-slate-700 p-6 text-center">
              <span
                className="text-3xl text-cyan-300"
                aria-hidden="true"
              >
                {selectedOutput?.icon}
              </span>
              <p className="mt-3 font-semibold">
                Your {displayedOutputLabel.toLowerCase()} will
                appear here
              </p>
              <p className="mt-2 text-sm text-slate-400">
                {isQuiz
                  ? "Enter a topic, choose your question count, optionally upload notes, and select Generate Quiz."
                  : `Enter a topic and select Generate ${displayedOutputLabel}.`}
              </p>
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

function LearningStudio() {
  const [activeTab, setActiveTab] = useState("lesson");
  const [projects, setProjects] = useState([]);
  const [projectsLoading, setProjectsLoading] = useState(false);
  const [projectsError, setProjectsError] = useState("");
  const [projectsReload, setProjectsReload] = useState(0);
  const tabRefs = useRef([]);

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

        const response = await fetch(
          `${API_BASE_URL}/projects/`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
            signal: controller.signal,
          }
        );

        const data = await response.json().catch(() => null);

        if (controller.signal.aborted) {
          return;
        }

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
          throw new Error(
            "The server returned invalid project information."
          );
        }

        setProjects(data);
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

  const handleTabKeyDown = (event, currentIndex) => {
    let nextIndex;

    if (event.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % OUTPUT_TYPES.length;
    } else if (event.key === "ArrowLeft") {
      nextIndex =
        (currentIndex - 1 + OUTPUT_TYPES.length) %
        OUTPUT_TYPES.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = OUTPUT_TYPES.length - 1;
    } else {
      return;
    }

    event.preventDefault();
    setActiveTab(OUTPUT_TYPES[nextIndex].value);
    tabRefs.current[nextIndex]?.focus();
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
          to your experience level. Choose 5, 10, or 15 quiz
          questions, upload class notes, and save or export your
          materials for later.
        </p>

        <div
          role="tablist"
          aria-label="Learning Studio tools"
          aria-orientation="horizontal"
          className="mb-6 mt-8 flex gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.18)]"
        >
          {OUTPUT_TYPES.map((tab, index) => {
            const isActive = activeTab === tab.value;

            return (
              <button
                key={tab.value}
                ref={(element) => {
                  tabRefs.current[index] = element;
                }}
                id={`learning-studio-tab-${tab.value}`}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`learning-studio-panel-${tab.value}`}
                tabIndex={isActive ? 0 : -1}
                onClick={() => setActiveTab(tab.value)}
                onKeyDown={(event) =>
                  handleTabKeyDown(event, index)
                }
                className={`min-w-0 flex-1 rounded-xl px-2 py-3 text-sm font-bold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:flex-none sm:px-5 ${
                  isActive
                    ? "border border-cyan-400/40 bg-cyan-400/15 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.10)]"
                    : "border border-transparent text-slate-400 hover:bg-slate-900 hover:text-white"
                }`}
              >
                <span
                  aria-hidden="true"
                  className="mr-2 hidden sm:inline"
                >
                  {tab.icon}
                </span>
                {tab.label}
              </button>
            );
          })}
        </div>

        {OUTPUT_TYPES.map((type) => (
          <LearningStudioPanel
            key={type.value}
            outputType={type.value}
            active={activeTab === type.value}
            projects={projects}
            projectsLoading={projectsLoading}
            projectsError={projectsError}
            onReloadProjects={() =>
              setProjectsReload((value) => value + 1)
            }
          />
        ))}
      </section>
    </main>
  );
}

export default LearningStudio;