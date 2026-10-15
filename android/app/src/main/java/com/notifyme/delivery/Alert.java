package com.notifyme;

/**
 * One notification's content, in structured form so each platform can render it its
 * own way: Slack/Teams/Generic flatten it to a single line; Discord builds a colored
 * embed and Cliq a titled card from the parts. Built by CallEventWorker (calls) and
 * WebhookWorker (test).
 */
public final class Alert {

    public static final int INCOMING = 0;
    public static final int MISSED = 1;
    public static final int TEST = 2;

    public final int kind;
    public final String caller;   // display label; may be "" when unknown
    public final long timestamp;

    public Alert(int kind, String caller, long timestamp) {
        this.kind = kind;
        this.caller = caller == null ? "" : caller;
        this.timestamp = timestamp;
    }

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

    public String timeStr() {
        return WebhookWorker.timeOf(timestamp);
    }

    public String shownCaller() {
        return caller.isEmpty() ? "number unavailable" : caller;
    }

    /** One-line text used by Slack/Teams/Generic and the in-app history label. */
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

    /** Discord embed accent color (decimal). Green / red / blurple. */
    public int color() {
        switch (kind) {
            case INCOMING: return 3066993;   // #2ECC71 green
            case MISSED:   return 15548997;  // #ED4245 red
            default:       return 5793266;   // #5865F2 blurple
        }
    }
}
