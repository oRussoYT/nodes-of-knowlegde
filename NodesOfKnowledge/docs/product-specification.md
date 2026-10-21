# Product Specification (Preliminary)

## Status

This is an early, conceptual specification. It establishes intent and
scope boundaries for the foundation phase of the project; it is not a
finalized product requirements document. Details will be refined as each
module in `docs/development-roadmap.md` is built.

## Purpose

The Biological Dynamics of Forest Fragments Project (PDBFF) is a
long-running research program with a large, multi-generational community
of participants: researchers, field assistants, students, technicians,
collaborating institutions, and visitors, spanning decades.

NetPDBFF exists to document who has participated in PDBFF over its
history and how those people connect to one another — through shared
projects, institutions, time periods, publications, and collaborations —
so that the project's human network remains legible and discoverable over
time, rather than fragmented across personal memory, old spreadsheets,
and disconnected records.

## Primary users (anticipated)

- **Current and former PDBFF participants**, who may want to find and
  reconnect with collaborators, record their own participation history,
  or correct/extend information about themselves.
- **Researchers and administrators** associated with PDBFF, who need a
  reliable record of who has been involved, when, and in what capacity.
- **The broader public**, to the extent that information has been made
  public by the people it describes (see `docs/privacy-model.md`).

## Core concepts

- A **person** is a record of someone connected to PDBFF, whether or not
  they have ever created an account.
- A person may have one or more **PDBFF participation periods**, each
  describing a span of time, role, and context.
- People can be connected to each other through **relationships**
  (collaboration, mentorship, shared project or institution, etc.), which
  may be inferred from records or explicitly confirmed — these are never
  treated as equivalent (see `CLAUDE.md`).
- Information about a person has **visibility levels** that determine who
  can see it (see `docs/privacy-model.md`).

See `docs/database-model.md` for how these concepts are expected to map
to data, and `docs/user-roles.md` for who can do what.

## In scope for the long-term product (not this phase)

- Authentication and account management
- Person profiles, claimed and unclaimed
- PDBFF participation history records
- Career history and institutional affiliations
- Person nominations (adding people who haven't registered)
- Person-to-person relationships and network visualization
- Projects, publications, and oral histories
- A member forum
- Search across people, projects, and publications
- Basic analytics and administration tooling

## Explicitly out of scope for this phase (project foundation)

This phase delivers only the application skeleton: tooling, project
structure, and documentation. It does not include authentication, user
profiles, database tables or migrations, Supabase integration, search, or
any other product feature. The landing page contains no dashboard,
statistics, member profiles, or decorative product features — only the
project name, a temporary subtitle, and a development notice.

## Non-goals

- NetPDBFF is not a general-purpose academic social network; its scope is
  bounded to people connected to PDBFF.
- The platform will not publish information about unregistered people
  without their consent (see `docs/privacy-model.md`).
