# Day 7 Assignment: SnapShare Scaling Plan

## 1. Assumptions and Daily Active Users

SnapShare is a photo-sharing application where users upload photos and view a feed of photos from people they follow.

The following assumptions are used for the estimates:

| Assumption | Value |
|---|---:|
| Registered users | 10,000,000 |
| Daily active users percentage | 10% |
| Photos uploaded per active user per day | 1 |
| Feed pages viewed per active user per day | 50 |
| Average original photo size | 2 MB |
| Average thumbnail size | 50 KB |
| Seconds per day | 86,400 |
| Peak traffic multiplier | 5x |
| Days per year | 365 |

I use decimal units for storage calculations: 1 MB = 1,000 KB, 1 GB = 1,000 MB, and 1 TB = 1,000 GB.

Daily active users (DAU):

DAU = 10,000,000 × 10% = 1,000,000 users.

Therefore, SnapShare has an estimated **1 million daily active users**.

## 2. Traffic and Storage Estimates

### Uploads per second

Daily uploads:

1,000,000 active users × 1 photo = 1,000,000 photos per day.

Average uploads per second:

1,000,000 ÷ 86,400 ≈ **11.6 uploads per second**.

For additional planning, a 5x peak would be approximately 58 uploads per second.

### Feed views per second

Daily feed views:

1,000,000 active users × 50 feed pages = 50,000,000 feed views per day.

Average feed views per second:

50,000,000 ÷ 86,400 ≈ **579 feed views per second**.

Peak feed views per second:

579 × 5 ≈ **2,895 feed views per second**.

These numbers count feed-page requests, not individual image downloads. A feed page can contain several photos, so actual image traffic may be higher.

### Photo storage per year

Original photos per day:

1,000,000 × 2 MB = 2,000,000 MB = 2 TB per day.

Original photo storage per year:

2 TB × 365 = **730 TB per year**.

Thumbnail storage per day:

1,000,000 × 50 KB = 50,000,000 KB = 50 GB per day.

Thumbnail storage per year:

50 GB × 365 = **18.25 TB per year**.

Total new photo storage per year:

730 TB + 18.25 TB = **748.25 TB per year**.

This estimate assumes all originals and thumbnails are retained, with no deletions. It excludes backups, replication overhead, and metadata.

### Summary

| Metric | Estimate |
|---|---:|
| Daily active users | 1,000,000 |
| Daily photo uploads | 1,000,000 |
| Average uploads per second | 11.6 |
| Average feed views per second | 579 |
| Peak feed views per second | 2,895 |
| Original photo storage per year | 730 TB |
| Thumbnail storage per year | 18.25 TB |
| Total photo storage per year | 748.25 TB |

## 3. Read-Heavy or Write-Heavy?

SnapShare is a **read-heavy system** under these assumptions.

It receives 1 million photo uploads per day but serves 50 million feed views per day. That is 50 feed views for every photo upload.

This means the system needs to serve many read requests efficiently while continuing to accept new photos.

The design uses a cache to serve frequently requested feed data, a database read replica to handle suitable read queries, and a CDN to deliver photos and thumbnails quickly. The primary database remains responsible for authoritative writes.

## 4. Why Photos Should Not Be Stored in the Database

The database should store structured information such as user profiles, photo IDs, captions, follower relationships, and storage keys.

The actual photo files should be stored in **object storage**, such as Amazon S3 or an equivalent service.

Storing large image files directly inside the database would increase database size, backup time, and storage costs. It could also compete with metadata queries for database resources.

Object storage is designed to hold large files efficiently and independently of the database. The database stores a reference to each file, and the CDN can cache and deliver the file to users.

For example, the database can store a photo ID and the object key `photos/123.jpg`, while object storage contains the actual image.

## 5. Architecture Diagram

```text
                     +----------------------+
                     |    Users / Clients   |
                     |  Web or Mobile App   |
                     +----------+-----------+
                                |
                +---------------+----------------+
                |                                |
                v                                v
       +----------------+              +------------------+
       | CDN             |              | Load Balancer    |
       | Photos and      |              | Health checks    |
       | thumbnails      |              +--------+---------+
       +-------+--------+                       |
               |                                v
               |                      +--------------------+
               |                      | App Servers        |
               |                      | App 1, App 2, ...   |
               |                      +---------+----------+
               |                                |
               |                    +-----------+-----------+
               |                    |           |           |
               |                    v           v           v
               |              +---------+ +-----------+ +---------+
               |              | Cache   | | Primary   | | Queue   |
               |              | Redis   | | Database  | | Jobs    |
               |              +---------+ +-----+-----+ +----+----+
               |                                  |            |
               |                                  v            v
               |                           +-------------+ +----------+
               |                           | Read Replica| | Worker   |
               |                           +-------------+ +----+-----+
               |                                                  |
               +----------------------+---------------------------+
                                      |
                                      v
                            +----------------------+
                            | Object Storage       |
                            | Original photos and  |
                            | generated thumbnails |
                            +----------------------+
```

**Diagram notes:**

- Clients use the API through the load balancer for feed and upload coordination requests.
- Clients can upload original photos directly to object storage using restricted, short-lived pre-signed URLs issued by the app.
- The CDN delivers cached photo files and thumbnails; on a cache miss, it retrieves them from the object-storage origin.
- The app writes metadata to the primary database and sends thumbnail jobs to the queue.
- The worker reads original files from object storage, creates thumbnails, and writes the results back to object storage.
- The primary database replicates metadata to the read replica, which handles suitable read queries.

## 6. What Each Component Solves

| Component | Problem it solves |
|---|---|
| CDN | Delivers cached photos and thumbnails from locations closer to users, reducing latency and origin traffic. |
| Load balancer | Distributes API requests across healthy app servers to avoid overloading one server. |
| App servers | Handle authentication, feed requests, metadata, and upload coordination without depending on local session state. |
| Cache (Redis) | Stores frequently requested feed data in memory to reduce response times and database load. |
| Primary database | Stores authoritative user, follower, and photo metadata and processes writes. |
| Database read replica | Handles suitable read queries, reducing the read workload on the primary database. |
| Object storage | Stores original photo files and thumbnails separately from structured database records. |
| Queue | Holds thumbnail-generation jobs so image processing does not delay upload responses. |
| Worker | Processes queued jobs, generates thumbnails, and saves them to object storage. |

## 7. Step-by-Step Photo Upload Flow

1. **User initiates an upload:** The client sends an authenticated upload request to the API through the load balancer.
2. **App validates the request:** An app server checks the user's permissions, file type, and size, and generates a unique photo ID and object key.
3. **Upload authorization:** The app issues a short-lived, restricted pre-signed upload URL for object storage.
4. **Original upload:** The client uploads the original photo directly to object storage using the URL.
5. **Metadata saved:** After the upload succeeds, the app records the photo ID, owner, object key, and processing status in the primary database.
6. **Thumbnail job queued:** The app sends a job containing the photo ID and object key to the queue.
7. **Worker creates thumbnail:** A worker retrieves the original photo, generates the thumbnail, and stores it in object storage.
8. **Photo becomes available:** The system updates the processing status. The CDN delivers the photo or thumbnail when requested. A placeholder can be displayed if the thumbnail is not ready yet.

The queue separates slow image processing from the main upload request. If many users upload photos simultaneously, jobs can wait in the queue instead of immediately overloading the workers.

The worker should support safe retries, and the system should handle duplicate jobs and incomplete uploads. Monitoring and cleanup are needed for failed jobs and abandoned files.

## 8. Trade-Offs

### Trade-off 1: Speed versus freshness

**Benefit:** Caching and read replicas make feed requests faster and reduce database load.

**Cost:** Cached data or a replica may briefly be out of date because of cache expiry, invalidation delays, or replication lag.

**Decision:** Accept brief delays for ordinary feed updates, but use the primary database for operations requiring the latest authoritative data.

### Trade-off 2: Direct uploads versus uploads through app servers

**Benefit:** Direct uploads to object storage reduce bandwidth and processing work on app servers.

**Cost:** Pre-signed URLs, upload authorization, and completion handling add complexity.

**Decision:** Use direct uploads to handle the volume of large image files, while validating upload completion before marking a photo as available.

### Trade-off 3: Asynchronous thumbnails versus immediate processing

**Benefit:** A queue and worker keep upload requests responsive and can absorb bursts of thumbnail-generation jobs.

**Cost:** Thumbnails may not be available immediately, and queues and workers need retries, monitoring, and failure handling.

**Decision:** Show a placeholder while the thumbnail is being generated and retry failed jobs safely.

### Trade-off 4: Horizontal scaling versus simplicity

**Benefit:** Multiple app servers and workers can scale independently, and a single app-server failure does not have to take down the entire application.

**Cost:** Multiple servers, caches, queues, replicas, and monitoring systems increase infrastructure costs and operational complexity.

**Decision:** Start with a simple, well-organized application and add capacity when measured traffic or performance indicates that it is necessary.

## Conclusion

SnapShare has approximately 1 million daily active users, 11.6 average photo uploads per second, 579 average feed views per second, and an estimated 748.25 TB of new photo and thumbnail storage per year.

The system is read-heavy, so caching, read replicas, and a CDN help serve feed requests efficiently. Object storage keeps large image files separate from database metadata, while a queue and worker handle thumbnail generation asynchronously.

This design separates the main responsibilities and supports horizontal scaling, while acknowledging the additional cost and complexity of distributed components.

