package com.recipesage.app;

import android.Manifest;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.media.AudioAttributes;
import android.media.AudioManager;
import android.net.Uri;
import android.os.Build;
import androidx.core.app.NotificationCompat;
import androidx.core.app.NotificationManagerCompat;
import androidx.core.content.ContextCompat;

public class TimerAlarmReceiver extends BroadcastReceiver {
    static final String ACTION_RING = "com.recipesage.app.TIMER_ALARM_RING";
    static final String ACTION_STOP = "com.recipesage.app.TIMER_ALARM_STOP";
    static final String EXTRA_ID = "id";
    static final String EXTRA_TITLE = "title";
    static final String EXTRA_BODY = "body";
    static final String EXTRA_STOP_LABEL = "stopLabel";

    private static final String CHANNEL_ID = "timer_alarms";
    private static final long[] VIBRATION_PATTERN = { 0, 500, 500, 500, 500, 500 };

    @Override
    public void onReceive(Context context, Intent intent) {
        int id = intent.getIntExtra(EXTRA_ID, 0);

        if (ACTION_STOP.equals(intent.getAction())) {
            NotificationManagerCompat.from(context).cancel(id);
            return;
        }
        if (!ACTION_RING.equals(intent.getAction())) return;

        if (
            Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
            ContextCompat.checkSelfPermission(context, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED
        ) {
            return;
        }

        Intent stopIntent = new Intent(context, TimerAlarmReceiver.class).setAction(ACTION_STOP).putExtra(EXTRA_ID, id);
        PendingIntent stopPendingIntent = PendingIntent.getBroadcast(
            context,
            id,
            stopIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
            .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
            .setContentTitle(intent.getStringExtra(EXTRA_TITLE))
            .setContentText(intent.getStringExtra(EXTRA_BODY))
            .setCategory(NotificationCompat.CATEGORY_ALARM)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
            .setContentIntent(createOpenAppIntent(context, id))
            .setAutoCancel(true)
            .addAction(0, intent.getStringExtra(EXTRA_STOP_LABEL), stopPendingIntent);

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            builder.setSound(getSoundUri(context), AudioManager.STREAM_ALARM).setVibrate(VIBRATION_PATTERN);
        }

        Notification notification = builder.build();
        notification.flags |= Notification.FLAG_INSISTENT;

        NotificationManagerCompat.from(context).notify(id, notification);
    }

    static void createChannel(Context context, String name) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        AudioAttributes audioAttributes = new AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ALARM)
            .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
            .build();

        NotificationChannel channel = new NotificationChannel(CHANNEL_ID, name, NotificationManager.IMPORTANCE_HIGH);
        channel.setSound(getSoundUri(context), audioAttributes);
        channel.enableVibration(true);
        channel.setVibrationPattern(VIBRATION_PATTERN);
        channel.setLockscreenVisibility(Notification.VISIBILITY_PUBLIC);

        context.getSystemService(NotificationManager.class).createNotificationChannel(channel);
    }

    static PendingIntent createOpenAppIntent(Context context, int id) {
        Intent launchIntent = context.getPackageManager().getLaunchIntentForPackage(context.getPackageName());
        return PendingIntent.getActivity(
            context,
            id,
            launchIntent,
            PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
    }

    private static Uri getSoundUri(Context context) {
        return Uri.parse("android.resource://" + context.getPackageName() + "/" + R.raw.timer_alarm);
    }
}
