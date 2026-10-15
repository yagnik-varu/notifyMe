package com.notifyme;

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

import java.util.concurrent.TimeUnit;

/**
 * Primary call detector — role-independent, fires on every device (works even when
 * the app process is dead, after the app has been launched once). Tracks the call
 * lifecycle to tell answered from missed:
 *
 *   IDLE -> RINGING            : an incoming call -> enqueue CallEventWorker(RING)
 *   RINGING -> OFFHOOK         : the call was answered
 *   (RINGING|OFFHOOK) -> IDLE  : call ended -> if it was never answered, it's a MISSED
 *                                call -> enqueue CallEventWorker(ENDED, wasMissed=true)
 *
 * The caller number is pulled from the call log inside CallEventWorker (the broadcast
 * carries no number on Android 10+).
 */
public class PhoneStateReceiver extends BroadcastReceiver {

    // Static so state survives across the short-lived receiver instances while the
    // process is alive. A fresh process starts IDLE, so the first RINGING still fires.
    private static volatile String lastState = TelephonyManager.EXTRA_STATE_IDLE;
    private static volatile boolean ringing = false;
    private static volatile boolean answered = false;
    private static volatile long ringStart = 0L;
    // Legacy broadcast number — present on Android < 10 and some OEMs, empty on 10+.
    private static volatile String ringNumber = "";

    @Override
    public void onReceive(Context context, Intent intent) {
        if (!TelephonyManager.ACTION_PHONE_STATE_CHANGED.equals(intent.getAction())) return;

        String state = intent.getStringExtra(TelephonyManager.EXTRA_STATE);
        if (state == null) return;

        String previous = lastState;
        if (state.equals(previous)) return;  // ignore duplicate broadcasts for same state
        lastState = state;

        if (TelephonyManager.EXTRA_STATE_RINGING.equals(state)) {
            ringing = true;
            answered = false;
            ringStart = System.currentTimeMillis();
            String n = intent.getStringExtra(TelephonyManager.EXTRA_INCOMING_NUMBER);
            ringNumber = n == null ? "" : n;
            // Universal trigger. CallEventWorker resolves the number from the screening
            // cache or call log; CallScreenService no longer enqueues, so no duplicates.
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

    private void enqueue(Context context, String mode, boolean wasMissed) {
        // Cheap gate so we don't schedule work outside office hours / when off.
        if (!EventGate.shouldFire(context)) return;

        Data data = new Data.Builder()
                .putString(CallEventWorker.KEY_MODE, mode)
                .putBoolean(CallEventWorker.KEY_WAS_MISSED, wasMissed)
                .putLong(CallEventWorker.KEY_RING_TS, ringStart)
                .putString(CallEventWorker.KEY_NUMBER, ringNumber)
                .build();

        // Wait for connectivity instead of failing offline — a late alert beats a lost one.
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
