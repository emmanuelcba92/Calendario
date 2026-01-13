
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { AppTab, CalendarEvent, Alarm } from './types';
import CalendarView from './components/CalendarView';
import UpcomingView from './components/UpcomingView';
import AlarmsView from './components/AlarmsView';
import NavigationBar from './components/NavigationBar';
import Header from './components/Header';

// Mock sound URLs - in a real app these would be assets
const SOUND_MAP: Record<string, string> = {
  'digital': 'https://actions.google.com/sounds/v1/alarms/digital_watch_alarm_long.ogg',
  'zen': 'https://actions.google.com/sounds/v1/alarms/beep_short.ogg',
  'forest': 'https://actions.google.com/sounds/v1/ambiences/morning_birds.ogg',
  'aurora': 'https://actions.google.com/sounds/v1/alarms/mechanical_clock_ringing.ogg'
};

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AppTab>('calendar');
  const [isDark, setIsDark] = useState(false);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [isSyncing, setIsSyncing] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Initialize data and permissions
  useEffect(() => {
    const savedEvents = localStorage.getItem('nova_events');
    const savedAlarms = localStorage.getItem('nova_alarms');
    const savedTheme = localStorage.getItem('nova_theme');

    if (savedEvents) setEvents(JSON.parse(savedEvents));
    if (savedAlarms) setAlarms(JSON.parse(savedAlarms));
    if (savedTheme === 'dark') setIsDark(true);

    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    const interval = setInterval(checkAlarmsAndEvents, 15000); // Check more frequently
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    localStorage.setItem('nova_events', JSON.stringify(events));
  }, [events]);

  useEffect(() => {
    localStorage.setItem('nova_alarms', JSON.stringify(alarms));
  }, [alarms]);

  useEffect(() => {
    localStorage.setItem('nova_theme', isDark ? 'dark' : 'light');
    if (isDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDark]);

  const playAlarmSound = (soundKey: string) => {
    let url = SOUND_MAP[soundKey];
    
    // Check if it's a custom base64 sound
    if (!url && soundKey.startsWith('data:audio/')) {
      url = soundKey;
    }
    
    // Fallback
    if (!url) url = SOUND_MAP['digital'];

    if (audioRef.current) {
      audioRef.current.pause();
    }
    audioRef.current = new Audio(url);
    audioRef.current.play().catch(e => console.error("Audio playback failed", e));
    
    // Stop after 30 seconds if not handled
    setTimeout(() => {
      if (audioRef.current) audioRef.current.pause();
    }, 30000);
  };

  const checkAlarmsAndEvents = useCallback(() => {
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().slice(0, 5);

    // Check Alarms
    alarms.forEach(alarm => {
      if (alarm.isEnabled && alarm.date === currentDate && alarm.time === currentTime) {
        triggerNotification(`⏰ Alarma: ${alarm.title}`, `Es hora: ${alarm.time}`);
        playAlarmSound(alarm.sound);
        toggleAlarm(alarm.id);
      }
    });

    // Check Events (10 mins before)
    events.forEach(event => {
      if (event.date === currentDate) {
        const [h, m] = event.time.split(':').map(Number);
        const eventDate = new Date();
        eventDate.setHours(h, m, 0, 0);
        const diff = (eventDate.getTime() - now.getTime()) / 60000;
        
        if (diff > 0 && diff <= 10 && diff > 9.7) {
          triggerNotification(`📅 Próximo evento: ${event.title}`, `Inicia en 10 minutos (${event.time})`);
        }
      }
    });
  }, [alarms, events]);

  const triggerNotification = (title: string, body: string) => {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: 'https://picsum.photos/128/128' });
    } else {
      alert(`${title}\n${body}`);
    }
  };

  const toggleTheme = () => setIsDark(!isDark);

  const handleSync = async () => {
    setIsSyncing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    if (events.length === 0) {
      const mockEvents: CalendarEvent[] = [
        { id: '1', title: 'Reunión de Equipo', date: new Date().toISOString().split('T')[0], time: '10:00', color: 'indigo', description: 'Google Calendar Sync' },
        { id: '2', title: 'Cita Médica', date: new Date(Date.now() + 86400000).toISOString().split('T')[0], time: '15:30', color: 'rose', description: 'Revisión anual' },
      ];
      setEvents(mockEvents);
    }
    
    setIsSyncing(false);
  };

  const addEvent = (event: CalendarEvent) => setEvents([...events, event]);
  const deleteEvent = (id: string) => setEvents(events.filter(e => e.id !== id));
  
  const addAlarm = (alarm: Alarm) => setAlarms([...alarms, alarm]);
  const deleteAlarm = (id: string) => setAlarms(alarms.filter(a => a.id !== id));
  const toggleAlarm = (id: string) => {
    setAlarms(prev => prev.map(a => a.id === id ? { ...a, isEnabled: !a.isEnabled } : a));
  };

  return (
    <div className="min-h-screen flex flex-col max-w-md mx-auto bg-white dark:bg-slate-900 shadow-xl overflow-hidden relative transition-colors duration-300">
      <Header 
        isDark={isDark} 
        onToggleTheme={toggleTheme} 
        onSync={handleSync}
        isSyncing={isSyncing}
      />
      
      <main className="flex-1 overflow-y-auto pb-24 px-4 pt-4">
        {activeTab === 'calendar' && (
          <CalendarView events={events} onAddEvent={addEvent} />
        )}
        {activeTab === 'upcoming' && (
          <UpcomingView events={events} onDeleteEvent={deleteEvent} />
        )}
        {activeTab === 'alarms' && (
          <AlarmsView alarms={alarms} onAddAlarm={addAlarm} onDeleteAlarm={deleteAlarm} onToggleAlarm={toggleAlarm} />
        )}
      </main>

      <NavigationBar activeTab={activeTab} setActiveTab={setActiveTab} />
      
      {isSyncing && (
        <div className="absolute inset-0 bg-white/50 dark:bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-2xl shadow-2xl flex flex-col items-center">
            <div className="animate-spin rounded-full h-10 w-10 border-4 border-indigo-500 border-t-transparent mb-4"></div>
            <p className="text-slate-700 dark:text-slate-200 font-medium">Sincronizando con Google...</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
