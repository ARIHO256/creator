import React, { useRef, useState, useEffect } from 'react';
import { X, Camera, RefreshCcw } from 'lucide-react';

interface CameraModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCapture: (file: File) => void;
}

const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState<string | null>(null);

    const startCamera = React.useCallback(async () => {
        setError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: 'user' }
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            console.error("Error accessing camera:", err);
            setError("Could not access camera. Please allow camera permissions.");
        }
    }, [videoRef]);

    const stopCamera = React.useCallback(() => {
        if (stream) {
            stream.getTracks().forEach(track => track.stop());
            setStream(null);
        }
    }, [stream]);

    useEffect(() => {
        if (isOpen) {
            startCamera();
        } else {
            stopCamera();
        }
        return () => {
            stopCamera();
        };
    }, [isOpen, startCamera, stopCamera]);

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            // Set canvas dimensions to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const context = canvas.getContext('2d');
            if (context) {
                // Draw video frame to canvas
                context.drawImage(video, 0, 0, canvas.width, canvas.height);

                // Convert to blob/file
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], "camera-capture.png", { type: "image/png" });
                        onCapture(file);
                        onClose();
                    }
                }, 'image/png');
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">

                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-zinc-200 dark:border-zinc-800">
                    <h3 className="text-lg font-semibold text-zinc-900 dark:text-white flex items-center gap-2">
                        <Camera className="w-5 h-5" />
                        Take Photo
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                    >
                        <X className="w-5 h-5 text-zinc-500" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-4 flex flex-col items-center gap-4 bg-black">
                    {error ? (
                        <div className="text-red-500 text-center p-8 bg-zinc-900 rounded-lg w-full">
                            <p>{error}</p>
                            <button
                                onClick={startCamera}
                                className="mt-4 px-4 py-2 bg-zinc-800 text-white rounded-lg hover:bg-zinc-700 flex items-center gap-2 mx-auto"
                            >
                                <RefreshCcw className="w-4 h-4" /> Try Again
                            </button>
                        </div>
                    ) : (
                        <div className="relative w-full aspect-[3/4] bg-zinc-900 rounded-lg overflow-hidden">
                            {/* Video Element */}
                            <video
                                ref={videoRef}
                                autoPlay
                                playsInline
                                muted
                                className="w-full h-full object-cover transform scale-x-[-1]" // Mirror effect
                            />
                            {!stream && (
                                <div className="absolute inset-0 flex items-center justify-center text-zinc-500">
                                    Loading camera...
                                </div>
                            )}
                        </div>
                    )}

                    <canvas ref={canvasRef} className="hidden" />
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-zinc-200 dark:border-zinc-800 flex justify-center bg-white dark:bg-zinc-900">
                    <button
                        onClick={handleCapture}
                        disabled={!stream || !!error}
                        className="w-16 h-16 rounded-full border-4 border-orange-500 flex items-center justify-center hover:bg-orange-50 dark:hover:bg-orange-950/30 transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
                    >
                        <div className="w-12 h-12 bg-orange-500 rounded-full group-hover:scale-90 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CameraModal;
