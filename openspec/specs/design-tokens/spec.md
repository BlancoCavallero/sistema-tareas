# design-tokens Specification

## Purpose

A single global token foundation for the organizer: one `:root` stylesheet declaring semantic design tokens (color, type, space, radius, focus, motion), imported once from the root layout. Components keep Svelte-scoped styles and consume tokens through `var(--token)`; dark mode follows `prefers-color-scheme`. Scope is the calendar UI plus the token foundation — a full restyle of unrelated pages is out of scope.

## Requirements

### Requirement: Single global token source

The system MUST declare global design tokens as CSS custom properties on `:root` in exactly one stylesheet, imported exactly once from the root layout. Components MUST consume tokens via `var(--token)` and MUST NOT redeclare the global token set. New and touched components MUST reference tokens; untouched pages are out of scope.

#### Scenario: Token file imported once

- GIVEN the root layout
- WHEN the app renders
- THEN the global token stylesheet is loaded exactly once

#### Scenario: Component consumes a token

- GIVEN a component that styles a surface
- WHEN its scoped styles are inspected
- THEN it uses `var(--...)` rather than a raw value

### Requirement: Semantic color tokens with light/dark parity

Color tokens MUST be named by role and MUST use identical names in light and dark with only their values changing. Dark values MUST be applied through `@media (prefers-color-scheme: dark)`, and `color-scheme` MUST be declared on the root. Token pairings MUST meet WCAG AA contrast: body text at least 4.5:1 and UI/graphic elements at least 3:1.

#### Scenario: Same names across schemes

- GIVEN the light and dark token declarations
- WHEN both are compared
- THEN every color token name exists in both

#### Scenario: Dark preference applies dark values

- GIVEN a device set to dark mode
- WHEN the page renders
- THEN the dark token values are applied

#### Scenario: Native UI is themed

- GIVEN the root element
- WHEN it is inspected
- THEN `color-scheme` is declared

### Requirement: Focus-visible indicator

Interactive elements MUST show a visible focus indicator using `:focus-visible`, with an outline and offset meeting at least 3:1 contrast. Pointer interaction MUST NOT draw the ring.

#### Scenario: Keyboard focus shows the ring

- GIVEN an interactive element reached by keyboard
- WHEN it receives focus
- THEN the focus indicator is visible

#### Scenario: Pointer click does not show the ring

- GIVEN an interactive element
- WHEN it is activated with a pointer
- THEN no focus ring is drawn

### Requirement: Reduced motion

Non-essential transitions and animations MUST be disabled under `@media (prefers-reduced-motion: reduce)`, and interaction durations SHOULD stay at or below 300 ms.

#### Scenario: Reduced motion is honored

- GIVEN a device requesting reduced motion
- WHEN a component with a transition renders
- THEN the non-essential transition is disabled

### Requirement: Type and space scales

The token set MUST define a type scale and a spacing scale. Components MUST use these tokens for typography and spacing instead of ad-hoc values.

#### Scenario: Spacing comes from the scale

- GIVEN a component that sets padding
- WHEN its styles are inspected
- THEN the value is a spacing token

### Requirement: Non-color state cues

State styling MUST NOT rely on color alone: each state, such as overdue, MUST be paired with a text label, icon, or shape.

#### Scenario: Overdue is not color-only

- GIVEN an objective shown as overdue
- WHEN the chip renders
- THEN it shows a text label in addition to its color
