import type { Category } from "../lib/parser/types";
import { categoryColor, categoryIcon } from "../lib/format";

/**
 * Circular avatar used in transaction and recipient rows — the category emoji
 * on a soft tint of that category's color. Mirrors the avatar-led rows in the
 * reference design while keeping Trak's category as the organizing idea.
 */
export function Avatar({ category, size = 44 }: { category: Category; size?: number }) {
  const color = categoryColor(category);
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.42,
        background: `color-mix(in srgb, ${color} 16%, var(--surface-1))`,
      }}
      aria-hidden
    >
      {categoryIcon(category)}
    </div>
  );
}
