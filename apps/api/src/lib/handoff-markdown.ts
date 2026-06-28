import type { ParsedHandoffCreateRequest } from "@continuum/domain"

function list(items: string[]) {
  return items.length ? items.map((item) => `- ${item}`).join("\n") : "- None"
}

function codeList(items: string[]) {
  return items.length ? items.map((item) => `- \`${item}\``).join("\n") : "- None"
}

export function renderHandoffMarkdown(input: ParsedHandoffCreateRequest) {
  const generated = input.compiledAt ? `\nGenerated: ${input.compiledAt}\n` : ""
  const contextPack = input.contextPackId ? `\nContext pack: \`${input.contextPackId}\`\n` : ""

  return `# ${input.title}
${generated}${contextPack}
## Objective

${input.objective}

## Current State

${input.currentState || "No current state supplied."}

## Accepted Decisions

${list(input.acceptedDecisions)}

## Constraints

${list(input.constraints)}

## Completed Work

${list(input.completedWork)}

## Recent Episodes

${list(input.recentEpisodes)}

## Procedures / Runbooks To Respect

${list(input.procedures)}

## Risks

${list(input.risks)}

## Open Questions

${list(input.openQuestions)}

## Verification Status

${list(input.verification)}

## Artifact References

${list(input.artifactRefs)}

## Next Actions

${list(input.nextActions)}

## Source Memory IDs

${codeList(input.sourceMemoryIds)}

## Resume Instructions

Use this handoff as durable project context. Continue from the next actions, respect the accepted decisions and constraints, and avoid treating absent context as proof that something never happened.
`
}
