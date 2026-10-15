package com.notifyme.delivery.destinations;

import android.content.Context;

import com.notifyme.storage.ConfigStore;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;

/**
 * Destinations — the registry of every supported {@link Destination}, looked up by id.
 *
 * <p>★ EXTENSION POINT: add new destinations to {@link #ALL}.
 *
 * <p>Who calls it: {@code delivery/Delivery} via {@link #current(Context)}.
 */
public final class Destinations {

    private static final GenericDestination GENERIC = new GenericDestination();

    /** Every supported destination. Order doesn't matter here (the UI has its own order). */
    private static final List<Destination> ALL = Collections.unmodifiableList(Arrays.asList(
            new SlackDestination(),
            new DiscordDestination(),
            new TeamsDestination(),
            new CliqDestination(),
            GENERIC
    ));

    private Destinations() {}

    /** All registered destinations. */
    public static List<Destination> all() {
        return ALL;
    }

    /**
     * The destination for an id. An unknown id (shouldn't happen: the UI only saves known
     * ids) falls back to Generic.
     *
     * <p>WHY Generic and not Slack: that is exactly how the code behaved before this
     * registry existed: unknown ids got a plain {"text"} body, generic error wording and
     * "Delivered to your webhook".
     */
    public static Destination forId(String id) {
        for (Destination d : ALL) {
            if (d.id().equals(id)) return d;
        }
        return GENERIC;
    }

    /** The destination the user picked in the app. */
    public static Destination current(Context ctx) {
        return forId(ConfigStore.getPlatform(ctx));
    }
}
