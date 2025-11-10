import React from 'react';
import { ArrowRight, Star } from 'lucide-react'; // <-- 'Clock' removed
import { useNavigate } from 'react-router-dom';
import { useMoodContext } from '../../App'; 

// --- 1. Define the types for the props ---
interface SimplePlan {
  id: number;
  plan_title: string;
  file_name: string;
  created_at: string;
  progress: number;
}

interface SuggestedTopicsProps {
  plans: SimplePlan[];
}

// --- 2. Accept 'plans' as a prop ---
const SuggestedTopics: React.FC<SuggestedTopicsProps> = ({ plans }) => {
  const navigate = useNavigate();
  const { setActivePlanId } = useMoodContext(); 

  // --- 3. Handle clicking on a plan ---
  const handlePlanClick = (planId: number) => {
    setActivePlanId(planId); 
    navigate('/study'); 
  };
  
  // --- 'getDifficultyColor' function removed (it was unused) ---

  return (
    <div className="bg-white shadow-md rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Your Subjects</h2>
        <Star className="h-5 w-5 text-yellow-500" />
      </div>

      <div className="space-y-4">
        {/* --- 4. Map over the REAL plans data --- */}
        {plans.length > 0 ? (
          plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => handlePlanClick(plan.id)} 
              className="border border-gray-200 rounded-xl p-4 hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors duration-200">
                    {plan.plan_title}
                  </h3>
                  <p className="text-sm text-gray-600 mt-1">
                    {plan.file_name}
                  </p>
                </div>
                <ArrowRight className="h-5 w-5 text-gray-400 group-hover:text-purple-600 transition-colors duration-200" />
              </div>
              
              {/* --- 5. Use the REAL progress data --- */}
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-purple-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${plan.progress}%` }}
                ></div>
              </div>
              <p className="text-xs text-gray-500 mt-1 text-right">{plan.progress}% complete</p>

            </div>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center">No subjects found. Go to the "Chat" page to upload a file and create one!</p>
        )}
      </div>
    </div>
  );
};

export default SuggestedTopics;