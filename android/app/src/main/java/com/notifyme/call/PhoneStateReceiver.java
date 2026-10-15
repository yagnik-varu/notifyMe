package com.notifyme.call;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.telephony.TelephonyManager;

import androidx.work.BackoffPolicy;
import androidx.work.Constraints;
import androidx.work.Data;
import androidx.work.NetworkType;
import androidx.work.OneTimeWorkRequest;
import androidx.work.WorkManager;

import com.notifyme.schedule.EventGate;

import java.util.concurrent.TimeUnit;

/**
 * PhoneStateReceiver — the call detector, and the START of every call alert.
 *
 * <p>Who calls it: Android itself. It's declared in AndroidManifest.xml for the
 * {@code PHONE_STATE} broadcast, so the system wakes the app and calls
 * {@link #onReceive} every time the phone state changes — even when the app is closed
 * (the process is started just for this).
 *
 * <p>What it calls: {@link EventGate} (should we alert at all?) and then queues a
 * {@link CallEventWorker} with WorkManager to do the slow part in the background.
 *
 * <p>It tracks the call lifecycle to tell answered calls from missed ones:
 * <pre>
 *   IDLE -> RINGING            : incoming call      -> queue CallEventWorker(RING)
 *   RINGING -> OFFHOOK         : the call was answered (remember that)
 *   (RINGING|OFFHOOK) -> IDLE  : call ended; if never answered it was MISSED
 *                                -> queue CallEventWorker(ENDED, wasMissed=true)
 * </pre>
 *
 * <p>⚠ GOTCHA ("open the app once"): Android keeps a freshly installed app in a
 * "stopped" state and won't deliver broadcasts to it until the user opens it once.
 * After that it keeps working across reboots.
 *
 * <p>⚠ GOTCHA: onReceive must return within ~10 seconds, and the process may be killed
 * right after. That's why nothing slow (call-log lookups, HTTP) happens here — it is
 * all handed to WorkManager.
 */
public class PhoneStateReceiver extends BroadcastReceiver {

    // WHY static: Android creates a NEW receiver object for every broadcast and throws it
    // away afterwards, so instance fields would forget everything between RINGING and
    // IDLE. Static fields live as long as the app process. volatile = always read the
    // latest value across threads. A fresh process starts at IDLE, so the first RINGING
    // still fires.
    private static volatile String lastState = TelephonyManager.EXTRA_STATE_IDLE;
    private static volatile boolean ringing = false;
    private static volatile boolean answered = false;
    private static volatile long ringStart = 0L;
    // Legacy broadcast number — present on Android < 10 and some OEMs, empty on 10+.
    private static volatile String ringNumber = "";

    /** Called by Android on every phone-state change (ringing / off-hook / idle). */
    @Override
    public void onReceive(Context context, Intent intent) {
        if (!TelephonyManager.ACTION_PHONE_STATE_CHANGED.equals(intent.getAction())) return;

        String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
        if (state == null) return;

        String previous = lastState;
        // WHY: some phones send the same state twice (e.g. once per permission held).
        if (state.equals(previous)) return;
        lastState = state;

        if (TelephonyManager.EXTRA_STATE_RINGING.equals(state)) {
            ringing = true;
            answered = false;
            ringStart = System.currentTimeMillis();
            // ⚠ GOTCHA: on Android 10+ this extra is empty for normal apps (privacy), so
            // CallEventWorker has to find the number elsewhere (screening cache / call log).
            String n = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);
            ringNumber = n == null ? "" : n;
            // The single, universal trigger. CallScreenService only caches the number,
            // it never queues work, so there are no duplicate alerts.
            enqueue(context, CallEventWorker.MODE_RING, false);

        } else if (TelephonyManager.EXTRA_STATE_OFFHOOK.equals(state)) {
            // Answered (or an outgoing call). Mark so the IDLE transition isn't "missed".
            answered = true;

        } else if (TelephonyManager.EXTRA_STATE_IDLE.equals(state)) {
            if (ringing && !answered) {
                enqueue(context, CallEventWorker.MODE_ENDED, true);  // rang, never answered
            }
            ringing = false;
            answered = false;
        }
    }

    /** Queues a CallEventWorker job for this call (if the gate says alerts are on). */
    private void enqueue(Context context, String mode, boolean wasMissed) {
        // Cheap gate so we don't schedule work outside office hours / when off.
        if (!EventGate.shouldFire(context)) return;

        Data data = new Data.Builder()
                .putString(CallEventWorker.KEY_MODE, mode)
                .putBoolean(CallEventWorker.KEY_WAS_MISSED, wasMissed)
                .putLong(CallEventWorker.KEY_RING_TS, ringStart)
                .putString(CallEventWorker.KEY_NUMBER, ringNumber)
                .build();

        // WHY CONNECTED: wait for internet instead of failing offline — a late alert beats
        // a lost one. WHY exponential backoff from 30s: on retry, wait 30s, then 60s,
        // 120s… so a struggling server isn't hammered.
        OneTimeWorkRequest request = new OneTimeWorkRequest.Builder(CallEventWorker.class)
                .setInputData(data)
                .setConstraints(new Constraints.Builder()
                        .setRequiredNetworkType(NetworkType.CONNECTED)
                        .build())
                .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 30, TimeUnit.SECONDS)
                .build();

        WorkManager.getInstance(context.getApplicationContext()).enqueue(request);
    }
}
