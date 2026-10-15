package com.notifyme.schedule;

import android.content.Context;

import com.notifyme.storage.ConfigStore;

/**
 * EventGate — the single "should an event fire right now?" check, using saved settings.
 *
 * <p>Who calls it: {@code call/PhoneStateReceiver} (before queueing work, to skip
 * pointless jobs), {@code call/CallEventWorker} (again, right before sending, because
 * settings may have changed while the job waited for network), and
 * {@code bridge/NotifyMeModule.getStatus} (to show "Watching for calls" in the UI).
 *
 * <p>What it calls: {@link ConfigStore} for the values and {@link ScheduleRules} for the
 * actual decision. The rules themselves are documented in ScheduleRules.
 */
public final class EventGate {

    private EventGate() {}

    /** Decision for this exact moment. */
    public static boolean shouldFire(Context ctx) {
        return shouldFire(ctx, System.currentTimeMillis());
    }

    /** Decision for a given moment (handy when you want a fixed clock). */
    public static boolean shouldFire(Context ctx, long nowMs) {
        // Nowhere to send to → nothing to do.
        if (ConfigStore.getWebhookUrl(ctx).trim().isEmpty()) return false;

        String mode = ConfigStore.getOverrideMode(ctx);
        long until = ConfigStore.getOverrideUntil(ctx);

        if (!ScheduleRules.isOverrideActive(mode, until, nowMs)
                && !ConfigStore.OVERRIDE_NONE.equals(mode)) {
            // WHY: an expired override ("Pause until midnight" after midnight) is cleared
            // lazily here, the next time anyone asks — there is no timer for it. That way
            // the UI's "Today" switch also snaps back to "Schedule".
            ConfigStore.clearOverride(ctx);
        }

        return ScheduleRules.shouldFire(
                mode, until,
                ConfigStore.isMasterEnabled(ctx),
                ConfigStore.getStartMinute(ctx),
                ConfigStore.getEndMinute(ctx),
                ConfigStore.getDaysMask(ctx),
                nowMs);
    }
}
