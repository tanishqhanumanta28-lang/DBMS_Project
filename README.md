# School Transport Route & Student Pickup Management System
DBMS Project 21 · PostgreSQL 15+ · 12 tables, 2 triggers, 6 reports

## Layout
```
school-transport/
├── server.py              static server for the web app (port 5000), same as the railway project
├── app.html               the web app (own in-browser engine, works offline)
├── engine.js              the engine, as a separate file for testing
├── backend/
│   ├── app.py             Flask JSON API (port 5001)
│   └── db.py              psycopg connection helper
├── database/
│   ├── schema.sql         12 tables, constraints, partial unique index
│   ├── triggers.sql       capacity trigger + pickup-log trigger
│   ├── views.sql          vw_FeeDues
│   ├── seed.sql           fictional sample data
│   ├── queries.sql        the 6 review reports
│   └── reset.sh           drop + rebuild the database
├── tests/
│   ├── test_database.py   26 tests against real PostgreSQL (constraints, triggers, reports)
│   ├── test_api.py        Flask API tests (need psycopg + DATABASE_URL)
│   ├── pg_helper.py       starts a throwaway Postgres cluster for the tests
│   └── js/test_engine.js  tests for the frontend engine (node)
├── requirements.txt / requirements-dev.txt
├── setup.sh               creates .venv, installs deps, builds the DB
└── .env.example           DATABASE_URL, PORT
```

## Setup
```bash
./setup.sh                 # .venv + dependencies + database (needs psql and a running PostgreSQL)
source .venv/bin/activate  # Windows: .venv\Scripts\activate
python server.py           # web app: http://localhost:5000
python backend/app.py      # JSON API: http://localhost:5001 (optional)
```
Edit `.env` (DATABASE_URL) if your PostgreSQL user/password differ.

Manual database build: `psql -f database/schema.sql`, then `triggers.sql`, `views.sql`, `seed.sql`.

## Tests
```bash
python -m unittest discover -s tests -t . -v    # or: pytest
node tests/js/test_engine.js                    # frontend engine
```
`test_database.py` starts its own temporary PostgreSQL cluster (needs the server binaries,
e.g. `/usr/lib/postgresql/*/bin`). To use a server you already run, set `TEST_PG=external` plus `PGHOST/PGUSER/PGPASSWORD`.

## API
| Method | Path | Purpose |
|---|---|---|
| GET | /api/health | DB connectivity |
| GET | /api/routes | ordered stops per route |
| GET | /api/reports/capacity | bus utilization |
| GET | /api/reports/absent?date=YYYY-MM-DD | active students with no pickup |
| GET | /api/reports/fee-dues | outstanding balances |
| GET | /api/reports/assignments | bus, driver, attendant per route |
| GET | /api/reports/maintenance | latest service, overdue flag |
| POST | /api/registrations | register a student (capacity trigger applies) |
| POST | /api/registrations/{id}/deregister | set INACTIVE |
| POST | /api/pickup-log | log PICKUP / DROP (pickup trigger applies) |

Integrity errors from constraints and triggers return HTTP 409 with the PostgreSQL message.
