package com.notifyme.delivery.destinations;

import com.notifyme.delivery.Alert;
import com.notifyme.storage.ConfigStore;

import org.json.JSONArray;
import org.json.JSONException;
import org.json.JSONObject;

/**
 * Discord — channel webhook (https://discord.com/api/webhooks/…).
 *
 * <p>Body: a rich "embed" card, color-coded green (incoming) / red (missed) /
 * blurple (test):
 * <pre>
 *   {"embeds":[{"title":"📞 Incoming call","description":"From **Jane**",
 *               "color":3066993,"footer":{"text":"14:05"}}]}
 * </pre>
 * ⚠ GOTCHA: Discord ignores a top-level "text" field — it only reads "content" or "embeds".
 */
public final class DiscordDestination implements Destination {
    @Override public String id() { return ConfigStore.PLATFORM_DISCORD; }
    @Override public String displayName() { return "Discord"; }

    @Override
    public String buildUrl(String savedUrl, DestinationSettings settings) {
        return savedUrl;
    }

    @Override
    public String buildBody(Alert alert, DestinationSettings settings) throws JSONException {
        String description = alert.kind == Alert.TEST
                ? "Your webhook works."
                : "From **" + alert.shownCaller() + "**"; // **bold** is Discord markdown

        JSONObject embed = new JSONObject()
                .put("title", alert.title())
                .put("description", description)
                .put("color", alert.color())
                .put("footer", new JSONObject().put("text", alert.timeStr()));

        return new JSONObject()
                .put("embeds", new JSONArray().put(embed))
                .toString();
    }

    @Override
    public String failureTextOrNull(int httpCode) {
        return null; // generic wording is fine
    }
}
