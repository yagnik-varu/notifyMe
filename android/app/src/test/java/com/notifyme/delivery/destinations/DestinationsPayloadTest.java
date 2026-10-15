package com.notifyme.delivery.destinations;

import static org.junit.Assert.assertEquals;
import static org.junit.Assert.assertSame;

import com.notifyme.delivery.Alert;

import org.json.JSONArray;
import org.json.JSONObject;
import org.junit.AfterClass;
import org.junit.BeforeClass;
import org.junit.Test;

import java.util.ArrayList;
import java.util.Iterator;
import java.util.List;
import java.util.Map;
import java.util.TimeZone;
import java.util.TreeMap;

/**
 * "Golden" payload tests: the exact JSON each destination sends.
 *
 * <p>The expected strings were captured from the app BEFORE the code was restructured
 * into Destination classes, so a passing test proves the refactor didn't change what
 * Slack/Discord/Teams/Cliq receive. If you change a payload on purpose, update the
 * expected value here too.
 */
public class DestinationsPayloadTest {

    private static final long TS = 1_700_000_000_000L; // 2023-11-14 22:13 UTC
    private static final Alert INCOMING = new Alert(Alert.INCOMING, "Jane (+15550001111)", TS);
    private static final Alert MISSED = new Alert(Alert.MISSED, "", TS);
    private static final Alert TEST = Alert.test(TS);

    private static final DestinationSettings NONE = DestinationSettings.empty();
    private static final DestinationSettings WITH_USER =
            new DestinationSettings(" me@x.com ", "");

    // Emoji as escapes so the file reads the same in any editor/console.
    private static final String PHONE = "📞";   // 📞
    private static final String NO_PHONE = "📵"; // 📵
    private static final String CHECK = "✅";         // ✅

    private static final String TEXT_INCOMING =
            "{\"text\":\"" + PHONE + " Incoming call from Jane (+15550001111) at 22:13\"}";
    private static final String TEXT_MISSED =
            "{\"text\":\"" + NO_PHONE + " Missed call from number unavailable at 22:13\"}";
    private static final String TEXT_TEST =
            "{\"text\":\"" + CHECK + " Test from Notify-Me — your webhook works.\"}";

    private static TimeZone originalTz;

    @BeforeClass
    public static void useUtc() {
        // WHY: alert times are formatted in the default time zone ("22:13" in UTC).
        originalTz = TimeZone.getDefault();
        TimeZone.setDefault(TimeZone.getTimeZone("UTC"));
    }

    @AfterClass
    public static void restoreTz() {
        TimeZone.setDefault(originalTz);
    }

    /**
     * Compares JSON by content, not raw text.
     *
     * <p>⚠ GOTCHA: on the phone, org.json keeps keys in insertion order. The desktop
     * org.json library used by unit tests stores keys in a HashMap, so the printed key
     * order differs. Content equality is the meaningful check here.
     */
    private static void assertJson(String expected, String actual) throws Exception {
        assertEquals(normalize(new JSONObject(expected)), normalize(new JSONObject(actual)));
    }

    /**
     * JSON → plain Java (sorted maps + lists), so equals() ignores key order.
     * (WHY not JSONObject.similar(): it isn't in Android's org.json, which is what the
     * test code compiles against.)
     */
    private static Object normalize(Object json) throws Exception {
        if (json instanceof JSONObject) {
            JSONObject o = (JSONObject) json;
            Map<String, Object> map = new TreeMap<>();
            Iterator<String> keys = o.keys();
            while (keys.hasNext()) {
                String k = keys.next();
                map.put(k, normalize(o.get(k)));
            }
            return map;
        }
        if (json instanceof JSONArray) {
            JSONArray a = (JSONArray) json;
            List<Object> list = new ArrayList<>();
            for (int i = 0; i < a.length(); i++) list.add(normalize(a.get(i)));
            return list;
        }
        return json;
    }

    private static void assertBody(String id, Alert alert, DestinationSettings s, String expected)
            throws Exception {
        assertJson(expected, Destinations.forId(id).buildBody(alert, s));
    }

    // ---- Text-only services: Slack, Teams, Generic (extra settings are ignored) ----

    @Test public void textOnlyServices() throws Exception {
        for (String id : new String[]{"slack", "teams", "generic"}) {
            for (DestinationSettings s : new DestinationSettings[]{NONE, WITH_USER}) {
                assertBody(id, INCOMING, s, TEXT_INCOMING);
                assertBody(id, MISSED, s, TEXT_MISSED);
                assertBody(id, TEST, s, TEXT_TEST);
            }
        }
    }

    // ---- Discord embeds ----

    private static String discord(String title, String description, int color) {
        return "{\"embeds\":[{\"color\":" + color + ",\"footer\":{\"text\":\"22:13\"},"
                + "\"description\":\"" + description + "\",\"title\":\"" + title + "\"}]}";
    }

    @Test public void discord() throws Exception {
        for (DestinationSettings s : new DestinationSettings[]{NONE, WITH_USER}) {
            assertBody("discord", INCOMING, s,
                    discord(PHONE + " Incoming call", "From **Jane (+15550001111)**", 3066993));
            assertBody("discord", MISSED, s,
                    discord(NO_PHONE + " Missed call", "From **number unavailable**", 15548997));
            assertBody("discord", TEST, s,
                    discord(CHECK + " Test", "Your webhook works.", 5793266));
        }
    }

    // ---- Zoho Cliq ----

    @Test public void cliq_withoutRecipient() throws Exception {
        assertBody("cliq", INCOMING, NONE, "{\"caller\":\"Jane (+15550001111)\",\"kind\":\"incoming\","
                + "\"time\":\"22:13\",\"text\":\"*Jane (+15550001111)* at 22:13\","
                + "\"title\":\"" + PHONE + " Incoming call\"}");
        assertBody("cliq", MISSED, NONE, "{\"caller\":\"\",\"kind\":\"missed\",\"time\":\"22:13\","
                + "\"text\":\"*number unavailable* at 22:13\",\"title\":\"" + NO_PHONE + " Missed call\"}");
        assertBody("cliq", TEST, NONE, "{\"caller\":\"\",\"kind\":\"test\",\"time\":\"22:13\","
                + "\"text\":\"Your webhook works.\",\"title\":\"" + CHECK + " Test\"}");
    }

    @Test public void cliq_withRecipient_addsTrimmedUserids() throws Exception {
        assertBody("cliq", INCOMING, WITH_USER, "{\"caller\":\"Jane (+15550001111)\",\"kind\":\"incoming\","
                + "\"userids\":\"me@x.com\",\"time\":\"22:13\",\"text\":\"*Jane (+15550001111)* at 22:13\","
                + "\"title\":\"" + PHONE + " Incoming call\"}");
        assertBody("cliq", MISSED, WITH_USER, "{\"caller\":\"\",\"kind\":\"missed\",\"userids\":\"me@x.com\","
                + "\"time\":\"22:13\",\"text\":\"*number unavailable* at 22:13\","
                + "\"title\":\"" + NO_PHONE + " Missed call\"}");
        assertBody("cliq", TEST, WITH_USER, "{\"caller\":\"\",\"kind\":\"test\",\"userids\":\"me@x.com\","
                + "\"time\":\"22:13\",\"text\":\"Your webhook works.\",\"title\":\"" + CHECK + " Test\"}");
    }

    @Test public void cliq_tokenIsAddedToUrl() throws Exception {
        String base = "https://cliq.zoho.com/api/v2/bots/notify/incoming";
        assertEquals(base + "?zapikey=abc", CliqDestination.withToken(base, "abc"));
        assertEquals(base + "?x=1&zapikey=abc", CliqDestination.withToken(base + "?x=1", "abc"));
        // URL-encoded so special characters can't break the query string.
        assertEquals(base + "?zapikey=a%2Bb%26c%3D", CliqDestination.withToken(base, "a+b&c="));
        // Left alone when there's no token, or the URL already has one.
        assertEquals(base, CliqDestination.withToken(base, ""));
        assertEquals(base + "?zapikey=old", CliqDestination.withToken(base + "?zapikey=old", "new"));
        // Via the Destination interface, using saved settings.
        assertEquals(base + "?zapikey=tok", Destinations.forId("cliq")
                .buildUrl(base, new DestinationSettings("", "tok")));
    }

    @Test public void otherServices_useSavedUrlAsIs() throws Exception {
        DestinationSettings withToken = new DestinationSettings("", "tok");
        for (String id : new String[]{"slack", "discord", "teams", "generic"}) {
            assertEquals("https://x.test/hook", Destinations.forId(id).buildUrl("https://x.test/hook", withToken));
        }
    }

    // ---- Registry ----

    @Test public void registry_knowsEveryPlatformId() {
        String[] ids = {"slack", "discord", "teams", "cliq", "generic"};
        assertEquals(ids.length, Destinations.all().size());
        for (String id : ids) assertEquals(id, Destinations.forId(id).id());
    }

    @Test public void registry_unknownIdFallsBackToGeneric() {
        assertSame(Destinations.forId("generic"), Destinations.forId("not-a-platform"));
    }

    @Test public void displayNames_matchDeliveredMessages() {
        assertEquals("Slack", Destinations.forId("slack").displayName());
        assertEquals("Discord", Destinations.forId("discord").displayName());
        assertEquals("Teams", Destinations.forId("teams").displayName());
        assertEquals("Zoho Cliq", Destinations.forId("cliq").displayName());
        assertEquals("your webhook", Destinations.forId("generic").displayName());
    }
}
