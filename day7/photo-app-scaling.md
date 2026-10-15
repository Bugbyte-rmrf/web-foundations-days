# Day 7 Assignment: SnapShare Scaling Plan

## 1. Assumptions and Daily Active Users

SnapShare is a photo-sharing application where users upload photos and view a feed of photos from people they follow.

The following assumptions are used:

| Assumption | Value |
| :--- | :--- |
| Registered users | 10,000,000 |
| Daily active users | 10% of registered users |
| Photos uploaded per active user per day | 1 |
| Feed pages viewed per active user per day | 50 |
| Average original photo size | 2 MB |
| Average thumbnail size | 50 KB |
| Seconds per day | 86,400 |
| Peak traffic multiplier | 5x |
| Days per year | 365 |

For storage estimates, I use decimal units: 1 MB = 1,000 KB, 1 GB = 1,000 MB, and 1 TB = 1,000 GB.

**Daily active users (DAU):**
10,000,000 × 10% = **1,000,000 daily active users**.

---

## 2. Traffic and Storage Estimates

### Uploads per second
* **Daily uploads:** 1,000,000 active users × 1 photo = 1,000,000 uploads per day.
* **Average uploads per second:** 1,000,000 ÷ 86,400 ≈ **11.6 uploads per second**.
* **Estimated peak uploads per second:** 11.6 × 5 ≈ **58 uploads per second**.

### Feed views per second
* **Daily feed views:** 1,000,000 active users × 50 feed pages = 50,000,000 feed views per day.
* **Average feed views per second:** 50,000,000 ÷ 86,400 ≈ **579 feed views per second**.
* **Peak feed views per second:** 579 × 5 ≈ **2,895 feed views per second**.

These figures count feed-page requests, not individual image downloads. Each feed page may contain several photos, so actual image traffic could be higher.

### Photo storage per year
* **Original photos:**
  * 1,000,000 uploads per day × 2 MB = 2 TB per day.
  * 2 TB × 365 days = **730 TB of original photos per year**.
* **Thumbnails:**
  * 1,000,000 thumbnails per day × 50 KB = 50 GB per day.
  * 50 GB × 365 days = **18.25 TB of thumbnails per year**.
* **Total new photo storage:**
  * 730 TB + 18.25 TB = **748.25 TB per year**.

This assumes all original photos and thumbnails are retained for the year. It excludes backups, replication overhead, and metadata.

### Capacity Estimate Summary

| Metric | Estimate |
| :--- | :--- |
| Daily active users | 1,000,000 |
| Daily uploads | 1,000,000 |
| Average uploads per second | 11.6 |
| Peak uploads per second | 58 |
| Average feed views per second | 579 |
| Peak feed views per second | 2,895 |
| Original photo storage per year | 730 TB |
| Thumbnail storage per year | 18.25 TB |
| Total new photo storage per year | 748.25 TB |

---

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is **read-heavy** under these assumptions.

The system receives 1 million photo uploads per day and serves 50 million feed views per day. This gives a ratio of **50 feed views for every 1 upload (50:1)**.

Because feed requests are much more frequent than uploads, the design should make reads fast and reduce unnecessary database queries.

A cache stores frequently requested feed data, a database read replica handles suitable read queries, and a CDN delivers cached photos and thumbnails. The primary database remains responsible for authoritative writes.

---

## 4. Why Photos Should Not Be Stored Inside the Database

The database should store structured metadata such as user IDs, photo IDs, captions, follower relationships, and object-storage keys.

The actual binary photo files should be stored in dedicated object storage, such as Amazon S3 or an equivalent service.

Storing large image files directly in relational database tables would increase database size, backup time, and storage costs. It would also compete with metadata queries for database CPU, memory, and disk I/O resources.

Object storage is designed to store large unstructured binary files separately from structured records. The database keeps a reference to each file, and the CDN caches and delivers the file to users. For example, the database can store the object key `photos/123.jpg`, while object storage contains the actual image file.

---

## 5. Text Architecture Diagram

                           +-----------------------+
                           |    Users / Clients    |
                           |   Web or Mobile App   |
                           +-----------+-----------+
                                       |
                         +-------------+-------------+
                         |                           |
                         v                           v
                  +-------------+             +-------------+
                  | CDN         |             | Load        |
                  | Photos and  |             | Balancer    |
                  | Thumbnails  |             +------+------+
                  +------+------+                    |
                         |                           v
                         |                    +---------------+
                         |                    | App Servers   |
                         |                    | App 1, App 2  |
                         |                    +-------+-------+
                         |                            |
                         |              +-------------+-------------+
                         |              |             |             |
                         |              v             v             v
                         |         +---------+  +-----------+   +---------+
                         |         | Cache   |  | Primary   |   | Queue   |
                         |         | (Redis) |  | Database  |   | (Jobs)  |
                         |         +---------+  +-----+-----+   +----+----+
                         |                            |              |
                         |                            v              v
                         |                      +-----------+  +-----------+
                         |                      | Read      |  | Thumbnail |
                         |                      | Replica   |  | Worker    |
                         |                      +-----------+  +-----+-----+
                         |                                           |
                         +---------------------+---------------------+
                                               |
                                               v
                                     +----------------------+
                                     | Object Storage (S3)  |
                                     | Original Photos and  |
                                     | Thumbnails           |
                                     +----------------------+

### Diagram Flow Notes
* Feed and upload-coordination API requests travel through the load balancer to a healthy app server.
* App servers check the Redis cache for feed data and query the database read replica when needed.
* Writes go to the primary database, and changes are replicated asynchronously to the read replica for suitable read queries.
* The client uploads original photos directly to object storage using a restricted, short-lived pre-signed URL issued by the app server.
* The app server sends thumbnail-generation jobs to the queue after the original upload succeeds.
* The thumbnail worker reads the original photo from object storage, creates a 50 KB thumbnail, and saves it back to object storage.
* The CDN serves cached photo files and thumbnails to users; on a cache miss, it retrieves the file from the object-storage origin.

---

## 6. Component Explanations

* **CDN:** Delivers cached photos and thumbnails from edge locations closer to users, reducing latency and requests reaching the object-storage origin.
* **Load balancer:** Distributes incoming API requests across healthy app servers to prevent any single server from becoming overloaded.
* **App servers:** Handle authentication, feed requests, metadata, and upload coordination without relying on local session state.
* **Cache (Redis):** Stores frequently requested feed data in memory to reduce response times and database read load.
* **Primary database:** Stores authoritative user, follower, and photo metadata and handles all database write transactions.
* **Database read replica:** Serves suitable read queries using replicated data from the primary database, reducing the read workload on the primary database.
* **Object storage:** Stores original photo files and generated thumbnails durably and separately from structured database records.
* **Queue:** Holds asynchronous thumbnail-generation jobs so background image processing is decoupled from the user's upload request.
* **Thumbnail worker:** Processes queued jobs in the background, fetches original photos from object storage, generates thumbnails, and saves them back to object storage.

---

## 7. Step-by-Step Photo Upload Flow

1. **The user starts an upload:** The client sends an authenticated upload request through the load balancer to an app server.
2. **The app validates the request:** The server checks the user's permissions, validates the file type and size, and creates a unique photo ID and object key.
3. **The app authorizes the upload:** The server issues a short-lived, restricted pre-signed URL that allows the client to upload the file directly to object storage.
4. **The original photo is uploaded:** The client uploads the 2 MB original image directly to object storage using the pre-signed URL, avoiding the need to route the entire binary file through an app server.
5. **The app saves metadata:** After confirming the upload succeeded, the app records the photo ID, owner, object key, and `processing` status in the primary database.
6. **A thumbnail job enters the queue:** The app places a job containing the photo ID and object key onto the queue and returns a fast upload confirmation to the user.
7. **The worker creates the thumbnail:** A background worker retrieves the original photo from object storage, generates a 50 KB thumbnail, and stores the thumbnail back in object storage.
8. **The photo becomes available:** The worker updates the processing status to `ready` in the primary database, and the CDN delivers the original photo or thumbnail from object storage when requested (showing a placeholder if processing is still in progress).

The queue makes thumbnail generation asynchronous, decoupling slow image processing from the user-facing upload latency so the upload request does not have to wait for resizing to finish. If many photos arrive at once during peak traffic, jobs wait safely in the queue instead of overloading the app servers or workers.

The system retries failed jobs idempotently, avoids creating duplicate thumbnails, and cleans up abandoned uploads or orphaned files. It never marks an upload as complete until the original file is confirmed in object storage and its metadata is recorded in the primary database.

---

## 8. System Trade-Offs

### Trade-Off 1: Speed versus Freshness (Replication Lag and Eventual Consistency)
* **Benefit:** The Redis cache and database read replica make feed reads much faster and protect the primary database from handling 2,895 peak feed views per second.
* **Cost:** Cached data can become temporarily stale, and asynchronous replication introduces **replication lag** between the primary database and the read replica (**eventual consistency**), meaning followers may experience a brief delay before seeing a newly posted photo.
* **Decision:** Accept brief eventual consistency for ordinary feed views, use cache expiration (TTL) and invalidation when feed metadata changes, and route operations that require immediate authoritative data directly to the primary database.

### Trade-Off 2: Asynchronous Processing versus Immediate Availability
* **Benefit:** Offloading thumbnail generation to a background queue and worker pool keeps user upload latency low and allows image-processing workers to scale independently from the API servers.
* **Cost:** Thumbnails are not ready the exact millisecond an upload completes, and managing a queue and worker pool requires monitoring, dead-letter queues, and retry handling.
* **Decision:** Display a placeholder or client-side preview while the thumbnail is being generated in the background, retry failed jobs safely, and monitor queue depth so delayed jobs are detected early.

### Trade-Off 3: Horizontal Scaling versus Simplicity
* **Benefit:** Multiple stateless app servers and background workers can scale out independently to handle traffic spikes, and a single app-server failure does not take down the entire application.
* **Cost:** Running multiple servers, caches, queues, database replicas, and monitoring tools increases infrastructure cost and operational complexity.
* **Decision:** Start with a clean, modular architecture using managed cloud services (for Redis, database replicas, and object storage) and scale out server and worker instances based on measured traffic demand.

---

## Conclusion

SnapShare has an estimated 1,000,000 daily active users, 11.6 average photo uploads per second (58 peak), 579 average feed views per second (2,895 peak), and 748.25 TB of new original-photo and thumbnail storage per year.

Because the system is heavily read-biased (50:1), combining a CDN, Redis cache, and database read replicas serves feed requests efficiently. Object storage keeps large binary image files separate from relational database metadata, while a background queue and worker pool decouple thumbnail generation from upload latency. The architecture cleanly separates responsibilities to support scale while managing trade-offs around replication lag, eventual consistency, background processing delays, and operational complexity.






