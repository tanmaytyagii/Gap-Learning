import React from 'react';
import { CONCEPTS, MISCONCEPTIONS } from '../services/ai';
import { Award, AlertTriangle, Play, Lock, BookOpen } from 'lucide-react';

interface ConceptMapProps {
  subjectId: string;
  conceptStatuses: Record<string, 'locked' | 'unlocked' | 'mastered' | 'gap'>;
  activeGapId?: string;
  onSelectConcept: (conceptId: string) => void;
}

export const ConceptMap: React.FC<ConceptMapProps> = ({
  subjectId,
  conceptStatuses,
  activeGapId,
  onSelectConcept
}) => {
  // Define layout positions (row, col) for rendering the concept tree dynamically per subject
  const layouts: Record<string, Record<string, { x: number; y: number }>> = {
    math: {
      frac_visual: { x: 50, y: 15 },
      frac_equiv: { x: 25, y: 50 },
      frac_add_like: { x: 75, y: 50 },
      frac_add_unlike: { x: 50, y: 85 },
      frac_multiply: { x: 15, y: 85 }
    },
    science: {
      sci_force: { x: 50, y: 15 },
      sci_gravity: { x: 25, y: 50 },
      sci_net_force: { x: 75, y: 50 },
      sci_action_reaction: { x: 50, y: 85 }
    },
    english: {
      eng_present: { x: 50, y: 15 },
      eng_past: { x: 50, y: 50 },
      eng_perfect: { x: 50, y: 85 }
    }
  };

  const subjectLayout = layouts[subjectId] || layouts.math;
  const subjectConcepts = CONCEPTS[subjectId] || CONCEPTS.math;

  const getNodeClass = (status: string) => {
    switch (status) {
      case 'mastered': return 'glow-success';
      case 'gap': return 'glow-warning';
      case 'unlocked': return 'glow-primary pulse-glow-primary';
      default: return '';
    }
  };

  return (
    <div className="glass card-container animate-fade-in" style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <div className="card-header">
        <div>
          <h2 style={{ fontSize: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={20} style={{ color: 'var(--primary-light)' }} />
            Concept Mastery Map: {subjectId.toUpperCase()}
          </h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
            Adaptive learning path showing your diagnostic progress. Click on any unlocked node to start.
          </p>
        </div>
      </div>

      <div className="card-body" style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', minHeight: '400px' }}>
        
        {/* SVG/HTML Mastery Map Tree */}
        <div style={{ 
          position: 'relative', 
          width: '100%', 
          height: '280px', 
          background: 'rgba(0, 0, 0, 0.15)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          overflow: 'hidden'
        }}>
          
          {/* Dynamic SVG Connection Lines based on active subject */}
          <svg style={{ position: 'absolute', width: '100%', height: '100%', pointerEvents: 'none' }}>
            {subjectId === 'math' && (
              <>
                {/* frac_visual -> frac_equiv */}
                <line x1="50%" y1="20%" x2="25%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
                {/* frac_visual -> frac_add_like */}
                <line x1="50%" y1="20%" x2="75%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
                {/* frac_equiv -> frac_add_unlike */}
                <line x1="25%" y1="50%" x2="50%" y2="80%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
                {/* frac_add_like -> frac_add_unlike */}
                <line x1="75%" y1="50%" x2="50%" y2="80%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
                {/* frac_equiv -> frac_multiply */}
                <line x1="25%" y1="50%" x2="15%" y2="80%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
              </>
            )}
            
            {subjectId === 'science' && (
              <>
                {/* sci_force -> sci_gravity */}
                <line x1="50%" y1="20%" x2="25%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
                {/* sci_force -> sci_net_force */}
                <line x1="50%" y1="20%" x2="75%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
                {/* sci_gravity -> sci_action_reaction */}
                <line x1="25%" y1="50%" x2="50%" y2="80%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
                {/* sci_net_force -> sci_action_reaction */}
                <line x1="75%" y1="50%" x2="50%" y2="80%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
              </>
            )}
            
            {subjectId === 'english' && (
              <>
                {/* eng_present -> eng_past */}
                <line x1="50%" y1="20%" x2="50%" y2="50%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
                {/* eng_past -> eng_perfect */}
                <line x1="50%" y1="50%" x2="50%" y2="80%" stroke="rgba(255,255,255,0.1)" strokeWidth="2" strokeDasharray="4 4" />
              </>
            )}
          </svg>

          {/* Map Nodes */}
          {Object.entries(subjectConcepts).map(([id, details]) => {
            const layout = subjectLayout[id];
            if (!layout) return null;
            
            const status = conceptStatuses[id] || 'locked';
            const isSelectable = status !== 'locked';

            return (
              <button
                key={id}
                onClick={() => isSelectable && onSelectConcept(id)}
                disabled={!isSelectable}
                className={`glass ${getNodeClass(status)}`}
                style={{
                  position: 'absolute',
                  left: `${layout.x}%`,
                  top: `${layout.y}%`,
                  transform: 'translate(-50%, -50%)',
                  padding: '0.6rem 0.9rem',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: isSelectable ? 'pointer' : 'not-allowed',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  backgroundColor: status === 'locked' ? 'rgba(11, 15, 25, 0.6)' : undefined,
                  opacity: status === 'locked' ? 0.5 : 1,
                  whiteSpace: 'nowrap',
                  zIndex: 10
                }}
              >
                {status === 'mastered' && <Award size={14} style={{ color: 'var(--success)' }} />}
                {status === 'gap' && <AlertTriangle size={14} style={{ color: 'var(--warning)' }} />}
                {status === 'unlocked' && <Play size={14} style={{ color: 'var(--primary-light)' }} />}
                {status === 'locked' && <Lock size={12} style={{ color: 'var(--text-muted)' }} />}
                {details.name}
              </button>
            );
          })}
        </div>

        {/* Legend */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', fontSize: '0.75rem', justifyContent: 'center', margin: '0.5rem 0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--success)' }}></span>
            <span>Mastered</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--warning)' }}></span>
            <span>Learning Gap</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'var(--primary)' }}></span>
            <span>Next Recommended</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'rgba(255,255,255,0.2)' }}></span>
            <span>Locked</span>
          </div>
        </div>

        {/* Active Learning Gap Diagnostic Card */}
        {activeGapId && activeGapId !== 'none' && MISCONCEPTIONS[activeGapId] && (
          <div className="glass glow-warning animate-fade-in" style={{ 
            marginTop: 'auto', 
            padding: '1.25rem', 
            borderLeft: '4px solid var(--warning)',
            backgroundColor: 'rgba(245, 158, 11, 0.03)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={18} style={{ color: 'var(--warning)' }} />
              <h3 style={{ fontSize: '0.95rem', fontWeight: 600 }}>Active Gap: {MISCONCEPTIONS[activeGapId].title}</h3>
            </div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', lineHeight: '1.4' }}>
              {MISCONCEPTIONS[activeGapId].desc}
            </p>
            <div style={{ borderTop: '1px solid rgba(245, 158, 11, 0.1)', paddingTop: '0.75rem' }}>
              <h4 style={{ fontSize: '0.8rem', fontWeight: 600, textTransform: 'uppercase', color: 'var(--warning-light)', letterSpacing: '0.05em', marginBottom: '0.25rem' }}>Recommended Remediation:</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-primary)', lineHeight: '1.4' }}>
                {MISCONCEPTIONS[activeGapId].remedy}
              </p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
