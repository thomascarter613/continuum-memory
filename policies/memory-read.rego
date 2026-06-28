package continuum.memory.read

# Layer 0 policy stub.
# Future: enforce tenant boundaries, model-provider restrictions, sensitivity gates,
# and task-relevance requirements.

default allow := false

allow if {
  input.memory.status == "active"
  input.memory.sensitivity != "secret"
}
