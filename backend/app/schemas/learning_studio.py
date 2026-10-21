from typing import Annotated, Literal, Union

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    StringConstraints,
    model_validator,
)


ExperienceLevel = Literal["beginner", "intermediate", "advanced"]
OutputType = Literal["lesson", "flashcards", "quiz"]

MAX_SOURCE_TEXT_LENGTH = 40000
SUPPORTED_QUIZ_QUESTION_COUNTS = (5, 10, 15)
DEFAULT_QUIZ_QUESTION_COUNT = 5

NonEmptyText = Annotated[
    str,
    StringConstraints(
        strict=True,
        strip_whitespace=True,
        min_length=1,
        max_length=12000,
    ),
]

TopicText = Annotated[
    str,
    StringConstraints(
        strict=True,
        strip_whitespace=True,
        min_length=1,
        max_length=200,
    ),
]

GoalText = Annotated[
    str,
    StringConstraints(
        strict=True,
        strip_whitespace=True,
        max_length=1000,
    ),
]

SourceText = Annotated[
    str,
    StringConstraints(
        strict=True,
        strip_whitespace=True,
        max_length=MAX_SOURCE_TEXT_LENGTH,
    ),
]

QuizQuestionCount = Annotated[
    int,
    Field(
        strict=True,
        ge=5,
        le=15,
        description="Supported quiz question counts: 5, 10, or 15.",
    ),
]


class StrictModel(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        strict=True,
    )


class LearningStudioRequest(StrictModel):
    topic: TopicText
    learning_goal: GoalText = ""
    experience_level: ExperienceLevel = "beginner"
    output_type: OutputType = "lesson"
    source_text: SourceText = ""
    question_count: QuizQuestionCount = DEFAULT_QUIZ_QUESTION_COUNT

    @model_validator(mode="after")
    def validate_source_text(self):
        if self.source_text and self.output_type != "quiz":
            raise ValueError(
                "Uploaded class notes can only be used for quizzes."
            )

        return self

    @model_validator(mode="after")
    def validate_question_count(self):
        if self.question_count not in SUPPORTED_QUIZ_QUESTION_COUNTS:
            raise ValueError(
                "Choose a quiz question count of 5, 10, or 15."
            )

        if (
            self.output_type != "quiz"
            and self.question_count != DEFAULT_QUIZ_QUESTION_COUNT
        ):
            raise ValueError(
                "Custom question counts can only be used for quizzes."
            )

        return self


class LearningStudioUploadResponse(StrictModel):
    filename: Annotated[
        str,
        StringConstraints(
            strict=True,
            strip_whitespace=True,
            min_length=1,
            max_length=255,
        ),
    ]
    source_text: Annotated[
        str,
        StringConstraints(
            strict=True,
            strip_whitespace=True,
            min_length=1,
            max_length=MAX_SOURCE_TEXT_LENGTH,
        ),
    ]
    character_count: int = Field(
        strict=True,
        ge=1,
        le=MAX_SOURCE_TEXT_LENGTH,
    )

    @model_validator(mode="after")
    def validate_character_count(self):
        if self.character_count != len(self.source_text):
            raise ValueError(
                "Character count must match the extracted text length."
            )

        return self


class LessonExample(StrictModel):
    title: NonEmptyText
    example: NonEmptyText
    explanation: NonEmptyText


class LessonSection(StrictModel):
    heading: NonEmptyText
    explanation: NonEmptyText
    examples: list[LessonExample] = Field(
        min_length=1,
        max_length=5,
    )


class LessonContent(StrictModel):
    title: NonEmptyText
    introduction: NonEmptyText
    learning_objectives: list[NonEmptyText] = Field(
        min_length=1,
        max_length=10,
    )
    sections: list[LessonSection] = Field(
        min_length=1,
        max_length=8,
    )
    summary: NonEmptyText


class Flashcard(StrictModel):
    question: NonEmptyText
    answer: NonEmptyText


class FlashcardsContent(StrictModel):
    title: NonEmptyText
    cards: list[Flashcard] = Field(
        min_length=1,
        max_length=20,
    )


class QuizQuestion(StrictModel):
    question: NonEmptyText
    choices: list[NonEmptyText] = Field(
        min_length=4,
        max_length=4,
    )
    correct_answer_index: int = Field(
        strict=True,
        ge=0,
        le=3,
    )
    explanation: NonEmptyText

    @model_validator(mode="after")
    def validate_distinct_choices(self):
        normalized_choices = [
            choice.casefold() for choice in self.choices
        ]

        if len(set(normalized_choices)) != 4:
            raise ValueError("Quiz choices must be distinct.")

        return self


class QuizContent(StrictModel):
    title: NonEmptyText
    questions: list[QuizQuestion] = Field(
        min_length=1,
        max_length=15,
    )


class LessonResponse(StrictModel):
    output_type: Literal["lesson"]
    topic: TopicText
    learning_goal: GoalText
    experience_level: ExperienceLevel
    content: LessonContent


class FlashcardsResponse(StrictModel):
    output_type: Literal["flashcards"]
    topic: TopicText
    learning_goal: GoalText
    experience_level: ExperienceLevel
    content: FlashcardsContent


class QuizResponse(StrictModel):
    output_type: Literal["quiz"]
    topic: TopicText
    learning_goal: GoalText
    experience_level: ExperienceLevel
    content: QuizContent


LearningStudioResponse = Annotated[
    Union[
        LessonResponse,
        FlashcardsResponse,
        QuizResponse,
    ],
    Field(discriminator="output_type"),
]