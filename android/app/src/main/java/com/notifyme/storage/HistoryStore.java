package com.notifyme.storage;

import android.content.Context;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * HistoryStore — the "Activity" list: one row per delivery attempt outcome (sent or failed).
 *
 * <p>Who calls it: {@code delivery/Delivery} appends a row after every send;
 * {@code bridge/NotifyMeModule} reads, clears and restores it for the UI.
 *
 * <p>Storage: a JSON array string under the key "history" in the same SharedPreferences
 * file as {@link ConfigStore}. Newest entry first, capped at {@link #MAX_HISTORY}. Shape of
 * one entry (must match {@code HistoryEntry} in {@code src/native/types.ts}):
 * <pre>
 *   {"label": "Jane (+1555…)", "kind": "incoming", "timestamp": 1700000000000,
 *    "success": true, "detail": "Delivered to Slack"}
 * </pre>
 * kind is "incoming" | "missed" | "test"; very old rows may not have it.
 *
 * <p>WHY a JSON string and not a database: at most 50 small rows, read all at once by the
 * UI. A string is the simplest thing that works and passes straight over the JS bridge.
 */
public final class HistoryStore {
    /** Preferences key. Never rename — it holds users' existing history. */
    private static final String KEY_HISTORY = "history";
    /** Oldest rows are dropped beyond this many. */
    public static final int MAX_HISTORY = 50;

    private HistoryStore() {}

    /** The whole history as a JSON array string ("[]" when empty). */
    public static String getHistoryJson(Context ctx) {
        return ConfigStore.prefs(ctx).getString(KEY_HISTORY, "[]");
    }

    /** Prepend a new entry (newest first) and cap the list at MAX_HISTORY. */
    public static void appendHistory(Context ctx, String label, String kind, long timestamp,
                                     boolean success, String detail) {
        try {
            JSONArray existing = new JSONArray(getHistoryJson(ctx));
            JSONObject entry = new JSONObject();
            entry.put("label", label);
            entry.put("kind", kind);
            entry.put("timestamp", timestamp);
            entry.put("success", success);
            entry.put("detail", detail);

            JSONArray updated = new JSONArray();
            updated.put(entry);
            int keep = Math.min(existing.length(), MAX_HISTORY - 1);
            for (int i = 0; i < keep; i++) {
                updated.put(existing.get(i));
            }
            ConfigStore.prefs(ctx).edit().putString(KEY_HISTORY, updated.toString()).apply();
        } catch (JSONException ignored) {
            // WHY: history is best-effort; never crash a call alert over a log write.
        }
    }

    /** Empties the list. The UI keeps a copy so the user can Undo (see restoreHistory). */
    public static void clearHistory(Context ctx) {
        ConfigStore.prefs(ctx).edit().putString(KEY_HISTORY, "[]").apply();
    }

    /**
     * Undo for clearHistory: put the cleared entries back behind anything recorded since
     * the clear (newest stays first), capped at MAX_HISTORY.
     */
    public static void restoreHistory(Context ctx, String clearedJson) {
        try {
            JSONArray current = new JSONArray(getHistoryJson(ctx));
            JSONArray cleared = new JSONArray(clearedJson);
            JSONArray merged = new JSONArray();
            for (int i = 0; i < current.length() && merged.length() < MAX_HISTORY; i++) {
                merged.put(current.get(i));
            }
            for (int i = 0; i < cleared.length() && merged.length() < MAX_HISTORY; i++) {
                merged.put(cleared.get(i));
            }
            ConfigStore.prefs(ctx).edit().putString(KEY_HISTORY, merged.toString()).apply();
        } catch (JSONException ignored) {
            // Best-effort, like appendHistory.
        }
    }
}
