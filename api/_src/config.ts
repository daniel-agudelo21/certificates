export const config = {
  limits: {
    // Límite de uso por instancia de la función (sin login todos cuentan como un mismo usuario).
    rateLimitWindowMs: 60_000,
    rateLimitMaxRequests: 10,
  },
}
