/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BookOpen, 
  CheckCircle, 
  AlertTriangle, 
  Clock, 
  ChevronRight, 
  Sparkles, 
  RefreshCw, 
  HelpCircle,
  TrendingUp,
  Award,
  Eye,
  LogOut,
  X,
  Flame,
  ShieldAlert,
  AlertCircle,
  Sun,
  Moon
} from 'lucide-react';
import { Student, StudentTest, Question, ExamType } from '../types';
import { getAssignedTestsForStudent, submitStudentAnswers } from '../lib/db';
import { calculateScore } from '../lib/scoring';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';

interface StudentCabinetProps {
  studentId: string;
  onExit: () => void;
  isPublicView?: boolean;
}

export default function StudentCabinet({ studentId, onExit, isPublicView = false }: StudentCabinetProps) {
  const [studentTests, setStudentTests] = useState<StudentTest[]>([]);
  const [studentName, setStudentName] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [activeTest, setActiveTest] = useState<StudentTest | null>(null);
  const [reviewTest, setReviewTest] = useState<StudentTest | null>(null);
  
  // Theme state
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('student_cabinet_theme') !== 'light';
    } catch {
      return true;
    }
  });

  const toggleTheme = () => {
    const nextMode = !isDarkMode;
    setIsDarkMode(nextMode);
    try {
      localStorage.setItem('student_cabinet_theme', nextMode ? 'dark' : 'light');
    } catch (e) {
      console.error(e);
    }
  };

  // Test solver states
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [doubted, setDoubted] = useState<Record<string, boolean>>({});
  const [timeRemaining, setTimeRemaining] = useState<number>(45 * 60); // 45 mins default countdown
  const [elapsedTime, setElapsedTime] = useState<number>(0);
  const [tabSwitches, setTabSwitches] = useState<number>(0);
  
  // Custom non-blocking visual states
  const [showExitConfirm, setShowExitConfirm] = useState(false);
  const [cabinetError, setCabinetError] = useState<string | null>(null);
  const [activeStatsType, setActiveStatsType] = useState<ExamType>('EGE');
  
  // Refs for tracking active state
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<number>(0);

  // Fetch student tests
  const loadData = async () => {
    try {
      setLoading(true);
      const tests = await getAssignedTestsForStudent(studentId);
      setStudentTests(tests);
      
      // If student has assigned tests, we can find student name or we can derive it
      // Let's get the student profile by checking the students collection
      const docSnap = await import('../lib/db').then(m => m.getStudentById(studentId));
      if (docSnap) {
        setStudentName(docSnap.name);
      }

      // Auto-set stats type based on finished tests
      const finished = tests.filter(t => t.status === 'completed');
      if (finished.length > 0) {
        setActiveStatsType(finished[0].systemType);
      }
    } catch (error) {
      console.error('Failed to load student cabinet data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [studentId]);

  // Handle anti-cheating tracking when activeTest is running
  useEffect(() => {
    if (!activeTest) return;

    const handleVisibilityChange = () => {
      if (document.hidden) {
        setTabSwitches(prev => prev + 1);
      }
    };

    const handleWindowBlur = () => {
      setTabSwitches(prev => prev + 1);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('blur', handleWindowBlur);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('blur', handleWindowBlur);
    };
  }, [activeTest]);

  // Timer loop for active test
  useEffect(() => {
    if (activeTest) {
      startTimeRef.current = Date.now();
      timerRef.current = setInterval(() => {
        setElapsedTime(prev => prev + 1);
        setTimeRemaining(prev => {
          if (prev <= 1) {
            // Auto submit or alert
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setElapsedTime(0);
      setTimeRemaining(45 * 60);
      setTabSwitches(0);
      setAnswers({});
      setDoubted({});
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [activeTest]);

  const startSolving = (test: StudentTest) => {
    setActiveTest(test);
    // Custom countdown timer (45 minutes per test block)
    setTimeRemaining(45 * 60);
    setElapsedTime(0);
    setTabSwitches(0);
    // Prep answers record
    const initialAnswers: Record<string, string> = {};
    const initialDoubted: Record<string, boolean> = {};
    test.questions.forEach(q => {
      initialAnswers[q.id] = '';
      initialDoubted[q.id] = false;
    });
    setAnswers(initialAnswers);
    setDoubted(initialDoubted);
  };

  // Helper to compare student answer with correct answer
  const isAnswerCorrect = (studentAns: string, correctAns: string) => {
    const clean = (str: string) => 
      str ? str.toLowerCase().replace(/[\s,.;-]/g, '').trim() : '';
    
    if (!correctAns) return false;
    const cleanStudent = clean(studentAns);
    
    // Split correct answer by slash in case of multiple valid options
    const options = correctAns.split('/');
    return options.some(opt => clean(opt) === cleanStudent);
  };

  const handleMultipleChoiceToggle = (qId: string, option: string) => {
    // For multiple options in Russian language exam, we join selections with commas or list them in order
    const current = answers[qId] || '';
    let selections = current ? current.split(',').map(s => s.trim()) : [];
    
    // Toggle
    if (selections.includes(option)) {
      selections = selections.filter(s => s !== option);
    } else {
      selections.push(option);
    }
    
    // Sort logically to match "1,2,4" ordering
    selections.sort();
    
    setAnswers(prev => ({
      ...prev,
      [qId]: selections.join(',')
    }));
  };

  const submitTest = async () => {
    if (!activeTest) return;

    let earnedPoints = 0;
    let maxPoints = 0;
    const questionStatus: Record<string, boolean> = {};

    activeTest.questions.forEach(q => {
      const studentAns = answers[q.id] || '';
      const correctAns = q.correctAnswer;
      const isCorrect = isAnswerCorrect(studentAns, correctAns);
      
      questionStatus[q.id] = isCorrect;
      if (isCorrect) {
        earnedPoints += q.points || 1;
      }
      maxPoints += q.points || 1;
    });

    // Score conversion using Russian EGE/OGE 2026 system
    const calculated = calculateScore(earnedPoints, maxPoints, activeTest.systemType);

    const testResults = {
      score: earnedPoints,
      maxScore: maxPoints,
      grade: calculated.grade,
      questionStatus
    };

    try {
      setLoading(true);
      await submitStudentAnswers(
        activeTest.id,
        answers,
        doubted,
        elapsedTime,
        tabSwitches,
        testResults
      );
      
      // Clear active and reload
      setActiveTest(null);
      await loadData();
    } catch (error) {
      console.error('Failed to submit test:', error);
      setCabinetError('Произошла ошибка при сохранении теста. Пожалуйста, попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  // Prepare chart data for Recharts
  const completedTests = studentTests
    .filter(t => t.status === 'completed')
    .reverse(); // Chronological order

  const chartData = completedTests.map((t, idx) => {
    // For EGE, we show the secondary points directly (0-100)
    // For OGE, we show percentage (0-100) or we can map OGE grade to percentage
    const isEGE = t.systemType === 'EGE';
    const finalScore = t.results ? calculateScore(t.results.score, t.results.maxScore, t.systemType) : null;
    
    return {
      name: t.title.substring(0, 15) + '...',
      index: idx + 1,
      // If EGE, use grade directly (secondary points 0-100). If OGE, use OGE grade * 20 (scaled to 100) or simply percentage
      score: finalScore ? (isEGE ? Number(finalScore.grade) : finalScore.percentage) : 0,
      label: finalScore ? (isEGE ? `${finalScore.grade} баллов` : `Оценка ${finalScore.grade}`) : '',
      date: new Date(t.completedAt).toLocaleDateString('ru-RU')
    };
  });

  const pendingTests = studentTests.filter(t => t.status === 'assigned');
  const finishedTests = studentTests.filter(t => t.status === 'completed');

  // Format seconds to MM:SS
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const themeTextMain = isDarkMode ? 'text-gray-200' : 'text-slate-900';
  const themeTextSecondary = isDarkMode ? 'text-gray-400' : 'text-slate-600';
  const themeTextMuted = isDarkMode ? 'text-gray-500' : 'text-slate-400';
  const themeBorder = isDarkMode ? 'border-white/5' : 'border-slate-200';
  const themeBorderHeader = isDarkMode ? 'border-white/10' : 'border-slate-300';
  const themeCardBg = isDarkMode ? 'glass-panel bg-[#1a1825]/40 border-white/5' : 'bg-white border-slate-200 shadow-sm';
  const themeHeaderBg = isDarkMode ? 'glass-panel bg-[#231f33]/50 border-white/10' : 'bg-white border-slate-200 shadow-sm';

  return (
    <div className={`min-h-screen font-sans py-8 px-4 sm:px-6 lg:px-8 transition-colors duration-300 ${
      isDarkMode 
        ? 'bg-[#12111a] text-gray-300' 
        : 'bg-[#f8fafc] text-slate-800'
    }`}>
      {/* Background Gradient Orbs */}
      {isDarkMode && (
        <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[120px]" />
          <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-950/10 rounded-full blur-[120px]" />
        </div>
      )}

      <div className="max-w-6xl mx-auto relative z-10">
        
        {/* Header section */}
        <header className={`flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8 pb-6 border-b ${
          isDarkMode ? 'border-white/5' : 'border-slate-200'
        }`}>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-3 py-0.5 text-xs rounded-full flex items-center gap-1 font-rounded border ${
                isDarkMode 
                  ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                  : 'bg-purple-50 text-purple-600 border-purple-200'
              }`}>
                <Sparkles className="w-3.5 h-3.5" /> Личный кабинет
              </span>
            </div>
            <h1 className={`text-3xl font-extrabold tracking-tight flex items-center gap-3 ${themeTextMain}`}>
              Привет, <span className="text-purple-500 font-rounded">{studentName || 'Ученик'}</span>! 👋
            </h1>
          </div>
          
          <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-start">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              className={`p-2.5 rounded-xl border flex items-center justify-center transition-all ${
                isDarkMode
                  ? 'bg-white/5 border-white/10 text-amber-400 hover:bg-white/10'
                  : 'bg-white border-slate-200 text-purple-600 shadow-sm hover:bg-slate-50'
              }`}
              title={isDarkMode ? 'Включить светлую тему' : 'Включить темную тему'}
              type="button"
            >
              {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {!isPublicView && (
              <button 
                onClick={onExit} 
                className={`px-4 py-2.5 rounded-xl flex items-center gap-2 text-sm font-medium border transition-all ${
                  isDarkMode
                    ? 'liquid-glass-btn border-white/10'
                    : 'bg-white text-slate-700 border-slate-200 shadow-sm hover:bg-slate-50'
                }`}
              >
                <LogOut className="w-4 h-4 text-gray-400" />
                Выйти из кабинета
              </button>
            )}
          </div>
        </header>

        {loading && !activeTest && !reviewTest ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
            <p className="text-gray-400 font-rounded">Загружаем данные кабинета...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* 1. ACTIVE SOLVING SCREEN */}
            {activeTest ? (
              <motion.div
                key="active-test-solver"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Floating Anti-Cheat Warning and Timer HUD */}
                <div className="sticky top-4 z-40 glass-panel p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between border border-white/10 shadow-2xl glow-violet">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/20 rounded-xl text-purple-400">
                      <BookOpen className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-sm sm:text-base">{activeTest.title}</h3>
                      <p className="text-xs text-purple-300">Режим автопроверки • {activeTest.systemType}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    {/* Time spent */}
                    <div className="flex items-center gap-2 text-gray-300">
                      <Clock className="w-4 h-4 text-purple-400" />
                      <div className="text-right">
                        <div className="text-[10px] uppercase tracking-wider text-gray-400 font-mono">Прошло</div>
                        <div className="font-mono text-base font-bold">{formatTime(elapsedTime)}</div>
                      </div>
                    </div>

                    {/* Anti-Cheat Sensor */}
                    <div className="flex items-center gap-2 px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <ShieldAlert className="w-4 h-4 text-red-400" />
                      <div>
                        <div className="text-[9px] uppercase tracking-wider text-red-400 font-mono">Потери фокуса</div>
                        <div className="font-mono text-sm font-bold text-red-400">{tabSwitches} раз(а)</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Question List */}
                <div className="space-y-6">
                  {activeTest.questions.map((q, index) => (
                    <div key={q.id} className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/5 shadow-lg relative overflow-hidden">
                      {/* Decorative index indicator */}
                      <div className="absolute top-0 right-0 p-4 font-mono text-5xl text-white/2 pointer-events-none">
                        #{q.number}
                      </div>

                      <div className="flex items-start gap-4">
                        <span className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-500/10 text-purple-400 font-mono font-bold text-sm flex items-center justify-center border border-purple-500/20">
                          {q.number}
                        </span>
                        <div className="flex-grow space-y-4">
                          <h4 className="text-base sm:text-lg font-medium text-gray-200 whitespace-pre-line leading-relaxed">
                            {q.text}
                          </h4>

                          <div className="flex items-center">
                            <button
                              type="button"
                              onClick={() => setDoubted(prev => ({ ...prev, [q.id]: !prev[q.id] }))}
                              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all border ${
                                doubted[q.id]
                                  ? 'bg-amber-500/10 text-amber-500 border-amber-500/30 shadow-sm shadow-amber-500/5'
                                  : isDarkMode
                                    ? 'bg-white/5 hover:bg-white/10 text-gray-400 border-white/5'
                                    : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-200'
                              }`}
                            >
                              <HelpCircle className={`w-3.5 h-3.5 ${doubted[q.id] ? 'text-amber-500 animate-pulse' : 'text-slate-400'}`} />
                              <span>хочу обсудить</span>
                              {doubted[q.id] && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full" />}
                            </button>
                          </div>

                          {/* Options Block if single choice test */}
                          {q.type === 'single' && q.options && (
                            <div className="grid gap-3 pt-2">
                              {q.options.map((opt, oIdx) => {
                                const isSelected = answers[q.id] === String(oIdx + 1);
                                return (
                                  <label 
                                    key={oIdx}
                                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-purple-500/10 border-purple-500/40 text-purple-200' 
                                        : 'bg-white/2 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-300'
                                    }`}
                                  >
                                    <input 
                                      type="radio" 
                                      name={`answer-${q.id}`}
                                      className="hidden"
                                      checked={isSelected}
                                      onChange={() => setAnswers(prev => ({ ...prev, [q.id]: String(oIdx + 1) }))}
                                    />
                                    <span className={`w-4 h-4 rounded-full flex items-center justify-center border ${
                                      isSelected
                                        ? 'bg-purple-500 border-purple-500 text-white'
                                        : 'border-white/20'
                                    }`}>
                                      {isSelected && <span className="w-2 h-2 rounded-full bg-white" />}
                                    </span>
                                    <span className="text-sm font-medium">{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* Options Block if multiple choice test */}
                          {q.type === 'multiple' && q.options && (
                            <div className="grid gap-3 pt-2">
                              {q.options.map((opt, oIdx) => {
                                const isSelected = answers[q.id]?.split(',').map(s => s.trim()).includes(String(oIdx + 1)) || false;
                                return (
                                  <label 
                                    key={oIdx}
                                    className={`flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                                      isSelected
                                        ? 'bg-purple-500/10 border-purple-500/40 text-purple-200' 
                                        : 'bg-white/2 border-white/5 text-gray-400 hover:bg-white/5 hover:text-gray-300'
                                    }`}
                                  >
                                    <input 
                                      type="checkbox" 
                                      className="hidden"
                                      checked={isSelected}
                                      onChange={() => handleMultipleChoiceToggle(q.id, String(oIdx + 1))}
                                    />
                                    <span className={`w-4 h-4 rounded flex items-center justify-center border text-[10px] ${
                                      isSelected
                                        ? 'bg-purple-500 border-purple-500 text-white'
                                        : 'border-white/20'
                                    }`}>
                                      {isSelected && '✓'}
                                    </span>
                                    <span className="text-sm font-medium">{opt}</span>
                                  </label>
                                );
                              })}
                            </div>
                          )}

                          {/* Options Block for matching (соответствие) */}
                          {q.type === 'matching' && q.leftItems && q.options && (
                            <div className="space-y-4 pt-2">
                              <p className="text-xs text-purple-400 font-medium">Для каждой строки слева выберите правильную строку справа:</p>
                              <div className="grid gap-4">
                                {q.leftItems.map((leftVal, lIdx) => {
                                  const currentAnswers = answers[q.id] ? answers[q.id].split(',') : [];
                                  const selectedRightIdx = currentAnswers[lIdx] || '';
                                  
                                  return (
                                    <div key={lIdx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white/2 border border-white/5 rounded-xl">
                                      <span className="text-sm font-medium text-gray-200">{leftVal}</span>
                                      
                                      <select
                                        value={selectedRightIdx}
                                        onChange={(e) => {
                                          const nextAnswers = [...currentAnswers];
                                          for (let i = 0; i < q.leftItems!.length; i++) {
                                            if (nextAnswers[i] === undefined) nextAnswers[i] = '';
                                          }
                                          nextAnswers[lIdx] = e.target.value;
                                          setAnswers(prev => ({
                                            ...prev,
                                            [q.id]: nextAnswers.join(',')
                                          }));
                                        }}
                                        className="bg-[#121218] border border-white/10 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-purple-500 text-purple-300 font-semibold cursor-pointer"
                                      >
                                        <option value="">Выберите соответствие...</option>
                                        {q.options?.map((rightVal, rIdx) => (
                                          <option key={rIdx} value={String(rIdx + 1)}>
                                            {rightVal}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Options Block for text answer */}
                          {q.type === 'text' && (
                            <div className="pt-2">
                              <label className="block text-xs uppercase tracking-wider text-gray-500 font-mono mb-2">
                                Введите ваш ответ (регистр букв и пробелы не важны):
                              </label>
                              <input 
                                type="text"
                                value={answers[q.id] || ''}
                                onChange={(e) => setAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                                placeholder="Ваш ответ здесь..."
                                className="w-full bg-[#121218] border border-white/10 rounded-xl py-3 px-4 text-gray-200 placeholder-gray-600 focus:outline-none focus:border-purple-500/50 transition-all font-mono"
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Footer Controls */}
                <div className="flex justify-end gap-4 pt-4">
                  <button
                    onClick={() => setShowExitConfirm(true)}
                    className="px-6 py-3 rounded-xl border border-white/5 hover:bg-white/5 text-gray-400 text-sm font-medium transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={submitTest}
                    className="liquid-glass-btn px-8 py-3 rounded-xl text-sm font-bold flex items-center gap-2 glow-violet"
                  >
                    <CheckCircle className="w-5 h-5 text-purple-400" />
                    Завершить и проверить
                  </button>
                </div>
              </motion.div>
            ) : reviewTest ? (
              
              /* 2. COMPLETED TEST REVIEW SCREEN */
              <motion.div
                key="review-test-screen"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                <div className="glass-panel p-6 rounded-2xl border border-white/10 flex flex-wrap gap-4 items-center justify-between">
                  <div>
                    <h2 className="text-xl font-bold font-rounded text-gray-200">{reviewTest.title}</h2>
                    <p className="text-xs text-gray-400 mt-1">
                      Решено: {reviewTest.completedAt ? new Date(reviewTest.completedAt).toLocaleString('ru-RU') : 'Ранее'}
                    </p>
                  </div>
                  <button 
                    onClick={() => setReviewTest(null)}
                    className="liquid-glass-btn px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1"
                  >
                    <X className="w-4 h-4" /> Закрыть разбор
                  </button>
                </div>

                {/* Scoring HUD */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-center items-center text-center">
                    <Award className="w-8 h-8 text-yellow-400 mb-2" />
                    <span className="text-xs uppercase tracking-wider text-gray-500 font-mono">Баллы</span>
                    <span className="text-3xl font-extrabold font-mono text-gray-200 mt-1">
                      {reviewTest.results?.score} / {reviewTest.results?.maxScore}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1">Первичные баллы</span>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-center items-center text-center">
                    <TrendingUp className="w-8 h-8 text-purple-400 mb-2" />
                    <span className="text-xs uppercase tracking-wider text-gray-500 font-mono">
                      {reviewTest.systemType === 'EGE' ? 'Тестовый балл' : 'Оценка ОГЭ'}
                    </span>
                    <span className="text-3xl font-extrabold font-rounded text-purple-400 mt-1">
                      {reviewTest.results ? calculateScore(reviewTest.results.score, reviewTest.results.maxScore, reviewTest.systemType).grade : 'N/A'}
                    </span>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-center items-center text-center">
                    <Clock className="w-8 h-8 text-purple-400 mb-2" />
                    <span className="text-xs uppercase tracking-wider text-gray-500 font-mono">Потрачено времени</span>
                    <span className="text-2xl font-extrabold font-mono text-gray-200 mt-1">
                      {formatTime(reviewTest.timeSpent)}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1">Минут и секунд</span>
                  </div>

                  <div className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-center items-center text-center">
                    <ShieldAlert className="w-8 h-8 text-red-400 mb-2" />
                    <span className="text-xs uppercase tracking-wider text-gray-500 font-mono">Выходов из вкладки</span>
                    <span className="text-2xl font-extrabold font-mono text-red-400 mt-1">
                      {reviewTest.tabSwitches}
                    </span>
                    <span className="text-[11px] text-gray-400 mt-1">Фиксация честности</span>
                  </div>
                </div>

                {/* Question Summary Table */}
                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-sm font-bold text-gray-200 uppercase tracking-wider font-mono">Сводная таблица по заданиям</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-400 font-medium font-mono">
                          <th className="py-2.5 px-3">№</th>
                          <th className="py-2.5 px-3">Тип задания</th>
                          <th className="py-2.5 px-3">Ваш ответ</th>
                          <th className="py-2.5 px-3">Правильный ответ</th>
                          <th className="py-2.5 px-3 text-center">Статус</th>
                          <th className="py-2.5 px-3 text-right">Баллы</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviewTest.questions.map((q) => {
                          const studentAns = reviewTest.answers[q.id] || '';
                          const isCorrect = reviewTest.results?.questionStatus[q.id] ?? false;
                          return (
                            <tr key={q.id} className="border-b border-white/5 hover:bg-white/2">
                              <td className="py-2.5 px-3 font-bold font-mono">№{q.number}</td>
                              <td className="py-2.5 px-3 text-gray-300">
                                {q.type === 'single' ? 'Один выбор' : q.type === 'multiple' ? 'Множественный выбор' : q.type === 'matching' ? 'Соответствие' : 'Короткий ответ'}
                              </td>
                              <td className={`py-2.5 px-3 font-mono ${isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}`}>
                                {studentAns || '<пусто>'}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-emerald-400">
                                {q.correctAnswer.includes('/') ? q.correctAnswer.split('/').join(' или ') : q.correctAnswer}
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isCorrect ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'}`}>
                                  {isCorrect ? 'Верно' : 'Неверно'}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right font-mono text-gray-300">
                                {isCorrect ? q.points || 1 : 0} из {q.points || 1}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Items analysis */}
                <div className="space-y-6">
                  <h3 className="text-lg font-bold font-rounded">Подробный разбор заданий</h3>
                  {reviewTest.questions.map((q) => {
                    const studentAns = reviewTest.answers[q.id] || '';
                    const isCorrect = reviewTest.results?.questionStatus[q.id] ?? false;

                    return (
                      <div 
                        key={q.id} 
                        className={`glass-panel p-6 rounded-2xl border ${
                          isCorrect ? 'border-emerald-500/20 bg-emerald-950/2' : 'border-rose-500/20 bg-rose-950/2'
                        } relative overflow-hidden`}
                      >
                        <div className="absolute top-4 right-4 flex items-center gap-2">
                          {isCorrect ? (
                            <span className="px-3 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-full font-rounded">
                              Верно (+{q.points || 1} б.)
                            </span>
                          ) : (
                            <span className="px-3 py-1 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs rounded-full font-rounded">
                              Неверно (0 б.)
                            </span>
                          )}
                        </div>

                        <div className="flex items-start gap-4">
                          <span className={`flex-shrink-0 w-8 h-8 rounded-full font-mono font-bold text-sm flex items-center justify-center border ${
                            isCorrect 
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                          }`}>
                            {q.number}
                          </span>
                          <div className="flex-grow space-y-4">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pr-16">
                              <h4 className="text-base font-medium text-gray-200 whitespace-pre-line leading-relaxed">
                                {q.text}
                              </h4>
                              {reviewTest.doubtedQuestions?.[q.id] && (
                                <span className="flex-shrink-0 self-start sm:self-center inline-flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-500 border border-amber-500/20">
                                  <HelpCircle className="w-3.5 h-3.5 text-amber-500" />
                                  Хочу обсудить
                                </span>
                              )}
                            </div>

                            {/* Single / Multiple Choice Review */}
                            {(q.type === 'single' || q.type === 'multiple') && q.options && (
                              <div className="grid gap-2 pt-2">
                                {q.options.map((opt, oIdx) => {
                                  const isSelected = studentAns.split(',').map(s => s.trim()).includes(String(oIdx + 1));
                                  const isCorrectOption = q.correctAnswer.split(',').map(s => s.trim()).includes(String(oIdx + 1));
                                  let optionStyle = 'bg-white/2 border-white/5 text-gray-500';
                                  
                                  if (isSelected && isCorrectOption) {
                                    optionStyle = 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300';
                                  } else if (isSelected && !isCorrectOption) {
                                    optionStyle = 'bg-rose-500/10 border-rose-500/30 text-rose-300';
                                  } else if (!isSelected && isCorrectOption) {
                                    optionStyle = 'bg-emerald-500/5 border-emerald-500/10 text-emerald-400/70 border-dashed';
                                  }

                                  return (
                                    <div key={oIdx} className={`p-3 rounded-xl border text-sm flex items-center gap-3 ${optionStyle}`}>
                                      <span className="font-mono text-xs font-semibold">Вариант {oIdx + 1}</span>
                                      <span>{opt}</span>
                                      {isSelected && <span className="ml-auto text-xs opacity-75">(Ваш выбор)</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            )}

                            {/* Matching Question Review */}
                            {q.type === 'matching' && q.leftItems && q.options && (
                              <div className="space-y-2 pt-2">
                                <div className="text-xs font-semibold text-gray-400">Соответствие элементов:</div>
                                <div className="grid gap-2">
                                  {q.leftItems.map((leftVal, lIdx) => {
                                    const studentSelectedIdx = studentAns.split(',')[lIdx];
                                    const correctSelectedIdx = q.correctAnswer.split(',')[lIdx];
                                    const isMatchCorrect = studentSelectedIdx === correctSelectedIdx;
                                    
                                    const studentRightText = studentSelectedIdx ? q.options![parseInt(studentSelectedIdx) - 1] : '<не выбрано>';
                                    const correctRightText = correctSelectedIdx ? q.options![parseInt(correctSelectedIdx) - 1] : '';

                                    return (
                                      <div key={lIdx} className={`p-3 rounded-xl border text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                                        isMatchCorrect 
                                          ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-300' 
                                          : 'bg-rose-500/5 border-rose-500/20 text-rose-300'
                                      }`}>
                                        <div className="flex items-center gap-2">
                                          <span className="font-semibold text-gray-300">{leftVal}</span>
                                          <span className="text-gray-500">→</span>
                                          <span className="font-medium text-gray-200">{studentRightText}</span>
                                        </div>
                                        {!isMatchCorrect && (
                                          <div className="text-xs text-emerald-400 font-medium">
                                            Правильно: <span className="underline">{correctRightText}</span>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}

                            <div className="p-4 bg-white/2 rounded-xl border border-white/5 space-y-2">
                              <div className="flex flex-wrap gap-4 text-sm font-mono">
                                <div>
                                  <span className="text-gray-400">Ваш ответ:</span>{' '}
                                  <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                                    {studentAns || '<пусто>'}
                                  </span>
                                </div>
                                {!isCorrect && (
                                  <div>
                                    <span className="text-gray-400">Правильный ответ:</span>{' '}
                                    <span className="text-emerald-400 font-bold">
                                      {q.correctAnswer.includes('/') ? q.correctAnswer.split('/').join(' или ') : q.correctAnswer}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ) : (
              
              /* 3. MAIN STUDENT CABINET DASHBOARD */
              <motion.div
                key="main-dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Left Columns - assigned and solved tests list */}
                <div className="lg:col-span-2 space-y-8">
                  
                  {/* Assigned / Pending section */}
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
                      <h2 className={`text-lg font-bold font-rounded ${themeTextMain}`}>Домашки</h2>
                      <span className="ml-auto px-2 py-0.5 bg-purple-500/15 text-purple-400 text-xs rounded-full font-mono font-bold">
                        {pendingTests.length}
                      </span>
                    </div>

                    {pendingTests.length === 0 ? (
                      <div className={`p-8 rounded-2xl border text-center ${themeTextSecondary} ${themeCardBg}`}>
                        <BookOpen className="w-10 h-10 mx-auto text-purple-400 mb-2 opacity-80" />
                        <p className="font-rounded text-sm font-semibold">Пока нет новых назначенных домашек.</p>
                        <p className={`text-xs mt-1 ${themeTextMuted}`}>Репетитор добавит тесты, как только они будут готовы!</p>
                      </div>
                    ) : (
                      <div className="grid gap-4">
                        {pendingTests.map((t) => (
                          <div 
                            key={t.id} 
                            className={`p-5 rounded-2xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all shadow-sm hover:shadow-md group ${
                              isDarkMode 
                                ? 'glass-panel border-white/5 hover:border-white/10 bg-[#1a1825]/40' 
                                : 'bg-white border-slate-200 hover:border-slate-300'
                            }`}
                          >
                            <div>
                              <div className="flex items-center gap-2 mb-1.5">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  t.systemType === 'EGE' 
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                }`}>
                                  {t.systemType}
                                </span>
                                <span className={`text-[11px] flex items-center gap-1 font-mono ${themeTextMuted}`}>
                                  <Clock className="w-3 h-3 text-purple-400" /> 45 минут
                                </span>
                              </div>
                              <h3 className={`text-base font-bold transition-colors group-hover:text-purple-500 ${themeTextMain}`}>
                                {t.title}
                              </h3>
                              <p className={`text-xs mt-1 line-clamp-2 max-w-lg ${themeTextSecondary}`}>
                                {t.description}
                              </p>
                            </div>

                            <button
                              onClick={() => startSolving(t)}
                              className={`px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-2 self-stretch sm:self-auto justify-center transition-all ${
                                isDarkMode
                                  ? 'bg-purple-600 hover:bg-purple-500 text-gray-200 shadow-lg shadow-purple-900/20'
                                  : 'bg-purple-600 hover:bg-purple-500 text-white shadow-sm shadow-purple-200 hover:shadow-md'
                              }`}
                            >
                              Начать тест <ChevronRight className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Completed / History section */}
                  <div className="space-y-4">
                    <h2 className={`text-lg font-bold font-rounded flex items-center gap-2 ${themeTextMain}`}>
                      <CheckCircle className="w-5 h-5 text-emerald-400" /> Выполненные тесты
                      <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 text-xs rounded-full font-mono font-bold">
                        {finishedTests.length}
                      </span>
                    </h2>

                    {finishedTests.length === 0 ? (
                      <div className={`p-8 rounded-2xl border text-center ${themeTextSecondary} ${themeCardBg}`}>
                        <CheckCircle className="w-10 h-10 mx-auto text-emerald-400/80 mb-2" />
                        <p className="font-rounded text-sm">Здесь будет твоя история выполненных тестов.</p>
                      </div>
                    ) : (
                      <div className="grid gap-3">
                        {finishedTests.map((t) => {
                          const result = t.results ? calculateScore(t.results.score, t.results.maxScore, t.systemType) : null;
                          return (
                            <div 
                              key={t.id}
                              className={`p-4 rounded-xl border flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all shadow-sm hover:shadow-md ${
                                isDarkMode 
                                  ? 'glass-panel border-white/5 bg-[#1a1825]/40 hover:bg-white/5' 
                                  : 'bg-white border-slate-200 hover:border-slate-300'
                              }`}
                            >
                              <div>
                                <span className={`text-[10px] font-mono ${themeTextMuted}`}>
                                  {t.completedAt ? new Date(t.completedAt).toLocaleDateString('ru-RU') : 'Ранее'}
                                </span>
                                <h4 className={`text-sm font-bold mt-0.5 ${themeTextMain}`}>{t.title}</h4>
                                <div className={`flex gap-4 mt-1.5 text-xs font-mono ${themeTextSecondary}`}>
                                  <span>Время: {formatTime(t.timeSpent)}</span>
                                  <span className="text-red-400">Выходов: {t.tabSwitches}</span>
                                </div>
                              </div>

                              <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between border-t sm:border-0 border-white/5 pt-3 sm:pt-0">
                                <div className="text-right">
                                  <div className={`text-[10px] uppercase tracking-wider font-mono ${themeTextMuted}`}>Балл / Оценка</div>
                                  <div className="font-bold text-sm text-purple-500 font-rounded">
                                    {result ? result.gradeText : 'N/A'}
                                  </div>
                                </div>
                                <button
                                  onClick={() => setReviewTest(t)}
                                  className="px-3.5 py-1.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-600 dark:text-purple-300 hover:bg-purple-500/25 text-xs font-bold transition-all flex items-center gap-1.5"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Анализ
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right Column - Stats, Chart, Progress Table */}
                <div className="space-y-8">
                  
                  {/* Progress chart */}
                  <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="text-base font-bold font-rounded text-gray-200 flex items-center gap-2">
                      <TrendingUp className="w-5 h-5 text-purple-400" /> График прогресса
                    </h3>
                    
                    {chartData.length < 1 ? (
                      <div className="h-44 flex items-center justify-center text-gray-600 text-center text-xs p-4 border border-dashed border-white/5 rounded-xl">
                        Решите хотя бы один тест для построения графика прогресса.
                      </div>
                    ) : (
                      <div className="h-48 w-full pt-2">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.03)" />
                            <XAxis dataKey="index" stroke="#6b7280" fontSize={10} tickLine={false} />
                            <YAxis domain={[0, 100]} stroke="#6b7280" fontSize={10} tickLine={false} />
                            <Tooltip 
                              contentStyle={{ backgroundColor: '#121218', borderColor: 'rgba(255,255,255,0.08)', borderRadius: '12px' }}
                              labelClassName="text-gray-400 text-xs font-mono"
                              formatter={(value: any, name: any, props: any) => [props.payload.label, 'Результат']}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="score" 
                              stroke="#8773db" 
                              strokeWidth={2}
                              dot={{ fill: '#8773db', strokeWidth: 1 }}
                              activeDot={{ r: 6 }} 
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3 flex gap-3 items-start">
                      <Award className="w-5 h-5 text-purple-400 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-300 leading-relaxed">
                        График отображает ваши тестовые баллы (для ЕГЭ по шкале от 0 до 100) или процент успеха (для ОГЭ) по каждому пройденному тесту.
                      </p>
                    </div>
                  </div>

                  {/* Summary progress table */}
                  <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="text-base font-bold font-rounded text-gray-200">Карта заданий</h3>
                    
                    {finishedTests.length === 0 ? (
                      <div className="text-xs text-gray-600 text-center py-6 border border-dashed border-white/5 rounded-xl">
                        Карта ошибок и правильных ответов заполнится автоматически.
                      </div>
                    ) : (
                      <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                        {finishedTests.map((t) => {
                          return (
                            <div key={t.id} className="p-3 bg-white/2 rounded-xl border border-white/5 text-xs space-y-2">
                              <div className="flex justify-between text-gray-400">
                                <span className="font-semibold text-gray-300 truncate max-w-[130px]">{t.title}</span>
                                <span className="font-mono text-[10px]">{t.completedAt ? new Date(t.completedAt).toLocaleDateString('ru-RU') : ''}</span>
                              </div>
                              <div className="flex flex-wrap gap-1.5">
                                {t.questions.map((q) => {
                                  const isCorrect = t.results?.questionStatus[q.id];
                                  return (
                                    <div 
                                      key={q.id}
                                      className={`px-2 py-1 rounded text-[10px] font-mono flex items-center gap-1 ${
                                        isCorrect 
                                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' 
                                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/25'
                                      }`}
                                      title={`Задание ${q.number}: ${isCorrect ? 'Правильно' : 'Ошибка'}`}
                                    >
                                      <span>№{q.number}</span>
                                      <span className="font-bold">{isCorrect ? '+' : '-'}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* Cumulative question stats table (Pivot Matrix format) */}
                  <div className={`p-5 rounded-2xl border space-y-6 ${
                    isDarkMode ? 'glass-panel border-white/5' : 'bg-white border-slate-200/80 shadow-sm'
                  }`}>
                    <div>
                      <h3 className={`text-base font-bold font-rounded ${themeTextMain}`}>Статистика по номерам заданий</h3>
                      <p className={`text-[11px] ${themeTextSecondary}`}>Таблица результатов по датам написания тестов</p>
                    </div>

                    {(() => {
                      const egeTests = finishedTests.filter(t => t.systemType === 'EGE');
                      const ogeTests = finishedTests.filter(t => t.systemType === 'OGE');

                      if (egeTests.length === 0 && ogeTests.length === 0) {
                        return (
                          <div className={`text-xs text-center py-10 border border-dashed rounded-xl ${
                            isDarkMode ? 'text-gray-500 border-white/5' : 'text-slate-400 border-slate-200'
                          }`}>
                            Статистика пуста. Пройдите хотя бы один тест для вывода таблицы результатов.
                          </div>
                        );
                      }

                      // Helper function to render a single table
                      const renderTable = (type: ExamType, testsList: StudentTest[]) => {
                        const questionNumbers = type === 'EGE'
                          ? Array.from({ length: 26 }, (_, i) => i + 1)
                          : Array.from({ length: 11 }, (_, i) => i + 2);
                        
                        const sortedTests = [...testsList].sort((a, b) => {
                          const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                          const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
                          return dateA - dateB;
                        });

                        return (
                          <div className="space-y-3">
                            <div className="flex items-center gap-2">
                              <span className={`w-2 h-2 rounded-full ${type === 'EGE' ? 'bg-purple-400' : 'bg-indigo-400'}`} />
                              <h4 className={`text-xs font-bold font-rounded uppercase tracking-wider ${isDarkMode ? 'text-purple-300' : 'text-purple-700'}`}>
                                Результаты {type === 'EGE' ? 'ЕГЭ' : 'ОГЭ'}
                              </h4>
                            </div>
                            <div className={`overflow-x-auto max-h-[350px] overflow-y-auto pr-1 rounded-xl border ${
                              isDarkMode ? 'border-purple-500/10 bg-[#0e0d14]' : 'border-slate-200/60 bg-slate-50/50'
                            }`}>
                              <table className="w-full text-left border-collapse text-xs">
                                <thead>
                                  <tr className={isDarkMode ? 'bg-[#181622]' : 'bg-slate-50'}>
                                    <th className={`py-3 px-3 border-b sticky left-0 z-20 font-bold ${
                                      isDarkMode ? 'border-white/10 text-gray-200 bg-[#12111a]' : 'border-slate-200 text-slate-800 bg-slate-50'
                                    } w-[120px] min-w-[100px]`}>
                                      Задание
                                    </th>
                                    {sortedTests.map((t, idx) => {
                                      const dateStr = t.completedAt
                                        ? new Date(t.completedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                        : '—';
                                      return (
                                        <th 
                                          key={t.id + '-' + idx} 
                                          className={`py-3 px-3 border-b text-center font-mono font-medium whitespace-nowrap min-w-[110px] ${
                                            isDarkMode ? 'border-white/10 text-gray-300' : 'border-slate-200 text-slate-700'
                                          }`}
                                        >
                                          <div className={`text-[10px] truncate max-w-[120px] mx-auto font-sans font-semibold ${
                                            isDarkMode ? 'text-purple-400' : 'text-purple-700'
                                          }`} title={t.title}>
                                            {t.title}
                                          </div>
                                          <div className="text-[10px] mt-0.5 text-gray-500">{dateStr}</div>
                                        </th>
                                      );
                                    })}
                                  </tr>
                                </thead>
                                <tbody>
                                  {questionNumbers.map((num) => {
                                    return (
                                      <tr 
                                        key={num} 
                                        className={`border-b transition-colors ${
                                          isDarkMode ? 'border-white/5 hover:bg-white/2' : 'border-slate-100 hover:bg-slate-50'
                                        }`}
                                      >
                                        <td className={`py-2.5 px-3 font-bold font-mono sticky left-0 z-10 flex items-center gap-1.5 ${
                                          isDarkMode ? 'text-purple-300 bg-[#12111a]' : 'text-purple-600 bg-white border-r border-slate-100'
                                        }`}>
                                          <span className="opacity-60 text-[9px]">№</span>{num}
                                        </td>
                                        {sortedTests.map((t, idx) => {
                                          const questionInTest = t.questions.find(q => q.number === num);
                                          if (!questionInTest) {
                                            return (
                                              <td key={t.id + '-' + idx} className="py-2.5 px-3 text-center text-gray-500 font-mono">
                                                —
                                              </td>
                                            );
                                          }

                                          const isCorrect = t.results?.questionStatus?.[questionInTest.id] ?? false;
                                          const maxPoints = questionInTest.points || 1;
                                          const score = isCorrect ? maxPoints : 0;
                                          const isDoubted = t.doubtedQuestions?.[questionInTest.id] || false;

                                          return (
                                            <td key={t.id + '-' + idx} className="py-2 px-3 text-center">
                                              <span 
                                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-mono text-[10px] font-bold border transition-all ${
                                                  isDoubted
                                                    ? 'bg-amber-500/15 text-amber-500 border-amber-500/30'
                                                    : isCorrect
                                                      ? (isDarkMode ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' : 'bg-emerald-50 text-emerald-800 border-emerald-200')
                                                      : (isDarkMode ? 'bg-rose-500/15 text-rose-400 border-rose-500/20' : 'bg-rose-50 text-rose-800 border-rose-200')
                                                }`}
                                                title={`${isCorrect ? 'Решено верно' : 'Ошибка'} • Получено баллов: ${score} из ${maxPoints}${isDoubted ? ' • Вы отмечали для обсуждения' : ''}`}
                                              >
                                                <span>{score} б.</span>
                                                <span className="text-[8px] opacity-70">({isCorrect ? '✓' : '✗'})</span>
                                                {isDoubted && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />}
                                              </span>
                                            </td>
                                          );
                                        })}
                                      </tr>
                                    );
                                  })}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        );
                      };

                      return (
                        <div className="space-y-6">
                          {egeTests.length > 0 && renderTable('EGE', egeTests)}
                          {ogeTests.length > 0 && renderTable('OGE', ogeTests)}
                        </div>
                      );
                    })()}
                  </div>

                </div>
              </motion.div>
            )}
          </AnimatePresence>
        )}

        {/* ==================== STUDENT CABINET CUSTOM OVERLAYS ==================== */}
        
        {/* 1. Confirm Interruption Modal */}
        <AnimatePresence>
          {showExitConfirm && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#121218] border border-white/10 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <X className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-gray-200 font-rounded">Прервать выполнение теста?</h4>
                  <p className="text-xs text-gray-400">
                    Ваш текущий прогресс решения не сохранится. Вы действительно хотите выйти?
                  </p>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setShowExitConfirm(false)}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition-all"
                  >
                    Вернуться к тесту
                  </button>
                  <button
                    onClick={() => {
                      setActiveTest(null);
                      setShowExitConfirm(false);
                    }}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Да, прервать
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 2. Error Display Modal */}
        <AnimatePresence>
          {cabinetError && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#121218] border border-white/10 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <AlertCircle className="w-6 h-6" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-gray-200 font-rounded">Произошла ошибка</h4>
                  <p className="text-xs text-gray-400">
                    {cabinetError}
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => setCabinetError(null)}
                    className="w-full py-2 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all"
                  >
                    Понятно
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

      </div>
    </div>
  );
}
