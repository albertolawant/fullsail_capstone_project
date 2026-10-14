import { useId } from "react";

const FIELD_CLASS =
  "mt-2 w-full rounded-lg border border-slate-700 bg-slate-950 p-3 text-white placeholder:text-slate-500 focus:border-cyan-400 focus:outline-none focus:ring-2 focus:ring-cyan-400/30 disabled:opacity-50";

function TextField({
  label,
  value,
  onChange,
  disabled,
  multiline = false,
  maxLength = 12000,
  rows = 3,
}) {
  const id = useId();

  const props = {
    id,
    value: value ?? "",
    onChange: (event) => onChange(event.target.value),
    disabled,
    maxLength,
    className: FIELD_CLASS,
  };

  return (
    <div>
      <label
        htmlFor={id}
        className="block text-sm font-semibold text-slate-300"
      >
        {label}
      </label>

      {multiline ? (
        <textarea {...props} rows={rows} />
      ) : (
        <input {...props} type="text" />
      )}
    </div>
  );
}

function LearningMaterialEditor({
  material,
  onChange,
  disabled = false,
}) {
  const id = useId();
  const content = material.content;

  const updateMaterial = (field, value) => {
    onChange({
      ...material,
      [field]: value,
    });
  };

  const updateContent = (field, value) => {
    onChange({
      ...material,
      content: {
        ...content,
        [field]: value,
      },
    });
  };

  const updateSection = (sectionIndex, field, value) => {
    updateContent(
      "sections",
      content.sections.map((section, index) =>
        index === sectionIndex
          ? { ...section, [field]: value }
          : section
      )
    );
  };

  const updateExample = (
    sectionIndex,
    exampleIndex,
    field,
    value
  ) => {
    const section = content.sections[sectionIndex];

    updateSection(
      sectionIndex,
      "examples",
      section.examples.map((example, index) =>
        index === exampleIndex
          ? { ...example, [field]: value }
          : example
      )
    );
  };

  const updateCard = (cardIndex, field, value) => {
    updateContent(
      "cards",
      content.cards.map((card, index) =>
        index === cardIndex
          ? { ...card, [field]: value }
          : card
      )
    );
  };

  const updateQuestion = (questionIndex, field, value) => {
    updateContent(
      "questions",
      content.questions.map((question, index) =>
        index === questionIndex
          ? { ...question, [field]: value }
          : question
      )
    );
  };

  const updateChoice = (
    questionIndex,
    choiceIndex,
    value
  ) => {
    const question = content.questions[questionIndex];

    updateQuestion(
      questionIndex,
      "choices",
      question.choices.map((choice, index) =>
        index === choiceIndex ? value : choice
      )
    );
  };

  return (
    <div className="space-y-6">
      <p className="rounded-xl border border-cyan-500/20 bg-cyan-500/5 p-4 text-sm leading-6 text-cyan-200">
        Edit the study settings and material below. Saving keeps
        the previous version in your version history.
      </p>

      <TextField
        label="Topic"
        value={material.topic}
        onChange={(value) => updateMaterial("topic", value)}
        maxLength={200}
        disabled={disabled}
      />

      <TextField
        label="Learning Goal (optional)"
        value={material.learning_goal}
        onChange={(value) =>
          updateMaterial("learning_goal", value)
        }
        maxLength={1000}
        multiline
        disabled={disabled}
      />

      <div>
        <label
          htmlFor={`${id}-experience`}
          className="block text-sm font-semibold text-slate-300"
        >
          Experience Level
        </label>
        <select
          id={`${id}-experience`}
          value={material.experience_level}
          onChange={(event) =>
            updateMaterial(
              "experience_level",
              event.target.value
            )
          }
          disabled={disabled}
          className={FIELD_CLASS}
        >
          <option value="beginner">Beginner</option>
          <option value="intermediate">Intermediate</option>
          <option value="advanced">Advanced</option>
        </select>
      </div>

      <TextField
        label="Material Title"
        value={content.title}
        onChange={(value) => updateContent("title", value)}
        disabled={disabled}
      />

      {material.output_type === "lesson" && (
        <>
          <TextField
            label="Introduction"
            value={content.introduction}
            onChange={(value) =>
              updateContent("introduction", value)
            }
            multiline
            rows={5}
            disabled={disabled}
          />

          <section className="space-y-4 rounded-xl border border-slate-700 p-4">
            <h4 className="font-bold text-cyan-200">
              Learning Objectives
            </h4>

            {content.learning_objectives.map(
              (objective, objectiveIndex) => (
                <TextField
                  key={objectiveIndex}
                  label={`Objective ${objectiveIndex + 1}`}
                  value={objective}
                  onChange={(value) =>
                    updateContent(
                      "learning_objectives",
                      content.learning_objectives.map(
                        (item, index) =>
                          index === objectiveIndex
                            ? value
                            : item
                      )
                    )
                  }
                  multiline
                  disabled={disabled}
                />
              )
            )}
          </section>

          {content.sections.map((section, sectionIndex) => (
            <section
              key={sectionIndex}
              className="space-y-4 rounded-xl border border-slate-700 p-4"
            >
              <h4 className="font-bold text-cyan-200">
                Section {sectionIndex + 1}
              </h4>

              <TextField
                label="Heading"
                value={section.heading}
                onChange={(value) =>
                  updateSection(
                    sectionIndex,
                    "heading",
                    value
                  )
                }
                disabled={disabled}
              />

              <TextField
                label="Explanation"
                value={section.explanation}
                onChange={(value) =>
                  updateSection(
                    sectionIndex,
                    "explanation",
                    value
                  )
                }
                multiline
                rows={5}
                disabled={disabled}
              />

              {section.examples.map(
                (example, exampleIndex) => (
                  <div
                    key={exampleIndex}
                    className="space-y-4 rounded-lg border border-slate-800 bg-slate-950/40 p-4"
                  >
                    <h5 className="font-semibold text-slate-200">
                      Example {exampleIndex + 1}
                    </h5>

                    <TextField
                      label="Example Title"
                      value={example.title}
                      onChange={(value) =>
                        updateExample(
                          sectionIndex,
                          exampleIndex,
                          "title",
                          value
                        )
                      }
                      disabled={disabled}
                    />

                    <TextField
                      label="Example Content"
                      value={example.example}
                      onChange={(value) =>
                        updateExample(
                          sectionIndex,
                          exampleIndex,
                          "example",
                          value
                        )
                      }
                      multiline
                      rows={5}
                      disabled={disabled}
                    />

                    <TextField
                      label="Example Explanation"
                      value={example.explanation}
                      onChange={(value) =>
                        updateExample(
                          sectionIndex,
                          exampleIndex,
                          "explanation",
                          value
                        )
                      }
                      multiline
                      disabled={disabled}
                    />
                  </div>
                )
              )}
            </section>
          ))}

          <TextField
            label="Summary"
            value={content.summary}
            onChange={(value) =>
              updateContent("summary", value)
            }
            multiline
            rows={5}
            disabled={disabled}
          />
        </>
      )}

      {material.output_type === "flashcards" &&
        content.cards.map((card, cardIndex) => (
          <section
            key={cardIndex}
            className="space-y-4 rounded-xl border border-slate-700 p-4"
          >
            <h4 className="font-bold text-cyan-200">
              Flashcard {cardIndex + 1}
            </h4>

            <TextField
              label="Question"
              value={card.question}
              onChange={(value) =>
                updateCard(cardIndex, "question", value)
              }
              multiline
              disabled={disabled}
            />

            <TextField
              label="Answer"
              value={card.answer}
              onChange={(value) =>
                updateCard(cardIndex, "answer", value)
              }
              multiline
              disabled={disabled}
            />
          </section>
        ))}

      {material.output_type === "quiz" &&
        content.questions.map(
          (question, questionIndex) => (
            <section
              key={questionIndex}
              className="space-y-4 rounded-xl border border-slate-700 p-4"
            >
              <h4 className="font-bold text-cyan-200">
                Question {questionIndex + 1}
              </h4>

              <TextField
                label="Question Text"
                value={question.question}
                onChange={(value) =>
                  updateQuestion(
                    questionIndex,
                    "question",
                    value
                  )
                }
                multiline
                disabled={disabled}
              />

              {question.choices.map(
                (choice, choiceIndex) => (
                  <TextField
                    key={choiceIndex}
                    label={`Choice ${String.fromCharCode(
                      65 + choiceIndex
                    )}`}
                    value={choice}
                    onChange={(value) =>
                      updateChoice(
                        questionIndex,
                        choiceIndex,
                        value
                      )
                    }
                    multiline
                    rows={2}
                    disabled={disabled}
                  />
                )
              )}

              <div>
                <label
                  htmlFor={`${id}-correct-${questionIndex}`}
                  className="block text-sm font-semibold text-slate-300"
                >
                  Correct Answer
                </label>

                <select
                  id={`${id}-correct-${questionIndex}`}
                  value={question.correct_answer_index ?? ""}
                  onChange={(event) =>
                    updateQuestion(
                      questionIndex,
                      "correct_answer_index",
                      event.target.value === ""
                        ? null
                        : Number(event.target.value)
                    )
                  }
                  disabled={disabled}
                  className={FIELD_CLASS}
                >
                  <option value="">
                    Choose the correct answer
                  </option>
                  {question.choices.map(
                    (_, choiceIndex) => (
                      <option
                        key={choiceIndex}
                        value={choiceIndex}
                      >
                        Choice{" "}
                        {String.fromCharCode(
                          65 + choiceIndex
                        )}
                      </option>
                    )
                  )}
                </select>
              </div>

              <TextField
                label="Answer Explanation"
                value={question.explanation}
                onChange={(value) =>
                  updateQuestion(
                    questionIndex,
                    "explanation",
                    value
                  )
                }
                multiline
                disabled={disabled}
              />
            </section>
          )
        )}
    </div>
  );
}

export default LearningMaterialEditor;