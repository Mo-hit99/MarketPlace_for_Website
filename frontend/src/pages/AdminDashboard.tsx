import { useEffect, useState } from 'react';
import api from '../services/api';
import { App, AppStatus } from '../types';
import { Navbar } from '../components/Navbar';
import { Shield, Code, Activity, TrendingUp, Eye } from 'lucide-react';

export const AdminDashboard = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await api.get('/apps/');
        setApps(res.data);
      } catch (error) {
        console.error('Failed to fetch apps:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

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

  const stats = {
    totalApps: apps.length,
    publishedApps: apps.filter(app => app.status === AppStatus.PUBLISHED).length,
    deployingApps: apps.filter(app => app.status === AppStatus.DEPLOYING).length,
    liveApps: apps.filter(app => app.production_url).length,
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-slate-600 via-gray-600 to-zinc-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="text-center">
            <div className="flex justify-center mb-4">
              <Shield className="h-12 w-12 text-white" />
            </div>
            <h1 className="text-4xl font-bold mb-4">Admin Dashboard</h1>
            <p className="text-xl text-gray-200 max-w-2xl mx-auto">
              Monitor and manage all applications across the platform
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
          <div className="text-center p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="flex justify-center mb-3">
              <Code className="h-8 w-8 text-blue-600" />
            </div>
            <div className="text-3xl font-bold gradient-text">{stats.totalApps}</div>
            <div className="text-gray-600">Total Apps</div>
          </div>
          
          <div className="text-center p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="flex justify-center mb-3">
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
            <div className="text-3xl font-bold gradient-text">{stats.publishedApps}</div>
            <div className="text-gray-600">Published</div>
          </div>
          
          <div className="text-center p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="flex justify-center mb-3">
              <Activity className="h-8 w-8 text-yellow-600" />
            </div>
            <div className="text-3xl font-bold gradient-text">{stats.deployingApps}</div>
            <div className="text-gray-600">Deploying</div>
          </div>
          
          <div className="text-center p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="flex justify-center mb-3">
              <Eye className="h-8 w-8 text-purple-600" />
            </div>
            <div className="text-3xl font-bold gradient-text">{stats.liveApps}</div>
            <div className="text-gray-600">Live Apps</div>
          </div>
        </div>

        {/* Apps List */}
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900">All Applications</h2>
            <p className="text-gray-600">Monitor all apps across the platform</p>
          </div>
          
          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
          ) : apps.length === 0 ? (
            <div className="text-center py-20">
              <div className="text-gray-400 mb-4">
                <Code className="h-16 w-16 mx-auto" />
              </div>
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No applications yet</h3>
              <p className="text-gray-600">Applications will appear here once developers start creating them</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {apps.map(app => (
                <div key={app.id} className="px-6 py-4 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
                          <Code className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900">{app.name}</h3>
                          <p className="text-sm text-gray-600">
                            {app.description || 'No description provided'}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Developer ID</div>
                        <div className="font-medium text-gray-900">{app.developer_id}</div>
                      </div>
                      
                      <div className="text-right">
                        <div className="text-sm text-gray-500">Framework</div>
                        <div className="font-medium text-gray-900">{app.framework}</div>
                      </div>
                      
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${getStatusColor(app.status)}`}>
                        {app.status}
                      </span>
                      
                      {app.production_url && (
                        <a 
                          href={app.production_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-blue-600 hover:text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors duration-200"
                        >
                          <Eye className="h-3 w-3 mr-1" />
                          View
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <div className="mt-3 flex items-center text-xs text-gray-500">
                    <span>Created: {new Date(app.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
