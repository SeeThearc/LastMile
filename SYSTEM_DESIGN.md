# LastMile ? System Design Write-Up

**Word count: ~750 words**

---

## Overview

LastMile is a last-mile delivery management system with three actors ? Customer, Agent, and Admin ? operating over a shared PostgreSQL database through a RESTful Express API. Every core engineering decision prioritises correctness, auditability, and operational simplicity.

---

## 1. Rate Calculation Engine

The rate engine is a pure function (`calculatePrice` in `utils.ts`) that accepts package dimensions, actual weight, pickup area, drop area, order type (B2B/B2C), and payment type (PREPAID/COD). It returns a full pricing breakdown.

**Volumetric Weight:**
```
volumetricWeight = (L ? B ? H) / 5000
```
This is the standard courier industry divisor. Billable weight is then:
```
billableWeight = max(actualWeight, volumetricWeight)
```
Whichever is heavier is billed ? this prevents customers from shipping large, light packages at an unfair rate.

**Rate Card Lookup:**
The engine resolves the pickup area to a Zone (see Zone Detection below) and queries the `RateCard` table using a composite unique key: `(zoneId, orderType, isIntraZone)`. This means each zone maintains up to four distinct rate cards: B2B intra-zone, B2B inter-zone, B2C intra-zone, B2C inter-zone. B2B typically commands a higher rate due to bulk volumes requiring commercial handling.

**COD Surcharge:**
When `paymentType = COD`, the engine adds `rateCard.codSurcharge` to the base charge. This surcharge is configurable per zone and covers cash collection risk and remittance cost.

**Final Formula:**
```
baseCharge   = billableWeight ? ratePerKg
codSurcharge = (COD) ? rateCard.codSurcharge : 0
totalCharge  = baseCharge + codSurcharge
```

All six computed values (`volumetricWeight`, `billableWeight`, `ratePerKg`, `baseCharge`, `codSurcharge`, `totalCharge`) are stored on the Order row at creation time and never recalculated ? ensuring billing is frozen even if rate cards are subsequently updated.

---

## 2. Zone Detection Approach

Zones are geographic groupings. Every serviceable area is stored in the `Area` table with an optional pincode and a foreign key to its `Zone`. Zone detection runs as:

1. Query `Area` WHERE `name ILIKE :input` OR `pincode = :input`
2. Return the related `Zone`
3. If no match ? throw "Area not serviceable" (order creation fails fast with a 400)

The intra-zone flag is derived by comparing zone IDs:
```
isIntraZone = (pickupZone.id === dropZone.id)
```

This single boolean drives the entire rate card branch. Inter-zone ETAs are stored in `ZoneETA` (fromZoneId, toZoneId, etaMinutes), set by the admin, and attached to the order as `estimatedDeliveryAt` at creation time.

---

## 3. Auto-Assignment Logic

When an admin triggers auto-assign for an order, the engine executes in two passes:

**Pass 1 ? Zone-affinity:**
Find all agents where:
- `role = AGENT`
- `availability = AVAILABLE`
- `currentZoneId = order.pickupZoneId`

Zone-local agents are preferred because they are geographically closest to the pickup address, reducing both travel time and fuel cost.

**Pass 2 ? Fallback (any zone):**
If no agents are AVAILABLE in the pickup zone, relax the zone constraint and fetch all AVAILABLE agents system-wide.

**Workload Balancing:**
Both passes include a JOIN to count each agent's currently active orders (`status IN [ASSIGNED, PICKED_UP, IN_TRANSIT, OUT_FOR_DELIVERY]`). Candidates are sorted ascending by this count ? the agent with the lightest current workload is selected. This prevents any single agent from being overloaded while others are idle.

The selected agent is set to BUSY and the order status transitions to ASSIGNED ? both inside a single `prisma.$transaction` to guarantee atomicity. A `TrackingEvent` is simultaneously written recording the assignment.

---

## 4. Order Status Lifecycle & Immutable Tracking

Every order follows a strict Finite State Machine (FSM):

```
CREATED ? ASSIGNED ? PICKED_UP ? IN_TRANSIT ? OUT_FOR_DELIVERY ? DELIVERED
                                                              ? FAILED ? RESCHEDULED
```

Transitions are enforced in the `/agents/orders/:id/status` endpoint via a `validTransitions` map. Any attempt to jump states (e.g., CREATED ? DELIVERED) is rejected with a 400. This prevents data corruption from UI bugs or malicious requests.

**Immutable Audit Trail:**
Every valid transition writes one `TrackingEvent` row. This table is append-only ? no UPDATE or DELETE is ever performed on it. Each row records: `orderId`, `fromStatus`, `toStatus`, `actorId`, `actorRole`, `note`, and `createdAt`. The full event sequence gives a complete, tamper-proof delivery history.

---

## 5. Failed Delivery Handling

When an agent cannot complete a delivery, they mark the order FAILED. The API enforces that a non-empty `note` (reason) is provided ? marking FAILED without a reason is rejected. This ensures every failure is documented for customer support and SLA analysis.

On the customer dashboard, FAILED orders surface a "Reschedule" card. The customer triggers `POST /orders/:id/reschedule`, which sets status to RESCHEDULED and records a new `scheduledAt` timestamp. The Admin can then re-assign the order through the standard assignment flow.

Agent availability is reset to AVAILABLE after DELIVERED or FAILED, freeing capacity for the next assignment cycle.

---

## 6. Database & API Design Notes

- **Idempotency:** Orders carry an optional `idempotencyKey` (unique constraint) to prevent duplicate submissions on network retry.
- **Transactions:** All multi-table writes (order + tracking event + agent state) use `prisma.$transaction` ensuring full atomicity.
- **Role-based Guards:** Middleware decodes the JWT and attaches `req.user`. Every route checks role before executing ? agents cannot access admin endpoints and vice versa.
- **Tracking IDs:** 10-digit random numeric IDs are generated with a collision check loop, giving 9 billion possible values ? sufficient for any realistic order volume.
