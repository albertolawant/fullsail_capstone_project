import { useState } from "react";
import { useLocation } from "react-router-dom";
import { addRecentActivity } from "../utils/activityStorage";

function ProductArchitect() {
  const location = useLocation();
  const selectedProject = location.state?.project;

  const [projectId, setProjectId] = useState(selectedProject?.id || 1);

  const [projectName, setProjectName] = useState(
    selectedProject?.title || "Tanio AI"
  );

  const [description, setDescription] = useState(
    selectedProject?.description ||
      "An AI-powered workspace platform with modules for project planning and content creation."
  );

  const [contentType, setContentType] = useState("prd");
  const [generatedContent, setGeneratedContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const endpointMap = {
    prd: "/product-architect/prd",
    persona: "/product-architect/persona",
    userStories: "/product-architect/user-stories",
    featureList: "/product-architect/feature-list",
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError("");
    setGeneratedContent("");

    try {
      const token = localStorage.getItem("token");

      const response = await fetch(
        `http://127.0.0.1:8000${endpointMap[contentType]}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            project_id: Number(projectId),
            project_name: projectName,
            description,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to generate content.");
      }

      const data = await response.json();
      setGeneratedContent(data.body);
      addRecentActivity({
        type: "Content Generated",
        title: `${projectName} content generated`,
        description: `Created a new ${contentType} document.`,
        projectName,
      });
    } catch (err) {
      setError("Something went wrong. Make sure you are logged in and the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 text-white">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Product Architect</h1>
        <p className="text-slate-400 mt-2">
          Generate project planning documents with AI.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Project ID
            </label>
            <input
              type="number"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
            />
          </div>

          <div>
            <label className="block text-sm text-slate-400 mb-2">
              Project Name
            </label>
            <input
              value={projectName}
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
            />
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-slate-400 mb-2">
            Project Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows="4"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
          />
        </div>

        <div className="mb-6">
          <label className="block text-sm text-slate-400 mb-2">
            Document Type
          </label>
          <select
            value={contentType}
            onChange={(e) => setContentType(e.target.value)}
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
          >
            <option value="prd">Product Requirements Document</option>
            <option value="persona">User Persona</option>
            <option value="userStories">User Stories</option>
            <option value="featureList">Feature List</option>
          </select>
        </div>

        <button
          onClick={handleGenerate}
          disabled={loading}
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-6 py-3 rounded-lg disabled:opacity-50"
        >
          {loading ? "Generating..." : "Generate Content"}
        </button>

        {error && <p className="text-red-400 mt-4">{error}</p>}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Generated Output</h2>

        {generatedContent ? (
          <pre className="whitespace-pre-wrap text-slate-200 leading-relaxed">
            {generatedContent}
          </pre>
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