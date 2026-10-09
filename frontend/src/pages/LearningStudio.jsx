import { useRef, useState } from "react";

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
  },
  {
    value: "flashcards",
    label: "Flashcards",
    icon: "◇",
    description:
      "Review important terms and concepts with question and answer cards.",
  },
  {
    value: "quiz",
    label: "Quiz",
    icon: "✓",
    description:
      "Check your understanding with practice questions about your topic.",
  },
];

function LearningStudio() {
  const [topic, setTopic] = useState("");
  const [learningGoal, setLearningGoal] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("beginner");
  const [outputType, setOutputType] = useState("lesson");
  const [topicError, setTopicError] = useState("");
  const [submittedRequest, setSubmittedRequest] = useState(null);

  const topicRef = useRef(null);

  const fieldClassName =
    "w-full rounded-xl border border-slate-700 bg-slate-950/70 px-4 py-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30";

  const handleSubmit = (event) => {
    event.preventDefault();

    const cleanedTopic = topic.trim();

    if (!cleanedTopic) {
      setTopicError("Enter a topic before continuing.");
      setSubmittedRequest(null);
      topicRef.current?.focus();
      return;
    }

    setTopicError("");

    setSubmittedRequest({
      topic: cleanedTopic,
      learningGoal: learningGoal.trim(),
      experienceLevel,
      outputType,
    });
  };

  const handleReset = () => {
    setTopic("");
    setLearningGoal("");
    setExperienceLevel("beginner");
    setOutputType("lesson");
    setTopicError("");
    setSubmittedRequest(null);
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
          Choose a topic, set your learning goal, and select how you want to
          study.
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
                  setSubmittedRequest(null);

                  if (event.target.value.trim()) {
                    setTopicError("");
                  }
                }}
                required
                maxLength={200}
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
                  setSubmittedRequest(null);
                }}
                rows={4}
                maxLength={1000}
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
                  setSubmittedRequest(null);
                }}
                className={fieldClassName}
              >
                {EXPERIENCE_LEVELS.map((level) => (
                  <option key={level.value} value={level.value}>
                    {level.label}
                  </option>
                ))}
              </select>
            </div>

            <fieldset className="mt-6">
              <legend className="text-sm font-semibold text-slate-200">
                Output Type
              </legend>

              <p className="mt-2 text-xs text-slate-400">
                Choose one format. Use the arrow keys when a radio option is
                focused.
              </p>

              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                {OUTPUT_TYPES.map((type) => (
                  <label
                    key={type.value}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-4 transition focus-within:ring-2 focus-within:ring-cyan-400 ${
                      outputType === type.value
                        ? "border-cyan-400 bg-cyan-400/10"
                        : "border-slate-700 bg-slate-900 hover:border-slate-500"
                    }`}
                  >
                    <input
                      type="radio"
                      name="outputType"
                      value={type.value}
                      checked={outputType === type.value}
                      onChange={(event) => {
                        setOutputType(event.target.value);
                        setSubmittedRequest(null);
                      }}
                      className="h-4 w-4 shrink-0 accent-cyan-400"
                    />

                    <span className="text-sm font-semibold text-white">
                      {type.label}
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>

            <p className="mt-6 text-sm leading-6 text-slate-400">
              AI generation is coming soon. For now, you can prepare and review
              your study settings.
            </p>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="submit"
                className="rounded-xl bg-cyan-400 px-6 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                Review Study Settings
              </button>

              <button
                type="button"
                onClick={handleReset}
                className="rounded-xl border border-slate-700 bg-slate-800 px-6 py-3 font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
              >
                Clear Form
              </button>
            </div>
          </form>

          <section
            aria-labelledby="study-preview-title"
            className="min-w-0 rounded-2xl border border-slate-700 bg-slate-950/40 p-5 sm:p-6"
          >
            <h2
              id="study-preview-title"
              className="text-xl font-bold text-white"
            >
              Your Study Plan
            </h2>

            <div role="status" aria-live="polite" aria-atomic="true">
              {submittedRequest ? (
                <div className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/5 p-5">
                  <p className="font-semibold text-cyan-200">
                    Your study settings are ready
                  </p>

                  <dl className="mt-5 space-y-4">
                    <div>
                      <dt className="text-sm text-slate-400">Topic</dt>
                      <dd className="mt-1 break-words font-semibold text-white">
                        {submittedRequest.topic}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm text-slate-400">Learning Goal</dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words text-slate-200">
                        {submittedRequest.learningGoal || "No goal specified."}
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm text-slate-400">Experience Level</dt>
                      <dd className="mt-1 text-slate-200">
                        {
                          EXPERIENCE_LEVELS.find(
                            (level) =>
                              level.value === submittedRequest.experienceLevel
                          )?.label
                        }
                      </dd>
                    </div>

                    <div>
                      <dt className="text-sm text-slate-400">Output Type</dt>
                      <dd className="mt-1 text-slate-200">
                        {
                          OUTPUT_TYPES.find(
                            (type) => type.value === submittedRequest.outputType
                          )?.label
                        }
                      </dd>
                    </div>
                  </dl>

                  <p className="mt-5 text-sm leading-6 text-slate-400">
                    No study material has been generated yet. AI generation
                    will be available in a future update.
                  </p>
                </div>
              ) : (
                <div className="mt-5 rounded-xl border border-dashed border-slate-700 p-6 text-center">
                  <p className="font-semibold text-slate-200">
                    Your study settings will appear here
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    Complete the form and select Review Study Settings.
                  </p>
                </div>
              )}
            </div>

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
                    <h3 className="font-semibold text-white">{type.label}</h3>
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {type.description}
                    </p>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}

export default LearningStudio;