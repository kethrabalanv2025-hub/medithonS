CREATE DATABASE CollegeDB;
GO

USE CollegeDB;
GO

-- =========================================
-- TABLE: VENUES
-- =========================================

CREATE TABLE venues (
    venue_id VARCHAR(20) PRIMARY KEY,
    venue_name VARCHAR(100) NOT NULL,
    venue_type VARCHAR(100) NOT NULL,
    max_capacity INT NOT NULL CHECK (max_capacity > 0)
);
GO


-- =========================================
-- TABLE: FACULTY
-- =========================================

CREATE TABLE faculty (
    emp_id VARCHAR(20) PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    department VARCHAR(100) NOT NULL
);
GO


-- =========================================
-- TABLE: VENUE BOOKINGS
-- =========================================

CREATE TABLE venue_bookings (
    booking_id VARCHAR(20) PRIMARY KEY,

    venue_id VARCHAR(20) NOT NULL,
    emp_id VARCHAR(20) NOT NULL,

    capacity_required INT NOT NULL
        CHECK (capacity_required > 0),

    slot_start DATETIME2 NOT NULL,
    slot_end DATETIME2 NOT NULL,
    turnaround_end DATETIME2 NOT NULL,

    booking_status VARCHAR(20) NOT NULL
        CHECK (booking_status IN
        ('Confirmed', 'Tentative', 'Completed', 'Cancelled')),

    CONSTRAINT fk_booking_venue
        FOREIGN KEY (venue_id)
        REFERENCES venues(venue_id),

    CONSTRAINT fk_booking_faculty
        FOREIGN KEY (emp_id)
        REFERENCES faculty(emp_id),

    CONSTRAINT chk_time_sequence
        CHECK (slot_start < slot_end
        AND slot_end <= turnaround_end)
);
GO


-- =========================================
-- SEED DATA: VENUES
-- =========================================

INSERT INTO venues
(venue_id, venue_name, venue_type, max_capacity)
VALUES
('VEN-MG', 'MG Auditorium', 'Indoor Main Hall', 1500),
('VEN-KASTURBA', 'Kasturba Auditorium', 'Indoor Mid Hall', 600),
('VEN-KAMARAJ', 'Kamaraj Auditorium', 'Indoor Theater', 400),
('VEN-NETAJI', 'Netaji Auditorium', 'Semi-Acoustic Hall', 250),
('VEN-NSQ', 'North Square', 'Open Amphitheater', 2500),
('VEN-CLK', 'Clock Court', 'Open Central Plaza', 1000);
GO


-- =========================================
-- SEED DATA: FACULTY
-- =========================================

INSERT INTO faculty
(emp_id, full_name, department)
VALUES
('EMP-4012', 'Dr. Arvind Swaminathan', 'Computer Science & Engg.'),
('EMP-3184', 'Dr. Shalini Mukherjee', 'Student Affairs / Cultural'),
('EMP-2290', 'Prof. R. Balachandran', 'Mechanical Sciences'),
('EMP-5102', 'Dr. Neha Deshmukh', 'Biotechnology'),
('EMP-1845', 'Dr. Vikramaditya Rao', 'Electronics & Comm.'),
('EMP-6320', 'Prof. Meera Nambiar', 'Humanities & Social Sci.'),
('EMP-3491', 'Dr. T. K. Senthil Nathan', 'Physics & Nanotech'),
('EMP-4781', 'Dr. Ananya Sengupta', 'Chemistry & Materials'),
('EMP-1124', 'Prof. K. G. Radhakrishnan', 'Mathematics & Data Sci.'),
('EMP-5567', 'Dr. Farhan Qureshi', 'Fine Arts & Media'),
('EMP-2908', 'Dr. Preethi Venkatraman', 'Student Council'),
('EMP-3877', 'Prof. David J. D''Souza', 'Management Studies'),
('EMP-4629', 'Dr. Sunita Kulkarni', 'Alumni Relations');
GO


-- =========================================
-- SEED DATA: BOOKINGS
-- =========================================

INSERT INTO venue_bookings
(
    booking_id,
    venue_id,
    emp_id,
    capacity_required,
    slot_start,
    slot_end,
    turnaround_end,
    booking_status
)
VALUES
('BK-2026-101', 'VEN-MG', 'EMP-4012', 1200,
 '2026-10-12 09:00:00',
 '2026-10-12 13:00:00',
 '2026-10-12 14:00:00',
 'Confirmed'),

('BK-2026-102', 'VEN-MG', 'EMP-3184', 850,
 '2026-10-12 14:00:00',
 '2026-10-12 18:30:00',
 '2026-10-12 19:30:00',
 'Confirmed'),

('BK-2026-103', 'VEN-KASTURBA', 'EMP-2290', 450,
 '2026-10-12 10:00:00',
 '2026-10-12 13:30:00',
 '2026-10-12 14:15:00',
 'Completed'),

('BK-2026-104', 'VEN-KASTURBA', 'EMP-5102', 500,
 '2026-10-12 14:15:00',
 '2026-10-12 17:45:00',
 '2026-10-12 18:30:00',
 'Confirmed'),

('BK-2026-105', 'VEN-KAMARAJ', 'EMP-1845', 300,
 '2026-10-12 08:30:00',
 '2026-10-12 11:30:00',
 '2026-10-12 12:15:00',
 'Completed'),

('BK-2026-106', 'VEN-KAMARAJ', 'EMP-6320', 380,
 '2026-10-12 12:15:00',
 '2026-10-12 15:45:00',
 '2026-10-12 16:30:00',
 'Confirmed'),

('BK-2026-107', 'VEN-KAMARAJ', 'EMP-3491', 250,
 '2026-10-12 16:30:00',
 '2026-10-12 19:30:00',
 '2026-10-12 20:00:00',
 'Confirmed'),

('BK-2026-108', 'VEN-NETAJI', 'EMP-4781', 200,
 '2026-10-12 09:30:00',
 '2026-10-12 12:30:00',
 '2026-10-12 13:30:00',
 'Confirmed'),

('BK-2026-109', 'VEN-NETAJI', 'EMP-1124', 180,
 '2026-10-12 13:30:00',
 '2026-10-12 17:00:00',
 '2026-10-12 17:30:00',
 'Confirmed'),

('BK-2026-110', 'VEN-NSQ', 'EMP-5567', 1800,
 '2026-10-12 08:00:00',
 '2026-10-12 13:00:00',
 '2026-10-12 15:00:00',
 'Confirmed'),

('BK-2026-111', 'VEN-NSQ', 'EMP-2908', 2200,
 '2026-10-12 15:00:00',
 '2026-10-12 20:30:00',
 '2026-10-12 22:00:00',
 'Tentative'),

('BK-2026-112', 'VEN-CLK', 'EMP-3877', 600,
 '2026-10-12 10:00:00',
 '2026-10-12 14:00:00',
 '2026-10-12 15:30:00',
 'Confirmed'),

('BK-2026-113', 'VEN-CLK', 'EMP-4629', 750,
 '2026-10-12 15:30:00',
 '2026-10-12 19:30:00',
 '2026-10-12 20:30:00',
 'Confirmed');
GO


-- =========================================
-- VERIFY DATABASE
-- =========================================

SELECT * FROM venues;
GO

SELECT * FROM faculty;
GO

SELECT * FROM venue_bookings;
GO
