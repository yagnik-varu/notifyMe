package com.notifyme.delivery.destinations;

import com.notifyme.storage.ConfigStore;

/**
 * Generic — any webhook that accepts {@code {"text": "…"}} (works for most simple ones).
 * A good template to copy when adding a new service.
 *
 * <p>Also the fallback for an unknown platform id (see {@link Destinations#forId}).
 */
public final class GenericDestination extends TextOnlyDestination {
    @Override public String id() { return ConfigStore.PLATFORM_GENERIC; }

    /** WHY not "Generic": this name is used in the sentence "Delivered to your webhook". */
    @Override public String displayName() { return "your webhook"; }
}
