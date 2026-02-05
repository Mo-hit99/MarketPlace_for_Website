import { useState, useCallback, useRef, useEffect } from 'react';
import api from '../services/api';

interface DeploymentLog {
  timestamp: string;
  level: 'info' | 'success' | 'error' | 'warning';
  message: string;
}

interface DeploymentState {
  isDeploying: boolean;
  logs: DeploymentLog[];
  deploymentUrl?: string;
  error?: string;
  deploymentPhase: 'preparing' | 'uploading' | 'building' | 'verifying' | 'completed' | 'failed';
  progress: number;
  verificationPhase?: 'starting' | 'checking' | 'retrying' | 'success';
}

export const useDeployment = () => {
  const [state, setState] = useState<DeploymentState>({
    isDeploying: false,
    logs: [],
    deploymentPhase: 'preparing',
    progress: 0,
  });

  const logsRef = useRef<DeploymentLog[]>([]);
  const pollingRef = useRef<number | null>(null);
  const currentAppIdRef = useRef<number | null>(null);

  const addLog = useCallback((level: DeploymentLog['level'], message: string) => {
    const newLog: DeploymentLog = {
      timestamp: new Date().toLocaleTimeString(),
      level,
      message,
    };
    
    logsRef.current = [...logsRef.current, newLog];
    setState(prev => ({
      ...prev,
      logs: logsRef.current,
    }));
  }, []);

  const updateProgress = useCallback((phase: DeploymentState['deploymentPhase'], progress: number) => {
    setState(prev => ({
      ...prev,
      deploymentPhase: phase,
      progress: Math.min(100, Math.max(0, progress)),
    }));
  }, []);

  const clearLogs = useCallback(() => {
    logsRef.current = [];
    setState(prev => ({
      ...prev,
      logs: [],
      deploymentUrl: undefined,
      error: undefined,
      deploymentPhase: 'preparing',
      progress: 0,
    }));
  }, []);

  const pollDeploymentLogs = useCallback(async (appId: number) => {
    try {
      const response = await api.get(`/deployments/${appId}/logs`);
      const { logs, status, is_deploying } = response.data;
      
      // Update logs if they've changed
      if (logs && logs.length > 0) {
        logsRef.current = logs;
        
        // Determine deployment phase and progress based on logs
        let phase: DeploymentState['deploymentPhase'] = 'preparing';
        let progress = 10;
        
        // Check all logs to determine the current phase
        let verificationPhase: DeploymentState['verificationPhase'] = undefined;
        
        for (const log of logs) {
          const message = log.message.toLowerCase();
          
          // Phase detection based on actual log patterns
          if (message.includes('initiating deployment') || message.includes('preparing')) {
            phase = 'preparing';
            progress = Math.max(progress, 15);
          } else if (message.includes('uploading') || message.includes('files to deploy') || message.includes('prepared') && message.includes('files')) {
            phase = 'uploading';
            progress = Math.max(progress, 35);
          } else if (message.includes('vercel api response') || message.includes('deployment successful') || message.includes('live url') || message.includes('application is now live')) {
            phase = 'building';
            progress = Math.max(progress, 70);
          } else if (message.includes('starting verification') || message.includes('verifying app') || message.includes('waiting') && message.includes('seconds')) {
            phase = 'verifying';
            progress = Math.max(progress, 85);
            
            // Determine verification sub-phase
            if (message.includes('starting verification')) {
              verificationPhase = 'starting';
            } else if (message.includes('got 401') || message.includes('authentication page')) {
              verificationPhase = 'checking';
            } else if (message.includes('retry response: 401') || message.includes('still getting 401')) {
              verificationPhase = 'retrying';
            }
          } else if (message.includes('app verified and published') || message.includes('treating 401 as successful')) {
            phase = 'completed';
            progress = 100;
            verificationPhase = 'success';
          } else if (message.includes('failed') && log.level === 'error') {
            phase = 'failed';
            progress = 0;
          }
        }
        
        setState(prev => ({
          ...prev,
          logs: logs,
          isDeploying: is_deploying || status === 'deploying',
          deploymentPhase: phase,
          progress: progress,
          verificationPhase: verificationPhase,
        }));
      }
      
      // Stop polling if deployment is complete
      if (!is_deploying && status !== 'deploying') {
        if (pollingRef.current) {
          clearInterval(pollingRef.current);
          pollingRef.current = null;
        }
        
        // Get final app status to check for deployment URL
        try {
          const appResponse = await api.get(`/apps/${appId}`);
          const app = appResponse.data;
          if (app.production_url) {
            setState(prev => ({
              ...prev,
              deploymentUrl: app.production_url,
              isDeploying: false,
              deploymentPhase: 'completed',
              progress: 100,
            }));
          }
        } catch (error) {
          console.error('Failed to get app details:', error);
        }
      }
    } catch (error) {
      console.error('Failed to poll deployment logs:', error);
    }
  }, []);

  const startPolling = useCallback((appId: number) => {
    currentAppIdRef.current = appId;
    
    // Clear any existing polling
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
    }
    
    // Start polling every 2 seconds (reduced frequency)
    pollingRef.current = setInterval(() => {
      if (currentAppIdRef.current) {
        pollDeploymentLogs(currentAppIdRef.current);
      }
    }, 2000);
    
    // Initial poll to get existing logs immediately
    pollDeploymentLogs(appId);
  }, [pollDeploymentLogs]);

  const fetchExistingLogs = useCallback(async (appId: number) => {
    try {
      const response = await api.get(`/deployments/${appId}/logs`);
      const { logs, status, is_deploying } = response.data;
      
      if (logs && logs.length > 0) {
        logsRef.current = logs;
        
        // Determine phase and progress from existing logs
        let phase: DeploymentState['deploymentPhase'] = 'preparing';
        let progress = 10;
        let verificationPhase: DeploymentState['verificationPhase'] = undefined;
        
        for (const log of logs) {
          const message = log.message.toLowerCase();
          
          if (message.includes('initiating deployment') || message.includes('preparing')) {
            phase = 'preparing';
            progress = Math.max(progress, 15);
          } else if (message.includes('uploading') || message.includes('files to deploy') || message.includes('prepared') && message.includes('files')) {
            phase = 'uploading';
            progress = Math.max(progress, 35);
          } else if (message.includes('vercel api response') || message.includes('deployment successful') || message.includes('live url') || message.includes('application is now live')) {
            phase = 'building';
            progress = Math.max(progress, 70);
          } else if (message.includes('starting verification') || message.includes('verifying app') || message.includes('waiting') && message.includes('seconds')) {
            phase = 'verifying';
            progress = Math.max(progress, 85);
            
            if (message.includes('starting verification')) {
              verificationPhase = 'starting';
            } else if (message.includes('got 401') || message.includes('authentication page')) {
              verificationPhase = 'checking';
            } else if (message.includes('retry response: 401') || message.includes('still getting 401')) {
              verificationPhase = 'retrying';
            }
          } else if (message.includes('app verified and published') || message.includes('treating 401 as successful')) {
            phase = 'completed';
            progress = 100;
            verificationPhase = 'success';
          } else if (message.includes('failed') && log.level === 'error') {
            phase = 'failed';
            progress = 0;
          }
        }
        
        setState(prev => ({
          ...prev,
          logs: logs,
          isDeploying: is_deploying || status === 'deploying',
          deploymentPhase: phase,
          progress: progress,
          verificationPhase: verificationPhase,
        }));
        
        // If still deploying, start polling
        if (is_deploying || status === 'deploying') {
          startPolling(appId);
        }
      }
    } catch (error) {
      console.log('No existing logs found or error fetching logs:', error);
    }
  }, [startPolling]);

  const deployApp = useCallback(async (appId: number, _appName: string) => {
    setState(prev => ({ 
      ...prev, 
      isDeploying: true, 
      error: undefined,
      deploymentPhase: 'preparing',
      progress: 10,
    }));
    clearLogs();

    try {
      // First, get any existing logs from backend
      try {
        const existingLogsResponse = await api.get(`/deployments/${appId}/logs`);
        if (existingLogsResponse.data.logs && existingLogsResponse.data.logs.length > 0) {
          logsRef.current = existingLogsResponse.data.logs;
          setState(prev => ({
            ...prev,
            logs: existingLogsResponse.data.logs,
          }));
        }
      } catch (logError) {
        console.log('No existing logs found, starting fresh');
      }

      addLog('info', `🎯 Initiating deployment for app ID: ${appId}`);
      updateProgress('preparing', 15);
      
      // Make the API call to start deployment
      const response = await api.post(`/deployments/${appId}/deploy`, { 
        provider: 'vercel' 
      });

      if (response.data.status === 'deploying') {
        addLog('success', '🚀 Deployment started successfully!');
        addLog('info', '📡 Starting real-time log monitoring...');
        updateProgress('uploading', 25);
        
        // Start polling for logs immediately
        startPolling(appId);
      }

    } catch (error: any) {
      console.error('Deployment failed:', error);
      
      const errorMessage = error.response?.data?.detail || error.message || 'Unknown deployment error';
      
      addLog('error', `❌ Deployment failed: ${errorMessage}`);
      
      if (errorMessage.includes('VERCEL_TOKEN')) {
        addLog('warning', '⚠️ Please configure your Vercel token in the backend .env file');
        addLog('info', '💡 Get your token from: https://vercel.com/account/tokens');
      }
      
      setState(prev => ({
        ...prev,
        isDeploying: false,
        error: errorMessage,
        deploymentPhase: 'failed',
        progress: 0,
      }));
    }
  }, [addLog, clearLogs, startPolling, updateProgress]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    currentAppIdRef.current = null;
  }, []);

  const resetDeployment = useCallback(() => {
    stopPolling();
    setState({
      isDeploying: false,
      logs: [],
      deploymentPhase: 'preparing',
      progress: 0,
    });
    logsRef.current = [];
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    ...state,
    deployApp,
    clearLogs,
    resetDeployment,
    updateProgress,
    fetchExistingLogs,
  };
};