# SMS — Foundation Master Control Map

## Purpose
Foundation navigation only. This document does not replace the original
uploaded source documents.

## Project lifecycle
Specification → Decomposition & Acceptance → Continuation Implementation
→ Verification / Gap-Fix → Independent Verification → Acceptance

## Foundation scope recorded in the project sources
- Project Master Specification
- System Architecture
- Database Architecture
- Security & Roles
- Backup Strategy
- LAN / Server Architecture
- Application Settings
- Git / Project Workflow
- Master Implementation Methodology
- Master Prompt Execution Tracker

## Core principles
- SMS is one coherent system, not independent module applications.
- Reuse approved shared infrastructure.
- Do not duplicate entities, persistence, authentication, authorization, audit,
  migrations, APIs, or application shell.
- Student is the permanent identity.
- Enrollment is an academic registration for a period/context.
- Transfer is a controlled workflow affecting enrollment/placement.
- Do not invent unsupported requirements.
- AI-generated reports are not acceptance evidence by themselves.
- Implementation must stop at authorized boundaries.

## Module boundary
This Foundation package intentionally does NOT contain the five module ZIPs.
Use the separate Module 01–05 ZIP packages for module-specific source material.

## Exclusions
Gemini quota/error-resolution, Antigravity/AI-tool comparisons, temporary
status reports, extraction working notes, secrets, databases, runtime data,
and application implementation are excluded.
