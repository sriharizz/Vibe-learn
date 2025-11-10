import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { BookOpen, LogIn, LogOut, User, UserPlus } from 'lucide-react'; // <-- Imported UserPlus

// --- INTERFACE UPDATED ---
interface NavbarProps {
  isLoggedIn: boolean;
  onLoginClick: () => void;
  onSignUpClick: () => void;
  onLogoutClick: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isLoggedIn, onLoginClick, onSignUpClick, onLogoutClick }) => {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  // Updated navLinks, conditionally showing auth-required links
  const navLinks = [
    { name: 'Home', path: '/', authRequired: false },
    { name: 'Dashboard', path: '/dashboard', authRequired: true },
    { name: 'Upload', path: '/upload', authRequired: true },
    { name: 'Study', path: '/study', authRequired: true },
    { name: 'Profile', path: '/profile', authRequired: true },
  ];

  // Only show links that don't require auth, OR if the user is logged in
  const visibleLinks = navLinks.filter(link => !link.authRequired || isLoggedIn);

  return (
    <nav className="bg-white shadow-lg sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex items-center space-x-2">
              <BookOpen className="h-8 w-8 text-purple-600" />
              <span className="text-xl font-bold text-gray-900">VibeLearn</span>
            </Link>
          </div>

          {/* --- NAVBAR LINKS UPDATED TO BE DYNAMIC --- */}
          <div className="hidden md:flex items-center space-x-8">
            {visibleLinks.map((link) => (
              <Link
                key={link.name}
                to={link.path}
                className={`px-3 py-2 rounded-md text-sm font-medium transition-colors duration-200 ${
                  isActive(link.path)
                    ? 'text-purple-600 bg-purple-50'
                    : 'text-gray-700 hover:text-purple-600 hover:bg-purple-50'
                }`}
              >
                {/* Your original logic for the Chat link name */}
                {link.name === 'Upload' ? 'Chat' : link.name}
              </Link>
            ))}
          </div>

          {/* --- AUTH SECTION UPDATED --- */}
          <div className="flex items-center space-x-4">
            {isLoggedIn ? (
              // --- LOGGED IN STATE ---
              <div className="flex items-center space-x-3">
                <Link to="/profile" className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center">
                  <User className="h-4 w-4 text-white" />
                </Link>
                <button
                  onClick={onLogoutClick} // <-- Connects to App.tsx
                  className="flex items-center space-x-2 px-4 py-2 text-gray-700 hover:text-purple-600 transition-colors duration-200"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="hidden sm:block">Logout</span>
                </button>
              </div>
            ) : (
              // --- LOGGED OUT STATE (with Sign Up added) ---
              <div className="flex items-center space-x-2">
                <button
                  onClick={onSignUpClick} // <-- Connects to App.tsx
                  className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-700 hover:text-purple-600"
                >
                  <UserPlus className="h-4 w-4" />
                  <span>Sign Up</span>
                </button>
                <button
                  onClick={onLoginClick} // <-- Connects to App.tsx
                  className="flex items-center space-x-2 bg-purple-600 text-white px-6 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200"
                >
                  <LogIn className="h-4 w-4" />
                  <span>Login</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;