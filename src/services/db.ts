import SQLite from 'react-native-sqlite-storage';

// Use promises for standard async/await syntax
if (SQLite && SQLite.enablePromise) {
  SQLite.enablePromise(true);
} else {
  console.warn('SQLite native module not found. Offline database will not work.');
}

const database_name = "Dictozo.db";

let db: SQLite.SQLiteDatabase | null = null;

export const initDB = async () => {
  if (db) return db;
  if (!SQLite || !SQLite.openDatabase) {
    console.error("SQLite native module is missing.");
    return null;
  }
  try {
    db = await SQLite.openDatabase({
      name: database_name,
      location: 'default',
    });

    // Create table for saved vocabulary
    await db.executeSql(
      `CREATE TABLE IF NOT EXISTS SavedWords (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        word TEXT UNIQUE NOT NULL,
        definition TEXT NOT NULL,
        addedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );`
    );

    // Create table for offline fast-cache definitions
    await db.executeSql(
      `CREATE TABLE IF NOT EXISTS DictionaryCache (
        word TEXT PRIMARY KEY,
        definition TEXT NOT NULL,
        fetchedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      );`
    );

    return db;
  } catch (error) {
    console.error("DB Initialization Error: ", error);
    throw error;
  }
};

export const cacheDefinition = async (word: string, definition: string) => {
  try {
    const database = await initDB();
    if (!database) return;
    await database.executeSql(
        'INSERT OR REPLACE INTO DictionaryCache (word, definition) VALUES (?, ?)', 
        [word.toLowerCase().trim(), definition]
    );
  } catch (error) {
    console.error("Cache Error: ", error);
  }
};

export const getCachedDefinition = async (word: string): Promise<string | null> => {
  try {
    const database = await initDB();
    if (!database) return null;
    const [results] = await database.executeSql(
        'SELECT definition FROM DictionaryCache WHERE word = ? COLLATE NOCASE', 
        [word.toLowerCase().trim()]
    );
    if (results.rows.length > 0) {
      return results.rows.item(0).definition;
    }
    return null;
  } catch (error) {
    console.error("Fetch Cache Error: ", error);
    return null;
  }
};

export const saveWord = async (word: string, definition: string) => {
  try {
    const database = await initDB();
    if (!database) return;
    await database.executeSql(
        'INSERT OR IGNORE INTO SavedWords (word, definition) VALUES (?, ?)', 
        [word.toLowerCase().trim(), definition]
    );
  } catch (error) {
    console.error("Save Word Error: ", error);
  }
};

export const getAllSavedWords = async () => {
  try {
    const database = await initDB();
    if (!database) return [];
    const [results] = await database.executeSql('SELECT * FROM SavedWords ORDER BY addedAt DESC');
    const words = [];
    for (let i = 0; i < results.rows.length; i++) {
      words.push(results.rows.item(i));
    }
    return words;
  } catch (error) {
    console.error("Fetch All Words Error: ", error);
    return [];
  }
};
