/**
 * Avatar Utilities - Shared across frontend and backend
 * Used for generating initials and colors for user avatars
 */

export const AVATAR_COLORS = [
  "bg-blue-500",
  "bg-purple-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
];

/**
 * Extract initials from a name
 * @param name - Full name or null
 * @returns 2-character initials in uppercase
 * @example
 * getInitials("John Doe") => "JD"
 * getInitials("Alice") => "AL"
 * getInitials(null) => "?"
 */
export function getInitials(name: string | null): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.slice(0, 2).toUpperCase();
}

/**
 * Get a consistent color for an avatar based on name
 * Uses the first character's charCode to deterministically select a color
 * @param name - Name to generate color for
 * @returns Tailwind color class string
 * @example
 * getAvatarColor("John") => "bg-blue-500" (consistent across calls)
 * getAvatarColor("Jane") => "bg-purple-500" (different from John)
 */
export function getAvatarColor(name: string | null): string {
  if (!name) return AVATAR_COLORS[0];
  return AVATAR_COLORS[name.charCodeAt(0) % AVATAR_COLORS.length];
}

/**
 * Get avatar background color (for CSS hex values, not Tailwind)
 * Useful for non-Tailwind contexts (Canvas, SVG, etc.)
 * @param name - Name to generate color for
 * @returns Hex color code
 */
export function getAvatarColorHex(name: string | null): string {
  const colorMap: Record<string, string> = {
    "bg-blue-500": "#3b82f6",
    "bg-purple-500": "#a855f7",
    "bg-emerald-500": "#10b981",
    "bg-amber-500": "#f59e0b",
    "bg-rose-500": "#f43f5e",
    "bg-indigo-500": "#6366f1",
    "bg-teal-500": "#14b8a6",
  };
  const tailwindClass = getAvatarColor(name);
  return colorMap[tailwindClass] || colorMap["bg-blue-500"];
}
