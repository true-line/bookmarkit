import React from "react";
import { Button, Card, IconButton, InputField, Typography } from "./index.js";
import { UiScope } from "./story-decorator.jsx";

// Foundations of the unified UI design system (#238). The toolbar's "UI
// theme" and "Direction" toggles (set in .storybook/preview.jsx) flip every
// story between the light and dark palettes and between LTR and RTL — the
// same toggle is the fastest way to audit contrast pairs and logical
// mirroring on any component story.

const meta = {
  decorators: [UiScope],
  title: "Design System/Foundations/Colors",
  parameters: {
    docs: {
      description: {
        component:
          "The light and dark palettes from the spec, shown as on-role pairs. Every pair clears WCAG AA (≥ 4.5:1 for text, ≥ 3:1 for boundaries and focus rings). Flip the UI theme toolbar to audit the dark set; values live in src/design-system/tokens.css.",
      },
    },
  },
};

export default meta;

function Swatch({ name, bg, on }) {
  return (
    <div style={{ display: "grid", gap: "4px", minWidth: "132px" }}>
      <div
        style={{
          background: bg,
          color: on,
          border: "1px solid var(--ui-outline-variant)",
          borderRadius: "var(--ui-radius)",
          padding: "10px 12px",
          font: "var(--ui-type-label-md)",
        }}
      >
        Aa
      </div>
      <code style={{ font: "var(--ui-type-mono-sm)", color: "var(--ui-on-surface-variant)" }}>
        {name}
      </code>
    </div>
  );
}

function SwatchRow({ title, pairs }) {
  return (
    <section style={{ display: "grid", gap: "12px" }}>
      <Typography variant="label-lg">{title}</Typography>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
        {pairs.map(([name, bg, on]) => (
          <Swatch key={name} name={name} bg={bg} on={on} />
        ))}
      </div>
    </section>
  );
}

const pair = (token) => [`--ui-${token}`, `var(--ui-${token})`, `var(--ui-on-${token})`];
const pairOnSurface = (token) => [`--ui-${token}`, `var(--ui-${token})`, "var(--ui-on-surface)"];

export const Palette = {
  render: () => (
    <div style={{ display: "grid", gap: "32px", maxWidth: "960px" }}>
      <SwatchRow
        title="Roles"
        pairs={[pair("primary"), pair("secondary"), pair("tertiary"), pair("error")]}
      />
      <SwatchRow
        title="Containers"
        pairs={[
          pair("primary-container"),
          pair("secondary-container"),
          pair("tertiary-container"),
          pair("error-container"),
        ]}
      />
      <SwatchRow
        title="Surfaces"
        pairs={[
          pair("background"),
          pairOnSurface("surface-container-lowest"),
          pairOnSurface("surface-container-low"),
          pairOnSurface("surface-container"),
          pairOnSurface("surface-container-high"),
          pairOnSurface("surface-container-highest"),
          [`--ui-surface-variant`, "var(--ui-surface-variant)", "var(--ui-on-surface-variant)"],
          ["--ui-inverse-surface", "var(--ui-inverse-surface)", "var(--ui-inverse-on-surface)"],
        ]}
      />
      <SwatchRow
        title="Boundaries (≥ 3:1 for input borders and focus rings)"
        pairs={[["--ui-outline", "var(--ui-outline)", "#ffffff"], pairOnSurface("outline-variant")]}
      />
      <SwatchRow
        title="Shared accents (AI assist, brand, status)"
        pairs={[
          ["--ui-ai-suggest", "var(--ui-ai-suggest)", "#ffffff"],
          ["--ui-brand-crimson", "var(--ui-brand-crimson)", "#ffffff"],
          ["--ui-success", "var(--ui-success)", "#ffffff"],
          ["--ui-danger", "var(--ui-danger)", "#ffffff"],
        ]}
      />
    </div>
  ),
};

export const TypeScale = {
  render: () => (
    <div style={{ display: "grid", gap: "16px", maxWidth: "720px" }}>
      <Typography variant="display-lg">Display large — Organize every bookmark</Typography>
      <Typography variant="display-lg-mobile">
        Display large, mobile — Organize every bookmark
      </Typography>
      <Typography variant="headline-lg">Headline large — Section heading</Typography>
      <Typography variant="headline-md">Headline medium — Dialog heading</Typography>
      <Typography variant="headline-sm">Headline small — Card title</Typography>
      <Typography variant="body-lg">
        Body large — 15px Radio Canada Big for primary reading copy.
      </Typography>
      <Typography variant="body-md">
        Body medium — 14px, the default for UI copy and card descriptions.
      </Typography>
      <Typography variant="body-sm">
        Body small — 12px for hints and metadata; never below 12px.
      </Typography>
      <div>
        <Typography variant="label-lg">Label large — button copy</Typography>
      </div>
      <div>
        <Typography variant="label-md">Label medium — form labels</Typography>
      </div>
      <div>
        <Typography variant="label-sm">Label small — quiet chips</Typography>
      </div>
      <Typography variant="mono-md" numeric>
        Fira Code — https://github.com (URLs, counts, timestamps)
      </Typography>
      <Typography variant="mono-sm">Fira Code small — provider status pills</Typography>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        component:
          "Red Hat Text headings, Radio Canada Big body and labels, Fira Code for URLs, kbd chips and pills. Text containers never fix their height, so the scale survives 200% zoom and 30–40% longer translations.",
      },
    },
  },
};

export const SpacingAndShapes = {
  render: () => (
    <div style={{ display: "grid", gap: "32px", maxWidth: "560px" }}>
      <section style={{ display: "grid", gap: "8px" }}>
        <Typography variant="label-lg">Spacing — 4px/8px rhythm</Typography>
        {[
          ["gutter-xs", "var(--ui-space-gutter-xs)"],
          ["gutter-sm", "var(--ui-space-gutter-sm)"],
          ["gutter-md", "var(--ui-space-gutter-md)"],
          ["gutter-lg", "var(--ui-space-gutter-lg)"],
          ["gutter-xl", "var(--ui-space-gutter-xl)"],
          ["section", "var(--ui-space-section)"],
        ].map(([name, value]) => (
          <div key={name} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <span style={{ background: "var(--ui-primary)", height: "12px", width: value }} />
            <Typography variant="mono-sm">{`${name} = ${value.replace("var(", "").replace(")", "")}`}</Typography>
          </div>
        ))}
      </section>
      <section style={{ display: "grid", gap: "8px" }}>
        <Typography variant="label-lg">Radii</Typography>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {[
            ["sm — 4px chips", "var(--ui-radius-sm)"],
            ["default — 8px controls", "var(--ui-radius)"],
            ["md — 10px search bars", "var(--ui-radius-md)"],
            ["lg — 12px dialogs", "var(--ui-radius-lg)"],
            ["xl — 16px sheets", "var(--ui-radius-xl)"],
            ["full — pills", "var(--ui-radius-full)"],
          ].map(([name, value]) => (
            <div key={name} style={{ display: "grid", gap: "4px", justifyItems: "center" }}>
              <div
                style={{
                  width: "72px",
                  height: "48px",
                  borderRadius: value,
                  border: "2px solid var(--ui-outline)",
                  background: "var(--ui-surface-container-lowest)",
                }}
              />
              <Typography variant="body-sm">{name}</Typography>
            </div>
          ))}
        </div>
      </section>
    </div>
  ),
};

export const ElevationAndMotion = {
  render: () => (
    <div style={{ display: "grid", gap: "32px", maxWidth: "720px" }}>
      <section style={{ display: "flex", flexWrap: "wrap", gap: "24px" }}>
        <div style={{ width: "220px" }}>
          <Card>
            <Typography variant="headline-sm">Resting card</Typography>
            <Typography variant="body-sm">1px outline-variant hairline, ambient shadow.</Typography>
          </Card>
        </div>
        <div style={{ width: "220px" }}>
          <Card
            style={{ boxShadow: "var(--ui-shadow-card-hover)", borderColor: "var(--ui-outline)" }}
          >
            <Typography variant="headline-sm">Hovered interactive card</Typography>
            <Typography variant="body-sm">Raised shadow, border steps up to outline.</Typography>
          </Card>
        </div>
      </section>
      <section style={{ display: "grid", gap: "8px" }}>
        <Typography variant="label-lg">Scrim over the canvas</Typography>
        <div
          style={{
            position: "relative",
            height: "140px",
            borderRadius: "var(--ui-radius-lg)",
            background: "var(--ui-background)",
            border: "1px solid var(--ui-outline-variant)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              inset: 0,
              background: "var(--ui-dialog-scrim)",
              display: "grid",
              placeItems: "center",
            }}
          >
            <div
              style={{
                background: "var(--ui-surface-container-lowest)",
                color: "var(--ui-on-surface)",
                borderRadius: "var(--ui-radius-lg)",
                padding: "16px 24px",
                boxShadow: "var(--ui-shadow-card-hover)",
              }}
            >
              <Typography variant="body-md">Dialog panel over rgba(13, 20, 28, 0.5)</Typography>
            </div>
          </div>
        </div>
      </section>
      <Typography variant="body-sm">
        Motion: state feedback 100ms ease-out, surfaces enter over 200ms cubic-bezier(0.2, 0, 0, 1)
        and exit over 150ms cubic-bezier(0.3, 0, 1, 1). Everything collapses to 0ms under
        prefers-reduced-motion: reduce.
      </Typography>
    </div>
  ),
};

// One slice of manager chrome exercising the pieces together — most useful
// under the Direction toggle, where the logical-property layout must mirror.
export const Composition = {
  render: () => (
    <div style={{ maxWidth: "560px", display: "grid", gap: "16px" }}>
      <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: "8px" }}>
        <Button>Add New</Button>
        <Button intent="tertiary">Suggest Tags</Button>
        <Button intent="quiet">Import</Button>
        <span style={{ flex: 1 }} />
        <IconButton label="Open options">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09a1.65 1.65 0 00-1-1.51 1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09a1.65 1.65 0 001.51-1 1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33h.01a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51h.01a1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82v.01a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </IconButton>
      </div>
      <InputField id="composition-search" label="Search" icon="⌕" placeholder="Find github" />
      <Card>
        <Typography variant="headline-sm">MDN Web Docs</Typography>
        <p className="ui-url" dir="ltr" style={{ margin: "4px 0" }}>
          https://developer.mozilla.org/en-US/docs/Web/CSS
        </p>
        <Typography variant="body-sm" numeric>
          Saved 12 Mar 2026 · opened 3 times
        </Typography>
      </Card>
    </div>
  ),
};
