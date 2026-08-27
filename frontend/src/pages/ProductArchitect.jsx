import { useEffect, useState } from "react";
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

function normalizeProductArchitectContentType(contentType) {
  const normalized = String(contentType || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");

  const typeMap = {
    prd: "prd",
    "product requirements document": "prd",
    persona: "persona",
    "user persona": "persona",
    "user stories": "userStories",
    userstories: "userStories",
    "feature list": "featureList",
    featurelist: "featureList",
    "technical architecture": "technicalArchitecture",
    technicalarchitecture: "technicalArchitecture",
  };

  return typeMap[normalized] || null;
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
  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [regenerateInstructions, setRegenerateInstructions] = useState("");
  const [regenerateError, setRegenerateError] = useState("");
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [logoBase64, setLogoBase64] = useState("");
  const [logoLoading, setLogoLoading] = useState(false);
  const [logoError, setLogoError] = useState("");
  const [logoStyle, setLogoStyle] = useState("default");
  const [preferredColors, setPreferredColors] = useState("");
  const [logoIdeas, setLogoIdeas] = useState("");
  const [brandingDirection, setBrandingDirection] = useState("");
  const [logoProjectId, setLogoProjectId] = useState(selectedProject?.id || null);
  const [logoGallery, setLogoGallery] = useState([]);
  const [selectedLogoIndex, setSelectedLogoIndex] = useState(-1);
  const [logoGalleryLoading, setLogoGalleryLoading] = useState(false);
  const [logoGalleryError, setLogoGalleryError] = useState("");

  const [saveWorkspaceOpen, setSaveWorkspaceOpen] = useState(false);
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedSaveProjectId, setSelectedSaveProjectId] = useState("");
  const [workspaceOptionsLoading, setWorkspaceOptionsLoading] = useState(false);
  const [savingToWorkspace, setSavingToWorkspace] = useState(false);
  const [saveWorkspaceError, setSaveWorkspaceError] = useState("");
  const [saveWorkspaceSuccess, setSaveWorkspaceSuccess] = useState("");

  const [projectContentLoading, setProjectContentLoading] = useState(false);
  const [projectContentError, setProjectContentError] = useState("");

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

  const handleOpenRegenerate = () => {
    if (!generatedContent || loading) {
      return;
    }

    setRegenerateInstructions("");
    setRegenerateError("");
    setRegenerateModalOpen(true);
  };

  const handleCloseRegenerate = () => {
    if (loading) {
      return;
    }

    setRegenerateModalOpen(false);
    setRegenerateInstructions("");
    setRegenerateError("");
  };

  const handleConfirmRegenerate = async () => {
    const cleanedInstructions = regenerateInstructions.trim();

    if (cleanedInstructions.length > 1000) {
      setRegenerateError(
        "Regeneration instructions must be 1,000 characters or fewer."
      );
      return;
    }

    setRegenerateError("");
    setRegenerateModalOpen(false);

    await handleGenerate(true, cleanedInstructions);

    setRegenerateInstructions("");
  };


  const handleGenerate = async (
    isRegeneration = false,
    customInstructions = ""
  ) => {
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

      const cleanedCustomInstructions = customInstructions.trim();

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
          original_content:
            isRegeneration && generatedContent
              ? generatedContent
              : null,
          regeneration_instructions:
            isRegeneration
              ? cleanedCustomInstructions || null
              : null,
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
        regenerationInstructions: isRegeneration
          ? customInstructions.trim()
          : "",
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
        description:
          isRegeneration && customInstructions.trim()
            ? `Regenerated the ${
                documentTypeLabels[contentType] || contentType
              } using custom instructions.`
            : `Created a new ${
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


  const loadProjectContent = async (projectId, existingToken = null) => {
    if (!projectId) {
      setGeneratedContent("");
      setGenerationHistory([]);
      setCurrentVersionIndex(-1);
      setProjectContentError("");
      return [];
    }

    setProjectContentLoading(true);
    setProjectContentError("");

    try {
      const token = existingToken || localStorage.getItem("token");

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch(
        `http://127.0.0.1:8000/content/?project_id=${encodeURIComponent(
          projectId
        )}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          typeof errorData?.detail === "string"
            ? errorData.detail
            : "Could not load this project's saved content."
        );
      }

      const data = await response.json();
      const savedContent = Array.isArray(data) ? data : [];

      const productArchitectContent = savedContent
        .map((item) => ({
          ...item,
          productArchitectType: normalizeProductArchitectContentType(
            item.content_type
          ),
        }))
        .filter((item) => item.productArchitectType && item.body?.trim());

      if (productArchitectContent.length === 0) {
        setGeneratedContent("");
        setGenerationHistory([]);
        setCurrentVersionIndex(-1);
        return [];
      }

      const chronologicalContent = [...productArchitectContent].reverse();

      const restoredHistory = chronologicalContent.map((item) => ({
        id: item.id,
        content: item.body,
        createdAt: item.created_at || null,
        documentType: item.productArchitectType,
        title: item.title,
      }));

      const latestIndex = restoredHistory.length - 1;
      const latestVersion = restoredHistory[latestIndex];

      setGenerationHistory(restoredHistory);
      setCurrentVersionIndex(latestIndex);
      setGeneratedContent(latestVersion.content);
      setContentType(latestVersion.documentType);

      return productArchitectContent;
    } catch (err) {
      console.error("Project content load error:", err);

      setGeneratedContent("");
      setGenerationHistory([]);
      setCurrentVersionIndex(-1);
      setProjectContentError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading this project's saved content."
      );

      return [];
    } finally {
      setProjectContentLoading(false);
    }
  };

  const loadLogoGallery = async (projectId, existingToken = null) => {
    if (!projectId) {
      return [];
    }

    setLogoGalleryLoading(true);
    setLogoGalleryError("");

    try {
      const token = existingToken || localStorage.getItem("token");

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch(
        `http://127.0.0.1:8000/product-architect/logos/${projectId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        if (response.status === 404) {
          return [];
        }

        throw new Error(
          typeof errorData?.detail === "string"
            ? errorData.detail
            : "Could not load the logo gallery."
        );
      }

      const data = await response.json();
      const logos = Array.isArray(data?.logos) ? data.logos : [];

      setLogoGallery(logos);

      if (logos.length > 0) {
        const latestIndex = logos.length - 1;
        setSelectedLogoIndex(latestIndex);
        setLogoBase64(logos[latestIndex].image_base64);
      } else {
        setSelectedLogoIndex(-1);
        setLogoBase64("");
      }

      return logos;
    } catch (err) {
      console.error("Logo gallery load error:", err);
      setLogoGalleryError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading the logo gallery."
      );
      return [];
    } finally {
      setLogoGalleryLoading(false);
    }
  };

  useEffect(() => {
    if (!selectedProject?.id) {
      setLogoProjectId(null);
      setLogoGallery([]);
      setSelectedLogoIndex(-1);
      setLogoBase64("");
      setLogoGalleryError("");
      setGeneratedContent("");
      setGenerationHistory([]);
      setCurrentVersionIndex(-1);
      setProjectContentError("");
      return;
    }

    setProjectName(selectedProject.title || "");
    setDescription(selectedProject.description || "");
    setError("");
    setSuccessMessage("");
    setSaveWorkspaceSuccess("");

    setLogoProjectId(selectedProject.id);

    const token = localStorage.getItem("token");

    loadLogoGallery(selectedProject.id, token);
    loadProjectContent(selectedProject.id, token);
  }, [
    selectedProject?.id,
    selectedProject?.title,
    selectedProject?.description,
  ]);

  const handleSelectLogoVersion = (index) => {
    if (index < 0 || index >= logoGallery.length) {
      return;
    }

    setSelectedLogoIndex(index);
    setLogoBase64(logoGallery[index].image_base64);
    setLogoError("");
  };

  const handlePreviousLogoVersion = () => {
    if (selectedLogoIndex <= 0) {
      return;
    }

    handleSelectLogoVersion(selectedLogoIndex - 1);
  };

  const handleNextLogoVersion = () => {
    if (selectedLogoIndex >= logoGallery.length - 1) {
      return;
    }

    handleSelectLogoVersion(selectedLogoIndex + 1);
  };


  const handleGenerateLogo = async () => {
    if (logoLoading) {
      return;
    }

    const cleanedProjectName = projectName.trim();
    const cleanedDescription = description.trim();

    setLogoError("");
    setLogoGalleryError("");

    if (cleanedProjectName.length < 2) {
      setLogoError("Project name must contain at least 2 characters.");
      return;
    }

    if (cleanedProjectName.length > 100) {
      setLogoError("Project name cannot be longer than 100 characters.");
      return;
    }

    if (cleanedDescription.length < 10) {
      setLogoError("Project description must contain at least 10 characters.");
      return;
    }

    if (cleanedDescription.length > 5000) {
      setLogoError("Project description cannot be longer than 5,000 characters.");
      return;
    }

    if (preferredColors.trim().length > 200) {
      setLogoError("Preferred colors cannot be longer than 200 characters.");
      return;
    }

    if (logoIdeas.trim().length > 300) {
      setLogoError("Logo ideas cannot be longer than 300 characters.");
      return;
    }

    if (brandingDirection.trim().length > 500) {
      setLogoError("Branding direction cannot be longer than 500 characters.");
      return;
    }

    setLogoLoading(true);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch(
        "http://127.0.0.1:8000/product-architect/logo",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_name: cleanedProjectName,
            description: cleanedDescription,
            style: logoStyle,
            preferred_colors: preferredColors.trim(),
            logo_ideas: logoIdeas.trim(),
            branding_direction: brandingDirection.trim(),
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        let message = "Failed to generate logo. Please try again.";

        if (typeof errorData?.detail === "string") {
          message = errorData.detail;
        } else if (response.status === 401) {
          message = "Your session has expired. Please sign in again.";
        } else if (response.status === 403) {
          message = "You are not authorized to perform this action.";
        } else if (response.status === 422) {
          message =
            "Please enter a valid project name and a more detailed description.";
        } else if (response.status === 429) {
          message =
            "Too many logo generation requests. Please wait a moment and try again.";
        } else if (response.status === 502) {
          message =
            "The AI image service could not generate the logo. Please try again.";
        } else if (response.status === 503) {
          message =
            "The AI image service is temporarily unavailable. Please try again later.";
        } else if (response.status === 504) {
          message = "Logo generation took too long. Please try again.";
        }

        throw new Error(message);
      }

      const data = await response.json();

      if (!data?.image_base64) {
        throw new Error("The AI did not return a logo. Please try again.");
      }

      setLogoBase64(data.image_base64);

      if (data?.project_id) {
        setLogoProjectId(data.project_id);
        localStorage.removeItem("tanioLogoProjectId");
        
        const refreshedLogos = await loadLogoGallery(data.project_id, token);

        if (refreshedLogos.length === 0) {
          const generatedLogo = {
            id: data.id,
            project_id: data.project_id,
            image_base64: data.image_base64,
            style: data.style || logoStyle,
            preferred_colors: data.preferred_colors || preferredColors.trim(),
            logo_ideas: data.logo_ideas || logoIdeas.trim(),
            branding_direction:
              data.branding_direction || brandingDirection.trim(),
            created_at: data.created_at || new Date().toISOString(),
          };

          setLogoGallery([generatedLogo]);
          setSelectedLogoIndex(0);
        }
      }

      addRecentActivity({
        type: "Logo Generated",
        title: `${cleanedProjectName} logo generated`,
        description:
          logoStyle !== "default" ||
          preferredColors.trim() ||
          logoIdeas.trim() ||
          brandingDirection.trim()
            ? "Generated a new AI product logo with custom branding preferences."
            : "Generated a new AI product logo.",
        projectName: cleanedProjectName,
      });
    } catch (err) {
      console.error("Logo generation error:", err);

      if (err instanceof TypeError) {
        setLogoError(
          "Could not connect to the server. Make sure the backend is running and try again."
        );
      } else {
        setLogoError(
          err instanceof Error
            ? err.message
            : "Something went wrong while generating the logo."
        );
      }
    } finally {
      setLogoLoading(false);
    }
  };


  const handleDownloadLogo = () => {
    if (!logoBase64) {
      return;
    }

    try {
      const cleanedProjectName = projectName.trim() || "Tanio AI";
      const safeProjectName =
        cleanedProjectName
          .replace(/[^a-zA-Z0-9-_ ]/g, "")
          .trim()
          .replace(/\s+/g, "-") || "product";

      const link = document.createElement("a");
      link.href = `data:image/png;base64,${logoBase64}`;
      link.download = `${safeProjectName}-logo.png`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      addRecentActivity({
        type: "Logo Downloaded",
        title: `${cleanedProjectName} logo downloaded`,
        description: "Downloaded the generated AI product logo as a PNG file.",
        projectName: cleanedProjectName,
      });
    } catch (err) {
      console.error("Logo download error:", err);
      setLogoError("Something went wrong while downloading the logo.");
    }
  };

  const getProjectsForWorkspace = (workspaceId) => {
    if (!workspaceId) {
      return [];
    }

    return projects.filter(
      (project) => String(project.workspace_id) === String(workspaceId)
    );
  };

  const loadWorkspaceOptions = async () => {
    setWorkspaceOptionsLoading(true);
    setSaveWorkspaceError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const [workspaceResponse, projectResponse] = await Promise.all([
        fetch("http://127.0.0.1:8000/workspaces/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
        fetch("http://127.0.0.1:8000/projects/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ]);

      if (!workspaceResponse.ok) {
        const errorData = await workspaceResponse.json().catch(() => null);

        throw new Error(
          typeof errorData?.detail === "string"
            ? errorData.detail
            : "Could not load your workspaces."
        );
      }

      if (!projectResponse.ok) {
        const errorData = await projectResponse.json().catch(() => null);

        throw new Error(
          typeof errorData?.detail === "string"
            ? errorData.detail
            : "Could not load your projects."
        );
      }

      const workspaceData = await workspaceResponse.json();
      const projectData = await projectResponse.json();

      const loadedWorkspaces = Array.isArray(workspaceData)
        ? workspaceData
        : [];
      const loadedProjects = Array.isArray(projectData) ? projectData : [];

      setWorkspaces(loadedWorkspaces);
      setProjects(loadedProjects);

      if (loadedWorkspaces.length === 0) {
        setSelectedWorkspaceId("");
        setSelectedSaveProjectId("");
        return;
      }

      const preferredWorkspace =
        loadedWorkspaces.find(
          (workspace) =>
            selectedProject?.workspace_id &&
            String(workspace.id) === String(selectedProject.workspace_id)
        ) || loadedWorkspaces[0];

      const nextWorkspaceId = String(preferredWorkspace.id);
      setSelectedWorkspaceId(nextWorkspaceId);

      const projectsInWorkspace = loadedProjects.filter(
        (project) =>
          String(project.workspace_id) === String(preferredWorkspace.id)
      );

      const preferredProject =
        projectsInWorkspace.find(
          (project) =>
            selectedProject?.id &&
            String(project.id) === String(selectedProject.id)
        ) || projectsInWorkspace[0];

      setSelectedSaveProjectId(
        preferredProject ? String(preferredProject.id) : ""
      );
    } catch (err) {
      console.error("Workspace options load error:", err);

      setSaveWorkspaceError(
        err instanceof Error
          ? err.message
          : "Something went wrong while loading your workspaces."
      );
    } finally {
      setWorkspaceOptionsLoading(false);
    }
  };

  const handleOpenSaveWorkspace = async () => {
    if (!generatedContent || savingToWorkspace) {
      return;
    }

    setSaveWorkspaceError("");
    setSaveWorkspaceSuccess("");
    setSaveWorkspaceOpen(true);
    await loadWorkspaceOptions();
  };

  const handleCloseSaveWorkspace = () => {
    if (savingToWorkspace) {
      return;
    }

    setSaveWorkspaceOpen(false);
    setSaveWorkspaceError("");
  };

  const handleWorkspaceSelection = (workspaceId) => {
    setSelectedWorkspaceId(workspaceId);
    setSaveWorkspaceError("");

    const firstProject = projects.find(
      (project) => String(project.workspace_id) === String(workspaceId)
    );

    setSelectedSaveProjectId(firstProject ? String(firstProject.id) : "");
  };

  const handleSaveToWorkspace = async () => {
    if (savingToWorkspace) {
      return;
    }

    if (!generatedContent.trim()) {
      setSaveWorkspaceError("Generate some content before saving it.");
      return;
    }

    if (!selectedWorkspaceId) {
      setSaveWorkspaceError("Please choose a workspace.");
      return;
    }

    if (!selectedSaveProjectId) {
      setSaveWorkspaceError(
        "Please choose a project in the selected workspace."
      );
      return;
    }

    const selectedProjectForSave = projects.find(
      (project) => String(project.id) === String(selectedSaveProjectId)
    );

    if (
      !selectedProjectForSave ||
      String(selectedProjectForSave.workspace_id) !==
        String(selectedWorkspaceId)
    ) {
      setSaveWorkspaceError(
        "The selected project does not belong to that workspace."
      );
      return;
    }

    setSavingToWorkspace(true);
    setSaveWorkspaceError("");
    setSaveWorkspaceSuccess("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const cleanedProjectName = projectName.trim() || "Untitled Project";
      const documentLabel =
        documentTypeLabels[contentType] || "Generated Content";

      const response = await fetch("http://127.0.0.1:8000/content/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `${cleanedProjectName} - ${documentLabel}`,
          content_type: contentType,
          body: generatedContent,
          project_id: Number(selectedSaveProjectId),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        let message = "Content could not be saved. Please try again.";

        if (typeof errorData?.detail === "string") {
          message = errorData.detail;
        } else if (response.status === 401) {
          message = "Your session has expired. Please sign in again.";
        } else if (response.status === 403) {
          message = "You are not authorized to save content to this project.";
        } else if (response.status === 404) {
          message = "The selected project could not be found.";
        } else if (response.status === 422) {
          message = "The generated content could not be saved in its current form.";
        }

        throw new Error(message);
      }

      const selectedWorkspace = workspaces.find(
        (workspace) => String(workspace.id) === String(selectedWorkspaceId)
      );

      const workspaceName = selectedWorkspace?.name || "the selected workspace";
      const savedProjectName =
        selectedProjectForSave?.title || "the selected project";

      setSaveWorkspaceSuccess(
        `${documentLabel} saved to ${workspaceName} successfully.`
      );

      addRecentActivity({
        type: "Content Saved",
        title: `${cleanedProjectName} content saved`,
        description: `Saved the ${documentLabel} to ${savedProjectName} in ${workspaceName}.`,
        projectName: cleanedProjectName,
      });

      setSaveWorkspaceOpen(false);
    } catch (err) {
      console.error("Save to workspace error:", err);

      setSaveWorkspaceError(
        err instanceof Error
          ? err.message
          : "Something went wrong while saving the content."
      );
    } finally {
      setSavingToWorkspace(false);
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
              if (logoError) {
                setLogoError("");
              }
              if (logoBase64) {
                setLogoBase64("");
              }

              setLogoProjectId(null);
              setLogoGallery([]);
              setSelectedLogoIndex(-1);
              setLogoGalleryError("");

              setLogoProjectId(null);
              setLogoGallery([]);
              setSelectedLogoIndex(-1);
              setLogoGalleryError("");
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
              if (logoError) {
                setLogoError("");
              }
              if (logoBase64) {
                setLogoBase64("");
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
        aria-busy={logoLoading}
      >
        <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold">AI Product Logo</h2>
            <p className="text-slate-400 mt-1">
              Generate a logo using your project name and description.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleGenerateLogo}
              disabled={
                logoLoading ||
                projectName.trim().length < 2 ||
                description.trim().length < 10
              }
              className="bg-purple-500 hover:bg-purple-400 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {logoLoading
                ? "Generating Logo..."
                : logoBase64
                ? "Generate New Logo"
                : "Generate Logo"}
            </button>

            {logoBase64 && !logoLoading && (
              <button
                type="button"
                onClick={handleDownloadLogo}
                className="bg-slate-700 hover:bg-slate-600 text-white font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Download Logo
              </button>
            )}
          </div>
        </div>

        <div className="mb-6 rounded-xl border border-slate-800 bg-slate-950/40 p-5">
          <div className="mb-4">
            <h3 className="font-semibold text-white">Customize Logo Prompt</h3>
            <p className="mt-1 text-sm text-slate-400">
              Optional. Add branding preferences before generating your logo.
              Leave these fields unchanged to use the default prompt.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <label htmlFor="logo-style" className="mb-2 block text-sm text-slate-400">
                Logo Style
              </label>
              <select
                id="logo-style"
                value={logoStyle}
                onChange={(e) => {
                  setLogoStyle(e.target.value);
                  setLogoError("");
                }}
                disabled={logoLoading}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
              >
                <option value="default">Default</option>
                <option value="modern">Modern</option>
                <option value="minimalist">Minimalist</option>
                <option value="bold">Bold</option>
                <option value="playful">Playful</option>
                <option value="luxury">Luxury</option>
                <option value="futuristic">Futuristic</option>
              </select>
            </div>

            <div>
              <label htmlFor="preferred-colors" className="mb-2 block text-sm text-slate-400">
                Preferred Colors
              </label>
              <input
                id="preferred-colors"
                type="text"
                value={preferredColors}
                onChange={(e) => {
                  setPreferredColors(e.target.value);
                  setLogoError("");
                }}
                maxLength={200}
                disabled={logoLoading}
                placeholder="e.g. navy blue, purple, silver"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-600 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              />
              <p className="mt-2 text-right text-xs text-slate-500">
                {preferredColors.length}/200
              </p>
            </div>

            <div>
              <label htmlFor="logo-ideas" className="mb-2 block text-sm text-slate-400">
                Logo Ideas / Symbols
              </label>
              <input
                id="logo-ideas"
                type="text"
                value={logoIdeas}
                onChange={(e) => {
                  setLogoIdeas(e.target.value);
                  setLogoError("");
                }}
                maxLength={300}
                disabled={logoLoading}
                placeholder="e.g. letter T, spark, circuit, shield"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-600 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              />
              <p className="mt-2 text-right text-xs text-slate-500">
                {logoIdeas.length}/300
              </p>
            </div>

            <div>
              <label htmlFor="branding-direction" className="mb-2 block text-sm text-slate-400">
                Branding Direction
              </label>
              <input
                id="branding-direction"
                type="text"
                value={brandingDirection}
                onChange={(e) => {
                  setBrandingDirection(e.target.value);
                  setLogoError("");
                }}
                maxLength={500}
                disabled={logoLoading}
                placeholder="e.g. Clean, trustworthy SaaS brand for creative professionals"
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-600 focus:border-purple-500 focus:outline-none disabled:opacity-50"
              />
              <p className="mt-2 text-right text-xs text-slate-500">
                {brandingDirection.length}/500
              </p>
            </div>
          </div>
        </div>

        {logoError && (
          <div
            className="mb-4 bg-red-950/50 border border-red-800 rounded-lg p-4"
            role="alert"
            aria-live="polite"
          >
            <p className="font-semibold text-red-300">
              Logo generation failed
            </p>

            <p className="text-sm text-red-300 mt-1">{logoError}</p>

            <button
              type="button"
              onClick={handleGenerateLogo}
              disabled={logoLoading}
              className="mt-3 rounded-lg bg-red-800 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Retry
            </button>
          </div>
        )}

        {logoLoading && (
          <div
            className="flex items-center gap-3 text-slate-400 py-6"
            role="status"
            aria-live="polite"
          >
            <div
              className="h-5 w-5 rounded-full border-2 border-slate-600 border-t-purple-400 animate-spin"
              aria-hidden="true"
            />

            <p>Generating your logo. This may take a moment...</p>
          </div>
        )}

        {logoGalleryLoading && !logoLoading && (
          <div
            className="mb-4 flex items-center gap-3 text-slate-400"
            role="status"
            aria-live="polite"
          >
            <div
              className="h-5 w-5 rounded-full border-2 border-slate-600 border-t-purple-400 animate-spin"
              aria-hidden="true"
            />
            <p>Loading saved logo versions...</p>
          </div>
        )}

        {logoGalleryError && (
          <div className="mb-4 rounded-lg border border-amber-800 bg-amber-950/40 p-4">
            <p className="font-semibold text-amber-300">
              Logo gallery could not be loaded
            </p>
            <p className="mt-1 text-sm text-amber-300">{logoGalleryError}</p>
            {logoProjectId && (
              <button
                type="button"
                onClick={() => loadLogoGallery(logoProjectId)}
                disabled={logoGalleryLoading}
                className="mt-3 rounded-lg bg-amber-800 px-4 py-2 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Retry Gallery
              </button>
            )}
          </div>
        )}

        {logoBase64 && !logoLoading && (
          <div className="mt-6">
            <div className="mb-4 flex flex-wrap items-center gap-3 text-sm">
              {logoGallery.length > 0 && selectedLogoIndex >= 0 && (
                <>
                  <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300">
                    Version {selectedLogoIndex + 1} of {logoGallery.length}
                  </span>

                  <span
                    className={`rounded-lg border px-3 py-1.5 font-semibold ${
                      selectedLogoIndex === logoGallery.length - 1
                        ? "border-emerald-800 bg-emerald-950 text-emerald-300"
                        : "border-slate-700 bg-slate-800 text-slate-400"
                    }`}
                  >
                    {selectedLogoIndex === logoGallery.length - 1
                      ? "Current Version"
                      : "Previous Version"}
                  </span>

                  {logoGallery[selectedLogoIndex]?.created_at && (
                    <span className="text-slate-500">
                      {new Date(
                        logoGallery[selectedLogoIndex].created_at
                      ).toLocaleString()}
                    </span>
                  )}
                </>
              )}
            </div>

            <div className="flex flex-wrap items-start gap-6">
              <div>
                <img
                  src={`data:image/png;base64,${logoBase64}`}
                  alt={`${projectName.trim() || "Project"} generated logo`}
                  className="w-full max-w-md rounded-xl border border-slate-700 bg-white"
                />

                {logoGallery.length > 1 && selectedLogoIndex >= 0 && (
                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={handlePreviousLogoVersion}
                      disabled={selectedLogoIndex <= 0}
                      className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      ← Previous
                    </button>

                    <button
                      type="button"
                      onClick={handleNextLogoVersion}
                      disabled={selectedLogoIndex >= logoGallery.length - 1}
                      className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next →
                    </button>
                  </div>
                )}
              </div>

              {logoGallery.length > 0 && selectedLogoIndex >= 0 && (
                <div className="min-w-0 flex-1 rounded-xl border border-slate-800 bg-slate-950/40 p-4">
                  <h3 className="font-semibold text-white">Version Details</h3>

                  <dl className="mt-3 space-y-3 text-sm">
                    <div>
                      <dt className="text-slate-500">Style</dt>
                      <dd className="mt-1 capitalize text-slate-200">
                        {logoGallery[selectedLogoIndex]?.style || "default"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">Preferred Colors</dt>
                      <dd className="mt-1 text-slate-200">
                        {logoGallery[selectedLogoIndex]?.preferred_colors ||
                          "Default"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">Logo Ideas / Symbols</dt>
                      <dd className="mt-1 text-slate-200">
                        {logoGallery[selectedLogoIndex]?.logo_ideas || "None"}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-slate-500">Branding Direction</dt>
                      <dd className="mt-1 text-slate-200">
                        {logoGallery[selectedLogoIndex]?.branding_direction ||
                          "Default"}
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </div>
        )}

        {logoGallery.length > 0 && !logoLoading && (
          <div className="mt-8 border-t border-slate-800 pt-6">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-bold text-white">
                  Logo Gallery & Version History
                </h3>
                <p className="mt-1 text-sm text-slate-400">
                  Browse every saved logo version for this project.
                </p>
              </div>

              <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-sm text-slate-300">
                {logoGallery.length} saved{" "}
                {logoGallery.length === 1 ? "logo" : "logos"}
              </span>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {logoGallery.map((logo, index) => {
                const isSelected = index === selectedLogoIndex;
                const isCurrent = index === logoGallery.length - 1;

                return (
                  <button
                    key={logo.id ?? `${logo.project_id}-${index}`}
                    type="button"
                    onClick={() => handleSelectLogoVersion(index)}
                    className={`overflow-hidden rounded-xl border p-3 text-left transition ${
                      isSelected
                        ? "border-purple-500 bg-purple-950/20"
                        : "border-slate-800 bg-slate-950/40 hover:border-slate-600"
                    }`}
                  >
                    <div className="aspect-square overflow-hidden rounded-lg bg-white">
                      <img
                        src={`data:image/png;base64,${logo.image_base64}`}
                        alt={`${projectName.trim() || "Project"} logo version ${
                          index + 1
                        }`}
                        className="h-full w-full object-contain"
                      />
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-2">
                      <span className="font-semibold text-white">
                        Version {index + 1}
                      </span>

                      {isCurrent && (
                        <span className="rounded-md border border-emerald-800 bg-emerald-950 px-2 py-1 text-xs font-semibold text-emerald-300">
                          Current
                        </span>
                      )}
                    </div>

                    <p className="mt-1 text-xs capitalize text-slate-400">
                      {logo.style || "default"} style
                    </p>

                    {logo.created_at && (
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(logo.created_at).toLocaleString()}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {!logoBase64 &&
          !logoLoading &&
          !logoGalleryLoading &&
          !logoError && (
            <p className="text-slate-500">
              Your generated logo will appear here.
            </p>
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
                onClick={handleOpenRegenerate}
                disabled={loading}
                className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {regenerating ? "Regenerating..." : "Regenerate"}
              </button>

              <button
                type="button"
                onClick={handleOpenSaveWorkspace}
                disabled={loading || savingToWorkspace}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold px-4 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingToWorkspace ? "Saving..." : "Save to Workspace"}
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

        {projectContentLoading && (
          <div
            className="mb-6 flex items-center gap-3 rounded-lg border border-slate-800 bg-slate-950/40 p-4 text-slate-400"
            role="status"
            aria-live="polite"
          >
            <div
              className="h-5 w-5 rounded-full border-2 border-slate-600 border-t-cyan-400 animate-spin"
              aria-hidden="true"
            />
            <p>Loading saved project content...</p>
          </div>
        )}

        {projectContentError && (
          <div
            className="mb-6 rounded-lg border border-amber-800 bg-amber-950/40 p-4"
            role="alert"
          >
            <p className="font-semibold text-amber-300">
              Saved content could not be loaded
            </p>
            <p className="mt-1 text-sm text-amber-300">
              {projectContentError}
            </p>
            {selectedProject?.id && (
              <button
                type="button"
                onClick={() => loadProjectContent(selectedProject.id)}
                disabled={projectContentLoading}
                className="mt-3 rounded-lg bg-amber-800 px-4 py-2 font-semibold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Retry
              </button>
            )}
          </div>
        )}

        {saveWorkspaceSuccess && (
          <div
            className="mb-6 rounded-lg border border-emerald-800 bg-emerald-950/50 p-4"
            role="status"
            aria-live="polite"
          >
            <p className="font-semibold text-emerald-300">Saved successfully</p>
            <p className="mt-1 text-sm text-emerald-300">
              {saveWorkspaceSuccess}
            </p>
          </div>
        )}

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

            {generationHistory[currentVersionIndex]?.regenerationInstructions && (
              <div className="mb-5 rounded-lg border border-cyan-800/50 bg-cyan-950/20 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                  Regeneration Instructions
                </p>
                <p className="mt-2 text-sm text-slate-300">
                  {generationHistory[currentVersionIndex].regenerationInstructions}
                </p>
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

      {regenerateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="regenerate-title"
        >
          <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="regenerate-title"
                  className="text-2xl font-bold text-white"
                >
                  Regenerate Content
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Tell the AI what you want changed in the new version. You can
                  also leave this blank for a general regeneration.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseRegenerate}
                disabled={loading}
                className="rounded-lg px-3 py-1.5 text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close regenerate dialog"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              <label
                htmlFor="regenerate-instructions"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                What would you like to change?
              </label>

              <textarea
                id="regenerate-instructions"
                value={regenerateInstructions}
                onChange={(e) => {
                  setRegenerateInstructions(e.target.value);
                  setRegenerateError("");
                }}
                rows="6"
                maxLength={1000}
                disabled={loading}
                placeholder="e.g. Make it shorter, add more technical detail, and keep the risk section mostly the same."
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-600 focus:border-cyan-500 focus:outline-none disabled:opacity-50"
              />

              <div className="mt-2 flex items-center justify-between gap-4 text-xs text-slate-500">
                <span>Optional</span>
                <span>{regenerateInstructions.length}/1000</span>
              </div>
            </div>

            {regenerateError && (
              <div
                className="mt-5 rounded-lg border border-red-800 bg-red-950/50 p-4"
                role="alert"
              >
                <p className="text-sm text-red-300">{regenerateError}</p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseRegenerate}
                disabled={loading}
                className="rounded-lg bg-slate-700 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmRegenerate}
                disabled={loading}
                className="rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {saveWorkspaceOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-workspace-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="save-workspace-title"
                  className="text-2xl font-bold text-white"
                >
                  Save to Workspace
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Choose the workspace and project where you want to save this
                  generated content.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseSaveWorkspace}
                disabled={savingToWorkspace}
                className="rounded-lg px-3 py-1.5 text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close save to workspace dialog"
              >
                ×
              </button>
            </div>

            {workspaceOptionsLoading ? (
              <div
                className="mt-6 flex items-center gap-3 text-slate-400"
                role="status"
                aria-live="polite"
              >
                <div
                  className="h-5 w-5 rounded-full border-2 border-slate-600 border-t-indigo-400 animate-spin"
                  aria-hidden="true"
                />
                <p>Loading your workspaces and projects...</p>
              </div>
            ) : (
              <>
                <div className="mt-6">
                  <label
                    htmlFor="save-workspace"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Workspace
                  </label>

                  <select
                    id="save-workspace"
                    value={selectedWorkspaceId}
                    onChange={(e) => handleWorkspaceSelection(e.target.value)}
                    disabled={savingToWorkspace || workspaces.length === 0}
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  >
                    {workspaces.length === 0 ? (
                      <option value="">No workspaces available</option>
                    ) : (
                      workspaces.map((workspace) => (
                        <option key={workspace.id} value={workspace.id}>
                          {workspace.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div className="mt-4">
                  <label
                    htmlFor="save-project"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Project
                  </label>

                  <select
                    id="save-project"
                    value={selectedSaveProjectId}
                    onChange={(e) => {
                      setSelectedSaveProjectId(e.target.value);
                      setSaveWorkspaceError("");
                    }}
                    disabled={
                      savingToWorkspace ||
                      !selectedWorkspaceId ||
                      getProjectsForWorkspace(selectedWorkspaceId).length === 0
                    }
                    className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-indigo-500 focus:outline-none disabled:opacity-50"
                  >
                    {getProjectsForWorkspace(selectedWorkspaceId).length ===
                    0 ? (
                      <option value="">No projects in this workspace</option>
                    ) : (
                      getProjectsForWorkspace(selectedWorkspaceId).map(
                        (project) => (
                          <option key={project.id} value={project.id}>
                            {project.title}
                          </option>
                        )
                      )
                    )}
                  </select>

                  {selectedWorkspaceId &&
                    getProjectsForWorkspace(selectedWorkspaceId).length ===
                      0 && (
                      <p className="mt-2 text-sm text-amber-300">
                        This workspace does not have any projects yet. Create a
                        project there first, then try saving again.
                      </p>
                    )}
                </div>
              </>
            )}

            {saveWorkspaceError && (
              <div
                className="mt-5 rounded-lg border border-red-800 bg-red-950/50 p-4"
                role="alert"
                aria-live="polite"
              >
                <p className="font-semibold text-red-300">
                  Content could not be saved
                </p>
                <p className="mt-1 text-sm text-red-300">
                  {saveWorkspaceError}
                </p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseSaveWorkspace}
                disabled={savingToWorkspace}
                className="rounded-lg bg-slate-700 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveToWorkspace}
                disabled={
                  workspaceOptionsLoading ||
                  savingToWorkspace ||
                  !selectedWorkspaceId ||
                  !selectedSaveProjectId
                }
                className="rounded-lg bg-indigo-600 px-5 py-2.5 font-semibold text-white transition hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingToWorkspace ? "Saving..." : "Save Content"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ProductArchitect;