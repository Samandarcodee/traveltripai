export function isRotting(lead: { updatedAt: string; status: string }): boolean {
  const days = (Date.now() - new Date(lead.updatedAt).getTime()) / (1000 * 60 * 60 * 24);
  return days > 3 && lead.status !== "booked" && lead.status !== "lost";
}

export const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
] as const;

export function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function getAvatarColor(name: string | null): string {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length]!;
}
