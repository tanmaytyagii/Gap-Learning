const fs = require('node:fs');

/** Loads the shared curriculum so the API validates against the same concepts as the client. */
function loadCurriculum(file) {
  const curriculum = JSON.parse(fs.readFileSync(file, 'utf8'));
  const concepts = new Map(curriculum.concepts.map((concept) => [concept.id, concept]));
  const misconceptions = new Set(curriculum.misconceptions.map((item) => item.id));
  return {
    concepts,
    misconceptions,
    subjects: new Map(curriculum.subjects.map((subject) => [subject.id, subject])),
  };
}

module.exports = { loadCurriculum };
