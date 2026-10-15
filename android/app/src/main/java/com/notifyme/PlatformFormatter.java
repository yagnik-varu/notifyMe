package com.notifyme;

import android.content.Context;

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
 * - Cliq    : bot Incoming Webhook (/api/v2/bots/{bot}/incoming; WebhookWorker adds
 *             ?zapikey=<token>). Plain data {kind,title,caller,time,text,userids} that
 *             the bot's Deluge handler (docs/zoho-cliq-incoming-handler.deluge) turns
 *             into a card. "text" is Cliq markdown (bold is *single star*); "userids"
 *             is omitted when no recipient is set.
 */
public final class PlatformFormatter {

    private PlatformFormatter() {}

    /** Body for the saved platform (and its per-platform settings). */
    public static String payload(Context ctx, Alert alert) {
        return payload(ConfigStore.getPlatform(ctx), alert, ConfigStore.getCliqUser(ctx));
    }

    public static String payload(String platform, Alert alert, String cliqUser) {
        try {
            if (ConfigStore.PLATFORM_DISCORD.equals(platform)) {
                return discord(alert);
            }
            if (ConfigStore.PLATFORM_CLIQ.equals(platform)) {
                return cliq(alert, cliqUser);
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

    private static String cliq(Alert alert, String userIds) throws JSONException {
        String text = alert.kind == Alert.TEST
                ? "Your webhook works."
                : "*" + alert.shownCaller() + "* at " + alert.timeStr();

        JSONObject body = new JSONObject()
                .put("kind", alert.kindName())
                .put("title", alert.title())
                .put("caller", alert.caller)
                .put("time", alert.timeStr())
                .put("text", text);
        if (userIds != null && !userIds.trim().isEmpty()) {
            body.put("userids", userIds.trim());
        }
        return body.toString();
    }
}
