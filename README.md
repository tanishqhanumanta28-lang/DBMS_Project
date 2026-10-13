# School Transport Route & Student Pickup Management System

**DBMS Course Project 21** · PostgreSQL 15+ · Python (Flask) · JavaScript

A database-driven system for managing school bus routes, student transport registrations, daily pickup/drop tracking, fee collection and bus maintenance. It comes with a PostgreSQL schema, two integrity triggers, six SQL reports, a JSON API, and a web console that runs fully in the browser.

**Author:** Spandan Rana

---

## Features

- **Route search** by stop and shift, with live seat availability
- **Student registration** with route, pickup stop and fee plan saved in one transaction
- **Pickup tracker** to log PICKUP and DROP events per trip, validated by a trigger
- **Fees and payments** ledger with balances, receipts and a fee-dues view
- **Deactivate / reactivate** registrations without losing history or payments
- **CRUD manager** for every table, with all constraints enforced
- **Analytics and reports** showing the six SQL reports with their queries
- **Maintenance tracking** with an overdue-service flag per bus

## Database design

**12 tables:** `Bus`, `Driver`, `Attendant`, `Route`, `Stop`, `RouteSequence`, `Student`, `FeePlan`, `TransportRegistration`, `PickupLog`, `Payment`, `MaintenanceRecord`

**Integrity rules**

| Rule | How it is enforced |
|---|---|
| A stop can only be used on a route that visits it | Composite foreign key `(route_id, stop_id)` to `RouteSequence` |
| One ACTIVE route per student | Partial unique index `one_active_assignment_per_student` |
| A bus cannot be over-filled | Trigger `trg_enforce_bus_capacity` |
| Pickup/drop events must be valid | Trigger `trg_validate_pickup_log` (registration must be ACTIVE, DROP needs a matching earlier PICKUP) |
| Valid data values | CHECK constraints (bus capacity, payment range, licence format, lat/long ranges, status values) |
| No duplicate receipts or events | UNIQUE constraints |

**View:** `vw_FeeDues` shows plan amount, total paid and balance for ACTIVE registrations.

**Six reports** (in `database/queries.sql`): route lists, capacity utilization, absent students, fee dues, driver assignments, maintenance status.

## Tech stack

- **Database:** PostgreSQL 15+
- **Backend:** Python 3, Flask, psycopg 3
- **Frontend:** HTML, CSS, vanilla JavaScript (a small in-browser relational engine that mirrors the schema, triggers and error messages)
- **Testing:** unittest / pytest, Node.js

## Project structure

```
school-transport/
├── server.py              static server for the web app (port 5000)
├── app.html               web console (own in-browser engine, works offline)
├── engine.js              the engine as a separate file, for testing
├── backend/
│   ├── app.py             Flask JSON API (port 5001)
│   └── db.py              psycopg connection helper
├── database/
│   ├── schema.sql         12 tables, constraints, partial unique index
│   ├── triggers.sql       capacity trigger + pickup-log trigger
│   ├── views.sql          vw_FeeDues
│   ├── seed.sql           fictional sample data
│   ├── queries.sql        the 6 reports
│   └── reset.sh           drop and rebuild the database
├── tests/
│   ├── test_database.py   tests against real PostgreSQL
│   ├── test_api.py        Flask API tests
│   ├── pg_helper.py       starts a throwaway Postgres cluster for tests
│   └── js/test_engine.js  tests for the frontend engine
├── requirements.txt
├── requirements-dev.txt
├── setup.sh               creates .venv, installs deps, builds the DB
└── .env.example           DATABASE_URL, PORT
```

## Getting started

### Option 1: Web console only (no setup)

The web console has its own in-browser database, so it needs no PostgreSQL.

```bash
python server.py
```

Open **http://localhost:5000**. Data resets on page reload (or use "Reset sample data").

### Option 2: Full stack with PostgreSQL

**Requirements:** Python 3.10+, PostgreSQL 15+ running locally, `psql` on your PATH.

```bash
git clone https://github.com/Spandan-project28/Spandan-Rana_DBMS_PBL.git
cd Spandan-Rana_DBMS_PBL

./setup.sh                   # creates .venv, installs packages, builds the database
source .venv/bin/activate    # Windows: .venv\Scripts\activate

python server.py             # web app: http://localhost:5000
python backend/app.py        # JSON API: http://localhost:5001
```

If your PostgreSQL username or password differs from the default, edit `.env` (copied from `.env.example`):

```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/school_transport
PORT=5001
```

**Manual database build** (instead of `setup.sh`):

```bash
psql -f database/schema.sql
psql -f database/triggers.sql
psql -f database/views.sql
psql -f database/seed.sql
```

## API

| Method | Path | Purpose |
|---|---|---|
| GET | `/api/health` | database connectivity |
| GET | `/api/routes` | ordered stops per route |
| GET | `/api/reports/capacity` | bus utilization |
| GET | `/api/reports/absent?date=YYYY-MM-DD` | active students with no pickup |
| GET | `/api/reports/fee-dues` | outstanding balances |
| GET | `/api/reports/assignments` | bus, driver and attendant per route |
| GET | `/api/reports/maintenance` | latest service and overdue flag |
| POST | `/api/registrations` | register a student (capacity trigger applies) |
| POST | `/api/registrations/{id}/deregister` | set registration INACTIVE |
| POST | `/api/pickup-log` | log PICKUP / DROP (pickup trigger applies) |

Constraint and trigger violations return **HTTP 409** with the PostgreSQL error message.

## Tests

```bash
python -m unittest discover -s tests -t . -v    # or: pytest
node tests/js/test_engine.js                    # frontend engine
```

`test_database.py` starts its own temporary PostgreSQL cluster (needs the server binaries, for example `/usr/lib/postgresql/*/bin`). To use a server you already run, set `TEST_PG=external` along with `PGHOST`, `PGUSER` and `PGPASSWORD`.

## Notes

- All names, phone numbers and licence numbers in the sample data are fictional.
- `.env` is git-ignored, so never commit real credentials.

## License

Academic project for a DBMS course. Free to read and learn from.
