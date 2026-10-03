const fs = require('node:fs/promises');
const path = require('node:path');
const { randomUUID } = require('node:crypto');

/**
 * The curated seed bank ships read-only with the code. Admin changes are kept in a small overlay
 * file (added/edited questions plus ids of removed ones), so a new seed release is picked up
 * automatically and runtime writes never touch tracked files.
 */
class QuestionStore {
  constructor({ seedFile, overlayFile, curriculum }) {
    this.seedFile = seedFile;
    this.overlayFile = overlayFile;
    this.curriculum = curriculum;
    this.seed = [];
    this.overlay = { version: 1, questions: [], deleted: [] };
    this.writeQueue = Promise.resolve();
  }

  async init() {
    this.seed = JSON.parse(await fs.readFile(this.seedFile, 'utf8'));
    try {
      const saved = JSON.parse(await fs.readFile(this.overlayFile, 'utf8'));
      this.overlay = {
        version: 1,
        questions: Array.isArray(saved.questions) ? saved.questions : [],
        deleted: Array.isArray(saved.deleted) ? saved.deleted : [],
      };
    } catch (error) {
      if (error.code !== 'ENOENT') throw new Error(`Could not read ${this.overlayFile}: ${error.message}`, { cause: error });
    }
    return this;
  }

  all() {
    const deleted = new Set(this.overlay.deleted);
    const overridden = new Set(this.overlay.questions.map((question) => question.id));
    return [
      ...this.seed.filter((question) => !deleted.has(question.id) && !overridden.has(question.id)),
      ...this.overlay.questions.filter((question) => !deleted.has(question.id)),
    ].filter((question) => this.curriculum.concepts.has(question.concept));
  }

  list({ concept, subject, difficulty } = {}) {
    return this.all().filter((question) => {
      if (concept && question.concept !== concept) return false;
      if (difficulty && question.difficulty !== difficulty) return false;
      if (subject && this.curriculum.concepts.get(question.concept)?.subject !== subject) return false;
      return true;
    });
  }

  get(id) {
    return this.all().find((question) => question.id === id) ?? null;
  }

  async create(value) {
    const question = { id: `${value.concept}-${randomUUID().slice(0, 8)}`, ...value };
    this.overlay.questions.push(question);
    await this.persist();
    return question;
  }

  async update(id, value) {
    if (!this.get(id)) return null;
    const question = { id, ...value };
    this.overlay.questions = [...this.overlay.questions.filter((item) => item.id !== id), question];
    await this.persist();
    return question;
  }

  async remove(id) {
    if (!this.get(id)) return false;
    this.overlay.questions = this.overlay.questions.filter((item) => item.id !== id);
    if (this.seed.some((question) => question.id === id)) this.overlay.deleted.push(id);
    await this.persist();
    return true;
  }

  /** Writes are serialized and atomic (temp file + rename) so a crash cannot leave half a file. */
  persist() {
    const snapshot = JSON.stringify(this.overlay, null, 2);
    this.writeQueue = this.writeQueue.then(async () => {
      await fs.mkdir(path.dirname(this.overlayFile), { recursive: true });
      const temp = `${this.overlayFile}.${process.pid}.tmp`;
      await fs.writeFile(temp, snapshot, 'utf8');
      await fs.rename(temp, this.overlayFile);
    });
    return this.writeQueue;
  }
}

module.exports = { QuestionStore };
