# Compile Handoff Prompt Contract

This prompt is reserved for a future LLM-assisted handoff compiler. Layer 4 uses a deterministic compiler first.

When enabled, the LLM must receive:

- objective;
- context pack sections;
- source memory IDs;
- evidence metadata;
- manual operator notes;
- token budget.

The LLM must output:

- current state;
- accepted decisions;
- constraints;
- completed work;
- procedures to respect;
- risks;
- open questions;
- verification status;
- next actions.

The LLM must not invent source memories. Every claim that depends on memory should map back to a source memory ID.
