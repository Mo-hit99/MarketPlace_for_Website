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
}

export const useDeployment = () => {
  const [state, setState] = useState<DeploymentState>({
    isDeploying: false,
    logs: [],
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

  const clearLogs = useCallback(() => {
    logsRef.current = [];
    setState(prev => ({
      ...prev,
      logs: [],
      deploymentUrl: undefined,
      error: undefined,
    }));
  }, []);

  const pollDeploymentLogs = useCallback(async (appId: number) => {
    try {
      const response = await api.get(`/deployments/${appId}/logs`);
      const { logs, status, is_deploying } = response.data;
      
      // Update logs if they've changed
      if (logs && logs.length > 0) {
        logsRef.current = logs;
        setState(prev => ({
          ...prev,
          logs: logs,
          isDeploying: is_deploying || status === 'deploying',
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
    
    // Start polling every 1 second
    pollingRef.current = setInterval(() => {
      if (currentAppIdRef.current) {
        pollDeploymentLogs(currentAppIdRef.current);
      }
    }, 1000);
    
    // Initial poll
    pollDeploymentLogs(appId);
  }, [pollDeploymentLogs]);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    currentAppIdRef.current = null;
  }, []);

  const deployApp = useCallback(async (appId: number, _appName: string) => {
    setState(prev => ({ ...prev, isDeploying: true, error: undefined }));
    clearLogs();

    try {
      addLog('info', `🎯 Initiating deployment for app ID: ${appId}`);
      
      // Make the API call to start deployment
      const response = await api.post(`/deployments/${appId}/deploy`, { 
        provider: 'vercel' 
      });

      if (response.data.status === 'deploying') {
        addLog('success', '🚀 Deployment started successfully!');
        addLog('info', '📡 Starting real-time log monitoring...');
        
        // Start polling for logs
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
      }));
    }
  }, [addLog, clearLogs, startPolling]);

  const resetDeployment = useCallback(() => {
    stopPolling();
    setState({
      isDeploying: false,
      logs: [],
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
  };
};