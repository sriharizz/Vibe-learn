// components/dashboard/RecentUploads.tsx
import React from 'react';
import { FileText, AlertTriangle } from 'lucide-react';
// --- 1. IMPORT THE HOOKS ---
import { useNavigate } from 'react-router-dom';
import { useMoodContext } from '../../App'; // Adjust path as needed
// --- 2. IMPORT THE FULL TYPE FROM THE PARENT PAGE ---
import { TopicToReview } from '../../pages/Dashboard'; 

interface RecentUploadsProps {
  reviewTopics: TopicToReview[];
}

const RecentUploads: React.FC<RecentUploadsProps> = ({ reviewTopics }) => {
  // --- 3. GET THE NAVIGATION TOOLS ---
  const navigate = useNavigate();
  const { setActivePlanId, setTotalTopics } = useMoodContext();

  // --- 4. CREATE THE CLICK HANDLER ---
  const handleTopicClick = (topic: TopicToReview) => {
    // Set the plan ID in our global context
    setActivePlanId(topic.plan_id);
    
    // Set total topics to null. StudyPage will re-fetch it.
    setTotalTopics(null); 
    
    // Navigate to the study page and pass the topic number as a URL param
    navigate(`/study?topic=${topic.topic_step}`);
  };

  return (
    <div className="bg-white shadow-md rounded-2xl p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-semibold text-gray-900">Topics to Review</h2>
        <AlertTriangle className="h-5 w-5 text-orange-500" />
      </div>

      <div className="space-y-4">
        {reviewTopics.length > 0 ? (
          reviewTopics.map((topic, index) => (
            // --- 5. MAKE THE DIV A CLICKABLE BUTTON ---
            <button
              key={index}
              onClick={() => handleTopicClick(topic)}
              className="flex items-center space-x-3 p-3 rounded-lg hover:bg-gray-50 transition-colors duration-200 cursor-pointer w-full text-left"
            >
              <div className="flex-shrink-0">
                <FileText className="h-5 w-5 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {topic.topic}
                </p>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span className="truncate max-w-[100px]">{topic.file_name}</span>
                  <span>•</span>
                  <span className="font-bold text-red-600">Score: {topic.last_score}%</span>
                </div>
              </div>
            </button>
          ))
        ) : (
          <p className="text-sm text-gray-500 text-center">Great job! You have no topics to review right now.</p>
        )}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button className="w-full text-center text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors duration-200">
          View Full Quiz History
        </button>
      </div>
    </div>
  );
};

export default RecentUploads;