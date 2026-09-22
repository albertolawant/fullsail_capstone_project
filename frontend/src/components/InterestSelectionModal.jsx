import { useEffect, useState } from "react";

const MODULES = [
  {
    id: "product-architect",
    name: "Product Architect",
    description:
      "Turn product ideas into features, personas, roadmaps, and technical plans.",
    icon: "◈",
  },
  {
    id: "tabletop-creator",
    name: "Tabletop Creator",
    description:
      "Create characters, quests, encounters, locations, and tabletop worlds.",
    icon: "✦",
  },
  {
    id: "problem-solver",
    name: "Problem Solver",
    description:
      "Break down complex problems and generate practical, organized solutions.",
    icon: "◎",
  },
];

function InterestSelectionModal({ onComplete }) {
  const [selectedModules, setSelectedModules] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  const toggleModule = (moduleId) => {
    setError("");

    setSelectedModules((currentModules) => {
      if (currentModules.includes(moduleId)) {
        return currentModules.filter(
          (selectedId) => selectedId !== moduleId
        );
      }

      return [...currentModules, moduleId];
    });
  };

  const handleContinue = async () => {
    if (selectedModules.length === 0) {
      setError("Select at least one module to continue.");
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await fetch(
        "http://127.0.0.1:8000/auth/me/interests",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            selected_modules: selectedModules,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response
          .json()
          .catch(() => null);

        throw new Error(
          errorData?.detail ||
            "Unable to save your selections."
        );
      }

      const data = await response.json();

      localStorage.setItem(
        "tanioSelectedModules",
        JSON.stringify(data.selected_modules)
      );

      onComplete();
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save your selections."
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/85 p-4 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interest-modal-title"
    >
      <div className="my-auto w-full max-w-4xl rounded-2xl border border-slate-700 bg-[#07142F] p-5 shadow-2xl sm:p-8">
        <div className="mx-auto max-w-2xl text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-2xl text-cyan-400">
            ✦
          </div>

          <h1
            id="interest-modal-title"
            className="text-2xl font-bold text-white sm:text-3xl"
          >
            What are you interested in?
          </h1>

          <p className="mt-3 text-sm leading-6 text-slate-400 sm:text-base">
            Select one or more Tanio AI modules. You can
            choose everything that fits the way you work.
          </p>
        </div>

        <div className="mt-7 grid grid-cols-1 gap-4 md:grid-cols-3">
          {MODULES.map((module) => {
            const isSelected = selectedModules.includes(
              module.id
            );

            return (
              <button
                key={module.id}
                type="button"
                onClick={() => toggleModule(module.id)}
                aria-pressed={isSelected}
                className={`relative min-h-52 rounded-xl border p-5 text-left transition-all duration-200 ${
                  isSelected
                    ? "border-cyan-400 bg-cyan-400/10 shadow-lg shadow-cyan-950/30"
                    : "border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-900"
                }`}
              >
                <span
                  className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border text-sm ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-400 text-slate-950"
                      : "border-slate-600 text-transparent"
                  }`}
                  aria-hidden="true"
                >
                  ✓
                </span>

                <span
                  className={`flex h-11 w-11 items-center justify-center rounded-lg text-xl ${
                    isSelected
                      ? "bg-cyan-400/20 text-cyan-300"
                      : "bg-slate-800 text-slate-300"
                  }`}
                  aria-hidden="true"
                >
                  {module.icon}
                </span>

                <h2 className="mt-5 pr-7 text-lg font-semibold text-white">
                  {module.name}
                </h2>

                <p className="mt-2 text-sm leading-6 text-slate-400">
                  {module.description}
                </p>
              </button>
            );
          })}
        </div>

        <div className="mt-6 min-h-6 text-center">
          {error && (
            <p
              className="text-sm text-red-300"
              role="alert"
            >
              {error}
            </p>
          )}
        </div>

        <div className="mt-2 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-6 sm:flex-row">
          <p className="text-sm text-slate-400">
            {selectedModules.length === 0
              ? "No modules selected"
              : `${selectedModules.length} ${
                  selectedModules.length === 1
                    ? "module"
                    : "modules"
                } selected`}
          </p>

          <button
            type="button"
            onClick={handleContinue}
            disabled={
              selectedModules.length === 0 || saving
            }
            className="w-full rounded-lg bg-cyan-500 px-7 py-3 font-semibold text-slate-950 transition-colors hover:bg-cyan-400 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InterestSelectionModal;