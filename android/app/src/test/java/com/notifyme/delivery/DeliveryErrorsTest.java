package com.notifyme.delivery;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertFalse;
import static org.junit.Assert.assertTrue;

import com.notifyme.delivery.destinations.Destination;
import com.notifyme.delivery.destinations.Destinations;

import org.junit.Test;

import java.io.IOException;
import java.net.MalformedURLException;
import java.net.SocketTimeoutException;
import java.net.UnknownHostException;

/** Unit tests for {@link DeliveryErrors}: retry-or-give-up and the wording users see. */
public class DeliveryErrorsTest {

    private static final Destination SLACK = Destinations.forId("slack");
    private static final Destination CLIQ = Destinations.forId("cliq");

    @Test public void clientErrorsArePermanent() {
        assertTrue(DeliveryErrors.isPermanent(400));
        assertTrue(DeliveryErrors.isPermanent(401));
        assertTrue(DeliveryErrors.isPermanent(403));
        assertTrue(DeliveryErrors.isPermanent(404));
        assertTrue(DeliveryErrors.isPermanent(410));
    }

    @Test public void timeoutsRateLimitsAndServerErrorsAreRetried() {
        assertFalse(DeliveryErrors.isPermanent(408));
        assertFalse(DeliveryErrors.isPermanent(429));
        assertFalse(DeliveryErrors.isPermanent(500));
        assertFalse(DeliveryErrors.isPermanent(503));
        assertFalse(DeliveryErrors.isPermanent(200));
    }

    @Test public void exceptionPermanence() {
        assertTrue(DeliveryErrors.isPermanent(new MalformedURLException("no protocol")));
        assertTrue(DeliveryErrors.isPermanent(new IllegalArgumentException("bad")));
        assertTrue(DeliveryErrors.isPermanent(
                new IOException("Cleartext HTTP traffic to example.com not permitted")));
        assertFalse(DeliveryErrors.isPermanent(new UnknownHostException("x")));
        assertFalse(DeliveryErrors.isPermanent(new SocketTimeoutException("x")));
    }

    @Test public void cliqHasItsOwnWording() {
        assertEquals("Cliq didn't accept the webhook token. Copy it again from your bot.",
                DeliveryErrors.failureText(CLIQ, 401));
        assertEquals("Bot not found. Check the endpoint URL and bot name.",
                DeliveryErrors.failureText(CLIQ, 404));
    }

    @Test public void otherServicesUseGenericWording() {
        assertEquals("The service rejected this webhook. It may have been revoked — create a new one.",
                DeliveryErrors.failureText(SLACK, 401));
        assertEquals("Webhook not found. The link may be wrong or deleted.",
                DeliveryErrors.failureText(SLACK, 404));
    }

    @Test public void sharedWordingForRateLimitAndServerErrors() {
        for (Destination d : new Destination[]{SLACK, CLIQ}) {
            assertEquals("Too many messages right now. Try again in a few minutes.",
                    DeliveryErrors.failureText(d, 429));
            assertEquals("The service is having trouble right now. Try again later.",
                    DeliveryErrors.failureText(d, 500));
        }
    }

    @Test public void networkErrorWording() {
        assertEquals("Plain http:// links aren't allowed. Use an https:// link.",
                DeliveryErrors.failureText(new IOException("Cleartext HTTP traffic not permitted")));
        assertEquals("The server took too long to respond.",
                DeliveryErrors.failureText(new SocketTimeoutException()));
    }
}
