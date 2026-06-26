/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ExamType = 'OGE' | 'EGE';

export interface Question {
  id: string;
  text: string;
  type: 'single' | 'multiple' | 'text' | 'matching';
  options?: string[]; // for single and multiple choice, or right-side items in matching
  leftItems?: string[]; // left-side items for matching
  correctAnswer: string; // for multiple choice (comma-separated), matching (comma-separated indices), or exact string
  points: number; // usually 1, some can be more
  number: number; // question number in the exam paper (e.g. 1-26 for EGE, 1-13 for OGE)
}

export interface Test {
  id: string;
  title: string;
  description: string;
  systemType: ExamType;
  questions: Question[];
  createdAt: any; // Firestore Timestamp or ISO string
}

export interface Student {
  id: string;
  name: string;
  createdAt: any;
}

export interface StudentTest {
  id: string;
  studentId: string;
  testId: string;
  title: string;
  systemType: ExamType;
  questions: Question[];
  status: 'assigned' | 'completed';
  assignedAt: any;
  completedAt?: any;
  answers: Record<string, string>; // questionId -> studentAnswer
  doubtedQuestions?: Record<string, boolean>; // questionId -> if student doubted this question
  timeSpent: number; // in seconds
  tabSwitches: number; // count of tab switches / blur events
  results?: {
    score: number; // primary score
    maxScore: number; // max possible primary score
    grade: string | number; // 2-5 for OGE, 0-100 test score for EGE
    questionStatus: Record<string, boolean>; // questionId -> isCorrect
  };
}

export interface TutorSettings {
  passwordHash?: string;
  isConfigured: boolean;
}
