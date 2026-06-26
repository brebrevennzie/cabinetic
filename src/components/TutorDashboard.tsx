/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  BookOpen, 
  Plus, 
  Trash2, 
  Copy, 
  Check, 
  TrendingUp, 
  Settings, 
  ShieldAlert, 
  Clock, 
  Eye, 
  FileText, 
  CheckCircle, 
  AlertCircle,
  FolderOpen,
  ArrowRight,
  Sparkles,
  HelpCircle,
  Lock,
  Unlock,
  KeyRound,
  X,
  PlusCircle,
  Menu,
  RefreshCw
} from 'lucide-react';
import { Student, Test, StudentTest, Question } from '../types';
import { 
  getAllStudents, 
  createStudent, 
  deleteStudent, 
  getAllTests, 
  createTest, 
  deleteTest, 
  getAssignedTestsForStudent, 
  assignTestToStudent, 
  deleteAssignedTest,
  getTutorSettings,
  saveTutorSettings
} from '../lib/db';
import { calculateScore } from '../lib/scoring';
import StudentCabinet from './StudentCabinet';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';


export default function TutorDashboard() {
  const [activeTab, setActiveTab] = useState<'students' | 'tests' | 'settings'>('students');
  const [students, setStudents] = useState<Student[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);

  // Password Gate
  const [isUnlocked, setIsUnlocked] = useState(true);
  const [pinInput, setPinInput] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [isConfiguringPin, setIsConfiguringPin] = useState(false);
  const [pinError, setPinError] = useState('');

  // Student list UI states
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentTests, setStudentTests] = useState<StudentTest[]>([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [assigningTestId, setAssigningTestId] = useState<string>('');
  const [viewingCabinetStudentId, setViewingCabinetStudentId] = useState<string | null>(null);
  const [tutorStatsType, setTutorStatsType] = useState<'EGE' | 'OGE'>('EGE');

  // Test builder UI states
  const [isCreatingTest, setIsCreatingTest] = useState(false);
  const [newTestTitle, setNewTestTitle] = useState('');
  const [newTestDesc, setNewTestDesc] = useState('');
  const [newTestType, setNewTestType] = useState<'OGE' | 'EGE'>('EGE');
  const [newQuestions, setNewQuestions] = useState<Question[]>([]);
  
  // Active question builder fields
  const [qNumber, setQNumber] = useState<number>(1);
  const [qText, setQText] = useState('');
  const [qType, setQType] = useState<Question['type']>('single');
  const [qOptions, setQOptions] = useState<string[]>(['', '']);
  const [qCorrectAnswer, setQCorrectAnswer] = useState('');
  const [qPoints, setQPoints] = useState<number>(1);

  // Review modal states
  const [reviewingTest, setReviewingTest] = useState<StudentTest | null>(null);

  // Custom confirmation modal states (instead of native alert/confirm which fails in sandbox iframe)
  const [studentToDelete, setStudentToDelete] = useState<Student | null>(null);
  const [testToDelete, setTestToDelete] = useState<{ id: string; title: string } | null>(null);
  const [libraryTestToDelete, setLibraryTestToDelete] = useState<Test | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [testBuilderError, setTestBuilderError] = useState<string | null>(null);


  // Fetch initial data and settings
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        // Load settings to check PIN (Bypassed by user request)
        const settings = await getTutorSettings();
        if (settings.isConfigured && settings.passwordHash) {
          setSavedPin(settings.passwordHash);
        }
        setIsConfiguringPin(false);
        
        // Pre-load data in background
        const [studs, tsts] = await Promise.all([
          getAllStudents(),
          getAllTests()
        ]);
        setStudents(studs);
        setTests(tsts);
      } catch (error) {
        console.error('Failed to initialize Tutor Dashboard:', error);
      } finally {
        setLoading(false);
      }
    };
    init();
  }, []);

  const loadStudents = async () => {
    const studs = await getAllStudents();
    setStudents(studs);
  };

  const loadTests = async () => {
    const tsts = await getAllTests();
    setTests(tsts);
  };

  const loadStudentTests = async (studentId: string) => {
    const sTests = await getAssignedTestsForStudent(studentId);
    setStudentTests(sTests);
  };

  // PIN Gate Actions
  const handleSetPin = async () => {
    if (pinInput.trim().length < 4) {
      setPinError('Пароль должен состоять минимум из 4 символов');
      return;
    }
    try {
      setLoading(true);
      await saveTutorSettings({
        isConfigured: true,
        passwordHash: pinInput.trim()
      });
      setSavedPin(pinInput.trim());
      setIsUnlocked(true);
      setIsConfiguringPin(false);
      setPinError('');
      setPinInput('');
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = () => {
    if (pinInput.trim() === savedPin) {
      setIsUnlocked(true);
      setPinError('');
      setPinInput('');
    } else {
      setPinError('Неверный пароль. Попробуйте еще раз.');
    }
  };

  // Student Actions
  const handleCreateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim()) return;
    try {
      setLoading(true);
      await createStudent(newStudentName.trim());
      setNewStudentName('');
      await loadStudents();
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteStudent = async () => {
    if (!studentToDelete) return;
    const id = studentToDelete.id;
    try {
      setLoading(true);
      if (selectedStudent?.id === id) {
        setSelectedStudent(null);
      }
      await deleteStudent(id);
      await loadStudents();
    } catch (error) {
      console.error(error);
    } finally {
      setStudentToDelete(null);
      setLoading(false);
    }
  };

  const handleDeleteStudent = async (id: string) => {
    const student = students.find(s => s.id === id);
    if (student) {
      setStudentToDelete(student);
    }
  };

  const handleSelectStudent = async (student: Student) => {
    setSelectedStudent(student);
    setLoading(true);
    try {
      await loadStudentTests(student.id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const copyCabinetLink = (id: string) => {
    // Generates a fully qualified sharing link with the current hostname and port
    const link = `${window.location.origin}/?studentId=${id}`;
    navigator.clipboard.writeText(link);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Assigning Test
  const handleAssignTest = async () => {
    if (!selectedStudent || !assigningTestId) return;
    const testToAssign = tests.find(t => t.id === assigningTestId);
    if (!testToAssign) return;

    try {
      setLoading(true);
      await assignTestToStudent(selectedStudent.id, testToAssign);
      setAssigningTestId('');
      await loadStudentTests(selectedStudent.id);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteAssignedTest = async () => {
    if (!testToDelete) return;
    const { id } = testToDelete;
    try {
      setLoading(true);
      await deleteAssignedTest(id);
      if (selectedStudent) {
        await loadStudentTests(selectedStudent.id);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setTestToDelete(null);
      setLoading(false);
    }
  };

  const handleDeleteAssignedTest = async (id: string) => {
    const assigned = studentTests.find(t => t.id === id);
    if (assigned) {
      setTestToDelete({ id, title: assigned.title });
    }
  };

  // Test Creator Questions Management
  const updateQuestionInDraft = (index: number, updatedFields: Partial<Question>) => {
    setNewQuestions(prev => {
      const next = [...prev];
      next[index] = { ...next[index], ...updatedFields } as Question;
      return next;
    });
  };

  const removeQuestionFromDraft = (index: number) => {
    setNewQuestions(prev => prev.filter((_, i) => i !== index));
  };

  const addBlankQuestion = (type: Question['type']) => {
    const nextNum = newQuestions.length > 0 
      ? Math.max(...newQuestions.map(q => q.number)) + 1 
      : 1;

    let defaultQuestion: Question;
    if (type === 'text') {
      defaultQuestion = {
        id: `q-${Date.now()}-${newQuestions.length}`,
        number: nextNum,
        text: '',
        type: 'text',
        correctAnswer: '',
        points: 1
      };
    } else if (type === 'single') {
      defaultQuestion = {
        id: `q-${Date.now()}-${newQuestions.length}`,
        number: nextNum,
        text: '',
        type: 'single',
        options: ['', ''],
        correctAnswer: '1',
        points: 1
      };
    } else if (type === 'multiple') {
      defaultQuestion = {
        id: `q-${Date.now()}-${newQuestions.length}`,
        number: nextNum,
        text: '',
        type: 'multiple',
        options: ['', ''],
        correctAnswer: '1',
        points: 1
      };
    } else { // matching
      defaultQuestion = {
        id: `q-${Date.now()}-${newQuestions.length}`,
        number: nextNum,
        text: '',
        type: 'matching',
        leftItems: ['', ''],
        options: ['', ''],
        correctAnswer: '1,1',
        points: 1
      };
    }

    setNewQuestions(prev => [...prev, defaultQuestion]);
  };

  const handleCreateTestSubmit = async () => {
    setTestBuilderError(null);
    if (!newTestTitle.trim()) {
      setTestBuilderError('Введите название проверочной работы');
      return;
    }
    if (newQuestions.length === 0) {
      setTestBuilderError('Добавьте хотя бы одно задание в проверочную работу');
      return;
    }

    try {
      setLoading(true);
      await createTest({
        title: newTestTitle.trim(),
        description: newTestDesc.trim(),
        systemType: newTestType,
        questions: newQuestions
      });
      
      // Reset
      setNewTestTitle('');
      setNewTestDesc('');
      setNewQuestions([]);
      setIsCreatingTest(false);
      setTestBuilderError(null);
      await loadTests();
    } catch (error) {
      console.error(error);
      setTestBuilderError('Произошла ошибка при создании теста. Пожалуйста, попробуйте еще раз.');
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteTestFromLibrary = async () => {
    if (!libraryTestToDelete) return;
    try {
      setLoading(true);
      await deleteTest(libraryTestToDelete.id);
      await loadTests();
    } catch (error) {
      console.error(error);
    } finally {
      setLibraryTestToDelete(null);
      setLoading(false);
    }
  };

  const handleDeleteTestFromLibrary = async (id: string) => {
    const t = tests.find(item => item.id === id);
    if (t) {
      setLibraryTestToDelete(t);
    }
  };

  const handleUpdateOption = (index: number, val: string) => {
    setQOptions(prev => {
      const next = [...prev];
      next[index] = val;
      return next;
    });
  };

  const handleAddOptionField = () => {
    setQOptions(prev => [...prev, '']);
  };

  const handleRemoveOptionField = (index: number) => {
    if (qOptions.length <= 2) return;
    setQOptions(prev => prev.filter((_, i) => i !== index));
  };

  // Formatting seconds to MM:SS
  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = sec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // RENDER PIN GATE
  if (isConfiguringPin || !isUnlocked) {
    return (
      <div className="min-h-screen bg-[#12111a] text-gray-300 flex items-center justify-center font-sans px-4 relative">
        <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
          <div className="absolute top-[-20%] left-[-20%] w-[60vw] h-[60vw] bg-purple-900/10 rounded-full blur-[130px]" />
          <div className="absolute bottom-[-20%] right-[-20%] w-[60vw] h-[60vw] bg-indigo-900/10 rounded-full blur-[130px]" />
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-md w-full glass-panel p-8 rounded-3xl border border-white/15 shadow-2xl relative z-10 text-center space-y-6 glow-violet"
        >
          <div className="mx-auto w-16 h-16 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
            {isConfiguringPin ? <KeyRound className="w-8 h-8" /> : <Lock className="w-8 h-8" />}
          </div>

          <div>
            <h1 className="text-2xl font-bold font-rounded">Панель Репетитора</h1>
            <p className="text-xs text-gray-400 mt-2 leading-relaxed">
              {isConfiguringPin 
                ? 'Создайте пароль (PIN) для защиты кабинетов учеников и базы тестов. Этот пароль будет запрашиваться при входе.' 
                : 'Введите защитный пароль для доступа к панели управления репетитора.'}
            </p>
          </div>

          <div className="space-y-4">
            <input 
              type="password"
              placeholder={isConfiguringPin ? "Задайте пароль (например 1234)" : "Введите ваш пароль"}
              value={pinInput}
              onChange={(e) => setPinInput(e.target.value)}
              className="w-full bg-[#101015] border border-white/10 rounded-xl py-3 px-4 text-center text-lg tracking-widest font-mono text-purple-300 focus:outline-none focus:border-purple-500 transition-all placeholder:tracking-normal placeholder:text-sm"
              onKeyDown={(e) => e.key === 'Enter' && (isConfiguringPin ? handleSetPin() : handleUnlock())}
            />
            {pinError && (
              <p className="text-rose-400 text-xs flex items-center justify-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {pinError}
              </p>
            )}
          </div>

          <button 
            onClick={isConfiguringPin ? handleSetPin : handleUnlock}
            className="w-full liquid-glass-btn py-3 rounded-xl font-bold text-sm"
          >
            {isConfiguringPin ? 'Сохранить и войти' : 'Открыть панель'}
          </button>
        </motion.div>
      </div>
    );
  }

  const handleExitCabinet = async () => {
    const sId = viewingCabinetStudentId;
    setViewingCabinetStudentId(null);
    if (sId) {
      setLoading(true);
      try {
        await loadStudentTests(sId);
        await loadStudents();
        const updatedStudents = await getAllStudents();
        setStudents(updatedStudents);
        const match = updatedStudents.find(s => s.id === sId);
        if (match) {
          setSelectedStudent(match);
        }
      } catch (error) {
        console.error('Failed to reload on cabinet exit:', error);
      } finally {
        setLoading(false);
      }
    }
  };

  if (viewingCabinetStudentId) {
    return (
      <div className="min-h-screen bg-[#12111a]">
        <div className="max-w-6xl mx-auto pt-6 px-4 flex justify-between items-center relative z-20">
          <button
            onClick={handleExitCabinet}
            className="px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 text-xs font-semibold rounded-xl transition-all flex items-center gap-2"
          >
            ← Вернуться в Панель Репетитора
          </button>
          <span className="text-xs text-gray-500 font-mono bg-purple-500/5 px-3 py-1 rounded-full border border-purple-500/10">Режим просмотра кабинета ученика</span>
        </div>
        <StudentCabinet 
          studentId={viewingCabinetStudentId} 
          onExit={handleExitCabinet} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#12111a] text-gray-300 font-sans py-8 px-4 sm:px-6 lg:px-8">
      {/* Background Orbs */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-purple-900/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-950/10 rounded-full blur-[120px]" />
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Tutor Header */}
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-4 pb-4 border-b border-white/5 relative z-20">
          <div className="flex items-center gap-6">
            <div className="flex items-baseline gap-2">
              <span className="font-rounded font-extrabold text-2xl tracking-wider bg-gradient-to-r from-rose-300 via-purple-300 to-amber-200 bg-clip-text text-transparent">Домашка</span>
            </div>
            {/* Desktop Tabs */}
            <div className="hidden md:flex items-center gap-2">
              {(['students', 'tests', 'settings'] as const).map((tab) => {
                const tabLabels = {
                  students: '🎓 Ученики',
                  tests: '📚 Библиотека Тестов',
                  settings: '⚙️ Настройки'
                };
                const isCurrent = activeTab === tab;
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-3 py-1.5 text-xs font-bold tracking-wide transition-all rounded-xl border ${
                      isCurrent 
                        ? 'bg-purple-500/10 text-purple-300 border-purple-500/20' 
                        : 'text-gray-400 hover:text-gray-200 border-transparent'
                    }`}
                  >
                    {tabLabels[tab]}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto justify-between md:justify-end">
            {/* Mobile Tab Indicators */}
            <div className="flex md:hidden gap-1 bg-white/2 p-0.5 rounded-xl border border-white/5">
              {(['students', 'tests', 'settings'] as const).map((tab) => {
                const isCurrent = activeTab === tab;
                const shortLabels = {
                  students: 'Ученики',
                  tests: 'Тесты',
                  settings: 'Настройки'
                };
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all ${
                      isCurrent 
                        ? 'bg-purple-500/20 text-purple-300' 
                        : 'text-gray-400'
                    }`}
                  >
                    {shortLabels[tab]}
                  </button>
                );
              })}
            </div>

            <button 
              onClick={async () => {
                setLoading(true);
                try {
                  await loadStudents();
                  await loadTests();
                  if (selectedStudent) {
                    await loadStudentTests(selectedStudent.id);
                  }
                } catch (error) {
                  console.error(error);
                } finally {
                  setLoading(false);
                }
              }}
              className="px-4 py-2 bg-purple-500/5 hover:bg-purple-500/10 border border-purple-500/15 hover:border-purple-500/30 text-[10px] font-bold rounded-xl text-purple-300 tracking-wider transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-purple-400 ${loading ? 'animate-spin' : ''}`} />
              СИНХРОНИЗАЦИЯ
            </button>
          </div>
        </header>



        {loading && students.length === 0 && tests.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <RefreshCw className="w-10 h-10 text-purple-400 animate-spin" />
            <p className="text-gray-400 font-rounded">Загружаем базу данных репетитора...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            
            {/* TAB 1: STUDENTS MANAGEMENT */}
            {activeTab === 'students' && (
              <motion.div
                key="students-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="grid grid-cols-1 lg:grid-cols-3 gap-8"
              >
                {/* Left: Students List and Add student card */}
                <div className="lg:col-span-1 space-y-6">
                  {/* Create student form */}
                  <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                    <h3 className="text-base font-bold font-rounded">Создать кабинет ученика</h3>
                    <form onSubmit={handleCreateStudent} className="space-y-3">
                      <input 
                        type="text"
                        placeholder="ФИО ученика (например, Иван Иванов)"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        className="w-full bg-[#121218] border border-white/10 rounded-xl py-2.5 px-4 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500/50 transition-all font-rounded"
                      />
                      <button 
                        type="submit"
                        className="w-full liquid-glass-btn py-2.5 rounded-xl text-xs font-bold flex items-center justify-center gap-2"
                      >
                        <Plus className="w-4 h-4" /> Создать кабинет
                      </button>
                    </form>
                  </div>

                  {/* Students directory */}
                  <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                    <div className="flex justify-between items-center">
                      <h3 className="text-base font-bold font-rounded">Все ученики</h3>
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 rounded-full text-[10px] font-mono text-gray-400">
                        {students.length}
                      </span>
                    </div>

                    {students.length === 0 ? (
                      <div className="text-center py-10 text-gray-600 text-xs border border-dashed border-white/5 rounded-xl">
                        Кабинеты не созданы. Добавьте первого ученика в форме выше.
                      </div>
                    ) : (
                      <div className="space-y-2 max-h-[450px] overflow-y-auto pr-1">
                        {students.map((student) => {
                          const isSelected = selectedStudent?.id === student.id;
                          return (
                            <div 
                              key={student.id}
                              onClick={() => handleSelectStudent(student)}
                              className={`p-3 rounded-xl border transition-all cursor-pointer flex justify-between items-center gap-3 ${
                                isSelected 
                                  ? 'bg-purple-500/10 border-purple-500/30' 
                                  : 'bg-white/2 border-white/5 hover:border-white/10'
                              }`}
                            >
                              <div className="truncate">
                                <h4 className="text-sm font-bold text-gray-200 truncate">{student.name}</h4>
                                <span className="text-[10px] text-gray-500 font-mono">
                                  ID: {student.id.substring(0, 8)}...
                                </span>
                              </div>
                              
                              <div className="flex items-center gap-1 flex-shrink-0" onClick={e => e.stopPropagation()}>
                                <button
                                  onClick={() => copyCabinetLink(student.id)}
                                  className={`p-2 rounded-lg border transition-all ${
                                    copiedId === student.id 
                                      ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-400' 
                                      : 'bg-white/5 border-white/10 text-gray-400 hover:text-gray-200'
                                  }`}
                                  title="Копировать уникальную ссылку ученика"
                                >
                                  {copiedId === student.id ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  onClick={() => handleDeleteStudent(student.id)}
                                  className="p-2 rounded-lg bg-red-500/5 border border-red-500/10 text-red-400 hover:bg-red-500/15 transition-all"
                                  title="Удалить ученика"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Active student profile details, test assignment and result logs */}
                <div className="lg:col-span-2">
                  {selectedStudent ? (
                    <div className="space-y-6">
                      
                      {/* Selected Student profile info */}
                      <div className="glass-panel p-6 rounded-2xl border border-white/5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                        <div>
                          <span className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Выбранный ученик</span>
                          <h2 className="text-xl font-bold font-rounded text-gray-200 mt-0.5">{selectedStudent.name}</h2>
                          
                          {/* Instructions to share link */}
                          <div className="mt-3 flex items-center gap-2 p-2 bg-purple-500/5 border border-purple-500/10 rounded-xl">
                            <span className="text-[11px] text-purple-300 font-medium truncate max-w-sm sm:max-w-md">
                              {window.location.origin}/?studentId={selectedStudent.id}
                            </span>
                            <button 
                              onClick={() => copyCabinetLink(selectedStudent.id)}
                              className="px-2 py-1 bg-purple-500/10 text-purple-300 text-[10px] rounded hover:bg-purple-500/20 font-bold flex items-center gap-1 flex-shrink-0 transition-all"
                            >
                              <Copy className="w-2.5 h-2.5" />
                              {copiedId === selectedStudent.id ? 'Скопировано' : 'Скопировать'}
                            </button>
                          </div>

                          <button
                            onClick={() => setViewingCabinetStudentId(selectedStudent.id)}
                            className="mt-3.5 w-full sm:w-auto px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-gray-200 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-purple-500/15"
                          >
                            <Eye className="w-4 h-4" />
                            Войти в кабинет ученика
                          </button>
                        </div>

                        {/* Assign test box */}
                        <div className="w-full sm:w-auto bg-[#101015] border border-white/5 p-4 rounded-xl space-y-2">
                          <label className="block text-xs text-gray-400 font-rounded font-semibold">Назначить тест из базы:</label>
                          <div className="flex gap-2">
                            <select
                              value={assigningTestId}
                              onChange={(e) => setAssigningTestId(e.target.value)}
                              className="bg-[#121218] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-purple-500 font-rounded max-w-[200px]"
                            >
                              <option value="">Выберите тест...</option>
                              {tests.map((t) => (
                                <option key={t.id} value={t.id}>
                                  [{t.systemType}] {t.title}
                                </option>
                              ))}
                            </select>
                            <button
                              onClick={handleAssignTest}
                              disabled={!assigningTestId}
                              className="px-4 py-1.5 bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-gray-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5"
                            >
                              <Plus className="w-3.5 h-3.5" /> Назначить
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* STATS & PROGRESS SECTION */}
                      {(() => {
                        const selectedStudentCompletedTests = studentTests
                          .filter((t) => t.status === 'completed')
                          .reverse(); // oldest first for chronological line chart

                        const tutorChartData = selectedStudentCompletedTests.map((t, idx) => {
                          const isEGE = t.systemType === 'EGE';
                          const finalScore = t.results ? calculateScore(t.results.score, t.results.maxScore, t.systemType) : null;
                          return {
                            name: t.title.substring(0, 10) + '...',
                            index: idx + 1,
                            score: finalScore ? (isEGE ? Number(finalScore.grade) : finalScore.percentage) : 0,
                            label: finalScore ? (isEGE ? `${finalScore.grade} баллов` : `Оценка ${finalScore.grade}`) : '',
                            date: new Date(t.completedAt).toLocaleDateString('ru-RU')
                          };
                        });

                        const tutorCumulativeStats: Record<number, { correct: number; total: number }> = {};
                        selectedStudentCompletedTests.forEach(t => {
                          t.questions.forEach(q => {
                            const isCorrect = t.results?.questionStatus[q.id] ?? false;
                            if (!tutorCumulativeStats[q.number]) {
                              tutorCumulativeStats[q.number] = { correct: 0, total: 0 };
                            }
                            tutorCumulativeStats[q.number].total += 1;
                            if (isCorrect) {
                              tutorCumulativeStats[q.number].correct += 1;
                            }
                          });
                        });
                        const tutorCumulativeQuestionsList = Object.keys(tutorCumulativeStats)
                          .map(Number)
                          .sort((a, b) => a - b);

                        return (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Line Chart */}
                            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                              <h3 className="text-sm font-bold font-rounded flex items-center gap-2 text-gray-200">
                                <TrendingUp className="w-4 h-4 text-purple-400" /> График прогресса ученика
                              </h3>
                              {tutorChartData.length < 1 ? (
                                <div className="h-44 flex items-center justify-center text-gray-500 text-center text-xs p-4 border border-dashed border-white/5 rounded-xl">
                                  Решите хотя бы один тест для построения графика прогресса.
                                </div>
                              ) : (
                                <div className="h-44 w-full pt-2">
                                  <ResponsiveContainer width="100%" height="100%">
                                    <LineChart data={tutorChartData} margin={{ top: 5, right: 10, left: -25, bottom: 5 }}>
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
                            </div>

                            {/* Question Stats Table (Pivot Matrix Format) */}
                            <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4 col-span-1 md:col-span-2">
                              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                                <div>
                                  <h3 className="text-sm font-bold font-rounded flex items-center gap-2 text-gray-200">
                                    <FileText className="w-4 h-4 text-purple-400" /> Сводная таблица по номерам заданий
                                  </h3>
                                  <p className="text-[11px] text-gray-400">Сводная матрица первичных баллов ученика по датам написания тестов</p>
                                </div>
                                
                                <div className="flex p-1 rounded-xl w-fit border border-white/5 bg-white/5">
                                  <button
                                    type="button"
                                    onClick={() => setTutorStatsType('EGE')}
                                    className={`px-3 py-1.5 text-xs font-bold font-rounded rounded-lg transition-all ${
                                      tutorStatsType === 'EGE'
                                        ? 'bg-purple-600 text-gray-200 shadow-md'
                                        : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                  >
                                    ЕГЭ
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setTutorStatsType('OGE')}
                                    className={`px-3 py-1.5 text-xs font-bold font-rounded rounded-lg transition-all ${
                                      tutorStatsType === 'OGE'
                                        ? 'bg-purple-600 text-gray-200 shadow-md'
                                        : 'text-gray-400 hover:text-gray-200'
                                    }`}
                                  >
                                    ОГЭ
                                  </button>
                                </div>
                              </div>
                              
                              {(() => {
                                const questionNumbers = tutorStatsType === 'EGE'
                                  ? Array.from({ length: 26 }, (_, i) => i + 1)
                                  : Array.from({ length: 11 }, (_, i) => i + 2);
                                
                                const typeFinishedTests = selectedStudentCompletedTests.filter(t => t.systemType === tutorStatsType);
                                
                                // Sort finished tests chronologically (oldest first)
                                const sortedTypeFinishedTests = [...typeFinishedTests].sort((a, b) => {
                                  const dateA = a.completedAt ? new Date(a.completedAt).getTime() : 0;
                                  const dateB = b.completedAt ? new Date(b.completedAt).getTime() : 0;
                                  return dateA - dateB;
                                });

                                if (sortedTypeFinishedTests.length === 0) {
                                  return (
                                    <div className="text-xs text-center py-10 border border-dashed border-white/5 text-gray-500 rounded-xl">
                                      История пуста. Нет решенных тестов {tutorStatsType === 'EGE' ? 'ЕГЭ' : 'ОГЭ'} для отображения таблицы.
                                    </div>
                                  );
                                }

                                return (
                                  <div className="overflow-x-auto max-h-[400px] overflow-y-auto pr-1 rounded-xl border border-white/5 bg-[#0e0d14]">
                                    <table className="w-full text-left border-collapse text-xs">
                                      <thead>
                                        <tr className="bg-[#181622]/80 border-b border-white/10">
                                          <th className="py-2.5 px-3 sticky left-0 z-20 font-bold border-r border-white/10 text-gray-200 bg-[#12111a] w-[80px] min-w-[70px]">
                                            Задание
                                          </th>
                                          {sortedTypeFinishedTests.map((t, idx) => {
                                            const dateStr = t.completedAt
                                              ? new Date(t.completedAt).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                              : '—';
                                            return (
                                              <th 
                                                key={t.id + '-' + idx} 
                                                className="py-2.5 px-3 border-b border-white/10 text-center font-mono font-medium whitespace-nowrap min-w-[110px]"
                                              >
                                                <div className="text-[10px] truncate max-w-[120px] mx-auto font-sans font-semibold text-purple-400" title={t.title}>
                                                  {t.title}
                                                </div>
                                                <div className="text-[9px] mt-0.5 text-gray-500">{dateStr}</div>
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
                                              className="border-b border-white/5 hover:bg-white/2"
                                            >
                                              <td className="py-2 px-3 font-bold font-mono sticky left-0 z-10 flex items-center gap-1 bg-[#12111a] border-r border-white/10 text-purple-300">
                                                <span className="opacity-60 text-[9px]">№</span>{num}
                                              </td>
                                              {sortedTypeFinishedTests.map((t, idx) => {
                                                const questionInTest = t.questions.find(q => q.number === num);
                                                if (!questionInTest) {
                                                  return (
                                                    <td key={t.id + '-' + idx} className="py-2 px-3 text-center text-gray-600 font-mono">
                                                      —
                                                    </td>
                                                  );
                                                }

                                                const isCorrect = t.results?.questionStatus?.[questionInTest.id] ?? false;
                                                const maxPoints = questionInTest.points || 1;
                                                const score = isCorrect ? maxPoints : 0;
                                                const isDoubted = t.doubtedQuestions?.[questionInTest.id] ?? false;

                                                return (
                                                  <td key={t.id + '-' + idx} className="py-2 px-3 text-center">
                                                    <span 
                                                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[9px] font-bold border transition-all ${
                                                        isDoubted
                                                          ? 'bg-amber-500/15 text-amber-400 border-amber-500/35 shadow-sm shadow-amber-500/5'
                                                          : isCorrect
                                                            ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20'
                                                            : 'bg-rose-500/15 text-rose-400 border-rose-500/20'
                                                      }`}
                                                      title={`${isCorrect ? 'Решено верно' : 'Ошибка'} • Получено баллов: ${score} из ${maxPoints}${isDoubted ? ' • Ученик сомневался / хочет обсудить' : ''}`}
                                                    >
                                                      <span>{score} б.</span>
                                                      <span className="text-[8px] opacity-70">({isCorrect ? '✓' : '✗'})</span>{isDoubted && <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse ml-1" />}
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
                                );
                              })()}
                            </div>
                          </div>
                        );
                      })()}

                      {/* Logged assigned tests of selected student */}
                      <div className="glass-panel p-6 rounded-2xl border border-white/5 space-y-4">
                        <h3 className="text-base font-bold font-rounded">Все тесты в кабинете ученика</h3>
                        
                        {studentTests.length === 0 ? (
                          <div className="text-center py-10 text-gray-600 text-xs">
                            Тесты еще не назначались. Назначьте тест с помощью блока вверху.
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {studentTests.map((st) => {
                              const isCompleted = st.status === 'completed';
                              const scoreDetails = st.results ? calculateScore(st.results.score, st.results.maxScore, st.systemType) : null;

                              return (
                                <div 
                                  key={st.id} 
                                  className="p-4 bg-[#101015]/80 border border-white/5 rounded-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:border-white/10 transition-all"
                                >
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                                        st.systemType === 'EGE' ? 'bg-purple-500/10 text-purple-400' : 'bg-indigo-500/10 text-indigo-400'
                                      }`}>
                                        {st.systemType}
                                      </span>
                                      
                                      {isCompleted ? (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1 font-rounded">
                                          <CheckCircle className="w-2.5 h-2.5" /> Выполнено
                                        </span>
                                      ) : (
                                        <span className="px-2 py-0.5 rounded-full text-[9px] bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center gap-1 font-rounded">
                                          <Clock className="w-2.5 h-2.5" /> Ожидает решения
                                        </span>
                                      )}
                                    </div>
                                    <h4 className="text-sm font-bold text-gray-200 mt-1.5">{st.title}</h4>
                                    
                                    {isCompleted && scoreDetails && (
                                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-400 font-mono">
                                        <span>Время: {formatTime(st.timeSpent)}</span>
                                        <span className={`flex items-center gap-1 ${st.tabSwitches > 1 ? 'text-rose-400 font-semibold' : ''}`}>
                                          <ShieldAlert className="w-3.5 h-3.5 text-rose-400" /> Сворачиваний: {st.tabSwitches}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div className="flex items-center gap-3 self-stretch sm:self-auto justify-between border-t sm:border-0 border-white/5 pt-2 sm:pt-0">
                                    {isCompleted && scoreDetails && (
                                      <div className="text-right mr-2">
                                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-mono">Итог</div>
                                        <div className="font-bold text-sm text-purple-400 font-rounded">
                                          {scoreDetails.gradeText}
                                        </div>
                                      </div>
                                    )}
                                    <div className="flex items-center gap-1">
                                      {isCompleted && (
                                        <button
                                          onClick={() => setReviewingTest(st)}
                                          className="px-3 py-1.5 bg-purple-500/10 text-purple-300 hover:bg-purple-500/20 text-xs font-bold rounded-lg border border-purple-500/20 transition-all flex items-center gap-1"
                                          title="Разбор ответов и ошибок"
                                        >
                                          <Eye className="w-3.5 h-3.5" /> Ответы
                                        </button>
                                      )}
                                      <button
                                        onClick={() => handleDeleteAssignedTest(st.id)}
                                        className="p-1.5 bg-red-500/5 text-red-400 hover:bg-red-500/15 rounded-lg border border-red-500/10 transition-all"
                                        title="Удалить тест из кабинета"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>

                    </div>
                  ) : (
                    <div className="glass-panel p-16 rounded-2xl border border-white/5 text-center text-gray-500 flex flex-col justify-center items-center gap-3">
                      <Users className="w-12 h-12 text-gray-600" />
                      <p className="font-rounded text-sm">Ученик не выбран</p>
                      <p className="text-xs text-gray-600 max-w-xs">
                        Выберите ученика из списка слева, чтобы назначить ему тесты, скопировать ссылку его кабинета или посмотреть подробные результаты.
                      </p>
                    </div>
                  )}
                </div>
            </motion.div>
          )}

            {/* TAB 2: TEST LIBRARY MANAGER */}
            {activeTab === 'tests' && (
              <motion.div
                key="tests-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Header Controls */}
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-bold font-rounded">Библиотека ваших тестов</h2>
                  {!isCreatingTest && (
                    <button 
                      onClick={() => setIsCreatingTest(true)}
                      className="liquid-glass-btn px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 glow-violet"
                    >
                      <PlusCircle className="w-4 h-4" /> Создать новый тест
                    </button>
                  )}
                </div>

                <AnimatePresence mode="wait">
                  {isCreatingTest ? (
                    /* SUBVIEW: TEST CREATOR WIZARD */
                    <motion.div
                      key="test-creator-form"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6"
                    >
                      <div className="flex justify-between items-center pb-4 border-b border-white/5">
                        <div>
                          <h3 className="text-lg font-bold font-rounded text-purple-300">Новый тест</h3>
                          <p className="text-xs text-gray-500 mt-1">
                            Добавьте задания: впишите текст вопроса, варианты ответов или правильный ответ словом. Ученик увидит только сами задания.
                          </p>
                        </div>
                        <button 
                          onClick={() => setShowCancelConfirm(true)}
                          className="p-1 text-gray-400 hover:text-gray-200"
                        >
                          <X className="w-5 h-5" />
                        </button>
                      </div>

                      {/* Meta Fields */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-400 font-semibold font-rounded">Название проверочной работы</label>
                          <input 
                            type="text"
                            placeholder="ЕГЭ: Вариант №1"
                            value={newTestTitle}
                            onChange={(e) => setNewTestTitle(e.target.value)}
                            className="w-full bg-[#121218] border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-purple-500 font-rounded"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-400 font-semibold font-rounded">Краткое описание / инструкция</label>
                          <input 
                            type="text"
                            placeholder="Правила пунктуации в сложном предложении..."
                            value={newTestDesc}
                            onChange={(e) => setNewTestDesc(e.target.value)}
                            className="w-full bg-[#121218] border border-white/10 rounded-xl py-2 px-3 text-sm focus:outline-none focus:border-purple-500 font-rounded"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <label className="block text-xs text-gray-400 font-semibold font-rounded">Формат оценивания (ОГЭ/ЕГЭ)</label>
                          <div className="flex bg-white/2 border border-white/10 rounded-xl p-0.5">
                            <button
                              type="button"
                              onClick={() => setNewTestType('EGE')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                newTestType === 'EGE' ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400'
                              }`}
                            >
                              ЕГЭ (100 баллов)
                            </button>
                            <button
                              type="button"
                              onClick={() => setNewTestType('OGE')}
                              className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
                                newTestType === 'OGE' ? 'bg-indigo-500/20 text-indigo-300' : 'text-gray-400'
                              }`}
                            >
                              ОГЭ (Оценка 2-5)
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Header of Question list */}
                      <div className="border-t border-white/5 pt-4 space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-sm font-bold font-rounded text-gray-200">Список заданий ({newQuestions.length})</h4>
                        </div>

                        {newQuestions.length === 0 ? (
                          <div className="text-center py-8 text-gray-500 bg-[#121218]/40 border border-dashed border-white/5 rounded-2xl">
                            Нет добавленных заданий. Нажмите одну из кнопок ниже, чтобы добавить первое задание.
                          </div>
                        ) : (
                          <div className="space-y-6">
                            {newQuestions.map((q, idx) => (
                              <div key={q.id} className="bg-[#121218]/85 border border-white/5 rounded-2xl p-5 space-y-4 relative hover:border-white/10 transition-all">
                                {/* Question Card Header */}
                                <div className="flex justify-between items-center pb-2 border-b border-white/5">
                                  <div className="flex items-center gap-2">
                                    <span className="text-sm font-bold font-rounded text-purple-300">
                                      Задание {idx + 1}
                                    </span>
                                    <span className="text-xs text-gray-500 font-mono">
                                      · {q.type === 'text' ? 'короткий ответ' : q.type === 'single' ? 'один вариант' : q.type === 'multiple' ? 'несколько вариантов' : 'соответствие'}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={() => removeQuestionFromDraft(idx)}
                                    className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1 font-semibold"
                                  >
                                    Удалить
                                  </button>
                                </div>

                                {/* Common Fields */}
                                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                                  {/* Number in KIM */}
                                  <div className="md:col-span-2 space-y-1.5">
                                    <label className="block text-[11px] text-gray-400 font-medium">№ в КИМ</label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={q.number}
                                      onChange={(e) => updateQuestionInDraft(idx, { number: parseInt(e.target.value) || idx + 1 })}
                                      className="w-full bg-[#0d0d12] border border-white/10 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-purple-500 font-mono text-center"
                                    />
                                  </div>

                                  {/* Question formulation */}
                                  <div className="md:col-span-8 space-y-1.5">
                                    <label className="block text-[11px] text-gray-400 font-medium">Номер или подпись (например: 1)</label>
                                    <input
                                      type="text"
                                      placeholder={q.type === 'text' ? "Номер или подпись (например: 1)" : "Укажите варианты ответов..."}
                                      value={q.text}
                                      onChange={(e) => updateQuestionInDraft(idx, { text: e.target.value })}
                                      className="w-full bg-[#0d0d12] border border-white/10 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-purple-500"
                                    />
                                  </div>

                                  {/* Points */}
                                  <div className="md:col-span-2 space-y-1.5">
                                    <label className="block text-[11px] text-gray-400 font-medium">Первичные баллы</label>
                                    <input
                                      type="number"
                                      min={1}
                                      value={q.points || 1}
                                      onChange={(e) => updateQuestionInDraft(idx, { points: parseInt(e.target.value) || 1 })}
                                      className="w-full bg-[#0d0d12] border border-white/10 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-purple-500 font-mono text-center"
                                    />
                                  </div>
                                </div>

                                {/* Specific fields based on type */}
                                {q.type === 'text' && (
                                  <div className="space-y-1.5">
                                    <label className="block text-[11px] text-gray-400 font-medium">Правильный ответ (регистр не важен)</label>
                                    <input
                                      type="text"
                                      placeholder="например: вазаизхрусталя"
                                      value={q.correctAnswer}
                                      onChange={(e) => updateQuestionInDraft(idx, { correctAnswer: e.target.value })}
                                      className="w-full bg-[#0d0d12] border border-white/10 rounded-xl py-2 px-3 text-xs focus:outline-none focus:border-emerald-500 text-emerald-400 font-mono"
                                    />
                                  </div>
                                )}

                                {q.type === 'single' && q.options && (
                                  <div className="space-y-3">
                                    <label className="block text-[11px] text-gray-400 font-medium">Варианты ответа (отметьте верный):</label>
                                    <div className="space-y-2">
                                      {q.options.map((opt, oIdx) => (
                                        <div key={oIdx} className="flex gap-2 items-center">
                                          <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-gray-400 hover:text-gray-200">
                                            <input
                                              type="radio"
                                              name={`correct-${q.id}`}
                                              checked={q.correctAnswer === String(oIdx + 1)}
                                              onChange={() => updateQuestionInDraft(idx, { correctAnswer: String(oIdx + 1) })}
                                              className="w-4 h-4 text-purple-600 bg-black border-gray-600 focus:ring-purple-500"
                                            />
                                            <span>верно</span>
                                          </label>
                                          <input
                                            type="text"
                                            placeholder={`Вариант ${oIdx + 1}`}
                                            value={opt}
                                            onChange={(e) => {
                                              const updatedOpts = [...(q.options || [])];
                                              updatedOpts[oIdx] = e.target.value;
                                              updateQuestionInDraft(idx, { options: updatedOpts });
                                            }}
                                            className="flex-grow bg-[#0d0d12] border border-white/10 rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:border-purple-500"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (q.options && q.options.length > 2) {
                                                const updatedOpts = q.options.filter((_, i) => i !== oIdx);
                                                let newCorrect = q.correctAnswer;
                                                if (q.correctAnswer === String(oIdx + 1)) {
                                                  newCorrect = '1';
                                                } else if (parseInt(q.correctAnswer) > oIdx + 1) {
                                                  newCorrect = String(parseInt(q.correctAnswer) - 1);
                                                }
                                                updateQuestionInDraft(idx, { options: updatedOpts, correctAnswer: newCorrect });
                                              }
                                            }}
                                            disabled={q.options.length <= 2}
                                            className="p-1.5 text-gray-500 hover:text-red-400 disabled:opacity-30"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedOpts = [...(q.options || []), ''];
                                          updateQuestionInDraft(idx, { options: updatedOpts });
                                        }}
                                        className="text-xs text-purple-300 hover:text-purple-200 mt-1 flex items-center gap-1 font-bold"
                                      >
                                        <Plus className="w-3.5 h-3.5" /> + Вариант
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {q.type === 'multiple' && q.options && (
                                  <div className="space-y-3">
                                    <label className="block text-[11px] text-gray-400 font-medium">Варианты ответа (отметьте все верные):</label>
                                    <div className="space-y-2">
                                      {q.options.map((opt, oIdx) => {
                                        const correctList = q.correctAnswer ? q.correctAnswer.split(',').map(s => s.trim()) : [];
                                        const isChecked = correctList.includes(String(oIdx + 1));
                                        return (
                                          <div key={oIdx} className="flex gap-2 items-center">
                                            <label className="flex items-center gap-1.5 cursor-pointer select-none text-xs text-gray-400 hover:text-gray-200">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                  let nextList = [...correctList];
                                                  if (isChecked) {
                                                    nextList = nextList.filter(s => s !== String(oIdx + 1));
                                                  } else {
                                                    nextList.push(String(oIdx + 1));
                                                  }
                                                  nextList.sort();
                                                  updateQuestionInDraft(idx, { correctAnswer: nextList.join(',') });
                                                }}
                                                className="w-4 h-4 text-purple-600 bg-black border-gray-600 rounded focus:ring-purple-500"
                                              />
                                              <span>верно</span>
                                            </label>
                                            <input
                                              type="text"
                                              placeholder={`Вариант ${oIdx + 1}`}
                                              value={opt}
                                              onChange={(e) => {
                                                const updatedOpts = [...(q.options || [])];
                                                updatedOpts[oIdx] = e.target.value;
                                                updateQuestionInDraft(idx, { options: updatedOpts });
                                              }}
                                              className="flex-grow bg-[#0d0d12] border border-white/10 rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:border-purple-500"
                                            />
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (q.options && q.options.length > 2) {
                                                  const updatedOpts = q.options.filter((_, i) => i !== oIdx);
                                                  const nextList = correctList
                                                    .filter(s => s !== String(oIdx + 1))
                                                    .map(s => {
                                                      const num = parseInt(s);
                                                      if (num > oIdx + 1) return String(num - 1);
                                                      return s;
                                                    });
                                                  updateQuestionInDraft(idx, { options: updatedOpts, correctAnswer: nextList.join(',') });
                                                }
                                              }}
                                              disabled={q.options.length <= 2}
                                              className="p-1.5 text-gray-500 hover:text-red-400 disabled:opacity-30"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        );
                                      })}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedOpts = [...(q.options || []), ''];
                                          updateQuestionInDraft(idx, { options: updatedOpts });
                                        }}
                                        className="text-xs text-purple-300 hover:text-purple-200 mt-1 flex items-center gap-1 font-bold"
                                      >
                                        <Plus className="w-3.5 h-3.5" /> + Вариант
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {q.type === 'matching' && q.leftItems && q.options && (
                                  <div className="space-y-4">
                                    <div className="text-xs text-purple-400 italic font-medium">Для каждой строки слева выберите правильную строку справа:</div>
                                    
                                    {/* Matching Pairs Grid */}
                                    <div className="space-y-2">
                                      {q.leftItems.map((leftVal, lIdx) => {
                                        const matchIndices = q.correctAnswer ? q.correctAnswer.split(',') : [];
                                        const currentMatchIdx = matchIndices[lIdx] || '1';
                                        
                                        return (
                                          <div key={lIdx} className="flex gap-4 items-center">
                                            <input
                                              type="text"
                                              placeholder={`Строка слева ${lIdx + 1}`}
                                              value={leftVal}
                                              onChange={(e) => {
                                                const updatedLeft = [...(q.leftItems || [])];
                                                updatedLeft[lIdx] = e.target.value;
                                                updateQuestionInDraft(idx, { leftItems: updatedLeft });
                                              }}
                                              className="flex-grow bg-[#0d0d12] border border-white/10 rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:border-purple-500"
                                            />
                                            
                                            <span className="text-gray-500">→</span>
                                            
                                            {/* Select matching right item */}
                                            <select
                                              value={currentMatchIdx}
                                              onChange={(e) => {
                                                const nextMatchIndices = [...matchIndices];
                                                nextMatchIndices[lIdx] = e.target.value;
                                                updateQuestionInDraft(idx, { correctAnswer: nextMatchIndices.join(',') });
                                              }}
                                              className="bg-[#0d0d12] border border-white/10 rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:border-purple-500 text-purple-300 font-semibold"
                                            >
                                              {q.options?.map((_, rIdx) => (
                                                <option key={rIdx} value={String(rIdx + 1)}>
                                                  Справа {rIdx + 1}
                                                </option>
                                              ))}
                                            </select>

                                            {/* Delete left item button */}
                                            <button
                                              type="button"
                                              onClick={() => {
                                                if (q.leftItems && q.leftItems.length > 1) {
                                                  const updatedLeft = q.leftItems.filter((_, i) => i !== lIdx);
                                                  const nextMatchIndices = matchIndices.filter((_, i) => i !== lIdx);
                                                  updateQuestionInDraft(idx, { leftItems: updatedLeft, correctAnswer: nextMatchIndices.join(',') });
                                                }
                                              }}
                                              disabled={q.leftItems.length <= 1}
                                              className="p-1.5 text-gray-500 hover:text-red-400 disabled:opacity-30"
                                            >
                                              <X className="w-4 h-4" />
                                            </button>
                                          </div>
                                        );
                                      })}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedLeft = [...(q.leftItems || []), ''];
                                          const matchIndices = q.correctAnswer ? q.correctAnswer.split(',') : [];
                                          const nextMatchIndices = [...matchIndices, '1']; // defaults to match Right 1
                                          updateQuestionInDraft(idx, { leftItems: updatedLeft, correctAnswer: nextMatchIndices.join(',') });
                                        }}
                                        className="text-xs text-purple-300 hover:text-purple-200 mt-1 flex items-center gap-1 font-bold"
                                      >
                                        <Plus className="w-3.5 h-3.5" /> + Строка слева
                                      </button>
                                    </div>

                                    {/* Right Side Options List */}
                                    <div className="space-y-2 border-t border-white/5 pt-3 mt-2">
                                      <div className="text-xs font-semibold text-gray-400">Варианты справа:</div>
                                      {q.options.map((rightVal, rIdx) => (
                                        <div key={rIdx} className="flex gap-2 items-center">
                                          <span className="text-xs text-gray-500 font-mono w-16">Справа {rIdx + 1}:</span>
                                          <input
                                            type="text"
                                            placeholder={`Справа ${rIdx + 1}`}
                                            value={rightVal}
                                            onChange={(e) => {
                                              const updatedRight = [...(q.options || [])];
                                              updatedRight[rIdx] = e.target.value;
                                              updateQuestionInDraft(idx, { options: updatedRight });
                                            }}
                                            className="flex-grow bg-[#0d0d12] border border-white/10 rounded-xl py-1.5 px-3 text-xs focus:outline-none focus:border-purple-500"
                                          />
                                          <button
                                            type="button"
                                            onClick={() => {
                                              if (q.options && q.options.length > 2) {
                                                const updatedRight = q.options.filter((_, i) => i !== rIdx);
                                                const matchIndices = q.correctAnswer ? q.correctAnswer.split(',') : [];
                                                const nextMatchIndices = matchIndices.map(val => {
                                                  const num = parseInt(val);
                                                  if (num === rIdx + 1) return '1';
                                                  if (num > rIdx + 1) return String(num - 1);
                                                  return val;
                                                });
                                                updateQuestionInDraft(idx, { options: updatedRight, correctAnswer: nextMatchIndices.join(',') });
                                              }
                                            }}
                                            disabled={q.options.length <= 2}
                                            className="p-1.5 text-gray-500 hover:text-red-400 disabled:opacity-30"
                                          >
                                            <X className="w-4 h-4" />
                                          </button>
                                        </div>
                                      ))}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const updatedRight = [...(q.options || []), ''];
                                          updateQuestionInDraft(idx, { options: updatedRight });
                                        }}
                                        className="text-xs text-purple-300 hover:text-purple-200 mt-1 flex items-center gap-1 font-bold"
                                      >
                                        <Plus className="w-3.5 h-3.5" /> + Вариант справа
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Add Question buttons */}
                      <div className="flex flex-wrap gap-2.5 pt-4 border-t border-white/5">
                        <button
                          type="button"
                          onClick={() => addBlankQuestion('text')}
                          className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> + Короткий ответ
                        </button>
                        <button
                          type="button"
                          onClick={() => addBlankQuestion('single')}
                          className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> + Один вариант
                        </button>
                        <button
                          type="button"
                          onClick={() => addBlankQuestion('multiple')}
                          className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> + Несколько вариантов
                        </button>
                        <button
                          type="button"
                          onClick={() => addBlankQuestion('matching')}
                          className="px-4 py-2 bg-purple-500/10 border border-purple-500/20 text-purple-300 hover:bg-purple-500/20 text-xs font-bold rounded-xl transition-all flex items-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" /> + Соответствие
                        </button>
                      </div>

                      {/* Test Submit controls */}
                      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 pt-4 border-t border-white/5">
                        {testBuilderError ? (
                          <div className="text-xs text-rose-400 font-medium font-mono bg-rose-500/10 px-3 py-1.5 rounded-xl border border-rose-500/20">
                            ⚠ {testBuilderError}
                          </div>
                        ) : (
                          <div />
                        )}
                        <div className="flex gap-3 justify-end">
                          <button 
                            type="button"
                            onClick={() => setShowCancelConfirm(true)}
                            className="px-5 py-2.5 bg-white/2 border border-white/5 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/5 transition-colors"
                          >
                            Отмена
                          </button>
                          <button 
                            type="button"
                            onClick={handleCreateTestSubmit}
                            disabled={newQuestions.length === 0}
                            className="liquid-glass-btn px-6 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
                          >
                            Опубликовать тест в библиотеку
                          </button>
                        </div>
                      </div>
                    </motion.div>
                  ) : (
                    /* SUBVIEW: TESTS LIBRARY LIST */
                    <motion.div
                      key="tests-library"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                      {tests.length === 0 ? (
                        <div className="col-span-full text-center py-20 text-gray-500 glass-panel rounded-2xl border border-white/5">
                          <FolderOpen className="w-12 h-12 mx-auto text-gray-600 mb-3" />
                          <p className="font-rounded text-sm">Ваша библиотека тестов пуста</p>
                          <button 
                            onClick={() => setIsCreatingTest(true)}
                            className="mt-4 px-4 py-2 bg-purple-600 hover:bg-purple-500 text-gray-200 text-xs font-bold rounded-xl transition-all"
                          >
                            Создать первый тест
                          </button>
                        </div>
                      ) : (
                        tests.map((test) => (
                          <div 
                            key={test.id}
                            className="glass-panel p-5 rounded-2xl border border-white/5 flex flex-col justify-between hover:border-white/10 transition-all shadow-md"
                          >
                            <div>
                              <div className="flex justify-between items-start gap-2 mb-2">
                                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  test.systemType === 'EGE' 
                                    ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20' 
                                    : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                                }`}>
                                  {test.systemType}
                                </span>
                                
                                <button
                                  onClick={() => handleDeleteTestFromLibrary(test.id)}
                                  className="text-gray-500 hover:text-red-400 p-1 rounded-lg transition-all"
                                  title="Удалить тест"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>

                              <h3 className="text-base font-bold text-gray-200 mb-2 leading-snug">{test.title}</h3>
                              <p className="text-xs text-gray-400 line-clamp-3 mb-4 leading-relaxed">{test.description}</p>
                            </div>

                            <div className="flex justify-between items-center border-t border-white/5 pt-3 mt-auto">
                              <span className="text-xs text-gray-500 font-mono">
                                Заданий: {test.questions?.length || 0}
                              </span>
                              <span className="text-xs text-gray-500 font-mono">
                                Макс: {test.questions?.reduce((acc, q) => acc + (q.points || 1), 0) || 0} б.
                              </span>
                            </div>
                          </div>
                        ))
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* TAB 3: TUTOR SETTINGS */}
            {activeTab === 'settings' && (
              <motion.div
                key="settings-tab"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="max-w-xl mx-auto glass-panel p-6 rounded-2xl border border-white/5 space-y-6"
              >
                <div className="flex items-center gap-3 border-b border-white/5 pb-4">
                  <div className="p-2 bg-purple-500/10 text-purple-400 rounded-xl">
                    <Settings className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold font-rounded">Настройки безопасности и домена</h2>
                    <p className="text-xs text-gray-400 mt-0.5">Конфигурация вашей репетиторской платформы.</p>
                  </div>
                </div>

                {/* Change security password - Disabled */}
                <div className="space-y-4">
                  <h3 className="text-sm font-bold font-rounded text-purple-300">Защитный пароль / PIN</h3>
                  <div className="space-y-3">
                    <p className="text-xs text-amber-400 font-medium bg-amber-500/5 border border-amber-500/15 p-3 rounded-xl leading-relaxed">
                      🔒 Защитный пароль для панели управления репетитора и кабинета учеников отключен по вашему запросу. Вход свободный.
                    </p>
                  </div>
                </div>

                {/* Cloud Database Connection Settings */}
                <div className="space-y-4 border-t border-white/5 pt-5">
                  <div className="flex justify-between items-center">
                    <h3 className="text-sm font-bold font-rounded text-purple-300">База данных (Firestore Server Proxy)</h3>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/20">
                      ● ПОДКЛЮЧЕНО НАПРЯМУЮ
                    </span>
                  </div>

                  <p className="text-xs text-gray-400 leading-relaxed">
                    Мы полностью переработали архитектуру! Теперь база данных подключена напрямую через <strong>серверный прокси (Server-side API Proxy)</strong> в Европе.
                  </p>

                  <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl space-y-2.5">
                    <h4 className="text-xs font-bold text-emerald-400 flex items-center gap-1.5 font-rounded">
                      ✅ Почему это намного лучше и работает без VPN?
                    </h4>
                    <ul className="text-xs text-gray-300 space-y-2 list-disc pl-4 leading-relaxed">
                      <li>
                        <strong>Обход блокировок</strong>: Браузер ученика и репетитора больше не обращается к серверам баз данных напрямую (которые часто блокируются в РФ). Вместо этого запросы идут на наш сервер на домене <code className="bg-white/5 px-1 py-0.5 rounded text-purple-300 font-mono text-[10px]">.run.app</code>, который доступен в РФ без ограничений.
                      </li>
                      <li>
                        <strong>Свобода от настроек</strong>: Вам больше не нужно копировать ключи, настраивать Supabase, создавать таблицы или следить за лимитами. Всё работает полностью автоматически «из коробки»!
                      </li>
                      <li>
                        <strong>Мгновенная синхронизация</strong>: Все тесты, новые ученики, назначенные задания и результаты решений сохраняются в надежном облачном хранилище.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* Information on Russian Domains & No VPN */}
                <div className="space-y-3 border-t border-white/5 pt-5">
                  <h3 className="text-sm font-bold font-rounded text-purple-300">Работа в РФ и подключение домена</h3>
                  <div className="p-4 bg-purple-500/5 border border-purple-500/10 rounded-xl space-y-3 text-xs leading-relaxed text-gray-300">
                    <p>
                      Платформа разработана с учетом ограничений в РФ:
                    </p>
                    <ul className="list-disc pl-5 space-y-1.5">
                      <li>
                        <strong>Вход без VPN</strong>: База данных Firestore работает стабильно по всей территории России. Ученикам не нужно настраивать прокси.
                      </li>
                      <li>
                        <strong>Никакой авторизации для учеников</strong>: Ученик заходит по своей индивидуальной ссылке. Ему не нужно регистрироваться, вводить почту или подтверждать телефон.
                      </li>
                      <li>
                        <strong>Ваш личный русский домен (.RU)</strong>: Вы можете легко привязать купленный домен (например, <i>tutor-rus.ru</i>) к этому сервису через Cloud Run. Для этого направьте ваш домен CNAME-записью на наш хостинг.
                      </li>
                    </ul>
                  </div>
                </div>
              </motion.div>
            )}

          </AnimatePresence>
        )}

        {/* MODAL: STUDENT TEST DETAILS ANALYSIS */}
        <AnimatePresence>
          {reviewingTest && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#0c0c10] border border-white/10 rounded-3xl p-6 sm:p-8 max-w-3xl w-full max-h-[85vh] overflow-y-auto space-y-6 shadow-2xl relative"
              >
                {/* Header */}
                <div className="flex justify-between items-start gap-4 pb-4 border-b border-white/5">
                  <div>
                    <span className="text-[10px] text-gray-500 font-mono">Проверочная работа решена</span>
                    <h3 className="text-lg font-bold font-rounded text-gray-200 mt-0.5">{reviewingTest.title}</h3>
                  </div>
                  <button 
                    onClick={() => setReviewingTest(null)}
                    className="p-1 text-gray-400 hover:text-gray-200"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                {/* Score analytics metrics */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 bg-white/2 rounded-xl border border-white/5 text-center">
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-mono">Первичный балл</span>
                    <div className="font-mono text-lg font-extrabold text-gray-200 mt-1">
                      {reviewingTest.results?.score} / {reviewingTest.results?.maxScore}
                    </div>
                  </div>
                  <div className="p-3.5 bg-white/2 rounded-xl border border-white/5 text-center">
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-mono">Итоговая оценка</span>
                    <div className="font-rounded text-lg font-extrabold text-purple-400 mt-1">
                      {reviewingTest.results ? calculateScore(reviewingTest.results.score, reviewingTest.results.maxScore, reviewingTest.systemType).gradeText : 'N/A'}
                    </div>
                  </div>
                  <div className="p-3.5 bg-white/2 rounded-xl border border-white/5 text-center">
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-mono">Затрачено времени</span>
                    <div className="font-mono text-lg font-extrabold text-gray-200 mt-1">
                      {formatTime(reviewingTest.timeSpent)}
                    </div>
                  </div>
                  <div className="p-3.5 bg-white/2 rounded-xl border border-white/5 text-center">
                    <span className="text-[9px] uppercase tracking-wider text-gray-500 font-mono">Защита от списывания</span>
                    <div className={`font-mono text-lg font-extrabold mt-1 ${reviewingTest.tabSwitches > 1 ? 'text-rose-400' : 'text-emerald-400'}`}>
                      {reviewingTest.tabSwitches} вых.
                    </div>
                  </div>
                </div>

                {reviewingTest.tabSwitches > 1 && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl text-xs flex gap-2.5 items-start">
                    <ShieldAlert className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p className="leading-relaxed">
                      Ученик сворачивал вкладку или переходил на сторонние ресурсы во время выполнения теста <b>{reviewingTest.tabSwitches} раз(а)</b>. Возможно, он искал ответы в интернете.
                    </p>
                  </div>
                )}

                {/* Question Summary Table */}
                <div className="glass-panel p-5 rounded-2xl border border-white/5 space-y-4">
                  <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider font-mono">Сводная таблица по заданиям</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-white/10 text-gray-500 font-medium font-mono">
                          <th className="py-2 px-3">№</th>
                          <th className="py-2 px-3">Тип задания</th>
                          <th className="py-2 px-3">Ответ ученика</th>
                          <th className="py-2 px-3">Правильный ответ</th>
                          <th className="py-2 px-3 text-center">Статус</th>
                          <th className="py-2 px-3 text-right">Баллы</th>
                        </tr>
                      </thead>
                      <tbody>
                        {reviewingTest.questions.map((q) => {
                          const studentAns = reviewingTest.answers[q.id] || '';
                          const isCorrect = reviewingTest.results?.questionStatus[q.id] ?? false;
                          return (
                            <tr key={q.id} className="border-b border-white/5 hover:bg-white/2">
                              <td className="py-2 px-3 font-bold font-mono">№{q.number}</td>
                              <td className="py-2 px-3 text-gray-400">
                                {q.type === 'single' ? 'Один выбор' : q.type === 'multiple' ? 'Множественный выбор' : q.type === 'matching' ? 'Соответствие' : 'Короткий ответ'}
                              </td>
                              <td className={`py-2 px-3 font-mono ${isCorrect ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}`}>
                                {studentAns || '<пусто>'}
                              </td>
                              <td className="py-2 px-3 font-mono text-emerald-400">
                                {q.correctAnswer.includes('/') ? q.correctAnswer.split('/').join(' или ') : q.correctAnswer}
                              </td>
                              <td className="py-2 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${isCorrect ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' : 'bg-rose-500/10 text-rose-400 border border-rose-500/25'}`}>
                                  {isCorrect ? 'Верно' : 'Неверно'}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-right font-mono text-gray-400">
                                {isCorrect ? q.points || 1 : 0} из {q.points || 1}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Question item list analysis */}
                <div className="space-y-4">
                  <h4 className="text-sm font-bold font-rounded">Детализация ответов:</h4>
                  {reviewingTest.questions.map((q) => {
                    const studentAns = reviewingTest.answers[q.id] || '';
                    const isCorrect = reviewingTest.results?.questionStatus[q.id];
                    const isDoubted = reviewingTest.doubtedQuestions?.[q.id] || false;

                    return (
                      <div 
                        key={q.id}
                        className={`p-4 bg-white/1 rounded-xl border ${
                          isDoubted
                            ? 'border-amber-500/30 bg-amber-500/2'
                            : isCorrect ? 'border-emerald-500/10' : 'border-rose-500/10'
                        } flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-white/10 transition-all`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-500 font-mono">Задание №{q.number} ({q.points || 1} б.)</span>
                            {isDoubted && (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                                <HelpCircle className="w-2.5 h-2.5 text-amber-400" />
                                хочет обсудить!
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-300 font-medium whitespace-pre-line line-clamp-2 max-w-xl">{q.text}</p>
                        </div>

                        <div className="flex items-center gap-4 text-xs font-mono flex-shrink-0">
                          <div>
                            <span className="text-gray-500">Ответ:</span>{' '}
                            <span className={`font-bold ${isCorrect ? 'text-emerald-400' : 'text-rose-400'}`}>
                              {studentAns || '<пусто>'}
                            </span>
                          </div>
                          {!isCorrect && (
                            <div>
                              <span className="text-gray-500">Верно:</span>{' '}
                              <span className="text-emerald-400 font-bold">{q.correctAnswer.includes('/') ? q.correctAnswer.split('/').join(' или ') : q.correctAnswer}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
        
        {/* ==================== CUSTOM MODALS OVERLAYS ==================== */}
        
        {/* 1. Cancel Test Creation Confirm Modal */}
        <AnimatePresence>
          {showCancelConfirm && (
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
                  <h4 className="text-base font-bold font-rounded text-gray-200">Прервать создание теста?</h4>
                  <p className="text-xs text-gray-400">
                    Все внесенные изменения будут безвозвратно утеряны.
                  </p>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setShowCancelConfirm(false)}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition-all"
                  >
                    Продолжить
                  </button>
                  <button
                    onClick={() => {
                      setIsCreatingTest(false);
                      setShowCancelConfirm(false);
                      setTestBuilderError(null);
                    }}
                    className="flex-1 py-2 bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-bold rounded-xl transition-all"
                  >
                    Да, прервать
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>


        {/* 3. Delete Assigned Test Modal */}
        <AnimatePresence>
          {testToDelete && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#121218] border border-white/10 p-6 rounded-2xl max-w-sm w-full text-center space-y-4 shadow-2xl"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="space-y-1.5">
                  <h4 className="text-base font-bold text-gray-200 font-rounded">Отозвать тест у ученика?</h4>
                  <p className="text-xs text-gray-400">
                    Ученик больше не увидит тест <strong className="text-purple-300">"{testToDelete.title}"</strong> в списке назначенных.
                  </p>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setTestToDelete(null)}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={confirmDeleteAssignedTest}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-gray-200 text-xs font-bold rounded-xl transition-all"
                  >
                    Отозвать
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* 4. Delete Library Test Modal */}
        <AnimatePresence>
          {libraryTestToDelete && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-[#121218] border border-white/10 p-6 rounded-2xl max-w-md w-full space-y-4 shadow-2xl"
              >
                <div className="mx-auto w-12 h-12 rounded-full bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400">
                  <Trash2 className="w-5 h-5" />
                </div>
                <div className="text-center space-y-1.5">
                  <h4 className="text-base font-bold font-rounded text-gray-200">Удалить тест из библиотеки?</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">
                    Вы действительно хотите безвозвратно удалить тест <strong className="text-purple-300">"{libraryTestToDelete.title}"</strong> из вашей библиотеки? 
                    Ученики, у которых он уже пройден, сохранят свои результаты.
                  </p>
                </div>
                <div className="flex gap-2.5 pt-2">
                  <button
                    onClick={() => setLibraryTestToDelete(null)}
                    className="flex-1 py-2 bg-white/5 hover:bg-white/10 text-gray-300 text-xs font-semibold rounded-xl transition-all"
                  >
                    Отмена
                  </button>
                  <button
                    onClick={confirmDeleteTestFromLibrary}
                    className="flex-1 py-2 bg-rose-600 hover:bg-rose-500 text-gray-200 text-xs font-bold rounded-xl transition-all"
                  >
                    Удалить тест
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
