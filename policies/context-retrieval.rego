package continuum.context_retrieval

default allow := true

# Placeholder policy. Runtime enforcement is intentionally deferred.
# Future versions should deny retrieval when memory sensitivity, tenant boundary,
# project boundary, or provider policy does not permit inclusion.

deny contains reason if {
  input.memory.sensitivity == "secret"
  not input.request.allow_sensitive
  reason := "secret memories require explicit sensitive retrieval permission"
}
