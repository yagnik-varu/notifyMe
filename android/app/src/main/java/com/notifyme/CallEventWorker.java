package com.notifyme;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

/**
 * Resolves a call's number/name from the call log and delivers the alert. Enqueued by
 * PhoneStateReceiver:
 *   - MODE_RING  on an incoming ring        -> "📞 Incoming call from <X> at HH:mm"
 *   - MODE_ENDED when a ringing call ends    -> "📵 Missed call from <X>" (only if missed;
 *                                               answered calls were already alerted at ring)
 *
 * The number isn't in the PHONE_STATE broadcast on Android 10+, and another app may own
 * the caller-ID role, so we poll CallLog for a few seconds to pick up NUMBER/CACHED_NAME
 * once the OS writes the row.
 */
public class CallEventWorker extends Worker {

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

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        if (ConfigStore.getWebhookUrl(ctx).trim().isEmpty()) return Result.success();
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
        String body = PlatformFormatter.payload(ConfigStore.getPlatform(ctx), alert);

        try {
            int code = WebhookWorker.postBody(ctx, body);
            if (code >= 200 && code < 300) {
                WebhookWorker.recordSuccess(ctx, label, ringTs);
                return Result.success();
            }
            if (getRunAttemptCount() < WebhookWorker.MAX_ATTEMPTS) return Result.retry();
            WebhookWorker.recordFailure(ctx, label, ringTs, "HTTP " + code);
            return Result.failure();
        } catch (Exception e) {
            if (getRunAttemptCount() < WebhookWorker.MAX_ATTEMPTS) return Result.retry();
            WebhookWorker.recordFailure(ctx, label, ringTs, WebhookWorker.msgOf(e));
            return Result.failure();
        }
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
