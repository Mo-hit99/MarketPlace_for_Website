import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Upload, DollarSign, Info, Rocket, Check } from 'lucide-react';
import api from '../services/api';
import { DeploymentTerminal } from './DeploymentTerminal';
import { useDeployment } from '../hooks/useDeployment';

interface AppFormData {
  name: string;
  description: string;
  category: string;
  price: number;
}

interface MultiStepAppFormProps {
  onComplete: (appId: number) => void;
  onCancel: () => void;
}

export const MultiStepAppForm: React.FC<MultiStepAppFormProps> = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [appId, setAppId] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState<AppFormData>({
    name: '',
    description: '',
    category: 'other',
    price: 9.99
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [showTerminal, setShowTerminal] = useState(false);
  const [deploymentCompleted, setDeploymentCompleted] = useState(false);
  
  // Use deployment hook for real-time logs
  const { isDeploying, logs, deploymentUrl, deployApp, clearLogs } = useDeployment();

  const steps = [
    { number: 1, title: 'App Information', icon: Info },
    { number: 2, title: 'Set Price', icon: DollarSign },
    { number: 3, title: 'Upload Code', icon: Upload },
    { number: 4, title: 'Deploy', icon: Rocket }
  ];

  const categories = [
    { value: 'productivity', label: 'Productivity' },
    { value: 'business', label: 'Business' },
    { value: 'education', label: 'Education' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'social', label: 'Social' },
    { value: 'finance', label: 'Finance' },
    { value: 'health', label: 'Health' },
    { value: 'other', label: 'Other' }
  ];

  const handleNext = async () => {
    setLoading(true);
    try {
      if (currentStep === 1) {
        // Create app with basic information
        const response = await api.post('/apps/', {
          name: formData.name,
          description: formData.description,
          category: formData.category,
          price: formData.price
        });
        setAppId(response.data.id);
      } else if (currentStep === 2 && appId) {
        // Update pricing
        await api.put(`/apps/${appId}/pricing`, {
          price: formData.price,
          category: formData.category,
          description: formData.description
        });
      } else if (currentStep === 3 && appId && uploadedFile) {
        // Upload file
        const formDataUpload = new FormData();
        formDataUpload.append('file', uploadedFile);
        await api.post(`/apps/${appId}/upload`, formDataUpload);
      }
      
      setCurrentStep(currentStep + 1);
    } catch (error) {
      console.error('Error in step:', error);
      alert('Error processing step. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDeploy = async () => {
    if (!appId) return;
    
    setLoading(true);
    setShowTerminal(true);
    clearLogs();
    
    try {
      await deployApp(appId, formData.name);
      setDeploymentCompleted(true);
      
      // Wait a bit for final status, then complete
      setTimeout(() => {
        onComplete(appId);
      }, 2000);
    } catch (error) {
      console.error('Deployment error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedFile(file);
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 1:
        return formData.name.trim() !== '' && formData.description.trim() !== '';
      case 2:
        return formData.price > 0;
      case 3:
        return uploadedFile !== null;
      default:
        return true;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-gray-900">Create New App</h2>
          <p className="text-gray-600 mt-1">Follow the steps to create and deploy your app</p>
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
                        ? 'bg-blue-500 border-blue-500 text-white' 
                        : 'border-gray-300 text-gray-400'
                  }`}>
                    {isCompleted ? <Check className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
                  </div>
                  <div className="ml-3">
                    <p className={`text-sm font-medium ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'}`}>
                      Step {step.number}
                    </p>
                    <p className={`text-xs ${isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-400'}`}>
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
              <h3 className="text-lg font-semibold text-gray-900">App Information</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  App Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your app name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description *
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={4}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what your app does"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Category
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  {categories.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Set Your App Price</h3>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Monthly Subscription Price (USD) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-2 text-gray-500">$</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0.99"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="9.99"
                  />
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Recommended: $9.99/month. Users will pay this amount to access your app.
                </p>
              </div>

              <div className="bg-blue-50 p-4 rounded-lg">
                <h4 className="font-medium text-blue-900">Pricing Tips</h4>
                <ul className="text-sm text-blue-700 mt-2 space-y-1">
                  <li>• Research similar apps in your category</li>
                  <li>• Consider your app's value and features</li>
                  <li>• You can change the price later</li>
                  <li>• Lower prices may attract more users initially</li>
                </ul>
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Upload Your App Code</h3>
              
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <div className="space-y-2">
                  <p className="text-lg font-medium text-gray-900">
                    {uploadedFile ? uploadedFile.name : 'Choose a ZIP file'}
                  </p>
                  <p className="text-gray-500">
                    Upload your app source code as a ZIP file
                  </p>
                  <input
                    type="file"
                    accept=".zip"
                    onChange={handleFileChange}
                    className="hidden"
                    id="file-upload"
                  />
                  <label
                    htmlFor="file-upload"
                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 cursor-pointer"
                  >
                    Select ZIP File
                  </label>
                </div>
              </div>

              <div className="bg-yellow-50 p-4 rounded-lg">
                <h4 className="font-medium text-yellow-900">Upload Requirements</h4>
                <ul className="text-sm text-yellow-700 mt-2 space-y-1">
                  <li>• File must be in ZIP format</li>
                  <li>• Include package.json for Node.js apps</li>
                  <li>• Include requirements.txt for Python apps</li>
                  <li>• Ensure all dependencies are listed</li>
                  <li>• Maximum file size: 50MB</li>
                </ul>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <h3 className="text-lg font-semibold text-gray-900">Ready to Deploy</h3>
              
              {!isDeploying && !deploymentCompleted && (
                <div className="bg-green-50 p-6 rounded-lg">
                  <div className="flex items-center">
                    <Check className="h-8 w-8 text-green-500 mr-3" />
                    <div>
                      <h4 className="font-medium text-green-900">App Ready for Deployment</h4>
                      <p className="text-green-700 mt-1">
                        Your app information, pricing, and code have been uploaded successfully.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Deployment Status */}
              {(isDeploying || deploymentCompleted) && (
                <div className={`p-6 rounded-lg ${deploymentCompleted ? 'bg-green-50' : 'bg-blue-50'}`}>
                  <div className="flex items-center">
                    {deploymentCompleted ? (
                      <Check className="h-8 w-8 text-green-500 mr-3" />
                    ) : (
                      <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mr-3"></div>
                    )}
                    <div>
                      <h4 className={`font-medium ${deploymentCompleted ? 'text-green-900' : 'text-blue-900'}`}>
                        {deploymentCompleted ? 'Deployment Complete!' : 'Deploying Your App...'}
                      </h4>
                      <p className={`mt-1 ${deploymentCompleted ? 'text-green-700' : 'text-blue-700'}`}>
                        {deploymentCompleted 
                          ? 'Your app has been successfully deployed and is now live!'
                          : 'Please wait while we deploy your app to Vercel. This may take a few minutes.'
                        }
                      </p>
                      {logs.length > 0 && (
                        <p className="text-sm mt-2 text-gray-600">
                          Latest: {logs[logs.length - 1]?.message}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  {deploymentUrl && (
                    <div className="mt-4 p-3 bg-white rounded border">
                      <p className="text-sm font-medium text-gray-700 mb-1">Live URL:</p>
                      <a 
                        href={deploymentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 underline break-all"
                      >
                        {deploymentUrl}
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="space-y-4">
                <h4 className="font-medium text-gray-900">App Summary</h4>
                <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                  <p><span className="font-medium">Name:</span> {formData.name}</p>
                  <p><span className="font-medium">Category:</span> {categories.find(c => c.value === formData.category)?.label}</p>
                  <p><span className="font-medium">Price:</span> ${formData.price}/month</p>
                  <p><span className="font-medium">File:</span> {uploadedFile?.name}</p>
                </div>
              </div>

              {!isDeploying && !deploymentCompleted && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="font-medium text-blue-900">What happens next?</h4>
                  <ul className="text-sm text-blue-700 mt-2 space-y-1">
                    <li>• Your app will be deployed to Vercel</li>
                    <li>• Framework will be automatically detected</li>
                    <li>• You'll receive a live URL when deployment completes</li>
                    <li>• App will be available in the marketplace after review</li>
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 flex justify-between">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Cancel
          </button>
          
          <div className="flex space-x-3">
            {currentStep > 1 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="flex items-center px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </button>
            )}
            
            {currentStep < 4 ? (
              <button
                onClick={handleNext}
                disabled={!canProceed() || loading}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Processing...' : 'Next'}
                <ChevronRight className="h-4 w-4 ml-1" />
              </button>
            ) : (
              <button
                onClick={handleDeploy}
                disabled={loading || isDeploying}
                className="flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeploying ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                    Deploying...
                  </>
                ) : deploymentCompleted ? (
                  <>
                    <Check className="h-4 w-4 mr-1" />
                    Deployed!
                  </>
                ) : loading ? (
                  'Processing...'
                ) : (
                  <>
                    Deploy App
                    <Rocket className="h-4 w-4 ml-1" />
                  </>
                )}
              </button>
            )}
            
            {/* Show Terminal Button */}
            {(isDeploying || logs.length > 0) && (
              <button
                onClick={() => setShowTerminal(true)}
                className="flex items-center px-4 py-2 border border-blue-500 text-blue-600 rounded-lg hover:bg-blue-50"
              >
                View Logs
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Deployment Terminal */}
      <DeploymentTerminal
        isOpen={showTerminal}
        onClose={() => setShowTerminal(false)}
        appName={formData.name}
        logs={logs}
        isDeploying={isDeploying}
        deploymentUrl={deploymentUrl}
      />
    </div>
  );
};