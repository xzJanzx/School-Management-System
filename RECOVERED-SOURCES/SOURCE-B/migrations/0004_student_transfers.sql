-- Migration 0004: Student Transfers Schema for SMS Module 05

CREATE TABLE IF NOT EXISTS student_transfers (
  id TEXT PRIMARY KEY,
  transfer_number TEXT UNIQUE NOT NULL,
  student_id TEXT NOT NULL,
  transfer_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  source_academic_year_id TEXT NOT NULL,
  source_stage_id TEXT NOT NULL,
  source_grade_id TEXT NOT NULL,
  source_class_id TEXT NOT NULL,
  source_enrollment_id TEXT NOT NULL,
  target_stage_id TEXT,
  target_grade_id TEXT,
  target_class_id TEXT,
  destination_school_name TEXT,
  destination_details TEXT,
  reason TEXT NOT NULL,
  effective_date TEXT NOT NULL,
  requested_by_user_id TEXT NOT NULL,
  reviewed_by_user_id TEXT,
  approved_by_user_id TEXT,
  executed_by_user_id TEXT,
  rejection_reason TEXT,
  is_capacity_override INTEGER DEFAULT 0,
  override_reason TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_academic_year_id) REFERENCES academic_years(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_stage_id) REFERENCES academic_stages(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_grade_id) REFERENCES grades(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_class_id) REFERENCES classes(id) ON DELETE RESTRICT,
  FOREIGN KEY (source_enrollment_id) REFERENCES student_enrollments(id) ON DELETE RESTRICT,
  FOREIGN KEY (target_stage_id) REFERENCES academic_stages(id) ON DELETE RESTRICT,
  FOREIGN KEY (target_grade_id) REFERENCES grades(id) ON DELETE RESTRICT,
  FOREIGN KEY (target_class_id) REFERENCES classes(id) ON DELETE RESTRICT
);

CREATE INDEX IF NOT EXISTS idx_transfers_student ON student_transfers (student_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON student_transfers (status);
CREATE INDEX IF NOT EXISTS idx_transfers_type ON student_transfers (transfer_type);
CREATE INDEX IF NOT EXISTS idx_transfers_year ON student_transfers (source_academic_year_id);
