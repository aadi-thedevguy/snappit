"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { AlertCircleIcon } from "lucide-react";
import React from "react";

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

const ErrorPage: React.FC<ErrorProps> = ({ error, reset }: ErrorProps) => {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-linear-to-br from-gray-50 to-blue-100 text-gray-900 font-sans px-4">
      <Alert variant="destructive" className="max-w-md">
        <AlertCircleIcon />
        <AlertTitle>
          <h1 className="text-2xl font-bold mb-2">
            Oops! Something went wrong.
          </h1>
        </AlertTitle>
        <AlertDescription>
          <p className="mb-4 text-gray-700">
            {error.message || "An unexpected error occurred."}
          </p>
          {error.digest && (
            <p className="text-xs text-gray-400 mb-4">
              Error ID: {error.digest}
            </p>
          )}
          <button
            onClick={reset}
            className="mt-4 px-6 py-2 bg-gray-900 text-white rounded-lg text-base font-semibold shadow hover:bg-gray-700 transition"
          >
            Try Again
          </button>
        </AlertDescription>
      </Alert>
    </div>
  );
};

export default ErrorPage;
