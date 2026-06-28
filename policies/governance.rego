package continuum.governance

default allow := false

default review := false

secret_actions := {"memory.write", "candidate.promote", "context.retrieve", "handoff.export"}

allow if {
  not deny
  not review
}

deny if {
  input.sensitivity == "secret"
  input.action == secret_actions[_]
}

deny if {
  input.action == "memory.write"
  input.evidenceCount == 0
}

review if {
  input.sensitivity == "sensitive"
  not input.allowSensitive
}
