package com.notifyme.bridge

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

/**
 * NotifyMePackage — tells React Native which native modules this app provides.
 *
 * Who calls it: React Native at startup, because MainApplication adds it to the package
 * list. A native module that isn't listed in a package is invisible to JS
 * (`NativeModules.NotifyMe` would be undefined).
 */
class NotifyMePackage : ReactPackage {
    /** Our only module: [NotifyMeModule]. */
    override fun createNativeModules(
        reactContext: ReactApplicationContext
    ): List<NativeModule> = listOf(NotifyMeModule(reactContext))

    /** No custom native UI views. */
    override fun createViewManagers(
        reactContext: ReactApplicationContext
    ): List<ViewManager<*, *>> = emptyList()
}
