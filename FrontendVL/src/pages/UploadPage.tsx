import React, { useState, useRef, useEffect } from 'react';
import { 
  Send, Paperclip, FileText, Image, Video, 
  CheckCircle, AlertCircle, Loader2 
  // 1. Removed 'Camera' from this import
} from 'lucide-react';
import { useMoodContext } from '../App';
import api, { streamApi } from '../services/api'; 
import { useNavigate } from 'react-router-dom';
// 2. Removed 'VibeCheckModal' import
import ReactMarkdown from 'react-markdown';

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
  file?: {
    name: string;
    type: string;
    size: string;
  };
}

interface PlanPreviewResponse {
  plan_id: number;
  plan_title: string;
  topics: {
    step_number: number;
    topic_title: string;
  }[];
}


const UploadPage: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your AI learning assistant. Please set your mood, then upload a file or ask me a question.",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(true); 
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const { mood, energy, setMood, setEnergy, setActivePlanId, setTotalTopics } = useMoodContext();
  const navigate = useNavigate();

  const [plan, setPlan] = useState<PlanPreviewResponse | null>(null);
  const [pageStatus, setPageStatus] = useState<'success' | 'error' | 'loading' | null>(null);
  const [statusMessage, setStatusMessage] = useState('');
  
  // 3. Removed 'isVibeCheckOpen' state

  // --- THIS IS THE UPDATED MOODS ARRAY ---
  const moods = [
    { icon: '🎯', label: 'Focused', value: 'focused', color: 'text-blue-600 bg-blue-100' },
    { icon: '😐', label: 'Neutral', value: 'neutral', color: 'text-yellow-600 bg-yellow-100' },
    { icon: '😫', label: 'Stressed', value: 'stressed', color: 'text-red-600 bg-red-100' },
  ];
  // --- END OF UPDATE ---

  const energyLevels = [
    { icon: '⚡', label: 'High Energy', value: 'high', color: 'text-orange-600 bg-orange-100' },
    { icon: '☕', label: 'Medium Energy', value: 'medium', color: 'text-blue-600 bg-blue-100' },
    { icon: '😴', label: 'Low Energy', value: 'low', color: 'text-gray-600 bg-gray-100' },
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = { 
      id: Date.now().toString(), 
      text: inputText, 
      sender: 'user', 
      timestamp: new Date() 
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    const botMessageId = (Date.now() + 1).toString();
    const botMessage: Message = {
      id: botMessageId,
      text: '',
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, botMessage]);

    try {
      const response = await streamApi.streamPost('/ask_question', {
        question: inputText,
      });

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break;
        }
        
        accumulatedText += decoder.decode(value, { stream: true });

        setMessages(prev =>
          prev.map(msg =>
            msg.id === botMessageId
              ? { ...msg, text: accumulatedText }
              : msg
          )
        );
      }
    } catch (err: any) {
      const errorText = err.message || "Sorry, I couldn't connect to the server.";
      setMessages(prev =>
        prev.map(msg =>
          msg.id === botMessageId
            ? { ...msg, text: errorText }
            : msg
        )
      );
    } finally {
      setIsTyping(false);
    }
  };


  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const file = files[0];
    if (!mood || !energy) {
      setShowMoodSelector(true);
      return;
    }
    setPlan(null);
    setPageStatus('loading');
    setStatusMessage('Setting your vibe...');
    const fileMessage: Message = {
      id: Date.now().toString(),
      text: `Uploading: ${file.name}`,
      sender: 'user',
      timestamp: new Date(),
      file: { name: file.name, type: file.type, size: formatFileSize(file.size) },
    };
    setMessages(prev => [...prev, fileMessage]);

    try {
      await api.post('/update-mood', { mood, energy });
      setStatusMessage('Vibe set. Uploading file & generating plan...');
      
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/upload-pdf', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      
      const data = response.data;

      if (data.plan_preview && data.plan_preview.plan_id) {
        setPageStatus('success');
        setStatusMessage(data.message || 'Plan generated!');
        
        const preview: PlanPreviewResponse = data.plan_preview;
        setPlan(preview);
        
        setActivePlanId(preview.plan_id);
        setTotalTopics(preview.topics.length); // Save the total topic count
        
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: `Great! I've analyzed your file. Here's the plan I generated:`,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);
      } else {
        const errorText = data.detail || "File uploaded, but AI plan generation failed.";
        setPageStatus('error');
        setStatusMessage(errorText);
        const botResponse: Message = {
          id: (Date.now() + 1).toString(),
          text: `Sorry, I had an error: ${errorText}`,
          sender: 'bot',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, botResponse]);
      }
    } catch (err: any) {
      const errorText = err.response?.data?.detail || 'An error occurred during upload.';
      setPageStatus('error');
      setStatusMessage(errorText);
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: `Sorry, I had an error: ${errorText}`,
        sender: 'bot',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, botResponse]);
    }
  };

  const startStudySession = () => {
    navigate(`/study`); // Just navigate
  };
  
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-4 w-4 text-red-600" />;
    if (type.includes('image')) return <Image className="h-4 w-4 text-green-600" />;
    if (type.includes('video')) return <Video className="h-4 w-4 text-blue-600" />;
    return <FileText className="h-4 w-4 text-gray-600" />;
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* 4. Removed 'VibeCheckModal' component */}

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 h-screen flex flex-col">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">AI Chat & Upload</h1>
          <p className="text-gray-600">
            Set your vibe, then chat or upload materials to generate a study plan.
          </p>
        </div>

        {showMoodSelector && (
          <div className="bg-white shadow-md rounded-2xl p-6 border-2 border-purple-200 mb-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Set Your Current State</h2>
              <p className="text-sm text-purple-600 font-medium">Required for file uploads</p>
            </div>
            
            <div className="grid grid-cols-2 gap-6">
              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Mood</h3>
                <div className="space-y-2">
                  {moods.map((moodOption) => (
                    <button
                      key={moodOption.value}
                      onClick={() => setMood(moodOption.value)}
                      className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                        mood === moodOption.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{moodOption.icon}</span>
                      <span className="font-medium text-gray-700">{moodOption.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-sm font-medium text-gray-700 mb-3">Energy Level</h3>
                <div className="space-y-2">
                  {energyLevels.map((energyOption) => (
                    <button
                      key={energyOption.value}
                      onClick={() => setEnergy(energyOption.value)}
                      className={`w-full p-3 rounded-lg border-2 transition-all duration-200 flex items-center space-x-3 ${
                        energy === energyOption.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <span className="text-2xl">{energyOption.icon}</span>
                      <span className="font-medium text-gray-700">{energyOption.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
            
            {/* 5. Removed the 'VibeCheck (Detect with Camera)' button and its containing div */}


            {mood && energy && (
              <div className="mt-4 bg-purple-50 p-4 rounded-xl">
                <p className="text-purple-800 font-medium">
                  Perfect! You're feeling {mood} with {energy} energy.
                </p>
                <button
                  onClick={() => setShowMoodSelector(false)}
                  className="mt-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200 text-sm font-medium"
                >
                  Continue
                </button>
              </div>
            )}
          </div>
        )}
        
        <div className="flex-1 bg-white shadow-md rounded-2xl p-6 mb-6 flex flex-col">
          {/* Chat Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 mb-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div className={`max-w-xs lg:max-w-md px-4 py-3 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {message.file && (
                    <div className="flex items-center space-x-2 mb-2 p-2 bg-white bg-opacity-20 rounded-lg">
                      {getFileIcon(message.file.type)}
                      <div className="text-xs">
                        <p className="font-medium">{message.file.name}</p>
                        <p className="opacity-75">{message.file.size}</p>
                      </div>
                    </div>
                  )}
                  
                  <div className="prose prose-sm">
                    <ReactMarkdown
                      components={{
                        p: ({node, ...props}) => <p style={{ marginBottom: 0 }} {...props} />
                      }}
                    >
                      {message.text}
                    </ReactMarkdown>
                  </div>
                  
                  <p className={`text-xs mt-1 ${
                    message.sender === 'user' ? 'text-purple-200' : 'text-gray-500'
                  }`}>
                    {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="flex justify-start">
                <div className="bg-gray-100 text-gray-800 max-w-xs px-4 py-3 rounded-2xl">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          {/* Chat Input */}
          <div className="border-t border-gray-200 pt-4">
            <div className="flex items-center space-x-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={!mood || !energy}
                className="p-2 text-gray-500 hover:text-purple-600 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title={!mood || !energy ? "Set mood and energy first" : "Upload file"}
              >
                <Paperclip className="h-5 w-5" />
              </button>
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                onChange={(e) => handleFileUpload(e.target.files)}
                accept=".pdf"
              />
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Type your message..."
                className="flex-1 px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                className="bg-purple-600 text-white p-3 rounded-xl hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
        {/* Plan Preview Section */}
        {pageStatus && pageStatus !== 'success' && (
          <div className={`p-4 rounded-lg flex items-center ${
            pageStatus === 'error' ? 'bg-red-100 text-red-800' :
            'bg-blue-100 text-blue-800'
          }`}>
            {pageStatus === 'error' && <AlertCircle className="mr-3 flex-shrink-0" />}
            {pageStatus === 'loading' && <Loader2 className="animate-spin mr-3 flex-shrink-0" />}
            <span className="font-medium">{statusMessage}</span>
          </div>
        )}
        {pageStatus === 'success' && plan && (
          <div className="bg-white p-6 rounded-lg shadow-lg mt-8">
            <div className="flex items-center text-green-600 mb-4">
              <CheckCircle className="mr-3 flex-shrink-0" />
              <h3 className="text-xl font-bold">{statusMessage}</h3>
            </div>
            <h4 className="text-lg font-semibold text-purple-700 mb-2">{plan.plan_title}</h4>
            <p className="text-gray-600 mb-4">This plan has <span className="font-bold">{plan.topics.length}</span> topics.</p>
            <div className="space-y-2 mb-6">
              {plan.topics.slice(0, 5).map((topic) => ( 
                <div key={topic.step_number} className="p-3 bg-gray-50 rounded-lg">
                  <h5 className="font-semibold text-gray-700">{topic.step_number}. {topic.topic_title}</h5>
                </div>
              ))}
            </div>
            <button
              onClick={startStudySession}
              className="w-full bg-green-600 text-white py-3 px-6 rounded-lg font-semibold hover:bg-green-700 transition-colors duration-200"
            >
              Start Study Session
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default UploadPage;