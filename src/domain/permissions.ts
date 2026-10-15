/**
 * Asks the user for the Android runtime permissions call alerts need.
 *
 * The permissions are also declared in android/app/src/main/AndroidManifest.xml —
 * Android needs both: the manifest says "this app may ask", this call actually
 * shows the "Allow / Don't allow" dialogs.
 *
 * Called when the user turns alerts on (see HomeScreen → onMaster).
 */
import {PermissionsAndroid, Platform} from 'react-native';

/**
 * Show the permission dialogs. Resolves true only if the three permissions that
 * call detection cannot work without were granted:
 *  - READ_PHONE_STATE: notice that the phone is ringing / answered / idle.
 *  - READ_CALL_LOG:    read the caller's number (Android 10+ hides it otherwise).
 *  - READ_CONTACTS:    turn the number into a contact name.
 *
 * POST_NOTIFICATIONS (Android 13+, API 33) is requested too but is optional.
 */
export async function requestCallPermissions(): Promise<boolean> {
  const P = PermissionsAndroid.PERMISSIONS;
  const wanted = [P.READ_PHONE_STATE, P.READ_CALL_LOG, P.READ_CONTACTS];
  // Platform.Version is the Android API level (33 = Android 13).
  if (typeof Platform.Version === 'number' && Platform.Version >= 33) {
    wanted.push(P.POST_NOTIFICATIONS);
  }
  const res = await PermissionsAndroid.requestMultiple(wanted);
  const G = PermissionsAndroid.RESULTS.GRANTED;
  return (
    res[P.READ_PHONE_STATE] === G &&
    res[P.READ_CALL_LOG] === G &&
    res[P.READ_CONTACTS] === G
  );
}
