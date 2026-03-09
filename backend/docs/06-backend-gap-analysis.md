# 06 Backend Gap Analysis

Date: 2026-03-09

## Scope
Backend modules, routes, DTOs, Prisma schema, and existing service logic were reviewed to identify missing or incomplete backend support for current frontend flows. No frontend files were modified.

## Gaps Identified
- **Distributed caching**: only in-memory caching existed, no Redis/distributed cache support.
- **Observability**: no Prometheus metrics endpoint; no HTTP/DB timing metrics, cache hit/miss tracking, or job processing metrics.
- **Auditability**: no persistent audit/event log table or API for admin review.
- **User activity tracking**: no centralized tracking for write actions beyond request logs.
- **ExpressMart backend**: missing ExpressMart-specific endpoints and channel filtering for seller ops flows.
- **Order lifecycle metadata**: no place to store ExpressMart order detail fields; order status enum missing relevant states.
- **Notifications persistence**: notifications were stored only in AppRecords, not in first-class tables.
- **High-traffic indexes**: missing indexes for marketplace/channel filters and review insight filters.
- **Cache stampede protection**: no coalescing/locking across instances.
- **Queue usage**: background job worker existed but only placeholder processing; no queue-backed audit or insight refresh usage.

## Notes
- Many modules already use Prisma for primary flows (orders, listings, reviews, campaigns, proposals, tasks, transactions).
- Some flows still fall back to `AppRecords` when domain tables are empty or unavailable; those need incremental replacement where first-class tables exist or should exist.
