import React, { useState, useEffect, useMemo, forwardRef, useImperativeHandle } from 'react';
import { Play, Pause, RotateCcw, ChevronsRight } from 'lucide-react';

interface PomodoroTimerProps {
  durationInSeconds: number;
  onTimerComplete: () => void;
}

// Define the functions we will expose (the "Handle")
export interface PomodoroTimerHandle {
  resetTimerAndStart: () => void;
}

// (TimerCircle component is unchanged)
const TimerCircle: React.FC<{ progress: number }> = ({ progress }) => {
  const radius = 50;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (progress / 100) * circumference;

  return (
    <svg className="w-52 h-52" viewBox="0 0 120 120">
      <circle
        className="text-gray-200"
        strokeWidth="10"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="60"
        cy="60"
      />
      <circle
        className="text-purple-600"
        strokeWidth="10"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        stroke="currentColor"
        fill="transparent"
        r={radius}
        cx="60"
        cy="60"
        transform="rotate(-90 60 60)"
        style={{ transition: 'stroke-dashoffset 0.5s linear' }}
      />
    </svg>
  );
};

// Wrap the component in forwardRef
const PomodoroTimer = forwardRef<PomodoroTimerHandle, PomodoroTimerProps>(
  ({ durationInSeconds, onTimerComplete }, ref) => { // <-- Get props and ref
  
  const [timeLeft, setTimeLeft] = useState(durationInSeconds);
  const [isActive, setIsActive] = useState(true); // Auto-start

  const initialDuration = useMemo(() => durationInSeconds, [durationInSeconds]);

  useEffect(() => {
    // This effect now only runs once to set the initial time
    setTimeLeft(initialDuration);
    setIsActive(true); 
  }, [initialDuration]); 

  useEffect(() => {
    if (isActive && timeLeft > 0) {
      const timer = setInterval(() => {
        setTimeLeft(t => t - 1);
      }, 1000);
      return () => clearInterval(timer);
    } else if (timeLeft === 0 && isActive) {
      setIsActive(false);
      onTimerComplete();
    }
  }, [isActive, timeLeft, onTimerComplete]);

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  // This function will be called by the parent
  const resetTimerAndStart = () => {
    setTimeLeft(initialDuration);
    setIsActive(true); // Auto-start the timer
  };

  // Expose the function via useImperativeHandle
  useImperativeHandle(ref, () => ({
    resetTimerAndStart() {
      resetTimerAndStart();
    }
  }));

  const handleSkip = () => {
    setIsActive(false);
    setTimeLeft(0);
    onTimerComplete(); 
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progressPercentage = (timeLeft / initialDuration) * 100;

  return (
    <div className="bg-white rounded-2xl shadow-lg p-6 flex flex-col items-center transition-all duration-300 hover:shadow-xl">
      <h3 className="text-xl font-semibold text-gray-700 mb-4">Study Timer</h3>
      
      <div className="relative mb-6">
        <TimerCircle progress={progressPercentage} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-bold text-purple-600 transition-colors duration-300">
            {formatTime(timeLeft)}
          </span>
          <span className="text-sm font-medium text-gray-500">
            {isActive ? 'Focus' : 'Paused'}
          </span>
        </div>
      </div>
      
      <div className="flex space-x-4">
        <button
          onClick={toggleTimer}
          className={`px-6 py-3 rounded-lg flex items-center font-medium text-white transition-all duration-300 transform hover:scale-105 hover:shadow-lg ${
            isActive 
              ? 'bg-yellow-500 hover:bg-yellow-600' 
              : 'bg-green-500 hover:bg-green-600'
          }`}
        >
          {isActive ? <Pause className="mr-2 h-5 w-5" /> : <Play className="mr-2 h-5 w-5" />}
          {isActive ? 'Pause' : 'Start'}
        </button>
        <button
          onClick={resetTimerAndStart} 
          className="px-6 py-3 rounded-lg flex items-center font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
        >
          <RotateCcw className="mr-2 h-5 w-5" />
          Reset
        </button>
        <button
          onClick={handleSkip}
          title="Skip Timer"
          className="p-3 rounded-lg flex items-center justify-center font-medium bg-gray-200 text-gray-700 hover:bg-gray-300 transition-all duration-300 transform hover:scale-105 hover:shadow-lg"
        >
          <ChevronsRight className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}); 

export default PomodoroTimer;