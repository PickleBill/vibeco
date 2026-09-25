/** Clear only local working content at an explicit account boundary, never auth tokens. */
export function clearBrowserDrafts() {
  for (const storage of [localStorage, sessionStorage]) {
    for (const key of Object.keys(storage)) {
      if (
        key === "vibeco_simulator_draft" ||
        key === "vibeco_general_draft" ||
        key.startsWith("vibeco_stack_local") ||
        key.startsWith("vibeco_alt_prompts_")
      )
        storage.removeItem(key);
    }
  }
}
