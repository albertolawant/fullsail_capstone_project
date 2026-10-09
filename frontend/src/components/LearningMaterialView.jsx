import { useEffect, useId, useRef, useState } from "react";
import { validateLearningMaterial } from "../utils/learningStudioContent";

const PRIMARY_BUTTON =
  "rounded-xl bg-cyan-400 px-5 py-3 font-bold text-slate-950 transition hover:bg-cyan-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:cursor-not-allowed disabled:opacity-50";

const SECONDARY_BUTTON =
  "rounded-xl border border-slate-700 bg-slate-800 px-5 py-3 font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400 disabled:cursor-not-allowed disabled:opacity-50";

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

  const currentCard = deck.cards[cardIndex];
  const totalCards = deck.cards.length;

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
    }
  };

  return (
    <section
      aria-labelledby={`${id}-title`}
      aria-describedby={`${id}-help`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      className="mt-6 min-w-0 rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400"
    >
      <h3
        id={`${id}-title`}
        className="break-words text-2xl font-bold text-white"
      >
        {deck.title}
      </h3>

      <div
        role="status"
        aria-live="polite"
        aria-atomic="true"
        className="mt-4 flex flex-wrap justify-between gap-3 text-sm text-slate-300"
      >
        <p>
          Card {cardIndex + 1} of {totalCards}
        </p>
        <p>{answerVisible ? "Answer revealed" : "Question"}</p>
      </div>

      <article className="mt-4 min-h-[280px] rounded-2xl border border-cyan-500/25 bg-gradient-to-br from-cyan-950/30 to-slate-900 p-5 sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-wider text-cyan-400">
          Question
        </p>
        <h4 className="mt-4 whitespace-pre-wrap break-words text-xl font-semibold leading-8 text-white">
          {currentCard.question}
        </h4>

        <div
          id={`${id}-answer`}
          hidden={!answerVisible}
          className="mt-6 border-t border-slate-700 pt-5"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
            Answer
          </p>
          {answerVisible && (
            <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-slate-200">
              {currentCard.answer}
            </p>
          )}
        </div>

        {!answerVisible && (
          <p className="mt-6 text-sm text-slate-400">
            Think about your answer, then select Reveal Answer.
          </p>
        )}
      </article>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
        <button
          type="button"
          onClick={() => setAnswerVisible((visible) => !visible)}
          disabled={disabled}
          aria-expanded={answerVisible}
          aria-controls={`${id}-answer`}
          className={PRIMARY_BUTTON}
        >
          {answerVisible ? "Hide Answer" : "Reveal Answer"}
        </button>
        <button
          type="button"
          onClick={() => goToCard(cardIndex - 1)}
          disabled={disabled || cardIndex === 0}
          className={SECONDARY_BUTTON}
        >
          ← Previous
        </button>
        <button
          type="button"
          onClick={() => goToCard(cardIndex + 1)}
          disabled={disabled || cardIndex === totalCards - 1}
          className={SECONDARY_BUTTON}
        >
          Next →
        </button>
      </div>

      <p id={`${id}-help`} className="mt-4 text-sm leading-6 text-slate-400">
        Keyboard: Tab to the controls and press Enter or Space.
        Use Left and Right Arrow inside the deck to change cards.
      </p>
    </section>
  );
}

export function QuizView({ quiz, disabled = false }) {
  const [selectedAnswers, setSelectedAnswers] = useState(() =>
    quiz.questions.map(() => null)
  );
  const [submitted, setSubmitted] = useState(false);

  const id = useId();
  const quizTitleRef = useRef(null);
  const resultsTitleRef = useRef(null);

  const totalQuestions = quiz.questions.length;
  const answeredCount = selectedAnswers.filter(
    (answer) => answer !== null
  ).length;
  const allAnswered = answeredCount === totalQuestions;

  const correctCount = quiz.questions.reduce(
    (total, question, index) =>
      total +
      (selectedAnswers[index] === question.correct_answer_index ? 1 : 0),
    0
  );

  const percentage = Math.round(
    (correctCount / totalQuestions) * 100
  );

  useEffect(() => {
    if (submitted) {
      resultsTitleRef.current?.focus();
    }
  }, [submitted]);

  const handleAnswerChange = (questionIndex, choiceIndex) => {
    if (disabled || submitted) {
      return;
    }

    setSelectedAnswers((answers) =>
      answers.map((answer, index) =>
        index === questionIndex ? choiceIndex : answer
      )
    );
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (!disabled && !submitted && allAnswered) {
      setSubmitted(true);
    }
  };

  const handleRetake = () => {
    if (disabled) {
      return;
    }

    setSelectedAnswers(quiz.questions.map(() => null));
    setSubmitted(false);
    quizTitleRef.current?.focus();
  };

  return (
    <section aria-labelledby={`${id}-title`} className="mt-6 min-w-0">
      <h3
        ref={quizTitleRef}
        id={`${id}-title`}
        tabIndex={-1}
        className="break-words text-2xl font-bold text-white focus:outline-none"
      >
        {quiz.title}
      </h3>

      {submitted ? (
        <>
          <div className="mt-5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 p-5">
            <h4
              ref={resultsTitleRef}
              tabIndex={-1}
              className="text-xl font-bold text-cyan-200 focus:outline-none"
            >
              Quiz Results
            </h4>
            <p className="mt-3 text-3xl font-bold text-white">
              {correctCount} / {totalQuestions}
            </p>
            <p className="mt-2 text-slate-300">
              You answered {percentage}% correctly.
            </p>
            <button
              type="button"
              onClick={handleRetake}
              disabled={disabled}
              className={`${PRIMARY_BUTTON} mt-5`}
            >
              Retake Quiz
            </button>
          </div>

          <div className="mt-6 space-y-5">
            {quiz.questions.map((question, index) => {
              const selectedIndex = selectedAnswers[index];
              const isCorrect =
                selectedIndex === question.correct_answer_index;

              return (
                <article
                  key={index}
                  className={`rounded-xl border p-5 ${
                    isCorrect
                      ? "border-emerald-700 bg-emerald-950/20"
                      : "border-red-800 bg-red-950/20"
                  }`}
                >
                  <div className="flex flex-wrap justify-between gap-3">
                    <p className="text-sm text-slate-300">
                      Question {index + 1}
                    </p>
                    <p
                      className={`text-sm font-bold ${
                        isCorrect ? "text-emerald-300" : "text-red-300"
                      }`}
                    >
                      {isCorrect ? "Correct" : "Incorrect"}
                    </p>
                  </div>

                  <h5 className="mt-3 whitespace-pre-wrap break-words text-lg font-semibold text-white">
                    {question.question}
                  </h5>

                  <dl className="mt-4 space-y-4 text-sm">
                    <div>
                      <dt className="font-semibold text-slate-400">
                        Your Answer
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words leading-7 text-slate-200">
                        {question.choices[selectedIndex]}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-emerald-300">
                        Correct Answer
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words leading-7 text-slate-200">
                        {question.choices[question.correct_answer_index]}
                      </dd>
                    </div>
                    <div>
                      <dt className="font-semibold text-cyan-300">
                        Explanation
                      </dt>
                      <dd className="mt-1 whitespace-pre-wrap break-words leading-7 text-slate-200">
                        {question.explanation}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
        </>
      ) : (
        <form
          onSubmit={handleSubmit}
          noValidate
          aria-labelledby={`${id}-title`}
          className="mt-5 space-y-5"
        >
          <p className="text-sm leading-6 text-slate-400">
            Choose one answer for every question, then submit your quiz.
          </p>
          <p role="status" aria-live="polite" className="text-sm text-cyan-200">
            {answeredCount} of {totalQuestions} questions answered
          </p>

          {quiz.questions.map((question, questionIndex) => (
            <fieldset
              key={questionIndex}
              disabled={disabled}
              className="min-w-0 rounded-xl border border-slate-700 p-5"
            >
              <legend className="max-w-full whitespace-pre-wrap break-words px-2 font-semibold text-white">
                {questionIndex + 1}. {question.question}
              </legend>

              <div className="mt-3 space-y-3">
                {question.choices.map((choice, choiceIndex) => {
                  const isSelected =
                    selectedAnswers[questionIndex] === choiceIndex;

                  return (
                    <label
                      key={choiceIndex}
                      className={`flex items-start gap-3 rounded-lg border p-3 focus-within:ring-2 focus-within:ring-cyan-400 ${
                        disabled ? "cursor-not-allowed" : "cursor-pointer"
                      } ${
                        isSelected
                          ? "border-cyan-400 bg-cyan-400/10"
                          : "border-slate-700 bg-slate-950/50"
                      }`}
                    >
                      <input
                        type="radio"
                        name={`${id}-question-${questionIndex}`}
                        value={choiceIndex}
                        checked={isSelected}
                        onChange={() =>
                          handleAnswerChange(questionIndex, choiceIndex)
                        }
                        className="mt-1 h-4 w-4 shrink-0 accent-cyan-400"
                      />
                      <span className="whitespace-pre-wrap break-words text-sm leading-6 text-slate-200">
                        {String.fromCharCode(65 + choiceIndex)}. {choice}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
          ))}

          {!allAnswered && (
            <p className="text-sm text-slate-400">
              Answer every question to enable submission.
            </p>
          )}

          <button
            type="submit"
            disabled={disabled || !allAnswered}
            className={PRIMARY_BUTTON}
          >
            Submit Quiz
          </button>
        </form>
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
        {error.message}
      </p>
    );
  }

  // Remount interactive views when the material changes.
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