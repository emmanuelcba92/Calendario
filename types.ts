
export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // ISO string YYYY-MM-DD
  time: string; // HH:mm
  color: string;
}

export interface Alarm {
  id: string;
  title: string;
  date: string; // ISO string YYYY-MM-DD
  time: string; // HH:mm
  isEnabled: boolean;
  sound: string; // Key for the selected sound
}

export type AppTab = 'calendar' | 'upcoming' | 'alarms';

export interface ThemeContextType {
  isDark: boolean;
  toggleTheme: () => void;
}
