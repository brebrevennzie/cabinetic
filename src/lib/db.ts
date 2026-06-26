/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Student, Test, StudentTest, TutorSettings } from '../types';

// Helper to generate IDs client-side
function generateId(): string {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

/**
 * Seeding is now handled server-side during initialization.
 * Kept for interface compatibility.
 */
export async function seedDefaultTestsIfNeeded(): Promise<void> {
  // Handled completely by the server on start
}

/**
 * Gets tutor settings (e.g. password) from server API.
 */
export async function getTutorSettings(): Promise<TutorSettings> {
  try {
    const res = await fetch('/api/settings');
    if (!res.ok) throw new Error('Failed to fetch tutor settings');
    return await res.json();
  } catch (error) {
    console.error('Error fetching tutor settings:', error);
    return { isConfigured: false };
  }
}

/**
 * Updates tutor settings.
 */
export async function saveTutorSettings(settings: TutorSettings): Promise<void> {
  const res = await fetch('/api/settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings),
  });
  if (!res.ok) throw new Error('Failed to save tutor settings');
}

/**
 * Students API
 */
export async function getAllStudents(): Promise<Student[]> {
  const res = await fetch('/api/students');
  if (!res.ok) throw new Error('Failed to fetch students');
  return await res.json();
}

export async function getStudentById(id: string): Promise<Student | null> {
  try {
    const res = await fetch(`/api/students/${id}`);
    if (!res.ok) {
      if (res.status === 404) return null;
      throw new Error('Failed to fetch student');
    }
    return await res.json();
  } catch (error) {
    console.error('Error fetching student:', error);
    return null;
  }
}

export async function createStudent(name: string): Promise<Student> {
  const newStudent = {
    id: generateId(),
    name,
    createdAt: new Date().toISOString()
  };
  const res = await fetch('/api/students', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newStudent),
  });
  if (!res.ok) throw new Error('Failed to create student');
  return newStudent;
}

export async function deleteStudent(id: string): Promise<void> {
  const res = await fetch(`/api/students/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete student');
}

/**
 * Library Tests API
 */
export async function getAllTests(): Promise<Test[]> {
  const res = await fetch('/api/tests');
  if (!res.ok) throw new Error('Failed to fetch tests');
  return await res.json();
}

export async function createTest(test: Omit<Test, 'id' | 'createdAt'>): Promise<Test> {
  const newTest = {
    id: generateId(),
    ...test,
    createdAt: new Date().toISOString()
  };
  const res = await fetch('/api/tests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newTest),
  });
  if (!res.ok) throw new Error('Failed to create test');
  return newTest;
}

export async function deleteTest(id: string): Promise<void> {
  const res = await fetch(`/api/tests/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete test');
}

/**
 * Assigned Student Tests API
 */
export async function getAssignedTestsForStudent(studentId: string): Promise<StudentTest[]> {
  const res = await fetch(`/api/student-tests/${studentId}`);
  if (!res.ok) throw new Error('Failed to fetch assigned tests');
  return await res.json();
}

export async function assignTestToStudent(studentId: string, test: Test): Promise<StudentTest> {
  const assignedData = {
    id: generateId(),
    studentId,
    testId: test.id,
    title: test.title,
    systemType: test.systemType,
    questions: test.questions,
    status: 'assigned',
    assignedAt: new Date().toISOString(),
    answers: {},
    doubtedQuestions: {},
    timeSpent: 0,
    tabSwitches: 0,
    results: null
  };
  const res = await fetch('/api/student-tests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(assignedData),
  });
  if (!res.ok) throw new Error('Failed to assign test');
  return assignedData as StudentTest;
}

export async function deleteAssignedTest(id: string): Promise<void> {
  const res = await fetch(`/api/student-tests/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) throw new Error('Failed to delete assigned test');
}

export async function submitStudentAnswers(
  assignedTestId: string, 
  answers: Record<string, string>,
  doubtedQuestions: Record<string, boolean>,
  timeSpent: number,
  tabSwitches: number,
  results: StudentTest['results']
): Promise<void> {
  const res = await fetch(`/api/student-tests/${assignedTestId}/submit`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      answers,
      doubtedQuestions,
      timeSpent,
      tabSwitches,
      results,
      completedAt: new Date().toISOString()
    }),
  });
  if (!res.ok) throw new Error('Failed to submit student answers');
}
