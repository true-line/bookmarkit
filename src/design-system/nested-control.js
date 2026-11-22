// #239: events coming from nested interactive content belong to that content —
// a nested link or button never also fires an ancestor card's action (the
// keyboard route is the sneaky one: a child button's Enter would otherwise
// bubble straight into the card's handler).
//
// It lives in its own module because it is a rule, not a component: the Card
// uses it on its own activation, and a call site that owns the card's
// activation (the manager's two-stage bookmark selection) imports the same
// predicate so the rule and its reuse cannot drift apart.
export function fromNestedControl(event) {
  return (
    event.target !== event.currentTarget &&
    event.target.closest("a, button, input, select, textarea, [role='button']") !== null
  );
}
