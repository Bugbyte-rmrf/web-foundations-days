-- Enable foreign key enforcement in SQLite
PRAGMA foreign_keys = ON;

-- 1. Students table
CREATE TABLE students (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE
);

-- 2. Courses table
CREATE TABLE courses (
    id INTEGER PRIMARY KEY,
    course_name TEXT NOT NULL UNIQUE
);

-- 3. Enrolments table
CREATE TABLE enrolments (
    id INTEGER PRIMARY KEY,
    student_id INTEGER NOT NULL,
    course_id INTEGER NOT NULL,
    grade TEXT,

    FOREIGN KEY (student_id)
        REFERENCES students(id),

    FOREIGN KEY (course_id)
        REFERENCES courses(id),

    UNIQUE (student_id, course_id)
);


-- Sample students
INSERT INTO students (name, email) VALUES
    ('Amina Otieno', 'amina@example.com'),
    ('Brian Kamau', 'brian@example.com'),
    ('Grace Wanjiku', 'grace@example.com'),
    ('David Mwangi', 'david@example.com');

-- Sample courses
INSERT INTO courses (course_name) VALUES
    ('Web Development'),
    ('Database Design'),
    ('JavaScript Fundamentals');

-- Sample enrolments
INSERT INTO enrolments (student_id, course_id, grade) VALUES
    (1, 1, 'A'),
    (1, 2, 'B+'),
    (2, 1, 'B'),
    (2, 3, 'A-'),
    (3, 2, 'A');

SELECT
    students.name,
    courses.course_name,
    enrolments.grade
FROM students
JOIN enrolments
    ON students.id = enrolments.student_id
JOIN courses
    ON enrolments.course_id = courses.id
WHERE students.name = 'Amina Otieno';

SELECT
    courses.course_name,
    students.name,
    enrolments.grade
FROM courses
JOIN enrolments
    ON courses.id = enrolments.course_id
JOIN students
    ON enrolments.student_id = students.id
WHERE courses.course_name = 'Database Design';

SELECT
    courses.course_name,
    COUNT(enrolments.student_id) AS student_count
FROM courses
LEFT JOIN enrolments
    ON courses.id = enrolments.course_id
GROUP BY courses.id, courses.course_name
ORDER BY courses.course_name;

SELECT
    students.id,
    students.name,
    students.email
FROM students
LEFT JOIN enrolments
    ON students.id = enrolments.student_id
WHERE enrolments.id IS NULL;

UPDATE enrolments
SET grade = 'A+'
WHERE student_id = 1
  AND course_id = 1;

SELECT
    students.name,
    courses.course_name,
    enrolments.grade
FROM enrolments
JOIN students
    ON enrolments.student_id = students.id
JOIN courses
    ON enrolments.course_id = courses.id
WHERE students.id = 1
  AND courses.id = 1;



