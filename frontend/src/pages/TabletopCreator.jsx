import { useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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

function TabletopCreator() {
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

  const activeRequestsRef = useRef(new Set());

  const isAnyGenerationInProgress =
    generating ||
    generatingNPCs ||
    generatingQuests ||
    generatingEncounters ||
    generatingLocations;

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

      const response = await fetch(
        `http://127.0.0.1:8000/tabletop-creator/${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            campaign_name: cleanedName,
            campaign_description: cleanedDescription,
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

  const handleGenerateCampaign = async (isRegeneration = false, suppressRelatedWarning = false) => {
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

  const handleGenerateNPCs = async (isRegeneration = false, suppressRelatedWarning = false) => {
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

  const handleGenerateQuests = async (isRegeneration = false, suppressRelatedWarning = false) => {
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

  const handleGenerateEncounters = async (isRegeneration = false, suppressRelatedWarning = false) => {
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

  const handleGenerateLocations = async (isRegeneration = false, suppressRelatedWarning = false) => {
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

  return (
    <main className="flex-1 p-10" data-testid="tabletop-creator-page">
      <div className="mb-8">
        <p className="text-cyan-400 font-semibold mb-2">Tanio AI Module</p>

        <h2 className="text-4xl font-bold">Tabletop Creator</h2>

        <p className="text-slate-400 mt-2 max-w-3xl">
          Build tabletop campaigns, generate story content, and organize
          campaign materials from one central workspace.
        </p>
      </div>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <h3 className="text-2xl font-bold">Campaign Creation Tools</h3>

        <p className="text-slate-400 mt-2">
          Select a tool below to begin building or organizing tabletop content.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mt-6">
          {tools.map((tool) => (
            <button
              key={tool.title}
              type="button"
              className="bg-slate-950 border border-slate-800 hover:border-cyan-500 rounded-xl p-5 text-left transition-all duration-200"
              data-testid={`tabletop-tool-${tool.title
                .toLowerCase()
                .replaceAll(" ", "-")}`}
            >
              <div className="flex items-start justify-between gap-3">
                <h4 className="text-lg font-semibold text-white">
                  {tool.title}
                </h4>

                <span className="text-xs text-cyan-400 bg-cyan-950/40 border border-cyan-900 rounded-full px-2 py-1">
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

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <h3 className="text-2xl font-bold">Create Campaign</h3>

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
              onChange={(event) => setCampaignName(event.target.value)}
              maxLength={100}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
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
              maxLength={500}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:border-cyan-500"
              data-testid="campaign-description"
            />
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => handleGenerateCampaign(false)}
              disabled={isAnyGenerationInProgress}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="generate-campaign"
            >
              {generating ? "Generating..." : "Generate Campaign Content"}
            </button>

            <button
              type="button"
              onClick={() => handleGenerateNPCs(false)}
              disabled={isAnyGenerationInProgress}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="generate-npcs"
            >
              {generatingNPCs ? "Generating NPCs..." : "Generate NPCs"}
            </button>

            <button
              type="button"
              onClick={() => handleGenerateQuests(false)}
              disabled={isAnyGenerationInProgress}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
              data-testid="generate-quests"
            >
              {generatingQuests ? "Generating Quests..." : "Generate Quests"}
            </button>

            <button
              type="button"
              onClick={() => handleGenerateEncounters(false)}
              disabled={isAnyGenerationInProgress}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
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
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg disabled:cursor-not-allowed disabled:opacity-50"
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

      {relatedContentWarning && (
        <section
          className="mb-8 rounded-xl border border-amber-700 bg-amber-950/30 p-6"
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
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
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
                className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next →
              </button>

              <button
                type="button"
                onClick={() => handleGenerateCampaign(true)}
                disabled={isAnyGenerationInProgress}
                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generating ? "Regenerating..." : "Regenerate Campaign"}
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

          {generatedCampaignContent && (
            <div
              className={generatedMarkdownClasses}
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
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
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
                className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next →
              </button>

              <button
                type="button"
                onClick={() => handleGenerateNPCs(true)}
                disabled={isAnyGenerationInProgress}
                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingNPCs ? "Regenerating..." : "Regenerate NPCs"}
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

          {generatedNPCContent && (
            <div
              className={generatedMarkdownClasses}
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
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
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
                className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next →
              </button>

              <button
                type="button"
                onClick={() => handleGenerateQuests(true)}
                disabled={isAnyGenerationInProgress}
                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingQuests ? "Regenerating..." : "Regenerate Quests"}
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

          {generatedQuestContent && (
            <div
              className={generatedMarkdownClasses}
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
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
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
                className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next →
              </button>

              <button
                type="button"
                onClick={() => handleGenerateEncounters(true)}
                disabled={isAnyGenerationInProgress}
                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingEncounters ? "Regenerating..." : "Regenerate Encounters"}
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

          {generatedEncounterContent && (
            <div
              className={generatedMarkdownClasses}
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
        <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
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
                className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                className="rounded-lg bg-slate-700 px-4 py-2 font-semibold text-white transition hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next →
              </button>

              <button
                type="button"
                onClick={() => handleGenerateLocations(true)}
                disabled={isAnyGenerationInProgress}
                className="rounded-lg bg-cyan-500 px-4 py-2 font-semibold text-slate-950 transition hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {generatingLocations ? "Regenerating..." : "Regenerate Locations"}
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

          {generatedLocationContent && (
            <div
              className={generatedMarkdownClasses}
              data-testid="generated-location-content"
            >
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {cleanGeneratedMarkdown(generatedLocationContent)}
              </ReactMarkdown>
            </div>
          )}
        </section>
      )}


    </main>
  );
}

export default TabletopCreator;