import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
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

  const documentTypeLabels = {
    prd: "Product Requirements Document",
    persona: "User Persona",
    userStories: "User Stories",
    featureList: "Feature List",
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

  const recentMarkdownComponents = {
    h1: ({ children }) => (
      <span className="font-semibold text-slate-300">{children} </span>
    ),
    h2: ({ children }) => (
      <span className="font-semibold text-slate-300">{children} </span>
    ),
    h3: ({ children }) => (
      <span className="font-semibold text-slate-300">{children} </span>
    ),
    p: ({ children }) => <span>{children} </span>,
    ul: ({ children }) => <span>{children} </span>,
    ol: ({ children }) => <span>{children} </span>,
    li: ({ children }) => <span>{children} </span>,
    strong: ({ children }) => (
      <strong className="font-semibold text-slate-300">{children}</strong>
    ),
    hr: () => <span>— </span>,
  };

  const fetchRecentContent = async () => {
    try {
      setRecentLoading(true);

      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Authentication token not found.");
      }

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
      console.error("Recent content error:", err);
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

      if (!token) {
        throw new Error("Authentication token not found.");
      }

      const endpoint = endpointMap[contentType];

      if (!endpoint) {
        throw new Error("Invalid document type.");
      }

      const response = await fetch(`http://127.0.0.1:8000${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          project_id: Number(projectId),
          project_name: projectName.trim(),
          description: description.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);

        throw new Error(
          errorData?.detail || "Failed to generate content."
        );
      }

      const data = await response.json();

      setGeneratedContent(data.body || "");

      addRecentActivity({
        type: "Content Generated",
        title: `${projectName.trim()} content generated`,
        description: `Created a new ${
          documentTypeLabels[contentType] || contentType
        }.`,
        projectName: projectName.trim(),
      });

      await fetchRecentContent();
    } catch (err) {
      console.error("Generation error:", err);

      setError(
        err.message ||
          "Something went wrong. Make sure you are logged in and the backend is running."
      );
    } finally {
      setLoading(false);
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label
              htmlFor="project-id"
              className="block text-sm text-slate-400 mb-2"
            >
              Project ID
            </label>

            <input
              id="project-id"
              type="number"
              min="1"
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
            />
          </div>

          <div>
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
              onChange={(e) => setProjectName(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
            />
          </div>
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
            onChange={(e) => setDescription(e.target.value)}
            rows="4"
            className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white"
          />
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
          type="button"
          onClick={handleGenerate}
          disabled={
            loading ||
            !projectId ||
            !projectName.trim() ||
            !description.trim()
          }
          className="bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-semibold px-6 py-3 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Generating..." : "Generate Content"}
        </button>

        {error && (
          <p className="text-red-400 mt-4" role="alert">
            {error}
          </p>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mb-8">
        <h2 className="text-xl font-bold mb-6">Generated Output</h2>

        {generatedContent ? (
          <div className="max-w-none">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={markdownComponents}
            >
              {generatedContent}
            </ReactMarkdown>
          </div>
        ) : (
          <p className="text-slate-500">
            Generated content will appear here.
          </p>
        )}
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <h2 className="text-xl font-bold mb-4">
          Recent Generated Content
        </h2>

        {recentLoading ? (
          <p className="text-slate-500">Loading recent content...</p>
        ) : recentContent.length > 0 ? (
          <div className="space-y-4">
            {recentContent.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="bg-slate-950 border border-slate-800 rounded-lg p-4"
              >
                <div className="flex justify-between items-start gap-4 mb-2">
                  <h3 className="font-semibold text-cyan-400">
                    {item.title}
                  </h3>

                  <span className="text-xs text-slate-500 shrink-0">
                    {item.content_type}
                  </span>
                </div>

                <div className="text-sm text-slate-400 leading-relaxed line-clamp-3 overflow-hidden">
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    components={recentMarkdownComponents}
                  >
                    {item.body}
                  </ReactMarkdown>
                </div>
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