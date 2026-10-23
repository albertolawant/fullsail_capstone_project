import { useEffect, useId, useRef, useState } from "react";
import {
  createQuizAttempt,
  validateLearningMaterial,
} from "../utils/learningStudioContent";

const QUIZ_PRIMARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-cyan-200/30 bg-gradient-to-r from-cyan-300 to-sky-400 px-6 py-3.5 font-bold text-slate-950 shadow-[0_10px_30px_rgba(34,211,238,0.12)] transition hover:from-cyan-200 hover:to-sky-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-40";

const QUIZ_SECONDARY_BUTTON =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900/80 px-4 py-3 text-sm font-semibold text-slate-200 transition hover:border-cyan-400/30 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-30";

// Each attempt gets independent questions and correctly remapped answers.
// The original quiz and question bank are never modified.
function prepareAttemptQuestions(questions, shuffleAnswers) {
  return questions.map((question) => {
    const choiceIndexes = question.choices.map((_, index) => index);

    if (shuffleAnswers) {
      for (let index = choiceIndexes.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));

        [choiceIndexes[index], choiceIndexes[randomIndex]] = [
          choiceIndexes[randomIndex],
          choiceIndexes[index],
        ];
      }
    }

    return {
      ...question,
      choices: choiceIndexes.map(
        (originalIndex) => question.choices[originalIndex]
      ),
      correct_answer_index: choiceIndexes.indexOf(
        question.correct_answer_index
      ),
    };
  });
}

export function LessonView({ lesson }) {
  return (
    <article className="mt-6 min-w-0 space-y-6">
      <header>
        <h3 className="break-words text-2xl font-bold text-white">
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
        <h4 className="text-lg font-semibold text-emerald-200">
          Summary
        </h4>
        <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-300">
          {lesson.summary}
        </p>
      </section>
    </article>
  );
}

export function FlashcardsView({ deck, disabled = false }) {
  const [cardIndex, setCardIndex] = useState(0);
  const [answerVisible, setAnswerVisible] = useState(false);

  const id = useId();
  const cardRef = useRef(null);

  const totalCards = deck.cards.length;
  const currentCard = deck.cards[cardIndex];
  const positionPercentage =
    totalCards > 0 ? ((cardIndex + 1) / totalCards) * 100 : 0;

  useEffect(() => {
    if (cardRef.current) {
      cardRef.current.scrollTop = 0;
    }
  }, [cardIndex, answerVisible]);

  const goToCard = (nextIndex) => {
    if (
      disabled ||
      nextIndex < 0 ||
      nextIndex >= totalCards ||
      nextIndex === cardIndex
    ) {
      return;
    }

    setCardIndex(nextIndex);
    setAnswerVisible(false);
  };

  const toggleAnswer = () => {
    if (!disabled) {
      setAnswerVisible((visible) => !visible);
    }
  };

  const handleKeyDown = (event) => {
    if (
      disabled ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goToCard(cardIndex - 1);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goToCard(cardIndex + 1);
    } else if (
      (event.key === " " || event.key === "Enter") &&
      event.target === event.currentTarget
    ) {
      event.preventDefault();
      toggleAnswer();
    }
  };

  if (!currentCard) {
    return (
      <p className="rounded-xl border border-slate-700 p-5 text-slate-400">
        No flashcards are available in this deck.
      </p>
    );
  }

  return (
    <section
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-help`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="relative isolate min-w-0 overflow-hidden rounded-[28px] border border-cyan-400/15 bg-slate-950/70 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.25)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:p-8 lg:p-10"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 overflow-hidden"
      >
        <div className="absolute -left-28 -top-32 h-80 w-80 rounded-full bg-cyan-500/10 blur-[100px]" />
        <div className="absolute -bottom-32 -right-24 h-96 w-96 rounded-full bg-violet-500/10 blur-[110px]" />
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
      </div>

      <div className="w-full min-w-0">
        <header className="flex flex-wrap items-start justify-between gap-5">
          <div className="min-w-0 flex-1">
            <div className="mb-3 flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-cyan-400/20 bg-cyan-400/10 text-cyan-300">
                ◇
              </span>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-cyan-300 sm:text-xs">
                Flashcard Studio
              </p>
            </div>

            <h3
              id={`${id}-title`}
              className="break-words text-2xl font-black leading-tight tracking-tight text-white sm:text-3xl"
            >
              {deck.title}
            </h3>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              One concept at a time. Recall it, reveal it, keep going.
            </p>
          </div>

          <span className="inline-flex shrink-0 items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/[0.07] px-3.5 py-2 text-xs font-semibold text-violet-200">
            <span aria-hidden="true">▱</span>
            {totalCards} {totalCards === 1 ? "card" : "cards"}
          </span>
        </header>

        <div className="mt-8">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm font-semibold text-slate-300">
              Card{" "}
              <span className="text-lg font-bold tabular-nums text-white">
                {String(cardIndex + 1).padStart(2, "0")}
              </span>
              <span className="mx-2 text-slate-600">/</span>
              <span className="tabular-nums text-slate-500">
                {String(totalCards).padStart(2, "0")}
              </span>
            </p>

            <span
              className={`rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${
                answerVisible
                  ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
                  : "border-cyan-400/20 bg-cyan-400/[0.07] text-cyan-300"
              }`}
            >
              {answerVisible ? "Answer revealed" : "Recall first"}
            </span>
          </div>

          <div
            role="progressbar"
            aria-label="Position in flashcard deck"
            aria-valuemin={0}
            aria-valuemax={totalCards}
            aria-valuenow={cardIndex + 1}
            aria-valuetext={`Card ${cardIndex + 1} of ${totalCards}`}
            className="h-1.5 overflow-hidden rounded-full bg-slate-800"
          >
            <div
              style={{ width: `${positionPercentage}%` }}
              className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 transition-[width] duration-300 motion-reduce:transition-none"
            />
          </div>
        </div>

        <p
          role="status"
          aria-live="polite"
          aria-atomic="true"
          className="sr-only"
        >
          Card {cardIndex + 1} of {totalCards}.{" "}
          {answerVisible ? "Answer revealed." : "Question."}
        </p>

        <div className="relative mx-1 mb-5 mt-8 pb-4 sm:mx-3">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-6 bottom-0 top-8 rounded-[26px] border border-violet-400/15 bg-slate-900/80"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-3 bottom-2 top-4 rounded-[26px] border border-cyan-400/15 bg-slate-900"
          />

          <article
            ref={cardRef}
            aria-labelledby={`${id}-question`}
            className={`relative max-h-[620px] min-h-[340px] overflow-y-auto rounded-[26px] border p-6 shadow-[0_20px_65px_rgba(0,0,0,0.30)] transition-colors duration-300 [scrollbar-color:rgb(71_85_105)_transparent] [scrollbar-width:thin] motion-reduce:transition-none sm:min-h-[420px] sm:p-9 ${
              answerVisible
                ? "border-emerald-400/25 bg-[radial-gradient(ellipse_at_top_left,rgba(52,211,153,0.09),transparent_65%),linear-gradient(145deg,#0f172a,#080f20)]"
                : "border-cyan-300/25 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.10),transparent_65%),linear-gradient(145deg,#0f172a,#080f20)]"
            }`}
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent"
            />

            <div className="flex items-center justify-between gap-4">
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-300/15 bg-cyan-300/[0.06] px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-200">
                <span aria-hidden="true">◇</span>
                Question
              </span>
              <span
                aria-hidden="true"
                className="font-mono text-xs tabular-nums text-slate-500"
              >
                {String(cardIndex + 1).padStart(2, "0")}
              </span>
            </div>

            <div
              className={
                answerVisible
                  ? "py-7 sm:py-9"
                  : "flex min-h-[230px] flex-col items-center justify-center py-8 sm:min-h-[300px]"
              }
            >
              <h4
                id={`${id}-question`}
                className={`w-full whitespace-pre-wrap break-words font-semibold tracking-tight text-white [overflow-wrap:anywhere] ${
                  answerVisible
                    ? "text-xl leading-8 sm:text-2xl sm:leading-9"
                    : "max-w-2xl text-center text-2xl leading-9 sm:text-3xl sm:leading-[1.5]"
                }`}
              >
                {currentCard.question}
              </h4>

              {!answerVisible && (
                <p className="mt-7 max-w-sm text-center text-sm leading-6 text-slate-500">
                  Take a moment to recall the answer before revealing it.
                </p>
              )}
            </div>

            <div
              id={`${id}-answer`}
              hidden={!answerVisible}
              className="border-t border-emerald-300/15 pt-6"
            >
              <p className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
                <span
                  aria-hidden="true"
                  className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-400/10"
                >
                  ✓
                </span>
                Answer
              </p>

              {answerVisible && (
                <p className="mt-4 whitespace-pre-wrap break-words text-base leading-8 text-slate-200 [overflow-wrap:anywhere] sm:text-lg sm:leading-9">
                  {currentCard.answer}
                </p>
              )}
            </div>
          </article>
        </div>

        <div className="mx-auto mt-7 max-w-md">
          <button
            type="button"
            onClick={toggleAnswer}
            disabled={disabled}
            aria-expanded={answerVisible}
            aria-controls={`${id}-answer`}
            className={`inline-flex min-h-14 w-full items-center justify-center gap-3 rounded-2xl border px-6 py-4 font-bold transition duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none ${
              answerVisible
                ? "border-slate-600 bg-slate-800/80 text-slate-100 hover:border-slate-500 hover:bg-slate-700"
                : "border-cyan-200/40 bg-gradient-to-r from-cyan-300 to-sky-400 text-slate-950 shadow-[0_8px_30px_rgba(34,211,238,0.16)] hover:from-cyan-200 hover:to-sky-300 hover:shadow-[0_10px_36px_rgba(34,211,238,0.24)]"
            }`}
          >
            <span aria-hidden="true">{answerVisible ? "↶" : "✦"}</span>
            {answerVisible ? "Hide Answer" : "Reveal Answer"}
          </button>
        </div>

        <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-3">
          <button
            type="button"
            onClick={() => goToCard(cardIndex - 1)}
            disabled={disabled || cardIndex === 0}
            className="inline-flex min-h-11 items-center justify-center gap-2 justify-self-start rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-30 sm:px-5"
          >
            <span aria-hidden="true">←</span>
            <span className="hidden sm:inline">Previous</span>
            <span className="sr-only sm:hidden">Previous card</span>
          </button>

          <span className="text-xs font-medium tabular-nums text-slate-500">
            {cardIndex + 1} / {totalCards}
          </span>

          <button
            type="button"
            onClick={() => goToCard(cardIndex + 1)}
            disabled={disabled || cardIndex === totalCards - 1}
            className="inline-flex min-h-11 items-center justify-center gap-2 justify-self-end rounded-xl border border-slate-700/70 bg-slate-900/70 px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:border-cyan-400/30 hover:bg-slate-800 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-30 sm:px-5"
          >
            <span className="hidden sm:inline">Next</span>
            <span className="sr-only sm:hidden">Next card</span>
            <span aria-hidden="true">→</span>
          </button>
        </div>

        <nav
          aria-label="Choose a flashcard"
          className="mt-6 flex max-h-24 flex-wrap justify-center gap-2 overflow-y-auto p-1"
        >
          {deck.cards.map((_, index) => (
            <button
              key={index}
              type="button"
              onClick={() => goToCard(index)}
              disabled={disabled}
              aria-label={`Go to card ${index + 1}`}
              aria-current={index === cardIndex ? "step" : undefined}
              className={`flex h-8 min-w-8 items-center justify-center rounded-lg border px-2 text-[11px] font-semibold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 ${
                index === cardIndex
                  ? "border-cyan-300/40 bg-cyan-300/15 text-cyan-200 shadow-[0_0_16px_rgba(34,211,238,0.08)]"
                  : "border-slate-800 bg-slate-900/50 text-slate-500 hover:border-slate-600 hover:text-slate-200"
              }`}
            >
              {index + 1}
            </button>
          ))}
        </nav>

        <p
          id={`${id}-help`}
          className="mt-6 border-t border-slate-800/70 pt-5 text-center text-xs leading-6 text-slate-500"
        >
          Use ← and → to change cards. Press Enter or Space while the
          deck is focused to reveal the answer.
        </p>
      </div>
    </section>
  );
}

export function QuizView({ quiz, disabled = false }) {
  const [attemptQuestions, setAttemptQuestions] = useState(() =>
    prepareAttemptQuestions(quiz.questions, false)
  );
  const [selectedAnswers, setSelectedAnswers] = useState(() =>
    quiz.questions.map(() => null)
  );
  const [questionIndex, setQuestionIndex] = useState(0);
  const [submitted, setSubmitted] = useState(false);
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [randomizeQuestions, setRandomizeQuestions] = useState(
    () => quiz.randomize_questions ?? false
  );
  const [attemptRandomized, setAttemptRandomized] = useState(
    () => quiz.randomize_questions ?? false
  );
  const [shuffleAnswers, setShuffleAnswers] = useState(false);
  const [attemptAnswersShuffled, setAttemptAnswersShuffled] =
    useState(false);
  const [attemptError, setAttemptError] = useState("");
  const [attemptMessage, setAttemptMessage] = useState("");
  const [reviewFilter, setReviewFilter] = useState("all");

  const id = useId();
  const quizTitleRef = useRef(null);
  const questionTitleRef = useRef(null);
  const resultsTitleRef = useRef(null);
  const focusQuestionRef = useRef(false);

  const requestedCount = quiz.questions.length;
  const bankSize = quiz.question_bank?.length ?? 0;
  const canSelectDifferentSets = bankSize > requestedCount;
  const totalQuestions = attemptQuestions.length;
  const currentQuestion = attemptQuestions[questionIndex];

  const answeredCount = selectedAnswers.filter(
    (answer) => answer !== null
  ).length;
  const remainingCount = totalQuestions - answeredCount;
  const allAnswered =
    totalQuestions > 0 && answeredCount === totalQuestions;
  const completionPercentage =
    totalQuestions > 0
      ? Math.round((answeredCount / totalQuestions) * 100)
      : 0;

  const correctCount = attemptQuestions.reduce(
    (total, question, index) =>
      total +
      (selectedAnswers[index] === question.correct_answer_index ? 1 : 0),
    0
  );
  const incorrectCount = totalQuestions - correctCount;
  const percentage =
    totalQuestions > 0
      ? Math.round((correctCount / totalQuestions) * 100)
      : 0;

  const newAttemptDisabled =
    disabled || (randomizeQuestions && !canSelectDifferentSets);
  const settingsChanged =
    randomizeQuestions !== attemptRandomized ||
    shuffleAnswers !== attemptAnswersShuffled;

  useEffect(() => {
    if (submitted) {
      resultsTitleRef.current?.focus();
    }
  }, [submitted]);

  useEffect(() => {
    if (attemptNumber > 1) {
      quizTitleRef.current?.focus();
    }
  }, [attemptNumber]);

  useEffect(() => {
    if (focusQuestionRef.current && !submitted) {
      focusQuestionRef.current = false;
      questionTitleRef.current?.focus();
    }
  }, [questionIndex, submitted]);

  const goToQuestion = (nextIndex) => {
    if (
      disabled ||
      submitted ||
      nextIndex < 0 ||
      nextIndex >= totalQuestions
    ) {
      return;
    }

    if (nextIndex === questionIndex) {
      questionTitleRef.current?.focus();
      return;
    }

    focusQuestionRef.current = true;
    setQuestionIndex(nextIndex);
  };

  const handleAnswerChange = (targetQuestionIndex, choiceIndex) => {
    if (disabled || submitted) {
      return;
    }

    setSelectedAnswers((answers) =>
      answers.map((answer, index) =>
        index === targetQuestionIndex ? choiceIndex : answer
      )
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!disabled && !submitted && allAnswered) {
      setSubmitted(true);
      setReviewFilter("all");
      setAttemptMessage("");
    }
  };

  const handleRandomSelectionChange = (event) => {
    if (disabled) {
      return;
    }

    setRandomizeQuestions(event.target.checked);
    setAttemptError("");
    setAttemptMessage("");
  };

  const handleShuffleAnswersChange = (event) => {
    if (disabled) {
      return;
    }

    setShuffleAnswers(event.target.checked);
    setAttemptError("");
    setAttemptMessage("");
  };

  const handleNewAttempt = () => {
    if (newAttemptDisabled) {
      return;
    }

    setAttemptError("");

    try {
      const selectedQuestions = createQuizAttempt(quiz, {
        randomize: randomizeQuestions,
        previousQuestions: attemptQuestions,
      });
      const nextQuestions = prepareAttemptQuestions(
        selectedQuestions,
        shuffleAnswers
      );

      focusQuestionRef.current = false;
      setAttemptQuestions(nextQuestions);
      setSelectedAnswers(nextQuestions.map(() => null));
      setQuestionIndex(0);
      setSubmitted(false);
      setReviewFilter("all");
      setAttemptNumber((number) => number + 1);
      setAttemptRandomized(randomizeQuestions);
      setAttemptAnswersShuffled(shuffleAnswers);
      setAttemptMessage(
        `${
          randomizeQuestions
            ? "A different question set is ready."
            : "The original question set is ready."
        } ${
          shuffleAnswers
            ? "Answer choices have been shuffled."
            : "Answer choices use their original order."
        } Previous answers and scores have been cleared.`
      );
    } catch (error) {
      setAttemptMessage("");
      setAttemptError(
        error instanceof Error
          ? error.message
          : "A new quiz attempt could not be started."
      );
    }
  };

  const resultHeading =
    percentage === 100
      ? "Every answer correct."
      : percentage >= 80
        ? "Strong work."
        : percentage >= 60
          ? "You’re making progress."
          : "A starting point for your next attempt.";

  const reviewQuestions = attemptQuestions
    .map((question, index) => ({
      question,
      index,
      isCorrect:
        selectedAnswers[index] === question.correct_answer_index,
    }))
    .filter((item) => {
      if (reviewFilter === "correct") {
        return item.isCorrect;
      }
      if (reviewFilter === "incorrect") {
        return !item.isCorrect;
      }
      return true;
    });

  return (
    <section
      aria-labelledby={`${id}-title`}
      className="mt-6 w-full min-w-0"
    >
      <header className="flex flex-wrap items-start justify-between gap-5">
        <div className="min-w-0 flex-1">
          <h3
            ref={quizTitleRef}
            id={`${id}-title`}
            tabIndex={-1}
            className="break-words text-2xl font-black leading-tight tracking-tight text-white focus:outline-none sm:text-3xl"
          >
            {quiz.title}
          </h3>
          <p className="mt-3 text-sm leading-6 text-slate-400">
            {submitted
              ? "Your results are ready. Review the explanations and build on what you learned."
              : "Take your time. Choose your answers, then submit when you’re ready."}
          </p>
        </div>

        <span
          className={`shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold ${
            submitted
              ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-200"
              : "border-violet-400/20 bg-violet-400/[0.07] text-violet-200"
          }`}
        >
          {submitted ? "✓ Completed" : `Attempt ${attemptNumber}`}
        </span>
      </header>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className="rounded-lg border border-slate-700/60 bg-slate-900/70 px-3 py-1.5 text-[11px] font-medium text-slate-400">
          {attemptRandomized
            ? "Random question set"
            : "Original question set"}
        </span>
        <span className="rounded-lg border border-slate-700/60 bg-slate-900/70 px-3 py-1.5 text-[11px] font-medium text-slate-400">
          {attemptAnswersShuffled
            ? "Answers shuffled"
            : "Original answer order"}
        </span>
        {bankSize > 0 && (
          <span className="rounded-lg border border-slate-700/60 bg-slate-900/70 px-3 py-1.5 text-[11px] font-medium text-slate-400">
            {bankSize} questions in bank
          </span>
        )}
      </div>

      <details className="mt-5 rounded-2xl border border-slate-700/70 bg-slate-900/40">
        <summary className="cursor-pointer rounded-2xl px-4 py-4 text-sm font-semibold text-slate-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 sm:px-5">
          Next Attempt Settings
          <span className="ml-2 text-xs font-normal text-slate-500">
            Random selection and answer shuffling
          </span>
        </summary>

        <div className="border-t border-slate-800 p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-2">
            <label
              htmlFor={`${id}-random-selection`}
              className={`rounded-xl border p-4 ${
                disabled ? "cursor-not-allowed" : "cursor-pointer"
              } ${
                randomizeQuestions
                  ? "border-violet-400/30 bg-violet-400/[0.06]"
                  : "border-slate-700/70 bg-slate-950/30"
              }`}
            >
              <span className="flex items-start gap-3">
                <input
                  id={`${id}-random-selection`}
                  type="checkbox"
                  checked={randomizeQuestions}
                  onChange={handleRandomSelectionChange}
                  disabled={disabled}
                  aria-describedby={`${id}-random-help`}
                  className="mt-1 h-4 w-4 shrink-0 accent-cyan-400"
                />
                <span className="text-sm font-semibold leading-6 text-white">
                  Random Question Selection
                </span>
              </span>
              <span
                id={`${id}-random-help`}
                className="mt-3 block text-xs leading-6 text-slate-400"
              >
                Select {requestedCount} questions from the bank for your
                next attempt. Turn off to repeat the original set.
              </span>
            </label>

            <label
              htmlFor={`${id}-shuffle-answers`}
              className={`rounded-xl border p-4 ${
                disabled ? "cursor-not-allowed" : "cursor-pointer"
              } ${
                shuffleAnswers
                  ? "border-cyan-400/30 bg-cyan-400/[0.06]"
                  : "border-slate-700/70 bg-slate-950/30"
              }`}
            >
              <span className="flex items-start gap-3">
                <input
                  id={`${id}-shuffle-answers`}
                  type="checkbox"
                  checked={shuffleAnswers}
                  onChange={handleShuffleAnswersChange}
                  disabled={disabled}
                  aria-describedby={`${id}-shuffle-help`}
                  className="mt-1 h-4 w-4 shrink-0 accent-cyan-400"
                />
                <span className="text-sm font-semibold leading-6 text-white">
                  Shuffle Answer Choices
                </span>
              </span>
              <span
                id={`${id}-shuffle-help`}
                className="mt-3 block text-xs leading-6 text-slate-400"
              >
                Rearrange choices when the next attempt starts. Their
                order stays fixed while you answer and review.
              </span>
            </label>
          </div>

          <p className="mt-4 text-xs leading-6 text-slate-500">
            Settings apply only when you select Start New Attempt.
            Changing them keeps your current questions and answers intact.
          </p>

          {settingsChanged && (
            <p className="mt-3 rounded-xl border border-cyan-400/20 bg-cyan-400/[0.05] p-3 text-xs leading-6 text-cyan-200">
              Updated settings are ready for your next attempt.
            </p>
          )}

          {randomizeQuestions && !canSelectDifferentSets && (
            <p
              role="alert"
              className="mt-3 rounded-xl border border-amber-700/50 bg-amber-950/30 p-3 text-xs leading-6 text-amber-200"
            >
              {bankSize === 0
                ? "This quiz has no question bank. Generate a new quiz with random selection enabled, or turn random selection off. You can still shuffle answers."
                : `The bank contains ${bankSize} questions. Different ${requestedCount}-question sets need at least ${
                    requestedCount + 1
                  } questions. Generate a larger bank or turn random selection off.`}
            </p>
          )}

          <div className="mt-4 flex flex-wrap items-center gap-4">
            <button
              type="button"
              onClick={handleNewAttempt}
              disabled={newAttemptDisabled}
              className={QUIZ_SECONDARY_BUTTON}
            >
              <span aria-hidden="true">↻</span>
              Start New Attempt
            </button>
            <p className="max-w-lg text-xs leading-6 text-slate-500">
              Clears your current answers, score, and explanations.
              Random sets differ from the immediately previous set.
            </p>
          </div>
        </div>
      </details>

      {attemptError && (
        <p
          role="alert"
          className="mt-4 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300"
        >
          {attemptError}
        </p>
      )}

      <div role="status" aria-live="polite" aria-atomic="true">
        {attemptMessage && (
          <p className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 text-sm leading-6 text-emerald-200">
            {attemptMessage}
          </p>
        )}
      </div>

      {submitted ? (
        <>
          <section
            aria-labelledby={`${id}-results`}
            className="relative mt-7 overflow-hidden rounded-[24px] border border-cyan-400/20 bg-gradient-to-br from-cyan-950/30 via-slate-900/80 to-violet-950/20 p-6 sm:p-8"
          >
            <div
              aria-hidden="true"
              className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/50 to-transparent"
            />

            <div className="flex flex-col items-start gap-7 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                  Attempt {attemptNumber} Complete
                </p>
                <h4
                  ref={resultsTitleRef}
                  id={`${id}-results`}
                  tabIndex={-1}
                  className="mt-3 text-2xl font-black tracking-tight text-white focus:outline-none sm:text-3xl"
                >
                  {resultHeading}
                </h4>
                <p className="mt-3 text-sm leading-7 text-slate-400">
                  You answered {correctCount} of {totalQuestions} questions
                  correctly. Review your answers below before your next attempt.
                </p>
              </div>

              <div
                className="flex h-36 w-36 shrink-0 items-center justify-center rounded-full p-2"
                style={{
                  background: `conic-gradient(#22d3ee 0% ${percentage}%, #1e293b ${percentage}% 100%)`,
                }}
              >
                <div className="flex h-full w-full flex-col items-center justify-center rounded-full bg-slate-950">
                  <p className="text-4xl font-black tabular-nums text-white">
                    {percentage}%
                  </p>
                  <p className="mt-1 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    Accuracy
                  </p>
                </div>
              </div>
            </div>

            <dl className="mt-7 grid grid-cols-3 gap-2 sm:gap-4">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.05] p-3 sm:p-5">
                <dt className="text-xs text-emerald-300">Correct</dt>
                <dd className="mt-2 text-2xl font-black tabular-nums text-white sm:text-3xl">
                  {correctCount}
                </dd>
              </div>
              <div className="rounded-2xl border border-rose-400/20 bg-rose-400/[0.05] p-3 sm:p-5">
                <dt className="text-xs text-rose-300">Incorrect</dt>
                <dd className="mt-2 text-2xl font-black tabular-nums text-white sm:text-3xl">
                  {incorrectCount}
                </dd>
              </div>
              <div className="rounded-2xl border border-slate-700 bg-slate-950/30 p-3 sm:p-5">
                <dt className="text-xs text-slate-400">Total</dt>
                <dd className="mt-2 text-2xl font-black tabular-nums text-white sm:text-3xl">
                  {totalQuestions}
                </dd>
              </div>
            </dl>

            <div className="mt-6 flex flex-wrap items-center gap-4">
              <button
                type="button"
                onClick={handleNewAttempt}
                disabled={newAttemptDisabled}
                className={QUIZ_PRIMARY_BUTTON}
              >
                <span aria-hidden="true">↻</span>
                Start New Attempt
              </button>
              <p className="text-xs leading-6 text-slate-500">
                Uses your next-attempt settings and clears this result.
              </p>
            </div>

            {randomizeQuestions && !canSelectDifferentSets && (
              <p className="mt-3 text-xs leading-6 text-amber-200">
                Open Next Attempt Settings and turn off random selection
                or generate a larger question bank.
              </p>
            )}
          </section>

          <div className="mb-5 mt-8 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h4 className="text-lg font-bold text-white">
                Answer Review
              </h4>
              <p className="mt-1 text-xs leading-6 text-slate-500">
                Understand the answer behind every question.
              </p>
            </div>

            <div
              role="group"
              aria-label="Filter answer review"
              className="flex flex-wrap gap-1 rounded-xl border border-slate-800 bg-slate-950/60 p-1"
            >
              {[
                ["all", `All (${totalQuestions})`],
                ["incorrect", `Incorrect (${incorrectCount})`],
                ["correct", `Correct (${correctCount})`],
              ].map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setReviewFilter(value)}
                  disabled={disabled}
                  aria-pressed={reviewFilter === value}
                  className={`rounded-lg px-3 py-2 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 ${
                    reviewFilter === value
                      ? "bg-cyan-400/15 text-cyan-200"
                      : "text-slate-500 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-5">
            {reviewQuestions.length === 0 ? (
              <p className="rounded-2xl border border-slate-800 bg-slate-950/40 p-6 text-sm text-slate-400">
                No {reviewFilter} answers in this attempt.
              </p>
            ) : (
              reviewQuestions.map(({ question, index, isCorrect }) => {
                const selectedIndex = selectedAnswers[index];
                const correctIndex = question.correct_answer_index;

                return (
                  <article
                    key={`${attemptNumber}-review-${index}`}
                    className={`overflow-hidden rounded-2xl border bg-slate-950/40 ${
                      isCorrect
                        ? "border-emerald-400/20"
                        : "border-rose-400/25"
                    }`}
                  >
                    <div className="p-5 sm:p-6">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                          Question {String(index + 1).padStart(2, "0")}
                        </p>
                        <span
                          className={`rounded-full border px-3 py-1 text-[10px] font-bold ${
                            isCorrect
                              ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-300"
                              : "border-rose-400/20 bg-rose-400/10 text-rose-300"
                          }`}
                        >
                          {isCorrect ? "✓ Correct" : "× Incorrect"}
                        </span>
                      </div>

                      <h5 className="mt-4 whitespace-pre-wrap break-words text-lg font-semibold leading-8 text-white [overflow-wrap:anywhere]">
                        {question.question}
                      </h5>

                      <div className="mt-5 grid gap-3 lg:grid-cols-2">
                        <div
                          className={`rounded-xl border p-4 ${
                            isCorrect
                              ? "border-emerald-400/15 bg-emerald-400/[0.04]"
                              : "border-rose-400/15 bg-rose-400/[0.04]"
                          }`}
                        >
                          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Your Answer
                          </p>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-200 [overflow-wrap:anywhere]">
                            <span className="font-bold">
                              {String.fromCharCode(65 + selectedIndex)}.
                            </span>{" "}
                            {question.choices[selectedIndex]}
                          </p>
                        </div>

                        <div className="rounded-xl border border-emerald-400/15 bg-emerald-400/[0.04] p-4">
                          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-300">
                            Correct Answer
                          </p>
                          <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-200 [overflow-wrap:anywhere]">
                            <span className="font-bold">
                              {String.fromCharCode(65 + correctIndex)}.
                            </span>{" "}
                            {question.choices[correctIndex]}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="border-t border-slate-800 bg-cyan-400/[0.025] px-5 py-4 sm:px-6">
                      <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-cyan-300">
                        Why this is correct
                      </p>
                      <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-7 text-slate-300 [overflow-wrap:anywhere]">
                        {question.explanation}
                      </p>
                    </div>
                  </article>
                );
              })
            )}
          </div>
        </>
      ) : (
        <>
          <div className="mt-7 rounded-2xl border border-slate-800 bg-slate-950/40 p-4 sm:p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
                  Your Progress
                </p>
                <p
                  role="status"
                  aria-live="polite"
                  className="mt-2 text-sm text-slate-300"
                >
                  <span className="font-bold text-white">
                    {answeredCount}
                  </span>{" "}
                  of {totalQuestions} answered
                </p>
              </div>

              <span
                className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${
                  allAnswered
                    ? "border-emerald-400/20 bg-emerald-400/[0.07] text-emerald-300"
                    : "border-slate-700 bg-slate-900 text-slate-400"
                }`}
              >
                {allAnswered
                  ? "Ready to submit"
                  : `${remainingCount} remaining`}
              </span>
            </div>

            <div
              role="progressbar"
              aria-label="Quiz questions answered"
              aria-valuemin={0}
              aria-valuemax={totalQuestions}
              aria-valuenow={answeredCount}
              className="mt-4 h-1.5 overflow-hidden rounded-full bg-slate-800"
            >
              <div
                style={{ width: `${completionPercentage}%` }}
                className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-sky-400 to-violet-400 transition-[width] duration-300 motion-reduce:transition-none"
              />
            </div>

            <nav
              aria-label="Choose a quiz question"
              className="mt-5 flex flex-wrap gap-2"
            >
              {attemptQuestions.map((_, index) => {
                const answered = selectedAnswers[index] !== null;
                const current = index === questionIndex;

                return (
                  <button
                    key={`${attemptNumber}-nav-${index}`}
                    type="button"
                    onClick={() => goToQuestion(index)}
                    disabled={disabled}
                    aria-current={current ? "step" : undefined}
                    aria-label={`Question ${index + 1}, ${
                      answered ? "answered" : "unanswered"
                    }${current ? ", current question" : ""}`}
                    className={`relative flex h-11 min-w-11 items-center justify-center rounded-xl border px-3 text-sm font-bold tabular-nums transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50 ${
                      current
                        ? "border-cyan-300/50 bg-cyan-300/15 text-cyan-100 shadow-[0_0_18px_rgba(34,211,238,0.08)]"
                        : answered
                          ? "border-emerald-400/25 bg-emerald-400/[0.07] text-emerald-200 hover:border-emerald-300/50"
                          : "border-slate-700/70 bg-slate-900/70 text-slate-500 hover:border-slate-500 hover:text-white"
                    }`}
                  >
                    {index + 1}
                    {answered && (
                      <span
                        aria-hidden="true"
                        className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-emerald-400 text-[9px] text-slate-950"
                      >
                        ✓
                      </span>
                    )}
                  </button>
                );
              })}
            </nav>

            <p className="mt-3 text-[11px] leading-6 text-slate-500">
              Select any question to jump to it. Your answers stay saved
              within this attempt.
            </p>
          </div>

          {currentQuestion && (
            <form
              onSubmit={handleSubmit}
              noValidate
              aria-labelledby={`${id}-title`}
              className="mt-6"
            >
              <div className="relative overflow-hidden rounded-[24px] border border-cyan-400/20 bg-[radial-gradient(ellipse_at_top_left,rgba(34,211,238,0.07),transparent_60%),linear-gradient(145deg,#0f172a,#080f20)] p-5 shadow-[0_16px_45px_rgba(0,0,0,0.15)] sm:p-8">
                <div
                  aria-hidden="true"
                  className="absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/40 to-transparent"
                />

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-cyan-300">
                    Question {String(questionIndex + 1).padStart(2, "0")}
                    <span className="mx-2 text-slate-600">/</span>
                    {String(totalQuestions).padStart(2, "0")}
                  </p>
                  <span className="rounded-full border border-slate-700 bg-slate-950/40 px-3 py-1 text-[10px] font-semibold text-slate-500">
                    Single choice
                  </span>
                </div>

                <h4
                  ref={questionTitleRef}
                  id={`${id}-question-${questionIndex}`}
                  tabIndex={-1}
                  className="mb-7 mt-6 whitespace-pre-wrap break-words text-xl font-bold leading-9 tracking-tight text-white focus:outline-none [overflow-wrap:anywhere] sm:text-2xl sm:leading-10"
                >
                  {currentQuestion.question}
                </h4>

                <fieldset
                  key={`${attemptNumber}-question-${questionIndex}`}
                  disabled={disabled}
                  aria-labelledby={`${id}-question-${questionIndex}`}
                  className="min-w-0"
                >
                  <legend className="sr-only">
                    Select one answer
                  </legend>

                  <div className="grid grid-cols-1 gap-3">
                    {currentQuestion.choices.map((choice, choiceIndex) => {
                      const selected =
                        selectedAnswers[questionIndex] === choiceIndex;

                      return (
                        <label
                          key={choiceIndex}
                          className={`relative flex min-h-[88px] min-w-0 items-start gap-3 rounded-2xl border p-4 transition focus-within:ring-2 focus-within:ring-cyan-300 sm:gap-4 sm:p-5 ${
                            disabled
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer"
                          } ${
                            selected
                              ? "border-cyan-300/60 bg-cyan-300/[0.09] shadow-[0_0_24px_rgba(34,211,238,0.06)]"
                              : "border-slate-700/70 bg-slate-950/40 hover:border-slate-500 hover:bg-slate-800/50"
                          }`}
                        >
                          <input
                            type="radio"
                            name={`${id}-attempt-${attemptNumber}-question-${questionIndex}`}
                            value={choiceIndex}
                            checked={selected}
                            onChange={() =>
                              handleAnswerChange(questionIndex, choiceIndex)
                            }
                            className="sr-only"
                          />

                          <span
                            aria-hidden="true"
                            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border text-sm font-bold ${
                              selected
                                ? "border-cyan-200/40 bg-cyan-300 text-slate-950"
                                : "border-slate-600/60 bg-slate-800/80 text-slate-400"
                            }`}
                          >
                            {String.fromCharCode(65 + choiceIndex)}
                          </span>

                          <span className="min-w-0 flex-1 whitespace-pre-wrap break-words pt-1 text-sm leading-7 text-slate-200 [overflow-wrap:anywhere] sm:text-base">
                            <span className="sr-only">
                              {String.fromCharCode(65 + choiceIndex)}.{" "}
                            </span>
                            {choice}
                          </span>

                          {selected && (
                            <span
                              aria-hidden="true"
                              className="mt-2 text-sm font-bold text-cyan-200"
                            >
                              ✓
                            </span>
                          )}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>

                <p className="mt-5 text-xs leading-6 text-slate-500">
                  Choose one answer. You can change it anytime before submitting.
                </p>
              </div>

              <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => goToQuestion(questionIndex - 1)}
                  disabled={disabled || questionIndex === 0}
                  className={QUIZ_SECONDARY_BUTTON}
                >
                  <span aria-hidden="true">←</span>
                  Previous
                </button>

                <span className="text-xs font-medium tabular-nums text-slate-500">
                  {questionIndex + 1} / {totalQuestions}
                </span>

                <button
                  type="button"
                  onClick={() => goToQuestion(questionIndex + 1)}
                  disabled={
                    disabled || questionIndex === totalQuestions - 1
                  }
                  className={QUIZ_SECONDARY_BUTTON}
                >
                  Next
                  <span aria-hidden="true">→</span>
                </button>
              </div>

              <div className="mt-6 flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-950/40 p-5 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-200">
                    {allAnswered
                      ? "All answers are in."
                      : `${remainingCount} ${
                          remainingCount === 1 ? "question" : "questions"
                        } left to answer`}
                  </p>
                  <p className="mt-1 text-xs leading-6 text-slate-500">
                    {allAnswered
                      ? "Review any question or submit to see your results."
                      : "Answer every question to unlock your results."}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  {!allAnswered && (
                    <button
                      type="button"
                      onClick={() =>
                        goToQuestion(
                          selectedAnswers.findIndex(
                            (answer) => answer === null
                          )
                        )
                      }
                      disabled={disabled}
                      className={QUIZ_SECONDARY_BUTTON}
                    >
                      Find Unanswered
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={disabled || !allAnswered}
                    className={QUIZ_PRIMARY_BUTTON}
                  >
                    Submit Quiz
                    <span aria-hidden="true">↗</span>
                  </button>
                </div>
              </div>
            </form>
          )}
        </>
      )}
    </section>
  );
}

function LearningMaterialView({ material, disabled = false }) {
  try {
    validateLearningMaterial(material);
  } catch (error) {
    return (
      <p
        role="alert"
        className="mt-5 rounded-xl border border-red-800 bg-red-950/40 p-4 text-sm text-red-300"
      >
        {error instanceof Error
          ? error.message
          : "The learning material could not be displayed."}
      </p>
    );
  }

  const materialKey = JSON.stringify(material);

  if (material.output_type === "lesson") {
    return <LessonView lesson={material.content} />;
  }

  if (material.output_type === "flashcards") {
    return (
      <FlashcardsView
        key={materialKey}
        deck={material.content}
        disabled={disabled}
      />
    );
  }

  return (
    <QuizView
      key={materialKey}
      quiz={material.content}
      disabled={disabled}
    />
  );
}

export default LearningMaterialView;