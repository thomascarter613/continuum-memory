package continuum.provider_routing

default allow := false

allow if {
  input.provider.enabled == true
  input.requested_capability == "chat"
  input.provider.capabilities.chat == true
}

allow if {
  input.provider.enabled == true
  input.requested_capability == "embeddings"
  input.provider.capabilities.embeddings == true
}

review_required if {
  input.sensitivity == "sensitive"
  not input.provider.metadata.local
}

deny_reason contains "secret data must not be sent to non-local LLM providers by default" if {
  input.sensitivity == "secret"
  not input.provider.metadata.local
}
