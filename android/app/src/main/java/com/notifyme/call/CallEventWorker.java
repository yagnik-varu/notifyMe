package com.notifyme.call;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.notifyme.delivery.Alert;
import com.notifyme.delivery.Delivery;
import com.notifyme.schedule.EventGate;
import com.notifyme.storage.ConfigStore;

/**
 * CallEventWorker — background job that figures out WHO is calling and sends the alert.
 *
 * <p>Who queues it: {@link PhoneStateReceiver}, in two modes:
 * <ul>
 *   <li>MODE_RING on an incoming ring → "📞 Incoming call from &lt;X&gt; at HH:mm"</li>
 *   <li>MODE_ENDED when a ringing call ends → "📵 Missed call from &lt;X&gt;" — only if it
 *       was really missed (answered calls were already alerted at ring)</li>
 * </ul>
 *
 * <p>What it calls: {@link CallScreenService} (cached number), {@link CallLogLookup},
 * {@link ContactLookup} (name for a number), then {@link Delivery#deliver}.
 *
 * <p>⚠ GOTCHA: the number isn't in the PHONE_STATE broadcast on Android 10+, and another
 * app may own the caller-ID role, so we poll the call log for up to ~18 s until the OS
 * writes the row. Some manufacturers only write it when the call ends.
 *
 * <p>⚠ GOTCHA: WorkManager stores this class's full name with each queued job. It used to
 * be {@code com.notifyme.CallEventWorker}; an alert queued at the exact moment of upgrading
 * from that version won't run afterwards. Don't rename/move workers casually.
 */
public class CallEventWorker extends Worker {

    // Input-data keys (filled in by PhoneStateReceiver.enqueue).
    public static final String KEY_MODE = "mode";          // ring | ended
    public static final String KEY_RING_TS = "ring_ts";
    public static final String KEY_WAS_MISSED = "was_missed";
    public static final String KEY_NUMBER = "number";      // caller number, when known up front

    public static final String MODE_RING = "ring";
    public static final String MODE_ENDED = "ended";

    private static final int POLL_TRIES = 12;          // ~18s — rides OEMs that write the
    private static final long POLL_INTERVAL_MS = 1500L; // call-log row only at call end

    public CallEventWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    /** Runs on a WorkManager background thread, so sleeping/polling here is fine. */
    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        if (ConfigStore.getWebhookUrl(ctx).trim().isEmpty()) return Result.success();
        // WHY check again: the job may have waited for network; settings could have changed.
        if (!EventGate.shouldFire(ctx)) return Result.success();  // gated off — not an error

        String mode = getInputData().getString(KEY_MODE);
        if (mode == null) mode = MODE_RING;
        long ringTs = getInputData().getLong(KEY_RING_TS, System.currentTimeMillis());
        boolean wasMissed = getInputData().getBoolean(KEY_WAS_MISSED, false);
        String legacyNumber = getInputData().getString(KEY_NUMBER);  // EXTRA_INCOMING_NUMBER

        // Resolve the caller from whichever source produces a number first:
        //   1. legacy broadcast number (Android < 10 / some OEMs)
        //   2. CallScreenService cache (real-time; unknowns + contacts when READ_CONTACTS ok)
        //   3. call log (everything else; may appear only at call end on some OEMs)
        String screenedNumber = "";
        CallLogLookup.Entry entry = null;
        for (int i = 0; i < POLL_TRIES; i++) {
            if (CallScreenService.freshNumberFor(ringTs)) {
                screenedNumber = CallScreenService.lastNumber;
                break;
            }
            // 3 s of slack: the call-log DATE can be slightly earlier than our ring time.
            entry = CallLogLookup.latestSince(ctx, ringTs - 3000L);
            if (entry != null && !entry.number.isEmpty()) break;
            if (legacyNumber != null && !legacyNumber.isEmpty()) break;  // have a fallback already
            try {
                Thread.sleep(POLL_INTERVAL_MS);
            } catch (InterruptedException e) {
                Thread.currentThread().interrupt();
                break;
            }
        }

        boolean missed = wasMissed || (entry != null && entry.isMissed());
        if (MODE_ENDED.equals(mode) && !missed) {
            return Result.success();  // answered — already alerted at ring
        }

        String label = resolveLabel(ctx, entry, screenedNumber, legacyNumber);
        Alert alert = new Alert(
                MODE_ENDED.equals(mode) ? Alert.MISSED : Alert.INCOMING, label, ringTs);
        return Delivery.deliver(ctx, alert, label, getRunAttemptCount());
    }

    /**
     * Build the display label. Prefer the call log's cached name (dialer-resolved), then
     * resolve a contact name for whichever number we have (call log / screening / legacy).
     */
    private String resolveLabel(Context ctx, CallLogLookup.Entry entry,
                                String screenedNumber, String legacyNumber) {
        if (entry != null && !entry.cachedName.isEmpty()) {
            return entry.number.isEmpty()
                    ? entry.cachedName : entry.cachedName + " (" + entry.number + ")";
        }
        String number = firstNonEmpty(
                entry != null ? entry.number : null, screenedNumber, legacyNumber);
        return ContactLookup.display(ctx, number);  // name (number) | number | ""
    }

    private static String firstNonEmpty(String... values) {
        for (String v : values) {
            if (v != null && !v.isEmpty()) return v;
        }
        return "";
    }
}
