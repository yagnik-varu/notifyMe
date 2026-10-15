package com.notifyme.delivery.destinations;

import com.notifyme.storage.ConfigStore;

/**
 * Microsoft Teams — legacy Office 365 connector webhook, which accepts {@code {"text": "…"}}.
 *
 * <p>NOTE: Microsoft's newer "Workflows" webhooks expect an Adaptive Card instead. To
 * support those, override {@code buildBody} here; nothing else has to change.
 */
public final class TeamsDestination extends TextOnlyDestination {
    @Override public String id() { return ConfigStore.PLATFORM_TEAMS; }
    @Override public String displayName() { return "Teams"; }
}
