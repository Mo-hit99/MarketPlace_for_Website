import { useEffect, useState } from 'react';
import api from '../services/api';
import { App, AppStatus } from '../types';
import { Navbar } from '../components/Navbar';
import { ShoppingCart, ExternalLink, Star, Users, Zap, Shield, Search, Filter } from 'lucide-react';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const UserMarketplace = () => {
  const [apps, setApps] = useState<App[]>([]);
  const [subscriptions, setSubscriptions] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchApps = async () => {
    try {
        setLoading(true);
        const res = await api.get('/apps/'); 
        setApps(res.data.filter((a: App) => a.status === AppStatus.PUBLISHED));
    } catch (e) {
        console.error(e);
    } finally {
        setLoading(false);
    }
  };

  const fetchSubscriptions = async () => {
      try {
          const res = await api.get('/subscriptions/');
          setSubscriptions(res.data.map((s: any) => s.app_id));
      } catch (e) {
          console.error(e);
      }
  };

  useEffect(() => {
    fetchApps();
    fetchSubscriptions();
  }, []);

  const handleInstall = async (app: App) => {
    try {
        const orderRes = await api.post('/subscriptions/orders', { app_id: app.id, amount: 999.00 });
        const { order_id, amount, currency, key_id } = orderRes.data;

        const options = {
            key: key_id,
            amount: amount,
            currency: currency,
            name: "SaaS Market",
            description: `Install ${app.name}`,
            order_id: order_id,
            handler: async function (response: any) {
                try {
                    await api.post('/subscriptions/verify', {
                        razorpay_order_id: response.razorpay_order_id,
                        razorpay_payment_id: response.razorpay_payment_id,
                        razorpay_signature: response.razorpay_signature,
                        app_id: app.id
                    });
                    alert("Installation Successful!");
                    fetchSubscriptions();
                } catch (e) {
                    alert("Verification Failed");
                }
            },
            prefill: {
                email: "test@example.com", 
            }
        };
        const rzp1 = new window.Razorpay(options);
        rzp1.open();
    } catch (e) {
        alert("Payment Failed");
        console.error(e);
    }
  };

  const handleOpenApp = async (appId: number) => {
      try {
          const res = await api.get(`/access/launch/${appId}`); 
          if (res.data.url) {
              // Open in new tab with clean URL
              const newWindow = window.open(res.data.url, '_blank');
              
              // Store token for the app to use
              if (newWindow && res.data.token) {
                  // Send token to the opened window via postMessage
                  setTimeout(() => {
                      newWindow.postMessage({
                          type: 'SAAS_MARKETPLACE_TOKEN',
                          token: res.data.token,
                          user_id: res.data.user_id,
                          app_id: res.data.app_id
                      }, '*');
                  }, 1000);
              }
          }
      } catch (e) {
          alert("Failed to launch app. Subscription active?");
      }
  };

  const filteredApps = apps.filter(app => 
    app.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (app.description && app.description.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const AppCard = ({ app }: { app: App }) => {
    const isInstalled = subscriptions.includes(app.id);
    
    return (
      <div className="card group animate-fade-in">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-xl font-bold text-gray-900 group-hover:text-blue-600 transition-colors duration-200">
              {app.name}
            </h3>
            <p className="mt-2 text-gray-600 text-sm leading-relaxed">
              {app.description || 'No description available'}
            </p>
          </div>
          <div className="ml-4 flex-shrink-0">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center">
              <Zap className="h-6 w-6 text-white" />
            </div>
          </div>
        </div>
        
        <div className="flex items-center space-x-4 mb-4 text-sm text-gray-500">
          <div className="flex items-center">
            <Star className="h-4 w-4 text-yellow-400 mr-1" />
            <span>4.8</span>
          </div>
          <div className="flex items-center">
            <Users className="h-4 w-4 mr-1" />
            <span>1.2k users</span>
          </div>
          <div className="flex items-center">
            <Shield className="h-4 w-4 text-green-500 mr-1" />
            <span>Verified</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex flex-col">
            <span className="text-2xl font-bold gradient-text">$9.99</span>
            <span className="text-xs text-gray-500">per month</span>
          </div>
          
          {isInstalled ? (
            <button 
              onClick={() => handleOpenApp(app.id)}
              className="btn-success"
            >
              <ExternalLink className="mr-2 h-4 w-4" /> 
              Open App
            </button>
          ) : (
            <button 
              onClick={() => handleInstall(app)}
              className="btn-primary"
            >
              <ShoppingCart className="mr-2 h-4 w-4" /> 
              Install Now
            </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen">
      <Navbar />
      
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-4 animate-fade-in">
              Discover Amazing Apps
            </h1>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto animate-slide-up">
              Transform your workflow with powerful SaaS applications. Install, manage, and scale your business tools in one place.
            </p>
            
            {/* Search Bar */}
            <div className="max-w-md mx-auto relative animate-slide-up">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-5 w-5 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search apps..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 border border-white/20 rounded-xl bg-white/10 backdrop-blur-sm text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <div className="text-center p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="text-3xl font-bold gradient-text">{apps.length}</div>
            <div className="text-gray-600">Available Apps</div>
          </div>
          <div className="text-center p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="text-3xl font-bold gradient-text">{subscriptions.length}</div>
            <div className="text-gray-600">Your Apps</div>
          </div>
          <div className="text-center p-6 bg-white/50 backdrop-blur-sm rounded-2xl border border-white/20">
            <div className="text-3xl font-bold gradient-text">24/7</div>
            <div className="text-gray-600">Support</div>
          </div>
        </div>

        {/* Apps Grid */}
        {loading ? (
          <div className="flex justify-center items-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between mb-8">
              <h2 className="text-2xl font-bold text-gray-900">
                {searchTerm ? `Search Results (${filteredApps.length})` : 'Featured Apps'}
              </h2>
              <button className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 transition-colors duration-200">
                <Filter className="h-4 w-4" />
                <span>Filter</span>
              </button>
            </div>
            
            {filteredApps.length === 0 ? (
              <div className="text-center py-20">
                <div className="text-gray-400 mb-4">
                  <Search className="h-16 w-16 mx-auto" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">No apps found</h3>
                <p className="text-gray-600">Try adjusting your search terms</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
                {filteredApps.map(app => (
                  <AppCard key={app.id} app={app} />
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};
