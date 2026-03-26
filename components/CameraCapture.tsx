'use client';

import { useEffect, useRef, useState } from 'react';
import { RotateCcw, X } from 'lucide-react';

interface CameraCaptureProps {
  onCapture: (file: File, coords: { latitude: number; longitude: number } | null) => void;
  onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [capturing, setCapturing] = useState(false);

  const startCamera = async (facing: 'environment' | 'user') => {
    // Stop any existing stream
    streamRef.current?.getTracks().forEach((t) => t.stop());
    setReady(false);
    setError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: facing },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch {
      setError('Camera access denied. Please allow camera access and try again.');
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facingMode]);

  const handleCapture = async () => {
    if (!videoRef.current || !ready || capturing) return;
    setCapturing(true);

    // Get geolocation at capture moment
    let coords: { latitude: number; longitude: number } | null = null;
    try {
      await new Promise<void>((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            coords = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
            resolve();
          },
          () => resolve(),
          { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 },
        );
      });
    } catch {
      // non-fatal
    }

    // Draw frame to canvas
    const video = videoRef.current;
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d')!.drawImage(video, 0, 0);

    canvas.toBlob(
      (blob) => {
        if (!blob) { setCapturing(false); return; }
        const file = new File([blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
        streamRef.current?.getTracks().forEach((t) => t.stop());
        onCapture(file, coords);
      },
      'image/jpeg',
      0.88,
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col">
      {/* Video feed */}
      <div className="relative flex-1 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          onCanPlay={() => setReady(true)}
          className="w-full h-full object-cover"
        />

        {/* Overlay grid for composition */}
        {ready && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="w-full h-full grid grid-cols-3 grid-rows-3">
              {Array.from({ length: 9 }).map((_, i) => (
                <div key={i} className="border border-white/10" />
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {!ready && !error && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="absolute inset-0 flex items-center justify-center px-8 text-center">
            <p className="text-white/80 text-sm">{error}</p>
          </div>
        )}

        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 bg-black/50 text-white w-10 h-10 rounded-full flex items-center justify-center"
        >
          <X size={20} />
        </button>

        {/* Flip camera */}
        <button
          onClick={() => setFacingMode((f) => (f === 'environment' ? 'user' : 'environment'))}
          className="absolute top-4 right-4 bg-black/50 text-white w-10 h-10 rounded-full flex items-center justify-center"
        >
          <RotateCcw size={18} />
        </button>
      </div>

      {/* Capture button bar */}
      <div className="bg-black py-8 flex items-center justify-center">
        <button
          onClick={handleCapture}
          disabled={!ready || capturing}
          className="w-18 h-18 rounded-full bg-white disabled:bg-white/40 flex items-center justify-center shadow-lg active:scale-95 transition-transform"
          style={{ width: 72, height: 72 }}
        >
          {capturing ? (
            <div className="w-6 h-6 border-3 border-gray-400 border-t-gray-800 rounded-full animate-spin" style={{ borderWidth: 3 }} />
          ) : (
            <div className="w-14 h-14 rounded-full border-4 border-gray-300 bg-white" />
          )}
        </button>
      </div>
    </div>
  );
}
