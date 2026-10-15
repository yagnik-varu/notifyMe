package com.notifyme.delivery;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;

/**
 * WebhookClient — sends one HTTP POST with a JSON body and returns the status code.
 *
 * <p>Who calls it: {@link Delivery}. It knows nothing about destinations or retries.
 *
 * <p>WHY java.net.HttpURLConnection instead of OkHttp/Retrofit: it's built into Android,
 * so the app needs no extra networking library for a single POST.
 *
 * <p>⚠ GOTCHA: this does network I/O and blocks. It must only run on a background thread
 * — WorkManager workers guarantee that. Calling it on the main (UI) thread would crash
 * with NetworkOnMainThreadException.
 */
public final class WebhookClient {

    /** Connect and read timeout each, in milliseconds. */
    static final int TIMEOUT_MS = 15000;

    private WebhookClient() {}

    /**
     * POSTs {@code json} to {@code url}.
     *
     * @return the HTTP status code (e.g. 200, 404)
     * @throws Exception for network problems (no DNS, timeout, TLS…) or a malformed URL;
     *                   {@link DeliveryErrors} decides whether a retry could help
     */
    public static int post(String url, String json) throws Exception {
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
}
