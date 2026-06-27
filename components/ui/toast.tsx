import React from 'react';

interface ToastProps {
  message: string;
}

export function Toast({ message }: ToastProps) {
  return (
    <div className="fixed top-4 right-4 z-50 rounded-lg border border-red-500/50 bg-red-500/10 px-4 py-3 text-red-700 shadow-lg">
      {message}
    </div>
  );
}