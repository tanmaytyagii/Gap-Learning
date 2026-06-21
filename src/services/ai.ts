export interface DiagnosticResult {
  isCorrect: boolean;
  misconceptionId: string;
  explanation: string;
  suggestedNextConcept: string;
}

export interface Question {
  id: string;
  concept: string;
  question: string;
  correctAnswer: string;
  solutionSteps: string;
  hint: string;
  difficulty: 'easy' | 'medium' | 'hard';
  options?: string[];
}

export interface ChatMessage {
  sender: 'student' | 'tutor';
  text: string;
}

// Global Subjects
export const SUBJECTS = {
  math: { name: 'Mathematics', emoji: '📐', startConcept: 'frac_visual' },
  science: { name: 'Science & Physics', emoji: '⚡', startConcept: 'sci_force' },
  english: { name: 'English Grammar', emoji: '✍️', startConcept: 'eng_present' }
};

// Concepts Grouped by Subject
export const CONCEPTS: Record<string, Record<string, {
  id: string;
  name: string;
  description: string;
  difficulty: 'easy' | 'medium' | 'hard';
  prerequisites: string[];
}>> = {
  math: {
    frac_visual: {
      id: 'frac_visual',
      name: 'Visualizing Fractions',
      description: 'Understanding numerators, denominators, and parts of a whole.',
      difficulty: 'easy',
      prerequisites: []
    },
    frac_equiv: {
      id: 'frac_equiv',
      name: 'Equivalent Fractions',
      description: 'Scaling fractions up and down using multiplication.',
      difficulty: 'medium',
      prerequisites: ['frac_visual']
    },
    frac_add_like: {
      id: 'frac_add_like',
      name: 'Adding with Like Denominators',
      description: 'Adding fractions that share the same denominator.',
      difficulty: 'medium',
      prerequisites: ['frac_visual']
    },
    frac_add_unlike: {
      id: 'frac_add_unlike',
      name: 'Adding with Unlike Denominators',
      description: 'Finding common denominators and scaling fractions before adding.',
      difficulty: 'hard',
      prerequisites: ['frac_equiv', 'frac_add_like']
    },
    frac_multiply: {
      id: 'frac_multiply',
      name: 'Multiplying Fractions',
      description: 'Multiplying numerators and denominators straight across.',
      difficulty: 'hard',
      prerequisites: ['frac_equiv']
    }
  },
  science: {
    sci_force: {
      id: 'sci_force',
      name: 'Concept of Force',
      description: 'Understanding forces as pushes or pulls, measured in Newtons (N).',
      difficulty: 'easy',
      prerequisites: []
    },
    sci_gravity: {
      id: 'sci_gravity',
      name: 'Gravity, Mass & Weight',
      description: 'Differentiating mass (matter) from weight (gravitational force, W=mg).',
      difficulty: 'medium',
      prerequisites: ['sci_force']
    },
    sci_net_force: {
      id: 'sci_net_force',
      name: 'Net Force & Motion',
      description: 'Calculating net force and applying Newton\'s First and Second Laws.',
      difficulty: 'hard',
      prerequisites: ['sci_force']
    },
    sci_action_reaction: {
      id: 'sci_action_reaction',
      name: 'Action & Reaction',
      description: 'Understanding Newton\'s Third Law: Equal and opposite forces in pairs.',
      difficulty: 'hard',
      prerequisites: ['sci_force']
    }
  },
  english: {
    eng_present: {
      id: 'eng_present',
      name: 'Present & Progressive Tenses',
      description: 'Differentiating simple present (habits) from present progressive (now).',
      difficulty: 'easy',
      prerequisites: []
    },
    eng_past: {
      id: 'eng_past',
      name: 'Past Tense Contrast',
      description: 'Using simple past vs. past continuous (interrupted actions).',
      difficulty: 'medium',
      prerequisites: ['eng_present']
    },
    eng_perfect: {
      id: 'eng_perfect',
      name: 'Present Perfect vs. Past',
      description: 'Using Present Perfect for experiences/ongoing links vs. Simple Past.',
      difficulty: 'hard',
      prerequisites: ['eng_past']
    }
  }
};

// Comprehensive Question Pool for all subjects
export const MOCK_QUESTIONS: Record<string, Question[]> = {
  // Math
  frac_visual: [
    {
      id: 'vis_1',
      concept: 'frac_visual',
      question: 'A chocolate bar is divided into 8 equal pieces. Leo eats 3 pieces. What fraction of the chocolate bar is left?',
      correctAnswer: '5/8',
      solutionSteps: '1. The total number of pieces is 8 (this is the denominator).\n2. Leo eats 3 pieces, which leaves 8 - 3 = 5 pieces.\n3. The fraction left is 5 out of 8, written as 5/8.',
      hint: 'Be careful! The question asks for the fraction of chocolate bar that is LEFT, not what Leo ate.',
      difficulty: 'easy',
      options: ['3/8', '5/8', '5/3', '5']
    }
  ],
  frac_equiv: [
    {
      id: 'eq_1',
      concept: 'frac_equiv',
      question: 'Find the missing number to make the fractions equivalent: 2/5 = ?/15',
      correctAnswer: '6',
      solutionSteps: '1. Look at the denominators: we go from 5 to 15.\n2. We multiply 5 * 3 = 15.\n3. To keep it equivalent, we multiply the numerator by the same: 2 * 3 = 6.',
      hint: 'Identify the number you multiply 5 by to get 15. Then multiply 2 by that same number.',
      difficulty: 'medium',
      options: ['12', '6', '10', '8']
    }
  ],
  frac_add_like: [
    {
      id: 'add_like_1',
      concept: 'frac_add_like',
      question: 'Solve: 3/10 + 4/10',
      correctAnswer: '7/10',
      solutionSteps: '1. Denominators are the same (10), so keep the bottom as 10.\n2. Add the numerators: 3 + 4 = 7.\n3. Result is 7/10.',
      hint: 'Only add the top numbers. Keep the bottom number the same.',
      difficulty: 'medium',
      options: ['7/20', '7/10', '12/100', '1/10']
    }
  ],
  frac_add_unlike: [
    {
      id: 'add_un_1',
      concept: 'frac_add_unlike',
      question: 'Solve: 1/2 + 1/3',
      correctAnswer: '5/6',
      solutionSteps: '1. Denominators (2 and 3) are different. The common denominator is 6.\n2. Convert 1/2: multiply top and bottom by 3 to get 3/6.\n3. Convert 1/3: multiply top and bottom by 2 to get 2/6.\n4. Add: 3/6 + 2/6 = 5/6.',
      hint: 'Find a common denominator (6) and scale both fractions before adding.',
      difficulty: 'hard',
      options: ['2/5', '5/6', '2/6', '1/6']
    }
  ],
  frac_multiply: [
    {
      id: 'mult_1',
      concept: 'frac_multiply',
      question: 'Solve and simplify: 2/3 * 3/4',
      correctAnswer: '1/2',
      solutionSteps: '1. Multiply across: 2 * 3 = 6 (numerator) and 3 * 4 = 12 (denominator).\n2. This gives 6/12.\n3. Simplify 6/12 by dividing top and bottom by 6 to get 1/2.',
      hint: 'Multiply the top numbers, then multiply the bottom numbers, and simplify the fraction.',
      difficulty: 'hard',
      options: ['5/7', '8/9', '1/2', '6/7']
    }
  ],

  // Science / Physics
  sci_force: [
    {
      id: 'force_1',
      concept: 'sci_force',
      question: 'A book sits stationary on a table. Which of the following statements is true about the forces acting on the book?',
      correctAnswer: 'Gravity pulls it down and the table pushes it up with equal forces.',
      solutionSteps: '1. Since the book is stationary, the forces acting on it must be balanced (net force = 0).\n2. Gravity pulls the book downwards with force equal to its weight.\n3. The table exerts an upward force (normal force) that matches gravity exactly.',
      hint: 'Newton\'s First Law says an object at rest stays at rest because forces are balanced.',
      difficulty: 'easy',
      options: [
        'There are no forces acting on the book because it is not moving.',
        'Gravity pulls it down and the table pushes it up with equal forces.',
        'Only gravity acts on the book, pulling it down.',
        'The table pushes it up with a force greater than gravity.'
      ]
    }
  ],
  sci_gravity: [
    {
      id: 'grav_1',
      concept: 'sci_gravity',
      question: 'An astronaut travels from Earth to the Moon. How do their mass and weight change? (Moon gravity is 1/6th of Earth\'s)',
      correctAnswer: 'Mass stays the same; weight decreases.',
      solutionSteps: '1. Mass is the amount of matter in an object, which never changes regardless of location.\n2. Weight is the gravitational force acting on that mass (W = mg).\n3. Since moon gravity is lower, weight decreases. Mass remains unchanged.',
      hint: 'Recall the difference: mass is the matter content; weight is the pull of gravity.',
      difficulty: 'medium',
      options: [
        'Both mass and weight stay the same.',
        'Both mass and weight decrease.',
        'Mass stays the same; weight decreases.',
        'Weight stays the same; mass decreases.'
      ]
    }
  ],
  sci_net_force: [
    {
      id: 'net_1',
      concept: 'sci_net_force',
      question: 'A spacecraft in deep space moves at a constant velocity of 500 m/s with its engines turned off. What is the net force acting on the spacecraft?',
      correctAnswer: '0 N',
      solutionSteps: '1. According to Newton\'s First Law, an object in motion at constant velocity maintains that motion unless acted upon by a net external force.\n2. Since the velocity is constant (no acceleration), the net force acting on it is exactly 0 Newtons.',
      hint: 'If velocity is constant, there is no acceleration. Look at Newton\'s Second Law: F = ma.',
      difficulty: 'hard',
      options: ['500 N', '0 N', 'An increasing force', 'A force equal to its mass']
    }
  ],
  sci_action_reaction: [
    {
      id: 'act_1',
      concept: 'sci_action_reaction',
      question: 'A heavy truck collides head-on with a small hybrid car. During the collision, how does the force exerted by the truck on the car compare to the force exerted by the car on the truck?',
      correctAnswer: 'The forces are equal in magnitude.',
      solutionSteps: '1. Newton\'s Third Law states that for every action, there is an equal and opposite reaction.\n2. During a collision, the force exerted by object A on B is exactly equal in strength and opposite in direction to the force of B on A.\n3. The hybrid car suffers more damage not because it felt more force, but because its smaller mass accelerates/decelerates much more violently.',
      hint: 'Focus on Newton\'s Third Law regarding action-reaction force pairs. Do they care about mass?',
      difficulty: 'hard',
      options: [
        'The truck exerts a larger force.',
        'The hybrid car exerts a larger force.',
        'The forces are equal in magnitude.',
        'No forces are exerted; they cancel out.'
      ]
    }
  ],

  // English Grammar
  eng_present: [
    {
      id: 'pres_1',
      concept: 'eng_present',
      question: 'Identify the correct sentence: "Shh! Be quiet, the baby ______ right now."',
      correctAnswer: 'is sleeping',
      solutionSteps: '1. The phrase "right now" indicates an action in progress at the moment of speaking.\n2. This requires the Present Progressive tense (is/are + verb-ing).\n3. Therefore, "is sleeping" is the correct tense choice.',
      hint: 'Look at the time indicator "right now". Is it a habit, or an active event in progress?',
      difficulty: 'easy',
      options: ['sleeps', 'is sleeping', 'slept', 'has slept']
    }
  ],
  eng_past: [
    {
      id: 'past_1',
      concept: 'eng_past',
      question: 'Choose the correct form: "While I ______ dinner, the phone rang."',
      correctAnswer: 'was cooking',
      solutionSteps: '1. This sentence shows an ongoing background action interrupted by a sudden, shorter action.\n2. The ongoing background action uses the Past Continuous (was/were + verb-ing).\n3. The shorter, interrupting action uses the Simple Past ("rang").\n4. Thus, "was cooking" is the correct choice.',
      hint: 'An ongoing past action was interrupted by the phone ringing. Which tense shows an ongoing past action?',
      difficulty: 'medium',
      options: ['cooked', 'was cooking', 'have cooked', 'had cooked']
    }
  ],
  eng_perfect: [
    {
      id: 'perf_1',
      concept: 'eng_perfect',
      question: 'Complete the sentence: "I ______ in New Delhi since 2018 (and I still live there today)."',
      correctAnswer: 'have lived',
      solutionSteps: '1. The action started in the past (2018) and continues to the present ("still live there today").\n2. The Present Perfect tense (have/has + past participle) connects a past action to the present.\n3. "lived" (Simple Past) would imply the action is finished and the person no longer lives there.',
      hint: 'Use the tense that bridges the past to the present because the action is still ongoing.',
      difficulty: 'hard',
      options: ['lived', 'have lived', 'had lived', 'am living']
    }
  ]
};

// Misconceptions
export const MISCONCEPTIONS: Record<string, { title: string; desc: string; remedy: string }> = {
  // Math
  direct_denom_addition: {
    title: 'Adding Denominators Directly',
    desc: 'The student added the denominators together (e.g. 1/2 + 1/3 = 2/5). This shows a misconception that fractions are just pairs of whole numbers to be added independently.',
    remedy: 'Use visual circle slices or bar diagrams to show that adding halves and thirds does not make fifths. Emphasize that the denominator represents the size of the slices, which must match before combining them.'
  },
  additive_scaling_error: {
    title: 'Additive Scaling in Equivalence',
    desc: 'The student added the same number to both numerator and denominator to scale a fraction (e.g. 2/5 = 12/15 because 5+10=15 so 2+10=12).',
    remedy: 'Review that a fraction represents a ratio, and scaling must preserve that ratio. Visualizing 2/5 and 12/15 side-by-side demonstrates they are not equal, whereas 6/15 is equal.'
  },
  numerator_only_focus: {
    title: 'Numerator-Only Representation',
    desc: 'The student focused entirely on the numerator or the counting number, completely ignoring the denominator or part-whole relationship (e.g. choosing 5 instead of 5/8).',
    remedy: 'Practice drawing fractions. Re-establish what the denominator represents (the partition size) and what the numerator represents (the count).'
  },
  cross_multiply_confusion: {
    title: 'Cross-Multiplication Confusion',
    desc: 'The student performed cross-multiplication instead of multiplying straight across during multiplication, or vice versa.',
    remedy: 'Demonstrate with a grid diagram that multiplying 2/3 of a 3/4 rectangle yields 6 squares out of 12 (1/2).'
  },

  // Science
  force_motion_link: {
    title: 'Force-Motion Link Misconception',
    desc: 'The student believes that a constant velocity requires a constant net force, or that an object at rest has no forces acting on it at all.',
    remedy: 'Review Newton\'s First Law (Inertia). Explain that friction is a hidden retarding force, and in deep space, objects coast forever at constant speed with zero net force.'
  },
  mass_weight_equivalence: {
    title: 'Mass vs. Weight Equivalence',
    desc: 'The student treats mass and weight as interchangeable terms, failing to realize weight is dependent on gravity.',
    remedy: 'Use the astronaut analogy. An astronaut on the Moon has the same amount of atoms/matter (mass) but floats because gravity is weaker, reducing their weight.'
  },
  mass_dominant_collision: {
    title: 'Mass-Dominant Force Fallacy',
    desc: 'The student believes that larger objects exert a greater force during collisions than smaller objects.',
    remedy: 'Cite Newton\'s Third Law (equal and opposite action-reaction). Emphasize that the hybrid car takes more damage due to its smaller mass accelerating rapidly (F=ma), not because it felt more force.'
  },

  // English
  past_habit_confusion: {
    title: 'Habit vs. progressive Tense Confusion',
    desc: 'The student confused temporary actions in progress with permanent/regular habits.',
    remedy: 'Highlight markers like "every day" (simple present) vs "at this moment" (progressive).'
  },
  perfect_simple_past_overlap: {
    title: 'Perfect vs. Past Tense Misuse',
    desc: 'The student used Simple Past for a action that is still relevant/active in the present, or vice versa.',
    remedy: 'Use timeline diagrams. Show that Present Perfect has a foot in both the past and the present ("have lived"), while Simple Past ("lived") is locked in the past.'
  },
  unknown: {
    title: 'General Calculation or Vocabulary Error',
    desc: 'The student made a minor math or selection mistake, but their general reasoning process was close.',
    remedy: 'Suggest double-checking calculations or grammar context clues.'
  }
};

/**
 * AI misbehaviour diagnostic. Works online using Gemini or offline using the mock matching rules.
 */
export async function diagnoseResponse(
  question: Question,
  studentWorking: string,
  studentAnswer: string,
  apiKey?: string
): Promise<DiagnosticResult> {
  const isAnswerCorrect = studentAnswer.trim().toLowerCase() === question.correctAnswer.toLowerCase();
  
  if (isAnswerCorrect) {
    return {
      isCorrect: true,
      misconceptionId: 'none',
      explanation: 'Excellent work! Your answer is correct, and your explanation is logical.',
      suggestedNextConcept: getNextConceptSuccess(question.concept)
    };
  }

  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const prompt = `
You are an expert AI tutor diagnosing student misconceptions.
A student answered a quiz question incorrectly.

Question: "${question.question}"
Correct Answer: "${question.correctAnswer}"
Correct Solution Steps: "${question.solutionSteps}"

Student's explanation/working: "${studentWorking}"
Student's final answer: "${studentAnswer}"

Identify their misconception. Select the best fit ID from this list:
- "direct_denom_addition" (adding denominators)
- "additive_scaling_error" (scaling equivalence with addition)
- "numerator_only_focus" (ignoring denominator)
- "cross_multiply_confusion" (cross multiplying instead of across)
- "force_motion_link" (believing constant velocity needs net force, or rest means no forces)
- "mass_weight_equivalence" (treating mass and weight as identical)
- "mass_dominant_collision" (believing heavier object exerts more force in collision)
- "past_habit_confusion" (confusing habit with progressive progressive)
- "perfect_simple_past_overlap" (using past instead of present perfect)
- "unknown" (general math/grammar error)

Respond ONLY with a valid JSON object matching this structure. No markdown wrappers.
{
  "isCorrect": false,
  "misconceptionId": "one of the IDs listed above",
  "explanation": "A friendly, encouraging explanation explaining where their thinking went wrong and explaining how to solve it correctly in simple terms. Use Markdown and $1/2$ or $F=ma$ syntax.",
  "suggestedNextConcept": "recommend which concept they should assess next"
}
`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        const parsed = JSON.parse(jsonText) as DiagnosticResult;
        return {
          isCorrect: false,
          misconceptionId: parsed.misconceptionId || 'unknown',
          explanation: parsed.explanation || 'Let\'s check this concept again. Review your steps.',
          suggestedNextConcept: parsed.suggestedNextConcept || getNextConceptFailure(question.concept, parsed.misconceptionId)
        };
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Fallback Rule-based engine
  const cleanWorking = studentWorking.toLowerCase();
  const cleanAnswer = studentAnswer.toLowerCase();

  let misconceptionId = 'unknown';
  let explanation = '';

  // Science Newton laws
  if (question.concept === 'sci_net_force') {
    if (cleanAnswer.includes('500') || cleanWorking.includes('needs force') || cleanWorking.includes('propel') || cleanWorking.includes('engine')) {
      misconceptionId = 'force_motion_link';
      explanation = `It looks like you concluded that a force is needed to keep the spacecraft moving at $500$ m/s in space.
      
This is a very common misconception! In everyday life, we see objects slow down because of friction (like a car rolling to a stop). But in deep space, there is no friction or air resistance. 

According to **Newton's First Law (Law of Inertia)**, an object in motion will stay in motion at a constant velocity *forever* unless a net force acts on it. Since its velocity is constant, its acceleration is zero, which means the Net Force is exactly **0 N** ($F = ma$).`;
    }
  } 
  
  else if (question.concept === 'sci_gravity') {
    if (cleanAnswer.includes('both') || cleanWorking.includes('mass decreases') || cleanWorking.includes('same as weight')) {
      misconceptionId = 'mass_weight_equivalence';
      explanation = `It appears you assumed mass and weight behave the same way, or that both decrease on the moon.
      
Remember:
* **Mass** is the actual amount of matter (atoms) inside the astronaut. This does *not* change, whether they are on Earth, the Moon, or floating in deep space.
* **Weight** is the gravitational pull on that mass ($W = mg$). Since the Moon's gravity is 1/6th of Earth's, their weight decreases. Mass remains unchanged.`;
    }
  } 
  
  else if (question.concept === 'sci_action_reaction') {
    if (cleanAnswer.includes('truck') || cleanWorking.includes('heavier') || cleanWorking.includes('truck is bigger') || cleanWorking.includes('truck has more force')) {
      misconceptionId = 'mass_dominant_collision';
      explanation = `It looks like you assumed that because the truck is heavier and stronger, it exerts a larger collision force on the hybrid car than the car exerts back.
      
This feels intuitive, but it violates **Newton's Third Law (Action & Reaction)**! Newton's Third Law states that forces *always* occur in equal and opposite pairs. The force of the truck hitting the car is exactly equal in strength to the force of the car hitting the truck.
      
The reason the car is crushed more is due to **Newton's Second Law ($F = ma$)**. Because the hybrid car has a much smaller mass, the same impact force causes a much greater and more destructive deceleration.`;
    }
  }

  // English Grammar
  else if (question.concept === 'eng_perfect') {
    if (cleanAnswer.includes('lived') && !cleanAnswer.includes('have')) {
      misconceptionId = 'perfect_simple_past_overlap';
      explanation = `You chose the Simple Past "lived". 
      
While "lived" is grammatically correct for completed past actions, the sentence says "since 2018 (and I still live there today)". This indicates an action that started in the past but is **still connected to the present**. 
      
For actions that bridge the past and the present, we must use the **Present Perfect tense** ("have lived"). Simple Past ("lived") would imply you moved away and no longer live there.`;
    }
  }

  // Math Fallback
  else if (question.concept === 'frac_add_unlike') {
    if (cleanAnswer === '2/5' || cleanWorking.includes('1+1') || cleanWorking.includes('2+3')) {
      misconceptionId = 'direct_denom_addition';
      explanation = `It looks like you added the numerators ($1+1=2$) and denominators ($2+3=5$) directly to get $2/5$. 
      
Fractions cannot be added directly this way! The bottom number represents the size of the parts. You must first scale them to a **common denominator** (sixths: $3/6 + 2/6 = 5/6$) before adding.`;
    }
  }

  if (!explanation) {
    explanation = `Your answer is incorrect. Let's review the solution:
${question.solutionSteps}
Keep trying, you can do this!`;
  }

  return {
    isCorrect: false,
    misconceptionId,
    explanation,
    suggestedNextConcept: getNextConceptFailure(question.concept, misconceptionId)
  };
}

/**
 * AI Adaptive Question Selection
 */
export async function getAdaptiveQuestion(
  conceptId: string,
  excludeQuestionIds: string[],
  apiKey?: string
): Promise<Question> {
  const pool = MOCK_QUESTIONS[conceptId] || [];
  const available = pool.filter(q => !excludeQuestionIds.includes(q.id));

  if (available.length > 0 && !apiKey) {
    return available[Math.floor(Math.random() * available.length)];
  }

  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      
      // Look up concept details across all subjects
      let conceptDetails = null;
      for (const subj of Object.values(CONCEPTS)) {
        if (subj[conceptId]) {
          conceptDetails = subj[conceptId];
          break;
        }
      }
      if (!conceptDetails) conceptDetails = CONCEPTS.math.frac_visual;

      const prompt = `
You are an expert tutor generating questions on: "${conceptDetails.name}" (${conceptDetails.description}).
Difficulty level: ${conceptDetails.difficulty}.

Generate a clear multiple-choice question. Include:
1. The question text (use LaTeX like $1/2$ or $F=ma$ for formatting).
2. The correct answer.
3. 3 distractors representing typical student errors or misconceptions.
4. Step-by-step solutions.

Respond ONLY with a valid JSON object. No markdown.
{
  "id": "gen_${Math.random().toString(36).substring(2, 7)}",
  "concept": "${conceptId}",
  "question": "question text",
  "correctAnswer": "correct answer",
  "solutionSteps": "step-by-step solution",
  "hint": "helpful hint",
  "difficulty": "${conceptDetails.difficulty}",
  "options": ["correct answer", "distractor 1", "distractor 2", "distractor 3"]
}
`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });

      if (response.ok) {
        const data = await response.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return JSON.parse(jsonText) as Question;
      }
    } catch (err) {
      console.error(err);
    }
  }

  const absolutePool = MOCK_QUESTIONS[conceptId] || MOCK_QUESTIONS.frac_visual;
  return absolutePool[Math.floor(Math.random() * absolutePool.length)];
}

/**
 * Conversational Socratic AI Step Tutor chat API
 */
export async function chatWithTutor(
  question: Question,
  misconceptionId: string,
  history: ChatMessage[],
  studentInput: string,
  apiKey?: string
): Promise<string> {
  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const conversationHistory = history.map(h => `${h.sender === 'student' ? 'Student' : 'Tutor'}: ${h.text}`).join('\n');
      
      const prompt = `
You are an expert Socratic AI tutor. A student got this question wrong:
Question: "${question.question}"
Correct Answer: "${question.correctAnswer}"
Solution steps: "${question.solutionSteps}"
Student's diagnosed misconception: "${MISCONCEPTIONS[misconceptionId]?.title || 'calculation error'}"

Your goal is to guide the student to discover their own error. 
Do NOT give them the final answer or solution steps directly. 
Instead, ask a single, highly-targeted question or give a small hint based on their message.
Keep your response short (1-3 sentences), warm, and encouraging.

Conversation History so far:
${conversationHistory}
Student: "${studentInput}"

Tutor response (friendly and Socratic):
`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        return data.candidates?.[0]?.content?.parts?.[0]?.text || 'Let\'s think about it. What is the first step in solving this?';
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Fallback Mock Tutor logic
  const cleanInput = studentInput.toLowerCase();

  if (misconceptionId === 'direct_denom_addition') {
    if (cleanInput.includes('common') || cleanInput.includes('same') || cleanInput.includes('denominator')) {
      return "That's exactly it! We need the denominators to be the same. What is the lowest common denominator for 2 and 3?";
    }
    if (cleanInput.includes('6')) {
      return "Perfect! 6 is the common denominator. Now, how do we convert the fractions 1/2 and 1/3 into sixths? What do the numerators become?";
    }
    return "Let's look at the bottom numbers (denominators): 2 and 3. Can we add fractions if they have different sized slices? What do we need to find first?";
  }

  if (misconceptionId === 'force_motion_link') {
    if (cleanInput.includes('friction') || cleanInput.includes('gravity') || cleanInput.includes('air')) {
      return "Spot on! There is no friction or air resistance in deep space. So if there's nothing pushing back against the spacecraft, do the engines need to stay on to keep its speed?";
    }
    return "Think about deep space: is there any air resistance or friction acting on the spacecraft to slow it down?";
  }

  return "Let's break this down together. What was the first step you took when trying to solve this problem?";
}

/**
 * Generate targeted worksheet practice questions
 */
export async function generateWorksheet(
  misconceptionId: string,
  gapName: string,
  apiKey?: string
): Promise<string[]> {
  if (apiKey) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
      const prompt = `
You are an expert curriculum designer. A teacher needs 3 practice questions to target a specific student learning gap:
Gap: "${gapName}" (Misconception ID: "${misconceptionId}").

Write 3 clear practice questions. For each question:
1. State the question.
2. Provide the correct answer.
3. Briefly explain how to solve it correctly, emphasizing how to avoid the specific misconception.

Format your response as a simple text list of 3 items, using Markdown. Keep it concise, professional, and directly printable for a teacher.
`;

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }]
        })
      });

      if (response.ok) {
        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
        return text.split('\n\n').filter((t: string) => t.trim().length > 0);
      }
    } catch (err) {
      console.error(err);
    }
  }

  // Fallbacks based on category
  if (misconceptionId === 'direct_denom_addition') {
    return [
      "**Question 1**: Solve $1/4 + 1/3$. \n\n*Correct Answer*: $7/12$. \n*Teacher Tip*: Ensure students scale both numerators and denominators. Remind them that $1/4 + 1/3$ does not equal $2/7$!",
      "**Question 2**: Solve $2/5 + 1/2$. \n\n*Correct Answer*: $9/10$. \n*Teacher Tip*: Use a visual grid of 10 blocks to show that $2/5$ is 4 blocks and $1/2$ is 5 blocks, totaling 9 blocks.",
      "**Question 3**: Solve $1/6 + 2/3$. \n\n*Correct Answer*: $5/6$. \n*Teacher Tip*: Remind students that they only need to convert $2/3$ to $4/6$ since 6 is already a multiple of 3."
    ];
  }

  if (misconceptionId === 'force_motion_link') {
    return [
      "**Question 1**: A hockey puck slides across frictionless ice at a constant speed of 10 m/s. What net force is required to keep it moving at this speed? \n\n*Correct Answer*: 0 N. \n*Teacher Tip*: Emphasize that forces cause changes in velocity (acceleration), not velocity itself.",
      "**Question 2**: Draw a free-body diagram of a sky-diver falling at terminal velocity (constant speed). \n\n*Correct Answer*: Downward gravity arrow and upward drag arrow of equal lengths. \n*Teacher Tip*: Help students see that constant speed means balanced forces.",
      "**Question 3**: If you push a heavy crate across the carpet at a constant speed, the net force is: (a) in the direction of motion, (b) zero, (c) opposite to motion. \n\n*Correct Answer*: (b) Zero. \n*Teacher Tip*: Remind students that your push is perfectly canceled out by the friction force."
    ];
  }

  return [
    "**Question 1**: Practice Question A \n*Correct Answer*: Solved. \n*Tip*: Emphasize step-by-step logic.",
    "**Question 2**: Practice Question B \n*Correct Answer*: Solved. \n*Tip*: Identify the core variable first.",
    "**Question 3**: Practice Question C \n*Correct Answer*: Solved. \n*Tip*: Check for matching units."
  ];
}

// Success progressions
function getNextConceptSuccess(current: string): string {
  switch (current) {
    case 'frac_visual': return 'frac_equiv';
    case 'frac_equiv': return 'frac_add_like';
    case 'frac_add_like': return 'frac_add_unlike';
    case 'frac_add_unlike': return 'frac_multiply';
    case 'frac_multiply': return 'frac_multiply';

    case 'sci_force': return 'sci_gravity';
    case 'sci_gravity': return 'sci_net_force';
    case 'sci_net_force': return 'sci_action_reaction';
    case 'sci_action_reaction': return 'sci_action_reaction';

    case 'eng_present': return 'eng_past';
    case 'eng_past': return 'eng_perfect';
    case 'eng_perfect': return 'eng_perfect';

    default: return current;
  }
}

// Failure remediation
function getNextConceptFailure(current: string, misconceptionId: string): string {
  if (current === 'frac_add_unlike') {
    if (misconceptionId === 'direct_denom_addition') return 'frac_equiv';
    return 'frac_add_like';
  }
  if (current === 'frac_equiv') return 'frac_visual';

  if (current === 'sci_net_force') return 'sci_force';
  if (current === 'sci_gravity') return 'sci_force';

  if (current === 'eng_perfect') return 'eng_past';

  return current;
}

// Local storage key helper exports
const API_KEY_STORAGE_KEY = 'gap_learning_gemini_key';

export const getStoredApiKey = (): string => {
  return localStorage.getItem(API_KEY_STORAGE_KEY) || '';
};

export const setStoredApiKey = (key: string): void => {
  localStorage.setItem(API_KEY_STORAGE_KEY, key);
};

export const clearStoredApiKey = (): void => {
  localStorage.removeItem(API_KEY_STORAGE_KEY);
};

