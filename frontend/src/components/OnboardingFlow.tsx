import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, User, Settings, CreditCard, Check, Sparkles } from 'lucide-react';
import api from '../services/api';

interface OnboardingData {
  full_name: string;
  company: string;
  bio: string;
  preferences: {
    categories: string[];
    notifications: boolean;
    newsletter: boolean;
  };
}

interface OnboardingFlowProps {
  onComplete: () => void;
}

export const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<OnboardingData>({
    full_name: '',
    company: '',
    bio: '',
    preferences: {
      categories: [],
      notifications: true,
      newsletter: false
    }
  });

  const steps = [
    { number: 1, title: 'Personal Info', icon: User },
    { number: 2, title: 'Preferences', icon: Settings },
    { number: 3, title: 'Deployment Service', icon: CreditCard }
  ];

  const categories = [
    'Productivity', 'Business', 'Education', 'Entertainment', 
    'Utilities', 'Social', 'Finance', 'Health'
  ];

  const handleNext = async () => {
    if (currentStep < 3) {
      setCurrentStep(currentStep + 1);
    } else {
      await completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    setLoading(true);
    try {
      // Complete onboarding
      await api.put('/auth/me/onboarding', {
        full_name: formData.full_name,
        company: formData.company,
        bio: formData.bio,
        preferences: JSON.stringify(formData.preferences),
        onboarding_completed: true
      });
      
      onComplete();
    } catch (error) {
      console.error('Onboarding error:', error);
      alert('Error completing onboarding. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploymentPayment = async () => {
    setLoading(true);
    try {
      const response = await api.post('/auth/me/deployment-service/payment', {
        amount: 8299.00
      });

      const { order_id, amount, currency, key_id } = response.data;

      const options = {
        key: key_id,
        amount: amount * 100, // Convert to paise
        currency: currency,
        name: "SaaS Marketplace",
        description: "One-time Deployment Service Access",
        order_id: order_id,
        handler: async function (paymentResponse: any) {
          try {
            await api.post('/auth/me/deployment-service/verify', {
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature
            });
            
            // Complete onboarding after successful payment
            await completeOnboarding();
          } catch (e) {
            alert("Payment verification failed");
          }
        },
        prefill: {
          name: formData.full_name,
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.open();
    } catch (error) {
      console.error('Payment error:', error);
      alert('Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.full_name.trim() !== '';
      case 2:
        return formData.preferences.categories.length > 0;
      case 3:
        return true;
      default:
        return true;
    }
  };

  const toggleCategory = (category: string) => {
    const categories = formData.preferences.categories;
    const newCategories = categories.includes(category)
      ? categories.filter(c => c !== category)
      : [...categories, category];
    
    setFormData({
      ...formData,
      preferences: {
        ...formData.preferences,
        categories: newCategories
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-purple-600 via-indigo-600 to-blue-600 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 text-center">
          <div className="flex items-center justify-center mb-4">
            <Sparkles className="h-8 w-8 text-purple-600 mr-2" />
            <h2 className="text-2xl font-bold text-gray-900">Welcome to SaaS Marketplace!</h2>
          </div>
          <p className="text-gray-600">Let's get you set up in just a few steps</p>
        </div>

        {/* Progress Steps */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = currentStep === step.number;
              const isCompleted = currentStep > step.number;
              
              return (
                <div key={step.number} className="flex items-center">
                  <div className={`flex items-center justify-center w-10 h-10 rounded-full border-2 ${
                    isCompleted 
                      ? 'bg-green-500 border-green-500 text-white' 
                      : isActive 
                        ? 'bg-purple-500 border-purple-500 text-white' 
                        : 'border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                      Step {step.number}
                    </p>
                    <p className={`text-xs ${isActive ? 'text-purple-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
                      {step.title}
                    </p>
                  </div>
                  {index < steps.length - 1 && (
                    <ChevronRight className="h-5 w-5 text-gray-300 mx-4" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="p-6">
          {currentStep === 1 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Tell us about yourself</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={formData.full_name}
                  onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Enter your full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company (Optional)
                </label>
                <input
                  type="text"
                  value={formData.company}
                  onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Your company name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Bio (Optional)
                </label>
                <textarea
                  value={formData.bio}
                  onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  placeholder="Tell us a bit about yourself"
                />
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Set your preferences</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Which app categories interest you? *
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {categories.map((category) => (
                    <button
                      key={category}
                      onClick={() => toggleCategory(category)}
                      className={`p-3 text-left border rounded-lg transition-colors ${
                        formData.preferences.categories.includes(category)
                          ? 'border-purple-500 bg-purple-50 text-purple-700'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferences.notifications}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferences: {
                        ...formData.preferences,
                        notifications: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Enable notifications for new apps and updates
                  </span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={formData.preferences.newsletter}
                    onChange={(e) => setFormData({
                      ...formData,
                      preferences: {
                        ...formData.preferences,
                        newsletter: e.target.checked
                      }
                    })}
                    className="rounded border-gray-300 text-purple-600 focus:ring-purple-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">
                    Subscribe to our newsletter for marketplace updates
                  </span>
                </label>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Deployment Service Access</h3>
              
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-lg border border-purple-200">
                <h4 className="font-semibold text-purple-900 mb-2">One-time Payment Required</h4>
                <p className="text-purple-700 mb-4">
                  To deploy and publish apps on our platform, a one-time payment of ₹8,299 is required. 
                  This gives you lifetime access to our deployment services.
                </p>
                
                <div className="space-y-2 text-sm text-purple-600">
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    <span>Unlimited app deployments</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    <span>Automatic framework detection</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    <span>Custom domain support</span>
                  </div>
                  <div className="flex items-center">
                    <Check className="h-4 w-4 mr-2" />
                    <span>24/7 deployment monitoring</span>
                  </div>
                </div>
              </div>

              <div className="text-center">
                <div className="text-3xl font-bold text-gray-900 mb-2">₹8,299</div>
                <div className="text-gray-600">One-time payment</div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                <p className="text-sm text-yellow-800">
                  <strong>Note:</strong> You can skip this step and pay later, but you won't be able to deploy apps until payment is completed.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <div>
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </button>
            )}
          </div>
          
          <div className="flex space-x-3">
            {currentStep === 3 && (
              <button
                onClick={completeOnboarding}
                disabled={loading}
                className="px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              >
                Skip for now
              </button>
            )}
            
            <button
              onClick={currentStep === 3 ? handleDeploymentPayment : handleNext}
              disabled={!canProceed() || loading}
              className="flex items-center px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Processing...' : currentStep === 3 ? 'Pay & Complete' : 'Next'}
              <ChevronRight className="h-4 w-4 ml-1" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};