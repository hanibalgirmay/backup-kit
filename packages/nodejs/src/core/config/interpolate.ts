export function interpolate(value: string, env: NodeJS.ProcessEnv = process.env): string {
  return value.replace(/\$\{([^}:]+)(?::-([^}]*))?\}/g, (_match, name: string, fallback?: string) => {
    const found = env[name];
    if (found !== undefined) return found;
    if (fallback !== undefined) return fallback;
    return "";
  });
}

export function interpolateDeep<T>(input: T, env: NodeJS.ProcessEnv = process.env): T {
  if (typeof input === "string") return interpolate(input, env) as T;
  if (Array.isArray(input)) return input.map((v) => interpolateDeep(v, env)) as T;
  if (input && typeof input === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
      out[k] = interpolateDeep(v, env);
    }
    return out as T;
  }
  return input;
}
