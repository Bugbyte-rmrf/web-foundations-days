# Day 7 Assignment: SnapShare Scaling Plan

## 1. Assumptions and Daily Active Users

SnapShare is a photo-sharing application where users upload photos and view a feed of photos from people they follow.

The following assumptions are used:

| Assumption | Value |
|---|---:|
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

Daily active users (DAU):

10,000,000 × 10% = **1,000,000 daily active users**.

## 2. Traffic and Storage Estimates

### Uploads per second

Daily uploads:

1,000,000 active users × 1 photo = 1,000,000 uploads per day.

Average uploads per second:

1,000,000 ÷ 86,400 ≈ **11.6 uploads per second**.

Estimated peak uploads per second:

11.6 × 5 ≈ **58 uploads per second**.

### Feed views per second

Daily feed views:

1,000,000 active users × 50 feed pages = 50,000,000 feed views per day.

Average feed views per second:

50,000,000 ÷ 86,400 ≈ **579 feed views per second**.

Peak feed views per second:

579 × 5 ≈ **2,895 feed views per second**.

These figures count feed-page requests, not individual image downloads. Each feed page may contain several photos, so actual image traffic could be higher.

### Photo storage per year

Original photos:

1,000,000 uploads per day × 2 MB = 2 TB per day.

2 TB × 365 days = **730 TB of original photos per year**.

Thumbnails:

1,000,000 thumbnails per day × 50 KB = 50 GB per day.

50 GB × 365 days = **18.25 TB of thumbnails per year**.

Total new photo storage:

730 TB + 18.25 TB = **748.25 TB per year**.

This assumes all original photos and thumbnails are retained for the year. It excludes backups, replication overhead, and metadata.

### Capacity estimate summary

| Metric | Estimate |
|---|---:|
| Daily active users | 1,000,000 |
| Daily uploads | 1,000,000 |
| Average uploads per second | 11.6 |
| Peak uploads per second | 58 |
| Average feed views per second | 579 |
| Peak feed views per second | 2,895 |
| Original photo storage per year | 730 TB |
| Thumbnail storage per year | 18.25 TB |
| Total new photo storage per year | 748.25 TB |

## 3. Is SnapShare Read-Heavy or Write-Heavy?

SnapShare is **read-heavy** under these assumptions.

The system receives 1 million photo uploads per day and serves 50 million feed views per day. This gives a ratio of 50 feed views for every upload.

Because feed requests are much more frequent than uploads, the design should make reads fast and reduce unnecessary database queries.

A cache stores frequently requested feed data, a database read replica handles suitable read queries, and a CDN delivers cached photos and thumbnails. The primary database remains responsible for authoritative writes.

## 4. Why Photos Should Not Be Stored Inside the Database

The database should store structured metadata such as user IDs, photo IDs, captions, follower relationships, and object-storage keys.

The actual photo files should be stored in object storage, such as Amazon S3 or an equivalent service.

Storing large image files directly in database tables would increase database size, backup time, and storage costs. It could also compete with metadata queries for database resources.

Object storage is designed to store large files separately from structured records. The database keeps a reference to each file, and the CDN can cache and deliver the file to users.

For example, the database can store the object key `photos/123.jpg`, while object storage contains the actual image file.

## 5. Text Architecture Diagram

```text
                       +-----------------------+
                       |   Users / Clients     |
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
                     |                            v
                     |                    +---------------+
                     |                    | App Servers   |
                     |                    | App 1, App 2   |
                     |                    +-------+-------+
                     |                            |
                     |              +-------------+-------------+
                     |              |             |             |
                     |              v             v             v
                     |         +---------+  +-----------+   +---------+
                     |         | Cache   |  | Primary   |   | Queue   |
                     |         | Redis   |  | Database  |   | Jobs    |
                     |         +---------+  +-----+-----+   +----+----+
                     |                             |              |
                     |                             v              v
                     |                      +-------------+ +-----------+
                     |                      | Read Replica| | Thumbnail |
                     |                      |             | | Worker    |
                     |                      +-------------+ +-----+-----+
                     |                                            |
                     +---------------------+----------------------+
                                           |
                                           v
                                 +----------------------+
                                 | Object Storage       |
                                 | Original Photos and  |
                                 | Thumbnails           |
                                 +----------------------+
```

### Diagram flow notes

- Feed and upload-coordination API requests travel through the load balancer to a healthy app server.
- App servers check the cache for feed data and query the database when needed.
- Writes go to the primary database, and changes are replicated to the read replica for suitable read queries.
- The client can upload original photos directly to object storage using a restricted, short-lived pre-signed URL issued by the app.
- The app sends thumbnail-generation jobs to the queue after the original upload succeeds.
- The worker reads the original photo from object storage, creates a thumbnail, and saves it back to object storage.
- The CDN serves cached photo files and thumbnails; on a cache miss, it retrieves the file from the object-storage origin.

## 6. Component Explanations

- **CDN:** Delivers cached photos and thumbnails from locations closer to users, reducing latency and requests reaching the origin.
- **Load balancer:** Distributes incoming API requests across healthy app servers and avoids overloading one server.
- **App servers:** Handle authentication, feed requests, metadata, and upload coordination without relying on local session state.
- **Cache (Redis):** Stores frequently requested feed data in memory to reduce response times and database load.
- **Primary database:** Stores authoritative user, follower, and photo metadata and handles database writes.
- **Database read replica:** Serves suitable read queries using replicated data, reducing the read workload on the primary database.
- **Object storage:** Stores original photo files and generated thumbnails separately from structured database records.
- **Queue:** Holds thumbnail-generation jobs so image processing does not have to finish during the user's upload request.
- **Thumbnail worker:** Processes queued jobs, generates thumbnails, and saves the resulting image files to object storage.

## 7. Step-by-Step Photo Upload Flow

1. **The user starts an upload.** The client sends an authenticated upload request through the load balancer to an app server.
2. **The app validates the request.** The server checks the user's permissions, validates the file type and size, and creates a unique photo ID and object key.
3. **The app authorizes the upload.** The server issues a short-lived, restricted pre-signed URL that allows the client to upload the file directly to object storage.
4. **The original photo is uploaded.** The client uploads the original image to object storage using the pre-signed URL, avoiding the need to route the entire file through an app server.
5. **The app saves metadata.** After confirming the upload succeeded, the app records the photo ID, owner, object key, and processing status in the primary database.
6. **A thumbnail job enters the queue.** The app places a job containing the photo ID and object key onto the queue.
7. **The worker creates the thumbnail.** A worker retrieves the original photo, generates a 50 KB thumbnail, and stores it in object storage.
8. **The photo becomes available.** The system updates the processing status, and the CDN delivers the original or thumbnail when requested. If processing is not finished, the interface can display a placeholder.

The queue makes thumbnail generation asynchronous, so the upload request does not have to wait for image processing to finish. If many photos arrive at once, jobs can wait in the queue instead of immediately overloading the workers.

The system should retry failed jobs safely, avoid creating duplicate thumbnails where possible, and clean up abandoned uploads or orphaned files. It should not mark an upload as complete until the original file has been confirmed in object storage and its metadata has been recorded.

## 8. System Trade-Offs

### Trade-off 1: Speed versus Freshness

**Benefit:** The cache and read replica make feed reads faster and reduce the workload on the primary database.

**Cost:** Cached data can become stale, and a read replica may briefly lag behind the primary database while changes are replicated.

**Decision:** Accept brief delays for ordinary feed updates, but use the primary database for operations that require the latest authoritative data. Apply cache invalidation or expiration when feed metadata changes.

### Trade-off 2: Asynchronous Processing versus Immediate Availability

**Benefit:** A queue and worker keep uploads responsive and allow thumbnail processing to scale independently from the API servers.

**Cost:** Thumbnails may not be ready immediately, and the queue and worker need monitoring, retries, and failure handling.

**Decision:** Show a placeholder while a thumbnail is being generated, retry failed jobs safely, and monitor the queue so delayed jobs can be detected.

### Trade-off 3: Horizontal Scaling versus Simplicity

**Benefit:** Multiple app servers and workers can scale independently, and one app-server failure does not have to take down the whole application.

**Cost:** Multiple servers, caches, queues, database replicas, and monitoring systems increase infrastructure costs and operational complexity.

**Decision:** Start with a simple, well-organized application and add capacity when measured traffic or performance indicates it is necessary.

## Conclusion

SnapShare has an estimated 1 million daily active users, 11.6 average photo uploads per second, 579 average feed views per second, and 748.25 TB of new original-photo and thumbnail storage per year.

The system is read-heavy, so caching, database read replicas, and a CDN help serve feed requests efficiently. Object storage keeps large image files separate from database metadata, while a queue and worker generate thumbnails asynchronously.

The architecture separates responsibilities to support growth while acknowledging trade-offs involving freshness, processing delays, reliability, cost, and operational complexity.



