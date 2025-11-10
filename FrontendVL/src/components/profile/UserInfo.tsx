import React from 'react';
import { User, Calendar, Award, Star } from 'lucide-react';

// --- 1. Define the types for the props ---
interface User {
  email: string;
  created_at: string;
}

interface UserInfoProps {
  user: User | null;
}

// --- 2. Helper function to format dates ---
const formatJoinDate = (dateString: string) => {
  try {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'long',
      year: 'numeric',
    });
  } catch (error) {
    return "N/A";
  }
};

// --- 3. Accept 'user' as a prop ---
const UserInfo: React.FC<UserInfoProps> = ({ user }) => {
  return (
    <div className="bg-white shadow-md rounded-2xl p-6">
      <div className="text-center mb-6">
        <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <User className="h-12 w-12 text-white" />
        </div>
        
        {/* --- 4. Use real data --- */}
        <h2 className="text-xl font-semibold text-gray-900">
          {user ? user.email.split('@')[0] : 'VibeLearner'}
        </h2>
        <p className="text-gray-600">{user ? user.email : 'Loading...'}</p>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-blue-600" />
            <span className="text-sm font-medium text-gray-700">Member Since</span>
          </div>
          {/* --- 5. Use real data --- */}
          <span className="text-sm text-gray-600">
            {user ? formatJoinDate(user.created_at) : '...'}
          </span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Award className="h-5 w-5 text-green-600" />
            <span className="text-sm font-medium text-gray-700">Learning Streak</span>
          </div>
          <span className="text-sm font-semibold text-green-600">0 days</span>
        </div>

        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center space-x-3">
            <Star className="h-5 w-5 text-yellow-600" />
            <span className="text-sm font-medium text-gray-700">Level</span>
          </div>
          <span className="text-sm font-semibold text-purple-600">Beginner</span>
        </div>
      </div>

      <button className="w-full mt-6 bg-purple-600 text-white py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200">
        Edit Profile
      </button>
    </div>
  );
};

export default UserInfo;