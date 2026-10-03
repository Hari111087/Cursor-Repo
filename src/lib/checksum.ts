/** Tiny isomorphic checksum used to prove the approved draft is exactly the one being sent. */
export function draftChecksum(d: { to: string; cc?: string | null; subject: string; body: string }) {
  const s = `${d.to}|${d.cc ?? ""}|${d.subject}|${d.body}`;
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) | 0;
  return String(h >>> 0);
}
