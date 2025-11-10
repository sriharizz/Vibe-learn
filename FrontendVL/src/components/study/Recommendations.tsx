import React from 'react';
import { Lightbulb, ExternalLink, Clock, Target } from 'lucide-react';

const Recommendations: React.FC = () => {
  const recommendations = [
    {
      title: 'Practice Problems',
      description: 'Vector space exercises',
      type: 'exercise',
      duration: '20 min',
      icon: Target,
      color: 'text-green-600 bg-green-100'
    },
    {
      title: 'Related Video',
      description: '3Blue1Brown: Linear Algebra',
      type: 'video',
      duration: '15 min',
      icon: ExternalLink,
      color: 'text-blue-600 bg-blue-100'
    },
    {
      title: 'Quick Review',
      description: 'Matrix multiplication basics',
      type: 'review',
      duration: '10 min',
      icon: Clock,
      color: 'text-purple-600 bg-purple-100'
    },
  ];

  return (
    <div className="bg-white shadow-md rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-yellow-100 rounded-lg flex items-center justify-center">
          <Lightbulb className="h-5 w-5 text-yellow-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Recommendations</h2>
      </div>

      <div className="space-y-4">
        {recommendations.map((rec, index) => {
          const Icon = rec.icon;
          return (
            <div
              key={index}
              className="p-4 border border-gray-200 rounded-xl hover:shadow-md transition-all duration-200 cursor-pointer group"
            >
              <div className="flex items-start space-x-3">
                <div className={`w-10 h-10 rounded-lg ${rec.color} flex items-center justify-center flex-shrink-0`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900 group-hover:text-purple-600 transition-colors duration-200">
                    {rec.title}
                  </h3>
                  <p className="text-sm text-gray-600 mb-2">{rec.description}</p>
                  <div className="flex items-center space-x-2 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{rec.duration}</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 pt-4 border-t border-gray-200">
        <button className="w-full text-center text-purple-600 hover:text-purple-700 font-medium text-sm transition-colors duration-200">
          View More Recommendations
        </button>
      </div>
    </div>
  );
};

export default Recommendations;