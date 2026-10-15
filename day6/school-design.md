# School Database Design

## Tables and Their Purpose

### Students

The `students` table stores each student's information. It contains an `id` primary key, a `name`, and an `email`. The name and email are required, and the email must be unique so that two students cannot register using the same email address.

### Courses

The `courses` table stores the courses offered by the school. It contains an `id` primary key and a `course_name`. The course name is required and unique so that the same course name is not accidentally entered more than once.

### Enrolments

The `enrolments` table records which students are enrolled in which courses. It contains an `id` primary key, a `student_id` foreign key referencing `students(id)`, a `course_id` foreign key referencing `courses(id)`, and a `grade`. The grade can be empty until the student has been assessed. Both foreign keys are required, and a UNIQUE constraint on `(student_id, course_id)` prevents a student from enrolling in the same course twice.

## Relationships

The relationship between students and enrolments is one-to-many because one student can have several enrolments, but each enrolment belongs to one student. The relationship between courses and enrolments is also one-to-many because one course can have many enrolments, but each enrolment refers to one course.

Students and courses therefore have a many-to-many relationship: a student can take several courses, and a course can have several students. The enrolments table is necessary as a join table to connect the two tables. It also stores information about the relationship itself, such as the student's grade. This design avoids repeating student and course details in multiple rows.

## Index

I would add an index on `enrolments(course_id)` to speed up queries that find all students taking a particular course or count enrolments per course. The index helps the database locate matching enrolments without scanning the entire table as the database grows. Indexes require extra storage and make inserts and updates slightly more expensive, so they should be added where they provide a useful benefit.

## SQL or NoSQL?

I would choose a relational SQL database for this school system. Students, courses and enrolments have clearly defined fields and relationships, and foreign keys and UNIQUE constraints help maintain data integrity. SQL also provides JOINs and GROUP BY for retrieving course lists and counting enrolments. A document-oriented NoSQL database could be useful if the data structure changed frequently, but the structured relationships and consistency requirements of this assignment make SQL the more suitable choice. SQLite is sufficient for this assignment and supports the required operations.

