-- Migration 0003: Student Enrollment Schema for SMS Module 04

CREATE TABLE IF NOT EXISTS student_enrollments (
  id TEXT PRIMARY KEY,
  student_id TEXT NOT NULL,
  academic_year_id TEXT NOT NULL,
  stage_id TEXT NOT NULL,
  grade_id TEXT NOT NULL,
  class_id TEXT NOT NULL,
  admission_type TEXT NOT NULL, -- 'NEW', 'CONTINUING', 'TRANSFER_IN', 'RETURNING'
  status TEXT NOT NULL DEFAULT 'ACTIVE', -- 'ACTIVE', 'WITHDRAWN', 'COMPLETED', 'SUSPENDED', 'CANCELLED'
  academic_result TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PASS', 'FAIL', 'REPEATING'
  transfer_origin TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
  FOREIGN KEY (academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
  FOREIGN KEY (stage_id) REFERENCES academic_stages(id) ON DELETE RESTRICT,
  FOREIGN KEY (grade_id) REFERENCES grades(id) ON DELETE RESTRICT,
  FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE RESTRICT
);

-- Unique index enforcing maximum 1 ACTIVE enrollment per student per academic year
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_active_student_year 
ON student_enrollments (student_id, academic_year_id) WHERE status = 'ACTIVE';
