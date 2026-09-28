// Local-workspace mode = fail-OPEN. Off unless explicitly enabled.
// Deliberately NOT tied to NODE_ENV: Vercel preview deployments also run in
// development, and an unauthenticated visitor must not get full access there.
// Set ALLOW_LOCAL_WORKSPACE=1 only in a private, offline dev checkout.
export function localWorkspaceAllowed(): boolean {
  // NEXT_PUBLIC_ variant exists so the flag also works inside client components
  // (plain process.env reads are stripped from the browser bundle).
  return process.env.ALLOW_LOCAL_WORKSPACE === "1" || process.env.NEXT_PUBLIC_ALLOW_LOCAL_WORKSPACE === "1";
}
