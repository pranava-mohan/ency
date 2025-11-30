package com.pranavamohan.encyapp

import android.content.Intent
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class SmartSwitchModule(private val reactContext: ReactApplicationContext) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String {
        return "SmartSwitchModule"
    }

    @ReactMethod
    fun startService(macAddress: String) {
        val intent = Intent(reactContext, SmartSwitchService::class.java)
        intent.putExtra(SmartSwitchService.EXTRA_MAC_ADDRESS, macAddress)
        
        if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) {
            reactContext.startForegroundService(intent)
        } else {
            reactContext.startService(intent)
        }
    }

    @ReactMethod
    fun stopService() {
        val intent = Intent(reactContext, SmartSwitchService::class.java)
        reactContext.stopService(intent)
    }
}