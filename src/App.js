import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  // Setup state
  const [isSetupComplete, setIsSetupComplete] = useState(false);
  const [isSetupInProgress, setIsSetupInProgress] = useState(false);
  const [setupId, setSetupId] = useState(null);
  const [setupStatus, setSetupStatus] = useState(null);
  const [setupError, setSetupError] = useState('');

  // Main app state
  const [topic, setTopic] = useState('');
  const [examType, setExamType] = useState('SSC');
  const [pdfFormat, setPdfFormat] = useState('text');
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [error, setError] = useState('');

  // Check initial setup status on load
  useEffect(() => {
    checkSetupStatus();
  }, []);

  // Poll setup status
  useEffect(() => {
    if (!setupId || !isSetupInProgress) return;

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/setup-status/${setupId}`);
        setSetupStatus(response.data);

        if (response.data.status === 'completed') {
          setIsSetupComplete(true);
          setIsSetupInProgress(false);
          setSetupError('');
          clearInterval(interval);
        } else if (response.data.status === 'error') {
          setIsSetupInProgress(false);
          setSetupError(response.data.error_message || 'Setup failed');
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error fetching setup status:', err);
        setSetupError('Failed to fetch setup status');
        setIsSetupInProgress(false);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [setupId, isSetupInProgress]);

  // Poll job status (existing functionality)
  useEffect(() => {
    if (!jobId || !isGenerating) return;

    const interval = setInterval(async () => {
      try {
        const response = await axios.get(`${BACKEND_URL}/api/job-status/${jobId}`);
        setJobStatus(response.data);

        if (response.data.status === 'completed' || response.data.status === 'error') {
          setIsGenerating(false);
          clearInterval(interval);
        }
      } catch (err) {
        console.error('Error fetching job status:', err);
        setError('Failed to fetch job status');
        setIsGenerating(false);
        clearInterval(interval);
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [jobId, isGenerating]);

  const checkSetupStatus = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/api/setup-status`);
      setIsSetupComplete(response.data.is_setup_complete);
      setIsSetupInProgress(response.data.setup_in_progress);
      if (response.data.setup_error) {
        setSetupError(response.data.setup_error);
      }
    } catch (err) {
      console.error('Error checking setup status:', err);
    }
  };

  const handleStartMachine = async () => {
    try {
      setSetupError('');
      setSetupStatus(null);
      
      const response = await axios.post(`${BACKEND_URL}/api/setup`);
      
      if (response.data.status === 'started') {
        setSetupId(response.data.setup_id);
        setIsSetupInProgress(true);
        setSetupStatus({
          setup_id: response.data.setup_id,
          status: 'running',
          progress: 'Setup started...',
          step: 'initialization'
        });
      } else if (response.data.status === 'running') {
        setSetupError('Setup is already in progress');
      }
    } catch (err) {
      console.error('Error starting setup:', err);
      setSetupError(err.response?.data?.detail || 'Failed to start setup');
    }
  };

  const handleRetrySetup = async () => {
    try {
      setSetupError('');
      setSetupStatus(null);
      
      // First force reset the setup state
      await axios.post(`${BACKEND_URL}/api/setup/force-reset`);
      
      // Then start fresh setup
      await handleStartMachine();
    } catch (err) {
      console.error('Error retrying setup:', err);
      setSetupError(err.response?.data?.detail || 'Failed to retry setup');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!topic.trim()) {
      setError('Please enter a topic name');
      return;
    }

    setError('');
    setIsGenerating(true);
    setJobStatus(null);

    try {
      const response = await axios.post(`${BACKEND_URL}/api/generate-mcq-pdf`, {
        topic: topic.trim(),
        exam_type: examType,
        pdf_format: pdfFormat
      });

      setJobId(response.data.job_id);
      setJobStatus(response.data);
    } catch (err) {
      console.error('Error starting MCQ generation:', err);
      setError(err.response?.data?.detail || 'Failed to start MCQ generation');
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    if (jobStatus?.pdf_url) {
      window.open(`${BACKEND_URL}${jobStatus.pdf_url}`, '_blank');
    }
  };

  const resetForm = () => {
    setTopic('');
    setExamType('SSC');
    setPdfFormat('text');
    setIsGenerating(false);
    setJobId(null);
    setJobStatus(null);
    setError('');
  };

  const getProgressPercentage = () => {
    if (!jobStatus || jobStatus.total_links === 0) return 0;
    return Math.round((jobStatus.processed_links / jobStatus.total_links) * 100);
  };

  // Setup UI - shown when setup is not complete
  if (!isSetupComplete) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="max-w-2xl mx-auto px-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
            <div className="mb-6">
              <div className="w-24 h-24 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Backend Setup Required
              </h1>
              <p className="text-gray-600 mb-4">
                The application needs to initialize its backend dependencies before you can start extracting MCQs.
              </p>
              <p className="text-sm text-blue-600 font-medium">
                This process installs Playwright browsers and configures the scraping engine.
              </p>
            </div>

            {!isSetupInProgress ? (
              <div>
                <button
                  onClick={handleStartMachine}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-lg text-lg transition-colors duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-1"
                >
                  🚀 Start Machine
                </button>
                
                {setupError && (
                  <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                    <p className="text-red-800 font-medium">Setup Error:</p>
                    <p className="text-red-600 text-sm mt-1">{setupError}</p>
                    <button
                      onClick={handleRetrySetup}
                      className="mt-3 bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded text-sm transition-colors duration-200"
                    >
                      Retry Setup
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                  <span className="text-lg font-medium text-gray-700">Starting Machine...</span>
                </div>
                
                {setupStatus && (
                  <div className="bg-gray-50 rounded-lg p-4 text-left">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        setupStatus.status === 'running' 
                          ? 'bg-blue-100 text-blue-800' 
                          : setupStatus.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {setupStatus.status}
                      </span>
                    </div>
                    
                    <div className="text-sm text-gray-700 mb-2">
                      <strong>Progress:</strong> {setupStatus.progress}
                    </div>
                    
                    {setupStatus.step && (
                      <div className="text-sm text-gray-600">
                        <strong>Step:</strong> {setupStatus.step}
                      </div>
                    )}
                    
                    {setupStatus.status === 'running' && (
                      <div className="mt-3">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-500 animate-pulse"
                            style={{ width: '60%' }}
                          ></div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Main Application UI - shown after setup is complete
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Success message */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center mr-3">
                <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-green-800 font-medium">Machine is ready!</p>
                <p className="text-green-600 text-sm">Please enter your topic and enjoy the app.</p>
              </div>
            </div>
          </div>

          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              🔍 {examType}-Focused Testbook MCQ Extractor
            </h1>
            <p className="text-gray-600 mb-2">
              Extract {examType}-relevant MCQs with Smart Topic Filtering from Testbook
            </p>
            <p className="text-sm text-blue-600 font-medium">
              ✨ Now with Smart Filtering: Only extracts MCQs where your topic appears in the question body!
            </p>
          </div>

          {/* Main Card */}
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4">
              <h2 className="text-xl font-semibold text-white">Extract MCQs by Topic</h2>
            </div>
            
            <div className="p-6">
              {!isGenerating ? (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-2">
                      Enter Topic (e.g., "Heart", "Physics", "Mathematics")
                    </label>
                    <input
                      type="text"
                      id="topic"
                      value={topic}
                      onChange={(e) => setTopic(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                      placeholder="e.g., Heart, Physics, Mathematics"
                      required
                    />
                  </div>
                  
                  {/* Exam Type Selection */}
                  <div>
                    <label htmlFor="examType" className="block text-sm font-medium text-gray-700 mb-2">
                      Select Exam Type
                    </label>
                    <select
                      id="examType"
                      value={examType}
                      onChange={(e) => setExamType(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                    >
                      <option value="SSC">SSC (Staff Selection Commission)</option>
                      <option value="BPSC">BPSC (Bihar Public Service Commission)</option>
                    </select>
                  </div>
                  
                  {/* PDF Format Selection */}
                  <div>
                    <label htmlFor="pdfFormat" className="block text-sm font-medium text-gray-700 mb-2">
                      Select PDF Format
                    </label>
                    <select
                      id="pdfFormat"
                      value={pdfFormat}
                      onChange={(e) => setPdfFormat(e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-colors"
                    >
                      <option value="text">Text Form (Traditional PDF with text)</option>
                      <option value="image">Image Form (Screenshots of MCQ pages)</option>
                    </select>
                  </div>
                  
                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-red-800 text-sm">{error}</p>
                    </div>
                  )}
                  
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    🚀 Generate {examType} MCQ PDF ({pdfFormat === 'text' ? 'Text' : 'Image'} Format)
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                    <span className="text-lg font-medium">Generating {examType} MCQ PDF ({pdfFormat === 'text' ? 'Text' : 'Image'} Format)...</span>
                  </div>
                  
                  {jobStatus && (
                    <div className="bg-gray-50 rounded-lg p-4">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium text-gray-600">Status:</span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            jobStatus.status === 'running' 
                              ? 'bg-blue-100 text-blue-800' 
                              : jobStatus.status === 'completed'
                              ? 'bg-green-100 text-green-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {jobStatus.status}
                          </span>
                        </div>
                        
                        <div className="text-sm text-gray-700">
                          <strong>Progress:</strong> {jobStatus.progress}
                        </div>
                        
                        {jobStatus.total_links > 0 && (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-gray-600">
                              <span>Links processed: {jobStatus.processed_links}/{jobStatus.total_links}</span>
                              <span>MCQs found: {jobStatus.mcqs_found}</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                                style={{ width: `${getProgressPercentage()}%` }}
                              ></div>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Results */}
          {jobStatus && jobStatus.status === 'completed' && (
            <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-green-800 mb-2">📄 PDF Generated Successfully!</h3>
              <p className="text-green-700 text-sm mb-2">
                Found {jobStatus.mcqs_found} {examType} MCQs related to "{topic}"
              </p>
              <p className="text-green-600 text-xs mb-4">
                Format: {pdfFormat === 'text' ? 'Text-based PDF' : 'Image-based PDF with screenshots'}
              </p>
              <div className="flex space-x-3">
                <button
                  onClick={handleDownload}
                  className="bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  📥 Download PDF
                </button>
                <button
                  onClick={resetForm}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  🔄 Extract Another Topic
                </button>
              </div>
            </div>
          )}
          
          {jobStatus && jobStatus.status === 'error' && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">❌ Error Occurred</h3>
              <p className="text-red-700 text-sm mb-4">{jobStatus.progress}</p>
              <button
                onClick={resetForm}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                🔄 Try Again
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Information Card */}
      <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <h3 className="text-lg font-semibold text-blue-800 mb-2">ℹ️ Format Information</h3>
        <div className="space-y-2 text-sm">
          <div>
            <span className="font-medium text-blue-700">Text Format:</span>
            <span className="text-blue-600 ml-2">Traditional PDF with extracted text, questions, and answers</span>
          </div>
          <div>
            <span className="font-medium text-blue-700">Image Format:</span>
            <span className="text-blue-600 ml-2">Screenshots of actual Testbook pages showing MCQs with original formatting</span>
          </div>
          <div>
            <span className="font-medium text-blue-700">Exam Types:</span>
            <span className="text-blue-600 ml-2">SSC (Staff Selection Commission) and BPSC (Bihar Public Service Commission)</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
