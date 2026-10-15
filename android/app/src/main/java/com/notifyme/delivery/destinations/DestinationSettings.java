package com.notifyme.delivery.destinations;

import android.content.Context;

import com.notifyme.storage.ConfigStore;

/**
 * DestinationSettings — the per-service extra settings a {@link Destination} may need,
 * as plain values (so destinations stay testable without Android).
 *
 * <p>Today only Zoho Cliq has extras. A new service with its own fields would add them
 * here (and to ConfigStore + the JS form).
 */
public final class DestinationSettings {
    /** Zoho Cliq recipient email; "" = everyone subscribed to the bot. */
    public final String cliqUser;
    /** Zoho Cliq bot webhook token; "" = not set (may already be inside the URL). */
    public final String cliqToken;

    public DestinationSettings(String cliqUser, String cliqToken) {
        this.cliqUser = cliqUser == null ? "" : cliqUser;
        this.cliqToken = cliqToken == null ? "" : cliqToken;
    }

    /** No extras at all. */
    public static DestinationSettings empty() {
        return new DestinationSettings("", "");
    }

    /** Reads the saved values from {@link ConfigStore}. */
    public static DestinationSettings load(Context ctx) {
        return new DestinationSettings(ConfigStore.getCliqUser(ctx), ConfigStore.getCliqToken(ctx));
    }
}
