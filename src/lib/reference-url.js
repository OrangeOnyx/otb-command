/* Document references are navigation, never executable schemes. Stored
   doc:// links retain their separate authenticated bucket-store handling. */
const LOCAL_FILES = new Set(["/plat-render.svg", "/floorplan-center.png"]);
const LOCAL_PREFIXES = ["/references/"];

export function safeReferenceUrl(value) {
  if (typeof value !== "string") return null;
  const link = value.trim();
  if (!link || /[\u0000-\u0020\u007f\\]/.test(link)) return null;
  try {
    if (link.startsWith("/") && !link.startsWith("//")) {
      const url = new URL(link, "https://reference.invalid");
      if (url.origin !== "https://reference.invalid") return null;
      if (!LOCAL_FILES.has(url.pathname) && !LOCAL_PREFIXES.some(p => url.pathname.startsWith(p))) return null;
      /* Avoid encoded traversal or separators being reinterpreted by a
         downstream file server after URL normalization. */
      if (/%(?:2e|2f|5c)/i.test(url.pathname)) return null;
      return url.pathname + url.search + url.hash;
    }
    const url = new URL(link);
    if (url.protocol !== "https:" || url.username || url.password) return null;
    return url.href;
  } catch { return null; }
}
