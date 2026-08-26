package com.notifyme;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

/**
 * Delivers a message to the configured webhook over HTTP. Runs off the main thread
 * (WorkManager guarantees this) and survives the app process being dead. Retries on
 * failure up to MAX_ATTEMPTS so a bad network doesn't loop forever.
 *
 * Uses java.net.HttpURLConnection — no OkHttp dependency, to keep the app light.
 * This worker handles the "test" send; CallEventWorker reuses the static helpers
 * (postJson / recordSuccess / recordFailure) for call + missed-call alerts.
 */
public class WebhookWorker extends Worker {

    public static final String KEY_TYPE = "type";       // "test"
    public static final String KEY_TIMESTAMP = "timestamp";
    public static final String TYPE_TEST = "test";

    // Attempts only run while the CONNECTED constraint holds, so all five cover
    // real server/DNS errors rather than being burned offline.
    public static final int MAX_ATTEMPTS = 5;
    private static final int TIMEOUT_MS = 15000;

    public WebhookWorker(@NonNull Context context, @NonNull WorkerParameters params) {
        super(context, params);
    }

    @NonNull
    @Override
    public Result doWork() {
        Context ctx = getApplicationContext();
        if (ConfigStore.getWebhookUrl(ctx).trim().isEmpty()) return Result.failure();

        long timestamp = getInputData().getLong(KEY_TIMESTAMP, System.currentTimeMillis());
        String body = PlatformFormatter.payload(ConfigStore.getPlatform(ctx), Alert.test(timestamp));

        try {
            int code = postBody(ctx, body);
            if (code >= 200 && code < 300) {
                recordSuccess(ctx, "Test", timestamp);
                return Result.success();
            }
            if (getRunAttemptCount() < MAX_ATTEMPTS) return Result.retry();
            recordFailure(ctx, "Test", timestamp, "HTTP " + code);
            return Result.failure();
        } catch (Exception e) {
            if (getRunAttemptCount() < MAX_ATTEMPTS) return Result.retry();
            recordFailure(ctx, "Test", timestamp, msgOf(e));
            return Result.failure();
        }
    }

    // ---- Shared delivery helpers (used by CallEventWorker too) ----

    public static String timeOf(long timestamp) {
        return new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(timestamp));
    }

    /** POST a ready-built JSON body to the saved webhook; return HTTP status. */
    public static int postBody(Context ctx, String json) throws Exception {
        String url = ConfigStore.getWebhookUrl(ctx);
        HttpURLConnection conn = null;
        try {
            conn = (HttpURLConnection) new URL(url).openConnection();
            conn.setRequestMethod("POST");
            conn.setConnectTimeout(TIMEOUT_MS);
            conn.setReadTimeout(TIMEOUT_MS);
            conn.setDoOutput(true);
            conn.setRequestProperty("Content-Type", "application/json; charset=utf-8");
            byte[] body = json.getBytes(StandardCharsets.UTF_8);
            try (OutputStream os = conn.getOutputStream()) {
                os.write(body);
            }
            return conn.getResponseCode();
        } finally {
            if (conn != null) conn.disconnect();
        }
    }

    public static void recordSuccess(Context ctx, String label, long timestamp) {
        ConfigStore.appendHistory(ctx, label, timestamp, true, "Sent");
    }

    public static void recordFailure(Context ctx, String label, long timestamp, String detail) {
        ConfigStore.appendHistory(ctx, label, timestamp, false, detail);
    }

    public static String msgOf(Exception e) {
        String m = e.getMessage();
        return m == null ? "Network error" : m;
    }
}
