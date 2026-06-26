/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import StudentCabinet from './components/StudentCabinet';
import TutorDashboard from './components/TutorDashboard';

export default function App() {
  const [studentId, setStudentId] = useState<string | null>(null);

  useEffect(() => {
    // Parse studentId query parameter
    const params = new URLSearchParams(window.location.search);
    const id = params.get('studentId');
    if (id) {
      setStudentId(id);
    }
  }, []);

  const handleExitCabinet = () => {
    setStudentId(null);
    // Clear URL query parameters cleanly
    window.history.pushState({}, '', window.location.pathname);
  };

  if (studentId) {
    return (
      <StudentCabinet 
        studentId={studentId} 
        onExit={handleExitCabinet} 
        isPublicView={true}
      />
    );
  }

  return <TutorDashboard />;
}
