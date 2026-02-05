import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { App } from '../types';
import { Navbar } from '../components/Navbar';
import { 
  ArrowLeft, 
  ShoppingCart, 
  ExternalLink, 
  Star, 
  Users, 
  Shield, 
  Globe, 
  Mail, 
  Play,
  ChevronLeft,
  ChevronRight,
  X
} from 'lucide-react';
import { getImageUrl, getLogoUrl, getPlaceholderImageUrl } from '../utils/imageUtils';

declare global {
  interface Window {
    Razorpay: any;
  }
}

export const AppDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [app, setApp] = useState<App | null>(null);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchApp(parseInt(id));
      checkSubscription(parseInt(id));
    }
  }, [id]);

  const fetchApp = async (appId: number) => {
    try {
      setLoading(true);
      const res = await api.get(`/apps/${appId}`);
      setApp(res.data);
    } catch (e) {
      console.error(e);
      navigate('/marketplace');
    } finally {
      setLoading(false);
    }
  };

  const checkSubscription = async (appId: number) => {
    try {
      const res = await api.get('/subscriptions/');
      const subscriptions = res.data.map((s: any) => s.app_id);
      setIsSubscribed(subscriptions.includes(appId));
    } catch (e) {
      console.error(e);
    }
  };

  const handleInstall = async () => {
    if (!app) return;

    try {
      const orderRes = await api.post('/subscriptions/orders', { 
        app_id: app.id, 
        amount: app.price * 100 
      });
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
            setIsSubscribed(true);
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

  const handleOpenApp = async () => {
    if (!app) return;

    try {
      const res = await api.get(`/access/launch/${app.id}`);
      if (res.data.url) {
        const newWindow = window.open(res.data.url, '_blank');
        
        if (newWindow && res.data.token) {
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

  const nextImage = () => {
    if (app?.images) {
      setCurrentImageIndex((prev) => (prev + 1) % app.images!.length);
    }
  };

  const prevImage = () => {
    if (app?.images) {
      setCurrentImageIndex((prev) => (prev - 1 + app.images!.length) % app.images!.length);
    }
  };

  const openImageModal = (index: number) => {
    setCurrentImageIndex(index);
    setIsImageModalOpen(true);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="flex justify-center items-center py-20">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (!app) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <div className="text-center py-20">
          <h2 className="text-2xl font-bold text-gray-900">App not found</h2>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <button
          onClick={() => navigate('/marketplace')}
          className="flex items-center text-gray-600 hover:text-blue-600 mb-6 transition-colors"
        >
          <ArrowLeft className="h-5 w-5 mr-2" />
          Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* App Header */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
              <div className="flex items-start space-x-4">
                {app.logo_url && (
                  <img
                    src={getLogoUrl(app.id, app.logo_url)}
                    alt={`${app.name} logo`}
                    className="w-16 h-16 rounded-xl object-cover"
                    onError={(e) => {
                      console.error('App logo failed to load:', app.logo_url);
                      e.currentTarget.style.display = 'none';
                    }}
                  />
                )}
                <div className="flex-1">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{app.name}</h1>
                  <p className="text-gray-600 mb-4">{app.description}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Star className="h-4 w-4 text-yellow-400 mr-1" />
                      <span>4.8 (124 reviews)</span>
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
                </div>
              </div>
            </div>

            {/* Screenshots */}
            {app.images && app.images.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Screenshots</h2>
                
                {/* Main Image */}
                <div className="relative mb-4">
                  <img
                    src={getImageUrl(app.id, app.images[currentImageIndex])}
                    alt={`${app.name} screenshot ${currentImageIndex + 1}`}
                    className="w-full h-96 object-cover rounded-lg cursor-pointer"
                    onClick={() => openImageModal(currentImageIndex)}
                    onError={(e) => {
                      console.error(`Screenshot ${currentImageIndex + 1} failed to load:`, app.images?.[currentImageIndex]);
                      e.currentTarget.src = getPlaceholderImageUrl(800, 400);
                    }}
                  />
                  
                  {app.images.length > 1 && (
                    <>
                      <button
                        onClick={prevImage}
                        className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                      >
                        <ChevronLeft className="h-5 w-5" />
                      </button>
                      <button
                        onClick={nextImage}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black bg-opacity-50 text-white p-2 rounded-full hover:bg-opacity-70 transition-all"
                      >
                        <ChevronRight className="h-5 w-5" />
                      </button>
                    </>
                  )}
                </div>

                {/* Thumbnail Navigation */}
                {app.images.length > 1 && (
                  <div className="flex space-x-2 overflow-x-auto">
                    {app.images.map((image, index) => (
                      <img
                        key={index}
                        src={getImageUrl(app.id, image)}
                        alt={`${app.name} thumbnail ${index + 1}`}
                        className={`w-20 h-20 object-cover rounded-lg cursor-pointer flex-shrink-0 ${
                          index === currentImageIndex ? 'ring-2 ring-blue-500' : ''
                        }`}
                        onClick={() => setCurrentImageIndex(index)}
                        onError={(e) => {
                          console.error(`Thumbnail ${index + 1} failed to load:`, image);
                          e.currentTarget.src = getPlaceholderImageUrl(80, 80);
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Features */}
            {app.features && app.features.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Key Features</h2>
                <ul className="space-y-2">
                  {app.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 mr-3 flex-shrink-0"></div>
                      <span className="text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Tags */}
            {app.tags && app.tags.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm p-6">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Tags</h2>
                <div className="flex flex-wrap gap-2">
                  {app.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Pricing Card */}
            <div className="bg-white rounded-xl shadow-sm p-6 mb-6 sticky top-6">
              <div className="text-center mb-6">
                <div className="text-4xl font-bold text-gray-900 mb-2">₹{app.price}</div>
                <div className="text-gray-500">per month</div>
              </div>

              {isSubscribed ? (
                <button
                  onClick={handleOpenApp}
                  className="w-full btn-success mb-4"
                >
                  <ExternalLink className="mr-2 h-5 w-5" />
                  Open App
                </button>
              ) : (
                <button
                  onClick={handleInstall}
                  className="w-full btn-primary mb-4"
                >
                  <ShoppingCart className="mr-2 h-5 w-5" />
                  Install Now
                </button>
              )}

              {app.demo_url && (
                <a
                  href={app.demo_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full btn-secondary mb-4 inline-flex items-center justify-center"
                >
                  <Play className="mr-2 h-4 w-4" />
                  Try Demo
                </a>
              )}

              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Category</span>
                  <span className="text-gray-900 capitalize">{app.category}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Framework</span>
                  <span className="text-gray-900 uppercase">{app.framework}</span>
                </div>
                {app.website_url && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Website</span>
                    <a
                      href={app.website_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <Globe className="h-4 w-4 mr-1" />
                      Visit
                    </a>
                  </div>
                )}
                {app.support_email && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Support</span>
                    <a
                      href={`mailto:${app.support_email}`}
                      className="text-blue-600 hover:text-blue-800 flex items-center"
                    >
                      <Mail className="h-4 w-4 mr-1" />
                      Contact
                    </a>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Modal */}
      {isImageModalOpen && app.images && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
          <div className="relative max-w-4xl max-h-full p-4">
            <button
              onClick={() => setIsImageModalOpen(false)}
              className="absolute top-4 right-4 text-white hover:text-gray-300 z-10"
            >
              <X className="h-8 w-8" />
            </button>
            
            <img
              src={getImageUrl(app.id, app.images[currentImageIndex])}
              alt={`${app.name} screenshot ${currentImageIndex + 1}`}
              className="max-w-full max-h-full object-contain"
              onError={(e) => {
                console.error(`Modal image ${currentImageIndex + 1} failed to load:`, app.images?.[currentImageIndex]);
                e.currentTarget.src = getPlaceholderImageUrl(800, 600);
              }}
            />
            
            {app.images.length > 1 && (
              <>
                <button
                  onClick={prevImage}
                  className="absolute left-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                >
                  <ChevronLeft className="h-12 w-12" />
                </button>
                <button
                  onClick={nextImage}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-white hover:text-gray-300"
                >
                  <ChevronRight className="h-12 w-12" />
                </button>
              </>
            )}
            
            <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white">
              {currentImageIndex + 1} / {app.images.length}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};