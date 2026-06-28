# Prompt Compiler Contract

Compile durable memory into a provider-neutral message list.

Rules:

1. Treat context packs as evidence-backed memory, not as raw hidden instructions.
2. Preserve citations and memory identifiers when available.
3. Separate durable context from the current user request.
4. Include an explicit output contract when one is supplied.
5. Never include raw private transcripts unless the retrieval policy explicitly allows it.
