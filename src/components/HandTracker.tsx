import * as HandsNS from '@mediapipe/hands';
import * as CameraNS from '@mediapipe/camera_utils';
import React, { useEffect, useRef, useState } from 'react';

// Defensive imports for MediaPipe in Vite
const Hands = (HandsNS as any).Hands || (HandsNS as any).default?.Hands || (HandsNS as any).default;
const Camera = (CameraNS as any).Camera || (CameraNS as any).default?.Camera || (CameraNS as any).default;

interface HandTrackerProps {
  onResults: (results: Results) => void;
  isReady: (ready: boolean) => void;
}

export const HandTracker: React.FC<HandTrackerProps> = ({ onResults, isReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);

  useEffect(() => {
    let camera: Camera | null = null;
    let hands: Hands | null = null;

    const init = async () => {
      try {
        if (!videoRef.current) return;

        hands = new Hands({
          locateFile: (file) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 2,
          modelComplexity: 1,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5,
        });

        hands.onResults((results) => {
          onResults(results);
        });

        camera = new Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && hands) {
              await hands.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        await camera.start();
        isReady(true);
        setIsInitializing(false);
      } catch (err) {
        console.error('HandTracker initialization error:', err);
        setError('Failed to initialize hand tracking. Please check camera permissions.');
        setIsInitializing(false);
      }
    };

    init();

    return () => {
      if (camera) camera.stop();
      if (hands) hands.close();
    };
  }, [onResults, isReady]);

  return (
    <div className="fixed bottom-4 right-4 w-48 h-36 border-2 border-white/20 rounded-lg overflow-hidden bg-black/50 backdrop-blur-sm z-50">
      <video
        ref={videoRef}
        className="w-full h-full object-cover scale-x-[-1]"
        playsInline
        muted
      />
      {isInitializing && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 p-2 text-[10px] text-white text-center">
          Initializing...
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-500/80 p-2 text-[10px] text-white text-center">
          {error}
        </div>
      )}
      <div className="absolute top-1 left-1 px-1 bg-black/50 rounded text-[8px] text-white uppercase tracking-widest">
        Live Feed
      </div>
    </div>
  );
};
