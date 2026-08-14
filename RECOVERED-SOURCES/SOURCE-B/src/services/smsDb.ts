import { createClient, Client } from '@libsql/client';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  UserContext,
  AcademicYear,
  AcademicStage,
  Grade,
  ClassRoom,
  AuditRecord,
  Student,
  Parent,
  StudentEnrollment,
  CreateEnrollmentRequest,
  AdmissionType,
  EnrollmentStatus,
  AcademicResult,
  PathValidationResult,
  SMS_PERMISSIONS,
  Role,
  TransferType,
  TransferStatus,
  StudentTransfer,
  CreateTransferRequest,
  UpdateTransferStatusRequest,
  ExecuteTransferRequest,
} from '../types/sms';

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt$${salt}$${hash}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  if (!storedHash) return false;
  if (storedHash.startsWith('scrypt$')) {
    const parts = storedHash.split('$');
    if (parts.length !== 3) return false;
    const salt = parts[1];
    const originalHash = parts[2];
    const derivedKey = crypto.scryptSync(password, salt, 64).toString('hex');
    
    const bufA = Buffer.from(derivedKey, 'hex');
    const bufB = Buffer.from(originalHash, 'hex');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  }
  // Fallback for legacy plaintext password migration
  return storedHash === password;
}

export class SMSDatabase {
  private client: Client;
  private dbPath: string;
  private initialized = false;

  constructor(dbUrl = 'file:data/sms.db') {
    this.dbPath = dbUrl;
    // Ensure directory exists for file-based database
    if (dbUrl.startsWith('file:')) {
      const filePath = dbUrl.replace('file:', '');
      const dir = path.dirname(filePath);
      if (dir && dir !== '.' && !fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    }
    this.client = createClient({ url: dbUrl });
  }

  public async init(): Promise<void> {
    if (this.initialized) return;

    // Enable foreign keys
    await this.client.execute('PRAGMA foreign_keys = ON;');

    // Execute versioned database migrations
    await this.runMigrations();

    // Migrate any legacy plaintext passwords to salted scrypt hashes
    await this.migrateUserPasswords();

    // Seed default users and academic structure if empty
    await this.seedDefaultDataIfEmpty();

    this.initialized = true;
  }

  public async runMigrations(): Promise<number> {
    // 1. Ensure schema_migrations table exists
    await this.client.execute(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        version INTEGER PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        applied_at TEXT NOT NULL
      );
    `);

    // 2. Query already applied versions
    const res = await this.client.execute('SELECT version FROM schema_migrations ORDER BY version ASC;');
    const appliedVersions = new Set<number>(res.rows.map((r) => Number(r.version)));

    // 3. Baseline check for existing databases initialized prior to migration runner
    if (appliedVersions.size === 0) {
      const tableCheck = await this.client.execute(
        "SELECT name FROM sqlite_master WHERE type='table' AND name='users';"
      );
      if (tableCheck.rows.length > 0) {
        // Pre-existing database baseline: record 0001_initial_schema as applied
        const now = new Date().toISOString();
        await this.client.execute({
          sql: `INSERT OR IGNORE INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);`,
          args: [1, '0001_initial_schema', now],
        });
        appliedVersions.add(1);
      }
    }

    // 4. Locate migration files in /migrations
    const migrationsDir = path.join(process.cwd(), 'migrations');
    let executedCount = 0;

    if (fs.existsSync(migrationsDir)) {
      const files = fs
        .readdirSync(migrationsDir)
        .filter((f) => f.endsWith('.sql'))
        .sort();

      for (const file of files) {
        const match = file.match(/^(\d+)_(.+)\.sql$/);
        if (!match) continue;

        const version = parseInt(match[1], 10);
        const name = `${match[1]}_${match[2]}`;

        if (!appliedVersions.has(version)) {
          const filePath = path.join(migrationsDir, file);
          const sqlContent = fs.readFileSync(filePath, 'utf-8');

          const statements = sqlContent
            .split(';')
            .map((s) => s.trim())
            .filter((s) => s.length > 0);

          for (const stmt of statements) {
            await this.client.execute(stmt);
          }

          const now = new Date().toISOString();
          await this.client.execute({
            sql: `INSERT INTO schema_migrations (version, name, applied_at) VALUES (?, ?, ?);`,
            args: [version, name, now],
          });

          appliedVersions.add(version);
          executedCount++;
        }
      }
    }

    return executedCount;
  }

  public async getAppliedMigrations(): Promise<{ version: number; name: string; appliedAt: string }[]> {
    await this.init();
    const res = await this.client.execute('SELECT version, name, applied_at FROM schema_migrations ORDER BY version ASC;');
    return res.rows.map((r) => ({
      version: Number(r.version),
      name: String(r.name),
      appliedAt: String(r.applied_at),
    }));
  }

  public async migrateUserPasswords(): Promise<void> {
    const res = await this.client.execute('SELECT id, username, password_hash FROM users;');
    for (const row of res.rows) {
      const id = String(row.id);
      const hash = String(row.password_hash);
      if (!hash.startsWith('scrypt$')) {
        const newHash = hashPassword(hash);
        await this.client.execute({
          sql: `UPDATE users SET password_hash = ? WHERE id = ?;`,
          args: [newHash, id],
        });
      }
    }
  }

  // Idempotent seed helper
  public async seedDefaultDataIfEmpty(): Promise<void> {
    const userCount = await this.client.execute('SELECT COUNT(*) as cnt FROM users;');
    if (Number(userCount.rows[0].cnt) === 0) {
      const now = new Date().toISOString();
      const defaultUsers = [
        {
          id: 'USR-SUPERADMIN',
          username: 'superadmin',
          password_hash: hashPassword('admin123'),
          full_name: 'System Super Admin',
          role: 'SUPER_ADMIN',
          permissions: JSON.stringify(Object.values(SMS_PERMISSIONS)),
        },
        {
          id: 'USR-ADMIN-01',
          username: 'acadadmin',
          password_hash: hashPassword('admin123'),
          full_name: 'Dr. Sarah Al-Sayed (Academic Director)',
          role: 'ACADEMIC_ADMIN',
          permissions: JSON.stringify(Object.values(SMS_PERMISSIONS)),
        },
        {
          id: 'USR-TEACHER-01',
          username: 'teacher',
          password_hash: hashPassword('teacher123'),
          full_name: 'Prof. Mohamed Kamal',
          role: 'TEACHER',
          permissions: JSON.stringify([SMS_PERMISSIONS.VIEW_ACADEMIC_STRUCTURE, SMS_PERMISSIONS.VIEW_STUDENTS]),
        },
        {
          id: 'USR-VIEWER-01',
          username: 'viewer',
          password_hash: hashPassword('viewer123'),
          full_name: 'Readonly Visitor',
          role: 'VIEWER',
          permissions: JSON.stringify([SMS_PERMISSIONS.VIEW_ACADEMIC_STRUCTURE]),
        },
      ];

      for (const u of defaultUsers) {
        await this.client.execute({
          sql: `INSERT OR IGNORE INTO users (id, username, password_hash, full_name, role, permissions, created_at) VALUES (?, ?, ?, ?, ?, ?, ?);`,
          args: [u.id, u.username, u.password_hash, u.full_name, u.role, u.permissions, now],
        });
      }
    }

    const yearCount = await this.client.execute('SELECT COUNT(*) as cnt FROM academic_years;');
    if (Number(yearCount.rows[0].cnt) === 0) {
      await this.seedAcademicStructure();
    }
  }

  public async resetDatabase(): Promise<void> {
    await this.client.execute('PRAGMA foreign_keys = OFF;');
    await this.client.execute('DROP TABLE IF EXISTS capacity_logs;');
    await this.client.execute('DROP TABLE IF EXISTS audit_records;');
    await this.client.execute('DROP TABLE IF EXISTS students;');
    await this.client.execute('DROP TABLE IF EXISTS parents;');
    await this.client.execute('DROP TABLE IF EXISTS classes;');
    await this.client.execute('DROP TABLE IF EXISTS grades;');
    await this.client.execute('DROP TABLE IF EXISTS academic_stages;');
    await this.client.execute('DROP TABLE IF EXISTS academic_years;');
    await this.client.execute('DROP TABLE IF EXISTS session_tokens;');
    await this.client.execute('DROP TABLE IF EXISTS users;');
    await this.client.execute('DROP TABLE IF EXISTS schema_migrations;');
    await this.client.execute('PRAGMA foreign_keys = ON;');
    this.initialized = false;
    await this.init();
  }

  public async seedAcademicStructure(): Promise<void> {
    const now = new Date().toISOString();

    // 1. Initial Academic Year
    await this.client.execute({
      sql: `INSERT OR IGNORE INTO academic_years (id, code, name, start_date, end_date, is_active, is_closed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: ['AY-2025-2026', '2025/2026', 'Academic Year 2025/2026', '2025-09-01', '2026-06-30', 1, 0, now, now],
    });

    // 2. Stages
    const stages = [
      { id: 'STG-BABY', code: 'BABY', name: 'Baby Class', sequence: 1 },
      { id: 'STG-KG', code: 'KG', name: 'Kindergarten', sequence: 2 },
      { id: 'STG-PRIM', code: 'PRIMARY', name: 'Primary Stage', sequence: 3 },
      { id: 'STG-PREP', code: 'PREP', name: 'Preparatory Stage', sequence: 4 },
      { id: 'STG-SEC', code: 'SEC', name: 'Secondary Stage', sequence: 5 },
    ];

    for (const stg of stages) {
      await this.client.execute({
        sql: `INSERT OR IGNORE INTO academic_stages (id, code, name, sequence, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?);`,
        args: [stg.id, stg.code, stg.name, stg.sequence, now, now],
      });
    }

    // 3. Grades
    const grades = [
      { id: 'GRD-KG1', stageId: 'STG-KG', code: 'KG1', name: 'KG 1', sequence: 1 },
      { id: 'GRD-KG2', stageId: 'STG-KG', code: 'KG2', name: 'KG 2', sequence: 2 },
      { id: 'GRD-P1', stageId: 'STG-PRIM', code: 'PRIM1', name: 'Primary Grade 1', sequence: 3 },
      { id: 'GRD-P2', stageId: 'STG-PRIM', code: 'PRIM2', name: 'Primary Grade 2', sequence: 4 },
      { id: 'GRD-P3', stageId: 'STG-PRIM', code: 'PRIM3', name: 'Primary Grade 3', sequence: 5 },
      { id: 'GRD-P4', stageId: 'STG-PRIM', code: 'PRIM4', name: 'Primary Grade 4', sequence: 6 },
      { id: 'GRD-P5', stageId: 'STG-PRIM', code: 'PRIM5', name: 'Primary Grade 5', sequence: 7 },
      { id: 'GRD-P6', stageId: 'STG-PRIM', code: 'PRIM6', name: 'Primary Grade 6', sequence: 8 },
      { id: 'GRD-PREP1', stageId: 'STG-PREP', code: 'PREP1', name: 'Prep Grade 1', sequence: 9 },
      { id: 'GRD-PREP2', stageId: 'STG-PREP', code: 'PREP2', name: 'Prep Grade 2', sequence: 10 },
      { id: 'GRD-PREP3', stageId: 'STG-PREP', code: 'PREP3', name: 'Prep Grade 3', sequence: 11 },
      { id: 'GRD-SEC1', stageId: 'STG-SEC', code: 'SEC1', name: 'Secondary Grade 1', sequence: 12 },
      { id: 'GRD-SEC2', stageId: 'STG-SEC', code: 'SEC2', name: 'Secondary Grade 2', sequence: 13 },
      { id: 'GRD-SEC3', stageId: 'STG-SEC', code: 'SEC3', name: 'Secondary Grade 3', sequence: 14 },
    ];

    for (const g of grades) {
      await this.client.execute({
        sql: `INSERT OR IGNORE INTO grades (id, stage_id, code, name, sequence, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?);`,
        args: [g.id, g.stageId, g.code, g.name, g.sequence, now, now],
      });
    }

    // 4. Sample Classes
    const classes = [
      { id: 'CLS-P1-A', gradeId: 'GRD-P1', code: 'P1-A', name: 'Class 1-A', capacity: 30, enrollment: 28, sequence: 1 },
      { id: 'CLS-P1-B', gradeId: 'GRD-P1', code: 'P1-B', name: 'Class 1-B', capacity: 30, enrollment: 15, sequence: 2 },
      { id: 'CLS-KG1-A', gradeId: 'GRD-KG1', code: 'KG1-A', name: 'Class KG1-A', capacity: 25, enrollment: 20, sequence: 1 },
    ];

    for (const cls of classes) {
      await this.client.execute({
        sql: `INSERT OR IGNORE INTO classes (id, grade_id, code, name, capacity, current_enrollment_count, is_active, sequence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, 1, ?, ?, ?);`,
        args: [cls.id, cls.gradeId, cls.code, cls.name, cls.capacity, cls.enrollment, cls.sequence, now, now],
      });
    }

    // 5. Parent & Student (Module 01 & 02 Regression)
    await this.client.execute({
      sql: `INSERT OR IGNORE INTO parents (id, national_id, full_name, email, phone, relationship, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      args: ['PAR-001', '10020030040051', 'Ahmed Hassan Al-Mansoor', 'ahmed.mansoor@example.com', '+201001234567', 'FATHER', now, now],
    });

    await this.client.execute({
      sql: `INSERT OR IGNORE INTO students (id, file_number, national_id, first_name, last_name, gender, date_of_birth, parent_id, current_stage_id, current_grade_id, current_class_id, current_academic_year_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      args: ['STU-001', 'STU-2025-001', '30201010198765', 'Omar', 'Hassan', 'MALE', '2019-03-15', 'PAR-001', 'STG-PRIM', 'GRD-P1', 'CLS-P1-A', 'AY-2025-2026', now, now],
    });

    // 6. Initial Enrollment Record (Module 04 Integration)
    await this.client.execute({
      sql: `INSERT OR IGNORE INTO student_enrollments (id, student_id, academic_year_id, stage_id, grade_id, class_id, admission_type, status, academic_result, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: ['ENR-SEED-001', 'STU-001', 'AY-2025-2026', 'STG-PRIM', 'GRD-P1', 'CLS-P1-A', 'NEW', 'ACTIVE', 'PENDING', now, now],
    });

    // 7. Audit entry for seeding
    await this.addAudit({
      userId: 'SYSTEM',
      userName: 'System Init Engine',
      entity: 'ACADEMIC_YEAR',
      entityId: 'AY-2025-2026',
      action: 'SEED',
      reason: 'Initialized standard academic structure seed',
    });
  }

  // --- AUTHENTICATION & AUTHORIZATION ---
  public async loginUser(username: string, passwordPlain: string): Promise<{ token: string; user: UserContext }> {
    await this.init();
    const res = await this.client.execute({
      sql: `SELECT * FROM users WHERE username = ?;`,
      args: [username],
    });

    if (res.rows.length === 0) {
      throw new Error('Invalid username or credentials');
    }

    const row = res.rows[0];
    const storedHash = String(row.password_hash);

    if (!verifyPassword(passwordPlain, storedHash)) {
      throw new Error('Invalid username or credentials');
    }

    // Transparent password upgrade if stored as plaintext
    if (!storedHash.startsWith('scrypt$')) {
      const upgradedHash = hashPassword(passwordPlain);
      await this.client.execute({
        sql: `UPDATE users SET password_hash = ? WHERE id = ?;`,
        args: [upgradedHash, String(row.id)],
      });
    }

    const user: UserContext = {
      userId: String(row.id),
      userName: String(row.full_name),
      role: row.role as Role,
      permissions: JSON.parse(String(row.permissions)),
    };

    const token = `token-${user.role.toLowerCase()}-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO session_tokens (token, user_id, created_at) VALUES (?, ?, ?);`,
      args: [token, user.userId, now],
    });

    return { token, user };
  }

  public async getUserByToken(token: string): Promise<UserContext | null> {
    await this.init();
    const res = await this.client.execute({
      sql: `SELECT u.id, u.full_name, u.role, u.permissions 
            FROM session_tokens s 
            JOIN users u ON s.user_id = u.id 
            WHERE s.token = ?;`,
      args: [token],
    });

    if (res.rows.length === 0) return null;

    const row = res.rows[0];
    return {
      userId: String(row.id),
      userName: String(row.full_name),
      role: row.role as Role,
      permissions: JSON.parse(String(row.permissions)),
    };
  }

  public checkPermission(user: UserContext, permission: string): void {
    if (!user || !user.permissions || !user.permissions.includes(permission)) {
      throw new Error(`Forbidden: Missing required permission [${permission}]`);
    }
  }

  // --- ACADEMIC YEARS ---
  public async getAcademicYears(): Promise<AcademicYear[]> {
    await this.init();
    const res = await this.client.execute('SELECT * FROM academic_years ORDER BY start_date DESC;');
    return res.rows.map((row) => ({
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      startDate: String(row.start_date),
      endDate: String(row.end_date),
      isActive: Boolean(row.is_active),
      isClosed: Boolean(row.is_closed),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  public async getAcademicYearById(id: string): Promise<AcademicYear | null> {
    await this.init();
    const res = await this.client.execute({
      sql: 'SELECT * FROM academic_years WHERE id = ?;',
      args: [id],
    });
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      startDate: String(row.start_date),
      endDate: String(row.end_date),
      isActive: Boolean(row.is_active),
      isClosed: Boolean(row.is_closed),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  public async getActiveAcademicYear(): Promise<AcademicYear | null> {
    await this.init();
    const res = await this.client.execute('SELECT * FROM academic_years WHERE is_active = 1 LIMIT 1;');
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      startDate: String(row.start_date),
      endDate: String(row.end_date),
      isActive: Boolean(row.is_active),
      isClosed: Boolean(row.is_closed),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  public async createAcademicYear(
    user: UserContext,
    data: { code: string; name: string; startDate: string; endDate: string; isActive?: boolean }
  ): Promise<AcademicYear> {
    await this.init();
    this.checkPermission(user, SMS_PERMISSIONS.CREATE_ACADEMIC_STRUCTURE);

    // Uniqueness check C-01
    const existing = await this.client.execute({
      sql: 'SELECT id FROM academic_years WHERE code = ?;',
      args: [data.code],
    });
    if (existing.rows.length > 0) {
      throw new Error(`Academic Year with code '${data.code}' already exists (C-01 violation)`);
    }

    if (new Date(data.endDate) <= new Date(data.startDate)) {
      throw new Error('End date must be strictly after start date');
    }

    const id = `AY-${data.code.replace('/', '-')}`;
    const now = new Date().toISOString();
    const isActive = data.isActive ? 1 : 0;

    if (isActive === 1) {
      // Transactional activation
      await this.client.batch(
        [
          { sql: 'UPDATE academic_years SET is_active = 0 WHERE is_active = 1;', args: [] },
          {
            sql: `INSERT INTO academic_years (id, code, name, start_date, end_date, is_active, is_closed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, 0, ?, ?);`,
            args: [id, data.code, data.name, data.startDate, data.endDate, now, now],
          },
        ],
        'write'
      );
    } else {
      await this.client.execute({
        sql: `INSERT INTO academic_years (id, code, name, start_date, end_date, is_active, is_closed, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 0, ?, ?);`,
        args: [id, data.code, data.name, data.startDate, data.endDate, now, now],
      });
    }

    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'ACADEMIC_YEAR',
      entityId: id,
      action: 'CREATE',
      newValue: JSON.stringify(data),
    });

    return (await this.getAcademicYearById(id))!;
  }

  public async activateAcademicYear(user: UserContext, id: string): Promise<AcademicYear> {
    await this.init();
    this.checkPermission(user, SMS_PERMISSIONS.ACTIVATE_ACADEMIC_STRUCTURE);

    const target = await this.getAcademicYearById(id);
    if (!target) {
      throw new Error(`Academic Year '${id}' not found`);
    }

    if (target.isClosed) {
      throw new Error(`Cannot activate closed Academic Year '${target.code}'`);
    }

    const now = new Date().toISOString();

    // Atomic transaction: set all is_active = 0, then set target is_active = 1
    await this.client.batch(
      [
        { sql: 'UPDATE academic_years SET is_active = 0 WHERE is_active = 1;', args: [] },
        { sql: 'UPDATE academic_years SET is_active = 1, updated_at = ? WHERE id = ?;', args: [now, id] },
      ],
      'write'
    );

    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'ACADEMIC_YEAR',
      entityId: id,
      action: 'ACTIVATE',
      oldValue: 'InActive',
      newValue: 'Active',
      reason: 'Activated as current operational academic year',
    });

    return (await this.getAcademicYearById(id))!;
  }

  public async closeAcademicYear(user: UserContext, id: string): Promise<AcademicYear> {
    await this.init();
    this.checkPermission(user, SMS_PERMISSIONS.CLOSE_ACADEMIC_YEAR);

    const target = await this.getAcademicYearById(id);
    if (!target) {
      throw new Error(`Academic Year '${id}' not found`);
    }

    const now = new Date().toISOString();

    await this.client.execute({
      sql: 'UPDATE academic_years SET is_closed = 1, is_active = 0, updated_at = ? WHERE id = ?;',
      args: [now, id],
    });

    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'ACADEMIC_YEAR',
      entityId: id,
      action: 'CLOSE',
      oldValue: 'Open',
      newValue: 'Closed/Archived',
      reason: 'Academic year officially closed and archived',
    });

    return (await this.getAcademicYearById(id))!;
  }

  // --- ACADEMIC STAGES ---
  public async getAcademicStages(): Promise<AcademicStage[]> {
    await this.init();
    const res = await this.client.execute('SELECT * FROM academic_stages ORDER BY sequence ASC;');
    return res.rows.map((row) => ({
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      sequence: Number(row.sequence),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  public async createAcademicStage(user: UserContext, data: { code: string; name: string; sequence: number }): Promise<AcademicStage> {
    await this.init();
    this.checkPermission(user, SMS_PERMISSIONS.CREATE_ACADEMIC_STRUCTURE);

    const existingCode = await this.client.execute({
      sql: 'SELECT id FROM academic_stages WHERE code = ?;',
      args: [data.code],
    });
    if (existingCode.rows.length > 0) {
      throw new Error(`Stage with code '${data.code}' already exists`);
    }

    const id = `STG-${data.code.toUpperCase()}`;
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO academic_stages (id, code, name, sequence, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, 1, ?, ?);`,
      args: [id, data.code.toUpperCase(), data.name, data.sequence, now, now],
    });

    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'ACADEMIC_STAGE',
      entityId: id,
      action: 'CREATE',
      newValue: JSON.stringify(data),
    });

    const res = await this.client.execute({ sql: 'SELECT * FROM academic_stages WHERE id = ?;', args: [id] });
    const row = res.rows[0];
    return {
      id: String(row.id),
      code: String(row.code),
      name: String(row.name),
      sequence: Number(row.sequence),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  public async deleteStage(user: UserContext, id: string): Promise<void> {
    await this.init();
    this.checkPermission(user, SMS_PERMISSIONS.UPDATE_ACADEMIC_STRUCTURE);

    // Foreign key reference check C-20
    const gradesRes = await this.client.execute({
      sql: 'SELECT id FROM grades WHERE stage_id = ?;',
      args: [id],
    });
    if (gradesRes.rows.length > 0) {
      throw new Error('Cannot destructively delete Academic Stage because it has dependent Grades (C-20 violation). Deactivate instead.');
    }

    await this.client.execute({
      sql: 'DELETE FROM academic_stages WHERE id = ?;',
      args: [id],
    });

    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'ACADEMIC_STAGE',
      entityId: id,
      action: 'DEACTIVATE',
      reason: 'Deleted stage with no child grades',
    });
  }

  // --- GRADES ---
  public async getGrades(stageId?: string): Promise<Grade[]> {
    await this.init();
    const query = stageId
      ? { sql: 'SELECT * FROM grades WHERE stage_id = ? ORDER BY sequence ASC;', args: [stageId] }
      : { sql: 'SELECT * FROM grades ORDER BY sequence ASC;', args: [] };
    const res = await this.client.execute(query);
    return res.rows.map((row) => ({
      id: String(row.id),
      stageId: String(row.stage_id),
      code: String(row.code),
      name: String(row.name),
      sequence: Number(row.sequence),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  public async createGrade(user: UserContext, data: { stageId: string; code: string; name: string; sequence: number }): Promise<Grade> {
    await this.init();
    this.checkPermission(user, SMS_PERMISSIONS.CREATE_ACADEMIC_STRUCTURE);

    // Stage FK check C-04
    const stageRes = await this.client.execute({
      sql: 'SELECT id FROM academic_stages WHERE id = ?;',
      args: [data.stageId],
    });
    if (stageRes.rows.length === 0) {
      throw new Error(`Referenced Academic Stage '${data.stageId}' does not exist (C-04 violation)`);
    }

    const codeRes = await this.client.execute({
      sql: 'SELECT id FROM grades WHERE code = ?;',
      args: [data.code],
    });
    if (codeRes.rows.length > 0) {
      throw new Error(`Grade with code '${data.code}' already exists`);
    }

    const id = `GRD-${data.code.toUpperCase()}`;
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO grades (id, stage_id, code, name, sequence, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 1, ?, ?);`,
      args: [id, data.stageId, data.code.toUpperCase(), data.name, data.sequence, now, now],
    });

    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'GRADE',
      entityId: id,
      action: 'CREATE',
      newValue: JSON.stringify(data),
    });

    const res = await this.client.execute({ sql: 'SELECT * FROM grades WHERE id = ?;', args: [id] });
    const row = res.rows[0];
    return {
      id: String(row.id),
      stageId: String(row.stage_id),
      code: String(row.code),
      name: String(row.name),
      sequence: Number(row.sequence),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  // --- CLASSES ---
  public async getClasses(gradeId?: string): Promise<ClassRoom[]> {
    await this.init();
    const query = gradeId
      ? { sql: 'SELECT * FROM classes WHERE grade_id = ? ORDER BY sequence ASC;', args: [gradeId] }
      : { sql: 'SELECT * FROM classes ORDER BY sequence ASC;', args: [] };
    const res = await this.client.execute(query);
    return res.rows.map((row) => ({
      id: String(row.id),
      gradeId: String(row.grade_id),
      code: String(row.code),
      name: String(row.name),
      capacity: Number(row.capacity),
      currentEnrollmentCount: Number(row.current_enrollment_count),
      isActive: Boolean(row.is_active),
      sequence: Number(row.sequence),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  public async getClassById(id: string): Promise<ClassRoom | null> {
    await this.init();
    const res = await this.client.execute({
      sql: 'SELECT * FROM classes WHERE id = ?;',
      args: [id],
    });
    if (res.rows.length === 0) return null;
    const row = res.rows[0];
    return {
      id: String(row.id),
      gradeId: String(row.grade_id),
      code: String(row.code),
      name: String(row.name),
      capacity: Number(row.capacity),
      currentEnrollmentCount: Number(row.current_enrollment_count),
      isActive: Boolean(row.is_active),
      sequence: Number(row.sequence),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    };
  }

  public async createClass(user: UserContext, data: { gradeId: string; code: string; name: string; capacity: number }): Promise<ClassRoom> {
    await this.init();
    this.checkPermission(user, SMS_PERMISSIONS.CREATE_ACADEMIC_STRUCTURE);

    // FK Check C-05
    const gradeRes = await this.client.execute({
      sql: 'SELECT id FROM grades WHERE id = ?;',
      args: [data.gradeId],
    });
    if (gradeRes.rows.length === 0) {
      throw new Error(`Referenced Grade '${data.gradeId}' does not exist (C-05 violation)`);
    }

    // Code uniqueness C-06
    const codeRes = await this.client.execute({
      sql: 'SELECT id FROM classes WHERE code = ?;',
      args: [data.code],
    });
    if (codeRes.rows.length > 0) {
      throw new Error(`Class with code '${data.code}' already exists (C-06 violation)`);
    }

    const id = `CLS-${data.code.toUpperCase().replace(/\s+/g, '-')}`;
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO classes (id, grade_id, code, name, capacity, current_enrollment_count, is_active, sequence, created_at, updated_at) VALUES (?, ?, ?, ?, ?, 0, 1, 1, ?, ?);`,
      args: [id, data.gradeId, data.code.toUpperCase(), data.name, data.capacity, now, now],
    });

    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'CLASS',
      entityId: id,
      action: 'CREATE',
      newValue: JSON.stringify(data),
    });

    return (await this.getClassById(id))!;
  }

  public async changeClassCapacity(
    user: UserContext,
    classId: string,
    newCapacity: number,
    isAdministrativeOverride = false,
    overrideReason = ''
  ): Promise<ClassRoom> {
    await this.init();
    this.checkPermission(user, SMS_PERMISSIONS.CHANGE_CAPACITY);

    const targetClass = await this.getClassById(classId);
    if (!targetClass) {
      throw new Error(`Class '${classId}' not found`);
    }

    if (newCapacity <= 0) {
      throw new Error('Class capacity must be a positive integer greater than zero');
    }

    // Capacity enforcement C-15 & Override checks C-16..C-18
    if (newCapacity < targetClass.currentEnrollmentCount) {
      if (!isAdministrativeOverride) {
        throw new Error(
          `Cannot reduce capacity (${newCapacity}) below current enrollment count (${targetClass.currentEnrollmentCount}) without Administrative Override (C-15 violation)`
        );
      }

      this.checkPermission(user, SMS_PERMISSIONS.ADMIN_OVERRIDE_CAPACITY);

      if (!overrideReason || overrideReason.trim().length < 5) {
        throw new Error('Administrative Capacity Override requires a valid reason of at least 5 characters (C-17 violation)');
      }
    }

    const now = new Date().toISOString();
    const oldCap = targetClass.capacity;

    // Transactional update
    await this.client.batch(
      [
        {
          sql: 'UPDATE classes SET capacity = ?, updated_at = ? WHERE id = ?;',
          args: [newCapacity, now, classId],
        },
        {
          sql: `INSERT INTO capacity_logs (id, class_id, old_capacity, new_capacity, override_reason, user_id, user_name, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
          args: [
            `CAP-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            classId,
            oldCap,
            newCapacity,
            overrideReason || 'Standard capacity adjustment',
            user.userId,
            user.userName,
            now,
          ],
        },
      ],
      'write'
    );

    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'CLASS',
      entityId: classId,
      action: isAdministrativeOverride ? 'OVERRIDE_CAPACITY' : 'UPDATE',
      oldValue: `Capacity: ${oldCap}`,
      newValue: `Capacity: ${newCapacity}`,
      reason: overrideReason || 'Standard capacity adjustment',
    });

    return (await this.getClassById(classId))!;
  }

  // --- ACADEMIC PATH PROGRESSION ---
  public async validateAcademicPath(fromGradeId: string, toGradeId: string): Promise<PathValidationResult> {
    await this.init();

    const fromRes = await this.client.execute({ sql: 'SELECT * FROM grades WHERE id = ?;', args: [fromGradeId] });
    const toRes = await this.client.execute({ sql: 'SELECT * FROM grades WHERE id = ?;', args: [toGradeId] });

    if (fromRes.rows.length === 0 || toRes.rows.length === 0) {
      return { isValid: false, reason: 'Invalid Grade reference provided' };
    }

    const fromG = fromRes.rows[0];
    const toG = toRes.rows[0];

    const fromStageRes = await this.client.execute({ sql: 'SELECT * FROM academic_stages WHERE id = ?;', args: [fromG.stage_id] });
    const toStageRes = await this.client.execute({ sql: 'SELECT * FROM academic_stages WHERE id = ?;', args: [toG.stage_id] });

    if (fromStageRes.rows.length === 0 || toStageRes.rows.length === 0) {
      return { isValid: false, reason: 'Invalid Stage reference provided' };
    }

    const fromS = fromStageRes.rows[0];
    const toS = toStageRes.rows[0];

    if (fromGradeId === toGradeId) {
      return {
        isValid: true,
        fromStageName: String(fromS.name),
        toStageName: String(toS.name),
        fromGradeName: String(fromG.name),
        toGradeName: String(toG.name),
      };
    }

    const stageSeqDiff = Number(toS.sequence) - Number(fromS.sequence);

    if (stageSeqDiff > 1) {
      return {
        isValid: false,
        reason: `Invalid Stage Jump: Cannot jump from '${fromS.name}' directly to '${toS.name}' (C-14 violation)`,
        fromStageName: String(fromS.name),
        toStageName: String(toS.name),
        fromGradeName: String(fromG.name),
        toGradeName: String(toG.name),
      };
    }

    if (stageSeqDiff < 0) {
      return {
        isValid: false,
        reason: `Invalid Progression: Backward move from '${fromS.name}' to '${toS.name}' blocked`,
        fromStageName: String(fromS.name),
        toStageName: String(toS.name),
      };
    }

    const gradeSeqDiff = Number(toG.sequence) - Number(fromG.sequence);
    if (gradeSeqDiff !== 1) {
      return {
        isValid: false,
        reason: `Invalid Grade Progression: Cannot move from '${fromG.name}' (Seq: ${fromG.sequence}) to '${toG.name}' (Seq: ${toG.sequence})`,
        fromStageName: String(fromS.name),
        toStageName: String(toS.name),
        fromGradeName: String(fromG.name),
        toGradeName: String(toG.name),
      };
    }

    return {
      isValid: true,
      fromStageName: String(fromS.name),
      toStageName: String(toS.name),
      fromGradeName: String(fromG.name),
      toGradeName: String(toG.name),
    };
  }

  // --- AUDIT TRAIL ---
  public async getAuditTrail(): Promise<AuditRecord[]> {
    await this.init();
    const res = await this.client.execute('SELECT * FROM audit_records ORDER BY timestamp DESC;');
    return res.rows.map((row) => ({
      id: String(row.id),
      userId: String(row.user_id),
      userName: String(row.user_name),
      entity: row.entity as any,
      entityId: String(row.entity_id),
      action: row.action as any,
      oldValue: row.old_value ? String(row.old_value) : undefined,
      newValue: row.new_value ? String(row.new_value) : undefined,
      reason: row.reason ? String(row.reason) : undefined,
      timestamp: String(row.timestamp),
    }));
  }

  public async addAudit(data: {
    userId: string;
    userName: string;
    entity: AuditRecord['entity'];
    entityId: string;
    action: AuditRecord['action'];
    oldValue?: string;
    newValue?: string;
    reason?: string;
  }): Promise<void> {
    const id = `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO audit_records (id, user_id, user_name, entity, entity_id, action, old_value, new_value, reason, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [id, data.userId, data.userName, data.entity, data.entityId, data.action, data.oldValue || null, data.newValue || null, data.reason || null, now],
    });
  }

  // --- MODULE 04 STUDENT ENROLLMENT METHODS ---

  public async createEnrollment(user: UserContext, req: CreateEnrollmentRequest): Promise<StudentEnrollment> {
    await this.init();

    if (!user.permissions.includes(SMS_PERMISSIONS.CREATE_ENROLLMENT) && !user.permissions.includes(SMS_PERMISSIONS.MANAGE_STUDENTS) && user.role !== 'SUPER_ADMIN') {
      throw new Error(`Forbidden: Missing required permission [${SMS_PERMISSIONS.CREATE_ENROLLMENT}] (E-20 violation)`);
    }

    // 1. Verify Student exists
    const stuRes = await this.client.execute({
      sql: 'SELECT * FROM students WHERE id = ?;',
      args: [req.studentId],
    });
    if (stuRes.rows.length === 0) {
      throw new Error(`Student Reference Error: Student '${req.studentId}' does not exist (E-03 violation)`);
    }
    const studentRow = stuRes.rows[0];

    // 2. Verify Academic Year exists
    const ayRes = await this.client.execute({
      sql: 'SELECT * FROM academic_years WHERE id = ?;',
      args: [req.academicYearId],
    });
    if (ayRes.rows.length === 0) {
      throw new Error(`Academic Year Reference Error: Academic Year '${req.academicYearId}' does not exist (E-04 violation)`);
    }

    // 3. Verify Stage exists
    const stgRes = await this.client.execute({
      sql: 'SELECT * FROM academic_stages WHERE id = ?;',
      args: [req.stageId],
    });
    if (stgRes.rows.length === 0) {
      throw new Error(`Stage Reference Error: Academic Stage '${req.stageId}' does not exist (E-05 violation)`);
    }

    // 4. Verify Grade exists and belongs to Stage
    const grdRes = await this.client.execute({
      sql: 'SELECT * FROM grades WHERE id = ?;',
      args: [req.gradeId],
    });
    if (grdRes.rows.length === 0) {
      throw new Error(`Grade Reference Error: Grade '${req.gradeId}' does not exist (E-06 violation)`);
    }
    if (String(grdRes.rows[0].stage_id) !== req.stageId) {
      throw new Error(`Hierarchy Error: Grade '${req.gradeId}' does not belong to Stage '${req.stageId}'`);
    }

    // 5. Verify Class exists and belongs to Grade
    const clsRes = await this.client.execute({
      sql: 'SELECT * FROM classes WHERE id = ?;',
      args: [req.classId],
    });
    if (clsRes.rows.length === 0) {
      throw new Error(`Class Reference Error: Class '${req.classId}' does not exist (E-07 violation)`);
    }
    const classRow = clsRes.rows[0];
    if (String(classRow.grade_id) !== req.gradeId) {
      throw new Error(`Hierarchy Error: Class '${req.classId}' does not belong to Grade '${req.gradeId}'`);
    }

    // 6. Check Duplicate Active Enrollment in same Academic Year
    const dupRes = await this.client.execute({
      sql: "SELECT * FROM student_enrollments WHERE student_id = ? AND academic_year_id = ? AND status = 'ACTIVE';",
      args: [req.studentId, req.academicYearId],
    });
    if (dupRes.rows.length > 0) {
      throw new Error(`Duplicate Enrollment: Student is already actively enrolled in Academic Year '${req.academicYearId}' (E-12 violation)`);
    }

    // 7. Capacity Validation
    const capacity = Number(classRow.capacity);
    const currentCount = Number(classRow.current_enrollment_count);

    if (currentCount >= capacity && !req.isAdministrativeOverride) {
      throw new Error(`Class Capacity Exceeded: Class '${String(classRow.name)}' capacity (${capacity}) is full (Current: ${currentCount}). Administrative override required (E-13 violation)`);
    }

    if (req.isAdministrativeOverride) {
      if (!user.permissions.includes(SMS_PERMISSIONS.ADMIN_OVERRIDE_CAPACITY) && user.role !== 'SUPER_ADMIN') {
        throw new Error(`Forbidden: User does not possess administrative capacity override authority [${SMS_PERMISSIONS.ADMIN_OVERRIDE_CAPACITY}] (E-14 violation)`);
      }
      if (!req.overrideReason || req.overrideReason.trim().length < 5) {
        throw new Error(`Capacity Override Error: A valid override reason (minimum 5 characters) is mandatory (E-14 violation)`);
      }
    }

    // 8. Generate Stable Enrollment ID
    const enrollmentId = `ENR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    // 9. Atomic Execution
    await this.client.execute({
      sql: `INSERT INTO student_enrollments (id, student_id, academic_year_id, stage_id, grade_id, class_id, admission_type, status, academic_result, transfer_origin, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, 'ACTIVE', 'PENDING', ?, ?, ?);`,
      args: [enrollmentId, req.studentId, req.academicYearId, req.stageId, req.gradeId, req.classId, req.admissionType, req.transferOrigin || null, now, now],
    });

    // Update class enrollment count
    await this.client.execute({
      sql: `UPDATE classes SET current_enrollment_count = current_enrollment_count + 1, updated_at = ? WHERE id = ?;`,
      args: [now, req.classId],
    });

    // Update current academic context on student record (Preserving student identity)
    await this.client.execute({
      sql: `UPDATE students SET current_stage_id = ?, current_grade_id = ?, current_class_id = ?, current_academic_year_id = ?, updated_at = ? WHERE id = ?;`,
      args: [req.stageId, req.gradeId, req.classId, req.academicYearId, now, req.studentId],
    });

    // Write Capacity Log if Override used
    if (req.isAdministrativeOverride) {
      const capLogId = `CAP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      await this.client.execute({
        sql: `INSERT INTO capacity_logs (id, class_id, old_capacity, new_capacity, override_reason, user_id, user_name, timestamp) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
        args: [capLogId, req.classId, capacity, currentCount + 1, req.overrideReason!, user.userId, user.userName, now],
      });
    }

    // Write Audit Record
    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'ENROLLMENT',
      entityId: enrollmentId,
      action: 'ENROLL',
      newValue: JSON.stringify({
        studentId: req.studentId,
        academicYearId: req.academicYearId,
        classId: req.classId,
        admissionType: req.admissionType,
      }),
      reason: req.isAdministrativeOverride ? `Override: ${req.overrideReason}` : `Enrolled student (${req.admissionType})`,
    });

    return {
      id: enrollmentId,
      studentId: req.studentId,
      academicYearId: req.academicYearId,
      stageId: req.stageId,
      gradeId: req.gradeId,
      classId: req.classId,
      admissionType: req.admissionType,
      status: 'ACTIVE',
      academicResult: 'PENDING',
      transferOrigin: req.transferOrigin,
      createdAt: now,
      updatedAt: now,
      studentName: `${String(studentRow.first_name)} ${String(studentRow.last_name)}`,
      fileNumber: String(studentRow.file_number),
      nationalId: String(studentRow.national_id),
      academicYearCode: String(ayRes.rows[0].code),
      stageName: String(stgRes.rows[0].name),
      gradeName: String(grdRes.rows[0].name),
      className: String(classRow.name),
    };
  }

  public async getEnrollments(filters?: {
    studentId?: string;
    academicYearId?: string;
    classId?: string;
    status?: EnrollmentStatus;
  }): Promise<StudentEnrollment[]> {
    await this.init();

    let sql = `
      SELECT e.*,
             s.first_name || ' ' || s.last_name AS student_name,
             s.file_number,
             s.national_id,
             ay.code AS academic_year_code,
             stg.name AS stage_name,
             grd.name AS grade_name,
             cls.name AS class_name
      FROM student_enrollments e
      JOIN students s ON e.student_id = s.id
      JOIN academic_years ay ON e.academic_year_id = ay.id
      JOIN academic_stages stg ON e.stage_id = stg.id
      JOIN grades grd ON e.grade_id = grd.id
      JOIN classes cls ON e.class_id = cls.id
      WHERE 1=1
    `;
    const args: any[] = [];

    if (filters?.studentId) {
      sql += ' AND e.student_id = ?';
      args.push(filters.studentId);
    }
    if (filters?.academicYearId) {
      sql += ' AND e.academic_year_id = ?';
      args.push(filters.academicYearId);
    }
    if (filters?.classId) {
      sql += ' AND e.class_id = ?';
      args.push(filters.classId);
    }
    if (filters?.status) {
      sql += ' AND e.status = ?';
      args.push(filters.status);
    }

    sql += ' ORDER BY e.created_at DESC;';

    const res = await this.client.execute({ sql, args });

    return res.rows.map((row) => ({
      id: String(row.id),
      studentId: String(row.student_id),
      academicYearId: String(row.academic_year_id),
      stageId: String(row.stage_id),
      gradeId: String(row.grade_id),
      classId: String(row.class_id),
      admissionType: row.admission_type as AdmissionType,
      status: row.status as EnrollmentStatus,
      academicResult: row.academic_result as AcademicResult,
      transferOrigin: row.transfer_origin ? String(row.transfer_origin) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      studentName: String(row.student_name),
      fileNumber: String(row.file_number),
      nationalId: String(row.national_id),
      academicYearCode: String(row.academic_year_code),
      stageName: String(row.stage_name),
      gradeName: String(row.grade_name),
      className: String(row.class_name),
    }));
  }

  public async updateEnrollmentStatus(
    user: UserContext,
    enrollmentId: string,
    newStatus: EnrollmentStatus,
    reason?: string
  ): Promise<StudentEnrollment> {
    await this.init();

    if (!user.permissions.includes(SMS_PERMISSIONS.UPDATE_ENROLLMENT) && !user.permissions.includes(SMS_PERMISSIONS.MANAGE_STUDENTS) && user.role !== 'SUPER_ADMIN') {
      throw new Error(`Forbidden: Missing required permission [${SMS_PERMISSIONS.UPDATE_ENROLLMENT}] (E-20 violation)`);
    }

    const enrRes = await this.client.execute({
      sql: 'SELECT * FROM student_enrollments WHERE id = ?;',
      args: [enrollmentId],
    });
    if (enrRes.rows.length === 0) {
      throw new Error(`Enrollment Reference Error: Enrollment '${enrollmentId}' not found`);
    }

    const row = enrRes.rows[0];
    const oldStatus = row.status as EnrollmentStatus;
    const classId = String(row.class_id);
    const now = new Date().toISOString();

    if (oldStatus === 'ACTIVE' && newStatus !== 'ACTIVE') {
      await this.client.execute({
        sql: 'UPDATE classes SET current_enrollment_count = MAX(0, current_enrollment_count - 1), updated_at = ? WHERE id = ?;',
        args: [now, classId],
      });
    } else if (oldStatus !== 'ACTIVE' && newStatus === 'ACTIVE') {
      await this.client.execute({
        sql: 'UPDATE classes SET current_enrollment_count = current_enrollment_count + 1, updated_at = ? WHERE id = ?;',
        args: [now, classId],
      });
    }

    await this.client.execute({
      sql: 'UPDATE student_enrollments SET status = ?, updated_at = ? WHERE id = ?;',
      args: [newStatus, now, enrollmentId],
    });

    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'ENROLLMENT',
      entityId: enrollmentId,
      action: 'UPDATE_STATUS',
      oldValue: oldStatus,
      newValue: newStatus,
      reason: reason || 'Updated enrollment status',
    });

    const updatedList = await this.getEnrollments();
    const updated = updatedList.find((e) => e.id === enrollmentId);
    if (!updated) throw new Error('Failed to retrieve updated enrollment');
    return updated;
  }

  public async updateEnrollmentResult(
    user: UserContext,
    enrollmentId: string,
    result: AcademicResult
  ): Promise<StudentEnrollment> {
    await this.init();

    if (!user.permissions.includes(SMS_PERMISSIONS.UPDATE_ENROLLMENT) && !user.permissions.includes(SMS_PERMISSIONS.MANAGE_STUDENTS) && user.role !== 'SUPER_ADMIN') {
      throw new Error(`Forbidden: Missing required permission [${SMS_PERMISSIONS.UPDATE_ENROLLMENT}] (E-20 violation)`);
    }

    const enrRes = await this.client.execute({
      sql: 'SELECT * FROM student_enrollments WHERE id = ?;',
      args: [enrollmentId],
    });
    if (enrRes.rows.length === 0) {
      throw new Error(`Enrollment Reference Error: Enrollment '${enrollmentId}' not found`);
    }

    const oldResult = String(enrRes.rows[0].academic_result);
    const now = new Date().toISOString();

    await this.client.execute({
      sql: 'UPDATE student_enrollments SET academic_result = ?, updated_at = ? WHERE id = ?;',
      args: [result, now, enrollmentId],
    });

    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'ENROLLMENT',
      entityId: enrollmentId,
      action: 'UPDATE_RESULT',
      oldValue: oldResult,
      newValue: result,
      reason: 'Updated academic result boundary contract',
    });

    const updatedList = await this.getEnrollments();
    const updated = updatedList.find((e) => e.id === enrollmentId);
    if (!updated) throw new Error('Failed to retrieve updated enrollment');
    return updated;
  }

  public async createStudent(
    user: UserContext,
    data: {
      fileNumber?: string;
      nationalId: string;
      firstName: string;
      lastName: string;
      gender: 'MALE' | 'FEMALE';
      dateOfBirth: string;
      parentId: string;
      currentStageId?: string;
      currentGradeId?: string;
      currentClassId?: string;
      currentAcademicYearId?: string;
    }
  ): Promise<Student> {
    await this.init();

    if (!user.permissions.includes(SMS_PERMISSIONS.MANAGE_STUDENTS) && user.role !== 'SUPER_ADMIN') {
      throw new Error(`Forbidden: Missing required permission [${SMS_PERMISSIONS.MANAGE_STUDENTS}]`);
    }

    const dupNat = await this.client.execute({
      sql: 'SELECT * FROM students WHERE national_id = ?;',
      args: [data.nationalId],
    });
    if (dupNat.rows.length > 0) {
      throw new Error(`Duplicate Student Error: Student with national ID '${data.nationalId}' already exists`);
    }

    const studentId = `STU-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const fileNum = data.fileNumber || `STU-${new Date().getFullYear()}-${Math.floor(Math.random() * 900 + 100)}`;
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO students (id, file_number, national_id, first_name, last_name, gender, date_of_birth, parent_id, current_stage_id, current_grade_id, current_class_id, current_academic_year_id, is_active, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?);`,
      args: [
        studentId,
        fileNum,
        data.nationalId,
        data.firstName,
        data.lastName,
        data.gender,
        data.dateOfBirth,
        data.parentId,
        data.currentStageId || 'STG-PRIM',
        data.currentGradeId || 'GRD-P1',
        data.currentClassId || 'CLS-P1-A',
        data.currentAcademicYearId || 'AY-2025-2026',
        now,
        now,
      ],
    });

    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'STUDENT',
      entityId: studentId,
      action: 'CREATE',
      reason: 'Created new student master record',
    });

    return {
      id: studentId,
      fileNumber: fileNum,
      nationalId: data.nationalId,
      firstName: data.firstName,
      lastName: data.lastName,
      gender: data.gender,
      dateOfBirth: data.dateOfBirth,
      parentId: data.parentId,
      currentStageId: data.currentStageId || 'STG-PRIM',
      currentGradeId: data.currentGradeId || 'GRD-P1',
      currentClassId: data.currentClassId || 'CLS-P1-A',
      currentAcademicYearId: data.currentAcademicYearId || 'AY-2025-2026',
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };
  }

  public async createParent(
    user: UserContext,
    data: {
      nationalId: string;
      fullName: string;
      email: string;
      phone: string;
      relationship: 'FATHER' | 'MOTHER' | 'GUARDIAN';
    }
  ): Promise<Parent> {
    await this.init();

    if (!user.permissions.includes(SMS_PERMISSIONS.MANAGE_STUDENTS) && user.role !== 'SUPER_ADMIN') {
      throw new Error(`Forbidden: Missing required permission [${SMS_PERMISSIONS.MANAGE_STUDENTS}]`);
    }

    const dupNat = await this.client.execute({
      sql: 'SELECT * FROM parents WHERE national_id = ?;',
      args: [data.nationalId],
    });
    if (dupNat.rows.length > 0) {
      throw new Error(`Duplicate Parent Error: Parent with national ID '${data.nationalId}' already exists`);
    }

    const parentId = `PAR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO parents (id, national_id, full_name, email, phone, relationship, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [parentId, data.nationalId, data.fullName, data.email, data.phone, data.relationship, now, now],
    });

    return {
      id: parentId,
      nationalId: data.nationalId,
      fullName: data.fullName,
      email: data.email,
      phone: data.phone,
      relationship: data.relationship,
      createdAt: now,
      updatedAt: now,
    };
  }

  // --- MODULE 05 STUDENT TRANSFERS ---

  public async createTransferRequest(user: UserContext, req: CreateTransferRequest): Promise<StudentTransfer> {
    await this.init();

    // Check permissions
    const canRequest =
      user.role === 'SUPER_ADMIN' ||
      user.permissions.includes(SMS_PERMISSIONS.REQUEST_TRANSFER) ||
      user.permissions.includes(SMS_PERMISSIONS.MANAGE_STUDENTS) ||
      user.permissions.includes(SMS_PERMISSIONS.CREATE_ENROLLMENT);
    if (!canRequest) {
      throw new Error('Forbidden: Missing required permission [transfer:request] (E-20 violation)');
    }

    // 1. Fetch student master record
    const studentRes = await this.client.execute({
      sql: 'SELECT * FROM students WHERE id = ?;',
      args: [req.studentId],
    });
    if (studentRes.rows.length === 0) {
      throw new Error(`Student Reference Error: Student '${req.studentId}' does not exist (E-04 violation)`);
    }

    // 2. Fetch active enrollment for student
    const enrRes = await this.client.execute({
      sql: "SELECT * FROM student_enrollments WHERE student_id = ? AND status = 'ACTIVE';",
      args: [req.studentId],
    });
    if (enrRes.rows.length === 0) {
      throw new Error(`Active Enrollment Required: No active enrollment found for student '${req.studentId}' (E-12 violation)`);
    }
    const activeEnr = enrRes.rows[0];

    // 3. Check if active pending or approved transfer request already exists for this student
    const existingReqRes = await this.client.execute({
      sql: "SELECT id FROM student_transfers WHERE student_id = ? AND status IN ('PENDING', 'UNDER_REVIEW', 'APPROVED');",
      args: [req.studentId],
    });
    if (existingReqRes.rows.length > 0) {
      throw new Error(`Active Transfer Request Exists: Student '${req.studentId}' already has a pending or approved transfer request`);
    }

    // 4. Validate Transfer Details based on type
    if (req.transferType === 'INTERNAL') {
      if (!req.targetStageId || !req.targetGradeId || !req.targetClassId) {
        throw new Error('Invalid Internal Transfer Request: targetStageId, targetGradeId, and targetClassId are required');
      }

      // Check existence of target structure
      const stageRes = await this.client.execute({ sql: 'SELECT name FROM academic_stages WHERE id = ?;', args: [req.targetStageId] });
      const gradeRes = await this.client.execute({ sql: 'SELECT name FROM grades WHERE id = ?;', args: [req.targetGradeId] });
      const classRes = await this.client.execute({ sql: 'SELECT name FROM classes WHERE id = ?;', args: [req.targetClassId] });

      if (stageRes.rows.length === 0 || gradeRes.rows.length === 0 || classRes.rows.length === 0) {
        throw new Error('Target Academic Structure Reference Error: Target Stage, Grade, or Class does not exist');
      }

      // Validate progression path
      const pathVal = await this.validateAcademicPath(String(activeEnr.grade_id), req.targetGradeId);
      if (!pathVal.isValid) {
        throw new Error(`Invalid Academic Path Jump: ${pathVal.reason} (C-14 violation)`);
      }
    } else if (req.transferType === 'EXTERNAL') {
      if (!req.destinationSchoolName || req.destinationSchoolName.trim().length < 3) {
        throw new Error('Invalid External Transfer Request: destinationSchoolName is required (minimum 3 characters)');
      }
    } else {
      throw new Error(`Invalid Transfer Type '${req.transferType}': Must be INTERNAL or EXTERNAL`);
    }

    if (!req.reason || req.reason.trim().length < 5) {
      throw new Error('Transfer Reason Required: A detailed reason (minimum 5 characters) is required');
    }

    if (!req.effectiveDate) {
      throw new Error('Effective Date Required: Effective date must be specified');
    }

    const transferId = `TRF-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const transferNumber = `TRF-${new Date().getFullYear()}-${Math.floor(10000 + Math.random() * 90000)}`;
    const now = new Date().toISOString();

    await this.client.execute({
      sql: `INSERT INTO student_transfers (
        id, transfer_number, student_id, transfer_type, status,
        source_academic_year_id, source_stage_id, source_grade_id, source_class_id, source_enrollment_id,
        target_stage_id, target_grade_id, target_class_id,
        destination_school_name, destination_details, reason, effective_date,
        requested_by_user_id, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 'PENDING', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
      args: [
        transferId,
        transferNumber,
        req.studentId,
        req.transferType,
        String(activeEnr.academic_year_id),
        String(activeEnr.stage_id),
        String(activeEnr.grade_id),
        String(activeEnr.class_id),
        String(activeEnr.id),
        req.targetStageId || null,
        req.targetGradeId || null,
        req.targetClassId || null,
        req.destinationSchoolName || null,
        req.destinationDetails || null,
        req.reason,
        req.effectiveDate,
        user.userId,
        now,
        now,
      ],
    });

    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'STUDENT_TRANSFER',
      entityId: transferId,
      action: 'REQUEST_TRANSFER',
      newValue: req.transferType,
      reason: req.reason,
    });

    return await this.getTransferById(transferId);
  }

  public async getTransfers(filters?: {
    studentId?: string;
    transferType?: TransferType;
    status?: TransferStatus;
    academicYearId?: string;
    search?: string;
  }): Promise<StudentTransfer[]> {
    await this.init();

    let sql = `
      SELECT t.*,
        s.first_name || ' ' || s.last_name as student_name,
        s.file_number,
        s.national_id,
        ay.code as source_academic_year_code,
        stg_src.name as source_stage_name,
        grd_src.name as source_grade_name,
        cls_src.name as source_class_name,
        stg_tgt.name as target_stage_name,
        grd_tgt.name as target_grade_name,
        cls_tgt.name as target_class_name,
        u_req.full_name as requested_by_user_name,
        u_app.full_name as approved_by_user_name
      FROM student_transfers t
      JOIN students s ON t.student_id = s.id
      JOIN academic_years ay ON t.source_academic_year_id = ay.id
      JOIN academic_stages stg_src ON t.source_stage_id = stg_src.id
      JOIN grades grd_src ON t.source_grade_id = grd_src.id
      JOIN classes cls_src ON t.source_class_id = cls_src.id
      LEFT JOIN academic_stages stg_tgt ON t.target_stage_id = stg_tgt.id
      LEFT JOIN grades grd_tgt ON t.target_grade_id = grd_tgt.id
      LEFT JOIN classes cls_tgt ON t.target_class_id = cls_tgt.id
      LEFT JOIN users u_req ON t.requested_by_user_id = u_req.id
      LEFT JOIN users u_app ON t.approved_by_user_id = u_app.id
      WHERE 1=1
    `;

    const args: any[] = [];

    if (filters?.studentId) {
      sql += ` AND t.student_id = ?`;
      args.push(filters.studentId);
    }
    if (filters?.transferType) {
      sql += ` AND t.transfer_type = ?`;
      args.push(filters.transferType);
    }
    if (filters?.status) {
      sql += ` AND t.status = ?`;
      args.push(filters.status);
    }
    if (filters?.academicYearId) {
      sql += ` AND t.source_academic_year_id = ?`;
      args.push(filters.academicYearId);
    }
    if (filters?.search) {
      const term = `%${filters.search.trim().toLowerCase()}%`;
      sql += ` AND (LOWER(s.first_name || ' ' || s.last_name) LIKE ? OR LOWER(s.file_number) LIKE ? OR LOWER(s.national_id) LIKE ? OR LOWER(t.transfer_number) LIKE ?)`;
      args.push(term, term, term, term);
    }

    sql += ` ORDER BY t.created_at DESC;`;

    const res = await this.client.execute({ sql, args });
    return res.rows.map((row) => ({
      id: String(row.id),
      transferNumber: String(row.transfer_number),
      studentId: String(row.student_id),
      transferType: row.transfer_type as TransferType,
      status: row.status as TransferStatus,
      sourceAcademicYearId: String(row.source_academic_year_id),
      sourceStageId: String(row.source_stage_id),
      sourceGradeId: String(row.source_grade_id),
      sourceClassId: String(row.source_class_id),
      sourceEnrollmentId: String(row.source_enrollment_id),
      targetStageId: row.target_stage_id ? String(row.target_stage_id) : undefined,
      targetGradeId: row.target_grade_id ? String(row.target_grade_id) : undefined,
      targetClassId: row.target_class_id ? String(row.target_class_id) : undefined,
      destinationSchoolName: row.destination_school_name ? String(row.destination_school_name) : undefined,
      destinationDetails: row.destination_details ? String(row.destination_details) : undefined,
      reason: String(row.reason),
      effectiveDate: String(row.effective_date),
      requestedByUserId: String(row.requested_by_user_id),
      reviewedByUserId: row.reviewed_by_user_id ? String(row.reviewed_by_user_id) : undefined,
      approvedByUserId: row.approved_by_user_id ? String(row.approved_by_user_id) : undefined,
      executedByUserId: row.executed_by_user_id ? String(row.executed_by_user_id) : undefined,
      rejectionReason: row.rejection_reason ? String(row.rejection_reason) : undefined,
      isCapacityOverride: Boolean(row.is_capacity_override),
      overrideReason: row.override_reason ? String(row.override_reason) : undefined,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
      studentName: row.student_name ? String(row.student_name) : undefined,
      fileNumber: row.file_number ? String(row.file_number) : undefined,
      nationalId: row.national_id ? String(row.national_id) : undefined,
      sourceAcademicYearCode: row.source_academic_year_code ? String(row.source_academic_year_code) : undefined,
      sourceStageName: row.source_stage_name ? String(row.source_stage_name) : undefined,
      sourceGradeName: row.source_grade_name ? String(row.source_grade_name) : undefined,
      sourceClassName: row.source_class_name ? String(row.source_class_name) : undefined,
      targetStageName: row.target_stage_name ? String(row.target_stage_name) : undefined,
      targetGradeName: row.target_grade_name ? String(row.target_grade_name) : undefined,
      targetClassName: row.target_class_name ? String(row.target_class_name) : undefined,
      requestedByUserName: row.requested_by_user_name ? String(row.requested_by_user_name) : undefined,
      approvedByUserName: row.approved_by_user_name ? String(row.approved_by_user_name) : undefined,
    }));
  }

  public async getTransferById(id: string): Promise<StudentTransfer> {
    const list = await this.getTransfers();
    const item = list.find((t) => t.id === id);
    if (!item) {
      throw new Error(`Transfer Reference Error: Transfer '${id}' does not exist`);
    }
    return item;
  }

  public async updateTransferStatus(
    user: UserContext,
    transferId: string,
    newStatus: TransferStatus,
    reason?: string
  ): Promise<StudentTransfer> {
    await this.init();

    // Check permissions
    const canReviewOrApprove =
      user.role === 'SUPER_ADMIN' ||
      user.role === 'ACADEMIC_ADMIN' ||
      user.role === 'SCHOOL_HEAD' ||
      user.permissions.includes(SMS_PERMISSIONS.REVIEW_TRANSFER) ||
      user.permissions.includes(SMS_PERMISSIONS.APPROVE_TRANSFER) ||
      user.permissions.includes(SMS_PERMISSIONS.MANAGE_STUDENTS);

    if (!canReviewOrApprove) {
      throw new Error('Forbidden: Missing required permission [transfer:review or transfer:approve] (E-20 violation)');
    }

    const transfer = await this.getTransferById(transferId);

    // Terminal states cannot transition
    if (['EXECUTED', 'REJECTED', 'CANCELLED'].includes(transfer.status)) {
      throw new Error(`Invalid Status Transition: Transfer '${transferId}' is in terminal state '${transfer.status}' and cannot be modified`);
    }

    // State machine check
    if (newStatus === 'REJECTED') {
      if (!reason || reason.trim().length < 5) {
        throw new Error('Rejection Reason Required: Rejection reason must be specified (minimum 5 characters)');
      }
    } else if (newStatus === 'APPROVED') {
      if (!['PENDING', 'UNDER_REVIEW'].includes(transfer.status)) {
        throw new Error(`Invalid Status Transition: Cannot approve transfer in status '${transfer.status}'`);
      }
    } else if (newStatus === 'UNDER_REVIEW') {
      if (transfer.status !== 'PENDING') {
        throw new Error(`Invalid Status Transition: Cannot move transfer from '${transfer.status}' to UNDER_REVIEW`);
      }
    } else if (newStatus === 'CANCELLED') {
      if (['EXECUTED', 'REJECTED'].includes(transfer.status)) {
        throw new Error(`Invalid Status Transition: Cannot cancel transfer in status '${transfer.status}'`);
      }
    } else {
      throw new Error(`Invalid Target Status '${newStatus}' for updateTransferStatus`);
    }

    const now = new Date().toISOString();
    let sql = `UPDATE student_transfers SET status = ?, updated_at = ?`;
    const args: any[] = [newStatus, now];

    if (newStatus === 'UNDER_REVIEW') {
      sql += `, reviewed_by_user_id = ?`;
      args.push(user.userId);
    } else if (newStatus === 'APPROVED') {
      sql += `, approved_by_user_id = ?`;
      args.push(user.userId);
    } else if (newStatus === 'REJECTED') {
      sql += `, approved_by_user_id = ?, rejection_reason = ?`;
      args.push(user.userId, reason);
    }

    sql += ` WHERE id = ?;`;
    args.push(transferId);

    await this.client.execute({ sql, args });

    let actionName: any = 'REVIEW_TRANSFER';
    if (newStatus === 'APPROVED') actionName = 'APPROVE_TRANSFER';
    if (newStatus === 'REJECTED') actionName = 'REJECT_TRANSFER';
    if (newStatus === 'CANCELLED') actionName = 'CANCEL_TRANSFER';

    await this.addAudit({
      userId: user.userId,
      userName: user.userName,
      entity: 'STUDENT_TRANSFER',
      entityId: transferId,
      action: actionName,
      oldValue: transfer.status,
      newValue: newStatus,
      reason: reason || transfer.reason,
    });

    return await this.getTransferById(transferId);
  }

  public async executeTransfer(
    user: UserContext,
    transferId: string,
    opts?: { isCapacityOverride?: boolean; overrideReason?: string }
  ): Promise<StudentTransfer> {
    await this.init();

    // Check permissions
    const canExecute =
      user.role === 'SUPER_ADMIN' ||
      user.role === 'ACADEMIC_ADMIN' ||
      user.permissions.includes(SMS_PERMISSIONS.EXECUTE_TRANSFER) ||
      user.permissions.includes(SMS_PERMISSIONS.MANAGE_STUDENTS);

    if (!canExecute) {
      throw new Error('Forbidden: Missing required permission [transfer:execute] (E-20 violation)');
    }

    const transfer = await this.getTransferById(transferId);

    if (transfer.status !== 'APPROVED') {
      throw new Error(`Transfer Execution Blocked: Only APPROVED transfer requests can be executed (current status is '${transfer.status}')`);
    }

    // Verify source student & active enrollment
    const studentRes = await this.client.execute({ sql: 'SELECT * FROM students WHERE id = ?;', args: [transfer.studentId] });
    if (studentRes.rows.length === 0) {
      throw new Error(`Student Reference Error: Student '${transfer.studentId}' not found`);
    }

    const enrRes = await this.client.execute({
      sql: "SELECT * FROM student_enrollments WHERE id = ? AND status = 'ACTIVE';",
      args: [transfer.sourceEnrollmentId],
    });
    if (enrRes.rows.length === 0) {
      throw new Error(`Source Enrollment Unavailable: Source active enrollment '${transfer.sourceEnrollmentId}' is no longer ACTIVE`);
    }

    const now = new Date().toISOString();

    if (transfer.transferType === 'INTERNAL') {
      if (!transfer.targetClassId || !transfer.targetStageId || !transfer.targetGradeId) {
        throw new Error('Internal Transfer Execution Error: Missing target academic structure details');
      }

      // Check Target Class Capacity
      const targetClassRes = await this.client.execute({
        sql: 'SELECT id, capacity, current_enrollment_count FROM classes WHERE id = ?;',
        args: [transfer.targetClassId],
      });
      if (targetClassRes.rows.length === 0) {
        throw new Error(`Target Class Error: Target Class '${transfer.targetClassId}' not found`);
      }
      const targetClass = targetClassRes.rows[0];
      const cap = Number(targetClass.capacity);
      const curCount = Number(targetClass.current_enrollment_count);

      let isOverride = false;
      let overrideReason = opts?.overrideReason;

      if (curCount >= cap) {
        if (!opts?.isCapacityOverride) {
          throw new Error(`Class Capacity Exceeded: Target class is at maximum capacity (${curCount}/${cap}). Administrative override required (E-13 violation)`);
        }
        if (!overrideReason || overrideReason.trim().length < 5) {
          throw new Error('Administrative Override Error: Detailed override reason (minimum 5 characters) is required when target class is full');
        }

        const canOverride =
          user.role === 'SUPER_ADMIN' ||
          user.role === 'ACADEMIC_ADMIN' ||
          user.permissions.includes(SMS_PERMISSIONS.ADMIN_OVERRIDE_CAPACITY);

        if (!canOverride) {
          throw new Error('Forbidden: Missing required permission [capacity:admin_override] for over-capacity transfer');
        }
        isOverride = true;
      }

      // EXECUTE ATOMIC INTERNAL TRANSFER
      try {
        // 1. Close source enrollment (WITHDRAWN)
        await this.client.execute({
          sql: "UPDATE student_enrollments SET status = 'WITHDRAWN', updated_at = ? WHERE id = ?;",
          args: [now, transfer.sourceEnrollmentId],
        });

        // 2. Decrement source class counter
        await this.client.execute({
          sql: 'UPDATE classes SET current_enrollment_count = MAX(0, current_enrollment_count - 1), updated_at = ? WHERE id = ?;',
          args: [now, transfer.sourceClassId],
        });

        // 3. Create destination enrollment
        const newEnrId = `ENR-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
        await this.client.execute({
          sql: `INSERT INTO student_enrollments (
            id, student_id, academic_year_id, stage_id, grade_id, class_id,
            admission_type, status, academic_result, transfer_origin, created_at, updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, 'TRANSFER_IN', 'ACTIVE', 'PENDING', ?, ?, ?);`,
          args: [
            newEnrId,
            transfer.studentId,
            transfer.sourceAcademicYearId,
            transfer.targetStageId,
            transfer.targetGradeId,
            transfer.targetClassId,
            `INTERNAL_TRANSFER:${transfer.transferNumber}`,
            now,
            now,
          ],
        });

        // 4. Increment target class counter
        await this.client.execute({
          sql: 'UPDATE classes SET current_enrollment_count = current_enrollment_count + 1, updated_at = ? WHERE id = ?;',
          args: [now, transfer.targetClassId],
        });

        // 5. Update student master placement pointers
        await this.client.execute({
          sql: `UPDATE students SET
            current_stage_id = ?, current_grade_id = ?, current_class_id = ?, updated_at = ?
            WHERE id = ?;`,
          args: [transfer.targetStageId, transfer.targetGradeId, transfer.targetClassId, now, transfer.studentId],
        });

        // 6. Log capacity override if applicable
        if (isOverride) {
          const capLogId = `CAP-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
          await this.client.execute({
            sql: `INSERT INTO capacity_logs (
              id, class_id, old_capacity, new_capacity, override_reason, user_id, user_name, timestamp
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
            args: [capLogId, transfer.targetClassId, cap, curCount + 1, overrideReason, user.userId, user.userName, now],
          });
        }

        // 7. Update transfer record status to EXECUTED
        await this.client.execute({
          sql: `UPDATE student_transfers SET
            status = 'EXECUTED', executed_by_user_id = ?, is_capacity_override = ?, override_reason = ?, updated_at = ?
            WHERE id = ?;`,
          args: [user.userId, isOverride ? 1 : 0, overrideReason || null, now, transferId],
        });

        // 8. Add audit trail records
        await this.addAudit({
          userId: user.userId,
          userName: user.userName,
          entity: 'STUDENT_TRANSFER',
          entityId: transferId,
          action: 'EXECUTE_TRANSFER',
          oldValue: 'APPROVED',
          newValue: 'EXECUTED (INTERNAL)',
          reason: transfer.reason,
        });
      } catch (err) {
        throw new Error(`Internal Transfer Transaction Execution Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    } else if (transfer.transferType === 'EXTERNAL') {
      // EXECUTE ATOMIC EXTERNAL TRANSFER
      try {
        // 1. Close source enrollment (WITHDRAWN)
        await this.client.execute({
          sql: "UPDATE student_enrollments SET status = 'WITHDRAWN', updated_at = ? WHERE id = ?;",
          args: [now, transfer.sourceEnrollmentId],
        });

        // 2. Decrement source class counter
        await this.client.execute({
          sql: 'UPDATE classes SET current_enrollment_count = MAX(0, current_enrollment_count - 1), updated_at = ? WHERE id = ?;',
          args: [now, transfer.sourceClassId],
        });

        // 3. Deactivate student master record
        await this.client.execute({
          sql: `UPDATE students SET
            is_active = 0, updated_at = ?
            WHERE id = ?;`,
          args: [now, transfer.studentId],
        });

        // 4. Update transfer record status to EXECUTED
        await this.client.execute({
          sql: `UPDATE student_transfers SET status = 'EXECUTED', executed_by_user_id = ?, updated_at = ? WHERE id = ?;`,
          args: [user.userId, now, transferId],
        });

        // 5. Add audit trail record
        await this.addAudit({
          userId: user.userId,
          userName: user.userName,
          entity: 'STUDENT_TRANSFER',
          entityId: transferId,
          action: 'EXECUTE_TRANSFER',
          oldValue: 'APPROVED',
          newValue: 'EXECUTED (EXTERNAL)',
          reason: `Transferred out to ${transfer.destinationSchoolName}: ${transfer.reason}`,
        });
      } catch (err) {
        throw new Error(`External Transfer Transaction Execution Failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    return await this.getTransferById(transferId);
  }

  // --- MODULE 01 & 02 REGRESSION FETCHERS ---
  public async getStudents(): Promise<Student[]> {
    await this.init();
    const res = await this.client.execute('SELECT * FROM students ORDER BY created_at ASC;');
    return res.rows.map((row) => ({
      id: String(row.id),
      fileNumber: String(row.file_number),
      nationalId: String(row.national_id),
      firstName: String(row.first_name),
      lastName: String(row.last_name),
      gender: row.gender as any,
      dateOfBirth: String(row.date_of_birth),
      parentId: String(row.parent_id),
      currentStageId: String(row.current_stage_id),
      currentGradeId: String(row.current_grade_id),
      currentClassId: String(row.current_class_id),
      currentAcademicYearId: String(row.current_academic_year_id),
      isActive: Boolean(row.is_active),
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }

  public async getParents(): Promise<Parent[]> {
    await this.init();
    const res = await this.client.execute('SELECT * FROM parents ORDER BY created_at ASC;');
    return res.rows.map((row) => ({
      id: String(row.id),
      nationalId: String(row.national_id),
      fullName: String(row.full_name),
      email: String(row.email),
      phone: String(row.phone),
      relationship: row.relationship as any,
      createdAt: String(row.created_at),
      updatedAt: String(row.updated_at),
    }));
  }
}

// Operational singleton database pointing to persistent disk storage
export const smsDb = new SMSDatabase('file:data/sms.db');
