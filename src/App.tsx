import { useState, useEffect } from 'react';
import { ConceptMap } from './components/ConceptMap';
import { StudentAssessment } from './components/StudentAssessment';
import { TeacherDashboard } from './components/TeacherDashboard';
import { getStoredApiKey, setStoredApiKey, SUBJECTS } from './services/ai';
import { GraduationCap, Sparkles, User, Settings, CheckCircle, Zap, Trophy } from 'lucide-react';

function App() {
  const [activeTab, setActiveTab] = useState<'student' | 'teacher'>('student');
  const [apiKey, setApiKey] = useState<string>('');
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [selectedConcept, setSelectedConcept] = useState<string>('');
  const [activeGap, setActiveGap] = useState<string>('');
  
  // Gamification States
  const [xp, setXp] = useState<number>(340);
  const [streak] = useState<number>(5);
  const [level, setLevel] = useState<number>(1);
  const [badges, setBadges] = useState<string[]>(['Quick Starter 🚀']);

  // Active Subject Selection
  const [activeSubject, setActiveSubject] = useState<'math' | 'science' | 'english'>('math');

  // Persistent Subject Progress mappings
  const [subjectProgress, setSubjectProgress] = useState<Record<string, Record<string, 'locked' | 'unlocked' | 'mastered' | 'gap'>>>({
    math: {
      frac_visual: 'unlocked',
      frac_equiv: 'locked',
      frac_add_like: 'locked',
      frac_add_unlike: 'locked',
      frac_multiply: 'locked'
    },
    science: {
      sci_force: 'unlocked',
      sci_gravity: 'locked',
      sci_net_force: 'locked',
      sci_action_reaction: 'locked'
    },
    english: {
      eng_present: 'unlocked',
      eng_past: 'locked',
      eng_perfect: 'locked'
    }
  });

  // Calculate Level based on XP (every 500 XP is a level)
  useEffect(() => {
    const calcLevel = Math.floor(xp / 500) + 1;
    if (calcLevel > level) {
      setLevel(calcLevel);
      setBadges(prev => [...prev, `Level ${calcLevel} Champion 🏆`]);
    }
  }, [xp]);

  // Load API key from local storage on mount
  useEffect(() => {
    const key = getStoredApiKey();
    if (key) {
      setApiKey(key);
    }
  }, []);

  const handleApiKeyChange = (val: string) => {
    setApiKey(val);
    setStoredApiKey(val);
  };

  const handleAssessmentCompleted = (
    conceptId: string,
    isCorrect: boolean,
    misconceptionId: string,
    nextConceptId: string,
    xpEarned: number
  ) => {
    // Award XP
    setXp(prev => prev + xpEarned);

    // Update progress state for current active subject
    setSubjectProgress(prev => {
      const currentSubjectMap = { ...prev[activeSubject] };
      
      if (isCorrect) {
        currentSubjectMap[conceptId] = 'mastered';
        
        // Unlock next recommended concept if it was locked
        if (nextConceptId && currentSubjectMap[nextConceptId] === 'locked') {
          currentSubjectMap[nextConceptId] = 'unlocked';
        }

        // Clear active gap
        setActiveGap('');
      } else {
        currentSubjectMap[conceptId] = 'gap';
        
        // Save the specific misconception ID as the active gap
        setActiveGap(misconceptionId);

        // Unlock remediation concept recommended by AI
        if (nextConceptId && currentSubjectMap[nextConceptId] === 'locked') {
          currentSubjectMap[nextConceptId] = 'unlocked';
        }
      }

      return {
        ...prev,
        [activeSubject]: currentSubjectMap
      };
    });

    // Take student back to the concept map
    setSelectedConcept('');
  };

  const handleSubjectChange = (subj: 'math' | 'science' | 'english') => {
    setActiveSubject(subj);
    setSelectedConcept('');
    setActiveGap('');
  };

  return (
    <div className="app-container">
      
      {/* Header bar */}
      <header className="glass" style={{ padding: '1rem 1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)' }}>
        
        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo-icon">
            <GraduationCap size={24} />
          </div>
          <div>
            <h1 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              GapLearning AI
              <span style={{ fontSize: '0.65rem', padding: '0.15rem 0.4rem', borderRadius: '4px', backgroundColor: 'rgba(139, 92, 246, 0.2)', border: '1px solid rgba(139, 92, 246, 0.3)', color: 'var(--primary-light)' }}>
                ADVANCED v2
              </span>
            </h1>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Multi-Subject Socratic Assessment Platform</p>
          </div>
        </div>

        {/* Middle Navigation Tabs */}
        <div className="nav-tabs">
          <button 
            className={`nav-tab ${activeTab === 'student' ? 'active' : ''}`}
            onClick={() => { setActiveTab('student'); setSelectedConcept(''); }}
          >
            <User size={16} />
            Student Portal
          </button>
          <button 
            className={`nav-tab ${activeTab === 'teacher' ? 'active' : ''}`}
            onClick={() => setActiveTab('teacher')}
          >
            <GraduationCap size={16} />
            Teacher Portal
          </button>
        </div>

        {/* Gamified stats & configurations */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          
          {/* Student Stats Tracker (Only in student mode) */}
          {activeTab === 'student' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', background: 'rgba(255,255,255,0.03)', padding: '0.35rem 0.75rem', borderRadius: '10px', border: '1px solid var(--border-color)', fontSize: '0.8rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--warning-light)', fontWeight: 700 }}>
                <Zap size={14} />
                <span>{streak}d Streak</span>
              </div>
              <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', color: 'var(--primary-light)', fontWeight: 700 }}>
                <Trophy size={14} />
                <span>Lvl {level}</span>
              </div>
              <div style={{ width: '1px', height: '14px', background: 'rgba(255,255,255,0.1)' }}></div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.15rem' }}>
                <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)' }}>XP: {xp} / {level * 500}</span>
                <div style={{ width: '60px', height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px', overflow: 'hidden' }}>
                  <div style={{ width: `${(xp % 500) / 5}%`, height: '100%', background: 'var(--primary)' }}></div>
                </div>
              </div>
            </div>
          )}

          {/* API Config settings button */}
          <div 
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '0.35rem', 
              fontSize: '0.75rem', 
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              padding: '0.4rem 0.75rem',
              borderRadius: '8px',
              backgroundColor: 'rgba(255,255,255,0.03)',
              border: '1px solid var(--border-color)'
            }}
            onClick={() => setShowSettings(!showSettings)}
          >
            <span style={{ 
              width: '8px', 
              height: '8px', 
              borderRadius: '50%', 
              backgroundColor: apiKey ? 'var(--success)' : 'var(--warning)',
              display: 'inline-block'
            }}></span>
            <span>{apiKey ? 'Live AI Mode' : 'Offline Demo'}</span>
            <Settings size={12} style={{ marginLeft: '0.25rem' }} />
          </div>
        </div>
      </header>

      {/* API Key Settings Overlay */}
      {showSettings && (
        <div className="glass animate-fade-in" style={{ padding: '1.25rem', marginBottom: '2rem', border: '1px solid var(--primary-glow)', backgroundColor: 'rgba(139, 92, 246, 0.03)' }}>
          <h3 style={{ fontSize: '0.95rem', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Sparkles size={16} style={{ color: 'var(--primary-light)' }} />
            Configure Gemini AI Integration
          </h3>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '1rem', lineHeight: '1.4' }}>
            Enter your Gemini API key to enable live AI question generation, Socratic tutor dialogues, and custom worksheet generation. The key is stored locally in your browser cache.
          </p>
          <div className="api-input-container" style={{ maxWidth: '400px' }}>
            <input 
              type="password" 
              className="api-input" 
              placeholder="Enter Gemini API Key..."
              value={apiKey}
              onChange={(e) => handleApiKeyChange(e.target.value)}
              style={{ width: '100%' }}
            />
            {apiKey && <CheckCircle size={16} style={{ color: 'var(--success-light)', marginRight: '0.5rem' }} />}
          </div>
        </div>
      )}

      {/* Student Profile Info Panel */}
      {activeTab === 'student' && !selectedConcept && (
        <div className="glass animate-fade-in" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem 1.5rem', marginBottom: '1.5rem', backgroundColor: 'rgba(255,255,255,0.01)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>Welcome Back!</span>
              <span style={{ fontSize: '1.05rem', fontWeight: 700 }}>Student Profile Dashboard</span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem', marginLeft: '1rem' }}>
              {badges.map((b, idx) => (
                <span key={idx} className="badge badge-primary" style={{ textTransform: 'none', fontSize: '0.7rem', padding: '0.25rem 0.5rem' }}>
                  {b}
                </span>
              ))}
            </div>
          </div>
          
          {/* Subject Dropdown select inside Student portal */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Select Subject:</span>
            <select
              value={activeSubject}
              onChange={(e) => handleSubjectChange(e.target.value as any)}
              className="subject-select"
            >
              {Object.entries(SUBJECTS).map(([id, details]) => (
                <option key={id} value={id}>
                  {details.emoji} {details.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Main View Area */}
      <main>
        {activeTab === 'student' ? (
          selectedConcept ? (
            /* Student Assessment Sub-View */
            <div style={{ maxWidth: '800px', margin: '0 auto' }}>
              <StudentAssessment
                apiKey={apiKey}
                selectedConceptId={selectedConcept}
                onAssessmentCompleted={handleAssessmentCompleted}
                onBackToMap={() => setSelectedConcept('')}
              />
            </div>
          ) : (
            /* Student Concept Map Dashboard View */
            <div className="dashboard-grid">
              
              {/* Concept Mastery Tree */}
              <div style={{ gridColumn: 'span 2' }}>
                <ConceptMap
                  subjectId={activeSubject}
                  conceptStatuses={subjectProgress[activeSubject]}
                  activeGapId={activeGap}
                  onSelectConcept={(id) => setSelectedConcept(id)}
                />
              </div>

            </div>
          )
        ) : (
          /* Teacher Diagnostics Dashboard View */
          <TeacherDashboard apiKey={apiKey} />
        )}
      </main>

    </div>
  );
}

export default App;
