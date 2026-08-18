import { useState } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { addRecentActivity } from "../utils/activityStorage";
import { exportContentAsPdf } from "../utils/exportPdf";
import { exportContentAsMarkdown } from "../utils/exportMarkdown";
import { exportContentAsTxt } from "../utils/exportTxt";

const AI_REQUEST_TIMEOUT_MS = 35000;
const SLOW_REQUEST_THRESHOLD_MS = 30000;
const SETTINGS_KEY = "tanioSettings";

const DEFAULT_AI_SETTINGS = {
  creativity: "balanced",
  responseLength: "medium",
  defaultTone: "professional",
};

function getAiGenerationSettings() {
  try {
    const storedSettings = localStorage.getItem(SETTINGS_KEY);

    if (!storedSettings) {
      return DEFAULT_AI_SETTINGS;
    }

    const parsedSettings = JSON.parse(storedSettings);

    return {
      creativity:
        parsedSettings?.ai?.creativity || DEFAULT_AI_SETTINGS.creativity,
      responseLength:
        parsedSettings?.ai?.responseLength ||
        DEFAULT_AI_SETTINGS.responseLength,
      defaultTone:
        parsedSettings?.ai?.defaultTone || DEFAULT_AI_SETTINGS.defaultTone,
    };
  } catch {
    return DEFAULT_AI_SETTINGS;
  }
}

function buildAiPreferenceInstructions(aiSettings) {
  const creativityInstructions = {
    focused:
      "Stay closely grounded in the project description. Prioritize practical, realistic, and directly relevant recommendations over speculative ideas.",
    balanced:
      "Balance practical recommendations with thoughtful creativity. Introduce useful ideas without drifting away from the project's goals.",
    creative:
      "Be highly imaginative and exploratory. Suggest distinctive ideas, creative approaches, and less obvious opportunities while remaining relevant to the project.",
  };

  const responseLengthInstructions = {
    short:
      "Keep the response concise. Focus on the most important information and avoid unnecessary detail.",
    medium:
      "Provide a moderately detailed response with enough explanation to be useful without becoming overly long.",
    long:
      "Provide a comprehensive and detailed response. Expand on recommendations, reasoning, examples, risks, and implementation considerations where appropriate.",
  };

  const toneInstructions = {
    professional:
      "Use a polished, professional, clear, and business-appropriate tone.",
    casual:
      "Use a friendly, approachable, conversational tone while remaining clear and useful.",
    concise:
      "Use a direct, efficient tone. Avoid filler and keep wording tight.",
    detailed:
      "Use an explanatory, thorough tone with clear context and supporting detail.",
  };

  return [
    "AI generation preferences:",
    `- Creativity: ${aiSettings.creativity}. ${
      creativityInstructions[aiSettings.creativity] ||
      creativityInstructions.balanced
    }`,
    `- Response length: ${aiSettings.responseLength}. ${
      responseLengthInstructions[aiSettings.responseLength] ||
      responseLengthInstructions.medium
    }`,
    `- Tone: ${aiSettings.defaultTone}. ${
      toneInstructions[aiSettings.defaultTone] ||
      toneInstructions.professional
    }`,
  ].join("\n");
}

function ProductArchitect() {
  const location = useLocation();
  const selectedProject = location.state?.project;

  const [projectName, setProjectName] = useState(
    selectedProject?.title || "Tanio AI"
  );

  const [description, setDescription] = useState(
    selectedProject?.description ||
      "An AI-powered workspace platform with modules for project planning and content creation."
  );

  const [contentType, setContentType] = useState("prd");
  const [generatedContent, setGeneratedContent] = useState("");
  const [generationHistory, setGenerationHistory] = useState([]);
  const [currentVersionIndex, setCurrentVersionIndex] = useState(-1);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const endpointMap = {
    prd: "/product-architect/prd",
    persona: "/product-architect/persona",
    userStories: "/product-architect/user-stories",
    featureList: "/product-architect/feature-list",
    technicalArchitecture: "/product-architect/technical-architecture",
  };

  const documentTypeLabels = {
    prd: "Product Requirements Document",
    persona: "User Persona",
    userStories: "User Stories",
    featureList: "Feature List",
    technicalArchitecture: "Technical Architecture",
  };

  const markdownComponents = {
    h1: ({ children }) => (
      <h1 className="text-3xl font-bold text-white mb-6">{children}</h1>
    ),

    h2: ({ children }) => (
      <h2 className="text-2xl font-bold text-white mt-8 mb-4">{children}</h2>
    ),

    h3: ({ children }) => (
      <h3 className="text-xl font-semibold text-cyan-400 mt-6 mb-3">
        {children}
      </h3>
    ),

    p: ({ children }) => (
      <p className="text-slate-200 leading-relaxed mb-4">{children}</p>
    ),

    ul: ({ children }) => (
      <ul className="list-disc pl-6 text-slate-200 mb-4 space-y-2">
        {children}
      </ul>
    ),

    ol: ({ children }) => (
      <ol className="list-decimal pl-6 text-slate-200 mb-4 space-y-2">
        {children}
      </ol>
    ),

    li: ({ children }) => <li>{children}</li>,

    strong: ({ children }) => (
      <strong className="font-semibold text-white">{children}</strong>
    ),

    hr: () => <hr className="border-slate-700 my-8" />,

    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-cyan-500 pl-4 my-4 text-slate-300 italic">
        {children}
      </blockquote>
    ),

    code: ({ children }) => (
      <code className="bg-slate-950 text-cyan-300 px-1.5 py-0.5 rounded">
        {children}
      </code>
    ),

    table: ({ children }) => (
      <div className="overflow-x-auto my-6">
        <table className="w-full border-collapse border border-slate-700">
          {children}
        </table>
      </div>
    ),

    thead: ({ children }) => (
      <thead className="bg-slate-800">{children}</thead>
    ),

    th: ({ children }) => (
      <th className="border border-slate-700 px-4 py-3 text-left text-white">
        {children}
      </th>
    ),

    td: ({ children }) => (
      <td className="border border-slate-700 px-4 py-3 text-slate-200">
        {children}
      </td>
    ),
  };

  const handlePreviousVersion = () => {
    if (currentVersionIndex <= 0) {
      return;
    }

    const previousIndex = currentVersionIndex - 1;
    setCurrentVersionIndex(previousIndex);
    setGeneratedContent(generationHistory[previousIndex].content);
    setSuccessMessage("");
    setError("");
  };

  const handleNextVersion = () => {
    if (currentVersionIndex >= generationHistory.length - 1) {
      return;
    }

    const nextIndex = currentVersionIndex + 1;
    setCurrentVersionIndex(nextIndex);
    setGeneratedContent(generationHistory[nextIndex].content);
    setSuccessMessage("");
    setError("");
  };

  const handleGenerate = async (isRegeneration = false) => {
    if (loading) {
      return;
    }

    const cleanedProjectName = projectName.trim();
    const cleanedDescription = description.trim();

    setError("");
    setSuccessMessage("");
    if (!isRegeneration) {
      setGeneratedContent("");
      setGenerationHistory([]);
      setCurrentVersionIndex(-1);
    }

    if (cleanedProjectName.length < 2) {
      setError("Project name must contain at least 2 characters.");
      return;
    }

    if (cleanedProjectName.length > 100) {
      setError("Project name cannot be longer than 100 characters.");
      return;
    }

    if (cleanedDescription.length < 10) {
      setError("Project description must contain at least 10 characters.");
      return;
    }

    if (cleanedDescription.length > 5000) {
      setError("Project description cannot be longer than 5,000 characters.");
      return;
    }

    setLoading(true);
    setRegenerating(isRegeneration && Boolean(generatedContent));
    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      AI_REQUEST_TIMEOUT_MS
    );
    const startedAt = performance.now();

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const endpoint = endpointMap[contentType];

      if (!endpoint) {
        throw new Error("Please select a valid document type.");
      }

      const aiSettings = getAiGenerationSettings();

      const aiPreferenceInstructions =
        buildAiPreferenceInstructions(aiSettings);

      const descriptionWithPreferences = `${cleanedDescription}

${aiPreferenceInstructions}`;

      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_name: cleanedProjectName,
          description: descriptionWithPreferences,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        let message = "Failed to generate content. Please try again.";

        if (typeof errorData?.detail === "string") {
          message = errorData.detail;
        } else if (response.status === 400) {
          message = "Please check your project information and try again.";
        } else if (response.status === 401) {
          message = "Your session has expired. Please sign in again.";
        } else if (response.status === 403) {
          message = "You are not authorized to perform this action.";
        } else if (response.status === 422) {
          message =
            "Please enter a valid project name and a more detailed description.";
        } else if (response.status === 429) {
          message =
            "The AI service is receiving too many requests. Please wait a moment and try again.";
        } else if (response.status === 502) {
          message =
            "The AI service could not complete the request. Please try again.";
        } else if (response.status === 503) {
          message =
            "The AI service is temporarily unavailable. Please try again later.";
        } else if (response.status === 504) {
          message = "The AI request took too long. Please try again.";
        }

        throw new Error(message);
      }

      const data = await response.json();

      if (!data?.body || !data.body.trim()) {
        throw new Error("The AI did not return any content. Please try again.");
      }

      const newVersion = {
        content: data.body,
        createdAt: new Date().toISOString(),
        documentType: contentType,
      };

      const nextHistory =
        isRegeneration && generationHistory.length > 0
          ? [...generationHistory, newVersion]
          : [newVersion];

      setGenerationHistory(nextHistory);
      setCurrentVersionIndex(nextHistory.length - 1);
      setGeneratedContent(data.body);

      setSuccessMessage(
        `${documentTypeLabels[contentType] || "Content"} ${
          isRegeneration ? "regenerated" : "generated"
        } successfully.`
      );

      addRecentActivity({
        type: "Content Generated",
        title: `${cleanedProjectName} content ${
          isRegeneration ? "regenerated" : "generated"
        }`,
        description: `Created a new ${
          documentTypeLabels[contentType] || contentType
        }.`,
        projectName: cleanedProjectName,
      });
    } catch (err) {
      console.error("Generation error:", err);
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("The AI request took too long. Please try generating the content again.");
      } else if (err instanceof TypeError) {
        setError(
          "Could not connect to the server. Make sure the backend is running and try again."
        );
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Something went wrong while generating content. Please try again."
        );
      }
    } finally {
      window.clearTimeout(timeoutId);

      const duration = Math.round(performance.now() - startedAt);
      console.info(`Product Architect AI request completed in ${duration} ms`);

      if (duration > SLOW_REQUEST_THRESHOLD_MS) {
        console.warn(
          `Product Architect AI request exceeded the ${SLOW_REQUEST_THRESHOLD_MS} ms performance target.`
        );
      }

      setLoading(false);
      setRegenerating(false);
    }
  };

  const handleExportPdf = () => {
    try {
      setError("");

      const cleanedProjectName = projectName.trim() || "Tanio AI";
      const documentLabel =
        documentTypeLabels[contentType] || "Generated Content";

      const safeProjectName = cleanedProjectName
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      exportContentAsPdf(
        `${cleanedProjectName} - ${documentLabel}`,
        generatedContent,
        `${safeProjectName}-${contentType}.pdf`
      );

      addRecentActivity({
        type: "Content Exported",
        title: `${cleanedProjectName} exported as PDF`,
        description: `Downloaded the ${documentLabel} as a PDF file.`,
        projectName: cleanedProjectName,
      });
    } catch (err) {
      console.error("PDF export error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while exporting the PDF."
      );
    }
  };

  const handleExportMarkdown = () => {
    try {
      setError("");

      const cleanedProjectName = projectName.trim() || "Tanio AI";
      const documentLabel =
        documentTypeLabels[contentType] || "Generated Content";

      const safeProjectName = cleanedProjectName
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      exportContentAsMarkdown(
        `${cleanedProjectName} - ${documentLabel}`,
        generatedContent,
        `${safeProjectName}-${contentType}.md`
      );

      addRecentActivity({
        type: "Content Exported",
        title: `${cleanedProjectName} exported as Markdown`,
        description: `Downloaded the ${documentLabel} as a Markdown file.`,
        projectName: cleanedProjectName,
      });
    } catch (err) {
      console.error("Markdown export error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while exporting the Markdown file."
      );
    }
  };

  const handleExportTxt = () => {
    try {
      setError("");

      const cleanedProjectName = projectName.trim() || "Tanio AI";
      const documentLabel =
        documentTypeLabels[contentType] || "Generated Content";

      const safeProjectName = cleanedProjectName
        .replace(/[^a-zA-Z0-9-_ ]/g, "")
        .trim()
        .replace(/\s+/g, "-");

      exportContentAsTxt(
        `${cleanedProjectName} - ${documentLabel}`,
        generatedContent,
        `${safeProjectName}-${contentType}.txt`
      );

      addRecentActivity({
        type: "Content Exported",
        title: `${cleanedProjectName} exported as TXT`,
        description: `Downloaded the ${documentLabel} as a text file.`,
        projectName: cleanedProjectName,
      });
    } catch (err) {
      console.error("TXT export error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong while exporting the TXT file."
      );
    }
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 p-8 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Product Architect</h1>

        <p className="text-slate-400 mt-2">
          Generate project planning documents with AI.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <div className="mb-4">
          <label
            htmlFor="project-name"
            className="block text-sm text-slate-400 mb-2"
          >
            Project Name
          </label>

          <input
            id="project-name"
            type="text"
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value);

              if (error) {
                setError("");
              }
              if (successMessage) {
                setSuccessMessage("");
              }
            }}
            maxLength={100}
            aria-describedby="project-name-help"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
          />

          <p id="project-name-help" className="text-xs text-slate-500 mt-2">
            Use between 2 and 100 characters.
          </p>
        </div>

        <div className="mb-4">
          <label
            htmlFor="project-description"
            className="block text-sm text-slate-400 mb-2"
          >
            Project Description
          </label>

          <textarea
            id="project-description"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);

              if (error) {
                setError("");
              }
              if (successMessage) {
                setSuccessMessage("");
              }
            }}
            rows="4"
            maxLength={5000}
            aria-describedby="project-description-help"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
          />

          <div
            id="project-description-help"
            className="flex justify-between gap-4 text-xs text-slate-500 mt-2"
          >
            <span>Use at least 10 characters.</span>
            <span>{description.length}/5000</span>
          </div>
        </div>

        <div className="mb-6">
          <label
            htmlFor="document-type"
            className="block text-sm text-slate-400 mb-2"
          >
            Document Type
          </label>

          <select
            id="document-type"
            value={contentType}
            onChange={(e) => {
              setContentType(e.target.value);

              if (error) {
                setError("");
              }
              if (successMessage) {
                setSuccessMessage("");
              }
            }}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
          >
            <option value="prd">Product Requirements Document</option>
            <option value="persona">User Persona</option>
            <option value="userStories">User Stories</option>
            <option value="featureList">Feature List</option>
            <option value="technicalArchitecture">
              Technical Architecture
            </option>
          </select>
        </div>

        <button
          type="button"
          onClick={() => handleGenerate(false)}
          disabled={
            loading ||
            projectName.trim().length < 2 ||
            description.trim().length < 10
          }
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate Content"}
        </button>

        {error && (
          <div
            className="mt-4 bg-red-950/50 border border-red-800 rounded-lg p-4"
            role="alert"
            aria-live="polite"
          >
            <p className="font-semibold text-red-300">
              Something went wrong
            </p>

            <p className="text-sm text-red-300 mt-1">{error}</p>
            <button
              type="button"
              onClick={() => handleGenerate(false)}
              disabled={loading}
              className="mt-3 rounded-lg bg-red-800 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        )}

        {successMessage && (
          <div
            className="mt-4 bg-emerald-950/50 border border-emerald-800 rounded-lg p-4"
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold text-emerald-300">
              Success
            </p>

            <p className="text-sm text-emerald-300 mt-1">
              {successMessage}
            </p>
          </div>
        )}
      </div>

      <div
        className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8"
        aria-busy={loading}
      >
        <div className="flex items-center justify-between gap-4 mb-6">
          <h2 className="text-xl font-bold">Generated Output</h2>

          {generatedContent && (
            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={handlePreviousVersion}
                disabled={loading || currentVersionIndex <= 0}
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                ← Previous
              </button>

              <button
                type="button"
                onClick={handleNextVersion}
                disabled={
                  loading ||
                  currentVersionIndex >= generationHistory.length - 1
                }
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next →
              </button>

              <button
                type="button"
                onClick={() => handleGenerate(true)}
                disabled={loading}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regenerating ? "Regenerating..." : "Regenerate"}
              </button>

              <button
                type="button"
                onClick={handleExportTxt}
                disabled={loading}
                className="bg-slate-600 hover:bg-slate-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export TXT
              </button>

              <button
                type="button"
                onClick={handleExportMarkdown}
                disabled={loading}
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export Markdown
              </button>

              <button
                type="button"
                onClick={handleExportPdf}
                disabled={loading}
                className="bg-green-600 hover:bg-green-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Export PDF
              </button>
            </div>
          )}
        </div>

        {loading && !generatedContent ? (
          <div className="flex items-center gap-3 text-slate-400">
            <div
              className="h-5 w-5 rounded-full border-2 border-slate-600 border-t-cyan-400 animate-spin"
              aria-hidden="true"
            />

            <p>Generating your document. This may take a moment...</p>
          </div>
        ) : generatedContent ? (
          <>
            {regenerating && (
              <div
                className="mb-6 flex items-center gap-3 rounded-lg border border-cyan-800/60 bg-cyan-950/30 p-4 text-cyan-200"
                role="status"
                aria-live="polite"
              >
                <div
                  className="h-5 w-5 shrink-0 rounded-full border-2 border-cyan-800 border-t-cyan-300 animate-spin"
                  aria-hidden="true"
                />

                <p>
                  Regenerating your document. Your current version will stay
                  visible until the new one is ready.
                </p>
              </div>
            )}

            {generationHistory.length > 0 && (
              <div className="mb-5 flex flex-wrap items-center gap-3 text-sm">
                <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300">
                  Version {currentVersionIndex + 1} of {generationHistory.length}
                </span>

                <span
                  className={`rounded-lg border px-3 py-1.5 font-semibold ${
                    currentVersionIndex === generationHistory.length - 1
                      ? "border-emerald-800 bg-emerald-950 text-emerald-300"
                      : "border-slate-700 bg-slate-800 text-slate-400"
                  }`}
                >
                  {currentVersionIndex === generationHistory.length - 1
                    ? "Current Version"
                    : "Previous Version"}
                </span>
              </div>
            )}

            <div className="max-w-none">
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={markdownComponents}
              >
                {generatedContent}
              </ReactMarkdown>
            </div>
          </>
        ) : (
          <p className="text-slate-500">
            Generated content will appear here.
          </p>
        )}
      </div>
    </div>
  );
}

export default ProductArchitect;