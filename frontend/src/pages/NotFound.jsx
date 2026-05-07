import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle } from 'lucide-react';

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] animate-in fade-in zoom-in duration-500">
      <div className="bg-rose-100 dark:bg-rose-900/30 p-6 rounded-full mb-6">
        <AlertCircle className="w-16 h-16 text-rose-600 dark:text-rose-400" />
      </div>
      <h1 className="text-4xl font-bold text-slate-900 dark:text-white mb-2">404</h1>
      <p className="text-xl text-slate-600 dark:text-slate-400 mb-8 text-center max-w-md">
        Oops! The page you're looking for doesn't exist or has been moved.
      </p>
      <Link 
        to="/" 
        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-medium transition-colors shadow-sm shadow-blue-600/20"
      >
        Go Back Home
      </Link>
    </div>
  );
}
