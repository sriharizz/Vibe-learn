import React, { useState, useEffect } from 'react';
import UserInfo from '../components/profile/UserInfo';
import ProgressTracker from '../components/profile/ProgressTracker';
import Settings from '../components/profile/Settings';
import api from '../services/api'; 
import { Loader2 } from 'lucide-react';

// --- (Types for User and UserStats are fine) ---
interface User {
  email: string;
  created_at: string;
  // Add other user fields if you have them, e.g., name
}

interface UserStats {
  total_subjects: number;
  total_quizzes: number;
  average_score: number;
}

// --- *** THIS IS THE FIX *** ---
// The SimplePlan interface was missing the 'progress' property
interface SimplePlan {
  id: number;
  plan_title: string;
  file_name: string;
  created_at: string;
  progress: number; // <-- ADDED THIS PROPERTY
}

const ProfilePage: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [plans, setPlans] = useState<SimplePlan[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setIsLoading(true);
        // Fetch all three endpoints in parallel
        const [userResp, statsResp, plansResp] = await Promise.all([
          api.get('/me'),
          api.get('/dashboard/my-stats'),
          api.get('/dashboard/my-plans')
        ]);
        
        setUser(userResp.data.user);
        setStats(statsResp.data);
        setPlans(plansResp.data);

      } catch (error) {
        console.error("Failed to fetch profile data:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfileData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
        <p className="ml-4 text-xl text-gray-700">Loading Profile...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Profile</h1>
        <p className="text-gray-600">Manage your learning preferences and track your progress</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div>
          <UserInfo user={user} />
        </div>
        <div className="lg:col-span-2 space-y-8">
          {/* This will now pass the 'progress' prop to ProgressTracker */}
          <ProgressTracker stats={stats} plans={plans} />
          <Settings />
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;