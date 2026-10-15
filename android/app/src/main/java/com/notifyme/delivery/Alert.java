package com.notifyme.delivery;

import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Alert — the content of one notification, kept structured (kind + caller + time) so each
 * destination can render it its own way: Slack/Teams/Generic flatten it to one line;
 * Discord builds a colored embed and Cliq a titled card from the parts.
 *
 * <p>Who creates it: {@code call/CallEventWorker} (incoming / missed calls) and
 * {@link TestWebhookWorker} (the "Send test" button). Who reads it: the classes in
 * {@code delivery/destinations/} and {@link Delivery} (for the history row).
 *
 * <p>Immutable: all fields are final.
 */
public final class Alert {

    // WHY plain ints instead of an enum: kept from the original code; kindName() gives
    // the stable string used in payloads and history.
    public static final int INCOMING = 0;
    public static final int MISSED = 1;
    public static final int TEST = 2;

    /** One of INCOMING / MISSED / TEST. */
    public final int kind;
    /** Display label, e.g. "Jane (+1555…)", or "" when the number is unknown. */
    public final String caller;
    /** When the phone started ringing (or when the test was requested), epoch ms. */
    public final long timestamp;

    public Alert(int kind, String caller, long timestamp) {
        this.kind = kind;
        this.caller = caller == null ? "" : caller;
        this.timestamp = timestamp;
    }

    /** A test alert (no caller). */
    public static Alert test(long timestamp) {
        return new Alert(TEST, "", timestamp);
    }

    /** Stable name for payloads and history: "incoming" | "missed" | "test". */
    public String kindName() {
        switch (kind) {
            case INCOMING: return "incoming";
            case MISSED:   return "missed";
            default:       return "test";
        }
    }

    /** "HH:mm" in the phone's time zone, e.g. "14:05". */
    public String timeStr() {
        return timeOf(timestamp);
    }

    /** Formats an epoch-ms time as 24-hour "HH:mm" in the phone's time zone. */
    public static String timeOf(long timestamp) {
        // WHY a new SimpleDateFormat each call: the class is not thread-safe, and workers
        // run on background threads.
        return new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(timestamp));
    }

    /** The caller, or "number unavailable" when we couldn't find it. */
    public String shownCaller() {
        return caller.isEmpty() ? "number unavailable" : caller;
    }

    /** One-line text used by Slack/Teams/Generic. */
    public String plainText() {
        switch (kind) {
            case INCOMING:
                return "📞 Incoming call from " + shownCaller() + " at " + timeStr();
            case MISSED:
                return "📵 Missed call from " + shownCaller() + " at " + timeStr();
            default:
                return "✅ Test from Notify-Me — your webhook works.";
        }
    }

    /** Short title for card-style platforms (Discord embed, Cliq card). */
    public String title() {
        switch (kind) {
            case INCOMING: return "📞 Incoming call";
            case MISSED:   return "📵 Missed call";
            default:       return "✅ Test";
        }
    }

    /** Discord embed accent color (decimal RGB). Green / red / blurple. */
    public int color() {
        switch (kind) {
            case INCOMING: return 3066993;   // #2ECC71 green
            case MISSED:   return 15548997;  // #ED4245 red
            default:       return 5793266;   // #5865F2 blurple
        }
    }
}
