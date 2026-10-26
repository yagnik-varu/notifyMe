package com.notifyme.call;

import android.Manifest;
import android.content.Context;
import android.content.pm.PackageManager;
import android.database.Cursor;
import android.net.Uri;
import android.provider.ContactsContract.PhoneLookup;

import androidx.core.content.ContextCompat;

import com.notifyme.storage.ConfigStore;

/**
 * ContactLookup — turns a phone number into a contact name, if it's saved on the phone.
 *
 * <p>Who calls it: {@link CallEventWorker#doWork()} (via resolveLabel) when the call log
 * didn't already have a cached name.
 *
 * <p>How: queries the Contacts provider's PhoneLookup table, which matches numbers
 * loosely (with/without country code, spaces, dashes). Falls back to the raw number when
 * there's no match, no number, or READ_CONTACTS isn't granted.
 */
public final class ContactLookup {

    private ContactLookup() {}

    /** Contact display name for a number, or null if none / not permitted. */
    public static String nameFor(Context ctx, String number) {
        if (number == null || number.trim().isEmpty()) return null;
        if (ContextCompat.checkSelfPermission(ctx, Manifest.permission.READ_CONTACTS)
                != PackageManager.PERMISSION_GRANTED) {
            return null;
        }
        Uri uri = Uri.withAppendedPath(PhoneLookup.CONTENT_FILTER_URI, Uri.encode(number));
        try (Cursor c = ctx.getContentResolver().query(
                uri, new String[]{PhoneLookup.DISPLAY_NAME}, null, null, null)) {
            if (c != null && c.moveToFirst()) {
                String name = c.getString(0);
                if (name != null && !name.trim().isEmpty()) return name;
            }
        } catch (Exception ignored) {
            // Provider can throw on some OEMs; degrade to number.
        }
        return null;
    }

    /**
     * Best display label: "Name (number)" when both known, name alone, number
     * alone, or "" when nothing is available (worker prints "unavailable").
     */
    public static String display(Context ctx, String number) {
        String name = nameFor(ctx, number);
        boolean hasNum = number != null && !number.trim().isEmpty();
        if (name != null) {
            if (ConfigStore.isHideNumberEnabled(ctx)) {
                return name;
            }
            return hasNum ? name + " (" + number + ")" : name;
        }
        return hasNum ? number : "";
    }
}
