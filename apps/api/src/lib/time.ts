export function now() {
  return new Date().toISOString()
}

export function estimateTokens(text: string) {
  return Math.ceil(text.length / 4)
}
