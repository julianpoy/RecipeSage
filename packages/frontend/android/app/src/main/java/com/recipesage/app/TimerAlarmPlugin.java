package com.recipesage.app;

import android.app.AlarmManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.os.Build;
import androidx.core.app.NotificationManagerCompat;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;

@CapacitorPlugin(name = "TimerAlarm")
public class TimerAlarmPlugin extends Plugin {
    @PluginMethod
    public void schedule(PluginCall call) {
        Integer id = call.getInt("id");
        Long endsAt = call.getLong("endsAt");
        String title = call.getString("title");
        String body = call.getString("body");
        String stopLabel = call.getString("stopLabel");
        String channelName = call.getString("channelName");
        if (id == null || endsAt == null || title == null || body == null || stopLabel == null || channelName == null) {
            call.reject("id, endsAt, title, body, stopLabel and channelName are required");
            return;
        }

        Context context = getContext();
        TimerAlarmReceiver.createChannel(context, channelName);

        Intent ringIntent = new Intent(context, TimerAlarmReceiver.class)
            .setAction(TimerAlarmReceiver.ACTION_RING)
            .putExtra(TimerAlarmReceiver.EXTRA_ID, id.intValue())
            .putExtra(TimerAlarmReceiver.EXTRA_TITLE, title)
            .putExtra(TimerAlarmReceiver.EXTRA_BODY, body)
            .putExtra(TimerAlarmReceiver.EXTRA_STOP_LABEL, stopLabel);
        PendingIntent ringPendingIntent = PendingIntent.getBroadcast(
            context,
            id,
            ringIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        AlarmManager alarmManager = context.getSystemService(AlarmManager.class);
        long triggerAtMillis = endsAt;
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.S || alarmManager.canScheduleExactAlarms()) {
            AlarmManager.AlarmClockInfo alarmClockInfo = new AlarmManager.AlarmClockInfo(
                triggerAtMillis,
                TimerAlarmReceiver.createOpenAppIntent(context, id)
            );
            alarmManager.setAlarmClock(alarmClockInfo, ringPendingIntent);
        } else {
            alarmManager.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP, triggerAtMillis, ringPendingIntent);
        }

        call.resolve();
    }

    @PluginMethod
    public void cancel(PluginCall call) {
        Integer id = call.getInt("id");
        if (id == null) {
            call.reject("id is required");
            return;
        }

        Context context = getContext();
        Intent ringIntent = new Intent(context, TimerAlarmReceiver.class).setAction(TimerAlarmReceiver.ACTION_RING);
        PendingIntent ringPendingIntent = PendingIntent.getBroadcast(
            context,
            id,
            ringIntent,
            PendingIntent.FLAG_NO_CREATE | PendingIntent.FLAG_IMMUTABLE
        );
        if (ringPendingIntent != null) {
            context.getSystemService(AlarmManager.class).cancel(ringPendingIntent);
            ringPendingIntent.cancel();
        }
        NotificationManagerCompat.from(context).cancel(id);

        call.resolve();
    }
}
