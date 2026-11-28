import { registerPlugin } from "@capacitor/core";

export interface TimerAlarmScheduleOptions {
  id: number;
  endsAt: number;
  title: string;
  body: string;
  stopLabel: string;
  channelName: string;
}

export interface TimerAlarmPlugin {
  isAvailable(): Promise<{ available: boolean }>;
  requestPermission(): Promise<{ granted: boolean }>;
  schedule(options: TimerAlarmScheduleOptions): Promise<void>;
  cancel(options: { id: number }): Promise<void>;
}

export const TimerAlarm = registerPlugin<TimerAlarmPlugin>("TimerAlarm");
