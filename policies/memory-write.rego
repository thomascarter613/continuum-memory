package continuum.memory.write

# Policy stub.
# Future: enforce consent, sensitivity, namespace, tenant, and evidence requirements
# before candidate promotion or direct durable memory writes.

default allow := false

allow if {
  input.memory.content != ""
  count(input.memory.sourceEventIds) > 0
  input.memory.sensitivity != "secret"
}

allow_candidate if {
  input.candidate.content != ""
  input.candidate.sensitivity != "secret"
}

review_required if {
  input.memory.sensitivity == "sensitive"
}

candidate_review_required if {
  input.candidate.status == "needs_review"
}

candidate_review_required if {
  input.candidate.sensitivity == "sensitive"
}
