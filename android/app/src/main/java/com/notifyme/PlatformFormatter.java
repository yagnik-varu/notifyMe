package com.notifyme;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Builds the JSON body for the configured destination platform from an Alert.
 * Centralised so adding a platform is one branch here.
 *
 * - Slack   : Incoming Webhook expects {"text": "..."}.
 * - Teams   : Legacy Office 365 connector accepts {"text": "..."}. Swap to an
 *             Adaptive Card for the newer Workflows endpoint when needed.
 * - Generic : {"text": "..."} — works for most simple webhooks.
 * - Discord : rich embed {"embeds":[{title,description,color,footer}]} — color-coded
 *             (green incoming / red missed / blurple test). Discord ignores "text".
 */
public final class PlatformFormatter {

    private PlatformFormatter() {}

    public static String payload(String platform, Alert alert) {
        try {
            if (ConfigStore.PLATFORM_DISCORD.equals(platform)) {
                return discord(alert);
            }
            // Slack / Teams / Generic — single text field.
            return new JSONObject().put("text", alert.plainText()).toString();
        } catch (JSONException e) {
            // Fallback: minimal hand-built object; text is plain enough.
            return "{\"text\":\"" + alert.plainText().replace("\"", "'") + "\"}";
        }
    }

    private static String discord(Alert alert) throws JSONException {
        String description = alert.kind == Alert.TEST
                ? "Your webhook works."
                : "From **" + alert.shownCaller() + "**";

        JSONObject embed = new JSONObject()
                .put("title", alert.title())
                .put("description", description)
                .put("color", alert.color())
                .put("footer", new JSONObject().put("text", alert.timeStr()));

        return new JSONObject()
                .put("embeds", new JSONArray().put(embed))
                .toString();
    }
}
