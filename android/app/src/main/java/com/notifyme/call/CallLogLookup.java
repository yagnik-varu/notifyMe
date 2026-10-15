package com.notifyme;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.provider.CallLog;

import androidx.core.content.ContextCompat;

/**
 * Reads the most recent incoming call entry from the system call log. This is the
 * number source when the app is NOT the dialer/screening app: EXTRA_INCOMING_NUMBER
 * is empty on Android 10+, but the call log carries NUMBER, CACHED_NAME and TYPE.
 *
 * Timing note: some OEMs write the row at ring, others when the call ends. The
 * caller (CallEventWorker) polls this for a few seconds to ride out that delay.
 */
public final class CallLogLookup {

    private CallLogLookup() {}

    public static final class Entry {
        public final String number;
        public final String cachedName;
        public final int type;       // CallLog.Calls.*_TYPE
        Entry(String number, String cachedName, int type) {
            this.number = number;
            this.cachedName = cachedName;
            this.type = type;
        }
        public boolean isMissed() {
            return type == CallLog.Calls.MISSED_TYPE || type == CallLog.Calls.REJECTED_TYPE;
        }
    }

    /** Latest call-log entry with DATE >= sinceMs, or null if none / not permitted. */
    public static Entry latestSince(Context ctx, long sinceMs) {
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_CALL_LOG)
                != PackageManager.PERMISSION_GRANTED) {
            return null;
        }
        String[] cols = {
                CallLog.Calls.NUMBER,
                CallLog.Calls.CACHED_NAME,
                CallLog.Calls.TYPE,
                CallLog.Calls.DATE,
        };
        try (Cursor c = ctx.getContentResolver().query(
                CallLog.Calls.CONTENT_URI, cols,
                CallLog.Calls.DATE + " >= ?",
                new String[]{Long.toString(sinceMs)},
                CallLog.Calls.DATE + " DESC")) {
            if (c != null && c.moveToFirst()) {
                String number = c.getString(0);
                String name = c.getString(1);
                int type = c.getInt(2);
                return new Entry(number == null ? "" : number,
                        name == null ? "" : name, type);
            }
        } catch (Exception ignored) {
            // Provider can throw on some OEMs; treat as no entry.
        }
        return null;
    }
}
