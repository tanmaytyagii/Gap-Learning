import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, PieChart, Pie, Cell, Legend,
} from 'recharts';
import {
  BookOpen, Sparkles, Printer, FileText, RefreshCw,
  AlertTriangle, CheckCircle, Download, Users, TrendingUp, Target,
} from 'lucide-react';
import { generateWorksheet, MISCONCEPTIONS } from '../../services/ai';
import { Card, CardHeader, CardBody } from '../ui/Card';
import { Button } from '../ui/Button';
import { StatCard } from '../ui/StatCard';
import { ProgressBar } from '../ui/ProgressRing';

interface TeacherDashboardProps {
  apiKey: string;
}

const subjectStats = {
  math: {
    totalStudents: 28,
    averageMastery: 68,
    activeGapsCount: 2,
    weeklyTrend: [
      { week: 'W1', mastery: 52, engagement: 65 },
      { week: 'W2', mastery: 58, engagement: 70 },
      { week: 'W3', mastery: 63, engagement: 72 },
      { week: 'W4', mastery: 68, engagement: 78 },
    ],
    conceptBreakdown: [
      { name: 'Visualizing Fractions', mastery: 92, students: 26 },
      { name: 'Equivalent Fractions', mastery: 74, students: 21 },
      { name: 'Adding Like Denominators', mastery: 82, students: 23 },
      { name: 'Adding Unlike Denominators', mastery: 48, students: 13 },
      { name: 'Multiplying Fractions', mastery: 55, students: 15 },
    ],
    gapsList: [
      { id: 'direct_denom_addition', name: 'Adding Denominators Directly', count: 12, percent: 43 },
      { id: 'additive_scaling_error', name: 'Additive Scaling in Equivalence', count: 7, percent: 25 },
    ],
    gapDistribution: [
      { name: 'Denominator Addition', value: 43, color: '#EF4444' },
      { name: 'Scaling Error', value: 25, color: '#F59E0B' },
      { name: 'Other', value: 32, color: '#64748B' },
    ],
    urgentHelp: [
      { name: 'Leo Gupta', details: 'Stuck on Adding Unlike Denominators (adding denominators directly)' },
      { name: 'Sam Kelly', details: 'Fails Equivalent Fractions (uses addition to scale up)' },
      { name: 'Priya Sen', details: 'Stuck on Unlike Denominators (doesn\'t convert numerators)' },
    ],
    cruising: [
      { name: 'Sarah Miller', details: 'Completed all topics with 100% accuracy' },
      { name: 'Neil Carter', details: 'Mastered Multiplying Fractions, exploring Algebra' },
    ],
    aiSuggestions: [
      '43% of students fail fraction arithmetic due to direct denominator additions. Shift from equation templates to visual slices.',
      'Conduct a 10-minute drawing assessment for Equivalent Fractions before moving to unlike denominators.',
      'Group Leo, Sam, and Priya for a targeted remediation session on common denominators.',
    ],
  },
  science: {
    totalStudents: 28,
    averageMastery: 74,
    activeGapsCount: 1,
    weeklyTrend: [
      { week: 'W1', mastery: 60, engagement: 68 },
      { week: 'W2', mastery: 65, engagement: 72 },
      { week: 'W3', mastery: 70, engagement: 75 },
      { week: 'W4', mastery: 74, engagement: 80 },
    ],
    conceptBreakdown: [
      { name: 'Concept of Force', mastery: 96, students: 27 },
      { name: 'Gravity, Mass & Weight', mastery: 78, students: 22 },
      { name: 'Net Force & Motion', mastery: 54, students: 15 },
      { name: 'Action & Reaction', mastery: 68, students: 19 },
    ],
    gapsList: [
      { id: 'force_motion_link', name: 'Force-Motion Link Fallacy', count: 9, percent: 32 },
      { id: 'mass_dominant_collision', name: 'Mass-Dominant Force Fallacy', count: 6, percent: 21 },
    ],
    gapDistribution: [
      { name: 'Force-Motion Link', value: 32, color: '#EF4444' },
      { name: 'Mass Fallacy', value: 21, color: '#F59E0B' },
      { name: 'Other', value: 47, color: '#64748B' },
    ],
    urgentHelp: [
      { name: 'Tina Brown', details: 'Thinks constant velocity requires active engines' },
      { name: 'Ryan Vance', details: 'Claims astronaut mass reduces on the moon' },
    ],
    cruising: [
      { name: 'Kavya Nair', details: 'Correctly solved unbalanced force collision vectors' },
      { name: 'Rohan Shah', details: 'Physics concept nodes 100% completed' },
    ],
    aiSuggestions: [
      '32% of students link force directly to motion. Use a hockey-puck simulation showing net force vs friction.',
      'Review Newton\'s First Law with real-world examples before net force calculations.',
    ],
  },
  english: {
    totalStudents: 28,
    averageMastery: 81,
    activeGapsCount: 1,
    weeklyTrend: [
      { week: 'W1', mastery: 72, engagement: 70 },
      { week: 'W2', mastery: 76, engagement: 74 },
      { week: 'W3', mastery: 79, engagement: 77 },
      { week: 'W4', mastery: 81, engagement: 82 },
    ],
    conceptBreakdown: [
      { name: 'Present & Progressive Tenses', mastery: 95, students: 27 },
      { name: 'Past Tense Contrast', mastery: 84, students: 24 },
      { name: 'Present Perfect vs. Past', mastery: 63, students: 18 },
    ],
    gapsList: [
      { id: 'perfect_simple_past_overlap', name: 'Perfect vs. Past Tense Misuse', count: 10, percent: 36 },
    ],
    gapDistribution: [
      { name: 'Perfect/Past Overlap', value: 36, color: '#EF4444' },
      { name: 'Habit Confusion', value: 18, color: '#F59E0B' },
      { name: 'Other', value: 46, color: '#64748B' },
    ],
    urgentHelp: [
      { name: 'Jake Wilson', details: 'Uses Simple Past instead of Present Perfect for ongoing states' },
      { name: 'Emma Watson', details: 'Confuses simple present habits with progressive actions' },
    ],
    cruising: [
      { name: 'Li Wei', details: 'Perfect usage of complex perfect passive constructions' },
      { name: 'Maya Angel', details: 'All grammar levels fully mastered' },
    ],
    aiSuggestions: [
      'Students struggle bridging past to present using Present Perfect. Provide timeline maps marking the boundary.',
      'Use "since/for" exercises to reinforce ongoing vs completed actions.',
    ],
  },
};

const subjectLabels = {
  math: '📐 Mathematics',
  science: '⚡ Physics',
  english: '✍️ English Grammar',
};

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: { value: number; name: string }[]; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="glass-card rounded-lg px-3 py-2 text-xs border border-white/10">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((p, i) => (
        <p key={i} className="text-text-secondary">{p.name}: <span className="text-text">{p.value}%</span></p>
      ))}
    </div>
  );
};

export function TeacherDashboard({ apiKey }: TeacherDashboardProps) {
  const [selectedSubject, setSelectedSubject] = useState<'math' | 'science' | 'english'>('math');
  const [selectedGap, setSelectedGap] = useState('direct_denom_addition');
  const [isGenerating, setIsGenerating] = useState(false);
  const [worksheetContent, setWorksheetContent] = useState<string[] | null>(null);

  const stats = subjectStats[selectedSubject];

  const handleGenerateWorksheet = async () => {
    setIsGenerating(true);
    setWorksheetContent(null);
    try {
      const questions = await generateWorksheet(selectedGap, MISCONCEPTIONS[selectedGap]?.title || 'Concept Error', apiKey);
      setWorksheetContent(questions);
    } catch (err) {
      console.error(err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSubjectChange = (subj: 'math' | 'science' | 'english') => {
    setSelectedSubject(subj);
    setWorksheetContent(null);
    if (subj === 'math') setSelectedGap('direct_denom_addition');
    else if (subj === 'science') setSelectedGap('force_motion_link');
    else setSelectedGap('perfect_simple_past_overlap');
  };

  const formatText = (text: string) => {
    const parts = text.split(/(\$[^\$]+\$)/g);
    return parts.map((part, index) => {
      if (part.startsWith('$') && part.endsWith('$')) {
        return <strong key={index} className="text-primary-light">{part.slice(1, -1)}</strong>;
      }
      return part;
    });
  };

  const handleExport = () => {
    const content = `GapLearning AI - Class Report\nSubject: ${subjectLabels[selectedSubject]}\nStudents: ${stats.totalStudents}\nAverage Mastery: ${stats.averageMastery}%\nActive Gaps: ${stats.activeGapsCount}\n\nConcept Breakdown:\n${stats.conceptBreakdown.map(c => `- ${c.name}: ${c.mastery}%`).join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gapplearning-report-${selectedSubject}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-lg font-semibold font-[family-name:var(--font-display)]">Teacher Analytics Dashboard</h2>
          <p className="text-sm text-text-secondary">Class performance, gap detection & AI teaching suggestions</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {(['math', 'science', 'english'] as const).map((subj) => (
            <Button
              key={subj}
              variant={selectedSubject === subj ? 'primary' : 'secondary'}
              size="sm"
              onClick={() => handleSubjectChange(subj)}
            >
              {subjectLabels[subj]}
            </Button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Students" value={stats.totalStudents} icon={Users} iconColor="text-blue-400" delay={0} />
        <StatCard label="Average Mastery" value={`${stats.averageMastery}%`} change="+6% this month" changeType="positive" icon={TrendingUp} iconColor="text-emerald-400" delay={0.1} />
        <StatCard label="Active Gaps" value={stats.activeGapsCount} change="Needs attention" changeType="negative" icon={Target} iconColor="text-amber-400" delay={0.2} />
        <StatCard label="At-Risk Students" value={stats.urgentHelp.length} change="Intervention needed" changeType="negative" icon={AlertTriangle} iconColor="text-red-400" delay={0.3} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <h3 className="font-semibold font-[family-name:var(--font-display)]">Class Performance Trend</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <LineChart data={stats.weeklyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis dataKey="week" stroke="#64748B" fontSize={12} />
                <YAxis stroke="#64748B" fontSize={12} domain={[0, 100]} />
                <Tooltip content={<CustomTooltip />} />
                <Legend />
                <Line type="monotone" dataKey="mastery" name="Mastery %" stroke="#4F46E5" strokeWidth={2} dot={{ fill: '#4F46E5' }} />
                <Line type="monotone" dataKey="engagement" name="Engagement %" stroke="#7C3AED" strokeWidth={2} dot={{ fill: '#7C3AED' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="font-semibold font-[family-name:var(--font-display)]">Gap Distribution</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={stats.gapDistribution} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                  {stats.gapDistribution.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: '11px' }} />
              </PieChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="font-semibold font-[family-name:var(--font-display)]">Concept Mastery Breakdown</h3>
          </CardHeader>
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={stats.conceptBreakdown} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" />
                <XAxis type="number" domain={[0, 100]} stroke="#64748B" fontSize={11} />
                <YAxis type="category" dataKey="name" stroke="#64748B" fontSize={10} width={120} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="mastery" name="Mastery %" fill="#4F46E5" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-3">
              {stats.conceptBreakdown.map((item) => (
                <ProgressBar key={item.name} value={item.mastery} label={item.name} size="sm" />
              ))}
            </div>
          </CardBody>
        </Card>

        <Card glow="primary">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-primary-light" />
              <h3 className="font-semibold font-[family-name:var(--font-display)] text-primary-light">AI Teaching Suggestions</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {stats.aiSuggestions.map((suggestion, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-3 p-3 rounded-xl bg-primary/5 border border-primary/10"
              >
                <span className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary-light shrink-0">{i + 1}</span>
                <p className="text-sm text-text-secondary leading-relaxed">{suggestion}</p>
              </motion.div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="border-t-4 border-t-danger">
          <CardHeader>
            <h3 className="font-semibold text-red-400 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Urgent Help Needed
            </h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {stats.urgentHelp.map((st, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-danger/5 border border-danger/10">
                <p className="text-sm font-semibold">{st.name}</p>
                <p className="text-xs text-text-secondary mt-1">{st.details}</p>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card className="border-t-4 border-t-success">
          <CardHeader>
            <h3 className="font-semibold text-emerald-400 flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Ready to Advance
            </h3>
          </CardHeader>
          <CardBody className="space-y-3">
            {stats.cruising.map((st, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-success/5 border border-success/10">
                <p className="text-sm font-semibold">{st.name}</p>
                <p className="text-xs text-text-secondary mt-1">{st.details}</p>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-primary-light" />
              <h3 className="font-semibold font-[family-name:var(--font-display)]">AI Worksheet Builder</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-text-secondary">Generate targeted practice questions for specific misconceptions.</p>
            <select
              value={selectedGap}
              onChange={(e) => setSelectedGap(e.target.value)}
              className="w-full bg-black/25 border border-white/10 rounded-xl px-4 py-3 text-sm outline-none focus:border-primary/50 cursor-pointer"
            >
              {stats.gapsList.map((g) => (
                <option key={g.id} value={g.id}>{g.name} ({g.percent}% of class)</option>
              ))}
            </select>
            <Button onClick={handleGenerateWorksheet} loading={isGenerating} className="w-full" icon={<RefreshCw className="w-4 h-4" />}>
              Generate Practice Sheet
            </Button>

            {worksheetContent && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-semibold uppercase text-primary-light flex items-center gap-1">
                    <FileText className="w-3.5 h-3.5" /> Preview
                  </span>
                  <button onClick={() => window.print()} className="text-xs text-text-secondary flex items-center gap-1 hover:text-text">
                    <Printer className="w-3.5 h-3.5" /> Print
                  </button>
                </div>
                <div className="bg-black/30 border border-white/8 rounded-xl p-4 max-h-60 overflow-y-auto space-y-4">
                  {worksheetContent.map((q, idx) => (
                    <div key={idx} className={`text-sm leading-relaxed ${idx < worksheetContent.length - 1 ? 'pb-4 border-b border-dashed border-white/8' : ''}`}>
                      {q.split('\n').map((line, lIdx) => (
                        <p key={lIdx} className="mb-1">{formatText(line)}</p>
                      ))}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Download className="w-5 h-5 text-primary-light" />
              <h3 className="font-semibold font-[family-name:var(--font-display)]">Export Reports</h3>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <p className="text-sm text-text-secondary">Download class performance reports and gap analysis summaries.</p>

            {[
              { label: 'Class Mastery Report', desc: 'Overall performance by concept', format: 'TXT' },
              { label: 'Gap Analysis Summary', desc: 'Misconception frequency breakdown', format: 'TXT' },
              { label: 'Student Intervention List', desc: 'At-risk students requiring support', format: 'TXT' },
            ].map((report) => (
              <div key={report.label} className="flex items-center justify-between p-4 rounded-xl bg-white/3 border border-white/6 hover:border-white/12 transition-colors">
                <div>
                  <p className="text-sm font-medium">{report.label}</p>
                  <p className="text-xs text-text-secondary">{report.desc}</p>
                </div>
                <Button variant="secondary" size="sm" onClick={handleExport} icon={<Download className="w-3.5 h-3.5" />}>
                  {report.format}
                </Button>
              </div>
            ))}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
