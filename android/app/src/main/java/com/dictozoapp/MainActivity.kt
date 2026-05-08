package com.dictozoapp

import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate

class MainActivity : ReactActivity() {

  override fun getMainComponentName(): String = "DictozoApp"

  override fun onCreate(savedInstanceState: Bundle?) {
    super.onCreate(null)
  }

  override fun createReactActivityDelegate(): ReactActivityDelegate =
      object : DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled) {
          override fun getLaunchOptions(): Bundle? {
              val initialProperties = Bundle()
              val intent = intent
              if (intent != null) {
                  var text: CharSequence? = null
                  if (intent.action == Intent.ACTION_PROCESS_TEXT) {
                      text = intent.getCharSequenceExtra(Intent.EXTRA_PROCESS_TEXT)
                  } else if (intent.action == Intent.ACTION_SEND && "text/plain" == intent.type) {
                      text = intent.getStringExtra(Intent.EXTRA_TEXT)
                  }
                  
                  if (!text.isNullOrEmpty()) {
                      initialProperties.putString("processText", text.toString())
                  }
              }
              return initialProperties
          }
      }
}
