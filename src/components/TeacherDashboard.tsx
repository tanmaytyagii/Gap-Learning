import React, { useState } from 'react';
import { generateWorksheet, MISCONCEPTIONS } from '../services/ai';
import { BookOpen, Sparkles, Printer, FileText, Loader2, RefreshCw, BarChart2, AlertTriangle, CheckCircle } from 'lucide-react';

interface TeacherDashboardProps {
  apiKey: string;
}

export const TeacherDashboard: React.FC<TeacherDashboardProps> = ({ apiKey }) => {
  const [selectedSubject, setSelectedSubject] = useState<'math' | 'science' | 'english'>('math');
  const [selectedGap, setSelectedGap] = useState<string>('direct_denom_addition');
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [worksheetContent, setWorksheetContent] = useState<string[] | null>(null);

  // Subject statistics mapping
  const subjectStats = {
    math: {
      totalStudents: 28,
      averageMastery: '68%',
      activeGapsCount: 2,
      conceptBreakdown: [
        { name: 'Visualizing Fractions', mastery: 92 },
        { name: 'Equivalent Fractions', mastery: 74 },
        { name: 'Adding Like Denominators', mastery: 82 },
        { name: 'Adding Unlike Denominators', mastery: 48 },
        { name: 'Multiplying Fractions', mastery: 55 }
      ],
      gapsList: [
        { id: 'direct_denom_addition', name: 'Adding Denominators Directly', count: 12, percent: 43 },
        { id: 'additive_scaling_error', name: 'Additive Scaling in Equivalence', count: 7, percent: 25 }
      ],
      urgentHelp: [
        { name: 'Leo Gupta', details: 'Stuck on Adding Unlike Denominators (tried adding denominators directly)' },
        { name: 'Sam Kelly', details: 'Fails Equivalent Fractions (uses addition to scale up)' },
        { name: 'Priya Sen', details: 'Stuck on Adding Unlike Denominators (doesn\'t convert numerators)' }
      ],
      cruising: [
        { name: 'Sarah Miller', details: 'Completed all topics with 100% accuracy' },
        { name: 'Neil Carter', details: 'Mastered Multiplying Fractions, currently exploring Algebra' }
      ]
    },
    science: {
      totalStudents: 28,
      averageMastery: '74%',
      activeGapsCount: 1,
      conceptBreakdown: [
        { name: 'Concept of Force', mastery: 96 },
        { name: 'Gravity, Mass & Weight', mastery: 78 },
        { name: 'Net Force & Motion', mastery: 54 },
        { name: 'Action & Reaction', mastery: 68 }
      ],
      gapsList: [
        { id: 'force_motion_link', name: 'Force-Motion Link Fallacy', count: 9, percent: 32 },
        { id: 'mass_dominant_collision', name: 'Mass-Dominant Force Fallacy', count: 6, percent: 21 }
      ],
      urgentHelp: [
        { name: 'Tina Brown', details: 'Thinks constant velocity space probe must have active engines on' },
        { name: 'Ryan Vance', details: 'Claims astronaut mass reduces on the moon' }
      ],
      cruising: [
        { name: 'Kavya Nair', details: 'Correctly solved unbalanced force collision vectors' },
        { name: 'Rohan Shah', details: 'Physics concept nodes 100% completed' }
      ]
    },
    english: {
      totalStudents: 28,
      averageMastery: '81%',
      activeGapsCount: 1,
      conceptBreakdown: [
        { name: 'Present & Progressive Tenses', mastery: 95 },
        { name: 'Past Tense Contrast', mastery: 84 },
        { name: 'Present Perfect vs. Past', mastery: 63 }
      ],
      gapsList: [
        { id: 'perfect_simple_past_overlap', name: 'Perfect vs. Past Tense Misuse', count: 10, percent: 36 }
      ],
      urgentHelp: [
        { name: 'Jake Wilson', details: 'Uses Simple Past instead of Present Perfect for ongoing states' },
        { name: 'Emma Watson', details: 'Confuses simple present habits with progressive actions' }
      ],
      cruising: [
        { name: 'Li Wei', details: 'Perfect usage of complex perfect passive constructions' },
        { name: 'Maya Angel', details: 'All grammar levels fully mastered' }
      ]
    }
  };

  const activeStats = subjectStats[selectedSubject];

  const handleGenerateWorksheet = async () => {
    setIsGenerating(true);
    setWorksheetContent(null);
    try {
      const questions = await generateWorksheet(
        selectedGap,
        MISCONCEPTIONS[selectedGap]?.title || 'Grammar/Physics Concept Error',
        apiKey
      );
      setWorksheetContent(questions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatText = (text: string) => {
    if (!text) return '';
    const parts = text.split(/(\$[^\$]+\$)/g);
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        return <strong key={index} style={{ color: 'var(--primary-light)', fontFamily: 'var(--font-display)' }}>{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  const handleSubjectChange = (subj: 'math' | 'science' | 'english') => {
    setSelectedSubject(subj);
    setWorksheetContent(null);
    // Auto-select first gap ID matching the subject
    if (subj === 'math') setSelectedGap('direct_denom_addition');
    else if (subj === 'science') setSelectedGap('force_motion_link');
    else setSelectedGap('perfect_simple_past_overlap');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} className="animate-fade-in">
      
      {/* Subject Filter Bar */}
      <div className="glass" style={{ padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1rem', fontWeight: 600 }}>Active Subject Diagnostics</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          {(['math', 'science', 'english'] as const).map((subj) => (
            <button
              key={subj}
              onClick={() => handleSubjectChange(subj)}
              className={`btn ${selectedSubject === subj ? 'btn-primary' : 'btn-secondary'}`}
              style={{ padding: '0.5rem 1rem', fontSize: '0.8rem' }}
            >
              {subj === 'math' ? '📐 Mathematics' : subj === 'science' ? '⚡ Physics' : '✍️ English Grammar'}
            </button>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div className="dashboard-grid">
        
        {/* Left Column: Analytics & Student lists */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Overview Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
            <div className="glass" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total Students</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: 'white', fontFamily: 'var(--font-display)' }}>
                {activeStats.totalStudents}
              </p>
            </div>
            <div className="glass" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Average Mastery</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--success-light)', fontFamily: 'var(--font-display)' }}>
                {activeStats.averageMastery}
              </p>
            </div>
            <div className="glass" style={{ padding: '1.25rem', textAlign: 'center' }}>
              <h3 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Active Gaps</h3>
              <p style={{ fontSize: '2rem', fontWeight: 800, marginTop: '0.5rem', color: 'var(--warning-light)', fontFamily: 'var(--font-display)' }}>
                {activeStats.activeGapsCount}
              </p>
            </div>
          </div>

          {/* Concept Mastery Breakdown */}
          <div className="glass">
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BarChart2 size={18} style={{ color: 'var(--primary-light)' }} />
              <h2 style={{ fontSize: '1.1rem' }}>Concept Mastery Distribution</h2>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {activeStats.conceptBreakdown.map((item, index) => (
                <div key={index} style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                    <span style={{ fontWeight: 500 }}>{item.name}</span>
                    <span style={{ color: item.mastery > 80 ? 'var(--success-light)' : item.mastery > 60 ? 'var(--warning-light)' : '#f87171' }}>
                      {item.mastery}% Mastery
                    </span>
                  </div>
                  <div style={{ width: '100%', height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ 
                      width: `${item.mastery}%`, 
                      height: '100%', 
                      background: item.mastery > 80 ? 'var(--success)' : item.mastery > 60 ? 'var(--warning)' : 'var(--danger)',
                      borderRadius: '4px' 
                    }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Student Profiling Segments */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
            {/* Urgent Help */}
            <div className="glass" style={{ borderTop: '4px solid var(--danger)' }}>
              <div className="card-header">
                <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#f87171' }}>
                  <AlertTriangle size={16} /> Urgent Help Needed
                </h3>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
                {activeStats.urgentHelp.map((st, idx) => (
                  <div key={idx} style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.03)', border: '1px solid rgba(239, 68, 68, 0.1)', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <strong>{st.name}</strong>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.15rem', fontSize: '0.75rem' }}>{st.details}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Cruising */}
            <div className="glass" style={{ borderTop: '4px solid var(--success)' }}>
              <div className="card-header">
                <h3 style={{ fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--success-light)' }}>
                  <CheckCircle size={16} /> Ready to Advance
                </h3>
              </div>
              <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', padding: '1rem' }}>
                {activeStats.cruising.map((st, idx) => (
                  <div key={idx} style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.03)', border: '1px solid rgba(16, 185, 129, 0.1)', borderRadius: '8px', fontSize: '0.8rem' }}>
                    <strong>{st.name}</strong>
                    <p style={{ color: 'var(--text-secondary)', marginTop: '0.15rem', fontSize: '0.75rem' }}>{st.details}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

        </div>

        {/* Right Column: AI Suggestions & Worksheet generator */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* AI recommendations */}
          <div className="glass glow-primary" style={{ borderLeft: '4px solid var(--primary)', backgroundColor: 'rgba(139, 92, 246, 0.02)' }}>
            <div className="card-header" style={{ borderBottom: '1px solid rgba(139, 92, 246, 0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Sparkles size={18} style={{ color: 'var(--primary-light)' }} />
              <h2 style={{ fontSize: '1.1rem', color: 'var(--primary-light)' }}>AI Recommendations</h2>
            </div>
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', fontSize: '0.85rem' }}>
              {selectedSubject === 'math' && (
                <>
                  <p><strong>Remediation Strategy:</strong> 43% of students fail fraction arithmetic due to direct denominator additions. Shift from equation templates to visual slices.</p>
                  <p style={{ color: 'var(--text-secondary)' }}>💡 <strong>Next Step:</strong> Conduct a 10-minute drawing assessment for Equivalent Fractions before moving to general unlike denominators.</p>
                </>
              )}
              {selectedSubject === 'science' && (
                <>
                  <p><strong>Remediation Strategy:</strong> 32% of students link force directly to motion (confusing speed with acceleration).</p>
                  <p style={{ color: 'var(--text-secondary)' }}>💡 <strong>Next Step:</strong> Play a hockey-puck simulation showing that net force represents push adjustments, and friction acts as a counteracting force.</p>
                </>
              )}
              {selectedSubject === 'english' && (
                <>
                  <p><strong>Remediation Strategy:</strong> Students struggle to bridge the past to the present using the Present Perfect.</p>
                  <p style={{ color: 'var(--text-secondary)' }}>💡 <strong>Next Step:</strong> Provide timeline maps, marking the boundary where Simple Past (completed) differs from Present Perfect (active/ongoing relation).</p>
                </>
              )}
            </div>
          </div>

          {/* AI Worksheet Builder */}
          <div className="glass" style={{ display: 'flex', flexDirection: 'column' }}>
            <div className="card-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <BookOpen size={18} style={{ color: 'var(--primary-light)' }} />
              <h2 style={{ fontSize: '1.1rem' }}>AI Worksheet Builder</h2>
            </div>
            
            <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                Select a misconception to generate 3 targeted questions + teacher tips.
              </p>

              {/* Selector */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <select
                  value={selectedGap}
                  onChange={(e) => setSelectedGap(e.target.value)}
                  style={{
                    background: 'rgba(0, 0, 0, 0.25)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '10px',
                    color: 'white',
                    padding: '0.75rem',
                    fontSize: '0.9rem',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                >
                  {activeStats.gapsList.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </select>
              </div>

              <button
                className="btn btn-primary"
                onClick={handleGenerateWorksheet}
                disabled={isGenerating}
                style={{ width: '100%' }}
              >
                {isGenerating ? (
                  <>
                    <Loader2 size={16} style={{ animation: 'spin 1.5s linear infinite' }} />
                    Generating...
                  </>
                ) : (
                  <>
                    <RefreshCw size={16} />
                    Generate Practice Sheet
                  </>
                )}
              </button>

              {/* Generated Sheet */}
              {worksheetContent && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '0.5rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--primary-light)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <FileText size={14} /> Worksheet Preview
                    </span>
                    <button 
                      onClick={() => window.print()}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.8rem' }}
                    >
                      <Printer size={14} /> Print
                    </button>
                  </div>

                  <div style={{ 
                    background: 'rgba(0,0,0,0.3)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '10px', 
                    padding: '1rem',
                    overflowY: 'auto',
                    maxHeight: '260px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '1rem'
                  }}>
                    {worksheetContent.map((q, idx) => (
                      <div key={idx} style={{ 
                        fontSize: '0.82rem', 
                        lineHeight: '1.5',
                        paddingBottom: idx < worksheetContent.length - 1 ? '1rem' : '0',
                        borderBottom: idx < worksheetContent.length - 1 ? '1px dashed rgba(255,255,255,0.08)' : 'none'
                      }}>
                        {q.split('\n').map((line, lIdx) => (
                          <p key={lIdx} style={{ marginBottom: line.startsWith('*') ? '0.25rem' : '0.5rem' }}>
                            {formatText(line)}
                          </p>
                        ))}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
