import React, { useState, useEffect } from 'react';
import { RefreshCw, X } from 'lucide-react';

interface AutoRefreshNoticeProps {
  show: boolean;
  onCancel?: () => void;
}

export const AutoRefreshNotice: React.FC<AutoRefreshNoticeProps> = ({ 
  show, 
  onCancel 
}) => {
  const [countdown, setCountdown] = useState(30);
  const [cancelled, setCancelled] = useState(false);

  useEffect(() => {
    if (!show || cancelled) return;

    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          // Refresh the page when countdown reaches 0
          window.location.reload();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [show, cancelled]);

  useEffect(() => {
    if (show) {
      setCountdown(30);
      setCancelled(false);
    }
  }, [show]);

  const handleCancel = () => {
    setCancelled(true);
    if (onCancel) {
      onCancel();
    }
  };

  if (!show || cancelled) return null;

  return (
    <div className="fixed bottom-4 right-4 bg-blue-600 text-white p-4 rounded-lg shadow-lg z-50 animate-slide-in-right max-w-sm">
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3">
          <RefreshCw className="h-5 w-5 animate-spin" />
          <div>
            <h4 className="text-sm font-medium">Auto-refresh in {countdown}s</h4>
            <p className="text-xs text-blue-100 mt-1">
              Page will refresh to show updated deployment status
            </p>
          </div>
        </div>
        <button
          onClick={handleCancel}
          className="text-blue-200 hover:text-white transition-colors ml-2"
          title="Cancel auto-refresh"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      
      {/* Progress bar */}
      <div className="mt-3 w-full bg-blue-500 rounded-full h-1">
        <div 
          className="bg-white h-1 rounded-full transition-all duration-1000 ease-linear"
          style={{ width: `${((30 - countdown) / 30) * 100}%` }}
        ></div>
      </div>
      
      <div className="mt-2 text-xs text-blue-100">
        Click X to cancel auto-refresh
      </div>
    </div>
  );
};