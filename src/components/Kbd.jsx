// The inline keyboard-key chip, re-homed verbatim from the retired legacy
// DesignSystem.jsx library (#255); the unified design system has no
// keyboard-chip component yet.
export default function Kbd({ children, className = "", ...props }) {
  return (
    <kbd className={`ui-kbd ${className}`} {...props}>
      {children}
    </kbd>
  );
}
