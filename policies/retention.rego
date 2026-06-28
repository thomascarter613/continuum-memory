package continuum.memory.retention

# Layer 0 policy stub.
# Future: compute retention window by memory type, namespace, sensitivity, and consent.

default retain := true

retain if {
  input.memory.status != "forgotten"
}
