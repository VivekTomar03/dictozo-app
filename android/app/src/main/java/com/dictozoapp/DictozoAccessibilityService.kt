package com.dictozoapp

import android.accessibilityservice.AccessibilityService
import android.graphics.Color
import android.graphics.PixelFormat
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.Gravity
import android.view.View
import android.view.WindowManager
import android.view.accessibility.AccessibilityEvent
import android.view.accessibility.AccessibilityNodeInfo
import android.widget.LinearLayout
import android.widget.TextView

class DictozoAccessibilityService : AccessibilityService() {

    private lateinit var dbHelper: DictionaryDbHelper
    private var savedWords = mapOf<String, String>()
    
    // UI Elements
    private var windowManager: WindowManager? = null
    private var overlayView: LinearLayout? = null
    private val mainHandler = Handler(Looper.getMainLooper())
    
    // Core anti-spam mechanism
    private val recentlyShownWords = mutableSetOf<String>()
    
    // Rate limit DB reads
    private var lastDbSync = 0L

    override fun onServiceConnected() {
        super.onServiceConnected()
        Log.i("Dictozo", "Accessibility Service Connected")
        dbHelper = DictionaryDbHelper(this)
        syncDictionary()
        setupOverlayUI()
    }

    private fun syncDictionary() {
        val now = System.currentTimeMillis()
        if (now - lastDbSync > 5000) { // Max sync every 5 seconds
            savedWords = dbHelper.getSavedWords()
            lastDbSync = now
            Log.d("Dictozo", "Dictionary Synced. Words: ${savedWords.size}")
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_CONTENT_CHANGED && 
            event.eventType != AccessibilityEvent.TYPE_VIEW_SCROLLED) return

        syncDictionary()
        if (savedWords.isEmpty()) return

        val rootNode = rootInActiveWindow ?: return
        
        val foundWords = mutableSetOf<String>()
        extractTextFromNode(rootNode, foundWords)
        
        val wordsToShow = mutableListOf<Pair<String, String>>()
        for (word in foundWords) {
            val lowercaseWord = word.lowercase()
            if (savedWords.containsKey(lowercaseWord) && !recentlyShownWords.contains(lowercaseWord)) {
                val definition = savedWords[lowercaseWord]
                if (definition != null) {
                    wordsToShow.add(Pair(word, definition))
                    // Add to recent set and remove after 30 seconds to prevent spam
                    recentlyShownWords.add(lowercaseWord)
                    mainHandler.postDelayed({
                        recentlyShownWords.remove(lowercaseWord)
                    }, 30000)
                }
            }
        }
        
        if (wordsToShow.isNotEmpty()) {
            showMultipleDefinitionsPopup(wordsToShow)
        }
    }

    private fun extractTextFromNode(node: AccessibilityNodeInfo?, foundWords: MutableSet<String>) {
        if (node == null) return

        if (node.text != null && node.text.isNotBlank()) {
            val elementText = node.text.toString().trim()
            
            // Allow exact matching (for phrases or hyphenated words)
            val lowerElement = elementText.lowercase()
            if (savedWords.containsKey(lowerElement)) {
                foundWords.add(lowerElement)
            } else {
                // Check sub-words
                val subWords = elementText.split(Regex("[^a-zA-Z0-9-]"))
                for (subWord in subWords) {
                    if (subWord.length > 2) { // Minimum word length filter
                        val lowerSubWord = subWord.lowercase()
                        if (savedWords.containsKey(lowerSubWord)) {
                            foundWords.add(lowerSubWord)
                        }
                    }
                }
            }
        }

        for (i in 0 until node.childCount) {
            val child = node.getChild(i)
            if (child != null) {
                extractTextFromNode(child, foundWords)
                child.recycle() // Important for memory management
            }
        }
    }

    private fun setupOverlayUI() {
        if (windowManager != null) return
        
        windowManager = getSystemService(WINDOW_SERVICE) as WindowManager
        
        overlayView = LinearLayout(this).apply {
            orientation = LinearLayout.VERTICAL
            setBackgroundColor(Color.WHITE)
            setPadding(30, 30, 30, 30)
            elevation = 15f
            visibility = View.GONE
        }
        
        val params = WindowManager.LayoutParams(
            WindowManager.LayoutParams.MATCH_PARENT,
            WindowManager.LayoutParams.WRAP_CONTENT,
            if (android.os.Build.VERSION.SDK_INT >= android.os.Build.VERSION_CODES.O) 
                WindowManager.LayoutParams.TYPE_APPLICATION_OVERLAY 
            else 
                @Suppress("DEPRECATION") WindowManager.LayoutParams.TYPE_PHONE,
            WindowManager.LayoutParams.FLAG_NOT_FOCUSABLE or 
            WindowManager.LayoutParams.FLAG_NOT_TOUCH_MODAL or 
            WindowManager.LayoutParams.FLAG_LAYOUT_IN_SCREEN,
            PixelFormat.TRANSLUCENT
        ).apply {
            gravity = Gravity.BOTTOM or Gravity.CENTER_HORIZONTAL
            y = 100 // Slight bottom margin
        }
        
        try {
            windowManager?.addView(overlayView, params)
        } catch (e: Exception) {
            Log.e("Dictozo", "Could not add overlay. Is SYSTEM_ALERT_WINDOW granted?", e)
        }
    }

    private fun showMultipleDefinitionsPopup(wordsToShow: List<Pair<String, String>>) {
        Log.i("Dictozo", "Showing popup for ${wordsToShow.size} words")

        mainHandler.post {
            overlayView?.removeAllViews()

            // Top row: label + dismiss button
            val topRow = android.widget.LinearLayout(this).apply {
                orientation = android.widget.LinearLayout.HORIZONTAL
                setPadding(0, 0, 0, 12)
            }

            val headerLabel = TextView(this).apply {
                text = if (wordsToShow.size > 1) "✨ ${wordsToShow.size} Words Found" else "✨ Dictozo"
                setTextColor(Color.parseColor("#6B7280"))
                textSize = 13f
                paint.isFakeBoldText = true
                layoutParams = android.widget.LinearLayout.LayoutParams(
                    0, android.widget.LinearLayout.LayoutParams.WRAP_CONTENT, 1f
                )
            }

            val dismissBtn = TextView(this).apply {
                text = "✕"
                setTextColor(Color.parseColor("#6B7280"))
                textSize = 16f
                setPadding(16, 0, 0, 0)
                setOnClickListener { overlayView?.visibility = View.GONE }
            }

            topRow.addView(headerLabel)
            topRow.addView(dismissBtn)
            overlayView?.addView(topRow)

            for ((word, definition) in wordsToShow) {
                val titleText = TextView(this).apply {
                    text = if (wordsToShow.size == 1) word else "• $word"
                    setTextColor(Color.parseColor("#2EBA72"))
                    textSize = 18f
                    setPadding(0, 4, 0, 4)
                    paint.isFakeBoldText = true
                }

                val definitionText = TextView(this).apply {
                    text = definition
                    setTextColor(Color.parseColor("#333333"))
                    textSize = 15f
                    setPadding(0, 0, 0, 14)
                }

                overlayView?.addView(titleText)
                overlayView?.addView(definitionText)
            }

            overlayView?.visibility = View.VISIBLE

            // Auto-hide after display time
            overlayView?.tag = System.currentTimeMillis()
            val currentTag = overlayView?.tag
            val displayTime = if (wordsToShow.size > 2) 10000L else 6000L
            mainHandler.postDelayed({
                if (overlayView?.tag == currentTag) {
                    overlayView?.visibility = View.GONE
                }
            }, displayTime)
        }
    }

    override fun onInterrupt() {
        // Nothing requested
    }
    
    override fun onDestroy() {
        super.onDestroy()
        if (overlayView != null) {
            windowManager?.removeView(overlayView)
        }
    }
}
