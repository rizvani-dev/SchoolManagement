-- Drop tables if they exist (for fresh start)
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS results CASCADE;
DROP TABLE IF EXISTS attendance CASCADE;
DROP TABLE IF EXISTS classes CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Users Table
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'teacher', 'student')),
    class_id INTEGER,
    teacher_id INTEGER,
    bio TEXT,
    profile_image VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Classes Table
CREATE TABLE classes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    teacher_id INTEGER REFERENCES users(id) ON DELETE SET NULL
);

-- Attendance Table
CREATE TABLE attendance (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES users(id),
    class_id INTEGER REFERENCES classes(id),
    date DATE NOT NULL,
    status VARCHAR(10) CHECK (status IN ('present', 'absent')) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Results Table
CREATE TABLE results (
    id SERIAL PRIMARY KEY,
    student_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    teacher_id INTEGER REFERENCES users(id),
    class_id INTEGER REFERENCES classes(id),
    subject VARCHAR(50) NOT NULL,
    marks INTEGER CHECK (marks >= 0 AND marks <= 100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Announcements Table
CREATE TABLE announcements (
    id SERIAL PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    description TEXT NOT NULL,
    created_by INTEGER REFERENCES users(id),
    target_role VARCHAR(20) CHECK (target_role IN ('all', 'teacher', 'student')),
    date DATE DEFAULT CURRENT_TIMESTAMP
);

-- Add missing foreign keys
ALTER TABLE users ADD CONSTRAINT fk_user_class FOREIGN KEY (class_id) REFERENCES classes(id) ON DELETE SET NULL;
ALTER TABLE users ADD CONSTRAINT fk_user_teacher FOREIGN KEY (teacher_id) REFERENCES users(id) ON DELETE SET NULL;

-- Create Default Admin (password = "password")
INSERT INTO users (name, email, password, role)
VALUES ('Super Admin', 'admin@school.com', '$2a$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', 'admin');

SELECT '✅ Database tables created and default admin added' AS message;