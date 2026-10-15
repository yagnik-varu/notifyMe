package com.notifyme.delivery.destinations;

import com.notifyme.delivery.Alert;

import org.json.JSONException;

/**
 * Destination — one chat service that alerts can be posted to (Slack, Discord, …).
 *
 * <p>★ EXTENSION POINT. To support a new service:
 * <ol>
 *   <li>Create a class implementing this interface (copy {@link GenericDestination}).</li>
 *   <li>Register it in {@link Destinations#ALL}.</li>
 *   <li>Add the matching JS definition in {@code src/destinations/} with the same id.</li>
 * </ol>
 * Nothing else in the native engine needs to change. See docs/guides/add-a-destination.md.
 *
 * <p>Who calls it: {@code delivery/Delivery} (build URL + body, explain failures).
 *
 * <p>WHY no Android Context in these methods: they only take plain values
 * ({@link DestinationSettings}), so they can be unit-tested on a computer.
 */
public interface Destination {

    /** Id saved in settings and used by the JS side, e.g. "slack". Never change it. */
    String id();

    /**
     * Name used inside sentences shown to the user, e.g. "Delivered to Slack".
     * (The generic webhook says "your webhook".)
     */
    String displayName();

    /**
     * The final URL to POST to. Most services use the saved URL as-is; Cliq appends its
     * token as {@code ?zapikey=}.
     *
     * @throws Exception if the URL can't be built (treated like any send error)
     */
    String buildUrl(String savedUrl, DestinationSettings settings) throws Exception;

    /** The JSON request body for this alert, in the shape the service expects. */
    String buildBody(Alert alert, DestinationSettings settings) throws JSONException;

    /**
     * A service-specific explanation for an HTTP error code, or {@code null} to use the
     * generic wording in {@code delivery/DeliveryErrors}.
     */
    String failureTextOrNull(int httpCode);
}
