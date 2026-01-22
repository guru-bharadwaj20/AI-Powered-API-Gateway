import React from 'react';

const NotificationContainer = ({ notifications }) => {
  const icons = {
    success: '✅',
    error: '❌',
    warning: '⚠️',
    info: 'ℹ️'
  };

  const colors = {
    success: 'bg-green-50 border-green-500 text-green-900',
    error: 'bg-red-50 border-red-500 text-red-900',
    warning: 'bg-yellow-50 border-yellow-500 text-yellow-900',
    info: 'bg-blue-50 border-blue-500 text-blue-900'
  };

  return (
    <div className="fixed top-16 sm:top-20 right-2 sm:right-4 z-50 space-y-2 w-[calc(100%-1rem)] sm:w-80 max-w-sm">
      {notifications.map((notification) => (
        <div
          key={notification.id}
          className={`border-l-4 p-3 rounded-lg shadow-large animate-slide-in ${colors[notification.type]}`}
        >
          <div className="flex items-start gap-2">
            <div className="text-xl flex-shrink-0">{icons[notification.type]}</div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm mb-0.5">{notification.title}</div>
              <div className="text-xs opacity-90">{notification.message}</div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

export default NotificationContainer;
