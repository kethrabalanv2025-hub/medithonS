import sqlite3
import re
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "college.db")
SQL_PATH = os.path.join(os.path.dirname(__file__), "schema.sql")

def init_database():
    print(f"Reading schema from: {SQL_PATH}")
    with open(SQL_PATH, "r") as f:
        sql = f.read()

    # Adapt T-SQL to SQLite
    sql = re.sub(r"CREATE DATABASE .*?;", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"USE .*?;", "", sql, flags=re.IGNORECASE)
    sql = re.sub(r"\bGO\b", "", sql)
    sql = re.sub(r"\bDATETIME2\b", "TEXT", sql, flags=re.IGNORECASE)

    if os.path.exists(DB_PATH):
        os.remove(DB_PATH)
        print(f"Removed previous database: {DB_PATH}")

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA foreign_keys = ON;")
    with conn:
        conn.executescript(sql)

    print(f"SQLite database successfully initialized at: {DB_PATH}")
    
    # Quick sanity check
    cur = conn.cursor()
    cur.execute("SELECT COUNT(*) FROM venues")
    venues = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM faculty")
    faculty = cur.fetchone()[0]
    cur.execute("SELECT COUNT(*) FROM venue_bookings")
    bookings = cur.fetchone()[0]
    print(f"Initialized with: {venues} venues, {faculty} faculty, {bookings} bookings.")

if __name__ == "__main__":
    init_database()
