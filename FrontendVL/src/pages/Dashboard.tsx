// pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import SuggestedTopics from '../components/dashboard/SuggestedTopics';
import RecentUploads from '../components/dashboard/RecentUploads';
import api from '../services/api'; 
import { Loader2 } from 'lucide-react';

// (SimplePlan interface is correct)
export interface SimplePlan {
  id: number;
  plan_title: string;
  file_name: string;
  created_at: string;
  progress: number;
}

// --- *** THIS IS THE FIX *** ---
// Added plan_id and topic_step so we can make links
export interface TopicToReview {
  file_name: string;
  topic: string;
  last_score: number;
  plan_id: number;    // <-- ADDED
  topic_step: number; // <-- ADDED
}

const Dashboard: React.FC = () => {
  const [plans, setPlans] = useState<SimplePlan[]>([]);
  const [reviewTopics, setReviewTopics] = useState<TopicToReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        setIsLoading(true);
        const [plansResp, reviewResp] = await Promise.all([
          api.get('/dashboard/my-plans'),
          api.get('/dashboard/topics-to-review')
        ]);
        
        setPlans(plansResp.data);
        setReviewTopics(reviewResp.data);

      } catch (error) {
        console.error("Failed to fetch dashboard data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchDashboardData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
        <p className="ml-4 text-xl text-gray-700">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome back!</h1>
        <p className="text-gray-600">Ready to continue your learning journey?</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          {/* (This prop is correct) */}
          <SuggestedTopics plans={plans} />
        </div>
        <div>
          {/* This component will now receive the correct props */}
          <RecentUploads reviewTopics={reviewTopics} />
        </div>
      </div>
    </div>
  );
};

export default Dashboard;