/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// EGE Russian Language 2026 Scale (Primary score 0-50 mapped to 100 secondary points)
const egeScale: Record<number, number> = {
  0: 0, 1: 3, 2: 5, 3: 8, 4: 10, 5: 13, 6: 15, 7: 18, 8: 20, 9: 23,
  10: 25, 11: 28, 12: 30, 13: 33, 14: 35, 15: 36, 16: 38, 17: 40, 18: 42, 19: 44,
  20: 46, 21: 48, 22: 50, 23: 52, 24: 54, 25: 55, 26: 57, 27: 59, 28: 61, 29: 63,
  30: 65, 31: 67, 32: 69, 33: 71, 34: 73, 35: 75, 36: 77, 37: 79, 38: 81, 39: 83,
  40: 85, 41: 87, 42: 89, 43: 91, 44: 93, 45: 95, 46: 97, 47: 98, 48: 99, 49: 100,
  50: 100
};

export interface ScoringResult {
  score: number;       // Student's raw score
  maxScore: number;    // Maximum possible raw score
  percentage: number;  // Percentage score
  grade: string | number; // 2-5 for OGE, 0-100 for EGE
  gradeText: string;   // e.g. "Отлично", "Хорошо" or description of EGE score
}

/**
 * Calculates exam results based on exam type (OGE/EGE) and raw scores
 */
export function calculateScore(score: number, maxScore: number, type: 'OGE' | 'EGE'): ScoringResult {
  if (maxScore <= 0) {
    return { score, maxScore: 0, percentage: 0, grade: 0, gradeText: 'N/A' };
  }

  const percentage = Math.round((score / maxScore) * 100);

  if (type === 'OGE') {
    // Proportional scaling to the official 33 max points
    const scaledScore = Math.round((score / maxScore) * 33);
    let grade = 2;
    let gradeText = 'Неудовлетворительно';

    if (scaledScore >= 29) {
      grade = 5;
      gradeText = 'Отлично';
    } else if (scaledScore >= 23) {
      grade = 4;
      gradeText = 'Хорошо';
    } else if (scaledScore >= 15) {
      grade = 3;
      gradeText = 'Удовлетворительно';
    }

    return {
      score,
      maxScore,
      percentage,
      grade,
      gradeText: `${grade} (${gradeText})`
    };
  } else {
    // EGE Scaling to 50 max points
    const scaledScore = Math.round((score / maxScore) * 50);
    const secondaryPoints = egeScale[Math.min(50, Math.max(0, scaledScore))] || 0;

    let gradeText = 'Не сдал (минимум 36)';
    if (secondaryPoints >= 80) {
      gradeText = 'Отличный результат (Высокий балл)';
    } else if (secondaryPoints >= 60) {
      gradeText = 'Хороший результат (Средний балл)';
    } else if (secondaryPoints >= 36) {
      gradeText = 'Удовлетворительно (Проходной)';
    }

    return {
      score,
      maxScore,
      percentage,
      grade: secondaryPoints,
      gradeText: `${secondaryPoints} б. (${gradeText})`
    };
  }
}
