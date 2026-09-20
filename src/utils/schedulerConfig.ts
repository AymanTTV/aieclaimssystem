// src/utils/schedulerConfig.ts
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface DayOfWeekOption {
  value: number; // 0 = Sunday, 1 = Monday, ..., 6 = Saturday
  label: string;
  shortName: string;
  plural: string;
}

export const DAYS_OF_WEEK: DayOfWeekOption[] = [
  { value: 1, label: 'Every Monday', shortName: 'Monday', plural: 'Mondays' },
  { value: 2, label: 'Every Tuesday', shortName: 'Tuesday', plural: 'Tuesdays' },
  { value: 3, label: 'Every Wednesday', shortName: 'Wednesday', plural: 'Wednesdays' },
  { value: 4, label: 'Every Thursday', shortName: 'Thursday', plural: 'Thursdays' },
  { value: 5, label: 'Every Friday', shortName: 'Friday', plural: 'Fridays' },
  { value: 6, label: 'Every Saturday', shortName: 'Saturday', plural: 'Saturdays' },
  { value: 0, label: 'Every Sunday', shortName: 'Sunday', plural: 'Sundays' },
];

export const SCHEDULE_TIME_OPTIONS: Array<{ value: string; label: string }> = [
  { value: '06:00', label: '06:00 AM' },
  { value: '06:30', label: '06:30 AM' },
  { value: '07:00', label: '07:00 AM' },
  { value: '07:30', label: '07:30 AM' },
  { value: '08:00', label: '08:00 AM' },
  { value: '08:30', label: '08:30 AM' },
  { value: '09:00', label: '09:00 AM' },
  { value: '09:30', label: '09:30 AM' },
  { value: '10:00', label: '10:00 AM' },
  { value: '10:30', label: '10:30 AM' },
  { value: '11:00', label: '11:00 AM' },
  { value: '11:30', label: '11:30 AM' },
  { value: '12:00', label: '12:00 PM' },
  { value: '12:30', label: '12:30 PM' },
  { value: '13:00', label: '01:00 PM' },
  { value: '13:30', label: '01:30 PM' },
  { value: '14:00', label: '02:00 PM' },
  { value: '14:30', label: '02:30 PM' },
  { value: '15:00', label: '03:00 PM' },
  { value: '15:30', label: '03:30 PM' },
  { value: '16:00', label: '04:00 PM' },
  { value: '16:30', label: '04:30 PM' },
  { value: '17:00', label: '05:00 PM' },
  { value: '17:30', label: '05:30 PM' },
  { value: '18:00', label: '06:00 PM' },
  { value: '19:00', label: '07:00 PM' },
  { value: '20:00', label: '08:00 PM' },
];

export function getDayInfo(day: number): DayOfWeekOption {
  const found = DAYS_OF_WEEK.find(d => d.value === day);
  return found || DAYS_OF_WEEK[0];
}

export function formatTime12h(time24: string): string {
  if (!time24) return '09:00 AM';
  const parts = time24.split(':');
  if (parts.length < 2) return time24;
  let hour = parseInt(parts[0], 10);
  const min = parts[1].padStart(2, '0');
  if (isNaN(hour)) return '09:00 AM';
  const ampm = hour >= 12 ? 'PM' : 'AM';
  hour = hour % 12;
  if (hour === 0) hour = 12;
  return `${hour.toString().padStart(2, '0')}:${min} ${ampm}`;
}

export function generateCronExpression(day: number, time24: string): string {
  const parts = (time24 || '09:00').split(':');
  const minute = parseInt(parts[1] || '0', 10);
  const hour = parseInt(parts[0] || '9', 10);
  return `${minute} ${hour} * * ${day}`;
}

export interface SchedulerPreferences {
  scheduleDay: number;
  scheduleTime: string;
  scheduleCron: string;
}

export async function fetchSchedulerPreferences(): Promise<SchedulerPreferences> {
  try {
    const snap = await getDoc(doc(db, 'system_settings', 'global_config'));
    if (snap.exists()) {
      const data = snap.data();
      const scheduleDay = data?.schedule_day !== undefined ? Number(data.schedule_day) : 1;
      const scheduleTime = data?.schedule_time || '09:00';
      const scheduleCron = data?.schedule_cron || generateCronExpression(scheduleDay, scheduleTime);
      return { scheduleDay, scheduleTime, scheduleCron };
    }
  } catch (err) {
    console.warn('[SchedulerConfig] Could not read from Firestore, checking localStorage:', err);
  }

  // Fallback to localStorage
  const localDay = localStorage.getItem('scheduler_schedule_day');
  const localTime = localStorage.getItem('scheduler_schedule_time');
  const scheduleDay = localDay !== null ? Number(localDay) : 1;
  const scheduleTime = localTime || '09:00';
  return {
    scheduleDay,
    scheduleTime,
    scheduleCron: generateCronExpression(scheduleDay, scheduleTime),
  };
}

export async function saveSchedulerPreferences(day: number, time: string): Promise<SchedulerPreferences> {
  const cron = generateCronExpression(day, time);
  const dayInfo = getDayInfo(day);

  // Update localStorage immediately
  localStorage.setItem('scheduler_schedule_day', String(day));
  localStorage.setItem('scheduler_schedule_time', time);
  localStorage.setItem('scheduler_schedule_cron', cron);

  // Persist to Firestore
  try {
    await setDoc(
      doc(db, 'system_settings', 'global_config'),
      {
        schedule_day: day,
        schedule_day_name: dayInfo.shortName,
        schedule_time: time,
        schedule_time_12h: formatTime12h(time),
        schedule_cron: cron,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );

    // Also mirror in settings/automation for legacy fallbacks
    await setDoc(
      doc(db, 'settings', 'automation'),
      {
        schedule_day: day,
        schedule_day_name: dayInfo.shortName,
        schedule_time: time,
        schedule_cron: cron,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    console.error('[SchedulerConfig] Error saving scheduler preferences to Firestore:', err);
    throw err;
  }

  // Broadcast event across components
  window.dispatchEvent(
    new CustomEvent('schedulerConfigUpdated', {
      detail: { scheduleDay: day, scheduleTime: time, scheduleCron: cron },
    })
  );

  return { scheduleDay: day, scheduleTime: time, scheduleCron: cron };
}
