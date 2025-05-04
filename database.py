import sqlite3
import os

DATABASE_FILE = 'comparisons.db'

def get_db_connection():
    """Establishes a connection to the SQLite database."""
    conn = sqlite3.connect(DATABASE_FILE)
    conn.row_factory = sqlite3.Row # Return rows as dictionary-like objects
    return conn

def init_db():
    """Initializes the database and creates the table if it doesn't exist."""
    if os.path.exists(DATABASE_FILE):
        print("Database already exists.")
        # Optionally, check if the table exists and has the right columns
        # For simplicity, we assume if the file exists, the table is okay.
        return

    print("Initializing database...")
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE comparisons (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                item_a TEXT NOT NULL,
                item_b TEXT NOT NULL,
                explanation TEXT NOT NULL,
                result_value REAL,  -- Store the numerical value for the graph (can be NULL)
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        conn.commit()
        print("Database initialized successfully.")
    except sqlite3.Error as e:
        print(f"Error initializing database: {e}")
    finally:
        conn.close()

def add_comparison(item_a, item_b, explanation, result_value):
    """Adds a new comparison result to the database."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'INSERT INTO comparisons (item_a, item_b, explanation, result_value) VALUES (?, ?, ?, ?)',
            (item_a, item_b, explanation, result_value)
        )
        conn.commit()
        print(f"Added comparison: {item_a} in {item_b}")
        return cursor.lastrowid
    except sqlite3.Error as e:
        print(f"Error adding comparison: {e}")
        return None
    finally:
        conn.close()

def get_history(limit=10):
    """Retrieves the most recent comparison history."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, item_a, item_b, result_value FROM comparisons ORDER BY created_at DESC LIMIT ?',
            (limit,)
        )
        history = cursor.fetchall()
        # Convert Row objects to dictionaries for JSON serialization
        return [dict(row) for row in history]
    except sqlite3.Error as e:
        print(f"Error getting history: {e}")
        return []
    finally:
        conn.close()

def get_comparison_by_id(comparison_id):
    """Retrieves a specific comparison by its ID."""
    conn = get_db_connection()
    try:
        cursor = conn.cursor()
        cursor.execute(
            'SELECT id, item_a, item_b, explanation, result_value FROM comparisons WHERE id = ?',
            (comparison_id,)
        )
        comparison = cursor.fetchone()
        return dict(comparison) if comparison else None
    except sqlite3.Error as e:
        print(f"Error getting comparison by ID {comparison_id}: {e}")
        return None
    finally:
        conn.close()

# Initialize the database when the module is imported
if __name__ != "__main__": # Avoid running init_db() when running the script directly
    init_db() 