import React, { useEffect, useRef, useState } from 'react';
import QrScanner from 'qr-scanner';

interface QRScannerProps {
  onScan: (result: string) => void;
  onError?: (error: string) => void;
  isActive: boolean;
}

export const QRScanner: React.FC<QRScannerProps> = ({ onScan, onError, isActive }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const [hasCamera, setHasCamera] = useState(true);

  useEffect(() => {
    if (!videoRef.current) return;

    const scanner = new QrScanner(
      videoRef.current,
      (result) => {
        onScan(result.data);
      },
      {
        onDecodeError: (error) => {
          // Ignore decode errors as they're expected when no QR code is visible
          console.debug('QR decode error:', error);
        },
        highlightScanRegion: true,
        highlightCodeOutline: true,
      }
    );

    scannerRef.current = scanner;

    // Check if camera is available
    QrScanner.hasCamera().then((hasCamera) => {
      setHasCamera(hasCamera);
      if (!hasCamera) {
        onError?.('No camera available');
      }
    });

    return () => {
      scanner.destroy();
    };
  }, [onScan, onError]);

  useEffect(() => {
    if (!scannerRef.current) return;

    if (isActive && hasCamera) {
      scannerRef.current.start().catch((error) => {
        console.error('Failed to start QR scanner:', error);
        onError?.('Failed to access camera');
      });
    } else {
      scannerRef.current.stop();
    }
  }, [isActive, hasCamera, onError]);

  if (!hasCamera) {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-600">Câmera não disponível</p>
        <p className="text-sm text-gray-500 mt-2">
          Por favor, digite o código do aspirador manualmente
        </p>
      </div>
    );
  }

  return (
    <div className="relative">
      <video
        ref={videoRef}
        className="w-full h-64 bg-black rounded-lg object-cover"
        playsInline
      />
      {isActive && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="border-2 border-white rounded-lg w-48 h-48 opacity-50"></div>
        </div>
      )}
    </div>
  );
};