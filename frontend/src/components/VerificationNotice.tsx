import React from 'react';
import { Info, CheckCircle, AlertTriangle } from 'lucide-react';

interface VerificationNoticeProps {
  show: boolean;
  phase: 'starting' | 'checking' | 'retrying' | 'success';
  appUrl?: string;
}

export const VerificationNotice: React.FC<VerificationNoticeProps> = ({ 
  show, 
  phase, 
  appUrl 
}) => {
  if (!show) return null;

  const getContent = () => {
    switch (phase) {
      case 'starting':
        return {
          icon: <Info className="h-5 w-5 text-blue-500" />,
          title: 'Starting Verification',
          message: 'Checking if your deployed app is accessible...',
          bgColor: 'bg-blue-50',
          borderColor: 'border-blue-200',
          textColor: 'text-blue-800'
        };
      
      case 'checking':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          title: 'Verification in Progress',
          message: 'Getting 401 errors - this is normal during Vercel configuration. Retrying...',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800'
        };
      
      case 'retrying':
        return {
          icon: <AlertTriangle className="h-5 w-5 text-yellow-500" />,
          title: 'Retrying Verification',
          message: 'Still getting 401 errors. This is expected - Vercel is still configuring your app.',
          bgColor: 'bg-yellow-50',
          borderColor: 'border-yellow-200',
          textColor: 'text-yellow-800'
        };
      
      case 'success':
        return {
          icon: <CheckCircle className="h-5 w-5 text-green-500" />,
          title: 'Verification Complete!',
          message: 'Your app has been successfully verified and published to the marketplace.',
          bgColor: 'bg-green-50',
          borderColor: 'border-green-200',
          textColor: 'text-green-800'
        };
      
      default:
        return null;
    }
  };

  const content = getContent();
  if (!content) return null;

  return (
    <div className={`fixed top-4 right-4 max-w-sm p-4 rounded-lg border ${content.bgColor} ${content.borderColor} shadow-lg z-50 animate-slide-in-right`}>
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          {content.icon}
        </div>
        <div className="flex-1">
          <h4 className={`text-sm font-medium ${content.textColor}`}>
            {content.title}
          </h4>
          <p className={`text-xs mt-1 ${content.textColor} opacity-90`}>
            {content.message}
          </p>
          
          {phase === 'checking' || phase === 'retrying' ? (
            <div className={`text-xs mt-2 ${content.textColor} opacity-75`}>
              <div>💡 <strong>Why 401 errors?</strong></div>
              <div>• Vercel is still setting up routing</div>
              <div>• This is completely normal</div>
              <div>• Your app will be accessible soon</div>
            </div>
          ) : null}
          
          {appUrl && phase === 'success' && (
            <a
              href={appUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block mt-2 text-xs text-green-700 hover:text-green-900 underline"
            >
              View your live app →
            </a>
          )}
        </div>
      </div>
    </div>
  );
};