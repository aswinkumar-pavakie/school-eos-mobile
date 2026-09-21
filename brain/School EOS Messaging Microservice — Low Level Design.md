# SCHOOL EOS
## MESSAGING MICROSERVICE
### LOW LEVEL DESIGN (LLD)

**Document Type:** Low Level Design  
**Parent Design:** Messaging HLD  
**Architecture:** Independent Microservice  
**Security Classification:** Highly Sensitive  
**Status:** Production Implementation Baseline

---

# 1. LLD Objective

This LLD defines the internal implementation of the Messaging Service.

It converts the HLD into:

- modules
- components
- data structures
- database schema
- constraints
- indexes
- authorization algorithms
- state transitions
- REST contracts
- WebSocket protocol
- Redis structures
- transaction boundaries
- idempotency
- E2EE integration boundary
- workers
- failure handling
- security controls
- test requirements

---

# 2. Technology Baseline

```text
Runtime:
Node.js

Framework:
NestJS

Database:
PostgreSQL

Realtime:
WebSocket / Socket.IO-compatible gateway

Cache/realtime coordination:
Redis

Async:
Transactional Outbox + Workers

Push:
FCM / APNs

Storage:
Private Object Storage

Observability:
Central logs + metrics + tracing

Authentication:
School EOS Identity
```

---

# 3. Service Modules

```text
src/
|
+-- auth/
|
+-- authorization/
|
+-- relationships/
|
+-- directory/
|
+-- conversations/
|
+-- requests/
|
+-- messages/
|
+-- delivery/
|
+-- read-state/
|
+-- presence/
|
+-- typing/
|
+-- devices/
|
+-- e2ee/
|
+-- attachments/
|
+-- notifications/
|
+-- websocket/
|
+-- outbox/
|
+-- audit/
|
+-- security/
|
+-- health/
|
+-- common/
|
+-- database/
```

---

# 4. Internal Request Pipeline

Every REST operation:

```text
Authentication
      |
Authorization
      |
Schema Validation
      |
Idempotency where applicable
      |
Relationship/Business Policy
      |
Transaction
      |
Audit/Security Event
      |
Outbox
      |
Response
```

WebSocket:

```text
Connection Authentication
      |
Session Validation
      |
Device Validation
      |
Protocol Validation
      |
Message-Level Authorization
      |
Business Policy
      |
Idempotency
      |
Transaction
      |
Realtime Fan-out
```

---

# 5. Core Domain Entities

```text
MessagingUser
MessagingDevice
Conversation
ConversationMember
ConversationRequest
Message
MessageDelivery
MessageRead
E2EEDeviceKey
E2EEPreKey
Attachment
UserMessagingPolicy
OutboxEvent
SecurityEvent
```

---

# 6. Database Schema

## 6.1 conversations

```text
conversations
------------------------------
id UUID PK
conversation_type
status
created_by UUID
created_at TIMESTAMPTZ
updated_at TIMESTAMPTZ
version BIGINT
```

Constraints:

```text
conversation_type:
DIRECT

status:
ACTIVE
BLOCKED
CLOSED
```

For request conversations, lifecycle state is represented through request state and conversation state.

---

# 7. conversation_members

```text
conversation_members
------------------------------
conversation_id UUID FK
user_id UUID
membership_status
joined_at TIMESTAMPTZ
left_at TIMESTAMPTZ NULL
last_read_message_id UUID NULL
created_at TIMESTAMPTZ
```

Primary key:

```text
(conversation_id, user_id)
```

Index:

```text
(user_id, membership_status)
```

---

# 8. conversation_requests

```text
conversation_requests
------------------------------
id UUID PK
conversation_id UUID FK
requester_user_id UUID
recipient_user_id UUID
status
initial_message_id UUID NULL
created_at TIMESTAMPTZ
responded_at TIMESTAMPTZ NULL
expires_at TIMESTAMPTZ NULL
version BIGINT
```

Statuses:

```text
PENDING
ACCEPTED
DECLINED
CANCELLED
EXPIRED
```

Required uniqueness prevents duplicate active requests for the same relationship.

---

# 9. messages

```text
messages
------------------------------
id UUID PK
conversation_id UUID FK
sender_user_id UUID
client_message_id UUID
sequence_no BIGINT
ciphertext BYTEA / encrypted payload
encryption_version
encryption_header
created_at TIMESTAMPTZ
server_received_at TIMESTAMPTZ
deleted_at TIMESTAMPTZ NULL
```

Unique constraint:

```text
(sender_user_id, conversation_id, client_message_id)
```

This is the message idempotency key.

No plaintext message column exists.

---

# 10. Message Sequence

Each conversation has monotonically increasing server sequence numbers.

```text
1
2
3
4
...
```

The sequence is generated transactionally.

It provides:

- deterministic ordering
- synchronization
- pagination
- gap detection
- replay protection support

---

# 11. Message Delivery

```text
message_delivery
------------------------------
message_id UUID
recipient_user_id UUID
device_id UUID
delivered_at TIMESTAMPTZ NULL
delivery_status
```

Statuses:

```text
PENDING
DELIVERED
FAILED
```

---

# 12. Message Read State

```text
message_read_state
------------------------------
conversation_id UUID
user_id UUID
last_read_sequence BIGINT
updated_at TIMESTAMPTZ
```

Primary key:

```text
(conversation_id, user_id)
```

This is more efficient than inserting a row for every read event.

---

# 13. Devices

```text
messaging_devices
------------------------------
id UUID PK
user_id UUID
device_public_key
device_key_version
platform
app_version
registered_at
last_seen_at
revoked_at NULL
status
```

Statuses:

```text
ACTIVE
REVOKED
SUSPENDED
```

Index:

```text
(user_id, status)
```

---

# 14. E2EE Key Metadata

The service stores public cryptographic material only.

```text
e2ee_identity_keys
------------------------------
device_id UUID PK/FK
identity_public_key
algorithm
version
created_at
revoked_at
```

```text
e2ee_signed_prekeys
------------------------------
id UUID PK
device_id UUID
public_key
signature
version
created_at
expires_at
status
```

```text
e2ee_one_time_prekeys
------------------------------
id UUID PK
device_id UUID
public_key
consumed_at NULL
created_at
status
```

Private keys remain on trusted client devices.

---

# 15. Attachments

```text
attachments
------------------------------
id UUID PK
message_id UUID
storage_object_id
encrypted_metadata
size_bytes
media_type
sha256
scan_status
created_at
```

The storage object is private.

---

# 16. Outbox

```text
outbox_events
------------------------------
id UUID PK
aggregate_type
aggregate_id
event_type
payload
created_at
published_at NULL
attempt_count
next_attempt_at
status
last_error NULL
```

Statuses:

```text
PENDING
PROCESSING
PUBLISHED
FAILED
DEAD_LETTER
```

---

# 17. Security Events

```text
security_events
------------------------------
id UUID PK
event_type
actor_user_id NULL
device_id NULL
conversation_id NULL
ip_hash NULL
user_agent_hash NULL
correlation_id
metadata JSONB
created_at
```

Do not store plaintext message contents.

---

# 18. Directory Algorithm

Input:

```text
actor_user_id
search
cursor
limit
```

Process:

```text
1. Authenticate actor.
2. Verify Messaging capability.
3. Load current actor relationships.
4. Resolve scoped users.
5. Resolve remaining Messaging-enabled users.
6. Remove disabled/non-messaging users.
7. Remove unauthorized properties.
8. Sort scoped users first.
9. Apply search.
10. Apply cursor pagination.
11. Return policy metadata.
```

Output:

```text
user
displayName
role
designation
profilePhoto
scope
messagingMode
existingConversationState
```

---

# 19. Parent Relationship Algorithm

For each active child:

```text
child
 |
current academic year
 |
current grade/section
 |
+-- subject faculty
+-- class advisor
+-- class students
|      |
|      +-- active parents
|
+-- hostel assignment
       |
       +-- hostel warden
```

Union all results.

Remove duplicate users.

Exclude:

```text
Messaging-disabled users
Inactive users
Suspended users
```

---

# 20. Faculty Relationship Algorithm

```text
Faculty
 |
Current Academic Year
 |
Current active assignments
 |
For every assigned class:
 |
 +-- Students
 +-- Parents
 +-- Faculty relationships
```

Union and deduplicate.

Higher authorities remain request-based unless an explicit direct policy is configured.

---

# 21. Warden Relationship Algorithm

```text
Warden
 |
Current hostel assignment
 |
Students assigned to that hostel
 |
Active parents
```

Result:

```text
DIRECT
```

For Parent:

```text
Child currently in hostel?
    |
   YES
    |
Child's Warden
    |
DIRECT
```

---

# 22. Authorization Decision

The core function:

```text
authorizeMessaging(actor, target, action)
```

returns:

```text
ALLOW_DIRECT
REQUIRE_REQUEST
DENY
```

Inputs:

```text
actor
target
action
current academic state
current hostel state
current roles
current assignments
conversation state
request state
```

---

# 23. Authorization Rules

## Parent

```text
if target = current child's teaching faculty:
    ALLOW_DIRECT

if target = current child's Class Advisor:
    ALLOW_DIRECT

if target = parent of student in same current class:
    ALLOW_DIRECT

if target = current Hostel Warden
and child currently in hostel:
    ALLOW_DIRECT

otherwise:
    REQUIRE_REQUEST
```

---

# 24. Faculty

```text
if target is within faculty's current assigned-class relationship:
    ALLOW_DIRECT

if target is Principal:
    REQUIRE_REQUEST

if target is Vice Principal:
    REQUIRE_REQUEST

otherwise:
    evaluate configured messaging relationship policy
```

No unapproved broad Faculty→all-user permission is assumed.

---

# 25. Warden

```text
if target = parent of current hostel student:
    ALLOW_DIRECT

otherwise:
    evaluate configured policy
```

---

# 26. Principal / Vice Principal

```text
if target has Messaging capability:
    ALLOW_DIRECT
```

---

# 27. Disabled Roles

```text
if actor.messagingEnabled == false:
    DENY
```

Likewise:

```text
if target.messagingEnabled == false:
    target is not discoverable
```

---

# 28. Existing Conversation Rule

Selecting a user does not automatically create a conversation.

The service checks:

```text
Existing active conversation?
       |
      YES
       |
Open it

      NO
       |
Evaluate messagingMode
```

---

# 29. Direct Conversation Creation

For DIRECT:

```text
BEGIN TRANSACTION

create conversation
create members
create message if supplied
create delivery records
create outbox event

COMMIT
```

Conversation creation and first message must be idempotent.

---

# 30. Request Creation

```text
BEGIN TRANSACTION

authorize requester
resolve relationship
verify REQUEST_REQUIRED
verify no active conversation
verify no pending request
create conversation
create members
create request
create initial encrypted message
create outbox event

COMMIT
```

---

# 31. One-Message Request Rule

When request status is PENDING:

```text
if initial_message_id != NULL:
    reject additional message
```

Only recipient acceptance changes state to:

```text
ACTIVE
```

Then normal messaging becomes available.

This check is performed inside the transaction.

---

# 32. Race Condition Protection

Two simultaneous requests must not create two conversations.

Use database constraints plus transaction locking.

Conceptually:

```text
BEGIN
 |
lock relationship/conversation identity
 |
check existing conversation
 |
check pending request
 |
create
 |
COMMIT
```

Database uniqueness constraints remain the final protection.

---

# 33. Message Send Algorithm

```text
1. Authenticate connection.
2. Validate protocol message.
3. Resolve conversation.
4. Verify membership.
5. Verify conversation state.
6. Authorize sender.
7. Verify request state.
8. Verify client_message_id.
9. Verify replay/idempotency.
10. Allocate sequence number.
11. Persist ciphertext.
12. Persist delivery state.
13. Create outbox event.
14. Commit.
15. Publish realtime event.
16. Return acknowledgement.
```

---

# 34. Idempotency

Client sends:

```text
clientMessageId = UUID
```

If the same message is submitted twice:

```text
first -> persisted
second -> existing message returned
```

It must never create a duplicate message.

---

# 35. WebSocket Protocol

Connection:

```text
WSS /messaging/socket
```

Authentication establishes:

```text
userId
deviceId
sessionId
connectionId
```

---

# 36. Client → Server Events

```text
message.send
message.ack
conversation.read
typing.start
typing.stop
presence.subscribe
request.accept
request.decline
sync.request
ping
```

---

# 37. Server → Client Events

```text
message.new
message.accepted
message.delivered
message.read
conversation.updated
request.new
request.accepted
request.declined
typing.started
typing.stopped
presence.changed
sync.required
security.reauthentication
error
```

---

# 38. WebSocket Authorization

Every event is individually authorized.

Example:

```text
message.send
   |
conversation membership?
   |
conversation active?
   |
sender authorized?
   |
request state valid?
   |
idempotency valid?
   |
ALLOW
```

A connection alone never authorizes a message.

---

# 39. WebSocket Session Lifecycle

```text
CONNECT
 |
AUTHENTICATE
 |
REGISTER DEVICE
 |
ACTIVE
 |
HEARTBEAT
 |
PERIODIC SESSION REVALIDATION
 |
LOGOUT / REVOKE / EXPIRE
 |
CLOSE
```

Logout immediately invalidates active Messaging connections for the affected session/device.

---

# 40. Redis Keys

Illustrative key model:

```text
presence:user:{userId}

typing:{conversationId}:{userId}

ws:user:{userId}

ws:device:{deviceId}

ratelimit:user:{userId}:message

ratelimit:user:{userId}:request

ratelimit:device:{deviceId}:connection
```

All temporary keys require TTL.

---

# 41. Presence

Presence is ephemeral.

```text
ONLINE
OFFLINE
LAST_SEEN
```

Redis is used.

No continuous PostgreSQL writes are required.

---

# 42. Typing

Typing state:

```text
typing:{conversationId}:{userId}
```

with a short TTL.

No permanent database record.

---

# 43. Realtime Fan-Out

```text
Message committed
      |
Outbox / realtime publisher
      |
Redis Pub/Sub
      |
Target WebSocket node
      |
Recipient device
```

If recipient is offline:

```text
Database
 +
Outbox
 +
Push notification
```

---

# 44. Message Synchronization

Client maintains:

```text
lastReceivedSequence
```

On reconnect:

```text
sync.request
 |
conversation
 |
lastSequence
 |
server returns messages after sequence
```

The server returns encrypted messages.

The client decrypts locally.

---

# 45. Gap Detection

If client receives:

```text
100
101
103
```

then:

```text
102 missing
```

The client requests synchronization.

This protects against realtime packet loss.

---

# 46. E2EE Boundary

The Messaging Service receives:

```text
ciphertext
encryption metadata
ratchet/session metadata required by protocol
```

It does not receive:

```text
plaintext
private identity key
private ratchet key
private device key
```

---

# 47. E2EE Session

For a new device/session:

```text
Recipient device
 |
publish public identity/prekeys
 |
Sender fetches public bundle
 |
client establishes secure session
 |
message encryption
 |
ciphertext sent
```

The implementation must use a mature cryptographic library/protocol implementation.

No custom cryptographic algorithm is permitted.

---

# 48. Key Rotation

The system must support:

- device replacement
- device revocation
- signed pre-key rotation
- one-time pre-key replenishment
- identity-key changes
- protocol version migration

Key changes must be visible to the client security state.

---

# 49. Device Revocation

```text
Device revoked
 |
invalidate device
 |
invalidate sessions
 |
disconnect WebSocket
 |
stop future delivery
 |
client requires new registration
```

Historical encrypted messages remain governed by the E2EE client's key state and retention policy.

---

# 50. Attachment Flow

```text
Client
 |
request upload
 |
authorize conversation
 |
receive upload token
 |
upload to private object storage
 |
scan/validate
 |
create attachment metadata
 |
encrypt reference in message
```

The Messaging Service never trusts a client-supplied storage object as automatically authorized.

---

# 51. Push Notification

Outbox event:

```text
message.created
```

Worker:

```text
check recipient online?
 |
 +-- YES -> realtime only
 |
 +-- NO -> push notification
```

Push contains generic information only.

Example:

```text
"You have a new message"
```

not:

```text
actual message text
```

---

# 52. Error Model

Errors are categorized.

```text
AUTHENTICATION_REQUIRED
MESSAGING_DISABLED
ACCESS_DENIED
RECIPIENT_NOT_FOUND
CONVERSATION_NOT_FOUND
CONVERSATION_NOT_ACTIVE
REQUEST_REQUIRED
REQUEST_PENDING
REQUEST_ALREADY_SENT
REQUEST_NOT_ALLOWED
MESSAGE_LIMIT_REACHED
DUPLICATE_MESSAGE
DEVICE_REVOKED
KEY_INVALID
MESSAGE_TOO_LARGE
RATE_LIMITED
INVALID_PROTOCOL
```

Responses must not disclose unnecessary authorization information.

---

# 53. Anti-Enumeration

For unauthorized recipients, responses must avoid revealing sensitive distinctions where practical.

Directory search should only return users the actor is permitted to discover.

User IDs should be non-sequential opaque identifiers.

---

# 54. Pagination

Directory:

```text
cursor-based
```

Conversation list:

```text
cursor-based
```

Message history:

```text
sequence/cursor based
```

Offset pagination is avoided for large/high-churn message histories.

---

# 55. Database Index Strategy

Important indexes:

```text
conversations(updated_at)

conversation_members(user_id, membership_status)

messages(conversation_id, sequence_no)

messages(conversation_id, created_at)

messages(sender_user_id, conversation_id, client_message_id)

conversation_requests(recipient_user_id, status)

conversation_requests(requester_user_id, status)

messaging_devices(user_id, status)

outbox_events(status, next_attempt_at)

security_events(created_at, event_type)
```

Indexes must be validated against real query plans.

---

# 56. Transaction Boundaries

Message send:

```text
ONE DB TRANSACTION
```

contains:

```text
message
delivery
conversation update
outbox
```

Notification sending is outside the transaction.

Redis publishing is outside the authoritative database transaction.

---

# 57. Failure Handling

If PostgreSQL succeeds and Redis fails:

```text
Message remains persisted.
Outbox remains available.
Realtime publication retries.
```

If push fails:

```text
Message remains persisted.
Notification retries.
```

If recipient is offline:

```text
Message remains available for synchronization.
```

If Messaging Service instance crashes:

```text
Another instance accepts new WebSocket/API traffic.
```

---

# 58. Outbox Retry

Retry with bounded exponential backoff.

Example conceptual progression:

```text
Attempt 1
Attempt 2
Attempt 3
Attempt 4
...
```

After configured retry exhaustion:

```text
DEAD_LETTER
```

Dead-letter events require operational visibility.

---

# 59. Security Logging

Log:

```text
timestamp
event type
actor identifier
device identifier
conversation identifier where required
correlation ID
security result
sanitized metadata
```

Never log:

```text
plaintext message
E2EE private key
access token
refresh token
session secret
full sensitive payload
```

---

# 60. Security Monitoring

Alert on:

```text
Abnormal request creation rate
Abnormal directory search rate
Repeated authorization failures
WebSocket authentication failures
Device registration spikes
Device revocation spikes
Message flooding
Connection exhaustion
Attachment scanning failures
Repeated invalid E2EE payloads
Unusual geographic/device behavior where supported
```

---

# 61. Authorization Test Matrix

At minimum test:

```text
Parent -> own class faculty             ALLOW
Parent -> own class advisor             ALLOW
Parent -> same-class parent             ALLOW
Parent -> child's warden                ALLOW if hostel

Parent -> Principal                     REQUEST
Parent -> VP                            REQUEST
Parent -> unrelated faculty             REQUEST
Parent -> unrelated parent              REQUEST

Faculty -> assigned-class parent       ALLOW
Faculty -> assigned-class faculty      ALLOW
Faculty -> Principal                   REQUEST
Faculty -> VP                          REQUEST

Warden -> hostel student's parent      ALLOW

Principal -> messaging user             ALLOW
VP -> messaging user                    ALLOW

Admin -> Messaging                      DENY
Finance -> Messaging                    DENY
Driver -> Messaging                     DENY
Canteen -> Messaging                    DENY
```

---

# 62. Authorization Mutation Tests

Test that authorization changes immediately when:

```text
academic year changes
student changes section
faculty assignment changes
class advisor changes
parent relationship changes
hostel assignment changes
warden assignment changes
user is disabled
role changes
Messaging capability changes
device is revoked
```

---

# 63. Critical Security Tests

Test:

```text
Unauthenticated WebSocket
Expired session
Revoked session
Revoked device
Forged recipient ID
Forged conversation ID
Forged scope
Forged role
Replay message
Duplicate message
Concurrent requests
Concurrent first messages
Unauthorized attachment
Oversized message
Message flooding
Connection flooding
Directory scraping
Cross-conversation access
Cross-user read-state manipulation
```

---

# 64. Load Tests

At minimum test:

```text
1,500 active users
Concurrent WebSocket connections
Burst messaging
Reconnect storm
Push burst
Directory search burst
Conversation synchronization
Message-history pagination
Redis node failure
Messaging instance failure
Database connection saturation
Outbox backlog
```

Then test above expected production capacity to establish headroom.

---

# 65. Horizontal Scaling

Messaging instances are stateless.

Therefore:

```text
Instance 1
Instance 2
Instance 3
...
```

can be added or removed.

State is externalized to:

```text
PostgreSQL
Redis
Object Storage
```

WebSocket connections are distributed by load balancing, with Redis providing cross-instance coordination.

---

# 66. Database Scaling

Initial architecture:

```text
Primary PostgreSQL
```

As scale increases:

```text
Primary
 |
+-- Read replicas
```

Read-heavy operations such as historical message retrieval and directory projections may later use read replicas where consistency requirements permit.

Writes remain authoritative on primary.

---

# 67. Directory Scaling

Directory generation should not repeatedly perform expensive joins across the entire School EOS database.

Preferred model:

```text
Core School EOS
       |
Domain events
       |
Messaging relationship projection
       |
Messaging DB/read model
```

The projection is rebuilt when necessary.

Authorization remains based on authoritative/current relationship data.

---

# 68. Relationship Projection

Potential projection:

```text
messaging_relationships
------------------------------
actor_user_id
target_user_id
relationship_type
scope
source_version
academic_year_id
effective_from
effective_to
updated_at
```

Examples:

```text
PARENT_CLASS_FACULTY
PARENT_CLASS_PARENT
PARENT_CLASS_ADVISOR
PARENT_HOSTEL_WARDEN
FACULTY_CLASS_PARENT
FACULTY_CLASS_FACULTY
WARDEN_HOSTEL_PARENT
```

This is a performance optimization/read model, not an excuse to trust stale authorization data.

---

# 69. Authorization Freshness

When critical relationships change:

```text
Core School EOS
 |
domain event
 |
Messaging
 |
invalidate/update relationship projection
```

Examples:

```text
StudentSectionChanged
FacultyAssignmentChanged
ClassAdvisorChanged
HostelAssignmentChanged
ParentRelationshipChanged
UserRoleChanged
MessagingCapabilityChanged
```

---

# 70. Stale Projection Protection

For sensitive operations, Messaging must have a strategy to prevent stale relationship data from granting unauthorized access.

The architecture should define:

```text
projection version
+
effective dates
+
event ordering
+
fallback authoritative validation for sensitive transitions
```

The implementation must prefer denying access over granting access when relationship state is uncertain.

---

# 71. Security Default

Every ambiguity defaults to:

```text
DENY
```

Examples:

```text
unknown role
unknown relationship
stale authorization
invalid device
invalid key
unknown conversation
invalid request state
```

No fallback to permissive behavior.

---

# 72. API Surface

Representative REST endpoints:

```text
GET  /v1/messaging/discovery
GET  /v1/messaging/conversations
POST /v1/messaging/conversations
GET  /v1/messaging/conversations/:id
GET  /v1/messaging/conversations/:id/messages

POST /v1/messaging/requests
GET  /v1/messaging/requests
POST /v1/messaging/requests/:id/accept
POST /v1/messaging/requests/:id/decline

POST /v1/messaging/conversations/:id/read

POST /v1/messaging/devices
POST /v1/messaging/devices/:id/revoke

GET  /v1/messaging/keys/:userId
POST /v1/messaging/keys/prekeys

POST /v1/messaging/attachments/init
```

The final API contract should be maintained as a separate API specification.

---

# 73. Discovery Response

Conceptual:

```json
{
  "items": [
    {
      "userId": "opaque-id",
      "displayName": "Faculty Name",
      "role": "FACULTY",
      "designation": "Mathematics",
      "profilePhoto": "...",
      "scope": "SCOPED",
      "messagingMode": "DIRECT"
    },
    {
      "userId": "opaque-id",
      "displayName": "Principal Name",
      "role": "PRINCIPAL",
      "profilePhoto": "...",
      "scope": "UNSCOPED",
      "messagingMode": "REQUEST"
    }
  ],
  "nextCursor": "..."
}
```

No unnecessary personal information is returned.

---

# 74. Conversation Creation Response

```json
{
  "conversationId": "opaque-id",
  "state": "ACTIVE",
  "messagingMode": "DIRECT"
}
```

For a request:

```json
{
  "conversationId": "opaque-id",
  "state": "PENDING",
  "messagingMode": "REQUEST"
}
```

---

# 75. Message Acknowledgement

```json
{
  "clientMessageId": "uuid",
  "messageId": "uuid",
  "conversationId": "uuid",
  "sequence": 42,
  "status": "ACCEPTED"
}
```

No plaintext message content is required in the acknowledgement.

---

# 76. API Security Requirements

Every endpoint must define:

```text
authentication requirement
authorization requirement
resource ownership
request schema
response schema
rate limit
idempotency requirement
audit event
error behavior
```

No undocumented endpoint is permitted in production.

---

# 77. Configuration Security

Secrets are never stored in source code.

Examples:

```text
Database credentials
Redis credentials
FCM credentials
APNs credentials
Object storage credentials
KMS configuration
service credentials
```

are managed through secure secret management.

---

# 78. Service-to-Service Security

Messaging-to-Core communication must use authenticated service-to-service communication.

The Messaging Service receives only the permissions necessary for its functions.

No broad database credentials to the Core School EOS database are provided.

---

# 79. Core Database Boundary

Messaging must not execute:

```text
SELECT * FROM core.users
```

directly against the core database as its normal integration mechanism.

Use:

```text
Core APIs
+
Domain Events
+
Authorized projections
```

This maintains bounded-context ownership.

---

# 80. Production Security Gates

Messaging cannot be production-released until:

```text
Authorization tests PASS
E2EE tests PASS
WebSocket security tests PASS
Rate-limit tests PASS
Replay tests PASS
Device-revocation tests PASS
Directory-enumeration tests PASS
Attachment security tests PASS
Load tests PASS
Failure tests PASS
Backup/restore test PASS
Penetration test PASS
Dependency/security scan PASS
```

---

# 81. Definition of Done

The Messaging Service is considered complete only when:

```text
[ ] Independent deployment
[ ] Independent scaling
[ ] Central authentication
[ ] Server-side authorization
[ ] Relationship engine
[ ] Parent scope
[ ] Faculty scope
[ ] Warden scope
[ ] Principal direct messaging
[ ] VP direct messaging
[ ] Request workflow
[ ] One-message request restriction
[ ] Conversation lifecycle
[ ] Empty initial state
[ ] Scoped-first directory
[ ] Search
[ ] E2EE
[ ] Device management
[ ] WSS
[ ] PostgreSQL source of truth
[ ] Redis realtime state
[ ] Outbox
[ ] Push notification
[ ] Offline synchronization
[ ] Delivery/read state
[ ] Presence
[ ] Typing
[ ] Attachments
[ ] Rate limiting
[ ] Abuse prevention
[ ] Audit
[ ] Monitoring
[ ] Backup/restore
[ ] Security testing
[ ] Load testing
[ ] Failure testing
[ ] Penetration testing
```

---

# 82. Final LLD Principle

The most important implementation rule is:

```text
NEVER TRUST THE MOBILE CLIENT
```

The mobile client may request:

```text
"Send message to user X"
```

but the server independently determines:

```text
Who am I?
Who is X?
Are both Messaging-enabled?
Can I discover X?
What is our current relationship?
Is direct messaging permitted?
Is a request required?
Is the request accepted?
Is the conversation active?
Is this device valid?
Is this message unique?
Is this request within limits?
```

Only after all checks succeed is the encrypted message committed.

---

# 83. Final Architecture

```text
                         SCHOOL EOS
                              |
                    CENTRAL IDENTITY
                              |
                +-------------+-------------+
                |                           |
          CORE SCHOOL SERVICES        MESSAGING SERVICE
                                            |
       +----------------+-------------------+----------------+
       |                |                   |                |
 Authorization     Relationship        Conversation      WebSocket
   Adapter            Engine             Engine            Gateway
       |                |                   |                |
       +----------------+-------------------+----------------+
                                            |
                              +-------------+-------------+
                              |                           |
                         PostgreSQL                     Redis
                         ciphertext DB              realtime state
                              |
                           Outbox
                              |
                         Worker Pool
                    +---------+---------+
                    |         |         |
                   Push    Events   Storage
                    |
                 FCM/APNs
```

**The final security boundary is:**

```text
Client plaintext
      ↓
CLIENT E2EE
      ↓
Ciphertext
      ↓
WSS
      ↓
Messaging Service
      ↓
Authorization
      ↓
PostgreSQL
      ↓
Ciphertext at rest
```

**The final authorization boundary is:**

```text
School EOS authoritative relationships
                ↓
       Messaging Relationship Engine
                ↓
      DIRECT / REQUEST / DENY
                ↓
       Conversation State
                ↓
       Message Authorization
```

**This is the baseline I would use for implementation.**