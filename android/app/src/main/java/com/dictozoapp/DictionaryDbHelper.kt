package com.dictozoapp

import android.content.Context
import android.database.sqlite.SQLiteDatabase
import android.database.sqlite.SQLiteOpenHelper
import java.io.File

class DictionaryDbHelper(private val context: Context) :
    SQLiteOpenHelper(context, "Dictozo.db", null, 1) {

    override fun onCreate(db: SQLiteDatabase) {
        // Handled by React Native
    }

    override fun onUpgrade(db: SQLiteDatabase, oldVersion: Int, newVersion: Int) {
        // Handled by React Native
    }

    override fun getReadableDatabase(): SQLiteDatabase? {
        val dbPath = context.getDatabasePath("Dictozo.db")
        if (!dbPath.exists()) {
            return null
        }
        return SQLiteDatabase.openDatabase(dbPath.absolutePath, null, SQLiteDatabase.OPEN_READONLY)
    }

    fun getSavedWords(): Map<String, String> {
        val words = mutableMapOf<String, String>()
        val db = readableDatabase ?: return words

        try {
            val cursor = db.rawQuery("SELECT word, definition FROM SavedWords", null)
            if (cursor.moveToFirst()) {
                do {
                    val wordIndex = cursor.getColumnIndex("word")
                    val descIndex = cursor.getColumnIndex("definition")
                    if (wordIndex >= 0 && descIndex >= 0) {
                        words[cursor.getString(wordIndex).lowercase().trim()] = cursor.getString(descIndex)
                    }
                } while (cursor.moveToNext())
            }
            cursor.close()
        } catch (e: Exception) {
            e.printStackTrace()
        } finally {
            db.close()
        }
        return words
    }

    fun clearAllWords() {
        try {
            val db = writableDatabase ?: return
            db.delete("SavedWords", null, null)
            db.close()
        } catch (e: Exception) {
            e.printStackTrace()
        }
    }
}
