package com.notifyme.delivery;

import com.notifyme.delivery.destinations.Destination;

import java.net.ConnectException;
import java.net.MalformedURLException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;

import javax.net.ssl.SSLException;

/**
 * DeliveryErrors — turns a failed send into two things:
 * <ul>
 *   <li>"is it permanent?" — would retrying ever help? (decides retry vs give up now)</li>
 *   <li>a plain-language sentence for the Activity list and the test banner.</li>
 * </ul>
 *
 * <p>Who calls it: {@link Delivery}. Pure logic, no Android APIs → unit-tested in
 * {@code src/test/.../delivery/DeliveryErrorsTest}.
 */
public final class DeliveryErrors {

    private DeliveryErrors() {}

    /**
     * WHY: a 4xx status means the request itself is wrong (bad token, deleted webhook) —
     * sending the same thing again will fail the same way, so we report it immediately
     * instead of after the whole retry ladder. Exceptions: 408 (timeout) and 429
     * (rate-limited) are temporary. 5xx = the server's problem → retry.
     */
    public static boolean isPermanent(int code) {
        return code >= 400 && code < 500 && code != 408 && code != 429;
    }

    /** True for exceptions a retry can't fix: a broken URL or a blocked http:// link. */
    public static boolean isPermanent(Exception e) {
        return e instanceof MalformedURLException
                || e instanceof IllegalArgumentException
                || isCleartext(e);
    }

    /**
     * ⚠ GOTCHA: Android blocks plain http:// by default ("cleartext traffic") and throws a
     * generic IOException whose only clue is the word "Cleartext" in its message. There is
     * no dedicated exception type, so we have to match the text.
     */
    private static boolean isCleartext(Exception e) {
        String m = e.getMessage();
        return m != null && m.contains("Cleartext");
    }

    /**
     * Plain-language reason for a rejected request. The destination gets the first say
     * (e.g. Cliq explains a 401 as a token problem); otherwise generic wording is used.
     */
    public static String failureText(Destination destination, int code) {
        String specific = destination.failureTextOrNull(code);
        if (specific != null) return specific;
        return genericFailureText(code);
    }

    /** Wording that fits any webhook service. */
    public static String genericFailureText(int code) {
        if (code == 400 || code == 422) {
            return "The service didn't accept the message. Check that the right destination is selected.";
        }
        if (code == 401) {
            return "The service rejected this webhook. It may have been revoked — create a new one.";
        }
        if (code == 403) return "Not allowed to post to this webhook.";
        if (code == 404 || code == 410) return "Webhook not found. The link may be wrong or deleted.";
        if (code == 405) return "This link doesn't accept messages. Check the webhook URL.";
        if (code == 413) return "The message was too large for the service.";
        if (code == 429) return "Too many messages right now. Try again in a few minutes.";
        if (code >= 500) return "The service is having trouble right now. Try again later.";
        return "The service didn't accept the message.";
    }

    /** Plain-language reason for a network-level failure (no HTTP status at all). */
    public static String failureText(Exception e) {
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
}
