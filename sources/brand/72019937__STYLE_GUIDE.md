# Cypress Command — Style Guide (quick reference)

## The signature moves

### 1. The trailing amber period.
Every display headline ends with `<span style="color: var(--cc-amber-500)">.</span>`.

- "Ground truth. Delivered."
- "The operating system for real-world businesses."
- "Command surface."
- "Precision to the entry."

### 2. The bracket eyebrow.
Every section starts with a monospace bracket eyebrow in amber.

```html
<div style="font-family: 'JetBrains Mono', monospace; font-size: 12px; letter-spacing: 0.18em; text-transform: uppercase; color: var(--cc-amber-500);">
  [01 — POSITIONING]
</div>
```

Numbering sequence: `[01 — …]`, `[02 — …]`, `[03 — …]` for major sections; `2.1`, `2.2`, `2.3` for sub-items within a section (big amber number as decoration).

### 3. The italic emphasis.
The variable Fraunces optical size + italic pulls a second color out of the headline. This is where the AMBER shows up in serif form.

```html
<h1>
  The operating system for real-world
  <span style="font-style: italic; color: var(--cc-amber-400);
    font-variation-settings: 'SOFT' 60, 'opsz' 144;">businesses.</span>
</h1>
```

### 4. The bracket case-file tag.
Every entity gets a bracket ID. This is what makes it feel like a legal-grade system.

- `[LEASE-042]` (leases)
- `[WO-2081]` (work orders)
- `[GROVE · Q3 2026]` (roster entries)
- `[CASE-4471]` (matters/incidents)

### 5. The ledger line.
Horizontal thin rule + mono labels above it — evokes accounting paper.

```html
<div style="border-top: 1px solid var(--cc-border-med); padding-top: 8px; display: flex; justify-content: space-between;">
  <span style="font-family: 'JetBrains Mono', monospace; font-size: 10px; letter-spacing: 0.14em; text-transform: uppercase; color: var(--cc-fg-muted);">
    [GROVE ROSTER · Q3 2026]
  </span>
  <span style="…same styles…">47 OPERATORS</span>
</div>
```

### 6. The meta ticker.
Every hero, slide, and major section has a bottom meta strip:

```
[01 · POSITIONING]     LEDGER UPDATED · 14:32 CT     GROUND TRUTH. DELIVERED.
```

### 7. The terminal prompt.
Agent output and AI console messages are always in the `--cc-slate` terminal with `▸` amber prompt characters.

## Copywriting cheat sheet

### DO
- "94.2% occupancy — audited monthly, published quarterly."
- "Ledger updated. 14:32 CT."
- "Signed. Filed. Closed."
- "Ground truth. Delivered."
- "Request the packet."
- "The list of what's broken."

### DON'T
- "Experience seamless property management!"
- "🚀 Amazing new AI features!"
- "Leverage our operating platform to unlock value."
- "Reach out and let us know what you think."
- "Roughly 94% occupancy" (be precise, always).
