import { useEffect, useState } from 'react';
import api from '../services/api';
import { App, AppStatus } from '../types';
import { Navbar } from '../components/Navbar';
import { DeploymentTerminal } from '../components/DeploymentTerminal';
import { MultiStepAppForm } from '../components/MultiStepAppForm';
import { useDeployment } from '../hooks/useDeployment';
import { Plus, Upload, RefreshCw, Code, Rocket, Eye, X, Edit, Trash2, DollarSign } from 'lucide-react';

export const DeveloperDashboard = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMultiStepFormOpen, setIsMultiStepFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [currentDeployingApp, setCurrentDeployingApp] = useState<App | null>(null);
  
  const deployment = useDeployment();
  
  const fetchApps = async () => {
    try {
        setLoading(true);
        const res = await api.get('/apps/');
        setApps(res.data);
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  useEffect(() => {
    fetchApps();
  }, []);

  const handleCreateApp = () => {
    setIsMultiStepFormOpen(true);
  };

  const handleMultiStepComplete = (appId: number) => {
    setIsMultiStepFormOpen(false);
    fetchApps();
    // Optionally open deployment terminal
    const app = apps.find(a => a.id === appId);
    if (app) {
      setCurrentDeployingApp(app);
      setIsTerminalOpen(true);
    }
  };

  const handleEditApp = (app: App) => {
    setEditingApp(app);
    setIsModalOpen(true);
  };

  const handleUpdateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApp) return;

    try {
      await api.put(`/apps/${editingApp.id}`, {
        name: editingApp.name,
        description: editingApp.description,
        price: editingApp.price,
        category: editingApp.category
      });
      setIsModalOpen(false);
      setEditingApp(null);
      fetchApps();
    } catch (e) {
      console.error(e);
      alert('Failed to update app');
    }
  };

  const handleDeleteApp = async (appId: number) => {
    if (!confirm('Are you sure you want to delete this app? This action cannot be undone.')) {
      return;
    }

    try {
      await api.delete(`/apps/${appId}`);
      fetchApps();
    } catch (e) {
      console.error(e);
      alert('Failed to delete app');
    }
  };

  const handleUpload = async (appId: number, file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      try {
          await api.post(`/apps/${appId}/upload`, formData);
          fetchApps();
          alert('Upload successful');
      } catch (e) {
          console.error('Upload error:', e);
          alert('Upload failed');
      }
  };
  
  const handleDeploy = async (app: App) => {
    setCurrentDeployingApp(app);
    setIsTerminalOpen(true);
    
    try {
      await deployment.deployApp(app.id, app.name);
      // Refresh apps list after deployment
      setTimeout(() => {
        fetchApps();
      }, 2000);
    } catch (error) {
      console.error('Deployment error:', error);
    }
  };

  const handleRedeploy = async (app: App) => {
    setCurrentDeployingApp(app);
    setIsTerminalOpen(true);
    
    try {
      await api.post(`/deployments/${app.id}/redeploy`);
      // Refresh apps list after redeployment
      setTimeout(() => {
        fetchApps();
      }, 2000);
    } catch (error) {
      console.error('Redeployment error:', error);
    }
  };

  const handleCloseTerminal = () => {
    setIsTerminalOpen(false);
    setCurrentDeployingApp(null);
    deployment.resetDeployment();
  };

  const getStatusColor = (status: AppStatus) => {
    switch (status) {
      case AppStatus.PUBLISHED:
        return 'bg-green-100 text-green-800 border-green-200';
      case AppStatus.DEPLOYING:
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case AppStatus.DEPLOYED:
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case AppStatus.FAILED:
        return 'bg-red-100 text-red-800 border-red-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStepStatus = (app: App) => {
    return `${app.step_completed}/4 steps completed`;
  };

  const canDeploy = (app: App) => {
    return app.step_completed >= 3 && app.source_path && app.status !== AppStatus.DEPLOYING;
  };

  const AppCard = ({ app }: { app: App }) => (
    <div className="card group">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(app.status)}`}>
              {app.status}
            </span>
          </div>
          <p className="text-gray-600 text-sm mb-2">{app.description}</p>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              ${app.price}/month
            </span>
            <span>{getStepStatus(app)}</span>
            <span>Framework: {app.framework}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEditApp(app)}
            className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
            title="Edit app"
          >
            <Edit className="h-4 w-4" />
          </button>
          <button
            onClick={() => handleDeleteApp(app.id)}
            className="p-2 text-gray-400 hover:text-red-600 transition-colors"
            title="Delete app"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Progress</span>
          <span>{Math.round((app.step_completed / 4) * 100)}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
            style={{ width: `${(app.step_completed / 4) * 100}%` }}
          ></div>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {app.step_completed < 3 && (
            <label className="btn-secondary cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              Upload Code
              <input
                type="file"
                accept=".zip"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload(app.id, file);
                }}
              />
            </label>
          )}
          
          {canDeploy(app) && app.status !== AppStatus.PUBLISHED && (
            <button
              onClick={() => handleDeploy(app)}
              className="btn-primary"
            >
              <Rocket className="h-4 w-4 mr-2" />
              Deploy
            </button>
          )}

          {app.status === AppStatus.PUBLISHED && (
            <button
              onClick={() => handleRedeploy(app)}
              className="btn-secondary"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Redeploy
            </button>
          )}
        </div>

        {app.production_url && (
          <a
            href={app.production_url}
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary"
          >
            <Eye className="h-4 w-4 mr-2" />
            View Live
          </a>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Developer Dashboard</h1>
            <p className="text-gray-600 mt-1">Manage your apps and deployments</p>
          </div>
          
          <button
            onClick={handleCreateApp}
            className="btn-primary"
          >
            <Plus className="h-5 w-5 mr-2" />
            Create New App
          </button>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading your apps...</p>
          </div>
        ) : apps.length === 0 ? (
          <div className="text-center py-12">
            <Code className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No apps yet</h3>
            <p className="text-gray-600 mb-6">Create your first app to get started with the marketplace</p>
            <button
              onClick={handleCreateApp}
              className="btn-primary"
            >
              <Plus className="h-5 w-5 mr-2" />
              Create Your First App
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {apps.map((app) => (
              <AppCard key={app.id} app={app} />
            ))}
          </div>
        )}
      </div>

      {/* Multi-step App Creation Form */}
      {isMultiStepFormOpen && (
        <MultiStepAppForm
          onComplete={handleMultiStepComplete}
          onCancel={() => setIsMultiStepFormOpen(false)}
        />
      )}

      {/* Edit App Modal */}
      {isModalOpen && editingApp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Edit App</h3>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <form onSubmit={handleUpdateApp} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    App Name
                  </label>
                  <input
                    type="text"
                    value={editingApp.name}
                    onChange={(e) => setEditingApp({ ...editingApp, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={editingApp.description || ''}
                    onChange={(e) => setEditingApp({ ...editingApp, description: e.target.value })}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Price (USD/month)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.99"
                    value={editingApp.price}
                    onChange={(e) => setEditingApp({ ...editingApp, price: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    required
                  />
                </div>
                
                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="btn-secondary"
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn-primary">
                    Update App
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Deployment Terminal */}
      {isTerminalOpen && currentDeployingApp && (
        <DeploymentTerminal
          isOpen={isTerminalOpen}
          onClose={handleCloseTerminal}
          appName={currentDeployingApp.name}
          logs={deployment.logs}
          isDeploying={deployment.isDeploying}
          deploymentUrl={deployment.deploymentUrl}
        />
      )}
    </div>
  );
};