import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { StudentPortal } from './pages/StudentPortal';
import { TeacherPortal } from './pages/TeacherPortal';
import { fetchQuestions } from './services/apiClient';
import { adaptiveAssessmentEngine } from './adaptive';

function App() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        const questions = await fetchQuestions();
        if (questions && questions.length > 0) {
          adaptiveAssessmentEngine.getQuestionEngine().setQuestions(questions);
        }
      } catch (error) {
        console.error("Failed to load questions from backend", error);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center text-text-primary">
        <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4"></div>
        <h2 className="text-xl font-semibold">Connecting to GapLearning API...</h2>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/student" element={<StudentPortal />} />
        <Route path="/teacher" element={<TeacherPortal />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
