import React, { useState } from 'react';

const HelpPanel = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 w-12 h-12 sm:w-14 sm:h-14 bg-primary hover:bg-primary-hover text-white rounded-full shadow-large flex items-center justify-center text-xl sm:text-2xl font-bold transition-all duration-200 hover:scale-110 z-40"
        title="Need help? Click for assistance"
      >
        ?
      </button>

      {isOpen && (
        <>
          <div 
            className="fixed inset-0 bg-black/20 z-40" 
            onClick={() => setIsOpen(false)}
          ></div>
          <div className="fixed bottom-20 right-4 w-[calc(100vw-2rem)] sm:w-80 max-w-sm bg-white rounded-xl shadow-large z-50 overflow-hidden">
            <div className="bg-primary text-white p-4 flex justify-between items-center">
              <h3 className="font-bold">Context Help</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-white hover:text-gray-200 text-2xl leading-none"
              >
                ×
              </button>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              <p className="mb-3">
                <strong>Welcome!</strong> This panel provides context-sensitive help based on what you're viewing.
              </p>
              
              <div className="mb-4">
                <h4 className="font-semibold mb-2">Dashboard Overview</h4>
                <p className="text-sm text-gray-600 mb-2">
                  This dashboard provides real-time monitoring of your API Gateway with AI-powered fraud detection.
                </p>
                <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                  <li><strong>Traffic Summary:</strong> Overall request statistics</li>
                  <li><strong>Risk Distribution:</strong> Breakdown by risk level</li>
                  <li><strong>Live Stream:</strong> Real-time request monitoring</li>
                  <li><strong>AI Analysis:</strong> Intelligent insights and alerts</li>
                </ul>
              </div>

              <div>
                <h4 className="font-semibold mb-2">Testing the Gateway</h4>
                <p className="text-sm text-gray-600 mb-2">
                  Use the test panel to send requests through the gateway:
                </p>
                <ol className="text-sm text-gray-600 space-y-1 list-decimal list-inside">
                  <li>Select an endpoint from the dropdown</li>
                  <li>Edit the JSON payload if needed</li>
                  <li>Click "Send Request"</li>
                  <li>Watch the response and live stream</li>
                </ol>
                <p className="text-sm text-gray-600 mt-2">
                  💡 Try the demo scenarios for pre-configured tests!
                </p>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
};

export default HelpPanel;
