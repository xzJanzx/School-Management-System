-- Migration 0001: Initial Schema for SMS Module 03 (and Modules 01 & 02)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL,
  permissions TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS session_tokens (
  token TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS academic_years (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 0,
  is_closed INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_single_active_year 
ON academic_years (is_active) WHERE is_active = 1;

CREATE TABLE IF NOT EXISTS academic_stages (
  id TEXT PRIMARY KEY,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sequence INTEGER UNIQUE NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS grades (
  id TEXT PRIMARY KEY,
  stage_id TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  sequence INTEGER UNIQUE NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (stage_id) REFERENCES academic_stages(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY,
  grade_id TEXT NOT NULL,
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  capacity INTEGER NOT NULL DEFAULT 30,
  current_enrollment_count INTEGER NOT NULL DEFAULT 0,
  is_active INTEGER NOT NULL DEFAULT 1,
  sequence INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS parents (
  id TEXT PRIMARY KEY,
  national_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  phone TEXT NOT NULL,
  relationship TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY,
  file_number TEXT UNIQUE NOT NULL,
  national_id TEXT UNIQUE NOT NULL,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  gender TEXT NOT NULL,
  date_of_birth TEXT NOT NULL,
  parent_id TEXT NOT NULL,
  current_stage_id TEXT NOT NULL,
  current_grade_id TEXT NOT NULL,
  current_class_id TEXT NOT NULL,
  current_academic_year_id TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (parent_id) REFERENCES parents(id) ON DELETE RESTRICT,
  FOREIGN KEY (current_stage_id) REFERENCES academic_stages(id) ON DELETE RESTRICT,
  FOREIGN KEY (current_grade_id) REFERENCES grades(id) ON DELETE RESTRICT,
  FOREIGN KEY (current_class_id) REFERENCES classes(id) ON DELETE RESTRICT,
  FOREIGN KEY (current_academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT
);

CREATE TABLE IF NOT EXISTS capacity_logs (
  id TEXT PRIMARY KEY,
  class_id TEXT NOT NULL,
  old_capacity INTEGER NOT NULL,
  new_capacity INTEGER NOT NULL,
  override_reason TEXT NOT NULL,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  timestamp TEXT NOT NULL,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_name TEXT NOT NULL,
  entity TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  reason TEXT,
  timestamp TEXT NOT NULL
);
