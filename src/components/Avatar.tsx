import type { Category } from "../lib/parser/types";
import { categoryColor } from "../lib/format";
import { CategoryGlyph } from "./icons";

/**
 * Circular avatar for transaction and recipient rows: the category's line icon
 * in its category color, on a soft tint of that color.
 */
export function Avatar({ category, size = 44 }: { category: Category; size?: number }) {
  const color = categoryColor(category);
  return (
    <div
      className="avatar"
      style={{
        width: size,
        height: size,
        color,
        background: `color-mix(in srgb, ${color} 14%, var(--surface-1))`,
      }}
    >
      <CategoryGlyph category={category} size={Math.round(size * 0.46)} />
    </div>
  );
}
