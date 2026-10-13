"""School Transport Route & Student Pickup Management - Flask API + static frontend."""
import os
from flask import Flask, jsonify, request, send_from_directory
import psycopg
from psycopg import errors
import db

app = Flask(__name__, static_folder="static", static_url_path="/static")


@app.get("/")
def index():
    return send_from_directory("static", "index.html")


@app.errorhandler(psycopg.Error)
def db_error(e):
    """Surface PostgreSQL integrity errors (constraints and the two triggers) as 4xx JSON."""
    code = getattr(e, "sqlstate", None) or "XX000"
    status = 409 if code.startswith("23") else 400 if code.startswith("22") else 500
    msg = e.diag.message_primary if getattr(e, "diag", None) and e.diag.message_primary else str(e)
    return jsonify(error=msg, sqlstate=code), status


def need(body, *keys):
    missing = [k for k in keys if body.get(k) in (None, "")]
    if missing:
        return jsonify(error="Missing field(s): " + ", ".join(missing)), 400
    return None


@app.get("/api/health")
def health():
    return jsonify(db.query("SELECT 1 AS ok")[0])


@app.get("/api/routes")
def routes():
    return jsonify(db.query("""
        SELECT r.route_id, r.route_name, rs.seq_no, s.stop_name, rs.scheduled_time::text AS scheduled_time
        FROM Route r JOIN RouteSequence rs ON rs.route_id = r.route_id
        JOIN Stop s ON s.stop_id = rs.stop_id ORDER BY r.route_id, rs.seq_no"""))


@app.get("/api/reports/capacity")
def capacity():
    return jsonify(db.query("""
        SELECT r.route_id, r.route_name, b.number AS bus_number, b.capacity AS total_seats,
               COUNT(tr.reg_id)::int AS active_students,
               (b.capacity - COUNT(tr.reg_id))::int AS vacant_seats,
               ROUND(100.0 * COUNT(tr.reg_id) / b.capacity, 2)::float AS utilization_pct
        FROM Route r JOIN Bus b ON b.bus_id = r.bus_id
        LEFT JOIN TransportRegistration tr ON tr.route_id = r.route_id AND tr.status = 'ACTIVE'
        GROUP BY r.route_id, r.route_name, b.number, b.capacity ORDER BY r.route_id"""))


@app.get("/api/reports/absent")
def absent():
    date = request.args.get("date")
    if not date:
        return jsonify(error="date=YYYY-MM-DD is required"), 400
    return jsonify(db.query("""
        SELECT tr.reg_id, s.name AS student_name, s.class, s.section, s.guardian_name,
               r.route_name, st.stop_name AS home_stop
        FROM TransportRegistration tr
        JOIN Student s ON s.student_id = tr.student_id
        JOIN Route r ON r.route_id = tr.route_id
        JOIN Stop st ON st.stop_id = tr.stop_id
        WHERE tr.status = 'ACTIVE' AND NOT EXISTS (
            SELECT 1 FROM PickupLog pl WHERE pl.reg_id = tr.reg_id
              AND pl.trip_date = %s AND pl.event_type = 'PICKUP')
        ORDER BY r.route_id, s.name""", (date,)))


@app.get("/api/reports/fee-dues")
def fee_dues():
    return jsonify(db.query("""
        SELECT reg_id, student_id, student_name, class, section, route_name, term, academic_year,
               plan_amount::float, total_paid::float, balance_due::float
        FROM vw_FeeDues WHERE balance_due > 0 ORDER BY balance_due DESC, student_name"""))


@app.get("/api/reports/assignments")
def assignments():
    return jsonify(db.query("""
        SELECT r.route_id, r.route_name, r.shift, b.number AS bus_number, d.name AS driver_name,
               d.phone AS driver_phone, a.name AS attendant_name, a.phone AS attendant_phone
        FROM Route r JOIN Bus b ON b.bus_id = r.bus_id JOIN Driver d ON d.driver_id = r.driver_id
        JOIN Attendant a ON a.attendant_id = r.attendant_id ORDER BY r.route_id"""))


@app.get("/api/reports/maintenance")
def maintenance():
    return jsonify(db.query("""
        SELECT b.bus_id, b.number AS bus_number, b.status AS bus_status,
               m.service_date::text AS last_service, m.description, m.cost::float,
               m.next_due::text AS next_due,
               CASE WHEN m.next_due < CURRENT_DATE THEN 'OVERDUE' ELSE 'UP TO DATE' END AS service_status
        FROM Bus b JOIN MaintenanceRecord m ON m.bus_id = b.bus_id
        WHERE m.service_date = (SELECT MAX(m2.service_date) FROM MaintenanceRecord m2 WHERE m2.bus_id = b.bus_id)
        ORDER BY m.next_due"""))


@app.post("/api/registrations")
def register():
    b = request.get_json(silent=True) or {}
    bad = need(b, "student_id", "route_id", "stop_id", "plan_id", "start_date")
    if bad:
        return bad
    # Inactivate nothing automatically: the partial unique index and capacity trigger decide.
    row = db.execute("""
        INSERT INTO TransportRegistration (reg_id, student_id, route_id, stop_id, plan_id, start_date, status)
        VALUES ((SELECT COALESCE(MAX(reg_id), 0) + 1 FROM TransportRegistration), %s, %s, %s, %s, %s, 'ACTIVE')
        RETURNING reg_id""", (b["student_id"], b["route_id"], b["stop_id"], b["plan_id"], b["start_date"]))
    return jsonify(row), 201


@app.post("/api/registrations/<int:reg_id>/deregister")
def deregister(reg_id):
    row = db.execute("UPDATE TransportRegistration SET status = 'INACTIVE' WHERE reg_id = %s RETURNING reg_id", (reg_id,))
    return (jsonify(row), 200) if row else (jsonify(error="Registration not found"), 404)


@app.post("/api/pickup-log")
def pickup_log():
    b = request.get_json(silent=True) or {}
    bad = need(b, "reg_id", "trip_date", "event_type", "event_time")
    if bad:
        return bad
    row = db.execute("""
        INSERT INTO PickupLog (log_id, reg_id, trip_date, event_type, event_time)
        VALUES ((SELECT COALESCE(MAX(log_id), 0) + 1 FROM PickupLog), %s, %s, %s, %s)
        RETURNING log_id""", (b["reg_id"], b["trip_date"], b["event_type"], b["event_time"]))
    return jsonify(row), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 5000)), debug=True)
