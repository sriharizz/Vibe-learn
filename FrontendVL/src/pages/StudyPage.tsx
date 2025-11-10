// pages/StudyPage.tsx
import React, { useState, useEffect, useCallback, useRef } from 'react';
// --- 1. IMPORT useLocation ---
import { useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api'; 
import { useMoodContext } from '../App';
import PomodoroTimer, { PomodoroTimerHandle } from '../components/study/PomodoroTimer';
import QuizModal, { QuizQuestion, QuizResult } from '../components/study/QuizModal';
import StudyMaterial, { TopicContent } from '../components/study/StudyMaterial';
import Recommendations from '../components/study/Recommendations';
import { Loader2 } from 'lucide-react';

// (Interfaces are unchanged)
interface SessionData {
  session_id: number;
  plan_id: number;
  plan_title: string;
  session_timer_seconds: number;
}
interface BreakModalProps {
  durationSeconds: number;
  onBreakComplete: () => void;
}

// (BreakModal component is unchanged, including your Skip button)
const BreakModal: React.FC<BreakModalProps> = ({ durationSeconds, onBreakComplete }) => {
  const [timeLeft, setTimeLeft] = useState(durationSeconds);
  useEffect(() => {
    if (timeLeft <= 0) {
      onBreakComplete();
      return;
    }
    const timer = setInterval(() => {
      setTimeLeft((t: number) => t - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [timeLeft, onBreakComplete]);
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="text-6xl mb-4">☕</div>
        <h2 className="text-3xl font-bold text-purple-600 mb-2">Break Time!</h2>
        <p className="text-gray-600 mb-4">Time to relax for a moment. You've earned it.</p>
        <div className="text-5xl font-bold text-gray-900 p-4 bg-gray-100 rounded-lg">
          {formatTime(timeLeft)}
        </div>
        <button
          onClick={onBreakComplete}
          className="mt-4 text-sm text-gray-500 hover:text-purple-600"
        >
          Skip Break
        </button>
      </div>
    </div>
  );
};

// --- Main StudyPage Component (UPDATED) ---
const StudyPage: React.FC = () => {
  const { 
    activePlanId, 
    resetMoodEnergy, 
    setActivePlanId, 
    totalTopics,
    setTotalTopics
  } = useMoodContext(); 
  
  const navigate = useNavigate();
  const timerRef = useRef<PomodoroTimerHandle>(null);

  // --- 2. ADD LOGIC TO READ URL PARAMS ---
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const startStep = parseInt(queryParams.get('topic') || '1', 10);
  
  const [session, setSession] = useState<SessionData | null>(null);
  const [currentTopic, setCurrentTopic] = useState<TopicContent | null>(null);
  // --- 3. Initialize currentStep with startStep ---
  const [currentStep, setCurrentStep] = useState(startStep);
  const [isLoading, setIsLoading] = useState(true);
  const [isTopicLoading, setIsTopicLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCumulativeQuiz, setShowCumulativeQuiz] = useState(false);
  const [cumulativeQuizQuestions, setCumulativeQuizQuestions] = useState<QuizQuestion[]>([]);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [quizResult, setQuizResult] = useState<{ passed: boolean; message: string; } | null>(null);
  const [showFinalQuiz, setShowFinalQuiz] = useState(false);
  const [finalQuizQuestions, setFinalQuizQuestions] = useState<QuizQuestion[]>([]);
  const [finalQuizResult, setFinalQuizResult] = useState<{ passed: boolean; message: string; } | null>(null);

  
  useEffect(() => {
    if (!activePlanId) {
      setError('No study plan selected. Please go back and upload a file.');
      setIsLoading(false);
      return;
    }

    const startNewSession = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const sessionResponse = await api.post('/session/start-session', {
          plan_id: activePlanId,
        });
        const sessionData: SessionData = sessionResponse.data;
        setSession(sessionData);

        // --- 4. FETCH THE TOPIC FROM THE URL (startStep) ---
        const topicResponse = await api.get(`/session/session/${sessionData.session_id}/topic/${startStep}`);
        setCurrentTopic(topicResponse.data);
        setCurrentStep(startStep); // Make sure state is correct
        
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to start session.');
      } finally {
        setIsLoading(false);
      }
    };

    startNewSession();
  }, [activePlanId, startStep]); // Add startStep as dependency
  
  // (handleStartFinalQuiz is unchanged)
  const handleStartFinalQuiz = useCallback(async () => {
    if (!session) return;
    try {
      api.post(`/session/session/${session.session_id}/topic/${currentStep}/complete`);
    } catch (err) {
      console.error("Failed to mark final topic complete:", err);
    }
    setIsTopicLoading(true); 
    try {
      const quizResponse = await api.get(`/session/session/${session.session_id}/final-quiz`);
      setFinalQuizQuestions(quizResponse.data.questions);
      setShowFinalQuiz(true); 
    } catch (err: any) {
      setError('Failed to load the final quiz.');
    } finally {
      setIsTopicLoading(false);
    }
  }, [session, currentStep]);

  // (handleNextTopic is unchanged)
  const handleNextTopic = useCallback(async () => {
    if (!session || !totalTopics) { 
        if (!totalTopics) {
          console.error("totalTopics is not set.");
          setError("An error occurred. Please re-upload your file.");
        }
        return; 
    }
    try {
      api.post(`/session/session/${session.session_id}/topic/${currentStep}/complete`);
    } catch (err) {
      console.error("Failed to mark topic complete:", err);
    }
    const nextStep = currentStep + 1;
    if (nextStep > totalTopics) {
      handleStartFinalQuiz();
      return;
    }
    setIsTopicLoading(true);
    try {
      const topicResponse = await api.get(`/session/session/${session.session_id}/topic/${nextStep}`);
      setCurrentTopic(topicResponse.data);
      setCurrentStep(nextStep);
      window.scrollTo(0, 0);
    } catch (err: any) {
      setError("Failed to load the next topic. Please refresh.");
    } finally {
      setIsTopicLoading(false);
    }
  }, [session, currentStep, totalTopics, handleStartFinalQuiz]);

  
  // --- 5. ADD NEW handlePreviousTopic FUNCTION ---
  const handlePreviousTopic = useCallback(async () => {
    if (!session || currentStep <= 1) { 
        return; // Can't go back from topic 1
    }
    
    // NOTE: We DON'T mark topic as complete when going backward
    
    const prevStep = currentStep - 1;

    setIsTopicLoading(true);
    try {
      const topicResponse = await api.get(`/session/session/${session.session_id}/topic/${prevStep}`);
      setCurrentTopic(topicResponse.data);
      setCurrentStep(prevStep);
      window.scrollTo(0, 0);
    } catch (err: any) {
      setError("Failed to load the previous topic. Please refresh.");
    } finally {
      setIsTopicLoading(false);
    }
  }, [session, currentStep]);
  // --- END OF NEW FUNCTION ---


  // (All other functions... handleTimerComplete, processAndSubmitQuiz, etc... are unchanged)
  const handleTimerComplete = useCallback(async () => {
    if (!session || !currentTopic) return;
    try {
      const quizResponse = await api.get(
        `/session/session/${session.session_id}/cumulative-quiz/${currentTopic.step_number}`
      );
      setCumulativeQuizQuestions(quizResponse.data.questions);
      setShowCumulativeQuiz(true); 
    } catch (err: any) {
      setError('Failed to load the cumulative quiz.');
    }
  }, [session, currentTopic]);

  const processAndSubmitQuiz = async (results: QuizResult[]) => {
    if (!session) return { passed: false, message: "No session." };
    const topicScores: { [key: number]: { correct: number, total: number } } = {};
    for (const result of results) {
      const step = result.topic_step;
      if (!topicScores[step]) {
        topicScores[step] = { correct: 0, total: 0 };
      }
      topicScores[step].total++;
      if (result.correct) {
        topicScores[step].correct++;
      }
    }
    const scoresForBackend: { [key: string]: number } = {};
    let totalCorrect = 0;
    let totalQuestions = results.length;
    for (const step in topicScores) {
      const scoreData = topicScores[step];
      scoresForBackend[step] = (scoreData.total > 0) ? (scoreData.correct / scoreData.total) : 0;
      totalCorrect += scoreData.correct;
    }
    const finalOverallScore = totalQuestions > 0 ? (totalCorrect / totalQuestions) : 0;
    try {
      const submitResponse = await api.post(`/session/session/${session.session_id}/submit-final-quiz`, {
        final_score: finalOverallScore,
        topic_scores: scoresForBackend 
      });
      return submitResponse.data;
    } catch (err: any) {
      setError('Failed to submit quiz score.');
      return { passed: false, message: "Failed to submit score." };
    }
  };

  const handleCumulativeQuizComplete = useCallback(async (results: QuizResult[]) => {
    setShowCumulativeQuiz(false);
    const resultData = await processAndSubmitQuiz(results);
    setQuizResult(resultData);
  }, [session]); 

  const handleStartBreak = () => {
    setQuizResult(null);
    setShowBreakModal(true);
  };

  const handleBreakComplete = () => {
    setShowBreakModal(false);
    timerRef.current?.resetTimerAndStart();
    if (!totalTopics) {
      handleNextTopic();
      return;
    }
    if (currentStep < totalTopics) {
      handleNextTopic(); 
    } else {
      handleStartFinalQuiz();
    }
  };

  const handleRecompile = () => {
    setQuizResult(null);
    setFinalQuizResult(null); 
    resetMoodEnergy();
    setActivePlanId(null);
    setTotalTopics(null); 
    navigate('/upload');
  };

  const handleFinalQuizComplete = useCallback(async (results: QuizResult[]) => {
    setShowFinalQuiz(false);
    const resultData = await processAndSubmitQuiz(results);
    setFinalQuizResult(resultData); 
    if (resultData.passed) {
      setTimeout(() => {
        setFinalQuizResult(null);
        resetMoodEnergy();
        setActivePlanId(null);
        setTotalTopics(null);
        navigate('/dashboard');
      }, 3000);
    }
  }, [session, navigate, resetMoodEnergy, setActivePlanId, setTotalTopics]);

  
  // (Loading/Error JSX is unchanged)
  if (isLoading && !currentTopic) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-12 h-12 animate-spin text-purple-600" />
        <p className="ml-4 text-xl text-gray-700">Starting your session...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
        <h1 className="text-3xl font-bold text-red-600 mb-6">{error}</h1>
        <button
          onClick={() => navigate('/upload')}
          className="bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700"
        >
          Back to Upload
        </button>
      </div>
    );
  }
  if (!session || !currentTopic) {
    return <p>Loading...</p>; 
  }

  // (Render JSX is unchanged, but we add the new prop)
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{session.plan_title}</h1>
        <p className="text-gray-600">Focus on your learning with AI-powered assistance and Pomodoro timer</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          {/* --- 6. PASS THE NEW FUNCTION AS A PROP --- */}
          <StudyMaterial
            topic={currentTopic}
            onNextTopic={handleNextTopic} 
            onPreviousTopic={handlePreviousTopic} // <-- ADD THIS
            isLoading={isTopicLoading}
            isLastTopic={currentStep === totalTopics}
            onStartFinalQuiz={handleStartFinalQuiz}
          />
        </div>
        
        <div className="lg:sticky lg:top-24 space-y-8">
          <PomodoroTimer
            ref={timerRef}
            durationInSeconds={session.session_timer_seconds}
            onTimerComplete={handleTimerComplete}
          />
          <Recommendations />
        </div>
      </div>

      {/* (All Modals are unchanged) */}
      {showBreakModal && (
        <BreakModal 
          durationSeconds={300} // 5 minutes
          onBreakComplete={handleBreakComplete}
        />
      )}
      {showCumulativeQuiz && (
        <QuizModal
          questions={cumulativeQuizQuestions} 
          onComplete={handleCumulativeQuizComplete}
          onClose={() => setShowCumulativeQuiz(false)}
        />
      )}
      {quizResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-md">
            {quizResult.passed ? (
              <div className="text-4xl mb-4">🎉</div>
            ) : (
              <div className="text-4xl mb-4">📚</div>
            )}
            <h2 className={`text-2xl font-bold mb-2 ${quizResult.passed ? 'text-green-600' : 'text-orange-600'}`}>
              {quizResult.passed ? 'Great Job!' : 'Keep Studying!'}
            </h2>
            <p className="text-gray-600 mb-6">{quizResult.message}</p>
            <div className="space-y-3">
              <button
                onClick={handleStartBreak}
                className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700"
              >
                Continue to Break
              </button>
              {!quizResult.passed && (
                <button
                  onClick={() => {
                    setQuizResult(null)
                    navigate('/dashboard'); 
                  }}
                  className="w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300"
                >
                  Review Incorrect Topics
                </button>
              )}
              <button
                onClick={handleRecompile}
                className="w-full text-sm text-gray-500 hover:text-red-600"
              >
                Recompile Course (New Vibe)
              </button>
            </div>
          </div>
        </div>
      )}
      {showFinalQuiz && (
        <QuizModal
          questions={finalQuizQuestions} 
          onComplete={handleFinalQuizComplete}
          onClose={() => setShowFinalQuiz(false)}
        />
      )}
      {finalQuizResult && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-8 text-center max-w-md">
            {finalQuizResult.passed ? (
              <>
                <div className="text-4xl mb-4">🏆</div>
                <h2 className="text-2xl font-bold text-green-600 mb-2">Plan Complete!</h2>
                <p className="text-gray-600">{finalQuizResult.message}</p>
                <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
              </>
            ) : (
              <>
                <div className="text-4xl mb-4">📚</div>
                <h2 className="text-2xl font-bold text-orange-600 mb-2">Almost There!</h2>
                <p className="text-gray-600 mb-6">{finalQuizResult.message}</p>

                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setFinalQuizResult(null);
                      navigate('/dashboard');
                    }}
                    className="w-full bg-gray-200 text-gray-800 px-6 py-3 rounded-lg font-semibold hover:bg-gray-300"
                  >
                    Review Course
                  </button>
                  <button
                    onClick={handleRecompile}
                    className="w-full bg-purple-600 text-white px-6 py-3 rounded-lg font-semibold hover:bg-purple-700"
                  >
                    Recompile Course (New Vibe)
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default StudyPage;