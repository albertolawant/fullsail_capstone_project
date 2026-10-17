import { useEffect, useRef, useState } from "react";

const SELECTED_MODULES_KEY = "tanioSelectedModules";

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
  {
    id: "learning-studio",
    name: "Learning Studio",
    description:
      "Explore topics through AI-generated lessons, flashcards, and quizzes.",
    icon: "🎓",
  },
];

const VALID_MODULE_IDS = MODULES.map((module) => module.id);

function getStoredModules() {
  try {
    const storedModules = JSON.parse(
      localStorage.getItem(SELECTED_MODULES_KEY) || "[]"
    );

    if (!Array.isArray(storedModules)) {
      return [];
    }

    return storedModules.filter((moduleId) =>
      VALID_MODULE_IDS.includes(moduleId)
    );
  } catch {
    return [];
  }
}

function InterestSelectionModal({ onComplete }) {
  const [selectedModules, setSelectedModules] =
    useState(getStoredModules);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const dialogRef = useRef(null);
  const titleRef = useRef(null);
  const savingRef = useRef(false);

  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement;

    document.body.style.overflow = "hidden";
    titleRef.current?.focus({ preventScroll: true });

    const handleKeyDown = (event) => {
      if (event.key !== "Tab") {
        return;
      }

      const dialog = dialogRef.current;

      if (!dialog) {
        return;
      }

      const controls = Array.from(
        dialog.querySelectorAll(
          'button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]'
        )
      ).filter((element) => element.getClientRects().length > 0);

      if (controls.length === 0) {
        event.preventDefault();
        titleRef.current?.focus({ preventScroll: true });
        return;
      }

      const first = controls[0];
      const last = controls[controls.length - 1];
      const focused = document.activeElement;
      const focusIsOnControl = controls.includes(focused);

      if (event.shiftKey && (focused === first || !focusIsOnControl)) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (focused === last || !focusIsOnControl)
      ) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener("keydown", handleKeyDown);

      if (
        previousFocus instanceof HTMLElement &&
        previousFocus.isConnected
      ) {
        previousFocus.focus({ preventScroll: true });
      }
    };
  }, []);

  const toggleModule = (moduleId) => {
    if (savingRef.current) {
      return;
    }

    setError("");

    setSelectedModules((currentModules) =>
      currentModules.includes(moduleId)
        ? currentModules.filter(
            (selectedId) => selectedId !== moduleId
          )
        : [...currentModules, moduleId]
    );
  };

  const saveModules = async (modulesToSave) => {
    if (savingRef.current) {
      return;
    }

    const token = localStorage.getItem("token");

    if (!token) {
      setError("Your session has expired. Please sign in again.");
      return;
    }

    const validModulesToSave = [
      ...new Set(
        modulesToSave.filter((moduleId) =>
          VALID_MODULE_IDS.includes(moduleId)
        )
      ),
    ];

    if (validModulesToSave.length === 0) {
      setError("Select at least one module to continue.");
      return;
    }

    savingRef.current = true;
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
            selected_modules: validModulesToSave,
          }),
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        let message = "Unable to save your selections.";

        if (typeof errorData?.detail === "string") {
          message = errorData.detail;
        } else if (Array.isArray(errorData?.detail)) {
          message =
            errorData.detail
              .map((item) => item.msg)
              .filter(Boolean)
              .join(" ") || message;
        }

        throw new Error(message);
      }

      const data = await response.json();

      const savedModules = Array.isArray(data.selected_modules)
        ? data.selected_modules.filter((moduleId) =>
            VALID_MODULE_IDS.includes(moduleId)
          )
        : validModulesToSave;

      if (savedModules.length === 0) {
        throw new Error(
          "No enabled modules were returned. Please try again."
        );
      }

      localStorage.setItem(
        SELECTED_MODULES_KEY,
        JSON.stringify(savedModules)
      );

      onComplete(savedModules);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Unable to save your selections."
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const handleContinue = () => {
    saveModules(selectedModules);
  };

  const handleShowEverything = () => {
    if (savingRef.current) {
      return;
    }

    setSelectedModules([...VALID_MODULE_IDS]);
    saveModules(VALID_MODULE_IDS);
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="interest-modal-title"
      aria-describedby="interest-modal-description"
    >
      <div
        ref={dialogRef}
        className="max-h-[90dvh] w-full min-w-0 max-w-4xl overflow-y-auto rounded-3xl border border-slate-700 bg-slate-900 p-5 text-white shadow-2xl sm:p-8"
      >
        <div className="mx-auto max-w-2xl text-center">
          <div
            aria-hidden="true"
            className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-2xl text-cyan-400"
          >
            ✦
          </div>

          <h1
            ref={titleRef}
            id="interest-modal-title"
            tabIndex={-1}
            className="text-2xl font-bold tracking-tight text-white focus:outline-none sm:text-3xl"
          >
            What are you interested in?
          </h1>

          <p
            id="interest-modal-description"
            className="mt-3 text-sm leading-6 text-slate-400 sm:text-base"
          >
            Select one or more Tanio AI modules, or choose Show Me
            Everything to enable them all.
          </p>
        </div>

        <div className="mt-7 grid min-w-0 grid-cols-1 gap-4 md:grid-cols-2">
          {MODULES.map((module) => {
            const isSelected = selectedModules.includes(module.id);

            return (
              <button
                key={module.id}
                type="button"
                onClick={() => toggleModule(module.id)}
                disabled={saving}
                aria-pressed={isSelected}
                aria-labelledby={`interest-${module.id}-title`}
                aria-describedby={`interest-${module.id}-description`}
                className={`relative flex min-w-0 flex-col rounded-2xl border p-5 text-left transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-slate-700 bg-slate-950 hover:border-cyan-500"
                }`}
              >
                <span
                  className={`absolute right-4 top-4 flex h-6 w-6 items-center justify-center rounded-full border text-sm ${
                    isSelected
                      ? "border-cyan-400 bg-cyan-400 text-slate-950"
                      : "border-slate-500"
                  }`}
                  aria-hidden="true"
                >
                  {isSelected ? "✓" : null}
                </span>

                <span
                  className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl ${
                    isSelected
                      ? "bg-cyan-400/20 text-cyan-300"
                      : "bg-slate-800 text-slate-300"
                  }`}
                  aria-hidden="true"
                >
                  {module.icon}
                </span>

                <span
                  id={`interest-${module.id}-title`}
                  className="mt-4 block break-words pr-3 text-lg font-semibold text-white"
                >
                  {module.name}
                </span>

                <span
                  id={`interest-${module.id}-description`}
                  className="mt-2 block break-words text-sm leading-6 text-slate-400"
                >
                  {module.description}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={handleShowEverything}
          disabled={saving}
          className="mt-6 w-full rounded-2xl border border-cyan-400/50 bg-cyan-400/10 px-5 py-4 text-left transition hover:border-cyan-400 hover:bg-cyan-400/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 disabled:cursor-not-allowed disabled:opacity-50 sm:text-center"
        >
          <span className="block font-semibold text-cyan-300">
            Show Me Everything
          </span>

          <span className="mt-1 block text-sm leading-6 text-slate-400">
            Enable Product Architect, Tabletop Creator, Problem Solver,
            and Learning Studio.
          </span>
        </button>

        {error && (
          <p
            className="mt-5 rounded-xl border border-red-800 bg-red-950 p-4 text-sm leading-6 text-red-300"
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-6 flex flex-col items-center justify-between gap-4 border-t border-slate-800 pt-5 sm:flex-row">
          <p
            role="status"
            aria-live="polite"
            aria-atomic="true"
            className="text-sm text-slate-400"
          >
            {saving
              ? "Saving your module selections..."
              : selectedModules.length === 0
                ? "No modules selected"
                : `${selectedModules.length} ${
                    selectedModules.length === 1 ? "module" : "modules"
                  } selected`}
          </p>

          <button
            type="button"
            onClick={handleContinue}
            disabled={selectedModules.length === 0 || saving}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 px-7 py-3 font-semibold text-slate-950 transition hover:bg-cyan-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 disabled:cursor-not-allowed disabled:opacity-40 sm:w-auto"
          >
            {saving && (
              <span
                aria-hidden="true"
                className="h-4 w-4 animate-spin rounded-full border-2 border-slate-950/30 border-t-slate-950"
              />
            )}

            {saving ? "Saving..." : "Continue"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default InterestSelectionModal;