import React from 'react';
import { TrendingUp, BookOpen, Clock, Target } from 'lucide-react';

// --- 1. Define the types for the props ---
interface UserStats {
  total_subjects: number;
  total_quizzes: number;
  average_score: number;
}

// components/profile/ProgressTracker.tsx

interface SimplePlan {
  id: number;
  plan_title: string;
  file_name: string;
  progress: number; // <-- ADD THIS LINE
}

interface ProgressTrackerProps {
  stats: UserStats | null;
  plans: SimplePlan[];
}

// --- 2. Accept 'stats' and 'plans' as props ---
const ProgressTracker: React.FC<ProgressTrackerProps> = ({ stats, plans }) => {
  
  // --- 3. Use the dynamic 'stats' data ---
  const statsCards = [
    { 
      label: 'Subjects Uploaded', 
      value: stats ? stats.total_subjects : 0, 
      icon: BookOpen, 
      color: 'text-purple-600' 
    },
    { 
      label: 'Quizzes Taken', 
      value: stats ? stats.total_quizzes : 0, 
      icon: Target, 
      color: 'text-green-600' 
    },
    { 
      label: 'Average Score', 
      value: `${stats ? stats.average_score : 0}%`, 
      icon: TrendingUp, 
      color: 'text-orange-600' 
    },
    { 
      label: 'Study Hours', 
      value: '0', // We don't track this yet
      icon: Clock, 
      color: 'text-blue-600' 
    },
  ];

  // --- 4. Use the dynamic 'plans' data ---
  // We'll just show the first 4 plans for this component
 // --- 4. Use the dynamic 'plans' data ---
  // We'll just show the first 4 plans for this component
  const subjects = plans.slice(0, 4).map((plan, index) => ({
    name: plan.plan_title || plan.file_name,
    progress: plan.progress, // <-- THIS IS THE FIX
    color: ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500'][index % 4],
  }));

  return (
    <div className="bg-white shadow-md rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
          <TrendingUp className="h-5 w-5 text-green-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Progress Tracker</h2>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsCards.map((stat, index) => {
          const Icon = stat.icon;
          return (
            <div key={index} className="text-center p-4 bg-gray-50 rounded-xl">
              <Icon className={`h-6 w-6 ${stat.color} mx-auto mb-2`} />
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-600">{stat.label}</p>
            </div>
          );
        })}
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Subject Progress</h3>
        <div className="space-y-4">
          {subjects.length > 0 ? (
            subjects.map((subject, index) => (
              <div key={index}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{subject.name}</span>
                  <span className="text-sm text-gray-600">{subject.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${subject.color} transition-all duration-500`}
                    style={{ width: `${subject.progress}%` }}
                  ></div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 text-center">No subjects uploaded yet. Go to the "Chat" page to upload a file!</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProgressTracker;