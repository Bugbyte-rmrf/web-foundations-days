# Library Books REST API

## Overview

This document describes a REST API for managing books in a library.

The API uses JSON to exchange data between clients and the server.

**Base URL:** `https://api.example.com`

**Resource:** `/books`

## Book Data Structure

A book contains the following fields:

```json
{
  "id": 42,
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958,
  "isbn": "9780385474542"
}
```

- `id`: Unique identifier assigned to the book by the server.
- `title`: Title of the book.
- `author`: Name of the book's author.
- `publishedYear`: Year the book was published.
- `isbn`: International Standard Book Number.

## Endpoints

### 1. List All Books

**Method:** GET

**Path:** `/books`

**Description:** Returns a list of all books in the library.

**Example request body:** None. GET requests do not need a request body.

**Success status:** `200 OK`

**Example response:**

```json
[
  {
    "id": 42,
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "publishedYear": 1958,
    "isbn": "9780385474542"
  }
]
```

### 2. Get One Book

**Method:** GET

**Path:** `/books/{id}`

**Example:** `/books/42`

**Description:** Returns the details of a book with the specified ID.

**Example request body:** None.

**Success status:** `200 OK`

### 3. Create a Book

**Method:** POST

**Path:** `/books`

**Description:** Creates a new book and assigns it a unique ID.

**Example request body:**

```json
{
  "title": "Half of a Yellow Sun",
  "author": "Chimamanda Ngozi Adichie",
  "publishedYear": 2006,
  "isbn": "9780007200283"
}
```

**Success status:** `201 Created`

The server generates the new book's ID and returns the created book.

### 4. Update a Book

**Method:** PUT

**Path:** `/books/{id}`

**Example:** `/books/42`

**Description:** Replaces the existing book's information with the supplied information.

**Example request body:**

```json
{
  "title": "Things Fall Apart",
  "author": "Chinua Achebe",
  "publishedYear": 1958,
  "isbn": "9780385474542"
}
```

**Success status:** `200 OK`

The server returns the updated book.

### 5. Delete a Book

**Method:** DELETE

**Path:** `/books/{id}`

**Example:** `/books/42`

**Description:** Deletes the book with the specified ID.

**Example request body:** None.

**Success status:** `204 No Content`

The server confirms the deletion without returning a response body.

### 6. List Books by Author

**Method:** GET

**Path:** `/books?author={authorName}`

**Example:** `/books?author=Chinua%20Achebe`

**Description:** Returns books written by the specified author.

**Example request body:** None.

**Success status:** `200 OK`

**Example response:**

```json
[
  {
    "id": 42,
    "title": "Things Fall Apart",
    "author": "Chinua Achebe",
    "publishedYear": 1958,
    "isbn": "9780385474542"
  }
]
```

The `author` query parameter filters the results. If the author has no matching books, the server returns an empty array.

## Error Responses

### 400 Bad Request

**Meaning:** The request contains invalid data or is incorrectly formatted.

**Example:** A client attempts to create a book without a title or supplies an invalid publication year.

**Example response:**

```json
{
  "error": "Bad Request",
  "message": "The book title is required."
}
```

### 404 Not Found

**Meaning:** The requested resource does not exist.

**Example:** A client requests `GET /books/9999`, but no book with ID `9999` exists.

**Example response:**

```json
{
  "error": "Not Found",
  "message": "The requested book was not found."
}
```

## Summary

This API uses REST conventions and HTTP methods to perform CRUD operations:

- Create: `POST /books`
- Read: `GET /books` and `GET /books/{id}`
- Update: `PUT /books/{id}`
- Delete: `DELETE /books/{id}`

The author query parameter allows clients to retrieve books written by a particular author without creating a separate endpoint for each author.
