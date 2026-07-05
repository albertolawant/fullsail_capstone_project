import { useEffect, useState } from "react";

function ProductArchitect() {
  const [projectId, setProjectId] = useState(1);
  const [projectName, setProjectName] = useState("Tanio AI");
  const [description, setDescription] = useState(
    "An AI-powered workspace platform with modules for project planning and content creation."
  );
  const [contentType, setContentType] = useState("prd");
  const [generatedContent, setGeneratedContent] = useState("");
  const [recentContent, setRecentContent] = useState([]);
  const [loading, setLoading] = useState(false);
  const [recentLoading, setRecentLoading] = useState(false);
  const [error, setError] = useState("");

  const endpointMap = {
    prd: "/product-architect/prd",
    persona: "/product-architect/persona",
    userStories: "/product-architect/user-stories",
    featureList: "/product-architect/feature-list",
  };

  const fetchRecentContent = async () => {
    try {
      setRecentLoading(true);
      const token = localStorage.getItem("token");

      const response = await fetch("http://127.0.0.1:8000/content/", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch recent content.");
      }

      const data = await response.json();
      setRecentContent(data);
    } catch (err) {
      console.error(err);
    } finally {
      setRecentLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentContent();
  }, []);

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
      await fetchRecentContent();
    } catch (err) {
      setError(
        "Something went wrong. Make sure you are logged in and the backend is running."
      );
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

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold mb-4">Generated Output</h2>

        {generatedContent ? (
          <pre className="whitespace-pre-wrap text-slate-200 leading-relaxed">
            {generatedContent}
          </pre>
        ) : (
          <p className="text-slate-500">Generated content will appear here.</p>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">Recent Generated Content</h2>

        {recentLoading ? (
          <p className="text-slate-500">Loading recent content...</p>
        ) : recentContent.length > 0 ? (
          <div className="space-y-4">
            {recentContent.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="bg-slate-950 border border-slate-800 rounded-lg p-4"
              >
                <div className="flex justify-between gap-4 mb-2">
                  <h3 className="font-semibold text-cyan-400">{item.title}</h3>
                  <span className="text-xs text-slate-500">
                    {item.content_type}
                  </span>
                </div>

                <p className="text-sm text-slate-400 line-clamp-3">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-slate-500">No recent content yet.</p>
        )}
      </div>
    </div>
  );
}

export default ProductArchitect;