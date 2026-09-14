import { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import {
  notifyGenerationComplete,
  notifyContentSaved,
} from "../utils/notifications";

const AI_REQUEST_TIMEOUT_MS = 35000;
const IMAGE_REQUEST_TIMEOUT_MS = 120000;
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
      "Stay closely grounded in the campaign description. Prioritize coherent, practical, setting-consistent ideas over unusual or highly experimental additions.",
    balanced:
      "Balance consistency with creativity. Add interesting ideas while keeping them strongly connected to the campaign's established tone, setting, and goals.",
    creative:
      "Be highly imaginative and exploratory. Introduce distinctive characters, locations, conflicts, twists, and world-building ideas while remaining coherent with the campaign.",
  };

  const responseLengthInstructions = {
    short:
      "Keep the response concise and focused on the most important usable details.",
    medium:
      "Provide a moderately detailed response with enough description to be useful at the table without becoming overly long.",
    long:
      "Provide a comprehensive and richly detailed response with expanded descriptions, motivations, hooks, consequences, and world-building details where appropriate.",
  };

  const toneInstructions = {
    professional:
      "Use a polished, clear, organized tone suitable for a game master reference document.",
    casual:
      "Use a friendly, conversational, approachable tone while keeping the content easy to use during play.",
    concise:
      "Use a direct, efficient tone. Avoid filler and keep wording tight and scannable.",
    detailed:
      "Use an explanatory, immersive, thorough tone with strong descriptive detail and context.",
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

const generatedMarkdownClasses = `
  mt-4 text-slate-200 leading-relaxed
  [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-6 [&_h1]:mb-3
  [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-6 [&_h2]:mb-3
  [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-cyan-300 [&_h3]:mt-6 [&_h3]:mb-3
  [&_h4]:text-lg [&_h4]:font-semibold [&_h4]:text-cyan-200 [&_h4]:mt-5 [&_h4]:mb-2
  [&_p]:my-3
  [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:my-3
  [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:my-3
  [&_li]:my-1
  [&_strong]:font-bold [&_strong]:text-white
  [&_em]:italic
  [&_hr]:border-slate-700 [&_hr]:my-6
  [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-700
  [&_blockquote]:pl-4 [&_blockquote]:text-slate-300
  [&_code]:bg-slate-950 [&_code]:px-1 [&_code]:py-0.5
  [&_code]:rounded [&_code]:text-cyan-300
`;


function cleanGeneratedMarkdown(content) {
  if (!content) {
    return "";
  }

  return content
    .trim()
    .replace(/^```(?:markdown|md)?\s*/i, "")
    .replace(/\s*```$/, "")
    .trim();
}


const RELATED_CONTENT_MAP = {
  campaign: ["npc", "quest", "encounter", "location"],
  npc: ["quest", "encounter"],
  quest: ["encounter"],
  encounter: [],
  location: ["quest", "encounter"],
};

const CONTENT_LABELS = {
  campaign: "Campaign",
  npc: "NPCs",
  quest: "Quests",
  encounter: "Encounters",
  location: "Locations",
};

const IMAGE_TYPES = [
  "Campaign Scene",
  "NPC Portrait",
  "Location",
  "Encounter",
  "Quest Item",
  "Map / Environment Concept",
];

const TABLETOP_TABS = [
  {
    key: "content",
    label: "Content Generator",
  },
  {
    key: "image",
    label: "Image Generator",
  },
];

const CONTENT_IMAGE_TYPE_MAP = {
  campaign: "Campaign Scene",
  npc: "NPC Portrait",
  quest: "Quest Item",
  encounter: "Encounter",
  location: "Location",
};

function getImageSource(imageBase64) {
  if (!imageBase64) {
    return "";
  }

  return imageBase64.startsWith("data:image")
    ? imageBase64
    : `data:image/png;base64,${imageBase64}`;
}

function downloadBase64Image(imageBase64, filename = "tabletop-image.png") {
  if (!imageBase64) {
    return;
  }

  const imageSource = getImageSource(imageBase64);
  const link = document.createElement("a");

  link.href = imageSource;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function TabletopCreator() {
  const location = useLocation();
  const selectedProject = location.state?.project;
  const [activeTab, setActiveTab] = useState("content");
  const [imageType, setImageType] = useState("Campaign Scene");
  const [imagePrompt, setImagePrompt] = useState("");
  const [useCampaignContextForImage, setUseCampaignContextForImage] =
    useState(true);
  const [generatingImage, setGeneratingImage] = useState(false);
  const [imageGenerateError, setImageGenerateError] = useState("");
  const [imageGenerateSuccess, setImageGenerateSuccess] = useState("");
  const [generatedImage, setGeneratedImage] = useState("");
  const [generateImageWithContent, setGenerateImageWithContent] =
    useState(false);
  const [contentGeneratedImage, setContentGeneratedImage] = useState("");
  const [contentImageLoading, setContentImageLoading] = useState(false);
  const [contentImageError, setContentImageError] = useState("");
  const [contentGeneratedImageType, setContentGeneratedImageType] = useState("");
  const [contentGeneratedImagePrompt, setContentGeneratedImagePrompt] = useState("");
  const [saveImageOpen, setSaveImageOpen] = useState(false);
  const [saveImageTarget, setSaveImageTarget] = useState(null);
  const [saveImageProjectId, setSaveImageProjectId] = useState("");
  const [saveImageLoading, setSaveImageLoading] = useState(false);
  const [saveImageError, setSaveImageError] = useState("");

  const [selectedProjectId, setSelectedProjectId] = useState(
    selectedProject?.id || null
  );
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [generatedCampaignContent, setGeneratedCampaignContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatedNPCContent, setGeneratedNPCContent] = useState("");
  const [generatingNPCs, setGeneratingNPCs] = useState(false);
  const [npcError, setNpcError] = useState("");
  const [generatedQuestContent, setGeneratedQuestContent] = useState("");
  const [generatingQuests, setGeneratingQuests] = useState(false);
  const [questError, setQuestError] = useState("");
  const [generatedEncounterContent, setGeneratedEncounterContent] = useState("");
  const [generatingEncounters, setGeneratingEncounters] = useState(false);
  const [encounterError, setEncounterError] = useState("");
  const [generatedLocationContent, setGeneratedLocationContent] = useState("");
  const [generatingLocations, setGeneratingLocations] = useState(false);
  const [locationError, setLocationError] = useState("");
  const [generateSuccess, setGenerateSuccess] = useState("");

  const [regenerateModalOpen, setRegenerateModalOpen] = useState(false);
  const [regenerateTarget, setRegenerateTarget] = useState(null);
  const [regenerateInstructions, setRegenerateInstructions] = useState("");
  const [regenerateError, setRegenerateError] = useState("");

  const [generationHistory, setGenerationHistory] = useState({
    campaign: [],
    npc: [],
    quest: [],
    encounter: [],
    location: [],
  });

  const [currentVersionIndex, setCurrentVersionIndex] = useState({
    campaign: -1,
    npc: -1,
    quest: -1,
    encounter: -1,
    location: -1,
  });

  const [relatedContentWarning, setRelatedContentWarning] = useState(null);
  const [selectedRelatedContent, setSelectedRelatedContent] = useState([]);

  const [saveWorkspaceOpen, setSaveWorkspaceOpen] = useState(false);
  const [contentToSave, setContentToSave] = useState(null);
  const [workspaces, setWorkspaces] = useState([]);
  const [projects, setProjects] = useState([]);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState("");
  const [selectedSaveProjectId, setSelectedSaveProjectId] = useState("");
  const [workspaceOptionsLoading, setWorkspaceOptionsLoading] = useState(false);
  const [savingToWorkspace, setSavingToWorkspace] = useState(false);
  const [saveWorkspaceError, setSaveWorkspaceError] = useState("");
  const [saveWorkspaceSuccess, setSaveWorkspaceSuccess] = useState("");

  const activeRequestsRef = useRef(new Set());
  useEffect(() => {
    if (!selectedProject?.id) {
      return;
    }

    setSelectedProjectId(selectedProject.id);
    setCampaignName(selectedProject.title || "");
    setCampaignDescription(selectedProject.description || "");
  }, [
    selectedProject?.id,
    selectedProject?.title,
    selectedProject?.description,
  ]);

  useEffect(() => {
    const loadProjectsForSelection = async () => {
      try {
        const token = localStorage.getItem("token");

        if (!token) {
          return;
        }

        const response = await fetch("http://127.0.0.1:8000/projects/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          return;
        }

        const data = await response.json();
        setProjects(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error("Project selection load error:", error);
      }
    };

    loadProjectsForSelection();
  }, []);

  const isAnyGenerationInProgress =
    generating ||
    generatingNPCs ||
    generatingQuests ||
    generatingEncounters ||
    generatingLocations ||
    generatingImage;

  const tools = [
    {
      title: "Campaign Builder",
      description:
        "Create a new tabletop campaign with setting, tone, story hooks, and campaign structure.",
      status: "Active",
    },
    {
      title: "NPC Generator",
      description:
        "Generate characters, allies, villains, merchants, quest givers, and party contacts.",
      status: "Active",
    },
    {
      title: "Quest Generator",
      description:
        "Build quests, side missions, encounters, rewards, and story complications.",
      status: "Active",
    },
  ];

  const handleVersionChange = (historyKey, direction, setContent) => {
    const history = generationHistory[historyKey] || [];
    const currentIndex = currentVersionIndex[historyKey] ?? -1;
    const nextIndex = currentIndex + direction;

    if (nextIndex < 0 || nextIndex >= history.length) {
      return;
    }

    setCurrentVersionIndex((previous) => ({
      ...previous,
      [historyKey]: nextIndex,
    }));

    setContent(history[nextIndex].content);
    setGenerateSuccess("");
  };

  const resetHistoryFor = (historyKey) => {
    setGenerationHistory((previous) => ({
      ...previous,
      [historyKey]: [],
    }));

    setCurrentVersionIndex((previous) => ({
      ...previous,
      [historyKey]: -1,
    }));
  };

  const getGeneratedContentByKey = (contentKey) => {
    const contentMap = {
      campaign: generatedCampaignContent,
      npc: generatedNPCContent,
      quest: generatedQuestContent,
      encounter: generatedEncounterContent,
      location: generatedLocationContent,
    };

    return contentMap[contentKey] || "";
  };

  const handleOpenRegenerate = (contentKey) => {
    const existingContent = getGeneratedContentByKey(contentKey);

    if (!existingContent.trim() || isAnyGenerationInProgress) {
      return;
    }

    setRegenerateTarget(contentKey);
    setRegenerateInstructions("");
    setRegenerateError("");
    setRegenerateModalOpen(true);
  };

  const handleCloseRegenerate = () => {
    if (isAnyGenerationInProgress) {
      return;
    }

    setRegenerateModalOpen(false);
    setRegenerateTarget(null);
    setRegenerateInstructions("");
    setRegenerateError("");
  };

  const handleConfirmRegenerate = async () => {
    const cleanedInstructions = regenerateInstructions.trim();

    if (!regenerateTarget) {
      setRegenerateError("Choose content to regenerate.");
      return;
    }

    if (cleanedInstructions.length > 1000) {
      setRegenerateError(
        "Regeneration instructions must be 1,000 characters or fewer."
      );
      return;
    }

    const regenerateByKey = {
      campaign: () =>
        handleGenerateCampaign(true, false, cleanedInstructions),
      npc: () =>
        handleGenerateNPCs(true, false, cleanedInstructions),
      quest: () =>
        handleGenerateQuests(true, false, cleanedInstructions),
      encounter: () =>
        handleGenerateEncounters(true, false, cleanedInstructions),
      location: () =>
        handleGenerateLocations(true, false, cleanedInstructions),
    };

    const regenerate = regenerateByKey[regenerateTarget];

    if (!regenerate) {
      setRegenerateError("That content type cannot be regenerated.");
      return;
    }

    setRegenerateError("");
    setRegenerateModalOpen(false);

    await regenerate();

    setRegenerateTarget(null);
    setRegenerateInstructions("");
  };

  const getCurrentRegenerationInstructions = (contentKey) => {
    const history = generationHistory[contentKey] || [];
    const index = currentVersionIndex[contentKey] ?? -1;

    if (index < 0 || index >= history.length) {
      return "";
    }

    return history[index]?.regenerationInstructions || "";
  };

  const checkForRelatedContent = (regeneratedKey) => {
    const possibleRelatedContent = RELATED_CONTENT_MAP[regeneratedKey] || [];

    const existingRelatedContent = possibleRelatedContent.filter((contentKey) =>
      getGeneratedContentByKey(contentKey).trim()
    );

    if (existingRelatedContent.length === 0) {
      setRelatedContentWarning(null);
      setSelectedRelatedContent([]);
      return;
    }

    setRelatedContentWarning({
      source: regeneratedKey,
      related: existingRelatedContent,
    });

    setSelectedRelatedContent([]);
  };

  const handleDownloadImage = (imageBase64, namePrefix = "tabletop-image") => {
    if (!imageBase64) {
      return;
    }

    const safeName = (namePrefix || "tabletop-image")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

    downloadBase64Image(imageBase64, `${safeName || "tabletop-image"}.png`);
  };  

  const handleGenerateContentImage = async ({
    contentKey,
    contentBody,
    cleanedName,
    cleanedDescription,
  }) => {
    if (!generateImageWithContent || !contentBody?.trim()) {
      return;
    }

    setContentImageLoading(true);
    setContentImageError("");
    setContentGeneratedImage("");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      IMAGE_REQUEST_TIMEOUT_MS
    );

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const chosenImageType =
        CONTENT_IMAGE_TYPE_MAP[contentKey] || "Campaign Scene";

      const descriptionReference = cleanedDescription.slice(0, 350);
      const contentImageReference = contentBody.slice(0, 750);

      const finalPrompt = `Create a ${chosenImageType.toLowerCase()} for the tabletop campaign "${
        cleanedName || "Untitled Campaign"
      }".

      Campaign Description:
      ${descriptionReference || "No campaign description provided."}

      Generated ${CONTENT_LABELS[contentKey] || "tabletop"} Content:
      ${contentImageReference}`;

      const response = await fetch(
        "http://127.0.0.1:8000/tabletop-creator/generate-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_id: selectedProjectId,
            campaign_name: cleanedName || null,
            campaign_description: cleanedDescription || null,
            image_type: chosenImageType,
            image_prompt: finalPrompt,
            use_campaign_context: true,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        let message = "Unable to generate content image.";

        if (typeof errorData?.detail === "string") {
          message = errorData.detail;
        } else if (Array.isArray(errorData?.detail)) {
          message = errorData.detail
            .map((item) => item?.msg || JSON.stringify(item))
            .join(" ");
        }

        throw new Error(message);
      }

      const data = await response.json();

      setContentGeneratedImage(data.image_base64 || "");
      setContentGeneratedImageType(data.image_type || chosenImageType);
      setContentGeneratedImagePrompt(data.prompt || finalPrompt);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setContentImageError(
          "The image request took too long. Please try generating the content again."
        );
      } else {
        setContentImageError(
          error instanceof Error
            ? error.message
            : "Something went wrong while generating the content image."
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      setContentImageLoading(false);
    }
  };

  const requestAIContent = async ({
    requestKey,
    endpoint,
    responseField,
    fallbackError,
    cleanedName,
    cleanedDescription,
    setLoading,
    setError,
    setContent,
    setSuccess,
    successMessage,
    isRegeneration = false,
    suppressRelatedWarning = false,
    historyKey,
    originalContent = "",
    regenerationInstructions = "",
  }) => {
    if (activeRequestsRef.current.has(requestKey)) {
      return;
    }

    activeRequestsRef.current.add(requestKey);
    setError("");
    setSuccess("");

    if (!isRegeneration) {
      setContent("");
      resetHistoryFor(historyKey);
    }

    setLoading(true);

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

      const cleanedRegenerationInstructions =
        regenerationInstructions.trim();

      const response = await fetch(
        `http://127.0.0.1:8000/tabletop-creator/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_id: selectedProjectId,
            campaign_name: cleanedName,
            campaign_description: cleanedDescription,
            original_content:
              isRegeneration && originalContent
                ? originalContent
                : null,
            regeneration_instructions:
              isRegeneration
                ? cleanedRegenerationInstructions || null
                : null,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        let errorMessage = fallbackError;

        if (typeof errorData?.detail === "string") {
          errorMessage = errorData.detail;
        } else if (Array.isArray(errorData?.detail)) {
          errorMessage = errorData.detail
            .map((item) => item?.msg || JSON.stringify(item))
            .join(" ");
        } else if (errorData?.detail) {
          errorMessage = JSON.stringify(errorData.detail);
        }

        throw new Error(errorMessage);
      }

      const data = await response.json();
      const generatedContent = data[responseField];

      const newVersion = {
        content: generatedContent,
        createdAt: new Date().toISOString(),
        regenerationInstructions: isRegeneration
          ? regenerationInstructions.trim()
          : "",
      };

      setGenerationHistory((previous) => {
        const existingHistory = previous[historyKey] || [];

        const nextHistory =
          isRegeneration && existingHistory.length > 0
            ? [...existingHistory, newVersion]
            : [newVersion];

        setCurrentVersionIndex((previousIndexes) => ({
          ...previousIndexes,
          [historyKey]: nextHistory.length - 1,
        }));

        return {
          ...previous,
          [historyKey]: nextHistory,
        };
      });

      setContent(generatedContent);
      setSuccess(successMessage);

      notifyGenerationComplete("Tabletop Creator", cleanedName);

      if (generateImageWithContent) {
        await handleGenerateContentImage({
          contentKey: historyKey,
          contentBody: generatedContent,
          cleanedName,
          cleanedDescription,
        });
      }

      if (isRegeneration && !suppressRelatedWarning) {
        checkForRelatedContent(historyKey);
      }
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setError(
          "The AI request took too long. Please try generating the content again."
        );
      } else {
        setError(error instanceof Error ? error.message : fallbackError);
      }
    } finally {
      window.clearTimeout(timeoutId);

      const duration = Math.round(performance.now() - startedAt);
      console.info(`${requestKey} AI request completed in ${duration} ms`);

      if (duration > SLOW_REQUEST_THRESHOLD_MS) {
        console.warn(
          `${requestKey} AI request exceeded the ${SLOW_REQUEST_THRESHOLD_MS} ms performance target.`
        );
      }

      activeRequestsRef.current.delete(requestKey);
      setLoading(false);
    }
  };

  const handleRelatedContentToggle = (contentKey) => {
    setSelectedRelatedContent((previous) =>
      previous.includes(contentKey)
        ? previous.filter((key) => key !== contentKey)
        : [...previous, contentKey]
    );
  };

  const handleKeepRelatedContentAsIs = () => {
    setRelatedContentWarning(null);
    setSelectedRelatedContent([]);
    setGenerateSuccess("Related content was kept as is.");
  };

  const handleUpdateSelectedRelatedContent = async () => {
    if (selectedRelatedContent.length === 0 || isAnyGenerationInProgress) {
      return;
    }

    const contentToUpdate = [...selectedRelatedContent];

    setRelatedContentWarning(null);
    setSelectedRelatedContent([]);
    setGenerateSuccess("");

    const regenerateByKey = {
      campaign: () => handleGenerateCampaign(true, true),
      npc: () => handleGenerateNPCs(true, true),
      quest: () => handleGenerateQuests(true, true),
      encounter: () => handleGenerateEncounters(true, true),
      location: () => handleGenerateLocations(true, true),
    };

    for (const contentKey of contentToUpdate) {
      const regenerate = regenerateByKey[contentKey];

      if (regenerate) {
        await regenerate();
      }
    }

    const updatedLabels = contentToUpdate
      .map((contentKey) => CONTENT_LABELS[contentKey])
      .join(", ");

    setGenerateSuccess(
      `${updatedLabels} ${contentToUpdate.length === 1 ? "was" : "were"} updated successfully.`
    );
  };

  const handleGenerateCampaign = async (
    isRegeneration = false,
    suppressRelatedWarning = false,
    customInstructions = ""
  ) => {
    const cleanedName = campaignName.trim();
    const cleanedDescription = campaignDescription.trim();

    if (!cleanedName) {
      setGenerateError("Campaign name is required before generating content.");
      return;
    }

    if (!cleanedDescription) {
      setGenerateError(
        "Campaign description is required before generating content."
      );
      return;
    }

    await requestAIContent({
      requestKey: "Campaign",
      historyKey: "campaign",
      originalContent: isRegeneration
        ? getGeneratedContentByKey("campaign")
        : "",
      regenerationInstructions: isRegeneration
        ? customInstructions
        : "",
      endpoint: "generate-campaign",
      responseField: "campaign_content",
      fallbackError: "Unable to generate campaign content.",
      cleanedName,
      cleanedDescription,
      setLoading: setGenerating,
      setError: setGenerateError,
      setContent: setGeneratedCampaignContent,
      setSuccess: setGenerateSuccess,
      successMessage: `Campaign content ${
        isRegeneration ? "regenerated" : "generated"
      } successfully.`,
      isRegeneration,
      suppressRelatedWarning,
    });
  };

  const handleGenerateNPCs = async (
    isRegeneration = false,
    suppressRelatedWarning = false,
    customInstructions = ""
  ) => {
    const cleanedName = campaignName.trim();
    const cleanedDescription = campaignDescription.trim();

    if (!cleanedName) {
      setNpcError("Campaign name is required before generating NPCs.");
      return;
    }

    if (!cleanedDescription) {
      setNpcError("Campaign description is required before generating NPCs.");
      return;
    }

    await requestAIContent({
      requestKey: "NPC",
      historyKey: "npc",
      originalContent: isRegeneration
        ? getGeneratedContentByKey("npc")
        : "",
      regenerationInstructions: isRegeneration
        ? customInstructions
        : "",
      endpoint: "generate-npc",
      responseField: "npc_content",
      fallbackError: "Unable to generate NPCs.",
      cleanedName,
      cleanedDescription,
      setLoading: setGeneratingNPCs,
      setError: setNpcError,
      setContent: setGeneratedNPCContent,
      setSuccess: setGenerateSuccess,
      successMessage: `NPCs ${
        isRegeneration ? "regenerated" : "generated"
      } successfully.`,
      isRegeneration,
      suppressRelatedWarning,
    });
  };

  const handleGenerateQuests = async (
    isRegeneration = false,
    suppressRelatedWarning = false,
    customInstructions = ""
  ) => {
    const cleanedName = campaignName.trim();
    const cleanedDescription = campaignDescription.trim();

    if (!cleanedName) {
      setQuestError("Campaign name is required before generating quests.");
      return;
    }

    if (!cleanedDescription) {
      setQuestError("Campaign description is required before generating quests.");
      return;
    }

    await requestAIContent({
      requestKey: "Quest",
      historyKey: "quest",
      originalContent: isRegeneration
        ? getGeneratedContentByKey("quest")
        : "",
      regenerationInstructions: isRegeneration
        ? customInstructions
        : "",
      endpoint: "generate-quest",
      responseField: "quest_content",
      fallbackError: "Unable to generate quests.",
      cleanedName,
      cleanedDescription,
      setLoading: setGeneratingQuests,
      setError: setQuestError,
      setContent: setGeneratedQuestContent,
      setSuccess: setGenerateSuccess,
      successMessage: `Quests ${
        isRegeneration ? "regenerated" : "generated"
      } successfully.`,
      isRegeneration,
      suppressRelatedWarning,
    });
  };

  const handleGenerateEncounters = async (
    isRegeneration = false,
    suppressRelatedWarning = false,
    customInstructions = ""
  ) => {
    const cleanedName = campaignName.trim();
    const cleanedDescription = campaignDescription.trim();

    if (!cleanedName) {
      setEncounterError("Campaign name is required before generating encounters.");
      return;
    }

    if (!cleanedDescription) {
      setEncounterError(
        "Campaign description is required before generating encounters."
      );
      return;
    }

    await requestAIContent({
      requestKey: "Encounter",
      historyKey: "encounter",
      originalContent: isRegeneration
        ? getGeneratedContentByKey("encounter")
        : "",
      regenerationInstructions: isRegeneration
        ? customInstructions
        : "",
      endpoint: "generate-encounter",
      responseField: "encounter_content",
      fallbackError: "Unable to generate encounters.",
      cleanedName,
      cleanedDescription,
      setLoading: setGeneratingEncounters,
      setError: setEncounterError,
      setContent: setGeneratedEncounterContent,
      setSuccess: setGenerateSuccess,
      successMessage: `Encounters ${
        isRegeneration ? "regenerated" : "generated"
      } successfully.`,
      isRegeneration,
      suppressRelatedWarning,
    });
  };

  const handleGenerateLocations = async (
    isRegeneration = false,
    suppressRelatedWarning = false,
    customInstructions = ""
  ) => {
    const cleanedName = campaignName.trim();
    const cleanedDescription = campaignDescription.trim();

    if (!cleanedName) {
      setLocationError("Campaign name is required before generating locations.");
      return;
    }

    if (!cleanedDescription) {
      setLocationError(
        "Campaign description is required before generating locations."
      );
      return;
    }

    await requestAIContent({
      requestKey: "Location",
      historyKey: "location",
      originalContent: isRegeneration
        ? getGeneratedContentByKey("location")
        : "",
      regenerationInstructions: isRegeneration
        ? customInstructions
        : "",
      endpoint: "generate-location",
      responseField: "location_content",
      fallbackError: "Unable to generate locations.",
      cleanedName,
      cleanedDescription,
      setLoading: setGeneratingLocations,
      setError: setLocationError,
      setContent: setGeneratedLocationContent,
      setSuccess: setGenerateSuccess,
      successMessage: `Locations ${
        isRegeneration ? "regenerated" : "generated"
      } successfully.`,
      isRegeneration,
      suppressRelatedWarning,
    });
  };

  const handleGenerateImage = async () => {
    const cleanedPrompt = imagePrompt.trim();

    if (!cleanedPrompt) {
      setImageGenerateError("Image prompt is required.");
      return;
    }

    if (generatingImage) {
      return;
    }

    setGeneratingImage(true);
    setGeneratedImage("");
    setImageGenerateError("");
    setImageGenerateSuccess("");

    const controller = new AbortController();
    const timeoutId = window.setTimeout(
      () => controller.abort(),
      IMAGE_REQUEST_TIMEOUT_MS
    );

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch(
        "http://127.0.0.1:8000/tabletop-creator/generate-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_id: selectedProjectId,
            campaign_name: campaignName.trim() || null,
            campaign_description: campaignDescription.trim() || null,
            image_type: imageType,
            image_prompt: cleanedPrompt,
            use_campaign_context: useCampaignContextForImage,
          }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        let message = "Unable to generate tabletop image.";

        if (typeof errorData?.detail === "string") {
          message = errorData.detail;
        } else if (Array.isArray(errorData?.detail)) {
          message = errorData.detail
            .map((item) => item?.msg || JSON.stringify(item))
            .join(" ");
        } else if (response.status === 401) {
          message = "Your session has expired. Please sign in again.";
        }

        throw new Error(message);
      }

      const data = await response.json();

      setGeneratedImage(data.image_base64 || "");
      setImageGenerateSuccess(`${data.image_type || imageType} image generated successfully.`);
      notifyGenerationComplete("Tabletop Image Generator", imageType);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setImageGenerateError(
          "The image request took too long. Please try generating the image again."
        );
      } else {
        setImageGenerateError(
          error instanceof Error
            ? error.message
            : "Something went wrong while generating the image."
        );
      }
    } finally {
      window.clearTimeout(timeoutId);
      setGeneratingImage(false);
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

  const handleSelectedProjectChange = (projectId) => {
    if (!projectId) {
      setSelectedProjectId(null);
      return;
    }

    const project = projects.find(
      (item) => String(item.id) === String(projectId)
    );

    if (!project) {
      return;
    }

    setSelectedProjectId(project.id);
    setCampaignName(project.title || "");
    setCampaignDescription(project.description || "");
    setGenerateSuccess("");
    setGenerateError("");
    setNpcError("");
    setQuestError("");
    setEncounterError("");
    setLocationError("");
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
        setSelectedSaveProjectId(
          loadedProjects.length > 0 ? String(loadedProjects[0].id) : ""
        );
        return;
      }

      const currentProject = loadedProjects.find(
        (project) => String(project.id) === String(selectedProjectId)
      );

      const preferredWorkspace =
        loadedWorkspaces.find(
          (workspace) =>
            currentProject &&
            String(workspace.id) === String(currentProject.workspace_id)
        ) || loadedWorkspaces[0];

      setSelectedWorkspaceId(String(preferredWorkspace.id));

      const projectsInWorkspace = loadedProjects.filter(
        (project) =>
          String(project.workspace_id) === String(preferredWorkspace.id)
      );

      const preferredProject =
        projectsInWorkspace.find(
          (project) => String(project.id) === String(selectedProjectId)
        ) || projectsInWorkspace[0];

      setSelectedSaveProjectId(
        preferredProject ? String(preferredProject.id) : ""
      );
    } catch (error) {
      console.error("Workspace options load error:", error);
      setSaveWorkspaceError(
        error instanceof Error
          ? error.message
          : "Something went wrong while loading your workspaces."
      );
    } finally {
      setWorkspaceOptionsLoading(false);
    }
  };

  const handleOpenSaveWorkspace = async (contentKey) => {
    const body = getGeneratedContentByKey(contentKey);

    if (!body.trim() || savingToWorkspace) {
      return;
    }

    setContentToSave({
      key: contentKey,
      label: CONTENT_LABELS[contentKey],
      body,
    });
    setSaveWorkspaceError("");
    setSaveWorkspaceSuccess("");
    setSaveWorkspaceOpen(true);
    await loadWorkspaceOptions();
  };

  const handleOpenSaveImage = (imageData) => {
    if (!imageData?.imageBase64) {
      return;
    }

    setSaveImageTarget(imageData);
    setSaveImageProjectId(String(selectedProjectId || projects[0]?.id || ""));
    setSaveImageError("");
    setSaveImageOpen(true);
  };

  const handleCloseSaveImage = () => {
    if (saveImageLoading) {
      return;
    }

    setSaveImageOpen(false);
    setSaveImageTarget(null);
    setSaveImageProjectId("");
    setSaveImageError("");
  };

  const handleSaveImage = async () => {
    if (!saveImageTarget || !saveImageProjectId) {
      setSaveImageError("Please choose a project.");
      return;
    }

    setSaveImageLoading(true);
    setSaveImageError("");

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch(
        "http://127.0.0.1:8000/tabletop-creator/save-image",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_id: Number(saveImageProjectId),
            image_base64: saveImageTarget.imageBase64,
            image_type: saveImageTarget.imageType || "Tabletop Image",
            image_prompt:
              saveImageTarget.imagePrompt || "Generated tabletop image.",
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          typeof errorData?.detail === "string"
            ? errorData.detail
            : "Image could not be saved to that project. Please try again."
        );
      }

      const destinationProject = projects.find(
        (project) => String(project.id) === String(saveImageProjectId)
      );

      notifyContentSaved(
        `${campaignName.trim() || "Untitled Campaign"} - ${
          saveImageTarget.imageType || "Tabletop Image"
        }`
      );

      setSaveWorkspaceSuccess(
        `${saveImageTarget.imageType || "Tabletop Image"} saved to ${
          destinationProject?.title || "the selected project"
        } successfully.`
      );

      setSaveImageOpen(false);
      setSaveImageTarget(null);
      setSaveImageProjectId("");
      setSaveImageError("");
    } catch (error) {
      console.error("Save image to project error:", error);

      setSaveImageError(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving this image."
      );
    } finally {
      setSaveImageLoading(false);
    }
  };  

  const handleCloseSaveWorkspace = () => {
    if (savingToWorkspace) {
      return;
    }

    setSaveWorkspaceOpen(false);
    setContentToSave(null);
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
    if (savingToWorkspace || !contentToSave) {
      return;
    }

    if (!selectedWorkspaceId) {
      setSaveWorkspaceError("Please choose a workspace.");
      return;
    }

    if (!selectedSaveProjectId) {
      setSaveWorkspaceError("Please choose a project.");
      return;
    }

    const selectedProject = projects.find(
      (project) => String(project.id) === String(selectedSaveProjectId)
    );

    if (!selectedProject) {
      setSaveWorkspaceError("The selected project could not be found.");
      return;
    }

    if (String(selectedProject.workspace_id) !== String(selectedWorkspaceId)) {
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

      const cleanedCampaignName = campaignName.trim() || "Untitled Campaign";

      const response = await fetch("http://127.0.0.1:8000/content/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: `${cleanedCampaignName} - ${contentToSave.label}`,
          content_type: `tabletop_${contentToSave.key}`,
          body: contentToSave.body,
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
        }

        throw new Error(message);
      }

      const selectedWorkspace = workspaces.find(
        (workspace) => String(workspace.id) === String(selectedWorkspaceId)
      );

      notifyContentSaved(`${cleanedCampaignName} - ${contentToSave.label}`);

      setSaveWorkspaceSuccess(
        `${contentToSave.label} saved to ${
          selectedWorkspace?.name || "the selected workspace"
        } successfully.`
      );

      setSaveWorkspaceOpen(false);
      setContentToSave(null);
    } catch (error) {
      console.error("Save to workspace error:", error);
      setSaveWorkspaceError(
        error instanceof Error
          ? error.message
          : "Something went wrong while saving."
      );
    } finally {
      setSavingToWorkspace(false);
    }
  };

  return (
    <main
      className="relative min-h-screen flex-1 overflow-hidden bg-slate-950 px-3 py-4 text-white sm:px-4 lg:px-5 xl:px-6"
      data-testid="tabletop-creator-page"
    >
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-40 top-[-12rem] h-[32rem] w-[32rem] rounded-full bg-violet-500/[0.06] blur-3xl" />
        <div className="absolute right-[-10rem] top-[18rem] h-[28rem] w-[28rem] rounded-full bg-cyan-500/[0.05] blur-3xl" />
        <div className="absolute inset-0 bg-[linear-gradient(rgba(148,163,184,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.025)_1px,transparent_1px)] bg-[size:48px_48px] [mask-image:linear-gradient(to_bottom,black,transparent_80%)]" />
      </div>

      <div className="relative z-10 w-full">
        {/* Hero Header */}
        <div className="group relative mb-5 overflow-hidden rounded-[22px] border border-violet-400/20 bg-slate-950/80 shadow-[0_30px_100px_rgba(0,0,0,0.34)] ring-1 ring-white/[0.035] backdrop-blur-2xl">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -left-20 -top-32 h-72 w-72 rounded-full bg-violet-400/[0.13] blur-[90px]" />
            <div className="absolute left-[35%] -top-40 h-80 w-80 rounded-full bg-fuchsia-500/[0.06] blur-[110px]" />
            <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-cyan-500/[0.08] blur-[100px]" />
            <div className="absolute inset-0 bg-[linear-gradient(110deg,transparent_0%,rgba(255,255,255,0.025)_38%,transparent_62%)]" />
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-violet-300/70 to-transparent" />
            <div className="absolute bottom-0 left-[8%] right-[8%] h-px bg-gradient-to-r from-transparent via-cyan-500/20 to-transparent" />
          </div>

          <div className="relative flex flex-col gap-5 p-5 sm:p-6 xl:flex-row xl:items-center xl:justify-between xl:px-7 xl:py-6">
            <div className="flex min-w-0 items-center gap-5">
              <div className="relative flex h-[68px] w-[68px] shrink-0 items-center justify-center">
                <div className="absolute inset-0 rounded-[20px] bg-violet-400/15 blur-xl transition duration-500 group-hover:bg-violet-400/25" />
                <div className="absolute inset-0 rotate-6 rounded-[20px] border border-violet-400/15 bg-violet-500/[0.04]" />
                <div className="relative flex h-[62px] w-[62px] items-center justify-center overflow-hidden rounded-[18px] border border-violet-300/30 bg-gradient-to-br from-violet-400/25 via-fuchsia-500/10 to-slate-950 text-[28px] text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_0_35px_rgba(139,92,246,0.14)]">
                  <span className="absolute inset-0 bg-gradient-to-br from-white/[0.12] via-transparent to-transparent" />
                  <span className="relative drop-shadow-[0_0_12px_rgba(196,181,253,0.75)]">✦</span>
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-violet-300">
                    Tanio Intelligence
                  </span>
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-emerald-300/90">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_9px_rgba(52,211,153,0.85)]" />
                    Online
                  </span>
                </div>

                <h1 className="bg-gradient-to-r from-white via-slate-100 to-violet-200 bg-clip-text text-3xl font-black tracking-[-0.035em] text-transparent sm:text-4xl">
                  Tabletop Creator
                </h1>
                <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-400 sm:text-base">
                  Build campaigns, characters, quests, encounters, and locations from one intelligent world-building workspace.
                </p>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-violet-400/15 bg-gradient-to-br from-slate-950/80 via-slate-950/60 to-violet-950/25 p-[1px] shadow-[0_16px_45px_rgba(0,0,0,0.20)] xl:min-w-[470px]">
              <div className="absolute -right-10 -top-12 h-32 w-32 rounded-full bg-violet-400/[0.08] blur-3xl" />
              <div className="relative flex items-center gap-4 rounded-[15px] bg-slate-950/65 px-4 py-3.5">
                <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-300/25 bg-violet-400/[0.08] text-lg text-violet-300 shadow-[0_0_24px_rgba(139,92,246,0.10)]">
                  <span className="absolute h-6 w-6 animate-ping rounded-full border border-violet-400/10" />
                  <span className="relative">◎</span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-3">
                    <p className="truncate font-bold text-white">AI Worldbuilding Engine</p>
                    <span className="shrink-0 rounded-full border border-emerald-400/20 bg-emerald-400/[0.08] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                      Ready
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-400 sm:text-sm">
                    Imagine → build → connect → play
                  </p>
                  <div className="mt-2.5 flex items-center gap-1.5" aria-hidden="true">
                    <span className="h-1 flex-1 rounded-full bg-violet-400/70 shadow-[0_0_8px_rgba(139,92,246,0.35)]" />
                    <span className="h-1 flex-1 rounded-full bg-fuchsia-400/55" />
                    <span className="h-1 flex-1 rounded-full bg-cyan-400/45" />
                    <span className="h-1 flex-1 rounded-full bg-emerald-400/45" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

      <div className="mb-5 flex flex-wrap gap-2 rounded-2xl border border-slate-800 bg-slate-950/70 p-2 shadow-[0_16px_40px_rgba(0,0,0,0.18)]">
        {TABLETOP_TABS.map((tab) => {
          const isActive = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`rounded-xl px-5 py-3 text-sm font-bold transition-all ${
                isActive
                  ? "border border-cyan-400/40 bg-cyan-400/15 text-cyan-200 shadow-[0_0_24px_rgba(34,211,238,0.10)]"
                  : "border border-transparent text-slate-400 hover:bg-slate-900 hover:text-white"
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {activeTab === "content" && (
        <>

          <section className="relative mb-5 overflow-hidden rounded-2xl border border-violet-500/15 bg-[radial-gradient(circle_at_top_left,rgba(139,92,246,0.055),transparent_25%),linear-gradient(to_bottom,rgba(15,23,42,0.98),rgba(15,23,42,0.84))] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.02] backdrop-blur sm:p-6">
            <div className="mb-5 flex items-start gap-3 border-b border-slate-800/70 pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-violet-400/20 bg-gradient-to-br from-violet-500/15 to-slate-900 text-xl text-violet-300 shadow-[0_0_24px_rgba(139,92,246,0.10)]">
                ✦
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Campaign Creation Tools</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Choose a world-building tool and generate connected campaign content.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
              {tools.map((tool) => (
                <button
                  key={tool.title}
                  type="button"
                  className="group rounded-2xl border border-slate-800/90 bg-gradient-to-br from-slate-950/80 to-violet-950/[0.10] p-5 text-left shadow-inner shadow-black/10 transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-400/30 hover:bg-violet-950/[0.16] hover:shadow-[0_16px_36px_rgba(0,0,0,0.18)]"
                  data-testid={`tabletop-tool-${tool.title
                    .toLowerCase()
                    .replaceAll(" ", "-")}`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <h4 className="text-lg font-semibold text-white">
                      {tool.title}
                    </h4>

                    <span className="rounded-full border border-emerald-500/20 bg-emerald-500/[0.07] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-300">
                      {tool.status}
                    </span>
                  </div>

                  <p className="text-sm text-slate-400 mt-3">
                    {tool.description}
                  </p>
                </button>
              ))}
            </div>
          </section>

          <section className="relative mb-5 overflow-hidden rounded-2xl border border-cyan-500/15 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.05),transparent_24%),linear-gradient(to_bottom,rgba(15,23,42,0.98),rgba(15,23,42,0.84))] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.02] backdrop-blur sm:p-6">
            <div className="mb-5 flex items-start gap-3 border-b border-slate-800/70 pb-4">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-cyan-400/20 bg-gradient-to-br from-cyan-500/15 to-slate-900 text-xl text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.08)]">
                ◈
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Create Campaign</h2>
                <p className="mt-1 text-sm text-slate-400">
                  Define your campaign foundation, then generate the content you need.
                </p>
              </div>
            </div>
            
            <div className="mb-5">
              <label
                htmlFor="existing-tabletop-project"
                className="block text-sm text-slate-300 mb-2"
              >
                Choose Existing Project
              </label>

              <select
                id="existing-tabletop-project"
                value={selectedProjectId || ""}
                onChange={(event) => handleSelectedProjectChange(event.target.value)}
                disabled={isAnyGenerationInProgress}
                className="w-full rounded-xl border border-slate-700/90 bg-slate-950/70 px-4 py-3.5 text-white shadow-inner shadow-black/10 transition-all focus:border-cyan-400/70 focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-cyan-500/10 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <option value="">Create a new project automatically</option>

                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>

              <p className="text-xs text-slate-500 mt-2">
                Select an existing project to save generated tabletop content there.
                Leave this blank to auto-create a new campaign project.
              </p>
            </div>

            <p className="text-slate-400 mt-2">
              Enter campaign details and world-building information.
            </p>

            <form
              onSubmit={(event) => event.preventDefault()}
              className="mt-6"
              data-testid="campaign-creation-form"
            >
              <div className="mb-5">
                <label
                  htmlFor="campaign-name"
                  className="block text-sm text-slate-300 mb-2"
                >
                  Campaign Name
                </label>

                <input
                  id="campaign-name"
                  value={campaignName}
                  onChange={(event) => {
                    setCampaignName(event.target.value);
                  }}
                  maxLength={100}
                  className="w-full rounded-xl border border-slate-700/90 bg-slate-950/70 px-4 py-3.5 text-white shadow-inner shadow-black/10 transition-all focus:border-cyan-400/70 focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-cyan-500/10"
                  data-testid="campaign-name"
                />
              </div>

              <div className="mb-5">
                <label
                  htmlFor="campaign-description"
                  className="block text-sm text-slate-300 mb-2"
                >
                  Campaign Description / World-Building Notes
                </label>

                <textarea
                  id="campaign-description"
                  value={campaignDescription}
                  onChange={(event) =>
                    setCampaignDescription(event.target.value)
                  }
                  rows="5"
                  maxLength={5000}
                  className="w-full rounded-xl border border-slate-700/90 bg-slate-950/70 px-4 py-3.5 text-white shadow-inner shadow-black/10 transition-all focus:border-cyan-400/70 focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-cyan-500/10"
                  data-testid="campaign-description"
                />
              </div>

              <div className="mb-5 rounded-2xl border border-cyan-500/15 bg-slate-950/50 p-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">
                      Generate Image with Content
                    </h3>

                    <p className="mt-1 text-xs leading-5 text-slate-400">
                      Turn this on and Tanio will automatically create an image that matches
                      the content you generate from the campaign name, description, and output.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() =>
                      setGenerateImageWithContent((previous) => !previous)
                    }
                    disabled={isAnyGenerationInProgress}
                    className={`rounded-xl border px-5 py-2 text-sm font-bold transition ${
                      generateImageWithContent
                        ? "border-cyan-400/40 bg-cyan-500/15 text-cyan-200"
                        : "border-slate-700 bg-slate-900 text-slate-300 hover:border-slate-600 hover:text-white"
                    } disabled:cursor-not-allowed disabled:opacity-50`}
                  >
                    {generateImageWithContent ? "Image On" : "Image Off"}
                  </button>
                </div>

                {generateImageWithContent && (
                  <p className="mt-4 rounded-xl border border-cyan-400/15 bg-cyan-500/[0.06] px-4 py-3 text-sm text-cyan-200">
                    Image generation is enabled. Tanio will choose the best image type based
                    on the content button you click.
                  </p>
                )}
              </div>              

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => handleGenerateCampaign(false)}
                  disabled={isAnyGenerationInProgress}
                  className="rounded-xl border border-cyan-300/40 bg-gradient-to-r from-cyan-400 to-sky-400 px-5 py-3 font-bold text-slate-950 shadow-[0_12px_28px_rgba(34,211,238,0.14)] transition-all hover:-translate-y-0.5 hover:from-cyan-300 hover:to-sky-300 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="generate-campaign"
                >
                  {generating ? "Generating..." : "Generate Campaign Content"}
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateNPCs(false)}
                  disabled={isAnyGenerationInProgress}
                  className="rounded-xl border border-violet-500/20 bg-violet-500/[0.08] px-5 py-3 font-semibold text-violet-100 transition-all hover:-translate-y-0.5 hover:border-violet-400/35 hover:bg-violet-500/[0.13] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="generate-npcs"
                >
                  {generatingNPCs ? "Generating NPCs..." : "Generate NPCs"}
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateQuests(false)}
                  disabled={isAnyGenerationInProgress}
                  className="rounded-xl border border-violet-500/20 bg-violet-500/[0.08] px-5 py-3 font-semibold text-violet-100 transition-all hover:-translate-y-0.5 hover:border-violet-400/35 hover:bg-violet-500/[0.13] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="generate-quests"
                >
                  {generatingQuests ? "Generating Quests..." : "Generate Quests"}
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateEncounters(false)}
                  disabled={isAnyGenerationInProgress}
                  className="rounded-xl border border-violet-500/20 bg-violet-500/[0.08] px-5 py-3 font-semibold text-violet-100 transition-all hover:-translate-y-0.5 hover:border-violet-400/35 hover:bg-violet-500/[0.13] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="generate-encounters"
                >
                  {generatingEncounters
                    ? "Generating Encounters..."
                    : "Generate Encounters"}
                </button>

                <button
                  type="button"
                  onClick={() => handleGenerateLocations(false)}
                  disabled={isAnyGenerationInProgress}
                  className="rounded-xl border border-violet-500/20 bg-violet-500/[0.08] px-5 py-3 font-semibold text-violet-100 transition-all hover:-translate-y-0.5 hover:border-violet-400/35 hover:bg-violet-500/[0.13] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
                  data-testid="generate-locations"
                >
                  {generatingLocations
                    ? "Generating Locations..."
                    : "Generate Locations"}
                </button>
              </div>

              {isAnyGenerationInProgress && (
                <div
                  className="mt-4 flex items-center gap-3 text-sm text-cyan-300"
                  role="status"
                  aria-live="polite"
                  data-testid="ai-generation-loading"
                >
                  <div
                    className="h-5 w-5 rounded-full border-2 border-slate-600 border-t-cyan-400 animate-spin"
                    aria-hidden="true"
                  />

                  <p>Tanio AI is generating content. Please wait...</p>
                </div>
              )}

              {generateSuccess && (
                <p
                  className="mt-4 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-lg p-3"
                  role="status"
                  aria-live="polite"
                >
                  {generateSuccess}
                </p>
              )}
            </form>
          </section>

          {saveWorkspaceSuccess && (
            <div
              className="mb-5 rounded-2xl border border-emerald-500/20 bg-emerald-500/[0.06] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.14)]"
              role="status"
              aria-live="polite"
            >
              <p className="font-semibold text-emerald-300">Saved successfully</p>
              <p className="mt-1 text-sm text-emerald-300">
                {saveWorkspaceSuccess}
              </p>
            </div>
          )}

          {generateImageWithContent && (
            <section className="relative mb-5 overflow-hidden rounded-2xl border border-fuchsia-500/15 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.055),transparent_25%),linear-gradient(to_bottom,rgba(15,23,42,0.98),rgba(15,23,42,0.84))] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.02] backdrop-blur sm:p-6">
              <div className="mb-5 flex items-start gap-3 border-b border-slate-800/70 pb-4">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/15 to-slate-900 text-xl text-fuchsia-300 shadow-[0_0_24px_rgba(217,70,239,0.08)]">
                  ✧
                </div>

                <div>
                  <h2 className="text-xl font-bold text-white">
                    Content Image Preview
                  </h2>
                  <p className="mt-1 text-sm text-slate-400">
                    This image is generated from the Content Generator page when the image option is turned on.
                  </p>
                </div>
              </div>

              {contentImageLoading && (
                <div
                  className="flex items-center gap-3 text-sm text-fuchsia-300"
                  role="status"
                  aria-live="polite"
                >
                  <div
                    className="h-5 w-5 rounded-full border-2 border-slate-600 border-t-fuchsia-400 animate-spin"
                    aria-hidden="true"
                  />

                  <p>Tanio AI is generating the content image. Please wait...</p>
                </div>
              )}

              {contentImageError && (
                <p
                  className="rounded-lg border border-red-800 bg-red-950 p-3 text-red-300"
                  role="alert"
                >
                  {contentImageError}
                </p>
              )}

              {!contentImageLoading &&
                !contentImageError &&
                !contentGeneratedImage && (
                  <div className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center">
                    <div>
                      <p className="text-lg font-bold text-white">
                        No content image generated yet
                      </p>
                      <p className="mt-2 text-sm leading-6 text-slate-400">
                        Generate campaign content while Image On is enabled.
                      </p>
                    </div>
                  </div>
                )}

              {contentGeneratedImage && (
                <div className="grid gap-5 lg:grid-cols-[320px_minmax(0,1fr)]">
                  <img
                    src={getImageSource(contentGeneratedImage)}
                    alt="Generated content visual"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 object-cover"
                  />

                  <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-5">
                    <p className="text-sm font-semibold uppercase tracking-wide text-fuchsia-300">
                      Image Details
                    </p>

                    <p className="mt-3 text-lg font-bold text-white">
                      Automatic Content Image
                    </p>

                    <p className="mt-3 text-sm leading-6 text-slate-400">
                      Generated automatically from the campaign name, campaign description, and
                      content output.
                    </p>

                    <div className="mt-5 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadImage(
                            contentGeneratedImage,
                            `${campaignName || "campaign"}-content-image`
                          )
                        }
                        className="rounded-xl border border-slate-700 bg-slate-950/65 px-4 py-2 font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
                      >
                        Download Image
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          handleOpenSaveImage({
                            imageBase64: contentGeneratedImage,
                            imageType: contentGeneratedImageType || "Automatic Content Image",
                            imagePrompt:
                              contentGeneratedImagePrompt ||
                              "Generated automatically from campaign content.",
                          })
                        }
                        className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
                      >
                        Save Image to Project
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </section>
          )}

          {relatedContentWarning && (
            <section
              className="mb-5 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-5 shadow-[0_16px_40px_rgba(0,0,0,0.14)] sm:p-6"
              data-testid="related-content-warning"
            >
              <div className="flex flex-col gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase tracking-wide text-amber-400">
                    Related Content May Need Updating
                  </p>

                  <h3 className="mt-1 text-2xl font-bold text-white">
                    {CONTENT_LABELS[relatedContentWarning.source]} was regenerated
                  </h3>

                  <p className="mt-2 max-w-3xl text-slate-300">
                    Some content you already generated may no longer match the new
                    version. Choose anything you want Tanio to regenerate, or keep
                    the existing content as is.
                  </p>
                </div>

                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {relatedContentWarning.related.map((contentKey) => {
                    const isSelected = selectedRelatedContent.includes(contentKey);

                    return (
                      <label
                        key={contentKey}
                        className={`flex cursor-pointer items-center gap-3 rounded-lg border p-4 transition ${
                          isSelected
                            ? "border-amber-500 bg-amber-950/60"
                            : "border-slate-700 bg-slate-950/60 hover:border-slate-600"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleRelatedContentToggle(contentKey)}
                          disabled={isAnyGenerationInProgress}
                          className="h-4 w-4 accent-amber-500"
                        />

                        <span className="font-semibold text-white">
                          {CONTENT_LABELS[contentKey]}
                        </span>
                      </label>
                    );
                  })}
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleUpdateSelectedRelatedContent}
                    disabled={
                      selectedRelatedContent.length === 0 ||
                      isAnyGenerationInProgress
                    }
                    className="rounded-lg bg-amber-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {isAnyGenerationInProgress
                      ? "Updating..."
                      : "Update Selected"}
                  </button>

                  <button
                    type="button"
                    onClick={handleKeepRelatedContentAsIs}
                    disabled={isAnyGenerationInProgress}
                    className="rounded-lg bg-slate-700 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Keep As Is
                  </button>
                </div>
              </div>
            </section>
          )}

          {(generateError || generatedCampaignContent) && (
            <section className="relative mb-5 overflow-hidden rounded-2xl border border-cyan-500/12 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.045),transparent_26%),linear-gradient(to_bottom,rgba(15,23,42,0.97),rgba(15,23,42,0.84))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.20)] ring-1 ring-white/[0.02] backdrop-blur sm:p-6">
              <h3 className="text-2xl font-bold">Generated Campaign Content</h3>
              {generatedCampaignContent && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleVersionChange("campaign", -1, setGeneratedCampaignContent)
                    }
                    disabled={
                      isAnyGenerationInProgress ||
                      currentVersionIndex.campaign <= 0
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950/65 px-4 py-2 font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleVersionChange("campaign", 1, setGeneratedCampaignContent)
                    }
                    disabled={
                      isAnyGenerationInProgress ||
                      currentVersionIndex.campaign >=
                        generationHistory.campaign.length - 1
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950/65 px-4 py-2 font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next →
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenRegenerate("campaign")}
                    disabled={isAnyGenerationInProgress}
                    className="rounded-xl border border-violet-400/30 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/15 px-4 py-2 font-semibold text-violet-100 transition hover:border-violet-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generating ? "Regenerating..." : "Regenerate Campaign"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSaveWorkspace("campaign")}
                    disabled={isAnyGenerationInProgress || savingToWorkspace}
                    className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save to Workspace
                  </button>
                </div>
              )}
              
              {generateError && (
                <div
                  className="mt-4 bg-red-950 border border-red-800 text-red-300 rounded-lg p-3"
                  role="alert"
                  data-testid="campaign-generate-error"
                >
                  <p>{generateError}</p>

                  <button
                    type="button"
                    onClick={() => handleGenerateCampaign(false)}
                    disabled={isAnyGenerationInProgress}
                    className="mt-3 rounded-lg bg-red-800 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Retry Campaign
                  </button>
                </div>
              )}

              {generatedCampaignContent && generationHistory.campaign.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300">
                    Version {currentVersionIndex.campaign + 1} of {generationHistory.campaign.length}
                  </span>

                  <span
                    className={`rounded-lg border px-3 py-1.5 font-semibold ${
                      currentVersionIndex.campaign ===
                      generationHistory.campaign.length - 1
                        ? "border-emerald-800 bg-emerald-950 text-emerald-300"
                        : "border-slate-700 bg-slate-800 text-slate-400"
                    }`}
                  >
                    {currentVersionIndex.campaign ===
                    generationHistory.campaign.length - 1
                      ? "Current Version"
                      : "Previous Version"}
                  </span>
                </div>
              )}

              {getCurrentRegenerationInstructions("campaign") && (
                <div className="mt-4 rounded-lg border border-cyan-800/50 bg-cyan-950/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                    Regeneration Instructions
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {getCurrentRegenerationInstructions("campaign")}
                  </p>
                </div>
              )}

              {generatedCampaignContent && (
                <div
                  className={`${generatedMarkdownClasses} rounded-2xl border border-slate-800/80 bg-slate-950/45 p-5 shadow-inner shadow-black/15 sm:p-7`}
                  data-testid="generated-campaign-content"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {cleanGeneratedMarkdown(generatedCampaignContent)}
                  </ReactMarkdown>
                </div>
              )}
            </section>
          )}

          {(npcError || generatedNPCContent) && (
            <section className="relative mb-5 overflow-hidden rounded-2xl border border-cyan-500/12 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.045),transparent_26%),linear-gradient(to_bottom,rgba(15,23,42,0.97),rgba(15,23,42,0.84))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.20)] ring-1 ring-white/[0.02] backdrop-blur sm:p-6">
              <h3 className="text-2xl font-bold">Generated NPCs</h3>
              {generatedNPCContent && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleVersionChange("npc", -1, setGeneratedNPCContent)
                    }
                    disabled={
                      isAnyGenerationInProgress ||
                      currentVersionIndex.npc <= 0
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950/65 px-4 py-2 font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleVersionChange("npc", 1, setGeneratedNPCContent)
                    }
                    disabled={
                      isAnyGenerationInProgress ||
                      currentVersionIndex.npc >=
                        generationHistory.npc.length - 1
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950/65 px-4 py-2 font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next →
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenRegenerate("npc")}
                    disabled={isAnyGenerationInProgress}
                    className="rounded-xl border border-violet-400/30 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/15 px-4 py-2 font-semibold text-violet-100 transition hover:border-violet-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generatingNPCs ? "Regenerating..." : "Regenerate NPCs"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSaveWorkspace("npc")}
                    disabled={isAnyGenerationInProgress || savingToWorkspace}
                    className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save to Workspace
                  </button>
                </div>
              )}

              {npcError && (
                <div
                  className="mt-4 bg-red-950 border border-red-800 text-red-300 rounded-lg p-3"
                  role="alert"
                  data-testid="npc-generate-error"
                >
                  <p>{npcError}</p>

                  <button
                    type="button"
                    onClick={() => handleGenerateNPCs(false)}
                    disabled={isAnyGenerationInProgress}
                    className="mt-3 rounded-lg bg-red-800 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Retry NPCs
                  </button>
                </div>
              )}

              {generatedNPCContent && generationHistory.npc.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300">
                    Version {currentVersionIndex.npc + 1} of {generationHistory.npc.length}
                  </span>

                  <span
                    className={`rounded-lg border px-3 py-1.5 font-semibold ${
                      currentVersionIndex.npc ===
                      generationHistory.npc.length - 1
                        ? "border-emerald-800 bg-emerald-950 text-emerald-300"
                        : "border-slate-700 bg-slate-800 text-slate-400"
                    }`}
                  >
                    {currentVersionIndex.npc ===
                    generationHistory.npc.length - 1
                      ? "Current Version"
                      : "Previous Version"}
                  </span>
                </div>
              )}

              {getCurrentRegenerationInstructions("npc") && (
                <div className="mt-4 rounded-lg border border-cyan-800/50 bg-cyan-950/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                    Regeneration Instructions
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {getCurrentRegenerationInstructions("npc")}
                  </p>
                </div>
              )}

              {generatedNPCContent && (
                <div
                  className={`${generatedMarkdownClasses} rounded-2xl border border-slate-800/80 bg-slate-950/45 p-5 shadow-inner shadow-black/15 sm:p-7`}
                  data-testid="generated-npc-content"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {cleanGeneratedMarkdown(generatedNPCContent)}
                  </ReactMarkdown>
                </div>
              )}
            </section>
          )}

          {(questError || generatedQuestContent) && (
            <section className="relative mb-5 overflow-hidden rounded-2xl border border-cyan-500/12 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.045),transparent_26%),linear-gradient(to_bottom,rgba(15,23,42,0.97),rgba(15,23,42,0.84))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.20)] ring-1 ring-white/[0.02] backdrop-blur sm:p-6">
              <h3 className="text-2xl font-bold">Generated Quests</h3>
              {generatedQuestContent && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleVersionChange("quest", -1, setGeneratedQuestContent)
                    }
                    disabled={
                      isAnyGenerationInProgress ||
                      currentVersionIndex.quest <= 0
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950/65 px-4 py-2 font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleVersionChange("quest", 1, setGeneratedQuestContent)
                    }
                    disabled={
                      isAnyGenerationInProgress ||
                      currentVersionIndex.quest >=
                        generationHistory.quest.length - 1
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950/65 px-4 py-2 font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next →
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenRegenerate("quest")}
                    disabled={isAnyGenerationInProgress}
                    className="rounded-xl border border-violet-400/30 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/15 px-4 py-2 font-semibold text-violet-100 transition hover:border-violet-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generatingQuests ? "Regenerating..." : "Regenerate Quests"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSaveWorkspace("quest")}
                    disabled={isAnyGenerationInProgress || savingToWorkspace}
                    className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save to Workspace
                  </button>
                </div>
              )}

              {questError && (
                <div
                  className="mt-4 bg-red-950 border border-red-800 text-red-300 rounded-lg p-3"
                  role="alert"
                  data-testid="quest-generate-error"
                >
                  <p>{questError}</p>

                  <button
                    type="button"
                    onClick={() => handleGenerateQuests(false)}
                    disabled={isAnyGenerationInProgress}
                    className="mt-3 rounded-lg bg-red-800 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Retry Quests
                  </button>
                </div>
              )}

              {generatedQuestContent && generationHistory.quest.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300">
                    Version {currentVersionIndex.quest + 1} of {generationHistory.quest.length}
                  </span>

                  <span
                    className={`rounded-lg border px-3 py-1.5 font-semibold ${
                      currentVersionIndex.quest ===
                      generationHistory.quest.length - 1
                        ? "border-emerald-800 bg-emerald-950 text-emerald-300"
                        : "border-slate-700 bg-slate-800 text-slate-400"
                    }`}
                  >
                    {currentVersionIndex.quest ===
                    generationHistory.quest.length - 1
                      ? "Current Version"
                      : "Previous Version"}
                  </span>
                </div>
              )}

              {getCurrentRegenerationInstructions("quest") && (
                <div className="mt-4 rounded-lg border border-cyan-800/50 bg-cyan-950/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                    Regeneration Instructions
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {getCurrentRegenerationInstructions("quest")}
                  </p>
                </div>
              )}

              {generatedQuestContent && (
                <div
                  className={`${generatedMarkdownClasses} rounded-2xl border border-slate-800/80 bg-slate-950/45 p-5 shadow-inner shadow-black/15 sm:p-7`}
                  data-testid="generated-quest-content"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {cleanGeneratedMarkdown(generatedQuestContent)}
                  </ReactMarkdown>
                </div>
              )}
            </section>
          )}

          {(encounterError || generatedEncounterContent) && (
            <section className="relative mb-5 overflow-hidden rounded-2xl border border-cyan-500/12 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.045),transparent_26%),linear-gradient(to_bottom,rgba(15,23,42,0.97),rgba(15,23,42,0.84))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.20)] ring-1 ring-white/[0.02] backdrop-blur sm:p-6">
              <h3 className="text-2xl font-bold">Generated Encounters</h3>
              {generatedEncounterContent && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleVersionChange("encounter", -1, setGeneratedEncounterContent)
                    }
                    disabled={
                      isAnyGenerationInProgress ||
                      currentVersionIndex.encounter <= 0
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950/65 px-4 py-2 font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleVersionChange("encounter", 1, setGeneratedEncounterContent)
                    }
                    disabled={
                      isAnyGenerationInProgress ||
                      currentVersionIndex.encounter >=
                        generationHistory.encounter.length - 1
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950/65 px-4 py-2 font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next →
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenRegenerate("encounter")}
                    disabled={isAnyGenerationInProgress}
                    className="rounded-xl border border-violet-400/30 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/15 px-4 py-2 font-semibold text-violet-100 transition hover:border-violet-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generatingEncounters ? "Regenerating..." : "Regenerate Encounters"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSaveWorkspace("encounter")}
                    disabled={isAnyGenerationInProgress || savingToWorkspace}
                    className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save to Workspace
                  </button>
                </div>
              )}

              {encounterError && (
                <div
                  className="mt-4 bg-red-950 border border-red-800 text-red-300 rounded-lg p-3"
                  role="alert"
                  data-testid="encounter-generate-error"
                >
                  <p>{encounterError}</p>

                  <button
                    type="button"
                    onClick={() => handleGenerateEncounters(false)}
                    disabled={isAnyGenerationInProgress}
                    className="mt-3 rounded-lg bg-red-800 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Retry Encounters
                  </button>
                </div>
              )}

              {generatedEncounterContent && generationHistory.encounter.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300">
                    Version {currentVersionIndex.encounter + 1} of {generationHistory.encounter.length}
                  </span>

                  <span
                    className={`rounded-lg border px-3 py-1.5 font-semibold ${
                      currentVersionIndex.encounter ===
                      generationHistory.encounter.length - 1
                        ? "border-emerald-800 bg-emerald-950 text-emerald-300"
                        : "border-slate-700 bg-slate-800 text-slate-400"
                    }`}
                  >
                    {currentVersionIndex.encounter ===
                    generationHistory.encounter.length - 1
                      ? "Current Version"
                      : "Previous Version"}
                  </span>
                </div>
              )}

              {getCurrentRegenerationInstructions("encounter") && (
                <div className="mt-4 rounded-lg border border-cyan-800/50 bg-cyan-950/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                    Regeneration Instructions
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {getCurrentRegenerationInstructions("encounter")}
                  </p>
                </div>
              )}

              {generatedEncounterContent && (
                <div
                  className={`${generatedMarkdownClasses} rounded-2xl border border-slate-800/80 bg-slate-950/45 p-5 shadow-inner shadow-black/15 sm:p-7`}
                  data-testid="generated-encounter-content"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {cleanGeneratedMarkdown(generatedEncounterContent)}
                  </ReactMarkdown>
                </div>
              )}
            </section>
          )}

          {(locationError || generatedLocationContent) && (
            <section className="relative mb-5 overflow-hidden rounded-2xl border border-cyan-500/12 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.045),transparent_26%),linear-gradient(to_bottom,rgba(15,23,42,0.97),rgba(15,23,42,0.84))] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.20)] ring-1 ring-white/[0.02] backdrop-blur sm:p-6">
              <h3 className="text-2xl font-bold">Generated Locations</h3>
              {generatedLocationContent && (
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      handleVersionChange("location", -1, setGeneratedLocationContent)
                    }
                    disabled={
                      isAnyGenerationInProgress ||
                      currentVersionIndex.location <= 0
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950/65 px-4 py-2 font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    ← Previous
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      handleVersionChange("location", 1, setGeneratedLocationContent)
                    }
                    disabled={
                      isAnyGenerationInProgress ||
                      currentVersionIndex.location >=
                        generationHistory.location.length - 1
                    }
                    className="rounded-xl border border-slate-700 bg-slate-950/65 px-4 py-2 font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Next →
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenRegenerate("location")}
                    disabled={isAnyGenerationInProgress}
                    className="rounded-xl border border-violet-400/30 bg-gradient-to-r from-violet-500/25 to-fuchsia-500/15 px-4 py-2 font-semibold text-violet-100 transition hover:border-violet-400/50 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {generatingLocations ? "Regenerating..." : "Regenerate Locations"}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleOpenSaveWorkspace("location")}
                    disabled={isAnyGenerationInProgress || savingToWorkspace}
                    className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/15 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Save to Workspace
                  </button>
                </div>
              )}

              {locationError && (
                <div
                  className="mt-4 bg-red-950 border border-red-800 text-red-300 rounded-lg p-3"
                  role="alert"
                  data-testid="location-generate-error"
                >
                  <p>{locationError}</p>

                  <button
                    type="button"
                    onClick={() => handleGenerateLocations(false)}
                    disabled={isAnyGenerationInProgress}
                    className="mt-3 rounded-lg bg-red-800 px-4 py-2 font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Retry Locations
                  </button>
                </div>
              )}

              {generatedLocationContent && generationHistory.location.length > 0 && (
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <span className="rounded-lg bg-slate-800 px-3 py-1.5 text-slate-300">
                    Version {currentVersionIndex.location + 1} of {generationHistory.location.length}
                  </span>

                  <span
                    className={`rounded-lg border px-3 py-1.5 font-semibold ${
                      currentVersionIndex.location ===
                      generationHistory.location.length - 1
                        ? "border-emerald-800 bg-emerald-950 text-emerald-300"
                        : "border-slate-700 bg-slate-800 text-slate-400"
                    }`}
                  >
                    {currentVersionIndex.location ===
                    generationHistory.location.length - 1
                      ? "Current Version"
                      : "Previous Version"}
                  </span>
                </div>
              )}

              {getCurrentRegenerationInstructions("location") && (
                <div className="mt-4 rounded-lg border border-cyan-800/50 bg-cyan-950/20 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-cyan-400">
                    Regeneration Instructions
                  </p>
                  <p className="mt-2 text-sm text-slate-300">
                    {getCurrentRegenerationInstructions("location")}
                  </p>
                </div>
              )}

              {generatedLocationContent && (
                <div
                  className={`${generatedMarkdownClasses} rounded-2xl border border-slate-800/80 bg-slate-950/45 p-5 shadow-inner shadow-black/15 sm:p-7`}
                  data-testid="generated-location-content"
                >
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {cleanGeneratedMarkdown(generatedLocationContent)}
                  </ReactMarkdown>
                </div>
              )}
            </section>
          )}
        </>
      )}

      {activeTab === "image" && (
        <section className="relative mb-5 overflow-hidden rounded-2xl border border-fuchsia-500/15 bg-[radial-gradient(circle_at_top_left,rgba(217,70,239,0.055),transparent_25%),linear-gradient(to_bottom,rgba(15,23,42,0.98),rgba(15,23,42,0.84))] p-5 shadow-[0_26px_80px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.02] backdrop-blur sm:p-6">
          <div className="mb-5 flex items-start gap-3 border-b border-slate-800/70 pb-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-fuchsia-400/20 bg-gradient-to-br from-fuchsia-500/15 to-slate-900 text-xl text-fuchsia-300 shadow-[0_0_24px_rgba(217,70,239,0.08)]">
              ✧
            </div>

            <div>
              <h2 className="text-xl font-bold text-white">Image Generator</h2>
              <p className="mt-1 text-sm text-slate-400">
                Create visual assets for campaigns, NPCs, locations, encounters, items, maps, and scenes.
              </p>
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(320px,420px)]">
            <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5">
              <div className="mb-5">
                <label
                  htmlFor="tabletop-image-type"
                  className="block text-sm text-slate-300 mb-2"
                >
                  Image Type
                </label>

                <select
                  id="tabletop-image-type"
                  value={imageType}
                  onChange={(event) => {
                    setImageType(event.target.value);
                    setImageGenerateError("");
                    setImageGenerateSuccess("");
                  }}
                  disabled={generatingImage}
                  className="w-full rounded-xl border border-slate-700/90 bg-slate-950/70 px-4 py-3.5 text-white shadow-inner shadow-black/10 transition-all focus:border-fuchsia-400/70 focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-fuchsia-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {IMAGE_TYPES.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mb-5">
                <label
                  htmlFor="tabletop-image-prompt"
                  className="block text-sm text-slate-300 mb-2"
                >
                  Image Prompt
                </label>

                <textarea
                  id="tabletop-image-prompt"
                  value={imagePrompt}
                  onChange={(event) => {
                    setImagePrompt(event.target.value);
                    setImageGenerateError("");
                    setImageGenerateSuccess("");
                  }}
                  rows="7"
                  maxLength={1500}
                  disabled={generatingImage}
                  placeholder="Describe the image you want Tanio to create..."
                  className="w-full rounded-xl border border-slate-700/90 bg-slate-950/70 px-4 py-3.5 text-white shadow-inner shadow-black/10 transition-all placeholder:text-slate-600 focus:border-fuchsia-400/70 focus:bg-slate-950 focus:outline-none focus:ring-4 focus:ring-fuchsia-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                />

                <div className="mt-2 flex items-center justify-between gap-4 text-xs text-slate-500">
                  <span>Required</span>
                  <span>{imagePrompt.length}/1500</span>
                </div>
              </div>

              <label className="mb-5 flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950/70 p-4">
                <input
                  type="checkbox"
                  checked={useCampaignContextForImage}
                  onChange={(event) =>
                    setUseCampaignContextForImage(event.target.checked)
                  }
                  disabled={generatingImage}
                  className="mt-1 h-4 w-4 accent-fuchsia-500"
                />

                <span>
                  <span className="block font-semibold text-white">
                    Use campaign name and description as image context
                  </span>
                  <span className="mt-1 block text-sm text-slate-400">
                    This helps the image match the current campaign details when available.
                  </span>
                </span>
              </label>

              <button
                type="button"
                onClick={handleGenerateImage}
                disabled={generatingImage}
                className="rounded-xl border border-fuchsia-300/40 bg-gradient-to-r from-fuchsia-400 to-violet-400 px-5 py-3 font-bold text-slate-950 shadow-[0_12px_28px_rgba(217,70,239,0.14)] transition-all hover:-translate-y-0.5 hover:from-fuchsia-300 hover:to-violet-300 disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingImage ? "Generating Image..." : "Generate Image"}
              </button>

              {generatingImage && (
                <div
                  className="mt-4 flex items-center gap-3 text-sm text-fuchsia-300"
                  role="status"
                  aria-live="polite"
                >
                  <div
                    className="h-5 w-5 rounded-full border-2 border-slate-600 border-t-fuchsia-400 animate-spin"
                    aria-hidden="true"
                  />

                  <p>Tanio AI is generating your image. Please wait...</p>
                </div>
              )}

              {imageGenerateSuccess && (
                <p
                  className="mt-4 rounded-lg border border-emerald-800 bg-emerald-950 p-3 text-emerald-300"
                  role="status"
                  aria-live="polite"
                >
                  {imageGenerateSuccess}
                </p>
              )}

              {imageGenerateError && (
                <p
                  className="mt-4 rounded-lg border border-red-800 bg-red-950 p-3 text-red-300"
                  role="alert"
                >
                  {imageGenerateError}
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-slate-800/90 bg-slate-950/60 p-5">
              <p className="text-sm font-semibold uppercase tracking-wide text-fuchsia-300">
                Image Preview
              </p>

              {generatedImage ? (
                <div className="mt-4">
                  <img
                    src={`data:image/png;base64,${generatedImage}`}
                    alt="Generated tabletop asset"
                    className="w-full rounded-2xl border border-slate-800 bg-slate-950 object-cover"
                  />

                  <div className="mt-4 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() =>
                        handleDownloadImage(
                          generatedImage,
                          `${campaignName || "tabletop"}-${imageType || "image"}`
                        )
                      }
                      className="rounded-xl border border-slate-700 bg-slate-950/65 px-4 py-2 font-semibold text-slate-200 transition hover:border-slate-600 hover:text-white"
                    >
                      Download Image
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        handleOpenSaveImage({
                          imageBase64: generatedImage,
                          imageType,
                          imagePrompt: imagePrompt || "Generated tabletop image.",
                        })
                      }
                      className="rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2 font-semibold text-emerald-100 transition hover:border-emerald-400/50 hover:bg-emerald-500/15"
                    >
                      Save Image to Project
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-4 flex min-h-[320px] items-center justify-center rounded-2xl border border-dashed border-slate-700 bg-slate-950/50 p-6 text-center">
                  <div>
                    <p className="text-lg font-bold text-white">No image generated yet</p>
                    <p className="mt-2 text-sm leading-6 text-slate-400">
                      Choose an image type, write a prompt, and generate a visual asset.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      )}      

      {regenerateModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="tabletop-regenerate-title"
        >
          <div className="w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="tabletop-regenerate-title"
                  className="text-2xl font-bold text-white"
                >
                  Regenerate {CONTENT_LABELS[regenerateTarget] || "Content"}
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Tell the AI what you want changed in the new version. You can
                  also leave this blank for a general regeneration.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseRegenerate}
                disabled={isAnyGenerationInProgress}
                className="rounded-lg px-3 py-1.5 text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close regenerate dialog"
              >
                ×
              </button>
            </div>

            <div className="mt-6">
              <label
                htmlFor="tabletop-regenerate-instructions"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                What would you like to change?
              </label>

              <textarea
                id="tabletop-regenerate-instructions"
                value={regenerateInstructions}
                onChange={(event) => {
                  setRegenerateInstructions(event.target.value);
                  setRegenerateError("");
                }}
                rows="6"
                maxLength={1000}
                disabled={isAnyGenerationInProgress}
                placeholder="e.g. Make it shorter, add a darker tone, and keep the main characters the same."
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
                disabled={isAnyGenerationInProgress}
                className="rounded-lg bg-slate-700 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleConfirmRegenerate}
                disabled={isAnyGenerationInProgress}
                className="rounded-lg bg-cyan-500 px-5 py-2.5 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {isAnyGenerationInProgress ? "Regenerating..." : "Regenerate"}
              </button>
            </div>
          </div>
        </div>
      )}

      {saveImageOpen && saveImageTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="save-image-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="save-image-title" className="text-2xl font-bold text-white">
                  Save Image to Project
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Choose the project where this generated image should be saved.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseSaveImage}
                disabled={saveImageLoading}
                className="rounded-lg px-3 py-1.5 text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Close save image dialog"
              >
                ×
              </button>
            </div>

            <div className="mt-5">
              <label
                htmlFor="save-image-project"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Save to Project
              </label>

              <select
                id="save-image-project"
                value={saveImageProjectId}
                onChange={(event) => {
                  setSaveImageProjectId(event.target.value);
                  setSaveImageError("");
                }}
                disabled={saveImageLoading}
                className="w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white focus:border-violet-500 focus:outline-none disabled:opacity-50"
              >
                <option value="">Choose a project</option>

                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
            </div>

            {saveImageError && (
              <div className="mt-5 rounded-lg border border-red-800 bg-red-950/50 p-4">
                <p className="text-sm text-red-300">{saveImageError}</p>
              </div>
            )}

            <div className="mt-6 flex flex-wrap justify-end gap-3">
              <button
                type="button"
                onClick={handleCloseSaveImage}
                disabled={saveImageLoading}
                className="rounded-lg bg-slate-700 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleSaveImage}
                disabled={saveImageLoading || !saveImageProjectId}
                className="rounded-lg bg-violet-600 px-5 py-2.5 font-semibold text-white transition hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saveImageLoading ? "Saving..." : "Save Image"}
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
          aria-labelledby="tabletop-save-workspace-title"
        >
          <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2
                  id="tabletop-save-workspace-title"
                  className="text-2xl font-bold text-white"
                >
                  Save to Workspace
                </h2>
                <p className="mt-2 text-sm text-slate-400">
                  Save {contentToSave?.label || "this content"} to one of your workspace projects.
                </p>
              </div>

              <button
                type="button"
                onClick={handleCloseSaveWorkspace}
                disabled={savingToWorkspace}
                className="rounded-lg px-3 py-1.5 text-xl text-slate-400 transition hover:bg-slate-800 hover:text-white disabled:opacity-50"
                aria-label="Close save to workspace dialog"
              >
                ×
              </button>
            </div>

            {workspaceOptionsLoading ? (
              <div className="mt-6 flex items-center gap-3 text-slate-400">
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
                    htmlFor="tabletop-save-workspace"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Workspace
                  </label>
                  <select
                    id="tabletop-save-workspace"
                    value={selectedWorkspaceId}
                    onChange={(event) =>
                      handleWorkspaceSelection(event.target.value)
                    }
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
                    htmlFor="tabletop-save-project"
                    className="mb-2 block text-sm font-medium text-slate-300"
                  >
                    Project
                  </label>
                  <select
                    id="tabletop-save-project"
                    value={selectedSaveProjectId}
                    onChange={(event) => {
                      setSelectedSaveProjectId(event.target.value);
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
                className="rounded-lg bg-slate-700 px-5 py-2.5 font-semibold text-white transition hover:bg-slate-600 disabled:opacity-50"
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
    </main>
  );
}

export default TabletopCreator;