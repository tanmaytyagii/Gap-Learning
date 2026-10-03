# Content audit

An audit of the curated content in [`shared/question-bank.json`](../shared/question-bank.json) (66 questions) and [`shared/curriculum.json`](../shared/curriculum.json) (3 subjects, 11 topics with lessons, 60 misconceptions).

The goal was to find anything that could mark a correct learner wrong, mislead the misconception diagnosis, or confuse a learner. Changes were limited to copy-edits that alter no subject-matter claim; everything that needs a judgement call is listed under [Needs human review](#needs-human-review) with a proposed resolution, and the content was left as it is.

## Method

1. **Automated checks**, now enforced by the test suite (`src/adaptive/engine.test.ts`), so they cannot regress:
   - every question references an existing topic, and its answer is one of its options;
   - options are unique within a question;
   - every misconception tag refers to a cataloged misconception and sits on a wrong option;
   - tags only use misconceptions from the question's own subject (or the general ones);
   - no two questions share both a stem and a set of options;
   - prerequisites stay inside a subject, and every subject's graph is acyclic;
   - every topic has at least two questions per difficulty and a lesson.
2. **One-off measurements**: where the correct answer sits among the options, how often it is the longest option, untagged distractors, and repeated tags within a question.
3. **Manual review** of every question (stem, answer, distractors, tags, hint, solution, difficulty) and every lesson (summary, key points, worked example), plus the prerequisite edges.

## Summary

| Severity | Found | Fixed | Needs human review |
|---|---|---|---|
| High: could mis-grade or mislead diagnosis | 2 | 1 (in code) | 1 |
| Medium: inconsistent or ambiguous | 4 | 1 (copy-edit) | 3 |
| Low: wording, style, tagging precision | 14 | 4 (copy-edits) | 10 |

No answer was found to be factually wrong. All 11 lesson examples were recomputed and are correct.

## Fixed

| ID | Finding | Fix |
|---|---|---|
| H1 | **Answer-position bias.** The correct answer was the first option in 49 of 66 questions (74%), second in 13, third in 4, and never fourth. Always choosing "A" would have scored well and distorted every mastery and gap metric. The question form also defaulted the correct answer to the first option, so learner-written questions would repeat it. | Options are now displayed in a seeded shuffle per session and question (`src/utils/shuffle.ts`, used in `PracticeSessionPage`). The order is stable within a session and varies between sessions. A unit test checks the first option lands in each position about 25% of the time. Answers are matched by text, so diagnosis is unaffected. |
| M4 | **Duplicate stem.** `present-h1` and `perfect-h2` were both "Which sentence is correct?", which made them indistinguishable in lists and reports. | Stems made specific: "Which sentence uses the verb “know” correctly?" and "Which sentence about losing a phone is correct?". |
| L1 | `past-h2` stem omitted the verbs; only the options revealed them. | Added base verbs: "I ____ (walk) home when I ____ (see) an old friend." |
| L2 | `present-e1` had a comma splice ("Be quiet, the baby …"). | "Be quiet! The baby ____ right now." |
| L3 | Math text used "x" for multiplication (`frac-ops-h1` stem and four solutions). | Replaced with "×". |
| L14 | Mixed British and American spelling across content and interface (e.g. "Metre per second", "Practise", "centre" next to "Practice" and "Practicing"). | Standardized on American English everywhere, including the matching misconception-map key for `force-e2`. |

## Needs human review

### High

**H2: `frac-ops-h1`, distractor "6/5" tagged `cross_multiply_confusion`.** The question is 3/5 × 10/12. Cross-multiplying gives 36/50 (18/25), not 6/5, and I could not find another common error that produces 6/5. A learner choosing it is told they cross-multiplied, which may be untrue.
*Proposed:* replace "6/5" with "18/25" (the actual cross-multiplication result) and keep the tag, or keep "6/5" and untag it.

### Medium

**M1: Lesson and questions disagree on simplifying.** The Fraction Operations lesson says "Always simplify the final answer to lowest terms", but `frac-ops-e1` (2/9 + 4/9 → 6/9) and `frac-ops-e2` (7/10 − 3/10 → 4/10) accept unsimplified answers. The simplified forms are not offered, so nothing is mis-graded, but it contradicts the lesson.
*Proposed:* make the correct options 2/3 and 2/5 and add the unsimplified forms as distractors tagged `incomplete_simplification`, or soften the lesson to "simplify when asked for simplest form".

**M2: `netforce-m1` (the question originally added through the old teacher form).** The option "Less than zero" treats net force as a signed number with no direction convention, and the stem uses mph in an otherwise SI question set.
*Proposed:* "60 mph" → "about 27 m/s", and replace "Less than zero" with "A constant backward force".

**M3: `present-h2` may have two acceptable answers.** "This week I ____ from home because the office is being renovated." expects "am working"; some speakers accept "work" for an arrangement.
*Proposed:* strengthen the temporary signal, e.g. "Just for this week, while the office is being renovated, I ____ from home."

### Low

| ID | Item | Proposed |
|---|---|---|
| L4 | Untagged distractors: `gravity-e1` "Acceleration", `gravity-m2` "The feather, because it is lighter", `netforce-m1` "Depends on the car's weight", `reaction-e2` "Gravity pulls the swimmer forward". Choosing them gives the generic "unclassified error" feedback. | Tag where a misconception clearly applies (e.g. the feather option → `heavier_falls_faster` reversed, or a new "lighter falls faster" entry). |
| L5 | All three distractors share one tag in `netforce-e1`, `netforce-m2` (`newton_second_law_error`) and `netforce-h1` (`force_motion_link`), so these questions cannot tell errors apart. 11 more questions tag two distractors alike. | Split where errors differ, e.g. `netforce-e1` "20 m/s²" (multiplied) vs "10 m/s²" (ignored mass). |
| L6 | Loose tag fits: `gravity-e1` "Force" → `mass_weight_equivalence`; `gravity-h2` "engines cancel gravity" → `net_force_confusion`; `netforce-h1` "Equal to its speed" → `force_motion_link` (`force_energy_confusion` fits better); `frac-equiv-m1` "20" → `doubled_denominator`. | Re-tag after review. |
| L7 | `force-h2` assumes the car is already moving (implied only by "air resistance"). | Add "A moving car's engine…". |
| L8 | `frac-equiv-h2` "Which pair of fractions are equivalent?" | "Which pair of fractions is equivalent?" |
| L9 | Dialect: `perfect-e1` treats "result that matters now" as present perfect only; American English also accepts simple past ("I finished my homework"). It is not offered, so nothing is mis-graded. `perfect-h1` correctly rejects "am living … since", which is common in Indian English. | Note the convention in the lesson. |
| L10 | Debatable prerequisite edges: Fraction Operations ← Comparing Fractions, and Action & Reaction ← Net Force & Motion. They affect "untested prerequisite" gaps and the roadmap order. | Confirm with a subject expert. |
| L11 | Difficulty labels are the author's judgement and have not been calibrated against learner data (e.g. `present-m1`, "Water ____ at 100 °C", is labeled medium). | Calibrate from aggregated answers once multi-learner data exists. |
| L12 | The correct answer is the uniquely longest option in 10 of 66 questions (15%, below the 25% chance rate), most visibly `reaction-h2`. | Shorten that option or lengthen its distractors. |
| L13 | The internal misconception id `past_habit_confusion` is about present tenses (its title is "Habit vs. Progressive Confusion"). Learners never see the id. | Rename in a future content version with a data migration. |

## Keeping it this way

- New curated questions must pass the automated checks above (`npm test`).
- Questions written by learners or generated by AI pass the shared validator in `src/domain/questionValidation.ts`: lengths, unique options, answer among the options, valid tags, and no duplicate wording on the same topic.
- Option order is always shuffled at display time, so authoring order never becomes a cue.
