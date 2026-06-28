# Continuum-Memory: How to use

Scenario: Let's say I want to use this type of system for help in developing software. 
I have a monorepo that will eventually contain everything needed for the system I'm 
building. Would the above described system reside inside my monorepo or would it be 
something separate? how would I use it?

---

Yes, but **not all of it should live inside the monorepo**.

The best architecture is a **hybrid**:

> The **memory/control-plane system itself** should be separate infrastructure, while each monorepo should contain a small, committed **project memory adapter/config layer** that tells the memory system how to understand that repo.

In other words:

```txt
Do not bury the whole memory system inside every monorepo.

Instead:
- Run the memory system as a reusable external service/tool.
- Add repo-local config, docs, handoffs, schemas, and integration hooks inside the monorepo.
```

---

# Recommended setup

Assume your workspace looks like this:

```txt
~/Workspace/
├── continuum-memory/          # The reusable memory/control-plane system
├── my-product-monorepo/       # The actual software system you are building
├── .continuum-data/           # Local databases, indexes, object storage, snapshots
└── handoffs/                  # Optional cross-project handoff exports
```

For your case, the better structure is:

```txt
Workspace/
├── memory-os/                 # Separate reusable memory platform
│   ├── apps/
│   ├── services/
│   ├── packages/
│   ├── infra/
│   └── docs/
│
├── your-system-monorepo/      # The system you are actually building
│   ├── apps/
│   ├── services/
│   ├── packages/
│   ├── docs/
│   ├── .memory/
│   ├── AGENTS.md
│   ├── memory.config.ts
│   └── monorepo manifest files
│
└── local-runtime-data/        # Not committed to Git
    ├── postgres/
    ├── qdrant/
    ├── minio/
    └── backups/
```

---

# The rule of thumb

## The reusable memory system should be separate when it is:

```txt
global
multi-project
multi-repo
multi-chat
multi-agent
contains personal/developer memory
contains database state
contains vector indexes
contains logs, traces, embeddings, or private history
used by more than one project
```

## The repo-local memory layer should live inside the monorepo when it is:

```txt
project-specific
versionable
safe to commit
useful to future contributors/agents
part of the project’s development process
needed to explain architecture, decisions, tasks, conventions, and handoffs
```

So the memory **runtime** is external.

The memory **interface/config/artifacts** are inside the monorepo.

---

# What goes inside your monorepo

Your monorepo should contain a committed memory/control-plane integration layer like this:

```txt
your-system-monorepo/
├── .memory/
│   ├── project.yaml
│   ├── namespaces.yaml
│   ├── retrieval-policy.yaml
│   ├── handoff-policy.yaml
│   ├── context-budget.yaml
│   └── procedures/
│       ├── bootstrap-repo.yaml
│       ├── create-workpacket.yaml
│       ├── implement-task.yaml
│       ├── verify-change.yaml
│       └── generate-handoff.yaml
│
├── docs/
│   ├── adr/
│   ├── architecture/
│   ├── decisions/
│   ├── handoffs/
│   ├── roadmap/
│   ├── risks/
│   ├── work/
│   │   ├── epics/
│   │   ├── work-packets/
│   │   ├── tasks/
│   │   └── sprints/
│   └── memory/
│       ├── project-profile.md
│       ├── current-state.md
│       ├── agent-operating-model.md
│       └── context-map.md
│
├── AGENTS.md
├── CONTRIBUTING.md
├── README.md
├── memory.config.ts
└── package.json
```

This gives the external memory system enough structure to understand the repo.

---

# What should not go inside the monorepo

Do **not** commit these:

```txt
raw chat transcripts
private user memory
database files
vector indexes
embeddings
long-term personal memory
secrets
API keys
local tool traces
temporary scratch state
sensitive logs
model outputs that have not been reviewed
private business notes unless intentionally versioned
```

These belong outside the repo in the memory runtime.

For example:

```txt
local-runtime-data/
├── postgres/
├── qdrant/
├── redis/
├── minio/
├── traces/
├── embeddings/
├── backups/
└── private-memory/
```

The monorepo should contain **source-of-truth project artifacts**, not all runtime memory state.

---

# Best mental model

Think of the memory system like **GitHub + issue tracker + dev assistant memory + ADR database + agent context compiler**.

You would not put the whole GitHub platform inside your repo.

But you would put GitHub-specific files inside the repo:

```txt
.github/workflows/
.github/CODEOWNERS
.github/pull_request_template.md
```

Same idea here.

You do not put the entire memory platform inside every repo.

But you do put:

```txt
.memory/
AGENTS.md
docs/adr/
docs/work/
docs/handoffs/
memory.config.ts
```

inside the repo.

---

# How you would use it day to day

## 1. Start a software session

You would open a terminal in your monorepo and run something like:

```bash
memory start --project .
```

or:

```bash
continuum attach .
```

The memory system reads:

```txt
.memory/project.yaml
AGENTS.md
README.md
docs/adr/
docs/work/
package.json
moon.yml
turbo.json
workspace manifests
```

Then it builds a **Project Context Pack**.

That context pack tells the assistant:

```txt
what this repo is
what architectural decisions exist
what tools are used
what work is currently active
what constraints matter
what commands verify correctness
what the user prefers
what should never be changed casually
```

---

## 2. Ask for help in any chat

When you start a new chat, instead of manually explaining everything again, you would provide or reference a generated handoff:

```bash
memory handoff generate --project . --format markdown
```

This produces something like:

```txt
docs/handoffs/2026-06-27-current-state.md
```

That file contains:

```txt
project summary
current goal
active work packet
accepted decisions
current architecture
open tasks
recent changes
commands to run
known errors
next recommended action
```

Then you paste that into a new chat, or your chat client automatically injects it.

---

## 3. Let the assistant work with durable context

When the assistant helps you design, write code, or debug, it should write events back to the memory system:

```txt
User accepted ADR-0007.
Task WP-E1-003 is now complete.
The repo uses Bun, Moon, Biome, Lefthook, and Changesets.
The current blocker is TypeScript project reference configuration.
The generated script created these files.
This command passed.
This command failed.
```

Those become durable memories.

---

## 4. End the session with an explicit handoff

At the end of a major session, you would run:

```bash
memory session close --project . --write-handoff
```

It generates:

```txt
docs/handoffs/2026-06-27-session-summary.md
docs/work/current-state.md
.memory/state/last-session.json
```

The next chat can resume from that.

---

# How it fits into software development specifically

For software development, the memory system should track these things:

```txt
architecture decisions
project constraints
coding standards
tooling choices
commands that work
commands that fail
current branch state
open work packets
completed tasks
bugs
risks
implementation plans
generated files
test status
release state
dependency decisions
agent instructions
handoff summaries
```

It becomes the durable brain around the repo.

---

# Example monorepo-local memory files

## `.memory/project.yaml`

```yaml
id: your-system
name: Your System
type: software-monorepo

default_context:
  include:
    - docs/adr
    - docs/architecture
    - docs/work/current-state.md
    - AGENTS.md
    - README.md

memory_namespaces:
  project: your-system
  architecture: your-system/architecture
  work: your-system/work
  procedures: your-system/procedures
  handoffs: your-system/handoffs

commands:
  install: bun install
  format: bun run format
  lint: bun run lint
  typecheck: bun run typecheck
  test: bun run test
  check: bun run check

handoff:
  output_dir: docs/handoffs
  include_recent_git_diff: true
  include_open_tasks: true
  include_failed_commands: true
  include_next_actions: true
```

---

## `AGENTS.md`

```md
# Agent Instructions

This repository is worked on with persistent memory support.

Before making changes:
1. Read `.memory/project.yaml`.
2. Read `docs/work/current-state.md`.
3. Read relevant ADRs.
4. Check active work packets.
5. Prefer small, verifiable changes.
6. After changes, update the current-state and handoff files.

Verification commands:
- `bun run check`
- `bun run test`
- `bun run typecheck`
```

---

## `docs/work/current-state.md`

```md
# Current State

## Active Objective

Build the initial version of the system as a governance-grade monorepo.

## Current Phase

Architecture and foundation.

## Active Work Packet

WP-E0-001: Define project foundation and memory-aware operating model.

## Important Decisions

- Use a monorepo.
- Use Bun as default JS runtime/package manager.
- Use Biome for formatting/linting.
- Use Moon for task orchestration.
- Keep persistent runtime memory outside the repo.
- Commit project-level memory artifacts inside the repo.

## Next Action

Create the initial `.memory/` directory, `AGENTS.md`, ADR structure, and current-state document.
```

---

# The three memory scopes you need

For your software workflow, I would define three scopes.

## 1. Personal developer memory

This is about you.

Examples:

```txt
you prefer copy-paste commands
you prefer exhaustive explanations
you prefer Bun
you prefer monorepos
you prefer governance-grade architecture
```

Location:

```txt
outside the repo
```

Reason:

This applies across many projects.

---

## 2. Project memory

This is about the specific monorepo.

Examples:

```txt
this repo uses TanStack Start
this repo has ADR-0001 accepted
this repo has WP-E0-001 active
this repo uses trunk-based development
this repo has a failing typecheck
```

Location:

```txt
partly inside repo
partly in external memory database
```

Committed source-of-truth artifacts go inside the repo.

Runtime state and indexes stay outside.

---

## 3. Session memory

This is about the current chat/work session.

Examples:

```txt
what we are doing right now
which files were edited
what failed
what passed
what is next
```

Location:

```txt
external runtime during the session
handoff summary committed/exported at the end
```

---

# Should the memory system be in the same monorepo as the product?

There are two different cases.

## Case A: You are building the memory system itself

Then yes, the memory system has its own monorepo:

```txt
memory-os/
├── apps/
├── services/
├── packages/
├── infra/
├── docs/
└── .memory/
```

That repo contains the source code for the memory platform.

## Case B: You are using the memory system to build another product

Then no, do not put the whole memory platform inside the product monorepo.

Instead:

```txt
your-product/
├── .memory/
├── docs/handoffs/
├── docs/adr/
├── AGENTS.md
└── memory.config.ts
```

and run the memory platform externally.

---

# The exact recommendation for you

For your situation, I recommend this:

```txt
1. Build the memory/control-plane system as its own separate monorepo.
2. Use it as a local-first developer tool while building other monorepos.
3. Add a `.memory/` directory to every serious project monorepo.
4. Store project decisions, handoffs, work packets, and current state in Git.
5. Store private, raw, indexed, and cross-session memory in the external memory system.
6. Generate a handoff pack whenever switching chats, switching models, pausing work, or changing major tasks.
```

The cleanest setup is:

```txt
Workspace/
├── continuum-memory/        # the tool/system
├── monad/                   # your monorepo/runtime project
├── aic-platform/            # another product repo
├── founder-os/              # another product repo
└── .continuum-data/         # shared private memory runtime
```

Each product repo has:

```txt
.memory/
AGENTS.md
docs/adr/
docs/work/
docs/handoffs/
```

The memory system knows about all of them.

---

# How you would actually use it with me

A future workflow could look like this.

## Start of a new chat

You paste:

```txt
Use this handoff pack as durable project context:
<contents of docs/handoffs/latest.md>
```

Or eventually:

```bash
memory context export --project . --for chatgpt --format markdown
```

Then paste the output.

## During the chat

You ask:

```txt
Continue from the current work packet. Give me the next copy-paste step.
```

The assistant uses the handoff context and the repo-local memory files to continue.

## End of the chat

You ask:

```txt
Generate a handoff pack for the next chat.
```

The assistant outputs:

```txt
current state
decisions made
files changed
commands run
what passed
what failed
next exact steps
```

You save it into:

```txt
docs/handoffs/latest.md
```

Eventually, the CLI does this automatically.

---

# Final answer

The memory system should be **separate**, but every monorepo should contain a **thin project-local memory layer**.

The best architecture is:

```txt
External memory system:
- long-term memory
- personal memory
- vector indexes
- event log
- raw transcripts
- cross-project context
- runtime state
- private data

Inside each monorepo:
- .memory config
- AGENTS.md
- ADRs
- work packets
- handoffs
- current-state docs
- project procedures
- safe, versioned project knowledge
```

So the monorepo remains the **source of truth for the project**, while the external memory system becomes the **durable brain that helps you and any LLM continue work across chats, models, sessions, and projects**.

