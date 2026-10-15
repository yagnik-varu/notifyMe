package com.notifyme.call;

import android.net.Uri;
import android.os.Build;
import android.telecom.Call;
import android.telecom.CallScreeningService;

/**
 * CallScreenService — real-time caller-ID source.
 *
 * <p>Who calls it: Android's telephony system, for every incoming call — but ONLY while
 * this app holds the "call screening" role (Android 10+, granted by the user via
 * {@code bridge/NotifyMeModule.requestScreeningRole}). It's declared in
 * AndroidManifest.xml.
 *
 * <p>WHY it exists: the PHONE_STATE broadcast has no number on Android 10+, and some
 * manufacturers write the call log only after the call ends. The screening callback
 * carries the number right at ring time. For numbers saved as contacts it also needs
 * READ_CONTACTS (Android excludes contacts from screening otherwise).
 *
 * <p>What it does: only CACHES the number in static fields. {@link PhoneStateReceiver}
 * remains the single alert trigger and {@link CallEventWorker} reads this cache, which
 * avoids duplicate alerts. We never block or change calls.
 */
public class CallScreenService extends CallScreeningService {

    /** Last incoming number seen at ring. Written on the screening thread and read by the
     *  worker thread — hence volatile. */
    static volatile String lastNumber = "";
    static volatile long lastNumberTs = 0L;

    /** True when a screened number exists and is within 15 s of this call's ring time. */
    static boolean freshNumberFor(long ringTs) {
        return lastNumber != null && !lastNumber.isEmpty()
                && Math.abs(lastNumberTs - ringTs) < 15_000L;
    }

    /** Called by Android for each call while we hold the screening role. */
    @Override
    public void onScreenCall(Call.Details details) {
        // ⚠ GOTCHA: respondToCall is mandatory. Without it the system waits for our answer
        // and the call hangs. An empty CallResponse = "let the call through unchanged".
        respondToCall(details, new CallResponse.Builder().build());

        // Only incoming calls carry a caller we care about. getCallDirection() is API 29,
        // but this service is only bound when the role is held (29+), so it's safe.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                && details.getCallDirection() != Call.Details.DIRECTION_INCOMING) {
            return;
        }

        // The handle is a "tel:+15551234" URI; the part after "tel:" is the number.
        Uri handle = details.getHandle();
        String number = handle != null ? handle.getSchemeSpecificPart() : "";
        if (number == null || number.isEmpty()) return;  // restricted/unknown — nothing to cache

        lastNumber = number;
        lastNumberTs = System.currentTimeMillis();
    }
}
