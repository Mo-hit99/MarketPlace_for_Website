import { useEffect, useState } from 'react';
import api from '../services/api';
import { App, AppStatus } from '../types';
import { Navbar } from '../components/Navbar';
import { DeploymentTerminal } from '../components/DeploymentTerminal';
import { MultiStepAppForm } from '../components/MultiStepAppForm';
import { ImageUpload } from '../components/ImageUpload';
import { useDeployment } from '../hooks/useDeployment';
import { VerificationNotice } from '../components/VerificationNotice';
import { AutoRefreshNotice } from '../components/AutoRefreshNotice';
import { Plus, Upload, RefreshCw, Code, Rocket, Eye, X, Edit, Trash2, DollarSign, Image as ImageIcon } from 'lucide-react';
import { getImageUrl, getLogoUrl, getPlaceholderImageUrl } from '../utils/imageUtils';

export const DeveloperDashboard = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);
  const [isMultiStepFormOpen, setIsMultiStepFormOpen] = useState(false);
  const [editingApp, setEditingApp] = useState<App | null>(null);
  const [editingAppImages, setEditingAppImages] = useState<App | null>(null);
  const [loading, setLoading] = useState(true);
  const [isTerminalOpen, setIsTerminalOpen] = useState(false);
  const [currentDeployingApp, setCurrentDeployingApp] = useState<App | null>(null);
  const [showAutoRefresh, setShowAutoRefresh] = useState(false);
  
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
    
    // Listen for deployment completion events
    const handleDeploymentCompleted = () => {
      setTimeout(() => {
        setShowAutoRefresh(true);
      }, 2000); // Show auto-refresh notice 2 seconds after completion
    };
    
    window.addEventListener('deploymentCompleted', handleDeploymentCompleted);
    
    return () => {
      window.removeEventListener('deploymentCompleted', handleDeploymentCompleted);
    };
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

  const handleEditImages = (app: App) => {
    setEditingAppImages(app);
    setIsImageModalOpen(true);
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
    setIsTerminalOpen(true); // Show terminal immediately
    
    // Fetch existing logs first
    await deployment.fetchExistingLogs(app.id);
    
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
    setIsTerminalOpen(true); // Show terminal immediately
    
    // Fetch existing logs first
    await deployment.fetchExistingLogs(app.id);
    
    try {
      await api.post(`/deployments/${app.id}/redeploy`);
      // Start polling for logs
      deployment.deployApp(app.id, app.name);
      
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
    const totalSteps = 4;
    const completedSteps = Math.min(app.step_completed || 0, totalSteps);
    return {
      completed: completedSteps,
      total: totalSteps,
      percentage: Math.round((completedSteps / totalSteps) * 100),
      text: `${completedSteps}/${totalSteps} steps completed`
    };
  };

  const canDeploy = (app: App) => {
    // Can deploy if all steps are completed (step 4) and has source code and not currently deploying
    return app.step_completed >= 4 && app.source_path && app.status !== AppStatus.DEPLOYING;
  };

  const AppCard = ({ app }: { app: App }) => (
    <div className={`card group relative ${app.status === AppStatus.DEPLOYING ? 'opacity-75' : ''}`}>
      {/* Deployment Loading Overlay */}
      {app.status === AppStatus.DEPLOYING && (
        <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex items-center justify-center z-10">
          <div className="text-center">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            <p className="text-sm font-medium text-blue-600">Deploying...</p>
            <p className="text-xs text-gray-500">This may take a few minutes</p>
          </div>
        </div>
      )}
      
      {/* App Image */}
      {app.images && app.images.length > 0 && (
        <div className="mb-4">
          <img
            src={getImageUrl(app.id, app.images[0])}
            alt={app.name}
            className="w-full h-32 object-cover rounded-lg"
            onError={(e) => {
              console.error('App image failed to load:', app.images?.[0]);
              e.currentTarget.src = getPlaceholderImageUrl(400, 128);
            }}
          />
        </div>
      )}
      
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-2">
            {app.logo_url && (
              <img
                src={getLogoUrl(app.id, app.logo_url)}
                alt={`${app.name} logo`}
                className="w-6 h-6 rounded object-cover"
                onError={(e) => {
                  console.error('App logo failed to load:', app.logo_url);
                  e.currentTarget.style.display = 'none';
                }}
              />
            )}
            <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
            <span className={`px-2 py-1 text-xs font-medium rounded-full border ${getStatusColor(app.status)}`}>
              {app.status}
            </span>
          </div>
          <p className="text-gray-600 text-sm mb-2">{app.description}</p>
          <div className="flex items-center space-x-4 text-sm text-gray-500">
            <span className="flex items-center">
              <DollarSign className="h-4 w-4 mr-1" />
              ₹{app.price}/month
            </span>
            <span>{getStepStatus(app).text}</span>
            <span>Framework: {app.framework}</span>
          </div>
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEditImages(app)}
            className="p-2 text-gray-400 hover:text-green-600 transition-colors"
            title="Edit images"
          >
            <ImageIcon className="h-4 w-4" />
          </button>
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
        <div className="flex justify-between text-xs text-gray-500 mb-2">
          <span>Setup Progress</span>
          <span>{getStepStatus(app).percentage}%</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5">
          <div 
            className={`h-2.5 rounded-full transition-all duration-500 ${
              app.status === AppStatus.FAILED ? 'bg-red-500' :
              app.status === AppStatus.PUBLISHED ? 'bg-green-500' :
              app.status === AppStatus.DEPLOYING ? 'bg-yellow-500 animate-pulse' :
              'bg-blue-500'
            }`}
            style={{ width: `${getStepStatus(app).percentage}%` }}
          ></div>
        </div>
        
        {/* Step indicators */}
        <div className="flex justify-between mt-2 text-xs">
          <span className={`${(app.step_completed || 0) >= 1 ? 'text-green-600' : 'text-gray-400'}`}>
            Info
          </span>
          <span className={`${(app.step_completed || 0) >= 2 ? 'text-green-600' : 'text-gray-400'}`}>
            Price
          </span>
          <span className={`${(app.step_completed || 0) >= 3 ? 'text-green-600' : 'text-gray-400'}`}>
            Upload
          </span>
          <span className={`${(app.step_completed || 0) >= 4 ? 'text-green-600' : 'text-gray-400'}`}>
            Deploy
          </span>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          {app.step_completed < 4 && (
            <label className="btn-secondary cursor-pointer">
              <Upload className="h-4 w-4 mr-2" />
              {app.step_completed < 3 ? 'Upload Code' : 'Complete Setup'}
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

      {/* Image Edit Modal */}
      {isImageModalOpen && editingAppImages && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  Edit Images - {editingAppImages.name}
                </h3>
                <button
                  onClick={() => {
                    setIsImageModalOpen(false);
                    setEditingAppImages(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <ImageUpload
                appId={editingAppImages.id}
                images={editingAppImages.images || []}
                logoUrl={editingAppImages.logo_url}
                onImagesUpdate={(newImages) => {
                  setEditingAppImages({ ...editingAppImages, images: newImages });
                  // Update the app in the main list
                  setApps(apps.map(app => 
                    app.id === editingAppImages.id 
                      ? { ...app, images: newImages }
                      : app
                  ));
                }}
                onLogoUpdate={(newLogoUrl) => {
                  setEditingAppImages({ ...editingAppImages, logo_url: newLogoUrl });
                  // Update the app in the main list
                  setApps(apps.map(app => 
                    app.id === editingAppImages.id 
                      ? { ...app, logo_url: newLogoUrl }
                      : app
                  ));
                }}
              />
              
              <div className="flex justify-end pt-4 mt-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setIsImageModalOpen(false);
                    setEditingAppImages(null);
                  }}
                  className="btn-primary"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
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
                    Price (INR/month)
                  </label>
                  <input
                    type="number"
                    step="1"
                    min="99"
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

      {/* Auto Refresh Notice */}
      <AutoRefreshNotice
        show={showAutoRefresh}
        onCancel={() => setShowAutoRefresh(false)}
      />

      {/* Verification Notice */}
      <VerificationNotice
        show={deployment.deploymentPhase === 'verifying' && !!deployment.verificationPhase}
        phase={deployment.verificationPhase || 'starting'}
        appUrl={deployment.deploymentUrl}
      />
    </div>
  );
};