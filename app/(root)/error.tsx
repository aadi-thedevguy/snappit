"use client";

import React from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage: React.FC<ErrorProps> = ({ error, reset }: ErrorProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-gray-50 to-blue-100 text-gray-900 font-sans px-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl text-center max-w-sm w-full">
        <svg width="64" height="64" fill="none" viewBox="0 0 24 24" className="mx-auto mb-4">
          <circle cx="12" cy="12" r="10" fill="#f44336" opacity="0.15" />
          <path d="M12 8v4m0 4h.01" stroke="#f44336" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <h1 className="text-2xl font-bold mb-2">Oops! Something went wrong.</h1>
        <p className="mb-4 text-gray-700">{error.message || "An unexpected error occurred."}</p>
        {error.digest && (
          <p className="text-xs text-gray-400 mb-4">Error ID: {error.digest}</p>
        )}
        <button
          onClick={reset}
          className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg text-base font-semibold shadow hover:bg-gray-700 transition"
        >
          Try Again
        </button>
      </div>
    </div>
  );
};

export default ErrorPage;
