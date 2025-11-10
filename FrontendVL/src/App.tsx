import React, { useState, createContext, useContext, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ChatWidget from './components/ChatWidget';
import HomePage from './pages/HomePage';
import Dashboard from './pages/Dashboard';
import UploadPage from './pages/UploadPage';
import StudyPage from './pages/StudyPage';
import ProfilePage from './pages/ProfilePage';
import { LoginModal } from './components/auth/LoginModal';
import { SignUpModal } from './components/auth/SignUpModal';

// --- (Context Type is unchanged) ---
interface MoodContextType {
  mood: string | null;
  energy: string | null;
  setMood: (mood: string) => void;
  setEnergy: (energy: string) => void;
  resetMoodEnergy: () => void;
  activePlanId: number | null;
  setActivePlanId: (id: number | null) => void;
  totalTopics: number | null; 
  setTotalTopics: (count: number | null) => void; 
}

const MoodContext = createContext<MoodContextType | undefined>(undefined);

export const useMoodContext = () => {
  const context = useContext(MoodContext);
  if (!context) {
    throw new Error('useMoodContext must be used within a MoodProvider');
  }
  return context;
};

const ProtectedRoute = ({ isLoggedIn, children }: { isLoggedIn: boolean, children: React.ReactNode }) => {
  if (!isLoggedIn) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
};

function App() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [mood, setMood] = useState<string | null>(null);
  const [energy, setEnergy] = useState<string | null>(null);
  
  // --- 1. THIS IS THE FIX: READ FROM localStorage ---
  // Read the initial state from localStorage when the app loads
  const [activePlanId, setActivePlanIdState] = useState<number | null>(() => {
    const storedPlanId = localStorage.getItem('activePlanId');
    return storedPlanId ? parseInt(storedPlanId, 10) : null;
  });
  const [totalTopics, setTotalTopicsState] = useState<number | null>(() => {
    const storedTotalTopics = localStorage.getItem('totalTopics');
    return storedTotalTopics ? parseInt(storedTotalTopics, 10) : null;
  });

  // --- 2. WRAP THE SETTERS TO SAVE TO localStorage ---
  // Now, when we set the plan ID, it also saves it
  const setActivePlanId = (id: number | null) => {
    if (id) {
      localStorage.setItem('activePlanId', id.toString());
    } else {
      localStorage.removeItem('activePlanId');
    }
    setActivePlanIdState(id);
  };

  // Same for totalTopics
  const setTotalTopics = (count: number | null) => {
    if (count) {
      localStorage.setItem('totalTopics', count.toString());
    } else {
      localStorage.removeItem('totalTopics');
    }
    setTotalTopicsState(count);
  };

  const resetMoodEnergy = () => {
    setMood(null);
    setEnergy(null);
  };

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [isSignUpModalOpen, setIsSignUpModalOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      setIsLoggedIn(true);
    }
  }, []);

  const handleLoginSuccess = (token: string) => {
    localStorage.setItem('accessToken', token);
    setIsLoggedIn(true);
  };

  // --- 3. UPDATE LOGOUT TO CLEAR EVERYTHING ---
  const handleLogout = () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('activePlanId');
    localStorage.removeItem('totalTopics');
    
    setIsLoggedIn(false);
    setActivePlanIdState(null); 
    setTotalTopicsState(null); 
    window.location.href = '/'; 
  };
  
  return (
    <MoodContext.Provider value={{ 
      mood, energy, setMood, setEnergy, resetMoodEnergy,
      activePlanId, setActivePlanId,
      totalTopics, setTotalTopics
    }}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          
          <LoginModal
            isOpen={isLoginModalOpen}
            onClose={() => setIsLoginModalOpen(false)}
            onLoginSuccess={handleLoginSuccess}
            onShowSignUp={() => {
              setIsLoginModalOpen(false);
              setIsSignUpModalOpen(true);
            }}
          />
          <SignUpModal
            isOpen={isSignUpModalOpen}
            onClose={() => setIsSignUpModalOpen(false)}
            onShowLogin={() => {
              setIsSignUpModalOpen(false);
              setIsLoginModalOpen(true);
            }}
          />
          
          <Navbar 
            isLoggedIn={isLoggedIn} 
            onLoginClick={() => setIsLoginModalOpen(true)}
            onSignUpClick={() => setIsSignUpModalOpen(true)}
            onLogoutClick={handleLogout}
          />
          <main>
            <Routes>
              <Route path="/" element={<HomePage />} />
              
              <Route
                path="/dashboard"
                element={<ProtectedRoute isLoggedIn={isLoggedIn}><Dashboard /></ProtectedRoute>}
              />
              <Route
                path="/upload"
                element={<ProtectedRoute isLoggedIn={isLoggedIn}><UploadPage /></ProtectedRoute>}
              />
              <Route
                path="/study"
                element={<ProtectedRoute isLoggedIn={isLoggedIn}><StudyPage /></ProtectedRoute>}
              />
              <Route
                path="/profile"
                element={<ProtectedRoute isLoggedIn={isLoggedIn}><ProfilePage /></ProtectedRoute>}
              />
            </Routes>
          </main>
          <ChatWidget isOpen={isChatOpen} onClose={() => setIsChatOpen(false)} />
        </div>
      </Router>
    </MoodContext.Provider>
  );
}

export default App;