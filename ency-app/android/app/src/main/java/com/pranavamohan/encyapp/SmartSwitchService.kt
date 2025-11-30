package com.pranavamohan.encyapp 

import android.annotation.SuppressLint
import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.Service
import android.bluetooth.*
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.PowerManager
import android.os.IBinder
import android.util.Log
import androidx.core.app.NotificationCompat
import kotlinx.coroutines.*
import kotlin.coroutines.resume
import kotlin.coroutines.resumeWithException
import java.util.*

class SmartSwitchService : Service() {

    private val serviceJob = Job()
    private val serviceScope = CoroutineScope(Dispatchers.IO + serviceJob)
    private var isRunning = false

    private var wakeLock: PowerManager.WakeLock? = null
    
    // HM-10 UUIDs
    private val SERVICE_UUID = UUID.fromString("0000FFE0-0000-1000-8000-00805F9B34FB")
    private val CHAR_UUID = UUID.fromString("0000FFE1-0000-1000-8000-00805F9B34FB")

    companion object {
        const val CHANNEL_ID = "Ency_Foreground_Service_v2"
        const val EXTRA_MAC_ADDRESS = "MAC_ADDRESS"
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()
        val powerManager = getSystemService(POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "SmartSwitch::Wakelock")
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val macAddress = intent?.getStringExtra(EXTRA_MAC_ADDRESS)
        
        if (macAddress == null) {
            stopSelf()
            return START_NOT_STICKY
        }

        if (!isRunning) {
            val notification = createNotification()
            startForeground(1, notification)
            
            wakeLock?.acquire(100 * 60 * 60 * 1000L) 
            isRunning = true
            startPingLoop(macAddress)
        }

        return START_STICKY // Restart if killed
    }

    private fun createNotification(): Notification {
        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("Smart Dorm Active")
            .setContentText("Keeping connection alive in background...")
            .setSmallIcon(android.R.drawable.ic_lock_idle_charging)
            .setPriority(NotificationCompat.PRIORITY_MAX)
            .setOngoing(true)
            .setOnlyAlertOnce(true)
            .build()
    }

    private fun startPingLoop(macAddress: String) {
        serviceScope.launch {
            val bluetoothManager = getSystemService(Context.BLUETOOTH_SERVICE) as BluetoothManager
            val adapter = bluetoothManager.adapter

            while (isActive) {
                Log.d("SmartSwitch", "Pinging $macAddress...")
                try {
                    if (adapter == null || !adapter.isEnabled) {
                        Log.e("SmartSwitch", "Bluetooth is OFF")
                    } else {
                        val device = adapter.getRemoteDevice(macAddress)
                        connectAndWrite(device)
                    }
                } catch (e: Exception) {
                    Log.e("SmartSwitch", "Ping Failed: ${e.message}")
                }
                
                // Sleep for 15 seconds
                delay(15000)
            }
        }
    }

    @SuppressLint("MissingPermission")
    private suspend fun connectAndWrite(device: BluetoothDevice) {
        var gatt: BluetoothGatt? = null

        try {
            // 1. HARD TIMEOUT: If this block takes > 5 seconds, throw exception
            withTimeout(5000L) {
                suspendCancellableCoroutine<Unit> { cont ->
                    val callback = object : BluetoothGattCallback() {
                        override fun onConnectionStateChange(g: BluetoothGatt, status: Int, newState: Int) {
                            if (newState == BluetoothProfile.STATE_CONNECTED) {
                                Log.d("SmartSwitch", "Connected. Discovering Services...")
                                g.discoverServices()
                            } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                                g.close() // Clean up
                                if (cont.isActive) {
                                    // If we were expecting a connection but got disconnected, fail.
                                    cont.resumeWithException(Exception("Disconnected unexpectedly"))
                                }
                            }
                        }

                        override fun onServicesDiscovered(g: BluetoothGatt, status: Int) {
                            if (status == BluetoothGatt.GATT_SUCCESS) {
                                val service = g.getService(SERVICE_UUID)
                                val characteristic = service?.getCharacteristic(CHAR_UUID)

                                if (characteristic != null) {
                                    characteristic.value = "1".toByteArray()
                                    characteristic.writeType = BluetoothGattCharacteristic.WRITE_TYPE_DEFAULT
                                    g.writeCharacteristic(characteristic)
                                } else {
                                    g.disconnect()
                                }
                            } else {
                                g.disconnect()
                            }
                        }

                        override fun onCharacteristicWrite(g: BluetoothGatt, c: BluetoothGattCharacteristic, status: Int) {
                            Log.d("SmartSwitch", "Write Success! Disconnecting...")
                            g.disconnect() // This triggers onConnectionStateChange -> DISCONNECTED
                            if (cont.isActive) cont.resume(Unit) {}
                        }
                    }

                    // Connect
                    gatt = device.connectGatt(this@SmartSwitchService, false, callback)
                    
                    // Cleanup if the coroutine is cancelled externally
                    cont.invokeOnCancellation {
                        try { gatt?.disconnect(); gatt?.close() } catch (e: Exception) {}
                    }
                }
            }
        } catch (e: TimeoutCancellationException) {
            Log.e("SmartSwitch", "Timeout: Device out of range.")
            // Vital: Force close the hung connection so we can try again later
            try { gatt?.disconnect(); gatt?.close() } catch (e: Exception) {}
        } catch (e: Exception) {
            Log.e("SmartSwitch", "Connection Error: ${e.message}")
            try { gatt?.disconnect(); gatt?.close() } catch (e: Exception) {}
        }
    }
    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val serviceChannel = NotificationChannel(
                CHANNEL_ID,
                "Smart Dorm Service",
                NotificationManager.IMPORTANCE_MAX
            )
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(serviceChannel)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        isRunning = false
        serviceJob.cancel()

        if (wakeLock?.isHeld == true) {
            wakeLock?.release()
        }
    }
}