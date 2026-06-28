package continuum.handoff.compile

default allow := true

# Layer 4 policy stub. Future layers should deny handoff compilation when a request
# crosses tenant/project boundaries, requests secret memories without authorization,
# or attempts to export memories to an unapproved provider or destination.

deny[msg] {
  input.retrieval.allowSensitive == true
  not input.actor.can_export_sensitive
  msg := "sensitive handoff export requires explicit authorization"
}
