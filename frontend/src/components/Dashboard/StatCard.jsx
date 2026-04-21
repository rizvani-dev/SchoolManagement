import React from 'react';

const StatCard = ({ title, value, icon: Icon, color = 'blue' }) => {
  const colorClasses = {
    blue: 'from-blue-500 to-indigo-600',
    green: 'from-emerald-500 to-teal-600',
    purple: 'from-violet-500 to-purple-600',
    orange: 'from-orange-500 to-amber-600'
  };

  return (
    <div className={`stat-card bg-gradient-to-br ${colorClasses[color]} text-white rounded-2xl p-6`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm opacity-90">{title}</p>
          <p className="text-4xl font-bold mt-2">{value}</p>
        </div>
        <div className="text-5xl opacity-80">
          <Icon />
        </div>
      </div>
    </div>
  );
};

export default StatCard;