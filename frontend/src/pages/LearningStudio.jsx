import { useEffect, useRef, useState } from "react";

const GENERATION_ENDPOINT =
  "http://127.0.0.1:8000/learning-studio/generate";
const GENERATION_TIMEOUT_MS = 45000;

const EXPERIENCE_LEVELS = [
  { value: "beginner", label: "Beginner" },
  { value: "intermediate", label: "Intermediate" },
  { value: "advanced", label: "Advanced" },
];

const OUTPUT_TYPES = [
  {
    value: "lesson",
    label: "Lesson",
    icon: "▤",
    description:
      "Learn through clear explanations, examples, and structured sections.",
    available: true,
  },
  {
    value: "flashcards",
    label: "Flashcards",
    icon: "◇",
    description:
      "Review important terms and concepts with question and answer cards.",
    available: false,
  },
  {
    value: "quiz",
    label: "Quiz",
    icon: "✓",
    description:
      "Check your understanding with practice questions about your topic.",
    available: false,
  },
];

function isNonEmptyText(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidLessonResponse(data, request) {
  const content = data?.content;

  return (
    data?.output_type === "lesson" &&
    data.topic === request.topic &&
    data.learning_goal === request.learning_goal &&
    data.experience_level === request.experience_level &&
    isNonEmptyText(content?.title) &&
    isNonEmptyText(content?.introduction) &&
    isNonEmptyText(content?.summary) &&
    Array.isArray(content?.learning_objectives) &&
    content.learning_objectives.length > 0 &&
    content.learning_objectives.every(isNonEmptyText) &&
    Array.isArray(content?.sections) &&
    content.sections.length > 0 &&
    content.sections.every(
      (section) =>
        isNonEmptyText(section?.heading) &&
        isNonEmptyText(section?.explanation) &&
        Array.isArray(section?.examples) &&
        section.examples.length > 0 &&
        section.examples.every(
          (example) =>
            isNonEmptyText(example?.title) &&
            isNonEmptyText(example?.example) &&
            isNonEmptyText(example?.explanation)
        )
    )
  );
}

function getRequestErrorMessage(status, data) {
  if (status === 401) {
    return "Your session has expired. Please sign in again.";
  }

  if (status === 403) {
    return "You are not authorized to generate this study material.";
  }

  if (typeof data?.detail === "string") {
    return data.detail;
  }

  if (status === 422) {
    return "Please check your topic, learning goal, and experience level.";
  }

  if (status === 429) {
    return "Too many generation requests. Please wait a moment and retry.";
  }

  if (status === 503) {
    return "The AI service is temporarily unavailable. Please retry shortly.";
  }

  if (status === 504) {
    return "Lesson generation took too long. Please retry.";
  }

  return "Your lesson could not be generated. Please retry.";
}

function LessonView({ lesson }) {
  return (
    <article className="mt-6 min-w-0 space-y-6">
      <header>
        <h3 className="break-words text-2xl font-bold text-white sm:text-3xl">
          {lesson.title}
        </h3>
        <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-slate-300">
          {lesson.introduction}
        </p>
      </header>

      <section className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-5">
        <h4 className="text-lg font-semibold text-cyan-200">
          Learning Objectives
        </h4>
        <ul className="mt-3 list-disc space-y-2 pl-5 text-slate-300">
          {lesson.learning_objectives.map((objective, index) => (
            <li key={index} className="break-words leading-7">
              {objective}
            </li>
          ))}
        </ul>
      </section>

      {lesson.sections.map((section, sectionIndex) => (
        <section
          key={sectionIndex}
          className="min-w-0 rounded-xl border border-slate-700 bg-slate-900/60 p-5"
        >
          <h4 className="break-words text-xl font-bold text-cyan-200">
            {section.heading}
          </h4>
          <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-300">
            {section.explanation}
          </p>

          <div className="mt-5 space-y-4">
            {section.examples.map((example, exampleIndex) => (
              <div
                key={exampleIndex}
                className="min-w-0 rounded-xl border border-slate-800 bg-slate-950/70 p-4"
              >
                <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
                  Example {exampleIndex + 1}
                </p>
                <h5 className="mt-2 break-words font-semibold text-white">
                  {example.title}
                </h5>

                <pre className="mt-3 overflow-x-auto rounded-lg border border-slate-800 bg-slate-950 p-4 text-sm leading-6 text-cyan-100">
                  <code>{example.example}</code>
                </pre>

                <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300">
                  {example.explanation}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5">
        <h4 className="text-lg font-semibold text-emerald-200">Summary</h4>
        <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-300">
          {lesson.summary}
        </p>
      </section>
    </article>
  );
}

function LearningStudio() {
  const [topic, setTopic] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [outputType, setOutputType] = useState("lesson");
  const [topicError, setTopicError] = useState("");
  const [generationError, setGenerationError] = useState("");
  const [loading, setLoading] = useState(false);
  const [generatedResult, setGeneratedResult] = useState(null);
  const [lastRequest, setLastRequest] = useState(null);
  const [statusMessage, setStatusMessage] = useState("");

  const topicRef = useRef(null);
  const requestControllerRef = useRef(null);

  useEffect(() => {
    return () => {
      requestControllerRef.current?.abort();
    };
  }, []);

  const fieldClassName =
    "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:cursor-not-allowed disabled:opacity-60";

  const buttonClassName =
    "rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";

  const clearFeedback = () => {
    setGenerationError("");
    setStatusMessage("");
  };

  const generateLesson = async (request) => {
    // The ref prevents duplicate requests before React updates loading.
    if (requestControllerRef.current) {
      return;
    }

    const controller = new AbortController();
    requestControllerRef.current = controller;

    setLoading(true);
    setGenerationError("");
    setStatusMessage("");
    setLastRequest(request);

    let timedOut = false;

    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, GENERATION_TIMEOUT_MS);

    try {
      const token = localStorage.getItem("token");

      if (!token) {
        throw new Error("Your session has expired. Please sign in again.");
      }

      const response = await fetch(GENERATION_ENDPOINT, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(getRequestErrorMessage(response.status, data));
      }

      if (!isValidLessonResponse(data, request)) {
        throw new Error(
          "The AI returned an incomplete lesson. Please retry generation."
        );
      }

      if (controller.signal.aborted) {
        return;
      }

      // Replace the displayed lesson only after a valid result arrives.
      setGeneratedResult(data);
      setStatusMessage("Your lesson is ready.");
    } catch (error) {
      if (controller.signal.aborted && !timedOut) {
        return;
      }

      if (timedOut) {
        setGenerationError(
          "Lesson generation took too long. Your inputs are saved below. Please retry."
        );
      } else if (error instanceof TypeError) {
        setGenerationError(
          "Could not connect to the server. Make sure your backend is running, then retry."
        );
      } else {
        setGenerationError(
          error instanceof Error
            ? error.message
            : "Something went wrong while generating your lesson."
        );
      }
    } finally {
      window.clearTimeout(timeoutId);

      if (requestControllerRef.current === controller) {
        requestControllerRef.current = null;

        if (!controller.signal.aborted || timedOut) {
          setLoading(false);
        }
      }
    }
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (requestControllerRef.current) {
      return;
    }

    const cleanedTopic = topic.trim();
    const cleanedGoal = learningGoal.trim();

    clearFeedback();

    if (!cleanedTopic || cleanedTopic.length > 200) {
      setTopicError("Enter a topic between 1 and 200 characters.");
      topicRef.current?.focus();
      return;
    }

    if (cleanedGoal.length > 1000) {
      setGenerationError(
        "Your learning goal must be 1,000 characters or fewer."
      );
      return;
    }

    if (outputType !== "lesson") {
      setGenerationError("Choose Lesson to generate study material.");
      return;
    }

    setTopicError("");

    generateLesson({
      topic: cleanedTopic,
      learning_goal: cleanedGoal,
      experience_level: experienceLevel,
      output_type: "lesson",
    });
  };

  const handleRetry = () => {
    if (lastRequest) {
      generateLesson(lastRequest);
    }
  };

  const handleRegenerate = () => {
    if (!generatedResult) {
      return;
    }

    generateLesson({
      topic: generatedResult.topic,
      learning_goal: generatedResult.learning_goal,
      experience_level: generatedResult.experience_level,
      output_type: "lesson",
    });
  };

  const handleReset = () => {
    if (requestControllerRef.current) {
      return;
    }

    setTopic("");
    setLearningGoal("");
    setExperienceLevel("beginner");
    setOutputType("lesson");
    setTopicError("");
    setGenerationError("");
    setGeneratedResult(null);
    setLastRequest(null);
    setStatusMessage("");
    topicRef.current?.focus();
  };

  return (
    <main className="min-h-screen w-full bg-slate-950 p-5 text-white sm:p-8">
      <section className="rounded-2xl border border-cyan-500/20 bg-slate-900 p-6 shadow-xl sm:p-8">
        <div className="flex items-center gap-4">
          <div
            className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-cyan-400/30 bg-cyan-400/10 text-3xl"
            aria-hidden="true"
          >
            🎓
          </div>

          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-cyan-300">
              Tanio AI
            </p>
            <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
              Learning Studio
            </h1>
          </div>
        </div>

        <p className="mt-5 max-w-2xl leading-relaxed text-slate-400">
          Choose a topic, set your learning goal, and generate a lesson
          tailored to your experience level.
        </p>

        <div className="mt-8 grid items-start gap-6 xl:grid-cols-2">
          <form
            onSubmit={handleSubmit}
            noValidate
            aria-labelledby="learning-form-title"
            className="min-w-0 rounded-2xl border border-slate-700 bg-slate-950/40 p-5 sm:p-6"
          >
            <h2
              id="learning-form-title"
              className="text-xl font-bold text-white"
            >
              Set Up Your Study Material
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Start with what you want to learn. Your learning goal is optional.
            </p>

            <div className="mt-6">
              <label
                htmlFor="learning-topic"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Topic <span className="text-cyan-300">(required)</span>
              </label>

              <input
                ref={topicRef}
                id="learning-topic"
                name="topic"
                type="text"
                value={topic}
                onChange={(event) => {
                  setTopic(event.target.value);
                  clearFeedback();

                  if (event.target.value.trim()) {
                    setTopicError("");
                  }
                }}
                required
                maxLength={200}
                disabled={loading}
                aria-invalid={Boolean(topicError)}
                aria-describedby={
                  topicError
                    ? "learning-topic-help learning-topic-error"
                    : "learning-topic-help"
                }
                placeholder="e.g. Python loops, photosynthesis, or network security"
                className={`${fieldClassName} ${
                  topicError ? "border-red-400" : ""
                }`}
              />

              <div
                id="learning-topic-help"
                className="mt-2 flex justify-between gap-3 text-xs text-slate-500"
              >
                <span>Choose a subject or concept you want to understand.</span>
                <span className="shrink-0">{topic.length}/200</span>
              </div>

              {topicError && (
                <p
                  id="learning-topic-error"
                  role="alert"
                  className="mt-2 text-sm text-red-300"
                >
                  {topicError}
                </p>
              )}
            </div>

            <div className="mt-6">
              <label
                htmlFor="learning-goal"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Learning Goal{" "}
                <span className="font-normal text-slate-400">(optional)</span>
              </label>

              <textarea
                id="learning-goal"
                name="learningGoal"
                value={learningGoal}
                onChange={(event) => {
                  setLearningGoal(event.target.value);
                  clearFeedback();
                }}
                rows={4}
                maxLength={1000}
                disabled={loading}
                aria-describedby="learning-goal-help"
                placeholder="e.g. Understand how to use loops in a small Python project."
                className={`${fieldClassName} resize-y`}
              />

              <div
                id="learning-goal-help"
                className="mt-2 flex justify-between gap-3 text-xs text-slate-500"
              >
                <span>Tell Tanio what you want to achieve.</span>
                <span className="shrink-0">{learningGoal.length}/1000</span>
              </div>
            </div>

            <div className="mt-6">
              <label
                htmlFor="learning-experience"
                className="mb-2 block text-sm font-semibold text-slate-200"
              >
                Experience Level
              </label>

              <select
                id="learning-experience"
                name="experienceLevel"
                value={experienceLevel}
                onChange={(event) => {
                  setExperienceLevel(event.target.value);
                  clearFeedback();
                }}
                disabled={loading}
                className={fieldClassName}
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="mt-6" disabled={loading}>
              <legend className="text-sm font-semibold text-slate-200">
                Output Type
              </legend>

              <p className="mt-2 text-xs text-slate-400">
                Lessons are available now. Flashcards and quizzes are coming
                next.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {OUTPUT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex items-center gap-3 rounded-xl border p-4 transition focus-within:ring-2 focus-within:ring-cyan-400 ${
                      !type.available || loading
                        ? "cursor-not-allowed"
                        : "cursor-pointer"
                    } ${
                      outputType === type.value
                        ? "border-cyan-400 bg-cyan-400/10"
                        : "border-slate-700 bg-slate-900"
                    } ${!type.available ? "opacity-50" : ""}`}
                  >
                    <input
                      type="radio"
                      name="outputType"
                      value={type.value}
                      checked={outputType === type.value}
                      disabled={!type.available}
                      onChange={(event) => {
                        setOutputType(event.target.value);
                        clearFeedback();
                      }}
                      className="h-4 w-4 shrink-0 accent-cyan-400"
                    />

                    <span>
                      <span className="block text-sm font-semibold text-white">
                        {type.label}
                      </span>
                      {!type.available && (
                        <span className="mt-1 block text-xs text-slate-400">
                          Coming soon
                        </span>
                      )}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="mt-6 text-sm leading-6 text-slate-400">
              Generate a lesson with learning objectives, explanations,
              examples, and a summary.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Generating..." : "Generate Lesson"}
              </button>

              <button
                type="button"
                onClick={handleReset}
                disabled={loading}
                className={buttonClassName}
              >
                Clear Form
              </button>
            </div>
          </form>

          <section
            aria-labelledby="learning-output-title"
            aria-busy={loading}
            className="min-w-0 rounded-2xl border border-slate-700 bg-slate-950/40 p-5 sm:p-6"
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2
                id="learning-output-title"
                className="text-xl font-bold text-white"
              >
                Your Lesson
              </h2>

              {generatedResult && (
                <button
                  type="button"
                  onClick={handleRegenerate}
                  disabled={loading}
                  className={buttonClassName}
                >
                  {loading ? "Generating..." : "Regenerate Lesson"}
                </button>
              )}
            </div>

            <p className="mt-2 text-sm leading-6 text-slate-400">
              Regenerate uses the displayed lesson’s study settings. To use
              different settings, update the form and select Generate Lesson.
            </p>

            <div role="status" aria-live="polite" aria-atomic="true">
              {loading ? (
                <div className="mt-5 flex items-center gap-3 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-4 text-cyan-200">
                  <span
                    className="h-5 w-5 shrink-0 animate-spin rounded-full border-2 border-cyan-800 border-t-cyan-300"
                    aria-hidden="true"
                  />
                  <p className="text-sm leading-6">
                    {generatedResult
                      ? "Generating a new lesson. Your previous lesson stays visible until the new one is ready."
                      : "Generating your lesson. This may take a moment."}
                  </p>
                </div>
              ) : statusMessage ? (
                <p className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-200">
                  {statusMessage}
                </p>
              ) : null}
            </div>

            {generationError && (
              <div
                role="alert"
                className="mt-5 rounded-xl border border-red-800 bg-red-950/40 p-4"
              >
                <p className="font-semibold text-red-200">
                  Lesson could not be generated
                </p>
                <p className="mt-2 text-sm leading-6 text-red-300">
                  {generationError}
                </p>

                {lastRequest && (
                  <>
                    <p className="mt-2 text-xs text-slate-400">
                      Retry uses your last submitted settings for{" "}
                      <span className="break-words">{lastRequest.topic}</span>.
                    </p>
                    <button
                      type="button"
                      onClick={handleRetry}
                      disabled={loading}
                      className="mt-3 rounded-lg bg-red-800 px-4 py-2 font-semibold text-white transition hover:bg-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-300 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Retry Generation
                    </button>
                  </>
                )}
              </div>
            )}

            {generatedResult ? (
              <>
                <div className="mt-5 rounded-xl border border-slate-800 bg-slate-900/60 p-4">
                  <dl className="space-y-3 text-sm">
                    <div>
                      <dt className="text-slate-400">Topic</dt>
                      <dd className="mt-1 break-words font-semibold text-white">
                        {generatedResult.topic}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-400">Experience Level</dt>
                      <dd className="mt-1 text-slate-200">
                        {
                          EXPERIENCE_LEVELS.find(
                            (level) =>
                              level.value === generatedResult.experience_level
                          )?.label
                        }
                      </dd>
                    </div>
                    {generatedResult.learning_goal && (
                      <div>
                        <dt className="text-slate-400">Learning Goal</dt>
                        <dd className="mt-1 whitespace-pre-wrap break-words text-slate-200">
                          {generatedResult.learning_goal}
                        </dd>
                      </div>
                    )}
                  </dl>
                </div>

                <LessonView lesson={generatedResult.content} />
              </>
            ) : !loading && !generationError ? (
              <div className="mt-5 rounded-xl border border-dashed border-slate-700 p-6 text-center">
                <span
                  className="text-3xl text-cyan-300"
                  aria-hidden="true"
                >
                  ▤
                </span>
                <p className="mt-3 font-semibold text-slate-200">
                  Your lesson will appear here
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-400">
                  Enter a topic and select Generate Lesson to get started.
                </p>
              </div>
            ) : null}

            {!generatedResult && (
              <div className="mt-6 space-y-3">
                {OUTPUT_TYPES.map((type) => (
                  <article
                    key={type.value}
                    className="flex items-start gap-3 rounded-xl border border-slate-800 bg-slate-900/60 p-4"
                  >
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-cyan-400/10 text-xl text-cyan-300"
                      aria-hidden="true"
                    >
                      {type.icon}
                    </span>
                    <div>
                      <h3 className="font-semibold text-white">
                        {type.label}
                      </h3>
                      <p className="mt-1 text-sm leading-6 text-slate-400">
                        {type.description}
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </section>
    </main>
  );
}

export default LearningStudio;