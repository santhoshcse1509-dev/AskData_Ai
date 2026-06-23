'use client';

import { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import DataAnalysisTool from '@/components/DataAnalysisTool';

export default function Page() {
  const [sessionId] = useState(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('data-analysis-session-id');
      if (stored) return stored;
    }
    const newId = uuidv4();
    if (typeof window !== 'undefined') {
      localStorage.setItem('data-analysis-session-id', newId);
    }
    return newId;
  });

  return (
    <main className="min-h-screen bg-background">
      <DataAnalysisTool sessionId={sessionId} />
    </main>
  );
}
