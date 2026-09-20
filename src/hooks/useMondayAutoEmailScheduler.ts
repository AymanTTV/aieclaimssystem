// src/hooks/useMondayAutoEmailScheduler.ts
import { useEffect, useRef } from 'react';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { runMondayAutoEmailJob } from '../jobs/mondayAutoEmailJob';

/**
 * Automates the Monday Payment Reminder schedule:
 * Runs automatically every Monday at 09:00 AM (Cron: 0 9 * * 1)
 * Prior to 09:00 AM on Monday, users can edit or select alternate templates.
 * Idempotently executes once per Monday by tracking last_monday_job_run in Firestore.
 */
export function useMondayAutoEmailScheduler() {
  const isRunningRef = useRef(false);

  useEffect(() => {
    const checkAndExecuteMondayJob = async () => {
      if (isRunningRef.current) return;

      try {
        const configRef = doc(db, 'system_settings', 'global_config');
        const snap = await getDoc(configRef);

        let schedDay = 1; // default Monday (0=Sun, 1=Mon, ..., 6=Sat)
        let schedHours = 9;
        let schedMinutes = 0;

        if (snap.exists()) {
          const data = snap.data();
          // Check if global automation is disabled
          if (data?.global_auto_email_enabled === false) {
            return;
          }
          if (data?.schedule_day !== undefined) {
            schedDay = Number(data.schedule_day);
          }
          if (data?.schedule_time) {
            const [h, m] = String(data.schedule_time).split(':').map(Number);
            if (!isNaN(h)) schedHours = h;
            if (!isNaN(m)) schedMinutes = m;
          }

          const now = new Date();
          const isTargetDay = now.getDay() === schedDay;
          if (!isTargetDay) return;

          const currentTotalMinutes = now.getHours() * 60 + now.getMinutes();
          const targetTotalMinutes = schedHours * 60 + schedMinutes;
          if (currentTotalMinutes < targetTotalMinutes) {
            return;
          }

          const currentDayStr = now.toISOString().slice(0, 10);
          // Check if already ran today (prevents duplicate dispatches)
          if (
            data?.last_scheduled_job_run === currentDayStr ||
            (schedDay === 1 && data?.last_monday_job_run === currentDayStr)
          ) {
            return;
          }

          isRunningRef.current = true;
          console.log(`[AutoEmailScheduler] Executing scheduled automated reminder job for ${currentDayStr} (Day ${schedDay}, ${schedHours}:${schedMinutes})...`);

          // Mark run in progress before dispatch
          await setDoc(
            configRef,
            {
              last_scheduled_job_run: currentDayStr,
              last_monday_job_run: currentDayStr,
              last_scheduled_job_timestamp: serverTimestamp(),
            },
            { merge: true }
          );

          await runMondayAutoEmailJob({ isTestRun: false, bypassGlobalToggle: false });
        }
      } catch (err) {
        console.error('[AutoEmailScheduler] Error executing automated schedule job:', err);
      } finally {
        isRunningRef.current = false;
      }
    };

    // Run check on mount
    checkAndExecuteMondayJob();

    // Check periodically every 60 seconds
    const intervalId = setInterval(checkAndExecuteMondayJob, 60 * 1000);

    return () => clearInterval(intervalId);
  }, []);
}
