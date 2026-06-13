import React, { useEffect, useState } from 'react';

const mockEvents = [
  { id: 1, type: 'ai', message: 'AI Engine optimized CSE Department timetable', time: 'Just now', icon: '🤖' },
  { id: 2, type: 'status', message: 'All faculty presence synced with attendance', time: '2m ago', icon: '✅' },
  { id: 3, type: 'conflict', message: 'Auto-resolved room conflict in Block B', time: '5m ago', icon: '⚡' },
  { id: 4, type: 'user', message: 'New leave request from Prof. Sharma', time: '12m ago', icon: '📝' },
  { id: 5, type: 'system', message: 'Database backup completed successfully', time: '1h ago', icon: '💾' },
  { id: 6, type: 'ai', message: 'Searching for optimization gaps...', time: 'Live', icon: '🔍', pulse: true },
];

export default function LiveActivityFeed() {
  const [events, setEvents] = useState(mockEvents);

  useEffect(() => {
    const interval = setInterval(() => {
      // Simulate random live events
      const newEvent = {
        id: Date.now(),
        type: 'ai',
        message: 'AI Engine: Checking constraints...',
        time: 'Just now',
        icon: '🧠',
        pulse: true
      };
      setEvents(prev => [newEvent, ...prev.slice(0, 5)]);
    }, 15000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gray-950 border border-gray-900 rounded-[40px] p-8 shadow-2xl h-full flex flex-col">
      <div className="flex justify-between items-center mb-6">
        <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-2">
          <span className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
          Live Intelligence Feed
        </h3>
        <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Real-time</span>
      </div>

      <div className="space-y-4 flex-1 overflow-y-auto scrollbar-none">
        {events.map((event) => (
          <div 
            key={event.id} 
            className={`p-4 rounded-2xl bg-gray-900/40 border border-white/5 hover:border-indigo-500/30 transition-all duration-500 animate-in slide-in-from-right-4 fade-in`}
          >
            <div className="flex items-start gap-4">
              <div className={`text-xl ${event.pulse ? 'animate-bounce' : ''}`}>
                {event.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-gray-300 leading-relaxed truncate">
                  {event.message}
                </p>
                <p className="text-[9px] font-black text-gray-600 uppercase mt-1 tracking-tighter">
                  {event.time}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-900">
        <button className="w-full py-3 rounded-xl bg-indigo-600/10 border border-indigo-600/20 text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all shadow-lg">
            View All System Logs
        </button>
      </div>
    </div>
  );
}
