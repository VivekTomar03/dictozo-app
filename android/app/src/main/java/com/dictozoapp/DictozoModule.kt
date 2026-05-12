package com.dictozoapp

import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.provider.Settings
import android.view.accessibility.AccessibilityManager
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class DictozoModule(reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "DictozoModule"
    }

    @ReactMethod
    fun checkAccessibilityPermission(promise: Promise) {
        try {
            val am = reactApplicationContext.getSystemService(Context.ACCESSIBILITY_SERVICE) as android.view.accessibility.AccessibilityManager
            val enabledServices = am.getEnabledAccessibilityServiceList(android.accessibilityservice.AccessibilityServiceInfo.FEEDBACK_ALL_MASK)
            
            var isEnabled = false
            for (service in enabledServices) {
                if (service.resolveInfo.serviceInfo.packageName == reactApplicationContext.packageName) {
                    isEnabled = true
                    break
                }
            }

            // Secondary check via Settings.Secure just in case
            if (!isEnabled) {
                val settingsEnabled = android.provider.Settings.Secure.getString(
                    reactApplicationContext.contentResolver,
                    android.provider.Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
                )
                if (settingsEnabled?.contains(reactApplicationContext.packageName) == true) {
                    isEnabled = true
                }
            }

            promise.resolve(isEnabled)
        } catch (e: Exception) {
            promise.reject("ERROR", e.message)
        }
    }

    @ReactMethod
    fun openAccessibilitySettings() {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS)
        intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        reactApplicationContext.startActivity(intent)
    }

    @ReactMethod
    fun checkOverlayPermission(promise: Promise) {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            promise.resolve(Settings.canDrawOverlays(reactApplicationContext))
        } else {
            promise.resolve(true)
        }
    }

    @ReactMethod
    fun openOverlaySettings() {
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.M) {
            val intent = Intent(Settings.ACTION_MANAGE_OVERLAY_PERMISSION, Uri.parse("package:${reactApplicationContext.packageName}"))
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
            reactApplicationContext.startActivity(intent)
        }
    }

    // Closes the current Activity and returns to the previous app (used by popup mode).
    // Fixes the BackHandler.exitApp() bug that killed the process instead of finishing.
    @ReactMethod
    fun finishActivity() {
        currentActivity?.finish()
    }

    @ReactMethod
    fun setLoginStatus(isLoggedIn: Boolean) {
        val prefs = reactApplicationContext.getSharedPreferences("dictozo_prefs", Context.MODE_PRIVATE)
        prefs.edit().putBoolean("is_verified", isLoggedIn).apply()
    }

    @ReactMethod
    fun clearLocalDatabase() {
        val dbHelper = DictionaryDbHelper(reactApplicationContext)
        dbHelper.clearAllWords()
    }
}
