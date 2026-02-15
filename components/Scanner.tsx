
import React, { useEffect, useRef, useState } from 'react';

interface ScannerProps {
  onScan: (decodedText: string) => void;
  statusMessage?: string;
}

const Scanner: React.FC<ScannerProps> = ({ onScan, statusMessage }) => {
  const scannerRef = useRef<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [manualId, setManualId] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    // @ts-ignore
    const html5QrCode = new Html5Qrcode("reader");
    scannerRef.current = html5QrCode;

    const config = { fps: 10, qrbox: { width: 250, height: 250 } };

    html5QrCode.start(
      { facingMode: "environment" },
      config,
      (decodedText: string) => {
        onScan(decodedText);
      },
      (errorMessage: string) => {
        // Log is too noisy, ignore standard scan failures
      }
    ).then(() => {
      setIsReady(true);
    }).catch((err: any) => {
      console.error(err);
      setError("Camera access denied or unavailable. Please check permissions.");
    });

    return () => {
      if (scannerRef.current) {
        // Only stop if the scanner was actually started successfully
        if (scannerRef.current.isScanning) {
          scannerRef.current.stop().catch((e: any) => {
            // Silently fail if stop is called on an already stopped instance
          });
        }
      }
    };
  }, [onScan]);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualId.trim()) {
      onScan(manualId.trim());
      setManualId('');
    }
  };

  return (
    <div className="flex flex-col items-center gap-4 w-full max-w-md mx-auto">
      <div id="reader" className="w-full rounded-xl overflow-hidden shadow-lg border-2 border-slate-200 bg-black aspect-square"></div>
      
      {error && (
        <div className="text-red-500 text-sm bg-red-50 p-4 rounded-xl w-full text-center border border-red-100 font-medium">
          <i className="fas fa-exclamation-triangle mr-2"></i> {error}
        </div>
      )}

      {statusMessage && (
        <div className="text-blue-600 font-bold bg-blue-50 px-6 py-3 rounded-2xl animate-pulse shadow-sm border border-blue-100">
          {statusMessage}
        </div>
      )}

      <div className="w-full border-t border-slate-200 pt-6">
        <p className="text-[10px] text-slate-400 mb-3 text-center font-bold uppercase tracking-widest">Manual Entry</p>
        <form onSubmit={handleManualSubmit} className="flex gap-2">
          <input
            type="text"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            placeholder="Enter Member ID"
            className="flex-1 px-4 py-3 bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition"
          />
          <button 
            type="submit"
            className="bg-indigo-600 text-white px-6 py-3 rounded-xl hover:bg-indigo-700 transition font-bold shadow-md shadow-indigo-100"
          >
            Check In
          </button>
        </form>
      </div>
    </div>
  );
};

export default Scanner;
