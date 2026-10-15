package com.notifyme.delivery.destinations;

import com.notifyme.delivery.Alert;
import com.notifyme.storage.ConfigStore;

import org.json.JSONException;
import org.json.JSONObject;

import java.io.UnsupportedEncodingException;
import java.net.URLEncoder;

/**
 * Zoho Cliq — a bot's Incoming Webhook ({@code https://cliq.zoho.com/api/v2/bots/<bot>/incoming};
 * company domains work too).
 *
 * <p>Unlike the other services, Cliq doesn't render our message directly. We POST plain
 * data and a small Deluge script inside the bot (docs/zoho-cliq-incoming-handler.deluge)
 * turns it into a card:
 * <pre>
 *   {"kind":"incoming","title":"📞 Incoming call","caller":"Jane (+1555…)",
 *    "time":"14:05","text":"*Jane (+1555…)* at 14:05","userids":"me@company.com"}
 * </pre>
 * "text" is Cliq markdown (bold is *single star*). "userids" is left out when no
 * recipient email is set, so the bot posts to every subscriber.
 *
 * <p>Authentication: the bot's webhook token goes in the URL as {@code ?zapikey=<token>}.
 */
public final class CliqDestination implements Destination {
    @Override public String id() { return ConfigStore.PLATFORM_CLIQ; }
    @Override public String displayName() { return "Zoho Cliq"; }

    @Override
    public String buildUrl(String savedUrl, DestinationSettings settings)
            throws UnsupportedEncodingException {
        return withToken(savedUrl, settings.cliqToken);
    }

    /**
     * Adds {@code zapikey=<token>} to the URL, with "?" or "&" depending on whether it
     * already has a query string. Leaves the URL alone when the token is empty or the
     * pasted URL already contains a zapikey.
     */
    public static String withToken(String url, String token) throws UnsupportedEncodingException {
        if (token.isEmpty() || url.contains("zapikey=")) return url;
        // WHY URL-encode: a token containing "+", "&" or "=" would otherwise break the query.
        return url + (url.contains("?") ? "&" : "?")
                + "zapikey=" + URLEncoder.encode(token, "UTF-8");
    }

    @Override
    public String buildBody(Alert alert, DestinationSettings settings) throws JSONException {
        String text = alert.kind == Alert.TEST
                ? "Your webhook works."
                : "*" + alert.shownCaller() + "* at " + alert.timeStr();

        // WHY this put() order: Android's JSONObject keeps insertion order, so this is the
        // exact key order sent from the phone. Keep it stable.
        JSONObject body = new JSONObject()
                .put("kind", alert.kindName())
                .put("title", alert.title())
                .put("caller", alert.caller)
                .put("time", alert.timeStr())
                .put("text", text);
        String userIds = settings.cliqUser;
        if (userIds != null && !userIds.trim().isEmpty()) {
            body.put("userids", userIds.trim());
        }
        return body.toString();
    }

    /** Cliq-specific wording for the errors people actually hit while setting up a bot. */
    @Override
    public String failureTextOrNull(int code) {
        if (code == 400 || code == 422) {
            return "Cliq couldn't read the message. Make sure the Notify-Me handler is saved in your bot.";
        }
        if (code == 401) return "Cliq didn't accept the webhook token. Copy it again from your bot.";
        if (code == 403) return "This token isn't allowed to post to that bot.";
        if (code == 404 || code == 410) return "Bot not found. Check the endpoint URL and bot name.";
        return null;
    }
}
