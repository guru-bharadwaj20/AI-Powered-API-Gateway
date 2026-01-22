import React from 'react';

const WelcomeModal = ({ onClose, onStartTour }) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-white rounded-xl sm:rounded-2xl shadow-large max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="gradient-primary text-white p-4 sm:p-6 rounded-t-xl sm:rounded-t-2xl text-center">
          <div className="text-4xl sm:text-5xl mb-3">🛡️</div>
          <h1 className="text-xl sm:text-2xl font-bold mb-2">Welcome to SafeRoute AI</h1>
          <p className="text-white/90 text-sm sm:text-base">Your Intelligent API Gateway for Fraud Detection</p>
        </div>

        {/* Body */}
        <div className="p-4 sm:p-6 space-y-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-gray-900 mb-2 flex items-center gap-2">
              <span>🎯</span> What is SafeRoute AI?
            </h3>
            <p className="text-sm sm:text-base text-gray-600">
              SafeRoute AI is an intelligent API gateway that protects your fintech platform by detecting fraud patterns in real-time using advanced AI algorithms.
            </p>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>✨</span> Key Features
            </h3>
            <ul className="space-y-2 text-gray-600">
              <li className="flex items-start gap-2">
                <span className="font-semibold text-gray-900 min-w-fit">Real-time Fraud Detection:</span>
                <span>AI analyzes every request instantly</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-gray-900 min-w-fit">Intelligent Routing:</span>
                <span>Automatically blocks or allows traffic based on risk</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-gray-900 min-w-fit">Complete Visibility:</span>
                <span>Monitor all API traffic and decisions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="font-semibold text-gray-900 min-w-fit">Interactive Testing:</span>
                <span>Try different scenarios with one click</span>
              </li>
            </ul>
          </div>

          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-3 flex items-center gap-2">
              <span>🚀</span> Quick Start Guide
            </h3>
            <ol className="space-y-2 text-gray-600 list-decimal list-inside">
              <li>Explore the <strong>Dashboard</strong> to see real-time metrics</li>
              <li>Use the <strong>Test Panel</strong> on the left to send API requests</li>
              <li>Try <strong>Demo Scenarios</strong> from the navigation menu</li>
              <li>Check the <strong>Live Stream</strong> to watch requests flow through</li>
            </ol>
          </div>

          <div className="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
            <p className="text-blue-900">
              <span className="font-semibold">💡 Tip:</span> Use the navigation menu to access settings and demo scenarios!
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 rounded-b-xl sm:rounded-b-2xl flex justify-end gap-2">
          <button
            onClick={onStartTour}
            className="px-4 py-2 text-sm bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg font-medium transition-colors duration-200"
          >
            Take a Tour
          </button>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm gradient-primary text-white rounded-lg font-medium hover:opacity-90 transition-opacity duration-200"
          >
            Get Started
          </button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeModal;
