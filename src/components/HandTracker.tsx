import { Hands, Results } from '@mediapipe/hands';
import { Camera } from '@mediapipe/camera_utils';
import React, { useEffect, useRef, useState } from 'react';

interface HandTrackerProps {
  onResults: (results: Results) => void;
  isReady: (ready: boolean) => void;
}

export const HandTracker: React.FC<HandTrackerProps> = ({ onResults, isReady }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;

    const hands = new Hands({
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

    const camera = new Camera(videoRef.current, {
      onFrame: async () => {
        if (videoRef.current) {
          await hands.send({ image: videoRef.current });
        }
      },
      width: 640,
      height: 480,
    });

    camera.start()
      .then(() => isReady(true))
      .catch((err) => {
        console.error('Camera error:', err);
        setError('Failed to access camera. Please ensure permissions are granted.');
      });

    return () => {
      camera.stop();
      hands.close();
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
