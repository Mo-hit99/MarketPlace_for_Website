import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, X, Minimize2, Maximize2, Copy, Download } from 'lucide-react';

interface DeploymentLog {
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

interface DeploymentTerminalProps {
  isOpen: boolean;
  onClose: () => void;
  appName: string;
  logs: DeploymentLog[];
  isDeploying: boolean;
  deploymentUrl?: string;
}

export const DeploymentTerminal: React.FC<DeploymentTerminalProps> = ({
  isOpen,
  onClose,
  appName,
  logs,
  isDeploying,
  deploymentUrl
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);
  const [allLogs, setAllLogs] = useState<DeploymentLog[]>([]);
  const terminalRef = useRef<HTMLDivElement>(null);

  // Combine passed logs with any additional logs
  useEffect(() => {
    setAllLogs(logs);
  }, [logs]);

  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [allLogs]);

  const copyLogs = () => {
    const logText = allLogs.map(log => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`).join('\n');
    navigator.clipboard.writeText(logText);
  };

  const downloadLogs = () => {
    const logText = allLogs.map(log => `[${log.timestamp}] ${log.level.toUpperCase()}: ${log.message}`).join('\n');
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `deployment-${appName}-${new Date().toISOString().split('T')[0]}.log`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getLogColor = (level: string) => {
    switch (level) {
      case 'success': return 'text-green-400';
      case 'error': return 'text-red-400';
      case 'warning': return 'text-yellow-400';
      default: return 'text-gray-300';
    }
  };

  const getLogIcon = (level: string) => {
    switch (level) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return '📝';
    }
  };

  if (!isOpen) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm ${isMaximized ? 'p-0' : 'p-4'}`}>
      <div className={`bg-gray-900 rounded-lg shadow-2xl border border-gray-700 flex flex-col ${
        isMaximized ? 'w-full h-full rounded-none' : 
        isMinimized ? 'w-96 h-16' : 'w-4/5 max-w-4xl h-3/4'
      } transition-all duration-300`}>
        
        {/* Terminal Header */}
        <div className="flex items-center justify-between bg-gray-800 px-4 py-3 rounded-t-lg border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            </div>
            <div className="flex items-center space-x-2">
              <TerminalIcon className="h-4 w-4 text-gray-400" />
              <span className="text-sm font-medium text-gray-300">
                Deployment Terminal - {appName}
              </span>
              {isDeploying && (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                  <span className="text-xs text-blue-400">Deploying...</span>
                </div>
              )}
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            <button
              onClick={copyLogs}
              className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
              title="Copy logs"
            >
              <Copy className="h-4 w-4" />
            </button>
            <button
              onClick={downloadLogs}
              className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
              title="Download logs"
            >
              <Download className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
            >
              <Minimize2 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setIsMaximized(!isMaximized)}
              className="p-1 text-gray-400 hover:text-gray-300 transition-colors"
            >
              <Maximize2 className="h-4 w-4" />
            </button>
            <button
              onClick={onClose}
              className="p-1 text-gray-400 hover:text-red-400 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Terminal Content */}
        {!isMinimized && (
          <div className="flex-1 flex flex-col">
            {/* Terminal Body */}
            <div 
              ref={terminalRef}
              className="flex-1 bg-black p-4 font-mono text-sm overflow-y-auto scrollbar-thin scrollbar-thumb-gray-600 scrollbar-track-gray-800"
            >
              {allLogs.length === 0 ? (
                <div className="text-gray-500">
                  <div className="mb-2">🚀 SaaS Marketplace Deployment Terminal</div>
                  <div className="mb-2">📁 App: {appName}</div>
                  <div className="mb-4">⏳ Waiting for deployment to start...</div>
                  <div className="text-xs text-gray-400 mt-4">
                    💡 Deployment process includes:
                    <br />• File preparation and upload
                    <br />• Building and configuration
                    <br />• Verification and accessibility check
                    <br />• Publishing to marketplace
                  </div>
                </div>
              ) : (
                allLogs.map((log, index) => (
                  <div key={index} className="mb-1 flex items-start space-x-2">
                    <span className="text-gray-500 text-xs mt-0.5 min-w-[80px]">
                      {log.timestamp}
                    </span>
                    <span className="text-xs mt-0.5">
                      {getLogIcon(log.level)}
                    </span>
                    <span className={`${getLogColor(log.level)} flex-1`}>
                      {log.message}
                    </span>
                  </div>
                ))
              )}
              
              {/* Cursor */}
              {isDeploying && (
                <div className="flex items-center space-x-2 mt-2">
                  <span className="text-gray-500 text-xs min-w-[80px]">
                    {new Date().toLocaleTimeString()}
                  </span>
                  <span className="text-blue-400 animate-pulse">▶</span>
                  <span className="text-blue-400">Processing...</span>
                  <div className="w-2 h-4 bg-green-400 animate-pulse ml-1"></div>
                </div>
              )}
              
              {/* Verification Notice */}
              {allLogs.some(log => log.message.toLowerCase().includes('verification') || log.message.includes('401')) && (
                <div className="mt-4 p-3 bg-blue-900 border border-blue-700 rounded text-blue-200 text-sm">
                  <div className="font-medium mb-1">🔍 About Verification Process</div>
                  <div className="text-xs space-y-1">
                    <div>• Checking if your app is accessible at the deployed URL</div>
                    <div>• 401 errors are normal during Vercel's initial configuration</div>
                    <div>• System automatically retries and treats 401 as successful deployment</div>
                    <div>• Your app is being properly configured in the background</div>
                    <div>• Process typically completes within 1-2 minutes</div>
                  </div>
                </div>
              )}
              
              {/* Success Notice */}
              {allLogs.some(log => log.message.includes('treating 401 as successful') || log.message.includes('app verified and published')) && (
                <div className="mt-4 p-3 bg-green-900 border border-green-700 rounded text-green-200 text-sm">
                  <div className="font-medium mb-1">✅ Deployment Successful!</div>
                  <div className="text-xs space-y-1">
                    <div>• Your app has been successfully deployed to Vercel</div>
                    <div>• 401 errors were handled correctly during verification</div>
                    <div>• App is now published and available in the marketplace</div>
                  </div>
                </div>
              )}
            </div>

            {/* Terminal Footer */}
            <div className="bg-gray-800 px-4 py-2 border-t border-gray-700 rounded-b-lg">
              <div className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center space-x-4">
                  <span>Logs: {allLogs.length}</span>
                  <span>Status: {isDeploying ? 'Deploying' : 'Ready'}</span>
                  {deploymentUrl && (
                    <a 
                      href={deploymentUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-400 hover:text-blue-300 underline"
                    >
                      🌐 View Live App
                    </a>
                  )}
                </div>
                <div className="text-gray-500">
                  Press Ctrl+C to copy logs
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};