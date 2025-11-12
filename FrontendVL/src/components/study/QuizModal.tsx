import React, { useState } from 'react';
import { X, ChevronsRight } from 'lucide-react'; 

export interface QuizQuestion {
  type: string;
  q: string;
  options: string[] | null;
  a: string;
  topic_step: number;
}

export interface QuizResult {
  topic_step: number;
  correct: boolean;
}

interface QuizModalProps {
  questions: QuizQuestion[];
  onClose: () => void;
  onComplete: (results: QuizResult[]) => void;
}

const QuizModal: React.FC<QuizModalProps> = ({ questions, onClose, onComplete }) => {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [results, setResults] = useState<QuizResult[]>([]); 
  const [showResult, setShowResult] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);

  if (!questions || questions.length === 0) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative">
          <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
            <X size={24} />
          </button>
          <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">Quiz</h2>
          <p className="text-center text-gray-600">Loading questions or no questions found...</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const totalQuestions = questions.length;

  // --- THIS IS THE NEW, SMARTER LOGIC ---
  const handleAnswerSubmit = () => {
    if (!selectedAnswer) return;

    const answerLetter = selectedAnswer.split('.')[0].toUpperCase(); // Gets "C" from "C. Deterioration..."
    const answerText = selectedAnswer.toLowerCase();
    const correctLetter = currentQuestion.a.toUpperCase();
    const correctText = currentQuestion.a.toLowerCase();

    // Check if EITHER the letter matches OR the full text matches
    const isAnswerCorrect = (answerLetter === correctLetter) || (answerText === correctText);
    
    setIsCorrect(isAnswerCorrect);
    
    const newResult: QuizResult = {
      topic_step: currentQuestion.topic_step || 1, 
      correct: isAnswerCorrect
    };
    
    setShowResult(true);

    setTimeout(() => {
      setShowResult(false);
      setSelectedAnswer(null);
      
      const updatedResults = [...results, newResult];
      setResults(updatedResults); 

      if (currentQuestionIndex < totalQuestions - 1) {
        setCurrentQuestionIndex(i => i + 1);
      } else {
        onComplete(updatedResults);
      }
    }, 2000);
  };
  // --- END OF NEW LOGIC ---

  const handleSkipQuiz = () => {
    onComplete(results);
  };

  // --- NEW HELPER FUNCTION ---
  // This checks if an option is the correct one, handling both letters AND text
  const isOptionCorrect = (option: string, index: number): boolean => {
    const optionLetter = String.fromCharCode(65 + index); // "A", "B", "C"
    const correctLetter = currentQuestion.a.toUpperCase();
    const correctText = currentQuestion.a.toLowerCase();
    
    return (optionLetter === correctLetter) || (option.toLowerCase() === correctText);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-lg relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-600">
          <X size={24} />
        </button>
        
        <button
          onClick={handleSkipQuiz}
          className="absolute top-4 left-4 text-gray-400 hover:text-purple-600 text-sm font-medium flex items-center"
        >
          Skip Quiz
          <ChevronsRight size={18} />
        </button>
        
        <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">Quiz</h2>
        <p className="text-center text-gray-600 mb-6">Question {currentQuestionIndex + 1} of {totalQuestions}</p>

        <div className="mb-6">
          <p className="text-lg font-semibold text-gray-800 mb-4">{currentQuestion.q}</p>
          <div className="space-y-3">
            {currentQuestion.type === 'mcq' && currentQuestion.options ? (
              // --- THIS SECTION IS NOW FIXED ---
              currentQuestion.options.map((option, index) => {
                
                return (
                  <button
                    key={index}
                    disabled={showResult}
                    // This is the bug: save the OPTION text, not a letter
                    onClick={() => setSelectedAnswer(option)}
                    className={`w-full text-left p-4 rounded-lg border-2 transition-all
                      ${
                        // Check if this option is the one we selected
                        selectedAnswer === option
                        ? 'border-purple-600 bg-purple-50 ring-2 ring-purple-300'
                        : 'border-gray-300 hover:bg-gray-50'
                      }
                      ${
                        // Check if this option is the correct answer
                        showResult && isOptionCorrect(option, index)
                        ? 'bg-green-100 border-green-600' 
                        : ''
                      }
                      ${
                        // Check if we selected this AND it was wrong
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
              // --- END OF FIXED SECTION ---
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
        </div>

        {showResult && (
          <div className={`p-4 rounded-lg mb-4 ${isCorrect ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${currentQuestion.a}`}
          </div>
        )}

        <button
          onClick={handleAnswerSubmit}
          disabled={!selectedAnswer || showResult}
          className="w-full bg-purple-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-purple-700 transition-colors duration-200 disabled:bg-purple-300"
        >
          {showResult ? (isCorrect ? 'Correct!' : 'Incorrect') : 'Submit Answer'}
        </button>
      </div>
    </div>
  );
};

export default QuizModal;