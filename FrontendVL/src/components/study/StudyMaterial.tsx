// components/study/StudyMaterial.tsx
import React, { useState, useEffect } from 'react';
import { ArrowRight, ArrowLeft, Loader2, Brain, CheckCircle, XCircle, Flag } from 'lucide-react'; 
import ReactMarkdown from 'react-markdown';
import { QuizQuestion } from './QuizModal'; 

export interface TopicContent {
  step_number: number;
  topic_title: string;
  main_content: string;
  key_points: string[];
  checkpoint_questions: QuizQuestion[];
}

interface StudyMaterialProps {
  topic: TopicContent;
  onNextTopic: () => void;
  onPreviousTopic: () => void;
  isLoading: boolean;
  isLastTopic: boolean; 
  onStartFinalQuiz: () => void; 
}

const StudyMaterial: React.FC<StudyMaterialProps> = ({ 
  topic, 
  onNextTopic,
  onPreviousTopic,
  isLoading,
  isLastTopic,
  onStartFinalQuiz
}) => {
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  const checkpoint = topic.checkpoint_questions && topic.checkpoint_questions[0];

  useEffect(() => {
    setSelectedAnswer(null);
    setShowResult(false);
    setIsCorrect(false);
  }, [topic]);

  // --- THIS IS THE NEW, SMARTER LOGIC ---
  const handleCheckpointSubmit = () => {
    if (!selectedAnswer || !checkpoint) return;

    const answerLetter = selectedAnswer.split('.')[0].toUpperCase(); // Gets "C" from "C. Deterioration..."
    const answerText = selectedAnswer.toLowerCase();
    const correctLetter = checkpoint.a.toUpperCase();
    const correctText = checkpoint.a.toLowerCase();

    // Check if EITHER the letter matches OR the full text matches
    const isAnswerCorrect = (answerLetter === correctLetter) || (answerText === correctText);
    
    setIsCorrect(isAnswerCorrect);
    setShowResult(true); 
  };
  // --- END OF NEW LOGIC ---

  // --- NEW HELPER FUNCTION ---
  // This checks if an option is the correct one, handling both letters AND text
  const isOptionCorrect = (option: string, index: number): boolean => {
    if (!checkpoint) return false;
    const optionLetter = String.fromCharCode(65 + index); // "A", "B", "C"
    const correctLetter = checkpoint.a.toUpperCase();
    const correctText = checkpoint.a.toLowerCase();
    
    // Check if correct answer is this option's letter OR this option's text
    return (optionLetter === correctLetter) || (option.toLowerCase() === correctText);
  };
  
  const renderNextStepButton = () => {
    // ... (This function is unchanged)
    const nextButton = isLastTopic ? (
      <button
        onClick={onStartFinalQuiz} 
        disabled={isLoading}
        className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200 disabled:bg-green-300 flex items-center justify-center"
      >
        {isLoading ? (
          <Loader2 className="animate-spin mr-2" />
        ) : (
          <Flag className="mr-2" /> 
        )}
        {isLoading ? 'Loading...' : 'Start Final Quiz'}
      </button>
    ) : (
      <button
        onClick={onNextTopic}
        disabled={isLoading}
        className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-200 disabled:bg-purple-300 flex items-center justify-center"
      >
        {isLoading ? (
          <Loader2 className="animate-spin mr-2" />
        ) : (
          <ArrowRight className="mr-2" />
        )}
        {isLoading ? 'Loading...' : 'Next Topic'}
      </button>
    );

    const prevButton = (
      <button
        onClick={onPreviousTopic}
        disabled={isLoading || topic.step_number === 1}
        className="w-full bg-gray-200 text-gray-800 py-3 px-6 rounded-lg font-semibold hover:bg-gray-300 transition-colors duration-200 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed flex items-center justify-center"
      >
        {isLoading ? (
          <Loader2 className="animate-spin mr-2" />
        ) : (
          <ArrowLeft className="mr-2" />
        )}
        Previous Topic
      </button>
    );

    return (
      <div className="mt-6 flex flex-col md:flex-row gap-4">
        {prevButton}
        {nextButton}
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 mb-8">
      <h2 className="text-2xl font-bold text-gray-800 mb-2">{topic.topic_title}</h2>
      <p className="text-sm text-gray-500 mb-6">Topic {topic.step_number}</p>
      
      {/* ... (Main content and key points are unchanged) ... */}
      <div className="prose lg:prose-lg max-w-none text-gray-700 space-y-4">
        <ReactMarkdown
          components={{
            strong: ({node, ...props}) => <strong className="font-bold text-purple-600" {...props} />
          }}
        >
          {topic.main_content}
        </ReactMarkdown>
      </div>
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl mt-8">
        <div className="flex items-center space-x-3 mb-4">
          <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <Brain className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Key Points</h2>
        </div>
        <ul className="space-y-2 text-gray-700">
          {topic.key_points.map((point: string, index: number) => (
            <li key={index} className="flex items-start space-x-2">
              <span className="w-2 h-2 bg-purple-600 rounded-full mt-2 flex-shrink-0"></span>
              <ReactMarkdown
                components={{
                  strong: ({node, ...props}) => <strong className="font-bold text-purple-600" {...props} />
                }}
              >
                {point}
              </ReactMarkdown>
            </li>
          ))}
        </ul>
      </div>

      {/* --- THIS IS THE FIXED CHECKPOINT SECTION --- */}
      {checkpoint && (
        <div className="bg-white border-t border-gray-200 mt-8 pt-8">
          <h3 className="text-xl font-bold text-gray-800 mb-4">Checkpoint Question</h3>
          <p className="text-lg font-semibold text-gray-800 mb-4">{checkpoint.q}</p>
          <div className="space-y-3">
            {checkpoint.type === 'mcq' && checkpoint.options ? (
              checkpoint.options.map((option: string, index: number) => {
                return (
                  <button
                    key={index}
                    disabled={showResult}
                    // This saves the full text, which is what we want
                    onClick={() => setSelectedAnswer(option)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all
                      ${
                        // Check if this option is the one we selected
                        selectedAnswer === option
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-300'
                        : 'border-gray-300 hover:bg-gray-50'
                      }
                      ${
                        // Check if this option is the correct answer (using new helper)
                        showResult && isOptionCorrect(option, index)
                        ? 'bg-green-100 border-green-600' 
                        : ''
                      }
                      ${
                        // Check if we selected this AND it was wrong (using new helper)
                        showResult && selectedAnswer === option && !isOptionCorrect(option, index)
                        ? 'bg-red-100 border-red-600' 
                        : ''
                      }
                    `}
                  >
                    {option}
                  </button>
                )
              })
            ) : (
              // This text input part was already correct
              <input
                type="text"
                value={selectedAnswer || ''}
                onChange={(e) => setSelectedAnswer(e.target.value)}
                disabled={showResult}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                placeholder="Type your answer..."
              />
            )}
          </div>
          {showResult && (
            <div className={`p-4 rounded-lg my-4 flex items-center ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isCorrect ? <CheckCircle className="mr-2" /> : <XCircle className="mr-2" />}
              {/* This is the final fix for the message */}
              {isCorrect ? 'Correct! Well done.' : `Not quite. The correct answer is: ${checkpoint.a}`}
            </div>
          )}
          {!showResult ? (
            <button
              onClick={handleCheckpointSubmit}
              disabled={!selectedAnswer}
              className="w-full mt-6 bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-200 disabled:bg-purple-300"
            >
              Submit Answer
            </button>
          ) : (
            renderNextStepButton()
          )}
        </div>
      )}
      {/* --- END OF FIXED SECTION --- */}

      {!checkpoint && (
        renderNextStepButton()
      )}
    </div>
  );
};

export default StudyMaterial;