-- 宠物档案表
CREATE TABLE IF NOT EXISTS pet_profiles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(64) NOT NULL,
  name VARCHAR(64) NOT NULL,
  age INTEGER,
  age_unit VARCHAR(16),
  gender VARCHAR(16),
  pet_type VARCHAR(32),
  breed VARCHAR(64),
  weight REAL,
  length REAL,
  front_photo_path VARCHAR(255),
  side_photo_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_pet_profiles_user_id ON pet_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_pet_profiles_name ON pet_profiles(name);

-- 问诊对话表
CREATE TABLE IF NOT EXISTS consultation_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id VARCHAR(64) NOT NULL,
  pet_id INTEGER NOT NULL,
  role VARCHAR(16) NOT NULL,
  content TEXT NOT NULL,
  image_path VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (pet_id) REFERENCES pet_profiles(id)
);

CREATE INDEX IF NOT EXISTS idx_consult_user_pet ON consultation_messages(user_id, pet_id);
