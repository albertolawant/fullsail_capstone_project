import { useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const CAMPAIGN_STORAGE_KEY = "tanioTabletopCampaigns";

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

const savedMarkdownClasses = `
  text-sm text-slate-300 mt-2 leading-relaxed
  [&_h1]:text-xl [&_h1]:font-bold [&_h1]:text-white [&_h1]:mt-4 [&_h1]:mb-2
  [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-white [&_h2]:mt-4 [&_h2]:mb-2
  [&_h3]:font-semibold [&_h3]:text-cyan-300 [&_h3]:mt-4 [&_h3]:mb-2
  [&_h4]:font-semibold [&_h4]:text-cyan-200 [&_h4]:mt-3 [&_h4]:mb-2
  [&_p]:my-2
  [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2
  [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2
  [&_li]:my-1
  [&_strong]:font-bold [&_strong]:text-white
  [&_em]:italic
  [&_hr]:border-slate-700 [&_hr]:my-4
`;

function TabletopCreator() {
  const [campaigns, setCampaigns] = useState([]);
  const [campaignName, setCampaignName] = useState("");
  const [campaignDescription, setCampaignDescription] = useState("");
  const [formError, setFormError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [generatedCampaignContent, setGeneratedCampaignContent] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generatedNPCContent, setGeneratedNPCContent] = useState("");
  const [generatingNPCs, setGeneratingNPCs] = useState(false);
  const [npcError, setNpcError] = useState("");
  const [savedNPCs, setSavedNPCs] = useState([]);

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
      status: "Coming Soon",
    },
    {
      title: "Quest Generator",
      description:
        "Build quests, side missions, encounters, rewards, and story complications.",
      status: "Coming Soon",
    },
    {
      title: "Saved Campaign Content",
      description:
        "View generated campaign notes, saved encounters, NPCs, locations, and story ideas.",
      status: "Coming Soon",
    },
  ];

  useEffect(() => {
    const savedCampaigns = localStorage.getItem(CAMPAIGN_STORAGE_KEY);

    if (savedCampaigns) {
      try {
        setCampaigns(JSON.parse(savedCampaigns));
      } catch {
        setCampaigns([]);
      }
    }
  }, []);

  const saveCampaigns = (updatedCampaigns) => {
    localStorage.setItem(
      CAMPAIGN_STORAGE_KEY,
      JSON.stringify(updatedCampaigns)
    );

    setCampaigns(updatedCampaigns);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setFormError("");
    setSuccessMessage("");

    const cleanedName = campaignName.trim();
    const cleanedDescription = campaignDescription.trim();

    if (!cleanedName) {
      setFormError("Campaign name is required.");
      return;
    }

    if (cleanedName.length > 100) {
      setFormError("Campaign name must be 100 characters or fewer.");
      return;
    }

    if (!cleanedDescription) {
      setFormError("Campaign description is required.");
      return;
    }

    if (cleanedDescription.length > 500) {
      setFormError("Campaign description must be 500 characters or fewer.");
      return;
    }

    const newCampaign = {
      id: crypto.randomUUID(),
      name: cleanedName,
      description: cleanedDescription,
      createdAt: new Date().toISOString(),
    };

    const updatedCampaigns = [newCampaign, ...campaigns];

    saveCampaigns(updatedCampaigns);

    setCampaignName("");
    setCampaignDescription("");
    setSuccessMessage("Campaign saved successfully.");
  };

  const handleGenerateCampaign = async () => {
    setGenerateError("");
    setGeneratedCampaignContent("");
    setGenerating(true);

    const cleanedName = campaignName.trim();
    const cleanedDescription = campaignDescription.trim();

    if (!cleanedName) {
      setGenerateError("Campaign name is required before generating content.");
      setGenerating(false);
      return;
    }

    if (!cleanedDescription) {
      setGenerateError(
        "Campaign description is required before generating content."
      );
      setGenerating(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://127.0.0.1:8000/tabletop-creator/generate-campaign",
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
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Unable to generate campaign content."
        );
      }

      const data = await response.json();
      setGeneratedCampaignContent(data.campaign_content);
    } catch (error) {
      setGenerateError(error.message);
    } finally {
      setGenerating(false);
    }
  };

  const handleGenerateNPCs = async () => {
    setNpcError("");
    setGeneratedNPCContent("");
    setGeneratingNPCs(true);

    const cleanedName = campaignName.trim();
    const cleanedDescription = campaignDescription.trim();

    if (!cleanedName) {
      setNpcError("Campaign name is required before generating NPCs.");
      setGeneratingNPCs(false);
      return;
    }

    if (!cleanedDescription) {
      setNpcError("Campaign description is required before generating NPCs.");
      setGeneratingNPCs(false);
      return;
    }

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        "http://127.0.0.1:8000/tabletop-creator/generate-npc",
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
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(errorData?.detail || "Unable to generate NPCs.");
      }

      const data = await response.json();
      setGeneratedNPCContent(data.npc_content);
    } catch (error) {
      setNpcError(error.message);
    } finally {
      setGeneratingNPCs(false);
    }
  };

  const handleSaveNPCs = () => {
    if (!generatedNPCContent) {
      setNpcError("Generate NPCs before saving.");
      return;
    }

    const savedNPCEntry = {
      id: crypto.randomUUID(),
      campaignName: campaignName.trim() || "Untitled Campaign",
      content: generatedNPCContent,
      createdAt: new Date().toISOString(),
    };

    setSavedNPCs((currentNPCs) => [savedNPCEntry, ...currentNPCs]);
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

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mt-6">
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
          onSubmit={handleSubmit}
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

          {formError && (
            <p
              className="mb-5 bg-red-950 border border-red-800 text-red-300 rounded-lg p-3"
              role="alert"
              data-testid="campaign-form-error"
            >
              {formError}
            </p>
          )}

          {successMessage && (
            <p
              className="mb-5 bg-green-950 border border-green-800 text-green-300 rounded-lg p-3"
              role="status"
              data-testid="campaign-form-success"
            >
              {successMessage}
            </p>
          )}

          <div className="flex flex-wrap gap-3">
            <button
              type="submit"
              className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-6 py-3 rounded-lg"
              data-testid="save-campaign"
            >
              Save Campaign
            </button>

            <button
              type="button"
              onClick={handleGenerateCampaign}
              disabled={generating}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50"
              data-testid="generate-campaign"
            >
              {generating ? "Generating..." : "Generate Campaign Content"}
            </button>

            <button
              type="button"
              onClick={handleGenerateNPCs}
              disabled={generatingNPCs}
              className="bg-slate-800 hover:bg-slate-700 text-white font-semibold px-6 py-3 rounded-lg disabled:opacity-50"
              data-testid="generate-npcs"
            >
              {generatingNPCs ? "Generating NPCs..." : "Generate NPCs"}
            </button>
          </div>
        </form>
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <h3 className="text-2xl font-bold">Generated Campaign Content</h3>

        {generateError && (
          <p
            className="mt-4 bg-red-950 border border-red-800 text-red-300 rounded-lg p-3"
            role="alert"
            data-testid="campaign-generate-error"
          >
            {generateError}
          </p>
        )}

        {generatedCampaignContent ? (
          <div
            className={generatedMarkdownClasses}
            data-testid="generated-campaign-content"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {generatedCampaignContent}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-slate-400 mt-2">
            Generated campaign content will appear here.
          </p>
        )}
      </section>

      <section className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-2xl font-bold">Generated NPCs</h3>

          <button
            type="button"
            onClick={handleSaveNPCs}
            disabled={!generatedNPCContent}
            className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            data-testid="save-npcs"
          >
            Save NPCs
          </button>
        </div>

        {npcError && (
          <p
            className="mt-4 bg-red-950 border border-red-800 text-red-300 rounded-lg p-3"
            role="alert"
            data-testid="npc-generate-error"
          >
            {npcError}
          </p>
        )}

        {generatedNPCContent ? (
          <div
            className={generatedMarkdownClasses}
            data-testid="generated-npc-content"
          >
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {generatedNPCContent}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-slate-400 mt-2">
            Generated NPC details will appear here.
          </p>
        )}
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold">Saved Campaigns</h3>

          {campaigns.length === 0 ? (
            <p className="text-slate-400 mt-2">
              Saved campaigns will appear here after users begin creating
              tabletop materials.
            </p>
          ) : (
            <div className="mt-4 space-y-3" data-testid="saved-campaign-list">
              {campaigns.map((campaign) => (
                <div
                  key={campaign.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-4"
                  data-testid={`saved-campaign-${campaign.id}`}
                >
                  <h4 className="font-semibold">{campaign.name}</h4>

                  <p className="text-sm text-slate-400 mt-1">
                    {campaign.description}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold">Saved NPCs</h3>

          {savedNPCs.length === 0 ? (
            <p className="text-slate-400 text-sm mt-2">
              Saved NPCs will appear here after generation.
            </p>
          ) : (
            <div className="mt-3 space-y-3" data-testid="saved-npc-list">
              {savedNPCs.map((npc) => (
                <div
                  key={npc.id}
                  className="bg-slate-950 border border-slate-800 rounded-lg p-4"
                  data-testid={`saved-npc-${npc.id}`}
                >
                  <p className="text-sm text-cyan-400">{npc.campaignName}</p>

                  <div className={savedMarkdownClasses}>
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {npc.content}
                    </ReactMarkdown>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
          <h3 className="text-xl font-bold">Module Status</h3>

          <p className="text-slate-400 mt-2">
            Tabletop Creator now includes campaign creation, campaign
            generation, and NPC generation for the proof-of-concept stage.
          </p>
        </div>
      </section>
    </main>
  );
}

export default TabletopCreator;