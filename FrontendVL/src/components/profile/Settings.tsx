import React, { useState } from 'react';
import { Settings as SettingsIcon, Bell, Moon, Globe, Volume2 } from 'lucide-react';

const Settings: React.FC = () => {
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [soundEffects, setSoundEffects] = useState(true);

  const settingItems = [
    {
      icon: Bell,
      title: 'Notifications',
      description: 'Receive study reminders and progress updates',
      enabled: notifications,
      toggle: () => setNotifications(!notifications),
    },
    {
      icon: Moon,
      title: 'Dark Mode',
      description: 'Switch to dark theme for comfortable night studying',
      enabled: darkMode,
      toggle: () => setDarkMode(!darkMode),
    },
    {
      icon: Volume2,
      title: 'Sound Effects',
      description: 'Enable audio feedback for interactions',
      enabled: soundEffects,
      toggle: () => setSoundEffects(!soundEffects),
    },
  ];

  return (
    <div className="bg-white shadow-md rounded-2xl p-6">
      <div className="flex items-center space-x-3 mb-6">
        <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
          <SettingsIcon className="h-5 w-5 text-gray-600" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900">Settings</h2>
      </div>

      <div className="space-y-6">
        {settingItems.map((item, index) => {
          const Icon = item.icon;
          return (
            <div key={index} className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Icon className="h-5 w-5 text-gray-600" />
                <div>
                  <h3 className="font-medium text-gray-900">{item.title}</h3>
                  <p className="text-sm text-gray-600">{item.description}</p>
                </div>
              </div>
              <button
                onClick={item.toggle}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ${
                  item.enabled ? 'bg-purple-600' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                    item.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          );
        })}

        <div className="pt-6 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-4">
            <Globe className="h-5 w-5 text-gray-600" />
            <h3 className="font-medium text-gray-900">Language</h3>
          </div>
          <select className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent">
            <option>English</option>
            <option>Spanish</option>
            <option>French</option>
            <option>German</option>
          </select>
        </div>

        <div className="pt-6 space-y-3">
          <button className="w-full bg-red-600 text-white py-2 rounded-lg hover:bg-red-700 transition-colors duration-200">
            Delete Account
          </button>
          <button className="w-full bg-gray-200 text-gray-700 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200">
            Export Data
          </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;