package com.notifyme.delivery;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import com.notifyme.storage.ConfigStore;

/**
 * TestWebhookWorker — background job behind the "Send test" button.
 *
 * <p>Who queues it: {@code bridge/NotifyMeModule.sendTest()}. It goes through exactly the
 * same {@link Delivery} path as a real call alert, so a passing test proves real alerts
 * will arrive too. The UI then polls history for the "Test" row to show the result.
 *
 * <p>WHY a WorkManager "Worker": WorkManager is Android's job queue for background work
 * that must finish even if the app is closed. It runs {@link #doWork()} on a background
 * thread, waits for the network if needed, and retries with backoff when we return
 * {@code Result.retry()}.
 *
 * <p>⚠ GOTCHA: WorkManager stores the worker's full class name with each queued job.
 * This class used to be {@code com.notifyme.WebhookWorker}; a test queued at the very
 * moment of upgrading from that version won't run afterwards. Harmless, but don't rename
 * workers casually.
 */
public class TestWebhookWorker extends Worker {

    /** Input-data keys (values are put in by NotifyMeModule.sendTest). */
    public static final String KEY_TYPE = "type";       // "test"
    public static final String KEY_TIMESTAMP = "timestamp";
    public static final String TYPE_TEST = "test";

    public TestWebhookWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    /** Runs on a background thread. Returning a Result tells WorkManager what to do next. */
    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        if (ConfigStore.getWebhookUrl(ctx).trim().isEmpty()) return Result.failure();

        long timestamp = getInputData().getLong(KEY_TIMESTAMP, System.currentTimeMillis());
        return Delivery.deliver(ctx, Alert.test(timestamp), "Test", getRunAttemptCount());
    }
}
