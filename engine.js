'use strict';
/* ============================================================================
   ENGINE: a small in-browser relational store that enforces the Review 2 schema
   (types, NOT NULL, CHECK, PRIMARY KEY, UNIQUE, the partial unique index,
   foreign keys including the composite one) and runs the two BEFORE triggers.
   Error codes and messages follow PostgreSQL's wording.
   ========================================================================== */

class DbError extends Error {
  constructor(code, message, detail, constraint) {
    super(message);
    this.code = code;
    this.detail = detail || '';
    this.constraint = constraint || '';
  }
}

const I = (n, o = {}) => ({ n, t: 'int', ...o });
const S = (n, max, o = {}) => ({ n, t: 'text', max, ...o });
const N = (n, p, s, o = {}) => ({ n, t: 'num', p, s, ...o });
const D = (n, o = {}) => ({ n, t: 'date', ...o });
const TM = (n, o = {}) => ({ n, t: 'time', ...o });
const oneOf = (...xs) => (v) => xs.includes(v);

const SCHEMA = {
  Bus: {
    pk: ['bus_id'],
    cols: [I('bus_id'), S('number', 20, { unique: true }), I('capacity', { check: (v) => v > 0 && v <= 60 }),
      S('model', 80), S('status', 12, { check: oneOf('ACTIVE', 'SERVICE') })],
  },
  Driver: {
    pk: ['driver_id'],
    cols: [I('driver_id'), S('name', 80),
      S('license_no', 15, { unique: true, check: (v) => /^[A-Z]{2}[0-9]{2}[0-9]{11}$/.test(v) }), S('phone', 15)],
  },
  Attendant: { pk: ['attendant_id'], cols: [I('attendant_id'), S('name', 80), S('phone', 15)] },
  Route: {
    pk: ['route_id'],
    cols: [I('route_id'), S('route_name', 100), I('bus_id'), I('driver_id'), I('attendant_id'),
      S('shift', 10, { check: oneOf('MORNING', 'AFTERNOON') })],
    fks: [{ c: ['bus_id'], ref: 'Bus' }, { c: ['driver_id'], ref: 'Driver' }, { c: ['attendant_id'], ref: 'Attendant' }],
  },
  Stop: {
    pk: ['stop_id'],
    cols: [I('stop_id'), S('stop_name', 100), N('latitude', 9, 6, { check: (v) => v >= -90 && v <= 90 }),
      N('longitude', 9, 6, { check: (v) => v >= -180 && v <= 180 })],
  },
  RouteSequence: {
    pk: ['route_id', 'stop_id'],
    cols: [I('route_id'), I('stop_id'), I('seq_no', { check: (v) => v > 0 }), TM('scheduled_time')],
    uniques: [{ c: ['route_id', 'seq_no'] }],
    fks: [{ c: ['route_id'], ref: 'Route' }, { c: ['stop_id'], ref: 'Stop' }],
  },
  Student: {
    pk: ['student_id'],
    cols: [I('student_id'), S('name', 80), S('class', 8), S('section', 4), S('guardian_name', 80)],
  },
  FeePlan: {
    pk: ['plan_id'],
    cols: [I('plan_id'), S('term', 20), N('amount', 10, 2, { check: (v) => v > 0 }), S('academic_year', 9)],
  },
  TransportRegistration: {
    pk: ['reg_id'],
    cols: [I('reg_id'), I('student_id'), I('route_id'), I('stop_id'), I('plan_id'), D('start_date'),
      S('status', 10, { check: oneOf('ACTIVE', 'INACTIVE') })],
    fks: [{ c: ['student_id'], ref: 'Student' }, { c: ['plan_id'], ref: 'FeePlan' },
      { c: ['route_id', 'stop_id'], ref: 'RouteSequence' }],
    partial: [{ name: 'one_active_assignment_per_student', c: ['student_id'], when: (r) => r.status === 'ACTIVE' }],
    triggers: [{ name: 'trg_enforce_bus_capacity', on: ['INSERT', 'UPDATE'], of: ['route_id', 'status'], fn: 'capacity' }],
  },
  PickupLog: {
    pk: ['log_id'],
    cols: [I('log_id'), I('reg_id'), D('trip_date'), S('event_type', 8, { check: oneOf('PICKUP', 'DROP') }), TM('event_time')],
    uniques: [{ c: ['reg_id', 'trip_date', 'event_type'] }],
    fks: [{ c: ['reg_id'], ref: 'TransportRegistration' }],
    triggers: [{ name: 'trg_validate_pickup_log', on: ['INSERT', 'UPDATE'], fn: 'pickup' }],
  },
  Payment: {
    pk: ['payment_id'],
    cols: [I('payment_id'), I('reg_id'), D('paid_on'), N('amount', 10, 2, { check: (v) => v > 0 && v <= 50000 }),
      S('receipt_no', 30, { unique: true })],
    fks: [{ c: ['reg_id'], ref: 'TransportRegistration' }],
  },
  MaintenanceRecord: {
    pk: ['maint_id'],
    cols: [I('maint_id'), I('bus_id'), D('service_date'), S('description', 200), N('cost', 10, 2, { check: (v) => v >= 0 }), D('next_due')],
    fks: [{ c: ['bus_id'], ref: 'Bus' }],
  },
};

const TABLE_ORDER = ['Bus', 'Driver', 'Attendant', 'Route', 'Stop', 'RouteSequence', 'Student', 'FeePlan',
  'TransportRegistration', 'PickupLog', 'Payment', 'MaintenanceRecord'];

/* Same sample rows as review2_queries_and_views.sql (all people are fictional). */
const SEED = {
  Bus: [
    { bus_id: 18, number: 'CG04-SC-0018', capacity: 24, model: 'Eicher Skyline', status: 'SERVICE' },
    { bus_id: 27, number: 'CG04-SC-0027', capacity: 32, model: 'Ashok Leyland Oyster', status: 'ACTIVE' },
    { bus_id: 43, number: 'CG04-SC-0043', capacity: 40, model: 'Tata Starbus', status: 'ACTIVE' },
  ],
  Driver: [
    { driver_id: 1, name: 'Ramesh Sahu', license_no: 'CG0420180012345', phone: '9826100101' },
    { driver_id: 2, name: 'Dilip Yadav', license_no: 'CG0420190054321', phone: '9826100102' },
    { driver_id: 3, name: 'Mohan Verma', license_no: 'CG0420200098765', phone: '9826100103' },
  ],
  Attendant: [
    { attendant_id: 1, name: 'Sunita Bai', phone: '9826200201' },
    { attendant_id: 2, name: 'Kavita Netam', phone: '9826200202' },
  ],
  Route: [
    { route_id: 1, route_name: 'Civil Lines → KPS Dunda', bus_id: 43, driver_id: 1, attendant_id: 1, shift: 'MORNING' },
    { route_id: 2, route_name: 'Shankar Nagar → KPS', bus_id: 27, driver_id: 2, attendant_id: 2, shift: 'MORNING' },
  ],
  Stop: [
    { stop_id: 1, stop_name: 'Civil Lines', latitude: 21.2393, longitude: 81.6521 },
    { stop_id: 2, stop_name: 'Indira Gandhi Chowk', latitude: 21.2366, longitude: 81.6702 },
    { stop_id: 3, stop_name: 'Allen Career Institute', latitude: 21.2232, longitude: 81.6452 },
    { stop_id: 4, stop_name: 'Colours Mall', latitude: 21.2171, longitude: 81.6563 },
    { stop_id: 5, stop_name: 'Krishna Public School', latitude: 21.1965, longitude: 81.6441 },
    { stop_id: 6, stop_name: 'Shankar Nagar', latitude: 21.24, longitude: 81.66 },
  ],
  RouteSequence: [
    { route_id: 1, stop_id: 1, seq_no: 1, scheduled_time: '06:45:00' },
    { route_id: 1, stop_id: 2, seq_no: 2, scheduled_time: '06:53:00' },
    { route_id: 1, stop_id: 3, seq_no: 3, scheduled_time: '07:01:00' },
    { route_id: 1, stop_id: 4, seq_no: 4, scheduled_time: '07:12:00' },
    { route_id: 1, stop_id: 5, seq_no: 5, scheduled_time: '07:30:00' },
    { route_id: 2, stop_id: 6, seq_no: 1, scheduled_time: '06:50:00' },
    { route_id: 2, stop_id: 5, seq_no: 2, scheduled_time: '07:25:00' },
  ],
  Student: [
    { student_id: 1, name: 'Aarav Sharma', class: '8', section: 'A', guardian_name: 'Rajesh Sharma' },
    { student_id: 2, name: 'Ishita Verma', class: '7', section: 'B', guardian_name: 'Meena Verma' },
    { student_id: 3, name: 'Kabir Singh', class: '9', section: 'A', guardian_name: 'Harpreet Singh' },
    { student_id: 4, name: 'Anaya Patel', class: '6', section: 'C', guardian_name: 'Nilesh Patel' },
    { student_id: 5, name: 'Vihaan Tiwari', class: '8', section: 'B', guardian_name: 'Sanjay Tiwari' },
    { student_id: 6, name: 'Diya Chandrakar', class: '5', section: 'A', guardian_name: 'Pooja Chandrakar' },
  ],
  FeePlan: [
    { plan_id: 1, term: 'TERM-1', amount: 6500, academic_year: '2026-2027' },
    { plan_id: 2, term: 'ANNUAL', amount: 6000, academic_year: '2025-2026' },
  ],
  TransportRegistration: [
    { reg_id: 1, student_id: 1, route_id: 1, stop_id: 1, plan_id: 1, start_date: '2026-07-01', status: 'ACTIVE' },
    { reg_id: 2, student_id: 2, route_id: 1, stop_id: 2, plan_id: 1, start_date: '2026-07-01', status: 'ACTIVE' },
    { reg_id: 3, student_id: 3, route_id: 1, stop_id: 3, plan_id: 1, start_date: '2026-07-01', status: 'ACTIVE' },
    { reg_id: 4, student_id: 4, route_id: 1, stop_id: 4, plan_id: 1, start_date: '2026-07-01', status: 'ACTIVE' },
    { reg_id: 5, student_id: 5, route_id: 2, stop_id: 6, plan_id: 1, start_date: '2026-07-01', status: 'ACTIVE' },
    { reg_id: 6, student_id: 6, route_id: 2, stop_id: 6, plan_id: 1, start_date: '2026-07-01', status: 'ACTIVE' },
    { reg_id: 7, student_id: 1, route_id: 2, stop_id: 6, plan_id: 2, start_date: '2025-07-01', status: 'INACTIVE' },
  ],
  PickupLog: [
    { log_id: 1, reg_id: 1, trip_date: '2026-10-11', event_type: 'PICKUP', event_time: '06:46:00' },
    { log_id: 2, reg_id: 2, trip_date: '2026-10-11', event_type: 'PICKUP', event_time: '06:54:00' },
    { log_id: 3, reg_id: 4, trip_date: '2026-10-11', event_type: 'PICKUP', event_time: '07:13:00' },
    { log_id: 4, reg_id: 5, trip_date: '2026-10-11', event_type: 'PICKUP', event_time: '06:51:00' },
    { log_id: 5, reg_id: 1, trip_date: '2026-10-11', event_type: 'DROP', event_time: '07:31:00' },
    { log_id: 6, reg_id: 2, trip_date: '2026-10-11', event_type: 'DROP', event_time: '07:31:00' },
    { log_id: 7, reg_id: 4, trip_date: '2026-10-11', event_type: 'DROP', event_time: '07:32:00' },
    { log_id: 8, reg_id: 5, trip_date: '2026-10-11', event_type: 'DROP', event_time: '07:26:00' },
  ],
  Payment: [
    { payment_id: 1, reg_id: 1, paid_on: '2026-07-05', amount: 6500, receipt_no: 'RCPT-2026-0001' },
    { payment_id: 2, reg_id: 2, paid_on: '2026-07-06', amount: 3000, receipt_no: 'RCPT-2026-0002' },
    { payment_id: 3, reg_id: 2, paid_on: '2026-09-10', amount: 1500, receipt_no: 'RCPT-2026-0031' },
    { payment_id: 4, reg_id: 4, paid_on: '2026-07-08', amount: 6500, receipt_no: 'RCPT-2026-0004' },
    { payment_id: 5, reg_id: 5, paid_on: '2026-07-09', amount: 3250, receipt_no: 'RCPT-2026-0005' },
    { payment_id: 6, reg_id: 7, paid_on: '2025-07-02', amount: 6000, receipt_no: 'RCPT-2025-0090' },
  ],
  MaintenanceRecord: [
    { maint_id: 1, bus_id: 18, service_date: '2026-02-20', description: 'Routine service and oil change', cost: 6800, next_due: '2026-08-20' },
    { maint_id: 2, bus_id: 18, service_date: '2026-08-20', description: 'Brake pad replacement and gearbox inspection', cost: 18500, next_due: '2026-09-30' },
    { maint_id: 3, bus_id: 27, service_date: '2026-06-15', description: 'Engine oil change and tyre rotation', cost: 7200, next_due: '2026-12-15' },
    { maint_id: 4, bus_id: 43, service_date: '2026-07-10', description: 'Full service and fitness inspection', cost: 12400, next_due: '2027-01-10' },
  ],
};

/* ---------- type parsing ---------- */
function parseValue(col, raw) {
  if (raw === undefined || raw === null) return null;
  if (typeof raw === 'string' && raw.trim() === '' ) return null;
  const s = String(raw).trim();
  switch (col.t) {
    case 'int': {
      if (!/^-?\d+$/.test(s)) throw new DbError('22P02', `invalid input syntax for type integer: "${s}"`);
      const n = Number(s);
      if (Math.abs(n) > 2147483647) throw new DbError('22003', `value "${s}" is out of range for type integer`);
      return n;
    }
    case 'num': {
      if (!/^-?\d+(\.\d+)?$/.test(s)) throw new DbError('22P02', `invalid input syntax for type numeric: "${s}"`);
      const n = Math.round(Number(s) * 10 ** col.s) / 10 ** col.s;
      if (Math.abs(n) >= 10 ** (col.p - col.s)) {
        throw new DbError('22003', 'numeric field overflow',
          `A field with precision ${col.p}, scale ${col.s} must round to an absolute value less than 10^${col.p - col.s}.`);
      }
      return n;
    }
    case 'text':
      if (s.length > col.max) throw new DbError('22001', `value too long for type character varying(${col.max})`);
      return s;
    case 'date': {
      const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
      const d = m && new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
      if (!m || d.getUTCFullYear() !== +m[1] || d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) {
        throw new DbError('22007', `invalid input syntax for type date: "${s}"`);
      }
      return s;
    }
    case 'time': {
      const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s);
      if (!m || +m[1] > 23 || +m[2] > 59 || +(m[3] || 0) > 59) {
        throw new DbError('22007', `invalid input syntax for type time: "${s}"`);
      }
      return `${m[1].padStart(2, '0')}:${m[2]}:${(m[3] || '00').padStart(2, '0')}`;
    }
  }
  return s;
}

const lc = (s) => s.toLowerCase();
const keyText = (cols, row) => `(${cols.join(', ')})=(${cols.map((c) => row[c]).join(', ')})`;
const sqlLit = (v) => (v === null || v === undefined ? 'NULL' : typeof v === 'number' ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

/* ---------- BEFORE triggers (same logic as review2_schema_ddl.sql) ---------- */
const TRIGGERS = {
  capacity(db, NEW) {
    if (NEW.status !== 'ACTIVE') return;
    const route = db.find('Route', { route_id: NEW.route_id });
    if (!route) return;
    const cap = db.find('Bus', { bus_id: route.bus_id }).capacity;
    const active = db.data.TransportRegistration.filter(
      (r) => r.route_id === NEW.route_id && r.status === 'ACTIVE' && r.reg_id !== NEW.reg_id).length;
    if (active + 1 > cap) {
      throw new DbError('23514', `Capacity Conflict: Route ${NEW.route_id} already has ${active} ACTIVE students; its bus seats only ${cap}.`);
    }
  },
  pickup(db, NEW) {
    const reg = db.find('TransportRegistration', { reg_id: NEW.reg_id });
    if (!reg || reg.status !== 'ACTIVE') {
      throw new DbError('23514', `Integrity Violation: Registration ${NEW.reg_id} is not ACTIVE, so no pickup events can be logged.`);
    }
    const same = (type) => db.data.PickupLog.find(
      (l) => l.reg_id === NEW.reg_id && l.trip_date === NEW.trip_date && l.event_type === type && l.log_id !== NEW.log_id);
    if (NEW.event_type === 'DROP') {
      const pu = same('PICKUP');
      if (!pu) throw new DbError('23514', `Integrity Violation: Registration ${NEW.reg_id} has no PICKUP on ${NEW.trip_date} to match this DROP.`);
      if (NEW.event_time < pu.event_time) {
        throw new DbError('23514', `Integrity Violation: DROP time ${NEW.event_time} is before the PICKUP time ${pu.event_time}.`);
      }
    } else {
      const dr = same('DROP');
      if (dr && NEW.event_time > dr.event_time) {
        throw new DbError('23514', `Integrity Violation: PICKUP time ${NEW.event_time} is after the DROP time ${dr.event_time}.`);
      }
    }
  },
};

/* ---------- the database ---------- */
class Database {
  constructor(logger) {
    this.logger = logger || (() => {});
    this.depth = 0;
    this.reset();
  }

  reset() {
    this.data = JSON.parse(JSON.stringify(SEED));
  }

  log(kind, text) { this.logger(kind, text); }

  list(table) { return this.data[table]; }

  find(table, where) {
    return this.data[table].find((r) => Object.keys(where).every((k) => r[k] === where[k]));
  }

  nextId(table) {
    const pk = SCHEMA[table].pk[0];
    return this.data[table].reduce((m, r) => Math.max(m, r[pk]), 0) + 1;
  }

  /* BEGIN ... COMMIT / ROLLBACK around several statements */
  tx(label, fn) {
    if (this.depth > 0) return fn();
    const snap = JSON.stringify(this.data);
    this.depth++;
    this.log('sql', 'BEGIN;  -- ' + label);
    try {
      const out = fn();
      this.log('ok', 'COMMIT');
      return out;
    } catch (e) {
      this.data = JSON.parse(snap);
      this.log('warn', 'ROLLBACK · no changes were saved');
      throw e;
    } finally {
      this.depth--;
    }
  }

  /* ----- constraint checks shared by insert and update ----- */
  validate(table, row, self, op, setCols) {
    const sch = SCHEMA[table];
    const rel = lc(table);
    // BEFORE triggers run first, as in PostgreSQL
    for (const t of sch.triggers || []) {
      if (!t.on.includes(op)) continue;
      if (op === 'UPDATE' && t.of && !t.of.some((c) => setCols.includes(c))) continue;
      this.log('trg', `TRIGGER ${t.name} fired BEFORE ${op}`);
      TRIGGERS[t.fn](this, row);
    }
    for (const c of sch.cols) {
      if (row[c.n] === null) {
        throw new DbError('23502', `null value in column "${c.n}" of relation "${rel}" violates not-null constraint`);
      }
    }
    for (const c of sch.cols) {
      if (c.check && !c.check(row[c.n])) {
        throw new DbError('23514', `new row for relation "${rel}" violates check constraint "${rel}_${c.n}_check"`,
          `Failing row contains (${sch.cols.map((x) => row[x.n]).join(', ')}).`, `${rel}_${c.n}_check`);
      }
    }
    const others = this.data[table].filter((r) => r !== self);
    const dup = (cols, name, when) => {
      if (when && !when(row)) return;
      const hit = others.find((r) => cols.every((k) => r[k] === row[k]) && (!when || when(r)));
      if (hit) throw new DbError('23505', `duplicate key value violates unique constraint "${name}"`,
        `Key ${keyText(cols, row)} already exists.`, name);
    };
    dup(sch.pk, `${rel}_pkey`);
    for (const c of sch.cols) if (c.unique) dup([c.n], `${rel}_${c.n}_key`);
    for (const u of sch.uniques || []) dup(u.c, `${rel}_${u.c.join('_')}_key`);
    for (const p of sch.partial || []) dup(p.c, p.name, p.when);
    for (const fk of sch.fks || []) {
      const refSch = SCHEMA[fk.ref];
      const refCols = fk.c.length === refSch.pk.length ? refSch.pk : refSch.pk;
      const where = {};
      fk.c.forEach((c, i) => { where[refCols[i]] = row[c]; });
      if (!this.find(fk.ref, where)) {
        const name = `${rel}_${fk.c.join('_')}_fkey`;
        throw new DbError('23503', `insert or update on table "${rel}" violates foreign key constraint "${name}"`,
          `Key ${keyText(fk.c, row)} is not present in table "${lc(fk.ref)}".`, name);
      }
    }
  }

  stmt(kind, text, fn) {
    this.log('sql', text);
    try {
      const out = fn();
      this.log('ok', kind);
      return out;
    } catch (e) {
      if (e instanceof DbError) this.log('err', `ERROR ${e.code}: ${e.message}` + (e.detail ? `  ·  ${e.detail}` : ''));
      throw e;
    }
  }

  insert(table, input) {
    const sch = SCHEMA[table];
    const cols = sch.cols.map((c) => c.n);
    let row;
    const text = () => `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${cols.map((c) => sqlLit(row ? row[c] : input[c])).join(', ')});`;
    return this.stmt('INSERT 0 1', text(), () => {
      row = {};
      for (const c of sch.cols) row[c.n] = parseValue(c, input[c.n]);
      this.validate(table, row, null, 'INSERT', cols);
      this.data[table].push(row);
      return row;
    });
  }

  update(table, where, patch) {
    const sch = SCHEMA[table];
    const setCols = Object.keys(patch);
    const text = `UPDATE ${table} SET ${setCols.map((k) => `${k} = ${sqlLit(patch[k])}`).join(', ')} WHERE ${sch.pk.map((k) => `${k} = ${sqlLit(where[k])}`).join(' AND ')};`;
    return this.stmt('UPDATE 1', text, () => {
      const cur = this.find(table, where);
      if (!cur) throw new DbError('02000', 'no row matched the update');
      const row = { ...cur };
      for (const k of setCols) row[k] = parseValue(sch.cols.find((c) => c.n === k), patch[k]);
      this.validate(table, row, cur, 'UPDATE', setCols);
      Object.assign(cur, row);
      return cur;
    });
  }

  remove(table, where) {
    const sch = SCHEMA[table];
    const text = `DELETE FROM ${table} WHERE ${sch.pk.map((k) => `${k} = ${sqlLit(where[k])}`).join(' AND ')};`;
    return this.stmt('DELETE 1', text, () => {
      const cur = this.find(table, where);
      if (!cur) throw new DbError('02000', 'no row matched the delete');
      for (const other of TABLE_ORDER) {
        for (const fk of SCHEMA[other].fks || []) {
          if (fk.ref !== table) continue;
          const refCols = SCHEMA[table].pk;
          const used = this.data[other].some((r) => fk.c.every((c, i) => r[c] === cur[refCols[i]]));
          if (used) {
            const name = `${lc(other)}_${fk.c.join('_')}_fkey`;
            throw new DbError('23503', `update or delete on table "${lc(table)}" violates foreign key constraint "${name}" on table "${lc(other)}"`,
              `Key ${keyText(refCols, cur)} is still referenced from table "${lc(other)}".`, name);
          }
        }
      }
      this.data[table] = this.data[table].filter((r) => r !== cur);
      return cur;
    });
  }

  /* ----- read models (the same joins as the Review 2 reports) ----- */
  stopsOf(routeId) {
    return this.data.RouteSequence.filter((r) => r.route_id === routeId)
      .sort((a, b) => a.seq_no - b.seq_no)
      .map((rs) => ({ ...rs, stop: this.find('Stop', { stop_id: rs.stop_id }) }));
  }

  routeView(route) {
    const bus = this.find('Bus', { bus_id: route.bus_id });
    const active = this.data.TransportRegistration.filter((r) => r.route_id === route.route_id && r.status === 'ACTIVE').length;
    return {
      ...route, bus,
      driver: this.find('Driver', { driver_id: route.driver_id }),
      attendant: this.find('Attendant', { attendant_id: route.attendant_id }),
      stops: this.stopsOf(route.route_id),
      active, vacant: bus.capacity - active,
      pct: Math.round((10000 * active) / bus.capacity) / 100,
    };
  }

  paidFor(regId) {
    return this.data.Payment.filter((p) => p.reg_id === regId).reduce((s, p) => s + p.amount, 0);
  }

  regView(reg) {
    const plan = this.find('FeePlan', { plan_id: reg.plan_id });
    const paid = this.paidFor(reg.reg_id);
    const route = this.find('Route', { route_id: reg.route_id });
    return {
      ...reg,
      student: this.find('Student', { student_id: reg.student_id }),
      route, plan,
      stop: this.find('Stop', { stop_id: reg.stop_id }),
      seq: this.find('RouteSequence', { route_id: reg.route_id, stop_id: reg.stop_id }),
      bus: this.find('Bus', { bus_id: route.bus_id }),
      paid, due: Math.round((plan.amount - paid) * 100) / 100,
    };
  }

  /* vw_FeeDues: ACTIVE registrations only */
  feeDues() {
    return this.data.TransportRegistration.filter((r) => r.status === 'ACTIVE').map((r) => this.regView(r));
  }

  absentOn(date) {
    return this.data.TransportRegistration.filter((r) => r.status === 'ACTIVE' &&
      !this.data.PickupLog.some((l) => l.reg_id === r.reg_id && l.trip_date === date && l.event_type === 'PICKUP'))
      .map((r) => this.regView(r));
  }

  maintenanceStatus() {
    return this.data.Bus.flatMap((b) => {
      const recs = this.data.MaintenanceRecord.filter((m) => m.bus_id === b.bus_id);
      if (!recs.length) return [];
      const last = recs.reduce((a, m) => (m.service_date > a.service_date ? m : a));
      return recs.filter((m) => m.service_date === last.service_date).map((m) => ({ bus: b, ...m }));
    });
  }
}

if (typeof module !== 'undefined') module.exports = { Database, DbError, SCHEMA, SEED, TABLE_ORDER };
