import React from "react";
import FilterBar from "./FilterBar.jsx";
import {
  AgentPlan,
  Banner,
  BookmarkCardView,
  Button,
  EmptyState,
  IconButton,
  Input,
  Kbd,
  Modal,
  SearchBar,
  Select,
  StarRating,
  StatusDot,
  Tabs,
  Tag,
  Textarea,
  Toast,
} from "./DesignSystem.jsx";

const noop = () => undefined;

const sampleBookmark = {
  title: "GitHub",
  url: "https://github.com",
  description: "Where the world builds software.",
  faviconUrl: "https://github.com/favicon.ico",
  rating: 5,
  tags: ["dev", "git", "reference"],
};

const filterState = {
  text: "",
  minRating: 0,
  sortBy: "",
  order: "asc",
  tags: {},
};

const tagFacets = [
  { tag: "frontend", count: 3 },
  { tag: "dev", count: 2 },
  { tag: "docs", count: 2 },
  { tag: "reference", count: 2 },
  { tag: "ai", count: 1 },
  { tag: "archive", count: 1 },
  { tag: "build", count: 1 },
  { tag: "css", count: 1 },
  { tag: "git", count: 1 },
  { tag: "llm", count: 1 },
  { tag: "research", count: 1 },
  { tag: "tools", count: 1 },
  { tag: "ux", count: 1 },
];

const meta = {
  title: "BookmarkIt/Design System",
  parameters: {
    docs: {
      description: {
        component:
          "The internal BookmarkIt component library, lifted from the supplied design-system source and wired to the app's existing seven theme variables.",
      },
    },
  },
};

export default meta;

export const Buttons = {
  render: () => (
    <div className="space-y-6">
      <section className="flex flex-wrap items-center gap-3">
        <Button>Primary</Button>
        <Button intent="secondary">Secondary</Button>
        <Button intent="ghost">Ghost</Button>
        <Button intent="danger">Danger</Button>
        <Button intent="ai">Generate with AI</Button>
        <Button loading>Saving</Button>
        <Button disabled>Disabled</Button>
      </section>
      <section className="flex flex-wrap items-center gap-3">
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
        <IconButton label="Options" variant="bordered">
          ⚙
        </IconButton>
      </section>
    </div>
  ),
};

export const Forms = {
  render: () => (
    <div className="grid max-w-3xl grid-cols-1 gap-5 md:grid-cols-2">
      <Input id="story-title" label="Title" defaultValue="GitHub" />
      <Input id="story-url" label="URL" defaultValue="https://github.com" validity="valid" />
      <Select
        id="story-rating"
        label="Minimum rating"
        options={["Any rating", "3 stars", "4 stars", "5 stars"]}
      />
      <div className="ds-field">
        <label>Rating</label>
        <StarRating value={4} onChange={noop} />
      </div>
      <Textarea
        id="story-description"
        label="Description"
        defaultValue="Where the world builds software."
      />
      <Textarea id="story-json" label="Import JSON" mono defaultValue={'[{"title":"GitHub"}]'} />
      <div className="md:col-span-2">
        <SearchBar
          aria-label="Natural language search"
          placeholder="Type natural language queries (e.g., 'find github')"
          size="lg"
        />
      </div>
      {/* No-provider state: must read as disabled, not merely muted (#210). */}
      <div className="md:col-span-2">
        <SearchBar
          aria-label="Natural language search, disabled"
          placeholder="Set up a provider in Options to search"
          size="lg"
          disabled
        />
      </div>
    </div>
  ),
};

export const BookmarkStates = {
  render: () => (
    <div className="grid max-w-4xl gap-3">
      <BookmarkCardView {...sampleBookmark} />
      <BookmarkCardView {...sampleBookmark} selected />
      <BookmarkCardView {...sampleBookmark} pendingDelete />
      <BookmarkCardView {...sampleBookmark} unreachable />
    </div>
  ),
};

export const FilterPanel = {
  render: () => (
    <div className="max-w-4xl">
      <FilterBar
        filters={filterState}
        tagFacets={tagFacets}
        onChange={noop}
        onCycleTag={noop}
        onClear={noop}
        summary="8 total bookmarks"
      />
    </div>
  ),
};

export const Feedback = {
  render: () => (
    <div className="grid max-w-2xl gap-4">
      <Banner tone="success">Bookmark saved.</Banner>
      <Banner tone="warning">URL could not be reached.</Banner>
      <Banner tone="error">Import failed.</Banner>
      <Banner tone="info">The agent plan is ready.</Banner>
      <AgentPlan
        steps={[
          { action: "filterByTag", parameters: { tag: "dev" } },
          { action: "sortByRating", parameters: { order: "descending" } },
        ]}
      />
      <Toast label="Bookmark deleted." actionLabel="Undo" onAction={noop} onDismiss={noop} />
      <div className="flex flex-wrap items-center gap-3">
        <Tag>reference</Tag>
        <Tag onAccent>selected</Tag>
        <StatusDot tone="success" title="Reachable" />
        <StatusDot tone="warning" title="Unreachable" />
        <Kbd>Shift</Kbd>
        <Kbd>E</Kbd>
      </div>
    </div>
  ),
};

export const EmptyCollection = {
  render: () => (
    <EmptyState
      title="No bookmarks yet."
      description="Add a bookmark or import a browser export to get started."
      actions={
        <>
          <Button>Add New</Button>
          <Button intent="secondary">Import</Button>
        </>
      }
    />
  ),
};

export const TabbedContent = {
  render: () => (
    <div className="max-w-2xl rounded-lg bg-primary-bg p-6 shadow-lg">
      <Tabs
        tabs={[
          { value: "import", label: "Import" },
          { value: "export", label: "Export" },
        ]}
        active="import"
        onChange={noop}
      />
      <div className="pt-5">
        <Textarea
          id="story-import"
          label="Bookmark JSON"
          mono
          defaultValue={'[{"title":"GitHub","url":"https://github.com"}]'}
        />
      </div>
    </div>
  ),
};

export const Dialog = {
  parameters: { layout: "fullscreen" },
  render: () => (
    <Modal
      title="Add New Bookmark"
      onClose={noop}
      footer={
        <>
          <Button intent="secondary">Cancel</Button>
          <Button>Save Bookmark</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Input id="dialog-title" label="Title" defaultValue="GitHub" />
        <Input id="dialog-url" label="URL" defaultValue="https://github.com" />
      </div>
    </Modal>
  ),
};
