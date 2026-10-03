const DIFFICULTIES = ['easy', 'medium', 'hard'];

const LIMITS = {
  question: [5, 500],
  option: [1, 200],
  hint: 300,
  solutionSteps: 1000,
  learningObjective: 200,
  minOptions: 2,
  maxOptions: 6,
};

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Validates and normalises a question submitted to the API. Returns either the cleaned value or a
 * list of field-level errors; unknown fields are ignored and ids are always assigned by the server.
 */
function validateQuestionInput(input, curriculum) {
  const errors = [];
  const fail = (field, message) => errors.push({ field, message });

  if (!isPlainObject(input)) {
    return { errors: [{ field: 'body', message: 'Expected a JSON object.' }] };
  }

  const concept = typeof input.concept === 'string' ? curriculum.concepts.get(input.concept) : undefined;
  if (!concept) fail('concept', 'Must be the id of a concept in the curriculum.');

  const difficulty = input.difficulty;
  if (!DIFFICULTIES.includes(difficulty)) fail('difficulty', `Must be one of: ${DIFFICULTIES.join(', ')}.`);

  const question = typeof input.question === 'string' ? input.question.trim() : '';
  if (question.length < LIMITS.question[0] || question.length > LIMITS.question[1]) {
    fail('question', `Must be ${LIMITS.question[0]}–${LIMITS.question[1]} characters.`);
  }

  let options = [];
  if (!Array.isArray(input.options) || !input.options.every((option) => typeof option === 'string')) {
    fail('options', 'Must be an array of strings.');
  } else {
    options = input.options.map((option) => option.trim());
    if (options.length < LIMITS.minOptions || options.length > LIMITS.maxOptions) {
      fail('options', `Provide ${LIMITS.minOptions}–${LIMITS.maxOptions} options.`);
    }
    if (options.some((option) => option.length < LIMITS.option[0] || option.length > LIMITS.option[1])) {
      fail('options', `Each option must be ${LIMITS.option[0]}–${LIMITS.option[1]} characters.`);
    }
    if (new Set(options.map((option) => option.toLowerCase())).size !== options.length) {
      fail('options', 'Options must be unique.');
    }
  }

  const correctAnswer = typeof input.correctAnswer === 'string' ? input.correctAnswer.trim() : '';
  if (!options.includes(correctAnswer)) fail('correctAnswer', 'Must match one of the options exactly.');

  const optionalText = (field, max) => {
    const value = input[field];
    if (value === undefined || value === null) return '';
    if (typeof value !== 'string') {
      fail(field, 'Must be a string.');
      return '';
    }
    if (value.trim().length > max) fail(field, `Must be at most ${max} characters.`);
    return value.trim();
  };
  const hint = optionalText('hint', LIMITS.hint);
  const solutionSteps = optionalText('solutionSteps', LIMITS.solutionSteps);
  const learningObjective = optionalText('learningObjective', LIMITS.learningObjective) || concept?.learningObjective || '';

  const misconceptionMap = {};
  if (input.misconceptionMap !== undefined) {
    if (!isPlainObject(input.misconceptionMap)) {
      fail('misconceptionMap', 'Must be an object mapping wrong options to misconception ids.');
    } else {
      Object.entries(input.misconceptionMap).forEach(([option, id]) => {
        const key = option.trim();
        if (!options.includes(key) || key === correctAnswer) {
          fail('misconceptionMap', `"${option}" is not one of the wrong options.`);
        } else if (typeof id !== 'string' || !curriculum.misconceptions.has(id)) {
          fail('misconceptionMap', `"${id}" is not a known misconception id.`);
        } else {
          misconceptionMap[key] = id;
        }
      });
    }
  }

  if (errors.length > 0) return { errors };
  return {
    value: {
      concept: concept.id,
      difficulty,
      learningObjective,
      question,
      options,
      correctAnswer,
      hint,
      solutionSteps,
      misconceptionMap,
    },
  };
}

module.exports = { validateQuestionInput, DIFFICULTIES, LIMITS };
