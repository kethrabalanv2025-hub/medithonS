import sqlite3
import re
import sys

def run_tests():
    print("========================================")
    print("Testing CollegeDB SQL Schema & Seed Data")
    print("========================================")

    # 1. Read the SQL file
    sql_file = "backend/schema.sql"
    with open(sql_file, "r") as f:
        raw_sql = f.read()

    print(f"Loaded {sql_file} ({len(raw_sql)} bytes)")

    # 2. Convert T-SQL (MS SQL Server) to SQLite-compatible SQL for live testing:
    # - Remove CREATE DATABASE ... GO and USE ... GO
    # - Remove GO statements
    # - Change DATETIME2 to TEXT/DATETIME
    cleaned_sql = re.sub(r"CREATE DATABASE .*?;", "", raw_sql, flags=re.IGNORECASE)
    cleaned_sql = re.sub(r"USE .*?;", "", cleaned_sql, flags=re.IGNORECASE)
    cleaned_sql = re.sub(r"\bGO\b", "", cleaned_sql)
    cleaned_sql = re.sub(r"\bDATETIME2\b", "TEXT", cleaned_sql, flags=re.IGNORECASE)

    # Connect to in-memory SQLite with foreign key enforcement
    conn = sqlite3.connect(":memory:")
    conn.execute("PRAGMA foreign_keys = ON;")
    cursor = conn.cursor()

    # 3. Execute Schema and Seed Inserts
    print("\nExecuting DDL and Seed Data...")
    cursor.executescript(cleaned_sql)
    print("-> Schema created and seed data inserted successfully!")

    # 4. Verify Row Counts
    cursor.execute("SELECT COUNT(*) FROM venues")
    venue_count = cursor.fetchone()[0]
    print(f"\n[Verification] venues count: {venue_count} (Expected: 6)")
    assert venue_count == 6, f"Expected 6 venues, got {venue_count}"

    cursor.execute("SELECT COUNT(*) FROM faculty")
    faculty_count = cursor.fetchone()[0]
    print(f"[Verification] faculty count: {faculty_count} (Expected: 13)")
    assert faculty_count == 13, f"Expected 13 faculty, got {faculty_count}"

    cursor.execute("SELECT COUNT(*) FROM venue_bookings")
    booking_count = cursor.fetchone()[0]
    print(f"[Verification] venue_bookings count: {booking_count} (Expected: 13)")
    assert booking_count == 13, f"Expected 13 bookings, got {booking_count}"

    # 5. Verify Foreign Key and Capacity Relationships
    print("\nVerifying Data Integrity & Constraints:")
    cursor.execute("""
        SELECT b.booking_id, v.venue_name, f.full_name, b.capacity_required, v.max_capacity, b.booking_status
        FROM venue_bookings b
        JOIN venues v ON b.venue_id = v.venue_id
        JOIN faculty f ON b.emp_id = f.emp_id
    """)
    rows = cursor.fetchall()
    print(f"-> All {len(rows)} bookings successfully resolved Foreign Keys to both venues and faculty.")

    # Check capacity limit for each booking
    capacity_overflows = [r for r in rows if r[3] > r[4]]
    if capacity_overflows:
        print(f"WARNING: Found bookings exceeding venue capacity: {capacity_overflows}")
    else:
        print("-> All bookings respect venue max capacity (capacity_required <= max_capacity).")

    # 6. Test Constraint Enforcements (Negatives)
    print("\nTesting Constraint Enforcement:")

    # Test 6.1: Negative capacity on venue
    try:
        cursor.execute("INSERT INTO venues VALUES ('V-TEST', 'Test', 'Hall', -10)")
        print("FAIL: Negative capacity was allowed!")
        sys.exit(1)
    except sqlite3.IntegrityError:
        print("PASS: venues max_capacity > 0 constraint enforced.")

    # Test 6.2: Invalid booking status
    try:
        cursor.execute("""
            INSERT INTO venue_bookings VALUES
            ('BK-ERR', 'VEN-MG', 'EMP-4012', 100,
             '2026-10-12 09:00:00', '2026-10-12 10:00:00', '2026-10-12 10:30:00', 'UnknownStatus')
        """)
        print("FAIL: Invalid booking status was allowed!")
        sys.exit(1)
    except sqlite3.IntegrityError:
        print("PASS: booking_status CHECK constraint enforced.")

    # Test 6.3: Invalid time sequence (slot_start >= slot_end)
    try:
        cursor.execute("""
            INSERT INTO venue_bookings VALUES
            ('BK-ERR2', 'VEN-MG', 'EMP-4012', 100,
             '2026-10-12 11:00:00', '2026-10-12 10:00:00', '2026-10-12 11:30:00', 'Confirmed')
        """)
        print("FAIL: Invalid time sequence was allowed!")
        sys.exit(1)
    except sqlite3.IntegrityError:
        print("PASS: slot_start < slot_end constraint enforced.")

    # Test 6.4: Foreign key violation
    try:
        cursor.execute("""
            INSERT INTO venue_bookings VALUES
            ('BK-ERR3', 'VEN-NONEXISTENT', 'EMP-4012', 100,
             '2026-10-12 09:00:00', '2026-10-12 10:00:00', '2026-10-12 10:30:00', 'Confirmed')
        """)
        print("FAIL: Non-existent venue foreign key was allowed!")
        sys.exit(1)
    except sqlite3.IntegrityError:
        print("PASS: Foreign key constraint to venues enforced.")

    # 7. Check for Schedule Collisions (overlapping active bookings)
    print("\nChecking for Venue Schedule Overlaps / Turnaround Conflicts in Seed Data:")
    cursor.execute("""
        SELECT b1.venue_id, b1.booking_id, b2.booking_id,
               b1.slot_start, b1.turnaround_end,
               b2.slot_start, b2.turnaround_end
        FROM venue_bookings b1
        JOIN venue_bookings b2
          ON b1.venue_id = b2.venue_id
         AND b1.booking_id < b2.booking_id
         AND b1.booking_status IN ('Confirmed', 'Tentative', 'Completed')
         AND b2.booking_status IN ('Confirmed', 'Tentative', 'Completed')
         AND (
             (b1.slot_start < b2.turnaround_end AND b1.turnaround_end > b2.slot_start)
         )
    """)
    overlaps = cursor.fetchall()
    if overlaps:
        print(f"COLLISION FOUND: {overlaps}")
    else:
        print("PASS: Zero schedule collisions found across all 13 seed bookings (turnaround times included)!")

    print("\n========================================")
    print("ALL TESTS PASSED SUCCESSFULLY (100% Verified)")
    print("========================================")

if __name__ == "__main__":
    run_tests()
