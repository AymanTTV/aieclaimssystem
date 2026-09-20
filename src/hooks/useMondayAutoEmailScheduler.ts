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

      const now = new Date();
      // Day 1 is Monday in JavaScript (0 = Sunday, 1 = Monday)
      const isMonday = now.getDay() === 1;
      if (!isMonday) return;

      // Scheduled 09:00 AM auto-dispatch (Cron: 0 9 * * 1)
      // Only dispatches once 09:00 AM arrives on Monday
      if (now.getHours() < 9) {
        return;
      }

      const currentMondayStr = now.toISOString().slice(0, 10);

      try {
        isRunningRef.current = true;
        const configRef = doc(db, 'system_settings', 'global_config');
        const snap = await getDoc(configRef);

        if (snap.exists()) {
          const data = snap.data();
          // Check if global automation is disabled
          if (data?.global_auto_email_enabled === false) {
            return;
          }
          // Check if already ran for today's Monday
          if (data?.last_monday_job_run === currentMondayStr) {
            return;
          }
        }

        console.log(`[MondayScheduler] Executing scheduled Monday 09:00 AM job for ${currentMondayStr}...`);
        // Mark run in progress
        await setDoc(
          configRef,
          {
            last_monday_job_run: currentMondayStr,
            last_monday_job_timestamp: serverTimestamp(),
          },
          { merge: true }
        );

        await runMondayAutoEmailJob({ isTestRun: false, bypassGlobalToggle: false });
      } catch (err) {
        console.error('[MondayScheduler] Error executing automated Monday job:', err);
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
