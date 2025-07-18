import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';

function App() {
  // Main app state
  const [topic, setTopic] = useState('');
  const [examType, setExamType] = useState('SSC');
  const [pdfFormat, setPdfFormat] = useState('text');
  const [isGenerating, setIsGenerating] = useState(false);
  const [jobId, setJobId] = useState(null);
  const [jobStatus, setJobStatus] = useState(null);
  const [error, setError] = useState('');

  // Poll job status
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 mb-2">
              ðŸ“š {examType}-Focused Testbook MCQ Extractor
            </h1>
            <p className="text-gray-600 mb-2">
              Extract {examType}-relevant MCQs with Smart Topic Filtering from Testbook
            </p>
            <p className="text-sm text-blue-600 font-medium">
              âœ¨ Now with Smart Filtering: Only extracts MCQs where your topic appears in the question body!
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
                    ðŸš€ Generate {examType} MCQ PDF ({pdfFormat === 'text' ? 'Text' : 'Image'} Format)
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
              <h3 className="text-lg font-semibold text-green-800 mb-2">ðŸ“„ PDF Generated Successfully!</h3>
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
                  ðŸ“¥ Download PDF
                </button>
                <button
                  onClick={resetForm}
                  className="bg-gray-600 hover:bg-gray-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
                >
                  ðŸ”„ Extract Another Topic
                </button>
              </div>
            </div>
          )}
          
          {jobStatus && jobStatus.status === 'error' && (
            <div className="mt-6 bg-red-50 border border-red-200 rounded-lg p-4">
              <h3 className="text-lg font-semibold text-red-800 mb-2">âš ï¸ Error Occurred</h3>
              <p className="text-red-700 text-sm mb-4">{jobStatus.progress}</p>
              <button
                onClick={resetForm}
                className="bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200"
              >
                ðŸ”„ Try Again
              </button>
            </div>
          )}
        </div>
      </div>
      
      {/* Information Card */}
      <div className="container mx-auto px-4 pb-8">
        <div className="max-w-2xl mx-auto">
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="text-lg font-semibold text-blue-800 mb-2">â„¹ï¸ Format Information</h3>
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
      </div>
    </div>
  );
}

export default App;
