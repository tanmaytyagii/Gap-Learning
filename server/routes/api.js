const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

const datasetPath = path.join(__dirname, '../data/dataset.json');

// Helper function to read dataset
const readDataset = () => {
  const data = fs.readFileSync(datasetPath, 'utf8');
  return JSON.parse(data);
};

// Helper function to write dataset
const writeDataset = (data) => {
  fs.writeFileSync(datasetPath, JSON.stringify(data, null, 2), 'utf8');
};

// GET /api/questions
router.get('/questions', (req, res) => {
  try {
    const data = readDataset();
    res.json(data); // data is an array of questions
  } catch (error) {
    res.status(500).json({ error: 'Failed to read questions' });
  }
});

// POST /api/questions
router.post('/questions', (req, res) => {
  try {
    const { 
      topic, 
      concept, 
      difficulty, 
      prerequisites, 
      learningObjective, 
      question, 
      options, 
      correctAnswer, 
      hint, 
      solutionSteps, 
      misconceptionMap 
    } = req.body;
    
    if (!concept || !question || !options || !correctAnswer) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const data = readDataset(); // array
    
    const newQuestion = {
      id: `${concept}_${Date.now()}`,
      topic: topic || "General",
      concept,
      difficulty: difficulty || "medium",
      prerequisites: prerequisites || [],
      learningObjective: learningObjective || "",
      question,
      options,
      correctAnswer,
      hint: hint || "",
      solutionSteps: solutionSteps || "",
      misconceptionMap: misconceptionMap || {}
    };

    data.push(newQuestion);
    writeDataset(data);

    res.status(201).json({ message: 'Question added successfully', question: newQuestion });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add question' });
  }
});

module.exports = router;
