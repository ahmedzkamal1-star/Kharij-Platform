/**
 * database.js - إعداد قاعدة بيانات SQLite المحلية
 * تحفظ بيانات الشُعب، الطلاب، الفرق، والتسليمات الحقيقية
 */
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'database.sqlite');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('❌ خطأ في فتح قاعدة بيانات SQLite:', err.message);
  } else {
    console.log('✅ تم الاتصال بقاعدة بيانات SQLite المحلية بنجاح:', dbPath);
  }
});

// إنشاء الجداول الحقيقية
db.serialize(() => {
  // 1. جدول المستخدمين (دكاترة، طلاب، أدمن)
  db.run(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      national_id TEXT UNIQUE,
      student_id TEXT UNIQUE,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'student', -- 'student', 'doctor', 'admin'
      university TEXT,
      department TEXT,
      phone TEXT,
      card_photo_url TEXT,
      is_verified INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 2. جدول الشُعب والمشاريع التي ينشئها الدكتور
  db.run(`
    CREATE TABLE IF NOT EXISTS cohorts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cohort_code TEXT UNIQUE NOT NULL, -- مثال: ACC-2026
      doctor_id INTEGER,
      doctor_name TEXT NOT NULL,
      university TEXT NOT NULL,
      department TEXT NOT NULL,
      academic_year TEXT NOT NULL,
      project_title TEXT NOT NULL,
      track TEXT, -- 'acc', 'web', 'mobile', 'ai'
      id_range_start INTEGER NOT NULL, -- 230000
      id_range_end INTEGER NOT NULL,   -- 240000
      max_team_members INTEGER DEFAULT 4,
      notes TEXT,
      require_card_photo INTEGER DEFAULT 1,
      require_national_id INTEGER DEFAULT 1,
      require_fullname4 INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (doctor_id) REFERENCES users(id)
    )
  `);

  // 3. جدول الفرق (Teams)
  db.run(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_code TEXT UNIQUE NOT NULL,
      cohort_code TEXT NOT NULL,
      team_name TEXT NOT NULL,
      leader_id INTEGER NOT NULL,
      leader_name TEXT NOT NULL,
      status TEXT DEFAULT 'active', -- 'active', 'submitted', 'approved'
      doctor_note TEXT,
      last_reviewed_at DATETIME,
      is_published INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (cohort_code) REFERENCES cohorts(cohort_code),
      FOREIGN KEY (leader_id) REFERENCES users(id)
    )
  `);

  // 4. جدول أعضاء الفرق
  db.run(`
    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      user_id INTEGER,
      student_id TEXT NOT NULL,
      full_name TEXT NOT NULL,
      national_id TEXT,
      role_in_team TEXT,
      card_photo_url TEXT,
      status TEXT DEFAULT 'pending', -- 'pending', 'approved'
      joined_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // 5. جدول تسليمات ومراجعات الأقسام (Submissions & Reviews)
  db.run(`
    CREATE TABLE IF NOT EXISTS submissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      req_id INTEGER,
      section_index INTEGER NOT NULL, -- 1: مقدمة, 2: وصف, 3: ميزان مراجعة/ERD, 4: كود...
      section_name TEXT NOT NULL,
      content TEXT,
      file_url TEXT,
      status TEXT DEFAULT 'submitted', -- 'submitted', 'approved', 'needs_changes'
      doctor_comment TEXT,
      missing_notes TEXT,
      reviewed_at DATETIME,
      submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )
  `);

  // 6. جدول سجلات n8n والأتمتة والـ Webhooks
  db.run(`
    CREATE TABLE IF NOT EXISTS n8n_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      workflow_name TEXT NOT NULL,
      event_type TEXT NOT NULL,
      payload TEXT,
      response TEXT,
      status TEXT DEFAULT 'success',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 7. جدول أقسام ومتطلبات المشروع المخصصة (التي يضيفها الدكتور أو القائد)
  db.run(`
    CREATE TABLE IF NOT EXISTS project_sections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      cohort_code TEXT NOT NULL,
      team_id INTEGER,
      title TEXT NOT NULL,
      description TEXT,
      due_date DATETIME,
      target_team_ids TEXT,
      created_by TEXT NOT NULL, -- 'doctor' أو 'leader'
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
});

module.exports = db;
