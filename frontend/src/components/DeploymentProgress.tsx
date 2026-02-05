import React from 'react';
import { CheckCircle, Clock, AlertCircle, Loader2, ExternalLink } from 'lucide-react';

interface DeploymentProgressProps {
  phase: 'preparing' | 'uploading' | 'building' | 'verifying' | 'completed' | 'failed';
  progress: number;
  isDeploying: boolean;
  deploymentUrl?: string;
  error?: string;
}

export const DeploymentProgress: React.FC<DeploymentProgressProps> = ({
  phase,
  progress,
  isDeploying,
  deploymentUrl,
  error
}) => {
  const phases = [
    { 
      key: 'preparing', 
      label: 'Preparing', 
      description: 'Setting up deployment configuration and framework detection',
      minProgress: 0 
    },
    { 
      key: 'uploading', 
      label: 'Uploading', 
      description: 'Preparing and uploading files to Vercel',
      minProgress: 25 
    },
    { 
      key: 'building', 
      label: 'Building', 
      description: 'Vercel is building and deploying your application',
      minProgress: 50 
    },
    { 
      key: 'verifying', 
      label: 'Verifying', 
      description: 'Checking deployment accessibility (401 errors are normal)',
      minProgress: 75 
    },
    { 
      key: 'completed', 
      label: 'Completed', 
      description: 'Your app is verified and published to the marketplace!',
      minProgress: 100 
    }
  ];

  const getPhaseStatus = (phaseKey: string) => {
    if (phase === 'failed') return 'failed';
    if (phase === phaseKey) return isDeploying ? 'active' : 'completed';
    
    const currentPhaseIndex = phases.findIndex(p => p.key === phase);
    const phaseIndex = phases.findIndex(p => p.key === phaseKey);
    
    return phaseIndex < currentPhaseIndex ? 'completed' : 'pending';
  };

  const getPhaseIcon = (phaseKey: string) => {
    const status = getPhaseStatus(phaseKey);
    
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'active':
        return <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />;
      case 'failed':
        return <AlertCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getPhaseColor = (phaseKey: string) => {
    const status = getPhaseStatus(phaseKey);
    
    switch (status) {
      case 'completed':
        return 'text-green-700';
      case 'active':
        return 'text-blue-700';
      case 'failed':
        return 'text-red-700';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-gray-900">
            {phase === 'failed' ? 'Deployment Failed' : 
             phase === 'completed' ? 'Deployment Complete!' : 
             'Deploying Your App...'}
          </h3>
          <span className="text-sm font-medium text-gray-600">
            {Math.round(progress)}%
          </span>
        </div>
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-200 rounded-full h-3 mb-4">
          <div 
            className={`h-3 rounded-full transition-all duration-500 ${
              phase === 'failed' ? 'bg-red-500' : 
              phase === 'completed' ? 'bg-green-500' : 
              'bg-blue-500'
            }`}
            style={{ width: `${progress}%` }}
          ></div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center">
              <AlertCircle className="h-4 w-4 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          </div>
        )}

        {/* Success Message with URL */}
        {phase === 'completed' && deploymentUrl && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center mb-1">
                  <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                  <span className="text-sm font-medium text-green-800">
                    Your app is now live!
                  </span>
                </div>
                <p className="text-xs text-green-600">
                  It may take a few minutes for the app to be fully accessible.
                </p>
              </div>
              <a
                href={deploymentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                View App
              </a>
            </div>
          </div>
        )}

        {/* Verification Notice */}
        {phase === 'verifying' && (
          <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center">
              <Loader2 className="h-4 w-4 text-blue-500 mr-2 animate-spin" />
              <div>
                <span className="text-sm font-medium text-blue-800">
                  Verifying deployment...
                </span>
                <p className="text-xs text-blue-600 mt-1">
                  Checking app accessibility. You may see 401 errors initially - this is normal as Vercel processes the deployment.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 401 Error Explanation */}
        {phase === 'verifying' && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="text-sm">
              <div className="font-medium text-yellow-800 mb-1">
                🔐 About 401 Authentication Errors
              </div>
              <div className="text-xs text-yellow-700 space-y-1">
                <div>• 401 errors during verification are completely normal</div>
                <div>• This happens while Vercel configures your app's routing</div>
                <div>• The system will retry and mark as successful once ready</div>
                <div>• Your app is being deployed correctly in the background</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Phase Steps */}
      <div className="space-y-3">
        {phases.map((phaseItem, index) => (
          <div key={phaseItem.key} className="flex items-center">
            <div className="flex-shrink-0 mr-3">
              {getPhaseIcon(phaseItem.key)}
            </div>
            <div className="flex-1">
              <div className={`text-sm font-medium ${getPhaseColor(phaseItem.key)}`}>
                {phaseItem.label}
              </div>
              <div className="text-xs text-gray-500">
                {phaseItem.description}
              </div>
            </div>
            {index < phases.length - 1 && (
              <div className="flex-shrink-0 ml-3">
                <div className={`w-px h-8 ${
                  getPhaseStatus(phaseItem.key) === 'completed' ? 'bg-green-300' : 'bg-gray-300'
                }`}></div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Additional Info */}
      {isDeploying && (
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-xs text-gray-600">
            💡 <strong>Tip:</strong> Deployment typically takes 2-5 minutes. You can close this window and check back later - your deployment will continue in the background.
          </p>
        </div>
      )}
    </div>
  );
};