export const LEARNING_STUDIO_CONTENT_TYPES = {
  lesson: "learning-studio-lesson",
  flashcards: "learning-studio-flashcards",
  quiz: "learning-studio-quiz",
};

export const LEARNING_STUDIO_LABELS = {
  lesson: "Lesson",
  flashcards: "Flashcards",
  quiz: "Quiz",
};

const EXPERIENCE_LEVELS = [
  "beginner",
  "intermediate",
  "advanced",
];

const isText = (value, maximumLength = 12000) =>
  typeof value === "string" &&
  value.trim().length > 0 &&
  value.length <= maximumLength;

const isList = (value, minimumLength, maximumLength) =>
  Array.isArray(value) &&
  value.length >= minimumLength &&
  value.length <= maximumLength;

const requireValid = (condition, message) => {
  if (!condition) {
    throw new Error(message);
  }
};

export function getLearningOutputType(contentType) {
  return (
    Object.entries(LEARNING_STUDIO_CONTENT_TYPES).find(
      ([, type]) => type === contentType
    )?.[0] || null
  );
}

export function isLearningStudioContent(contentType) {
  return getLearningOutputType(contentType) !== null;
}

export function validateLearningMaterial(
  material,
  expectedOutputType = null
) {
  requireValid(
    material &&
      typeof material === "object" &&
      !Array.isArray(material),
    "The learning material must be an object."
  );

  requireValid(
    Object.hasOwn(
      LEARNING_STUDIO_CONTENT_TYPES,
      material.output_type
    ),
    "Choose a valid learning material type."
  );

  requireValid(
    !expectedOutputType ||
      material.output_type === expectedOutputType,
    "The content type does not match the learning material."
  );

  requireValid(
    isText(material.topic, 200),
    "Topic must contain between 1 and 200 characters."
  );

  requireValid(
    typeof material.learning_goal === "string" &&
      material.learning_goal.length <= 1000,
    "Learning goal must be text with at most 1,000 characters."
  );

  requireValid(
    EXPERIENCE_LEVELS.includes(material.experience_level),
    "Choose a valid experience level."
  );

  const content = material.content;

  requireValid(
    content &&
      typeof content === "object" &&
      !Array.isArray(content) &&
      isText(content.title),
    "The learning material needs a valid title."
  );

  if (material.output_type === "lesson") {
    requireValid(
      isText(content.introduction),
      "The lesson needs an introduction."
    );

    requireValid(
      isText(content.summary),
      "The lesson needs a summary."
    );

    requireValid(
      isList(content.learning_objectives, 1, 10) &&
        content.learning_objectives.every(
          (objective) => isText(objective)
        ),
      "Provide between 1 and 10 nonempty learning objectives."
    );

    requireValid(
      isList(content.sections, 1, 8),
      "Provide between 1 and 8 lesson sections."
    );

    content.sections.forEach((section, sectionIndex) => {
      const label = `Section ${sectionIndex + 1}`;

      requireValid(
        section &&
          isText(section.heading) &&
          isText(section.explanation),
        `${label} needs a heading and explanation.`
      );

      requireValid(
        isList(section.examples, 1, 5),
        `${label} needs between 1 and 5 examples.`
      );

      section.examples.forEach((example, exampleIndex) => {
        requireValid(
          example &&
            isText(example.title) &&
            isText(example.example) &&
            isText(example.explanation),
          `${label}, example ${
            exampleIndex + 1
          } needs a title, example, and explanation.`
        );
      });
    });
  }

  if (material.output_type === "flashcards") {
    requireValid(
      isList(content.cards, 1, 20),
      "Provide between 1 and 20 flashcards."
    );

    content.cards.forEach((card, index) => {
      requireValid(
        card &&
          isText(card.question) &&
          isText(card.answer),
        `Flashcard ${index + 1} needs a question and answer.`
      );
    });
  }

  if (material.output_type === "quiz") {
    requireValid(
      isList(content.questions, 1, 15),
      "Provide between 1 and 15 quiz questions."
    );

    content.questions.forEach((question, index) => {
      const label = `Question ${index + 1}`;

      requireValid(
        question && isText(question.question),
        `${label} needs question text.`
      );

      requireValid(
        isList(question.choices, 4, 4) &&
          question.choices.every((choice) => isText(choice)),
        `${label} needs four nonempty answer choices.`
      );

      requireValid(
        new Set(
          question.choices.map((choice) =>
            choice.trim().toLowerCase()
          )
        ).size === 4,
        `${label} must have four distinct answer choices.`
      );

      requireValid(
        Number.isInteger(question.correct_answer_index) &&
          question.correct_answer_index >= 0 &&
          question.correct_answer_index < 4,
        `${label} needs a correct answer selection.`
      );

      requireValid(
        isText(question.explanation),
        `${label} needs an explanation.`
      );
    });
  }

  return material;
}

export function parseLearningMaterial(body, contentType) {
  const outputType = getLearningOutputType(contentType);

  if (!outputType) {
    throw new Error("This is not Learning Studio content.");
  }

  let material;

  try {
    material = JSON.parse(body);
  } catch {
    throw new Error(
      "The saved learning material contains invalid JSON."
    );
  }

  return validateLearningMaterial(material, outputType);
}

export function serializeLearningMaterial(material) {
  return JSON.stringify(validateLearningMaterial(material));
}

export function getLearningMaterialPreview(
  body,
  contentType,
  maximumLength = 220
) {
  try {
    const material = parseLearningMaterial(body, contentType);
    const label = LEARNING_STUDIO_LABELS[material.output_type];

    const text = [
      label,
      material.topic,
      material.content.title,
      material.learning_goal,
    ]
      .filter(Boolean)
      .join(" · ")
      .replace(/\s+/g, " ")
      .trim();

    return text.length <= maximumLength
      ? text
      : `${text.slice(0, maximumLength).trim()}…`;
  } catch {
    return "This learning material could not be previewed.";
  }
}

export function getLearningMaterialFileName(
  title,
  extension
) {
  const safeTitle =
    String(title || "learning-material")
      .replace(/[<>:"/\\|?*]/g, "")
      .trim()
      .replace(/\s+/g, "-") || "learning-material";

  return `${safeTitle}.${extension}`;
}

export function learningMaterialToMarkdown(material) {
  validateLearningMaterial(material);

  const content = material.content;
  const level =
    material.experience_level.charAt(0).toUpperCase() +
    material.experience_level.slice(1);

  const lines = [
    `## ${content.title}`,
    "",
    `Topic: ${material.topic}`,
    `Format: ${LEARNING_STUDIO_LABELS[material.output_type]}`,
    `Experience Level: ${level}`,
    "",
  ];

  if (material.learning_goal.trim()) {
    lines.push(
      "### Learning Goal",
      "",
      material.learning_goal,
      ""
    );
  }

  if (material.output_type === "lesson") {
    lines.push(
      "### Introduction",
      "",
      content.introduction,
      "",
      "### Learning Objectives",
      ""
    );

    content.learning_objectives.forEach(
      (objective, index) => {
        lines.push(`${index + 1}. ${objective}`);
      }
    );

    lines.push("");

    content.sections.forEach((section) => {
      lines.push(
        `### ${section.heading}`,
        "",
        section.explanation,
        ""
      );

      section.examples.forEach((example, index) => {
        lines.push(
          `#### Example ${index + 1}: ${example.title}`,
          "",
          example.example,
          "",
          "Explanation:",
          "",
          example.explanation,
          ""
        );
      });
    });

    lines.push("### Summary", "", content.summary, "");
  }

  if (material.output_type === "flashcards") {
    content.cards.forEach((card, index) => {
      lines.push(
        `### Flashcard ${index + 1}`,
        "",
        "Question:",
        "",
        card.question,
        "",
        "Answer:",
        "",
        card.answer,
        ""
      );
    });
  }

  if (material.output_type === "quiz") {
    lines.push("### Questions", "");

    content.questions.forEach((question, index) => {
      lines.push(
        `#### Question ${index + 1}`,
        "",
        question.question,
        ""
      );

      question.choices.forEach((choice, choiceIndex) => {
        const letter = String.fromCharCode(65 + choiceIndex);
        lines.push(`${letter}. ${choice}`);
      });

      lines.push("");
    });

    lines.push("### Answer Key and Explanations", "");

    content.questions.forEach((question, index) => {
      const answerIndex = question.correct_answer_index;
      const letter = String.fromCharCode(65 + answerIndex);

      lines.push(
        `#### Question ${index + 1}`,
        "",
        `Correct Answer: ${letter}. ${
          question.choices[answerIndex]
        }`,
        "",
        "Explanation:",
        "",
        question.explanation,
        ""
      );
    });
  }

  return lines.join("\n").trim();
}