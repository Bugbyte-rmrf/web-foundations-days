TicketHub: Event Ticketing System Design

1. Context and Requirements

1.1 Context

TicketHub is an online ticketing platform that allows customers to browse events, view seat availability, reserve seats temporarily, purchase tickets, and access their confirmed tickets after payment.

The platform has approximately 2 million registered users and receives around 50,000 visitors per day. During a popular concert release, as many as 200,000 fans may attempt to purchase only 20,000 available seats within the first 10 minutes.

The main engineering challenge is handling sudden traffic spikes while ensuring that each seat is allocated to no more than one successful purchase.

The design therefore prioritizes correct seat allocation, reliable payment processing, fair access, security, and scalability.

1.2 Project Goals

The main goals of TicketHub are to:

Allow customers to browse events and view event details.

Display seat availability and ticket prices.

Allow customers to hold available seats temporarily.

Process purchases without double-booking seats.

Allow customers to view their confirmed tickets and order history.

Handle sudden traffic spikes during popular ticket releases.

Provide clear feedback when seats become unavailable or payments fail.

1.3 Functional Requirements

The system must support the following functions:

Customers can register, log in, and manage their accounts.

Customers can browse events and view their dates, venues, and prices.

Customers can view the seats available for a particular event.

Customers can reserve one or more available seats temporarily.

The system automatically expires abandoned holds.

Customers can create orders and pay through an external payment provider.

Customers receive ticket confirmation after successful payment.

Customers can view their purchased tickets and order history.

The system prevents duplicate orders, duplicate payment processing, and double-booking.

The system provides clear error messages when a seat is unavailable, a hold expires, or a payment fails.

1.4 Non-Functional Requirements

Performance

Ordinary event browsing should target a response time below 200 milliseconds at the 95th percentile under normal load. Seat-hold requests should target a response time below 500 milliseconds at the 95th percentile under the planned peak load, excluding external payment-provider processing.

These targets must be verified through load testing.

Consistency and correctness

A seat must never be sold to more than one customer for the same event. Seat reservations and purchases must use database transactions and appropriate constraints. Retried requests and repeated payment callbacks must not create duplicate purchases or charges.

Availability and reliability

The initial service objective is 99.9% monthly availability. Multiple application instances, database backups, monitoring, and recovery procedures will help maintain service reliability.

Fairness

A virtual waiting room will control access during major ticket releases. Rate limits will reduce excessive requests, and customers will receive clear information about their queue position and reservation deadlines where supported.

Security

Customers must authenticate before placing holds, purchasing tickets, or accessing personal orders. Authorization checks must prevent users from viewing other customers' private information. TicketHub will use an external payment provider and will not store raw payment-card details.

Scalability

Application servers should scale horizontally. Event browsing should be separated from transactional seat allocation, and caching, queueing, and rate limiting should protect the database from sudden demand.

1.5 Non-Goals

The first version of TicketHub will not build its own payment-processing network, implement complex dynamic ticket pricing, or guarantee the elimination of all automated bots. It will focus on assigned seating, reliable purchases, and basic abuse prevention.

2. Traffic Estimates

2.1 Normal Traffic

TicketHub receives approximately 50,000 visitors per day. Assuming each visitor views 10 pages, the platform handles:

Daily page views: 50,000 × 10 = 500,000.

Average page requests per second: 500,000 ÷ 86,400 ≈ 5.8 requests per second.

Estimated normal peak: 5 × 5.8 ≈ 29 page requests per second.

Daily ticket sales: approximately 5,000.

Average ticket sales rate: 5,000 ÷ 86,400 ≈ 0.058 sales per second.

These figures are estimates. Actual traffic depends on browsing patterns, cached requests, and the distribution of visitors throughout the day.

Under normal conditions, event browsing generates substantially more requests than successful purchases. Caching public event information can reduce unnecessary database queries.

2.2 Popular Concert Sale

During a major concert release, 200,000 people may attempt to buy 20,000 seats within 10 minutes.

Ten minutes equals 600 seconds.

The estimated purchase-attempt rate is:

200,000 ÷ 600 ≈ 333 purchase attempts per second.

Assuming each buyer makes four API requests during the process, including browsing seats, requesting a hold, creating an order, and checking payment status:

200,000 × 4 = 800,000 API requests.

The average API request rate during the sale is:

800,000 ÷ 600 ≈ 1,333 requests per second.

If traffic temporarily reaches three times this average, the system could experience approximately 4,000 requests per second.

The seat supply also limits successful purchases. With 20,000 available seats and 200,000 interested buyers, there are approximately 10 potential buyers per seat. No more than 20,000 successful seat purchases can be completed for this sale.

2.3 Traffic Implications

The normal average of approximately 5.8 page requests per second is much lower than the estimated peak of approximately 4,000 requests per second.

The system must therefore handle both ordinary browsing and short periods of intense competition for seats.

Event details and other public information can be cached because many customers request the same information. Seat availability may also be cached for display purposes, but cached data must never authorize a reservation or purchase.

Seat holds and purchases must be checked against the authoritative database. A virtual waiting room and rate limiting will control how quickly requests reach the application and database.

These measures help protect the system during traffic surges while preserving correct seat allocation.

3. API Design

The API uses JSON for request and response bodies. Customers must authenticate before creating holds, purchasing tickets, cancelling their holds, or viewing personal tickets.

Requests that create holds, orders, or payments use idempotency keys. An idempotency key allows the system to recognize a repeated request and return the existing result rather than creating a duplicate operation.

3.1 Browse Events

Endpoint: GET /api/events?page=1&limit=20

This endpoint returns a paginated list of published events.

A successful request returns 200 OK.

Example response:

{
  "events": [
    {
      "id": "evt_101",
      "name": "Summer Music Festival",
      "venue": "Central Arena",
      "startsAt": "2027-06-15T18:00:00Z"
    }
  ],
  "page": 1,
  "limit": 20
}

Public event information can be cached to reduce database load.

3.2 View Event Details and Seat Availability

Endpoint: GET /api/events/{eventId}

This endpoint returns event details, including the name, venue, date, ticket prices, and sale status.

Endpoint: GET /api/events/{eventId}/seats

This endpoint returns the seats associated with the event and their displayed availability.

Example response:

{
  "eventId": "evt_101",
  "seats": [
    {
      "seatId": "seat_A12",
      "label": "A12",
      "status": "available",
      "price": 75.00,
      "currency": "USD"
    },
    {
      "seatId": "seat_A13",
      "label": "A13",
      "status": "held",
      "price": 75.00,
      "currency": "USD"
    }
  ]
}

A successful request returns 200 OK.

Displayed availability can become outdated immediately after a response. The backend must check the authoritative database again when a customer requests a hold.

3.3 Hold Seats

Endpoint: POST /api/events/{eventId}/holds

This authenticated endpoint temporarily reserves one or more available seats.

Example request:

{
  "seatIds": ["seat_A12", "seat_A13"],
  "idempotencyKey": "hold-request-123"
}

A successful request returns 201 Created.

Example response:

{
  "holdId": "hold_501",
  "seatIds": ["seat_A12", "seat_A13"],
  "status": "active",
  "expiresAt": "2027-06-15T17:05:00Z"
}

A hold lasts five minutes from creation unless the system explicitly applies a different policy.

The backend must reserve all requested seats in one database transaction. If any requested seat is unavailable, the transaction must fail without leaving a partial reservation.

Possible responses include:

201 Created: The hold was created successfully.

401 Unauthorized: The customer is not authenticated.

409 Conflict: One or more requested seats are already held or sold.

429 Too Many Requests: The customer has exceeded a rate limit.

Repeated requests with the same idempotency key must not create duplicate holds.

3.4 Cancel a Hold

Endpoint: DELETE /api/holds/{holdId}

This authenticated endpoint releases an active hold owned by the customer.

A successful request returns 204 No Content.

The backend checks ownership and the current state of the hold before releasing any seats. A cancellation request must not release seats that have already been sold or finalized.

3.5 Create an Order

Endpoint: POST /api/orders

This endpoint creates an order using a valid hold.

Example request:

{
  "holdId": "hold_501",
  "idempotencyKey": "order-request-789"
}

The backend verifies that the hold belongs to the customer, remains valid, and contains the requested seats. It then creates an order in the pending_payment state.

A successful request returns 201 Created.

Example response:

{
  "orderId": "ord_901",
  "status": "pending_payment",
  "amount": 150.00,
  "currency": "USD"
}

If the hold has expired or is no longer valid, the backend returns 409 Conflict.

The order creation request must be idempotent so that a network retry does not create another order for the same operation.

3.6 Process Payment

Endpoint: POST /api/orders/{orderId}/payment

This endpoint starts or checks payment processing through an external payment provider.

Example request:

{
  "paymentMethodToken": "provider-token-123",
  "idempotencyKey": "payment-request-456"
}

The payment token is supplied by the payment provider. TicketHub does not store raw card details.

Possible responses include:

200 OK: Payment has been confirmed.

202 Accepted: Payment is still processing.

402 Payment Required: Payment was declined.

409 Conflict: The order is no longer eligible for payment.

The backend must verify payment-provider notifications before marking an order as paid. Duplicate callbacks must not create duplicate tickets.

3.7 View My Tickets

Endpoint: GET /api/me/tickets

This authenticated endpoint returns tickets belonging to the current customer.

Example response:

{
  "tickets": [
    {
      "ticketId": "tkt_301",
      "eventId": "evt_101",
      "eventName": "Summer Music Festival",
      "seatLabel": "A12",
      "status": "valid"
    }
  ]
}

A successful request returns 200 OK.

The backend must verify ownership and return only tickets the authenticated customer is authorized to access.

3.8 API Error Handling

The API uses consistent error responses.

Example:

{
  "error": {
    "code": "SEAT_UNAVAILABLE",
    "message": "One or more selected seats are no longer available."
  }
}

Common HTTP status codes include:

200 OK: A request succeeded.

201 Created: A new resource was created.

202 Accepted: An operation is still processing.

204 No Content: An operation succeeded without a response body.

401 Unauthorized: Authentication is missing or invalid.

403 Forbidden: The customer lacks permission.

404 Not Found: The requested resource does not exist.

409 Conflict: A seat, hold, or order conflicts with its current state.

429 Too Many Requests: A rate limit was exceeded.

500 Internal Server Error: An unexpected server error occurred.

4. Data Model and Database Schema

TicketHub uses PostgreSQL as its authoritative relational database. The database stores customers, events, physical seats, event-specific seat inventory, holds, orders, and purchased order items.

The schema separates physical seat information from seat availability for a particular event. This prevents confusion between a seat's identity and its reservation status.

4.1 Users Table

The users table stores information about registered customers.

It contains the following fields:

user_id: UUID primary key that uniquely identifies each customer.

name: The customer's display name.

email: The customer's email address, which must be unique.

password_hash: A securely generated password hash rather than a plain-text password.

created_at: The date and time the account was created.

One customer can create multiple holds and orders. Foreign keys connect customer records to their related records.

4.2 Events Table

The events table stores information about events available on TicketHub.

It contains:

event_id: UUID primary key identifying the event.

name: The event name.

venue: The venue where the event takes place.

starts_at: The scheduled event date and time.

status: The publication or sale status, such as draft, published, or cancelled.

One event can have many physical seats and many event-specific inventory records.

4.3 Seats Table

The seats table describes physical seats at a venue.

It contains:

seat_id: UUID primary key identifying the physical seat.

venue: The venue identifier or venue name.

seat_label: A label such as A12 or B07.

section: The seating section.

A unique constraint on (venue, seat_label) prevents duplicate seat labels within the same venue.

This table does not determine whether a seat is available for purchase. Availability belongs in the event_seats table because the same physical seat can be associated with different events.

4.4 Event Seats Table

The event_seats table stores the inventory state of each physical seat for a particular event. It is the authoritative source for whether a seat is available, held, or sold.

It contains:

event_id: Foreign key referencing the events table.

seat_id: Foreign key referencing the seats table.

price: The ticket price for that seat at that event.

status: The current inventory state, such as available, held, or sold.

hold_id: The identifier of the active hold, when applicable.

hold_expires_at: The expiration time of the active hold, when applicable.

The combination of event_id and seat_id forms the composite primary key. This ensures that only one inventory record exists for a given seat at a particular event.

The status field determines whether the seat can be held or sold. Updates to this field must occur inside database transactions.

4.5 Holds Table

The holds table records temporary reservations created by customers.

It contains:

hold_id: UUID primary key identifying the hold.

user_id: Foreign key referencing the customer who created it.

event_id: Foreign key referencing the event.

status: The hold state, such as active, expired, cancelled, or converted.

expires_at: The time when the hold expires.

idempotency_key: A key used to recognize repeated hold-creation requests.

created_at: The date and time the hold was created.

A hold can cover several seats. The corresponding event_seats records reference the same hold identifier.

The hold record and the associated inventory updates must be created or changed consistently within database transactions.

4.6 Orders Table

The orders table records customers' purchase attempts.

It contains:

order_id: UUID primary key identifying the order.

user_id: Foreign key referencing the customer.

hold_id: Foreign key referencing the hold used for the purchase.

total: The total amount payable.

status: The order state, such as pending payment, paid, failed, or cancelled.

idempotency_key: A key that prevents repeated requests from creating duplicate orders.

created_at: The date and time the order was created.

An order begins in the pending_payment state. It becomes paid only after TicketHub verifies successful payment with the payment provider.

The system must not issue tickets simply because an order was created.

4.7 Order Items Table

The order_items table connects an order to the specific seats included in the purchase.

It contains:

order_item_id: UUID primary key identifying the order item.

order_id: Foreign key referencing the orders table.

event_id: The event associated with the purchased seat.

seat_id: The physical seat being purchased.

price: The price recorded for the seat at the time of the order.

The pair (event_id, seat_id) must be unique among successful purchases. This prevents the same seat for the same event from being allocated to two paid orders.

The database should enforce this rule through an appropriate unique constraint or a dedicated inventory-allocation constraint. The application must also use transactions to keep inventory and order state consistent.

4.8 Relationships Between Tables

The database relationships work as follows:

One user can create multiple holds and orders.

One event can have many event-seat inventory records.

One physical seat can appear in the inventory of different events.

One hold can temporarily reserve multiple event seats.

One order can contain multiple order items.

Each order item identifies the seat and event included in the order.

Foreign keys preserve valid relationships between records. Primary keys identify records uniquely, while unique constraints protect the system from duplicate accounts and duplicate seat allocations.

4.9 Indexes and Constraints

The database uses primary keys and foreign keys to preserve record identity and relationships.

Additional constraints and indexes include:

A unique constraint on the customer email address.

A unique constraint on (venue, seat_label) in the seats table.

A composite primary key on (event_id, seat_id) in event_seats.

An index on event_seats(event_id, status) to support availability queries.

An index on event_seats(hold_expires_at) to help locate expired holds.

An index on orders(user_id, created_at) to support customer order history.

A uniqueness rule preventing the same event-seat combination from appearing in more than one successful purchase.

The database is the final authority for seat allocation. Application-level checks alone are insufficient because concurrent requests can observe the same initial state.

5. Preventing Double-Booking

5.1 The Concurrency Problem

Double-booking occurs when two customers attempt to reserve or purchase the same seat at nearly the same time.

For example, Alice and Brian may both see seat A12 displayed as available. If the application only checks availability before updating the database, both requests might pass the check before either one changes the seat's status.

TicketHub prevents this race condition by combining PostgreSQL transactions, row-level locking, conditional state changes, and database constraints.

5.2 Seat-Hold Strategy

When a customer requests one or more seats, the application begins a database transaction.

It locks the relevant event_seats records using SELECT ... FOR UPDATE. This prevents another transaction from simultaneously changing the same inventory records without waiting.

The application then checks each seat's status and hold expiration time using the database's current time.

If every requested seat is available, or has an expired hold that can safely be replaced, the application changes the seats to held, associates them with the new hold, and sets the expiration time.

The hold record and all inventory changes are committed together.

If even one requested seat is unavailable, the application rolls back the entire transaction and returns 409 Conflict. This prevents a customer from receiving only part of a multi-seat reservation.

When locking multiple seats, the application should lock them in a consistent order to reduce the risk of deadlocks.

5.3 Example SQL Transaction

The following example illustrates how TicketHub can lock and reserve two seats for one event.

BEGIN;

SELECT event_id, seat_id, status, hold_expires_at
FROM event_seats
WHERE event_id = 'event-101'
  AND seat_id IN ('seat-A12', 'seat-A13')
ORDER BY seat_id
FOR UPDATE;

-- The application verifies that both requested seats exist
-- and are available or have safely expired holds.
-- If either seat is unavailable, it rolls back the transaction.

UPDATE event_seats
SET status = 'held',
    hold_id = 'hold-501',
    hold_expires_at = NOW() + INTERVAL '5 minutes'
WHERE event_id = 'event-101'
  AND seat_id IN ('seat-A12', 'seat-A13');

-- Create the corresponding holds record in the same transaction.
-- Commit only after all validation and updates succeed.

COMMIT;

This is illustrative SQL rather than a complete production-ready implementation. In production, the application must verify that the expected number of rows was locked and updated, validate ownership and hold expiration, and roll back on any failure. The hold record must also be created within the transaction.

The database schema and SQL parameter types must use consistent identifiers in the actual implementation.

5.4 Why Row-Level Locking Works

Suppose Alice and Brian both request seat A12.

First, Alice's transaction locks the corresponding event_seats row. She checks the current state, sees that the seat is available, and changes its status to held.

Brian's transaction must wait until Alice's transaction finishes. After Alice commits, Brian can proceed and sees the updated seat state. Because the seat is now held, Brian's request fails with 409 Conflict.

The same protection works even when the two requests reach different application servers, because both servers use the same authoritative database.

5.5 Expired Holds

A background worker periodically identifies expired holds and releases the associated seats when they are still held by that reservation.

The worker must verify the current hold identifier, status, and expiration time before changing a seat back to available.

It must never blindly mark a seat as available, because the seat might already have been sold or associated with a newer hold.

The hold endpoint also checks expiration directly. Correctness therefore does not depend on the background worker running at exactly the right time.

5.6 Completing Payment Safely

Seat reservation and payment processing are separate operations.

After a successful hold, TicketHub creates a pending order and initiates payment through an external provider.

Once payment has been verified, the system uses a new database transaction to update the order, mark the corresponding inventory as sold, and create the purchased order items.

The system must ensure that these changes remain consistent. It must also process payment-provider callbacks idempotently because the same callback may be delivered more than once.

If a payment succeeds externally but TicketHub fails before recording the result, a reconciliation process checks the provider's transaction status and safely completes the order.

The system must not blindly release or resell a seat while its payment outcome is uncertain.

The combination of row-level locking, database constraints, idempotency, and payment reconciliation prevents double-booking and reduces duplicate charges.

6. Architecture

6.1 High-Level Architecture

TicketHub uses a layered architecture that separates public browsing, traffic control, application processing, database transactions, payment processing, and background tasks.

Customers access the platform through a browser or mobile application. A content delivery network and web application firewall handle static assets and filter abusive traffic.

During major ticket releases, a virtual waiting room controls the rate at which customers enter the application. A load balancer distributes admitted requests across multiple stateless application servers.

The application servers handle authentication, event browsing, seat holds, order creation, payment integration, and ticket retrieval.

Redis can cache public event information and other suitable read-heavy data. PostgreSQL remains the authoritative database for holds, inventory changes, orders, and purchases.

A payment provider processes payments externally. Background workers handle tasks such as hold expiration, payment reconciliation, and ticket delivery. Monitoring and alerts track the health and performance of the system.

6.2 Architecture Components

Content Delivery Network and Web Application Firewall

The CDN serves static resources efficiently, while the WAF helps filter malicious or abusive traffic.

Virtual Waiting Room

The waiting room controls admission during high-demand ticket releases. It helps prevent sudden surges from overwhelming the application and database.

Load Balancer and API Gateway

These components distribute incoming requests across application instances and provide a central point for routing, rate limiting, and request controls.

Application Servers

Stateless application servers handle business logic and can scale horizontally as demand increases.

Redis Cache

Redis stores suitable cached information, such as public event details. Cached seat availability is only for display and must never be treated as final authorization to purchase a seat.

PostgreSQL Primary Database

The primary database handles authoritative seat holds, inventory changes, orders, and transactional updates. Row-level locks and constraints protect concurrent seat allocation.

Read Replicas

Read replicas can serve suitable browsing and search queries. Because replication may be delayed, they must not determine whether a seat can be reserved or purchased.

Payment Provider

The external provider processes payments and sends confirmation notifications. TicketHub verifies these notifications before finalizing orders.

Background Workers

Workers process expired holds, payment reconciliation, ticket generation, and email delivery without making customers wait for every background task to finish.

Monitoring and Alerts

Monitoring tracks request latency, database contention, queue length, payment failures, error rates, and availability.

6.3 Architecture Diagram

flowchart TD
    A[Browser or Mobile App] --> B[CDN and WAF]
    B --> C[Virtual Waiting Room and Rate Limits]
    C --> D[Load Balancer and API Gateway]
    D --> E[Stateless Application Servers]

    E --> F[Redis Cache]
    E --> G[(PostgreSQL Primary)]
    G --> H[(Read Replicas)]

    E --> I[External Payment Provider]
    E --> J[Background Workers]
    J --> G
    J --> K[Email and Ticket Delivery]

    G --> L[Monitoring and Alerts]
    E --> L
    J --> L

The waiting room limits traffic reaching the application, while the cache reduces unnecessary database reads.

All seat holds and purchases are checked against the PostgreSQL primary. This ensures that application instances share a single authoritative view of seat allocation.

Background workers perform tasks that can be processed asynchronously, while monitoring helps operators identify bottlenecks and failures during major ticket releases.

6.4 Scaling Strategy

TicketHub scales application servers horizontally to handle additional requests. Caching reduces repeated queries for public event information, and read replicas support suitable read-heavy operations.

During major sales, the waiting room controls admission based on observed backend capacity. Rate limiting reduces excessive retries, while monitoring helps identify database contention and adjust the admission rate.

Seat allocation remains transactional. Adding more application servers does not eliminate competition for the same seat, so database locking and constraints remain essential.

7. Trade-Offs and Alternatives

7.1 Strong Consistency Versus Higher Throughput

Decision: Use PostgreSQL transactions, row-level locks, and database constraints for seat allocation.

Benefit: The database makes authoritative decisions and prevents two customers from successfully purchasing the same seat.

Cost: Requests competing for the same seat may need to wait. Heavy contention can increase database latency.

Alternative: Use a distributed seat-allocation service or partition inventory across multiple systems. These approaches may improve throughput but add complexity and require careful coordination.

Reason for the decision: Correct seat allocation is more important than accepting every request immediately.

7.2 Waiting Room Versus Immediate Access

Decision: Use a virtual waiting room and controlled admission during major ticket releases.

Benefit: The waiting room smooths traffic spikes and protects the application and database from overload.

Cost: Customers may wait before entering the system, and the queue adds another component that must remain reliable.

Alternative: Allow all requests to enter immediately and rely on autoscaling. This is simpler for smaller events but may overwhelm the database before additional capacity becomes available.

Reason for the decision: Controlled admission provides a more predictable purchasing experience during major sales.

7.3 Cache Performance Versus Freshness

Decision: Cache public event information and use read replicas for appropriate read-only queries.

Benefit: Browsing requests can often be served without reaching the primary database, reducing load and improving response time.

Cost: Cached information and replicas may be stale. Customers may briefly see a seat displayed as available when it has already been held.

Alternative: Send every read directly to the primary database. This provides fresher information but increases load during peak traffic.

Reason for the decision: Slightly outdated display information is acceptable as long as every hold and purchase is validated against the authoritative database.

7.4 Short Holds Versus Payment Delays

Decision: Begin with five-minute holds, background expiration, and payment reconciliation.

Benefit: Customers cannot reserve seats indefinitely while abandoning the checkout process.

Cost: A payment may take longer than expected, creating a risk that a hold expires while payment is still processing.

Alternative: Use longer holds or introduce a payment-in-progress state with a controlled extension policy. This can reduce failed purchases but may block seats for longer periods.

Reason for the decision: A short initial hold duration balances customer convenience and seat availability. The policy should be adjusted using observed payment completion times and operational data.

7.5 Database Contention Versus Simplicity

Decision: Use a single authoritative PostgreSQL primary for transactional seat allocation in the initial design.

Benefit: This simplifies consistency, transactions, and operational reasoning.

Cost: The primary database can become a bottleneck when many customers compete for a small number of seats.

Alternative: Partition inventory or introduce specialized allocation services after measuring the actual bottlenecks.

Reason for the decision: The initial design prioritizes correctness and simplicity. Load testing should determine whether a more complex allocation architecture is justified.

7.6 Risks and Open Questions

Several questions require further investigation:

What is the maximum acceptable waiting time during a major sale?

How many concurrent seat-hold transactions can the database sustain?

How should the system handle payments that succeed after a hold expires?

What rules should govern queue ordering, bot detection, and purchase limits?

What recovery time and data-loss objectives should apply to database failures?

How much geographic redundancy is justified by the availability target?

These questions should be addressed through load testing, concurrency tests, payment-provider integration tests, and operational experience.

Conclusion

TicketHub must handle ordinary browsing traffic efficiently while protecting seat allocation during sudden bursts of demand.

The design separates read-heavy event browsing from transactional seat allocation, uses a waiting room to control peak traffic, and relies on PostgreSQL transactions, row-level locks, and database constraints to prevent double-booking.

The API defines how customers browse events, hold seats, create orders, process payments, and retrieve tickets. The relational schema establishes the relationships between users, events, seats, holds, orders, and purchased items.

Caching, horizontal application scaling, background workers, idempotent requests, payment reconciliation, and monitoring support reliability and performance.

The main design principle is that the system may delay or reject a competing request, but it must never confirm two successful purchases for the same seat at the same event.


