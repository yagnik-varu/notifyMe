package com.notifyme.delivery.destinations;

import com.notifyme.delivery.Alert;

import org.json.JSONException;
import org.json.JSONObject;

/**
 * TextOnlyDestination — shared base for services that accept the simplest possible body:
 * {@code {"text": "📞 Incoming call from … at 14:05"}}. Used by Slack, Teams and Generic.
 *
 * <p>Subclasses only provide {@link #id()} and {@link #displayName()}.
 */
abstract class TextOnlyDestination implements Destination {

    @Override
    public String buildUrl(String savedUrl, DestinationSettings settings) {
        return savedUrl;
    }

    @Override
    public String buildBody(Alert alert, DestinationSettings settings) throws JSONException {
        return new JSONObject().put("text", alert.plainText()).toString();
    }

    @Override
    public String failureTextOrNull(int httpCode) {
        return null; // generic wording is fine
    }
}
