package continuum.artifact_index

default allow := true

# Placeholder for future OPA integration. The TypeScript policy engine currently
# performs the first-pass deny/allow decision. This policy file documents the
# intended policy surface for repository/file indexing.

deny[msg] {
  input.captureContent == true
  input.sensitivity == "secret"
  msg := "Secret content must not be captured into artifact memory."
}
