import React, { useState, useRef } from 'react';
import { Upload, FileText, Image, Video, X, CheckCircle, Smile, Meh, Frown, Zap, Coffee } from 'lucide-react';
import { useMoodContext } from '../../App';

interface UploadedFile {
  name: string;
  size: string;
  type: string;
  status: 'uploading' | 'complete' | 'error';
}

const FileUpload: React.FC = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [showMoodSelector, setShowMoodSelector] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { mood, energy, setMood, setEnergy } = useMoodContext();

  const moods = [
    { icon: Smile, label: 'Happy', value: 'happy', color: 'text-green-600 bg-green-100' },
    { icon: Meh, label: 'Neutral', value: 'neutral', color: 'text-yellow-600 bg-yellow-100' },
    { icon: Frown, label: 'Low', value: 'low', color: 'text-red-600 bg-red-100' },
  ];

  const energyLevels = [
    { icon: Zap, label: 'High Energy', value: 'high', color: 'text-orange-600 bg-orange-100' },
    { icon: Coffee, label: 'Medium Energy', value: 'medium', color: 'text-blue-600 bg-blue-100' },
    { icon: Meh, label: 'Low Energy', value: 'low', color: 'text-gray-600 bg-gray-100' },
  ];

  const handleFileSelect = (files: FileList | null) => {
    if (!mood || !energy) {
      setShowMoodSelector(true);
      return;
    }

    if (!files) return;

    const newFiles = Array.from(files).map(file => ({
      name: file.name,
      size: formatFileSize(file.size),
      type: file.type,
      status: 'uploading' as const,
    }));

    setUploadedFiles(prev => [...prev, ...newFiles]);

    // Simulate upload process
    newFiles.forEach((_, index) => {
      setTimeout(() => {
        setUploadedFiles(prev => 
          prev.map((file, i) => 
            i === prev.length - newFiles.length + index 
              ? { ...file, status: 'complete' }
              : file
          )
        );
      }, 2000 + index * 500);
    });
  };

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return <FileText className="h-8 w-8 text-red-600" />;
    if (type.includes('image')) return <Image className="h-8 w-8 text-green-600" />;
    if (type.includes('video')) return <Video className="h-8 w-8 text-blue-600" />;
    return <FileText className="h-8 w-8 text-gray-600" />;
  };

  const removeFile = (index: number) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-6">
      {/* Mood and Energy Selector */}
      {(!mood || !energy || showMoodSelector) && (
        <div className="bg-white shadow-md rounded-2xl p-6 border-2 border-purple-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900">How are you feeling today?</h2>
            <p className="text-sm text-purple-600 font-medium">Required before upload</p>
          </div>
          
          <div className="space-y-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Mood</h3>
              <div className="grid grid-cols-3 gap-3">
                {moods.map((moodOption) => {
                  const Icon = moodOption.icon;
                  return (
                    <button
                      key={moodOption.value}
                      onClick={() => setMood(moodOption.value)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        mood === moodOption.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-lg ${moodOption.color} flex items-center justify-center mx-auto mb-2`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">{moodOption.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-3">Energy Level</h3>
              <div className="grid grid-cols-3 gap-3">
                {energyLevels.map((energyOption) => {
                  const Icon = energyOption.icon;
                  return (
                    <button
                      key={energyOption.value}
                      onClick={() => setEnergy(energyOption.value)}
                      className={`p-4 rounded-xl border-2 transition-all duration-200 ${
                        energy === energyOption.value
                          ? 'border-purple-500 bg-purple-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <div className={`w-12 h-12 rounded-lg ${energyOption.color} flex items-center justify-center mx-auto mb-2`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <p className="text-sm font-medium text-gray-700">{energyOption.label}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            {mood && energy && (
              <div className="bg-purple-50 p-4 rounded-xl">
                <p className="text-purple-800 font-medium mb-2">
                  Perfect! You're feeling {mood} with {energy} energy.
                </p>
                <p className="text-purple-700 text-sm">
                  Now you can upload your study materials and I'll personalize the analysis based on your current state.
                </p>
                <button
                  onClick={() => setShowMoodSelector(false)}
                  className="mt-3 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 transition-colors duration-200 text-sm font-medium"
                >
                  Continue to Upload
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <div
        className={`border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-200 ${
          !mood || !energy
            ? 'border-gray-200 bg-gray-50 opacity-50 cursor-not-allowed'
            : 
          isDragging
            ? 'border-purple-500 bg-purple-50'
            : 'border-gray-300 hover:border-gray-400'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          handleFileSelect(e.dataTransfer.files);
        }}
      >
        <Upload className={`h-16 w-16 mx-auto mb-4 ${
          !mood || !energy
            ? 'text-gray-300'
            :
          isDragging ? 'text-purple-600' : 'text-gray-400'
        }`} />
        <h3 className="text-xl font-semibold text-gray-900 mb-2">
          {!mood || !energy ? 'Please set your mood and energy first' : 'Drop your files here'}
        </h3>
        <p className="text-gray-600 mb-6">
          {!mood || !energy 
            ? 'We need to know how you\'re feeling to personalize your learning experience'
            : 'Supports PDF, images, videos, and text documents up to 100MB'
          }
        </p>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={!mood || !energy}
          className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Browse Files
        </button>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleFileSelect(e.target.files)}
          accept=".pdf,.doc,.docx,.txt,.jpg,.jpeg,.png,.gif,.mp4,.mov,.avi"
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="bg-white shadow-md rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Uploaded Files ({uploadedFiles.length})
          </h3>
          <div className="space-y-3">
            {uploadedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border border-gray-200 rounded-xl"
              >
                <div className="flex items-center space-x-3">
                  {getFileIcon(file.type)}
                  <div>
                    <p className="font-medium text-gray-900">{file.name}</p>
                    <p className="text-sm text-gray-500">{file.size}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-3">
                  {file.status === 'uploading' && (
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
                  )}
                  {file.status === 'complete' && (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  )}
                  <button
                    onClick={() => removeFile(index)}
                    className="text-gray-400 hover:text-red-600 transition-colors duration-200"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default FileUpload;