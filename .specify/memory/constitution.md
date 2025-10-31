<!--
  SYNC IMPACT REPORT
  ==================
  Version: 0.0.0 → 1.0.0
  Rationale: Initial constitution establishment (MAJOR version for first formal governance)
  Date: 2025-10-31

  Modified Principles:
  - NEW: I. Specification-First Development
  - NEW: II. Independent Testability
  - NEW: III. Structured Planning (BMAD Framework)
  - NEW: IV. Test-Driven Development
  - NEW: V. Observability & Debuggability

  Added Sections:
  - Core Principles (5 principles)
  - Quality Standards
  - Development Workflow
  - Governance

  Removed Sections:
  - None (initial version)

  Templates Status:
  - ✅ plan-template.md: Constitution Check section aligns with principles
  - ✅ spec-template.md: User Scenarios & Testing section aligns with Principle II
  - ✅ tasks-template.md: User story organization aligns with Principle II
  - ⚠ Command files: Generic phrasing used (no agent-specific references)

  Follow-up TODOs:
  - None
-->

# Schrute Constitution

## Core Principles

### I. Specification-First Development

Every feature MUST begin with a specification that defines user scenarios, requirements, and success criteria before any implementation. Specifications MUST be:

- Technology-agnostic (no implementation details)
- Testable (clear acceptance scenarios)
- Prioritized (P1, P2, P3... ordering for incremental delivery)
- Reviewed and approved before planning begins

**Rationale**: Clear specifications prevent scope creep, enable informed planning, and ensure alignment between stakeholders before investment in implementation.

### II. Independent Testability

Every user story MUST be independently testable and deliverable as a standalone increment of value. Each story MUST:

- Be implementable without dependencies on other stories
- Deliver measurable value on its own
- Include clear acceptance scenarios
- Support independent deployment/demonstration

**Rationale**: Independent testability enables incremental delivery, reduces integration risk, provides early value to users, and allows parallel development.

### III. Structured Planning (BMAD Framework)

Feature planning MUST follow the Build-Measure-Adapt-Deploy (BMAD) framework with explicit phases:

- **Phase 0**: Research (technology assessment, feasibility analysis)
- **Phase 1**: Design (data models, contracts, architecture documentation)
- **Phase 2**: Task Generation (dependency-ordered, user-story-aligned tasks)
- **Phase 3**: Implementation (incremental, story-by-story execution)

Complexity that violates simplicity principles MUST be explicitly justified in a Complexity Tracking table.

**Rationale**: Structured planning reduces uncertainty, surfaces risks early, ensures thorough design before coding, and creates accountability for complexity decisions.

### IV. Test-Driven Development

When tests are required for a feature, they MUST be written before implementation using strict TDD methodology:

- Tests written first based on specifications
- Tests MUST fail before implementation begins (Red)
- Implementation MUST make tests pass (Green)
- Refactoring follows passing tests (Refactor)

Test categories:
- **Contract tests**: API/interface boundaries
- **Integration tests**: Cross-component user journeys
- **Unit tests**: Component-level logic

**Rationale**: TDD ensures code meets requirements, provides regression safety, improves design through testability pressure, and creates living documentation.

### V. Observability & Debuggability

All components MUST be designed for operational transparency:

- Text-based I/O for inspectability (stdin/stdout protocols)
- Structured logging with context (operation, timing, errors)
- Clear error messages with actionable guidance
- Traceable execution paths across components

**Rationale**: Transparent systems are debuggable systems. Text protocols and structured logging enable rapid troubleshooting and system understanding without specialized tools.

## Quality Standards

### Code Quality Gates

All code MUST meet these gates before merge:

- **Specification Alignment**: Implements requirements from approved spec
- **Test Coverage**: Tests pass (if tests are part of feature requirements)
- **Constitution Compliance**: Adheres to all principles without unjustified violations
- **Documentation**: README/quickstart updated for user-facing changes
- **Code Review**: Peer-reviewed for correctness, clarity, and principle adherence

### Complexity Justification

Any violation of simplicity principles (YAGNI, minimal dependencies, direct approaches) MUST be documented in plan.md Complexity Tracking table with:

- What principle/guideline is violated
- Why the complexity is necessary (specific technical/business need)
- What simpler alternative was rejected and why

## Development Workflow

### Feature Lifecycle

1. **Specification** (`/speckit.specify`): User input → spec.md with user stories, requirements, success criteria
2. **Clarification** (`/speckit.clarify`): Identify underspecified areas → ask targeted questions → encode answers
3. **Planning** (`/speckit.plan`): Spec → research → data models → contracts → plan.md
4. **Task Generation** (`/speckit.tasks`): Design artifacts → dependency-ordered tasks.md organized by user story
5. **Checklist** (`/speckit.checklist`): Generate custom verification checklist for feature
6. **Implementation** (`/speckit.implement`): Execute tasks incrementally, story by story
7. **Analysis** (`/speckit.analyze`): Cross-artifact consistency and quality review

### Incremental Delivery Strategy

Implementation MUST follow priority order (P1 → P2 → P3):

1. Complete foundational infrastructure (blocks all stories)
2. Implement P1 story → test independently → validate
3. Implement P2 story → test independently → validate
4. Continue for remaining priorities
5. Each story adds value without breaking previous stories

**Checkpoint validation**: After each story completion, verify it works independently before proceeding.

## Governance

### Amendment Procedure

Constitution changes require:

1. Proposed change with rationale (why needed, what problem it solves)
2. Impact analysis on existing templates, commands, and workflows
3. Version bump decision (MAJOR/MINOR/PATCH per semantic versioning)
4. Sync Impact Report documenting all affected artifacts
5. Template updates to maintain consistency
6. Approval before finalization

### Versioning Policy

- **MAJOR** (X.0.0): Backward-incompatible principle removals or redefinitions
- **MINOR** (x.Y.0): New principles, sections, or material expansions
- **PATCH** (x.y.Z): Clarifications, wording improvements, non-semantic refinements

### Compliance Review

All planning documents (plan.md) MUST include a Constitution Check section that:

- Lists applicable principles as gates
- Verifies compliance before proceeding to each phase
- Documents any justified violations in Complexity Tracking

### Enforcement

This constitution supersedes all other development practices. When conflicts arise:

1. Constitution takes precedence
2. If constitution is unclear, propose clarification amendment
3. If violation is necessary, document justification
4. Repeated unjustified violations trigger constitution review

**Version**: 1.0.0 | **Ratified**: 2025-10-31 | **Last Amended**: 2025-10-31
