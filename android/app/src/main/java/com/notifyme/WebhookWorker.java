package com.notifyme;

import android.content.Context;

import androidx.annotation.NonNull;
import androidx.work.Worker;
import androidx.work.WorkerParameters;

import java.io.OutputStream;
import java.net.ConnectException;
import java.net.HttpURLConnection;
import java.net.MalformedURLException;
import java.net.SocketTimeoutException;
import java.net.URL;
import java.net.URLEncoder;
import java.net.UnknownHostException;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

import javax.net.ssl.SSLException;

/**
 * Delivers a message to the configured webhook over HTTP. Runs off the main thread
 * (WorkManager guarantees this) and survives the app process being dead. Retries on
 * failure up to MAX_ATTEMPTS so a bad network doesn't loop forever.
 *
 * Uses java.net.HttpURLConnection — no OkHttp dependency, to keep the app light.
 * This worker handles the "test" send; CallEventWorker reuses the static helpers
 * (deliver / postBody / recordSuccess / recordFailure) for call + missed-call alerts.
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
        return deliver(ctx, Alert.test(timestamp), "Test", getRunAttemptCount());
    }

    // ---- Shared delivery helpers (used by CallEventWorker too) ----

    /**
     * POST the body and turn the outcome into a WorkManager Result plus a history row.
     * Errors a retry can't fix (bad token, wrong URL) are recorded at once instead of
     * after the whole backoff ladder, so the user sees them in seconds.
     */
    static Result deliver(Context ctx, Alert alert, String label, int attempt) {
        boolean lastTry = attempt >= MAX_ATTEMPTS;
        String body = PlatformFormatter.payload(ctx, alert);
        try {
            int code = postBody(ctx, body);
            if (code >= 200 && code < 300) {
                recordSuccess(ctx, label, alert);
                return Result.success();
            }
            if (!isPermanent(code) && !lastTry) return Result.retry();
            recordFailure(ctx, label, alert, failureText(ctx, code));
            return Result.failure();
        } catch (Exception e) {
            if (!isPermanent(e) && !lastTry) return Result.retry();
            recordFailure(ctx, label, alert, failureText(e));
            return Result.failure();
        }
    }

    /** 4xx means the request itself is wrong — except timeouts and rate limits. */
    static boolean isPermanent(int code) {
        return code >= 400 && code < 500 && code != 408 && code != 429;
    }

    static boolean isPermanent(Exception e) {
        return e instanceof MalformedURLException
                || e instanceof IllegalArgumentException
                || isCleartext(e);
    }

    private static boolean isCleartext(Exception e) {
        String m = e.getMessage();
        return m != null && m.contains("Cleartext");
    }

    /** Plain-language reason for a rejected request, worded for the saved platform. */
    static String failureText(Context ctx, int code) {
        boolean cliq = ConfigStore.PLATFORM_CLIQ.equals(ConfigStore.getPlatform(ctx));
        if (code == 400 || code == 422) {
            return cliq
                    ? "Cliq couldn't read the message. Make sure the Notify-Me handler is saved in your bot."
                    : "The service didn't accept the message. Check that the right destination is selected.";
        }
        if (code == 401) {
            return cliq
                    ? "Cliq didn't accept the webhook token. Copy it again from your bot."
                    : "The service rejected this webhook. It may have been revoked — create a new one.";
        }
        if (code == 403) {
            return cliq
                    ? "This token isn't allowed to post to that bot."
                    : "Not allowed to post to this webhook.";
        }
        if (code == 404 || code == 410) {
            return cliq
                    ? "Bot not found. Check the endpoint URL and bot name."
                    : "Webhook not found. The link may be wrong or deleted.";
        }
        if (code == 405) return "This link doesn't accept messages. Check the webhook URL.";
        if (code == 413) return "The message was too large for the service.";
        if (code == 429) return "Too many messages right now. Try again in a few minutes.";
        if (code >= 500) return "The service is having trouble right now. Try again later.";
        return "The service didn't accept the message.";
    }

    static String failureText(Exception e) {
        if (isCleartext(e)) return "Plain http:// links aren't allowed. Use an https:// link.";
        if (e instanceof MalformedURLException || e instanceof IllegalArgumentException) {
            return "The webhook URL isn't valid. It should start with https://";
        }
        if (e instanceof UnknownHostException) {
            return "Couldn't find the server. Check the URL and your internet connection.";
        }
        if (e instanceof SocketTimeoutException) return "The server took too long to respond.";
        if (e instanceof SSLException) return "Couldn't make a secure connection to the server.";
        if (e instanceof ConnectException) return "Couldn't connect. Check your internet connection.";
        return "Something went wrong while sending. Check your connection and try again.";
    }

    private static String platformName(Context ctx) {
        switch (ConfigStore.getPlatform(ctx)) {
            case ConfigStore.PLATFORM_SLACK: return "Slack";
            case ConfigStore.PLATFORM_DISCORD: return "Discord";
            case ConfigStore.PLATFORM_TEAMS: return "Teams";
            case ConfigStore.PLATFORM_CLIQ: return "Zoho Cliq";
            default: return "your webhook";
        }
    }

    public static String timeOf(long timestamp) {
        return new SimpleDateFormat("HH:mm", Locale.getDefault()).format(new Date(timestamp));
    }

    /**
     * The URL to POST to: the saved webhook, plus Cliq's ?zapikey=<token> when the
     * token is kept in its own field and not already in the URL.
     */
    static String targetUrl(Context ctx) throws Exception {
        String url = ConfigStore.getWebhookUrl(ctx);
        String token = ConfigStore.getCliqToken(ctx);
        if (!ConfigStore.PLATFORM_CLIQ.equals(ConfigStore.getPlatform(ctx))
                || token.isEmpty() || url.contains("zapikey=")) {
            return url;
        }
        return url + (url.contains("?") ? "&" : "?")
                + "zapikey=" + URLEncoder.encode(token, "UTF-8");
    }

    /** POST a ready-built JSON body to the saved webhook; return HTTP status. */
    public static int postBody(Context ctx, String json) throws Exception {
        String url = targetUrl(ctx);
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

    public static void recordSuccess(Context ctx, String label, Alert alert) {
        ConfigStore.appendHistory(ctx, label, alert.kindName(), alert.timestamp, true,
                "Delivered to " + platformName(ctx));
    }

    public static void recordFailure(Context ctx, String label, Alert alert, String detail) {
        ConfigStore.appendHistory(ctx, label, alert.kindName(), alert.timestamp, false, detail);
    }
}
