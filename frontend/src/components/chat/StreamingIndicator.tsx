import React from 'react';

export function StreamingIndicator() {
  return (
    <div className="flex items-center space-x-1.5 py-1">
      <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.3s]" />
      <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce [animation-delay:-0.15s]" />
      <div className="w-2 h-2 rounded-full bg-blue-600 animate-bounce" />
    </div>
  );
}
