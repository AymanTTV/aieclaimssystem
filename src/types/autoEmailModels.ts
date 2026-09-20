/**
 * Model updates for automated email configuration.
 *
 * 1. RentalWithAutoEmail: Adds `enable_monday_auto_email` (default: true)
 * 2. SystemSettings: Defines system configuration with `global_auto_email_enabled` (default: true)
 */

import { Rental } from './rental';

export interface RentalAutoEmailExtension {
  /**
   * Whether automated Monday invoice/reminder emails are enabled for this rental.
   * @default true
   */
  enable_monday_auto_email: boolean;
}

export type RentalWithAutoEmail = Rental & RentalAutoEmailExtension;

export interface SystemSettings {
  id?: string;
  /**
   * Master kill-switch / toggle controlling whether automated emails are dispatched system-wide.
   * @default true
   */
  global_auto_email_enabled: boolean;
  updatedAt?: Date | string;
  updatedBy?: string;
}

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  global_auto_email_enabled: true,
};
