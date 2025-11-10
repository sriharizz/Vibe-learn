import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot } from 'lucide-react';
// --- 1. IMPORT THE NEW STREAMING API ---
import { streamApi } from '../services/api'; 
import ReactMarkdown from 'react-markdown'; // <-- Import ReactMarkdown

interface Message {
  id: string;
  text: string;
  sender: 'user' | 'bot';
  timestamp: Date;
}

interface ChatWidgetProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatWidget: React.FC<ChatWidgetProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      text: "Hi! I'm your AI learning assistant. How can I help you today?",
      sender: 'bot',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // --- 2. THIS IS THE COMPLETELY REBUILT handleSendMessage ---
  const handleSendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputText,
      sender: 'user',
      timestamp: new Date(),
    };

    // Add the user's message
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsTyping(true);

    // Create a placeholder for the bot's streaming response
    const botMessageId = (Date.now() + 1).toString();
    const botMessage: Message = {
      id: botMessageId,
      text: '', // Start with empty text
      sender: 'bot',
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, botMessage]);

    try {
      // --- Use the new streamApi ---
      const response = await streamApi.streamPost('/ask_question', {
        question: inputText,
      });

      // Get the tools to read the stream
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let accumulatedText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) {
          break; // Stream finished
        }
        
        // Decode the chunk of text
        accumulatedText += decoder.decode(value, { stream: true });

        // Update the bot's message text in state
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
      // Update the placeholder with the error message
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
  // --- END OF REBUILT FUNCTION ---

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className="bg-white shadow-2xl rounded-2xl w-80 h-96 flex flex-col border border-gray-200">
        {/* Header (Unchanged) */}
        <div className="bg-purple-600 text-white p-4 rounded-t-2xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-purple-500 rounded-full flex items-center justify-center">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-semibold">AI Assistant</h3>
              <p className="text-xs text-purple-200">Online</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-purple-200 hover:text-white transition-colors duration-200"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-xs px-3 py-2 rounded-2xl ${
                  message.sender === 'user'
                    ? 'bg-purple-600 text-white'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {/* --- 3. THIS IS THE FIX --- */}
                {/* Wrap ReactMarkdown in a div with the prose styles */}
                <div className="prose prose-sm">
                  <ReactMarkdown
                    components={{
                      // This stops <p> tags from adding extra margins
                      p: ({node, ...props}) => <p style={{ marginBottom: 0 }} {...props} />
                    }}
                  >
                    {message.text}
                  </ReactMarkdown>
                </div>
                {/* --- END OF FIX --- */}

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
              <div className="bg-gray-100 text-gray-800 max-w-xs px-3 py-2 rounded-2xl">
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

        {/* Input (Unchanged) */}
        <div className="p-4 border-t border-gray-200">
          <div className="flex space-x-2">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent text-sm"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputText.trim() || isTyping} // <-- Disable button while bot is typing
              className="bg-purple-600 text-white p-2 rounded-lg hover:bg-purple-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChatWidget;