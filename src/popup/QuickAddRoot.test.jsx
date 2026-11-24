import { describe, expect, it, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import QuickAddRoot from "./QuickAddRoot.jsx";

// The form has its own tests; here it is a stand-in that can be told to throw,
// so what gets exercised is the boundary around it.
const form = vi.hoisted(() => ({ throws: false }));
vi.mock("./QuickAdd.jsx", () => ({
  default: () => {
    if (form.throws) throw new Error("boom");
    return <p>Quick add form</p>;
  },
}));

afterEach(() => {
  form.throws = false;
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("QuickAddRoot (#284)", () => {
  it("mounts the form behind the error boundary", () => {
    render(<QuickAddRoot />);

    expect(screen.getByText("Quick add form")).toBeInTheDocument();
  });

  it("hands the boundary its fallback message from the catalogue", () => {
    // The boundary is a class and cannot call the hook itself. In development
    // it re-throws on a timer for React's overlay; fake timers keep that timer
    // from firing here.
    vi.useFakeTimers();
    vi.spyOn(console, "error").mockImplementation(() => {});
    form.throws = true;

    render(<QuickAddRoot />);

    expect(screen.getByText("Something went wrong.")).toBeInTheDocument();
    expect(
      screen.getByText("Quick add hit an error. Open the full app to bookmark this page.")
    ).toBeInTheDocument();
  });
});
