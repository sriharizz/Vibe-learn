// import React, { useState, useEffect, useRef, useCallback } from 'react';
// import { X, Camera, Loader2 } from 'lucide-react';
// import Webcam from 'react-webcam';
// import { useMoodContext } from '../../App';
// import {
//   FaceLandmarker,
//   FilesetResolver,
//   FaceLandmarkerResult
// } from '@mediapipe/tasks-vision';

// interface VibeCheckModalProps {
//   isOpen: boolean;
//   onClose: () => void;
// }

// // Helper to map face-api.js emotions to our app's "moods"
// const getVibeFromBlendshapes = (blendshapes: any[]): { mood: string, energy: string } => {
//   const smileScore = blendshapes.find(s => s.categoryName === 'mouthSmileLeft')?.score ?? 0;
//   const frownScore = blendshapes.find(s => s.categoryName === 'mouthFrownLeft')?.score ?? 0;
//   const eyeBlinkScore = blendshapes.find(s => s.categoryName === 'eyeBlinkLeft')?.score ?? 0;

//   let detectedMood = 'neutral';
//   let detectedEnergy = 'medium';

//   if (smileScore > 0.5) { 
//     detectedMood = 'happy';
//   } else if (frownScore > 0.5) { 
//     detectedMood = 'low'; 
//   }

//   if (eyeBlinkScore > 0.7) {
//     detectedEnergy = 'low';
//   } else if (smileScore > 0.5) {
//     detectedEnergy = 'high';
//   }

//   return { mood: detectedMood, energy: detectedEnergy };
// };

// export const VibeCheckModal: React.FC<VibeCheckModalProps> = ({ isOpen, onClose }) => {
//   const { setMood, setEnergy } = useMoodContext(); 
//   const [status, setStatus] = useState<'loading' | 'ready' | 'detecting' | 'error'>('loading');
//   const [errorMessage, setErrorMessage] = useState('');
//   const webcamRef = useRef<Webcam>(null);
//   const faceLandmarkerRef = useRef<FaceLandmarker | null>(null);
//   const lastVideoTimeRef = useRef(-1);
//   const requestRef = useRef<number>(0);

//   // 1. Load the new MediaPipe model
//   useEffect(() => {
//     if (isOpen) {
//       const loadModel = async () => {
//         setStatus('loading');
//         try {
//           const filesetResolver = await FilesetResolver.forVisionTasks(
//             "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
//           );
//           const landmarker = await FaceLandmarker.createFromOptions(filesetResolver, {
//             baseOptions: {
//               modelAssetPath: `/models/face_landmarker.task`,
//               delegate: 'GPU',
//             },
//             outputFaceBlendshapes: true,
//             runningMode: 'VIDEO',
//             numFaces: 1,
//           });
//           faceLandmarkerRef.current = landmarker;
//           setStatus('ready');
//         } catch (err: any) {
//           console.error("Failed to load MediaPipe model:", err);
//           setErrorMessage('Could not load AI models. Please use manual selection.');
//           setStatus('error');
//         }
//       };
//       loadModel();
//     }
//   }, [isOpen]);

//   // 2. This function starts the detection loop
//   const predictWebcam = useCallback(() => {
//     if (!faceLandmarkerRef.current) {
//       // Model not loaded yet, just stop
//       return;
//     }

//     // --- THIS IS THE FIX ---
//     // Check if the video is ready and has a valid size
//     if (
//       !webcamRef.current || 
//       !webcamRef.current.video || 
//       webcamRef.current.video.videoWidth === 0 || // Check for 0 width
//       webcamRef.current.video.videoHeight === 0 || // Check for 0 height
//       webcamRef.current.video.readyState < 3      // Check if it has data
//     ) {
//       // Video is not ready, wait for the next frame and try again
//       requestRef.current = requestAnimationFrame(predictWebcam);
//       return;
//     }
//     // --- END OF FIX ---
    
//     const video = webcamRef.current.video;
//     if (video.currentTime !== lastVideoTimeRef.current) {
//       lastVideoTimeRef.current = video.currentTime;
      
//       const results: FaceLandmarkerResult = faceLandmarkerRef.current.detectForVideo(
//         video,
//         performance.now()
//       );

//       if (results.faceBlendshapes && results.faceBlendshapes.length > 0) {
//         const blendshapes = results.faceBlendshapes[0].categories;
//         const { mood, energy } = getVibeFromBlendshapes(blendshapes);

//         setMood(mood);
//         setEnergy(energy); 
//         onClose();
//         return; // Stop the loop, we are done
//       }
//     }
    
//     // Keep looping until we find a face
//     requestRef.current = requestAnimationFrame(predictWebcam);
//   }, [setMood, setEnergy, onClose]); // Removed 'status' as a dependency


//   // 3. This function starts when the camera is ready
//   const handleVideoPlay = () => {
//     if (status === 'ready') {
//       setStatus('detecting');
//       // Start the detection loop
//       requestRef.current = requestAnimationFrame(predictWebcam);
//     }
//   };

//   // Stop the loop when the modal closes
//   useEffect(() => {
//     if (!isOpen) {
//       cancelAnimationFrame(requestRef.current);
//     }
//   }, [isOpen]);

//   if (!isOpen) return null;

//   return (
//     <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
//       <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md relative">
//         <button
//           onClick={onClose}
//           className="absolute top-3 right-3 text-gray-400 hover:text-gray-600"
//         >
//           <X size={24} />
//         </button>
        
//         <h2 className="text-2xl font-bold text-center text-gray-900 mb-4">VibeCheck</h2>
        
//         <div className="w-full aspect-square bg-gray-200 rounded-lg overflow-hidden mb-4">
//           <Webcam
//             ref={webcamRef}
//             audio={false}
//             mirrored={true}
//             className="w-full h-full object-cover"
//             onPlay={handleVideoPlay} // Use onPlay (it's more reliable than onUserMedia)
//             onUserMediaError={(err: any) => { 
//               console.error("Camera Error:", err);
//               setErrorMessage('Camera access denied. Please allow camera permission in your browser.');
//               setStatus('error');
//             }}
//           />
//         </div>

//         {status === 'loading' && (
//           <div className="flex items-center justify-center p-4 text-gray-600">
//             <Loader2 className="animate-spin mr-2" />
//             <span>Loading AI Model...</span>
//           </div>
//         )}

//         {status === 'ready' && (
//            <div className="flex items-center justify-center p-4 text-purple-600">
//             <Camera className="mr-2" />
//             <span>Warming up camera...</span>
//           </div>
//         )}
        
//         {status === 'detecting' && (
//            <div className="flex items-center justify-center p-4 text-purple-600">
//             <Loader2 className="animate-spin mr-2" />
//             <span>Scanning for vibe...</span>
//           </div>
//         )}

//         {status === 'error' && (
//           <p className="text-center text-red-600 mb-4">{errorMessage}</p>
//         )}
//       </div>
//    </div>
//   );
// };