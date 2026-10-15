package com.notifyme.delivery;

import android.content.Context;

import androidx.work.ListenableWorker.Result;

import com.notifyme.delivery.destinations.Destination;
import com.notifyme.delivery.destinations.DestinationSettings;
import com.notifyme.delivery.destinations.Destinations;
import com.notifyme.storage.ConfigStore;
import com.notifyme.storage.HistoryStore;

import org.json.JSONException;

/**
 * Delivery — sends one {@link Alert} to the user's chosen destination and records the
 * outcome in the Activity history.
 *
 * <p>Who calls it: the two background workers — {@code call/CallEventWorker} (real
 * calls) and {@link TestWebhookWorker} ("Send test").
 *
 * <p>Steps: pick destination → build URL + JSON body → {@link WebhookClient#post} →
 * map the result to a WorkManager {@link Result} (success / retry / failure) → write a
 * history row (only on a final outcome, never on "retry").
 */
public final class Delivery {

    /**
     * Retry budget. WorkManager's run-attempt count starts at 0, and we give up once it
     * reaches this value.
     *
     * <p>WHY attempts aren't wasted offline: the workers are queued with a CONNECTED
     * network constraint, so WorkManager only runs them while the phone is online. Retries
     * therefore cover real server/DNS errors, not "no signal".
     */
    public static final int MAX_ATTEMPTS = 5;

    private Delivery() {}

    /**
     * POSTs the alert and turns the outcome into a WorkManager Result plus a history row.
     * Errors a retry can't fix (bad token, wrong URL) are recorded at once instead of
     * after the whole backoff ladder, so the user sees them in seconds.
     *
     * @param label   text for the history row ("Test", or the caller label)
     * @param attempt {@code getRunAttemptCount()} of the calling worker
     */
    public static Result deliver(Context ctx, Alert alert, String label, int attempt) {
        boolean lastTry = attempt >= MAX_ATTEMPTS;
        Destination destination = Destinations.current(ctx);
        DestinationSettings settings = DestinationSettings.load(ctx);
        String body = bodyFor(destination, alert, settings);
        try {
            String url = destination.buildUrl(ConfigStore.getWebhookUrl(ctx), settings);
            int code = WebhookClient.post(url, body);
            if (code >= 200 && code < 300) {
                recordSuccess(ctx, destination, label, alert);
                return Result.success();
            }
            // Result.retry() tells WorkManager to run us again later (with backoff).
            if (!DeliveryErrors.isPermanent(code) && !lastTry) return Result.retry();
            recordFailure(ctx, label, alert, DeliveryErrors.failureText(destination, code));
            return Result.failure();
        } catch (Exception e) {
            if (!DeliveryErrors.isPermanent(e) && !lastTry) return Result.retry();
            recordFailure(ctx, label, alert, DeliveryErrors.failureText(e));
            return Result.failure();
        }
    }

    /**
     * Destination body, with a hand-built {"text": …} fallback.
     *
     * <p>WHY: org.json declares JSONException even though our simple puts never trigger
     * it in practice; if it ever did, a minimal message beats no message.
     */
    static String bodyFor(Destination destination, Alert alert, DestinationSettings settings) {
        try {
            return destination.buildBody(alert, settings);
        } catch (JSONException e) {
            return "{\"text\":\"" + alert.plainText().replace("\"", "'") + "\"}";
        }
    }

    /** History row for a delivered alert, e.g. "Delivered to Slack". */
    public static void recordSuccess(Context ctx, Destination destination, String label, Alert alert) {
        HistoryStore.appendHistory(ctx, label, alert.kindName(), alert.timestamp, true,
                "Delivered to " + destination.displayName());
    }

    /** History row for an alert that finally failed, with a plain-language reason. */
    public static void recordFailure(Context ctx, String label, Alert alert, String detail) {
        HistoryStore.appendHistory(ctx, label, alert.kindName(), alert.timestamp, false, detail);
    }
}
