-- ============================================================================
-- DBMS PROJECT 21: SCHOOL TRANSPORT ROUTE & STUDENT PICKUP MANAGEMENT SYSTEM
-- REVIEW 2: SAMPLE DATA POPULATION & 6 ANALYTICAL QUERIES / VIEWS
-- Target: PostgreSQL 15+  (run the Review 2 DDL script first)
-- ============================================================================

-- ============================================================================
-- 1. POPULATE SAMPLE DATA (all student and staff records are fictional)
-- ============================================================================

BEGIN;

-- Buses (Bus 18 is in the workshop, Buses 27 and 43 are in service on routes)
INSERT INTO Bus (bus_id, number, capacity, model, status) VALUES
(18, 'CG04-SC-0018', 24, 'Eicher Skyline',      'SERVICE'),
(27, 'CG04-SC-0027', 32, 'Ashok Leyland Oyster', 'ACTIVE'),
(43, 'CG04-SC-0043', 40, 'Tata Starbus',         'ACTIVE');

-- Drivers (license format: 2 letters + 13 digits)
INSERT INTO Driver (driver_id, name, license_no, phone) VALUES
(1, 'Ramesh Sahu',  'CG0420180012345', '9826100101'),
(2, 'Dilip Yadav',  'CG0420190054321', '9826100102'),
(3, 'Mohan Verma',  'CG0420200098765', '9826100103');

-- Attendants
INSERT INTO Attendant (attendant_id, name, phone) VALUES
(1, 'Sunita Bai',    '9826200201'),
(2, 'Kavita Netam',  '9826200202');

-- Routes (one crew and one bus per route, per shift)
INSERT INTO Route (route_id, route_name, bus_id, driver_id, attendant_id, shift) VALUES
(1, 'Civil Lines → KPS Dunda', 43, 1, 1, 'MORNING'),
(2, 'Shankar Nagar → KPS',     27, 2, 2, 'MORNING');

-- Stops (Shankar Nagar coordinates are approximate placeholders)
INSERT INTO Stop (stop_id, stop_name, latitude, longitude) VALUES
(1, 'Civil Lines',            21.239300, 81.652100),
(2, 'Indira Gandhi Chowk',    21.236600, 81.670200),
(3, 'Allen Career Institute', 21.223200, 81.645200),
(4, 'Colours Mall',           21.217100, 81.656300),
(5, 'Krishna Public School',  21.196500, 81.644100),
(6, 'Shankar Nagar',          21.240000, 81.660000);

-- Route sequences: ordered stops with scheduled times
INSERT INTO RouteSequence (route_id, stop_id, seq_no, scheduled_time) VALUES
(1, 1, 1, '06:45'),
(1, 2, 2, '06:53'),
(1, 3, 3, '07:01'),
(1, 4, 4, '07:12'),
(1, 5, 5, '07:30'),
(2, 6, 1, '06:50'),
(2, 5, 2, '07:25');

-- Students
INSERT INTO Student (student_id, name, class, section, guardian_name) VALUES
(1, 'Aarav Sharma',    '8',  'A', 'Rajesh Sharma'),
(2, 'Ishita Verma',    '7',  'B', 'Meena Verma'),
(3, 'Kabir Singh',     '9',  'A', 'Harpreet Singh'),
(4, 'Anaya Patel',     '6',  'C', 'Nilesh Patel'),
(5, 'Vihaan Tiwari',   '8',  'B', 'Sanjay Tiwari'),
(6, 'Diya Chandrakar', '5',  'A', 'Pooja Chandrakar');

-- Fee plans
INSERT INTO FeePlan (plan_id, term, amount, academic_year) VALUES
(1, 'TERM-1', 6500.00, '2026-2027'),
(2, 'ANNUAL', 6000.00, '2025-2026');

-- Transport registrations (student 1 has an older INACTIVE registration plus a current ACTIVE one)
INSERT INTO TransportRegistration (reg_id, student_id, route_id, stop_id, plan_id, start_date, status) VALUES
(1, 1, 1, 1, 1, '2026-07-01', 'ACTIVE'),
(2, 2, 1, 2, 1, '2026-07-01', 'ACTIVE'),
(3, 3, 1, 3, 1, '2026-07-01', 'ACTIVE'),
(4, 4, 1, 4, 1, '2026-07-01', 'ACTIVE'),
(5, 5, 2, 6, 1, '2026-07-01', 'ACTIVE'),
(6, 6, 2, 6, 1, '2026-07-01', 'ACTIVE'),
(7, 1, 2, 6, 2, '2025-07-01', 'INACTIVE');

-- Pickup log for the demo trip date 2026-10-11 (registrations 3 and 6 did not board)
INSERT INTO PickupLog (log_id, reg_id, trip_date, event_type, event_time) VALUES
(1,  1, '2026-10-11', 'PICKUP', '06:46'),
(2,  2, '2026-10-11', 'PICKUP', '06:54'),
(3,  4, '2026-10-11', 'PICKUP', '07:13'),
(4,  5, '2026-10-11', 'PICKUP', '06:51'),
(5,  1, '2026-10-11', 'DROP',   '07:31'),
(6,  2, '2026-10-11', 'DROP',   '07:31'),
(7,  4, '2026-10-11', 'DROP',   '07:32'),
(8,  5, '2026-10-11', 'DROP',   '07:26');

-- Payments (registrations 3 and 6 have paid nothing; 2 and 5 are part-paid)
INSERT INTO Payment (payment_id, reg_id, paid_on, amount, receipt_no) VALUES
(1, 1, '2026-07-05', 6500.00, 'RCPT-2026-0001'),
(2, 2, '2026-07-06', 3000.00, 'RCPT-2026-0002'),
(3, 2, '2026-09-10', 1500.00, 'RCPT-2026-0031'),
(4, 4, '2026-07-08', 6500.00, 'RCPT-2026-0004'),
(5, 5, '2026-07-09', 3250.00, 'RCPT-2026-0005'),
(6, 7, '2025-07-02', 6000.00, 'RCPT-2025-0090');

-- Maintenance history (Bus 18 is overdue for its next service)
INSERT INTO MaintenanceRecord (maint_id, bus_id, service_date, description, cost, next_due) VALUES
(1, 18, '2026-02-20', 'Routine service and oil change',                  6800.00,  '2026-08-20'),
(2, 18, '2026-08-20', 'Brake pad replacement and gearbox inspection',   18500.00,  '2026-09-30'),
(3, 27, '2026-06-15', 'Engine oil change and tyre rotation',             7200.00,  '2026-12-15'),
(4, 43, '2026-07-10', 'Full service and fitness inspection',            12400.00,  '2027-01-10');

COMMIT;


-- ============================================================================
-- 2. THE 6 ANALYTICAL QUERIES & VIEWS FOR REVIEW 2
-- ============================================================================

-- ----------------------------------------------------------------------------
-- REPORT 1: ROUTE LISTS (ORDERED STOPS WITH SCHEDULED TIMES)
-- Demonstrates: MULTI-TABLE JOIN, ORDER BY
-- ----------------------------------------------------------------------------
SELECT
    r.route_id,
    r.route_name,
    rs.seq_no,
    s.stop_name,
    rs.scheduled_time
FROM Route r
JOIN RouteSequence rs ON rs.route_id = r.route_id
JOIN Stop s ON s.stop_id = rs.stop_id
ORDER BY r.route_id, rs.seq_no;


-- ----------------------------------------------------------------------------
-- REPORT 2: BUS CAPACITY UTILIZATION PER ROUTE
-- Demonstrates: LEFT JOIN, GROUP BY, COUNT, ROUND, ARITHMETIC EXPRESSIONS
-- ----------------------------------------------------------------------------
SELECT
    r.route_id,
    r.route_name,
    b.number AS bus_number,
    b.capacity AS total_seats,
    COUNT(tr.reg_id) AS active_students,
    b.capacity - COUNT(tr.reg_id) AS vacant_seats,
    ROUND(100.0 * COUNT(tr.reg_id) / b.capacity, 2) AS utilization_pct
FROM Route r
JOIN Bus b ON b.bus_id = r.bus_id
LEFT JOIN TransportRegistration tr
       ON tr.route_id = r.route_id
      AND tr.status = 'ACTIVE'
GROUP BY r.route_id, r.route_name, b.number, b.capacity
ORDER BY r.route_id;


-- ----------------------------------------------------------------------------
-- REPORT 3: ABSENT STUDENTS ON A TRIP DATE
-- Demonstrates: NOT EXISTS CORRELATED SUBQUERY, MULTI-TABLE JOIN
-- (ACTIVE registrations with no PICKUP event on the trip date)
-- ----------------------------------------------------------------------------
SELECT
    tr.reg_id,
    s.name AS student_name,
    s.class,
    s.section,
    s.guardian_name,
    r.route_name,
    st.stop_name AS home_stop
FROM TransportRegistration tr
JOIN Student s ON s.student_id = tr.student_id
JOIN Route r ON r.route_id = tr.route_id
JOIN Stop st ON st.stop_id = tr.stop_id
WHERE tr.status = 'ACTIVE'
  AND NOT EXISTS (
        SELECT 1
        FROM PickupLog pl
        WHERE pl.reg_id = tr.reg_id
          AND pl.trip_date = DATE '2026-10-11'
          AND pl.event_type = 'PICKUP'
  )
ORDER BY r.route_id, s.name;


-- ----------------------------------------------------------------------------
-- REPORT 4: FEE DUES VIEW
-- Demonstrates: CREATE VIEW, SUBQUERY IN FROM, SUM, COALESCE, LEFT JOIN
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_FeeDues AS
SELECT
    tr.reg_id,
    s.student_id,
    s.name AS student_name,
    s.class,
    s.section,
    r.route_name,
    fp.term,
    fp.academic_year,
    fp.amount AS plan_amount,
    COALESCE(paid.total_paid, 0) AS total_paid,
    fp.amount - COALESCE(paid.total_paid, 0) AS balance_due
FROM TransportRegistration tr
JOIN Student s ON s.student_id = tr.student_id
JOIN Route r ON r.route_id = tr.route_id
JOIN FeePlan fp ON fp.plan_id = tr.plan_id
LEFT JOIN (
        SELECT reg_id, SUM(amount) AS total_paid
        FROM Payment
        GROUP BY reg_id
     ) paid ON paid.reg_id = tr.reg_id
WHERE tr.status = 'ACTIVE';

-- Test View: students with an outstanding balance, largest first
SELECT * FROM vw_FeeDues WHERE balance_due > 0 ORDER BY balance_due DESC, student_name;


-- ----------------------------------------------------------------------------
-- REPORT 5: DRIVER AND ATTENDANT ASSIGNMENTS
-- Demonstrates: FOUR-TABLE JOIN (Route, Bus, Driver, Attendant)
-- ----------------------------------------------------------------------------
SELECT
    r.route_id,
    r.route_name,
    r.shift,
    b.number AS bus_number,
    d.name AS driver_name,
    d.phone AS driver_phone,
    a.name AS attendant_name,
    a.phone AS attendant_phone
FROM Route r
JOIN Bus b ON b.bus_id = r.bus_id
JOIN Driver d ON d.driver_id = r.driver_id
JOIN Attendant a ON a.attendant_id = r.attendant_id
ORDER BY r.route_id;


-- ----------------------------------------------------------------------------
-- REPORT 6: MAINTENANCE STATUS AND OVERDUE SERVICING
-- Demonstrates: JOIN, CORRELATED MAX SUBQUERY, CASE, DATE FILTER
-- (latest service record per bus, flagged OVERDUE when next_due has passed)
-- ----------------------------------------------------------------------------
SELECT
    b.bus_id,
    b.number AS bus_number,
    b.status AS bus_status,
    m.service_date AS last_service,
    m.description,
    m.cost,
    m.next_due,
    CASE
        WHEN m.next_due < CURRENT_DATE THEN 'OVERDUE'
        ELSE 'UP TO DATE'
    END AS service_status
FROM Bus b
JOIN MaintenanceRecord m ON m.bus_id = b.bus_id
WHERE m.service_date = (
        SELECT MAX(m2.service_date)
        FROM MaintenanceRecord m2
        WHERE m2.bus_id = b.bus_id
  )
ORDER BY m.next_due;

-- Overdue buses only
SELECT b.number AS bus_number, m.next_due, CURRENT_DATE - m.next_due AS days_overdue
FROM Bus b
JOIN MaintenanceRecord m ON m.bus_id = b.bus_id
WHERE m.next_due < CURRENT_DATE
  AND m.service_date = (SELECT MAX(m2.service_date) FROM MaintenanceRecord m2 WHERE m2.bus_id = b.bus_id)
ORDER BY days_overdue DESC;
