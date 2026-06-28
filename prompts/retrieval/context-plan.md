# Context Plan Prompt

You are planning which durable memories should be retrieved for a future LLM response.

Given:

- the current task
- optional project id
- optional query
- available section names
- memory taxonomy

Return a context plan with:

- section name
- purpose
- relevant memory types
- relevant scope kinds
- ranking keywords
- maximum memories per section

Do not include raw private memories in the plan. The plan describes retrieval intent only.
