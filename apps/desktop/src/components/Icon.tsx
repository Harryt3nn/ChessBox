/*apps/desktop/src/components/Icon.tsx*/

import styles from "./Icon.module.css";

// monochrome flaticon glyphs (e.g. 018-plus.png) drawn as a CSS mask
// so they take the surrounding text colour — amber on hover, coral for delete, etc.
// full-colour illustrations (e.g. 044-knight.png) should use a plain <img> instead

interface IconProps {
  src: string;
  size?: number;
  className?: string;
}

export function Icon({ src, size = 16, className }: IconProps) {
  const mask = `url("${src}")`;

  return (
    <span
      aria-hidden="true"
      className={`${styles.glyph} ${className ?? ""}`}
      style={{ width: size, height: size, WebkitMaskImage: mask, maskImage: mask }}
    />
  );
}
