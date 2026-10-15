package com.notifyme

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.notifyme.bridge.NotifyMePackage

/**
 * MainApplication — the app process's entry point (declared as android:name in
 * AndroidManifest.xml). Mostly React Native template code.
 *
 * The one project-specific line: `add(NotifyMePackage())`, which registers our native
 * module so JS can reach it. Libraries from node_modules are added automatically by
 * [PackageList] ("autolinking"); our own module is not, hence the manual add.
 */
class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          add(NotifyMePackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
