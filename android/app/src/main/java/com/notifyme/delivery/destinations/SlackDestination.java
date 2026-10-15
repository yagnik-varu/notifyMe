package com.notifyme.delivery.destinations;

import com.notifyme.storage.ConfigStore;

/**
 * Slack — Incoming Webhook (https://hooks.slack.com/services/…).
 * Body: {@code {"text": "…"}} (see {@link TextOnlyDestination}).
 */
public final class SlackDestination extends TextOnlyDestination {
    @Override public String id() { return ConfigStore.PLATFORM_SLACK; }
    @Override public String displayName() { return "Slack"; }
}
