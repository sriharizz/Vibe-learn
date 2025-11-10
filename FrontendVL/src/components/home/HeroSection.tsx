import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Brain, Sparkles } from 'lucide-react';

const HeroSection: React.FC = () => {
  return (
    <div className="bg-gradient-to-br from-purple-50 via-blue-50 to-green-50 py-20">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <div className="flex justify-center mb-6">
            <div className="relative">
              <div className="w-16 h-16 bg-purple-600 rounded-2xl flex items-center justify-center">
                <Brain className="h-8 w-8 text-white" />
              </div>
              <div className="absolute -top-1 -right-1">
                <Sparkles className="h-6 w-6 text-yellow-400" />
              </div>
            </div>
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
            Learn at Your
            <span className="text-purple-600"> Optimal Vibe</span>
          </h1>
          
          <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
            VibeLearn adapts to your mood and energy levels to create personalized learning experiences. 
            Upload your materials, get AI-powered summaries, and study when you're most receptive.
          </p>
          
          <div className="flex flex-col sm:flex-row justify-center items-center space-y-4 sm:space-y-0 sm:space-x-4">
            <Link
              to="/dashboard"
              className="bg-purple-600 text-white px-8 py-3 rounded-xl font-semibold hover:bg-purple-700 transition-all duration-200 flex items-center space-x-2 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              <span>Get Started</span>
              <ArrowRight className="h-5 w-5" />
            </Link>
            
            <Link
              to="/study"
              className="bg-white text-purple-600 px-8 py-3 rounded-xl font-semibold hover:bg-purple-50 transition-all duration-200 border-2 border-purple-600 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
            >
              Try Demo
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroSection;