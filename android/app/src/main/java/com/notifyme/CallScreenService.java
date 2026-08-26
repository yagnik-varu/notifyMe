package com.notifyme;

import android.net.Uri;
import android.os.Build;
import android.telecom.Call;
import android.telecom.CallScreeningService;

/**
 * Real-time caller-ID cache. Unlike the call log (written by some OEMs only when the call
 * ends) and the PHONE_STATE broadcast (number stripped on Android 10+), the screening
 * callback carries the number at ring time. Active only while the app holds
 * ROLE_CALL_SCREENING (API 29+) AND — for numbers saved as contacts — READ_CONTACTS is
 * granted (see CallScreeningService docs: contacts are excluded from screening otherwise).
 *
 * This service only CACHES the number; PhoneStateReceiver is the single alert trigger and
 * CallEventWorker reads this cache. That avoids duplicate alerts. We never block or alter
 * calls — every call is allowed through unchanged.
 */
public class CallScreenService extends CallScreeningService {

    /** Last incoming number seen at ring. Set on the screening thread, read by the worker
     *  thread — hence volatile. */
    static volatile String lastNumber = "";
    static volatile long lastNumberTs = 0L;

    /** True when a screened number is available and close in time to this call's ring. */
    static boolean freshNumberFor(long ringTs) {
        return lastNumber != null && !lastNumber.isEmpty()
                && Math.abs(lastNumberTs - ringTs) < 15_000L;
    }

    @Override
    public void onScreenCall(Call.Details details) {
        // Always allow the call through, unchanged. Mandatory: omitting this hangs the call.
        respondToCall(details, new CallResponse.Builder().build());

        // Only incoming calls carry a caller we care about. getCallDirection() is API 29,
        // but this service is only bound when the role is held (29+), so it's safe.
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q
                && details.getCallDirection() != Call.Details.DIRECTION_INCOMING) {
            return;
        }

        Uri handle = details.getHandle();
        String number = handle != null ? handle.getSchemeSpecificPart() : "";
        if (number == null || number.isEmpty()) return;  // restricted/unknown — nothing to cache

        lastNumber = number;
        lastNumberTs = System.currentTimeMillis();
    }
}
