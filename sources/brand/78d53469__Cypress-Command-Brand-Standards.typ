#import "report-theme.typ": report-theme
#import "@preview/glossarium:0.5.10": make-glossary, register-glossary, print-glossary

#let paper = rgb("#F4EFE2")
#let paper-deep = rgb("#E8E2CD")
#let ink = rgb("#1E1B16")
#let ink-soft = rgb("#5C554A")
#let rule = rgb("#C9BFA8")
#let olive = rgb("#49573C")
#let mustard = rgb("#8F6D0C")
#let terra = rgb("#A44E12")
#let oxblood = rgb("#8A2F1F")

#show: report-theme.with(
  title: "Cypress Command Brand Standards",
  author: "Cypress Command",
  rhythm: "report",
  body-size: 9.5pt,
  running-header: false,
)

#show: make-glossary

#let glossary-entries = (
  (key: "operating-system", short: "operating system", description: "The practical combination of people, process, software, data, and carefully applied AI that helps a business run essential work well."),
  (key: "assessment", short: "Operating System Assessment", description: "A paid diagnostic that establishes how a priority area currently runs and what should be addressed first."),
  (key: "build", short: "Operating System Build", description: "A scoped implementation that redesigns and installs a priority workflow, its information structure, and selected automation."),
  (key: "partnership", short: "Operating Partnership", description: "A limited ongoing engagement that supports adoption, operating review, and system improvement."),
  (key: "terra", short: "Terra", description: "The primary action and editorial accent color, #A44E12."),
  (key: "paper", short: "Paper", description: "The primary light surface color, #F4EFE2."),
  (key: "ink", short: "Ink", description: "The primary text and dark-surface color, #1E1B16."),
  (key: "semantic-ink", short: "semantic ink", description: "An accent color whose use carries an explicit status meaning rather than decoration."),
  (key: "proof-domain", short: "proof domain", description: "A field in which operating experience provides credible examples without limiting the broader market category."),
)
#register-glossary(glossary-entries)

#set text(font: "Inter", lang: "en", region: "us", fill: ink, size: 9.5pt)
#set par(justify: false, leading: 0.72em, spacing: 0.55em)
#set heading(numbering: none)
#show link: set text(fill: terra)
#show heading.where(level: 1): it => block(above: 4pt, below: 10pt, breakable: false)[
  #text(font: "Libertinus Serif", size: 23pt, weight: 700, fill: ink)[#it.body]
]
#show heading.where(level: 2): it => block(above: 12pt, below: 6pt, breakable: false)[
  #text(font: "Inter", size: 12pt, weight: 700, fill: terra)[#it.body]
]
#show heading.where(level: 3): it => block(above: 8pt, below: 4pt, breakable: false)[
  #text(font: "Inter", size: 9.5pt, weight: 700, fill: ink)[#it.body]
]

#let eyebrow(n, label) = block(below: 7pt)[
  #grid(columns: (34pt, 1fr), column-gutter: 8pt,
    text(font: "Inter", size: 8pt, weight: 700, tracking: 0.12em, fill: terra)[#n],
    text(font: "Inter", size: 8pt, weight: 700, tracking: 0.12em, fill: ink)[#upper(label)],
  )
  #v(4pt)
  #line(length: 100%, stroke: 0.6pt + rule)
]

#let small-label(body, color: ink-soft) = text(font: "Inter", size: 7.5pt, weight: 650, tracking: 0.11em, fill: color, upper(body))
#let display(body, size: 30pt, color: ink) = text(font: "Libertinus Serif", size: size, weight: 700, fill: color, body)
#let panel(body, fill: paper-deep, rail: none, inset: 12pt) = block(
  width: 100%,
  fill: fill,
  stroke: if rail == none {0.5pt + rule} else {(left: 3pt + rail, rest: 0.5pt + rule)},
  inset: inset,
  breakable: false,
  body,
)
#let status(label, color) = box(fill: color, inset: (x: 7pt, y: 4pt), radius: 2pt)[
  #text(font: "Inter", size: 7pt, weight: 700, fill: paper, tracking: 0.08em)[#upper(label)]
]
#let swatch(name, hex, color, role, dark-text: false) = block(stroke: 0.5pt + rule, breakable: false)[
  #rect(width: 100%, height: 36pt, fill: color)
  #block(inset: 7pt)[
    #text(size: 8.5pt, weight: 700)[#name] #h(1fr) #text(font: "DejaVu Sans Mono", size: 7pt, fill: ink-soft)[#hex]
    #v(3pt)
    #text(size: 7.5pt, fill: ink-soft)[#role]
  ]
]
#let phase(n, title, copy, color) = panel(rail: color, inset: 10pt)[
  #text(font: "Libertinus Serif", size: 18pt, weight: 700, fill: color)[#n]
  #v(3pt)
  #text(size: 9pt, weight: 700)[#title]
  #v(4pt)
  #text(size: 8pt, fill: ink-soft)[#copy]
]

// Cover
#page(paper: "us-letter", fill: paper, margin: (top: 0.65in, bottom: 0.65in, x: 0.72in), numbering: none, header: none, footer: none)[
  #image("assets/logo-horizontal.svg", width: 2.9in)
  #v(0.45in)
  #line(length: 100%, stroke: 0.7pt + ink)
  #v(0.45in)
  #small-label("Brand standards · Version 1.0 · September 2026", color: terra)
  #v(0.28in)
  #display([Make the work easier to run.], size: 43pt)
  #v(0.18in)
  #text(size: 14pt, fill: ink-soft)[Identity, messaging, applications, and operating discipline for a practical AI systems brand.]
  #v(0.45in)
  #panel(fill: ink, rail: terra, inset: 18pt)[
    #text(font: "Libertinus Serif", size: 22pt, weight: 700, fill: paper)[Practical intelligence for real operations.]
    #v(8pt)
    #text(size: 9pt, tracking: 0.12em, weight: 650, fill: paper-deep)[PEOPLE + SYSTEMS + REAL WORK]
  ]
  #v(1fr)
  #grid(columns: (1fr, 1fr), align: (left, right),
    [#small-label("Cypress Command")],
    [#small-label("Public brand system")],
  )
]

#set page(
  paper: "us-letter",
  fill: paper,
  margin: (top: 0.67in, bottom: 0.62in, x: 0.72in),
  numbering: "1",
  header: context {
    if counter(page).get().first() > 1 {
      grid(columns: (1fr, 1fr),
        small-label("Cypress Command · Brand Standards"),
        align(right)[#small-label("V1.0 · Public")],
      )
      v(4pt)
      line(length: 100%, stroke: 0.4pt + rule)
    }
  },
  footer: context {
    line(length: 100%, stroke: 0.4pt + rule)
    v(4pt)
    grid(columns: (1fr, auto),
      small-label("Practical intelligence for real operations."),
      small-label(str(counter(page).get().first())),
    )
  },
)

#pagebreak()
#eyebrow("00", "How to use this guide")
= One system. Clear roles.

This guide is the public-facing source of truth for the Cypress Command brand. It governs strategy, messaging, identity, and core applications. The separate transition plan is confidential and must not be copied into public materials.

#grid(columns: (1fr, 1fr), gutter: 12pt,
  panel(rail: terra)[
    #small-label("Use this guide for", color: terra)
    #v(8pt)
    Websites, proposals, reports, social media, email signatures, operating diagrams, dashboards, case studies, articles, and vendor handoffs.
  ],
  panel(rail: olive)[
    #small-label("Approval principle", color: olive)
    #v(8pt)
    Keep the system restrained. If a new element does not improve hierarchy, meaning, recognition, or usability, do not add it.
  ],
)

#v(14pt)
#panel(fill: paper, rail: oxblood)[
  #text(weight: 700)[Launch boundary.] Name, mark, domain, handle, entity, credential, client, performance, security, integration, and compliance claims remain unverified until separately documented and approved. Do not add ® or ™ or imply legal clearance.
]

#v(14pt)
#image("assets/design-system-board.png", width: 100%)
#v(4pt)
#text(size: 7.5pt, fill: ink-soft)[Reference board: one visual system applied across editorial, technical, archival, and digital expressions.]

#pagebreak()
#eyebrow("01", "Brand platform")
= What Cypress Command is

#display([An AI-enabled operating systems partner.], size: 28pt, color: terra)

Cypress Command helps owner-led businesses make essential work visible, repeatable, and easier to run. It connects people, workflows, data, software, and carefully applied AI around work that must actually get done.

#grid(columns: (1fr, 1fr), gutter: 12pt,
  panel()[
    #small-label("Primary audience")
    #v(7pt)
    Owner-operators and operating leaders at small to mid-sized companies that have meaningful complexity but no internal transformation function.
  ],
  panel()[
    #small-label("Initial proof domain")
    #v(7pt)
    Commercial real estate ownership and management. It demonstrates fluency in assets, contracts, vendors, recurring work, financial decisions, and consequential handoffs.
  ],
)

== Positioning

For owner-operators whose critical work is spread across people, inboxes, spreadsheets, documents, and disconnected software, Cypress Command designs and implements practical AI-enabled operating systems that make work visible, repeatable, and easier to run.

#panel(fill: ink, rail: terra)[
  #small-label("The value is not more AI", color: paper-deep)
  #v(8pt)
  #text(font: "Libertinus Serif", size: 18pt, weight: 700, fill: paper)[The value is clearer operations with more capacity for the work that matters.]
]

== Differentiators

#table(
  columns: (35%, 65%),
  inset: 7pt,
  stroke: 0.45pt + rule,
  fill: (x, y) => if x == 0 {paper-deep} else {none},
  [*Operator fluency before technology*], [Start from responsibilities, decisions, contracts, cash, assets, customers, and risk—not a preferred software stack.],
  [*AI in service of the system*], [AI is one component within people, process, data, automation, review, and accountability.],
  [*Implementation, not theater*], [Translate operating decisions into useful workflows, tools, routines, documentation, and adoption support.],
  [*Calm rigor*], [Explain what changes, why it matters, who owns it, and how the result will be measured.],
)

#pagebreak()
#eyebrow("02", "Message hierarchy")
= One idea per role

#table(
  columns: (25%, 45%, 30%),
  inset: 7pt,
  stroke: 0.45pt + rule,
  fill: (x, y) => if y == 0 {ink} else if calc.rem(y, 2) == 0 {paper-deep} else {none},
  table.header(
    [#text(fill: paper, weight: 700)[ROLE]],
    [#text(fill: paper, weight: 700)[APPROVED LANGUAGE]],
    [#text(fill: paper, weight: 700)[USE]],
  ),
  [Brand promise], [*Make the work easier to run.*], [Website hero, proposals, primary brand contexts],
  [External tagline], [*Practical intelligence for real operations.*], [Brand sign-off and identity contexts],
  [Launch campaign], [*Build AI into how you actually operate.*], [Launch creative and selected campaign modules],
  [Category descriptor], [*AI-enabled operating systems for owner-led businesses*], [Search, bios, eyebrows, concise descriptions],
)

#v(16pt)
#grid(columns: (1fr, 1fr, 1fr), gutter: 8pt,
  panel(rail: terra)[#small-label("Promise", color: terra) #v(7pt) #text(font: "Libertinus Serif", size: 18pt, weight: 700)[Make the work easier to run.]],
  panel(rail: ink)[#small-label("Tagline") #v(7pt) #text(font: "Libertinus Serif", size: 18pt, weight: 700)[Practical intelligence for real operations.]],
  panel(rail: mustard)[#small-label("Campaign", color: mustard) #v(7pt) #text(font: "Libertinus Serif", size: 18pt, weight: 700)[Build AI into how you actually operate.]],
)

== Brand pillars

#grid(columns: (1fr, 1fr), gutter: 10pt,
  panel()[*Practical intelligence* \ Intelligence becomes useful action, a reliable source of truth, and a clear next step.],
  panel()[*People and systems, together* \ Human judgment and accountability remain explicit while systems reduce avoidable effort.],
  panel()[*Real work, made visible* \ Recurring work becomes easier to see, own, complete, and improve.],
  panel()[*A more capable tomorrow* \ The system compounds through stronger information, routines, and learning.],
)

#pagebreak()
#eyebrow("03", "Offer architecture")
= A simple commercial path

#display([Assessment → Build → Partnership], size: 26pt)

The offers progress from a paid, bounded diagnosis to implementation and then measured ongoing improvement. The four delivery phases explain how each offer is delivered; they are not competing services.

#grid(columns: (1fr, 1fr, 1fr), gutter: 9pt,
  panel(rail: olive)[#small-label("01 · Operating System Assessment", color: olive) #v(7pt) Establish a factual view of one priority operating area and decide what should happen first.],
  panel(rail: terra)[#small-label("02 · Operating System Build", color: terra) #v(7pt) Design, configure, test, document, and install the priority operating system.],
  panel(rail: mustard)[#small-label("03 · Operating Partnership", color: mustard) #v(7pt) Sustain adoption and improve the system as business needs change.],
)

#v(18pt)
#small-label("Delivery method")
#v(8pt)
#grid(columns: (1fr, 1fr, 1fr, 1fr), gutter: 7pt,
  phase("01", "Assess", "See the work as it is.", olive),
  phase("02", "Design", "Turn the opportunity into a workable system.", mustard),
  phase("03", "Install", "Put the system into real work.", terra),
  phase("04", "Operate", "Keep improving what is now part of the business.", ink),
)

#v(10pt)
#align(center)[#small-label("SEE THE WORK · BUILD WHAT HELPS · MAKE IT STICK")]

== Priority use cases

#table(
  columns: (1fr, 1fr), inset: 7pt, stroke: 0.45pt + rule,
  [*Recurring workflow management*], [Ownership, cadence, exceptions, and follow-through],
  [*Contract and document intelligence*], [Useful information prepared for accountable review],
  [*Reporting and decision preparation*], [Timely context, consistent inputs, and clearer signals],
  [*Asset and portfolio visibility*], [Operating status, open issues, priorities, and decisions],
  [*Handoff and follow-up systems*], [Less dependence on memory and inbox chasing],
  [*Business-development operations*], [Structured pipeline, preparation, and next-action discipline],
)

#pagebreak()
#eyebrow("04", "Voice and language")
= Editorial. Precise. Calm. Practical. Human-led.

Cypress Command sounds like a trusted operator at the table: observant before opinionated, direct without being severe, and confident without theatrics.

#table(
  columns: (1fr, 1fr), inset: 8pt, stroke: 0.45pt + rule,
  fill: (x, y) => if y == 0 {ink} else {none},
  table.header([#text(fill: paper, weight: 700)[DO]], [#text(fill: paper, weight: 700)[DO NOT]]),
  [Lead with the business problem and the work being improved.], [Lead with model names, novelty, or generic transformation.],
  [Use concrete nouns: workflow, lease, vendor, forecast, decision, handoff.], [Use inflated abstractions: revolution, disruption, synergy, next-gen.],
  [Explain AI as an aid to organize, prepare, route, draft, and detect.], [Imply AI decides, replaces accountable people, or runs the business alone.],
  [Respect the reader’s experience and show a practical path forward.], [Describe the current operation as broken, backward, or obsolete.],
  [State boundaries, review points, and what remains human.], [Promise certainty, autonomy, compliance, security, or guaranteed ROI.],
)

== Preferred language

#panel(rail: olive)[Practical intelligence · operating system · real work · make work visible · dependable follow-through · clear ownership · useful automation · better signals · capable teams · measurable operating change]

== Avoid

#panel(rail: oxblood)[Unlock · revolutionize · frictionless · autonomous enterprise · AI magic · replace your team · set it and forget it · guaranteed ROI · best-in-class · disruption · future-proof]

#panel(fill: paper, rail: terra)[
  #text(weight: 700)[AI boundary.] AI may organize information, prepare work, identify patterns, draft, and route. Accountable people own decisions, relationships, exceptions, approval, and oversight.
]

#pagebreak()
#eyebrow("05", "Logo system")
= The squared spiral C

#grid(columns: (38%, 62%), gutter: 18pt,
  [#align(center + horizon)[#image("assets/mark-terra.svg", width: 1.85in)]],
  [The approved symbol is a single continuous squared spiral/C with a detached center terminal, taken directly from the uploaded brand pages. It represents command of the facts, connected systems, and a repeatable operating loop. The geometry is structured and compact rather than soft, decorative, or technological.],
)

== Approved configurations

#grid(columns: (1fr, 1fr), gutter: 12pt,
  panel()[#small-label("Primary horizontal") #v(10pt) #image("assets/logo-horizontal.svg", width: 100%) #v(8pt) Website headers, proposals, reports, stationery, and first exposure.],
  panel()[#small-label("Reversed") #v(10pt) #block(fill: ink, inset: 12pt)[#image("assets/logo-reversed.svg", width: 100%)] #v(8pt) Dark presentation covers, controlled photography, and Ink surfaces.],
)

== Clear space and minimum size

Use a minimum clear space of *2x* around every logo configuration, where x equals the recurring structural stroke width inside the mark. The emblem-only configuration may reduce to *1x* only in constrained interface chrome.

#table(
  columns: (40%, 30%, 30%), inset: 7pt, stroke: 0.45pt + rule,
  table.header([*Configuration*], [*Digital minimum*], [*Print minimum*]),
  [Primary horizontal], [120 px wide], [30 mm wide],
  [Stacked], [88 px wide], [22 mm wide],
  [Emblem only], [16 px; prefer 20+], [5 mm; prefer 7+],
)

#panel(rail: oxblood)[Do not redraw, stretch, rotate, outline, crop, pattern, texture, shadow, or rebuild the mark. Do not add ™ or ® until counsel authorizes it.]

#pagebreak()
#eyebrow("06", "Color system")
= Ink on paper. Meaning in every accent.

Paper and Ink establish the environment. Terra is the primary action and editorial accent. Olive, Mustard, and Oxblood carry explicit status meaning; they are not a decorative rainbow.

#grid(columns: (1fr, 1fr, 1fr), gutter: 8pt,
  swatch("Paper", "#F4EFE2", paper, "Primary surface"),
  swatch("Paper Deep", "#E8E2CD", paper-deep, "Secondary surface"),
  swatch("Ink", "#1E1B16", ink, "Primary text / dark surface"),
  swatch("Ink Soft", "#5C554A", ink-soft, "Secondary text"),
  swatch("Rule", "#C9BFA8", rule, "Dividers / structure"),
  swatch("Olive", "#49573C", olive, "Success / stable"),
  swatch("Mustard", "#8F6D0C", mustard, "Progress / attention"),
  swatch("Terra", "#A44E12", terra, "Action / editorial"),
  swatch("Oxblood", "#8A2F1F", oxblood, "Risk / critical"),
)

== Accessible pairings

#table(
  columns: (46%, 18%, 36%), inset: 6pt, stroke: 0.45pt + rule,
  table.header([*Pairing*], [*Ratio*], [*Use*]),
  [Ink on Paper], [14.95:1], [All text and essential UI],
  [Ink Soft on Paper], [6.41:1], [Supporting text and metadata],
  [Paper on Olive], [6.75:1], [All text and icons],
  [Paper on Terra], [4.97:1], [All text and icons],
  [Paper on Oxblood], [7.30:1], [All text and icons],
  [Paper on Mustard], [4.19:1], [Large/bold text and non-text UI only],
)

Use a written status label or icon with every semantic color. Color alone is never the message.

#pagebreak()
#eyebrow("07", "Typography")
= A classic voice for a practical system

#grid(columns: (47%, 53%), gutter: 18pt,
  [
    #text(font: "Libertinus Serif", size: 34pt, weight: 700)[The operating system]
    #v(8pt)
    #text(font: "Libertinus Serif", size: 17pt, style: "italic", fill: ink-soft)[Ideas to practice. Systems to build.]
  ],
  [
    #small-label("Editorial display")
    #v(5pt)
    *Libertinus Serif* — headings, quotations, essays, cover statements, and key editorial numbers.
    #v(10pt)
    #small-label("Functional sans")
    #v(5pt)
    *Inter* — body copy, UI, labels, navigation, diagrams, tables, and the wordmark.
    #v(10pt)
    #small-label("Fallback")
    #v(5pt)
    Georgia for serif contexts; Arial or Helvetica for functional sans contexts.
  ],
)

== Type scale

#table(
  columns: (18%, 28%, 27%, 27%), inset: 6pt, stroke: 0.45pt + rule,
  table.header([*Style*], [*Family / weight*], [*Desktop*], [*Mobile*]),
  [Display], [Libertinus Bold], [64 / 64], [44 / 48],
  [H1], [Libertinus Semibold], [48 / 52], [36 / 40],
  [H2], [Libertinus Semibold], [32 / 38], [28 / 34],
  [H3], [Inter Semibold], [24 / 30], [22 / 28],
  [Body], [Inter Regular], [16 / 26], [16 / 25],
  [Caption], [Inter Medium], [12 / 16], [12 / 16],
  [Eyebrow], [Inter Semibold], [11 / 14], [11 / 14],
)

#panel(rail: terra)[A canonical page begins with a small Inter eyebrow, a substantial Libertinus title, and an Inter deck. Limit display text to 8–12 words and no more than three lines.]

#pagebreak()
#eyebrow("08", "Layout and graphic language")
= Structure before decoration

== Grid and spacing

Use a 12-column desktop grid, 8-column tablet grid, and 4-column mobile grid. Start from a 4 px micro-unit and an 8 px rhythm. Approved spacing values are 4, 8, 12, 16, 24, 32, 48, 64, 96, and 128 px.

#grid(columns: (1fr, 1fr, 1fr), gutter: 8pt,
  panel()[#small-label("Rules") #v(6pt) 1 px Rule for ordinary structure; 2 px Ink for a major boundary or selected state.],
  panel()[#small-label("Rails") #v(6pt) 2–4 px semantic color at the top or left of a stage, card, chapter, or alert.],
  panel()[#small-label("Surfaces") #v(6pt) Paper or Paper Deep, square or minimally softened corners, and no default shadows.],
)

== Imagery

Use real places, real people, and real progress: operating teams, storefronts, regional commercial real estate, worksites, material details, planning sessions, records, and built environments. Favor natural light, practical viewpoints, restrained grading, and compositions with quiet space.

#panel(rail: oxblood)[Avoid generic server racks, glowing blue AI graphics, robots, holograms, synthetic faces, staged handshakes, neon, gratuitous technology motifs, and overly polished lifestyle imagery.]

== Diagrams and data

Every diagram states its point, defines inputs and outputs, shows one reading direction, makes ownership and review visible, and ends with an observable outcome. Data visualizations use Ink as the primary series, Rule as structure, and one semantic ink for the explained highlight. Label directly where possible.

#pagebreak()
#eyebrow("09", "Digital system")
= Functional, calm, and explicit

#grid(columns: (1fr, 1fr), gutter: 12pt,
  panel()[
    #small-label("Primary action", color: terra)
    #v(10pt)
    #box(fill: terra, inset: (x: 14pt, y: 8pt), radius: 2pt)[#text(fill: paper, weight: 700)[Start an assessment →]]
    #v(10pt)
    Terra fill, Paper label, 44 px minimum target, one clear action.
  ],
  panel()[
    #small-label("Secondary action")
    #v(10pt)
    #box(fill: paper, stroke: 1pt + ink, inset: (x: 14pt, y: 8pt), radius: 2pt)[#text(fill: ink, weight: 700)[See what we build]]
    #v(10pt)
    Paper surface, Ink border, explicit label, visible focus treatment.
  ],
)

#v(12pt)
#grid(columns: (1fr, 1fr, 1fr, 1fr), gutter: 7pt,
  [#status("Complete", olive)],
  [#status("In progress", mustard)],
  [#status("Active", terra)],
  [#status("Blocked", oxblood)],
)

== Component rules

Inputs use an always-visible label, Paper surface, 1 px Rule border, 44 px minimum height, and clear help or error text. Status chips include a written label. Controls support keyboard access, visible focus, reduced motion, and text resizing. Motion is short and functional; decorative loops and parallax are prohibited.

== Dark mode

#panel(fill: ink, rail: terra)[
  #text(fill: paper)[Use Ink as the canvas, Paper as primary text, and Paper Deep as supporting text. Recessed surfaces are low-opacity Paper Deep over Ink. Terra remains the primary action. Semantic colors keep the same meaning. Avoid pure black, electric blue, glass effects, neon, and indiscriminate inversion.]
]

#pagebreak()
#eyebrow("10", "Core applications")
= One system, four expressions

#table(
  columns: (18%, 22%, 60%), inset: 7pt, stroke: 0.45pt + rule,
  table.header([*Expression*], [*Primary jobs*], [*Operating rule*]),
  [Editorial], [Brand, web, proposals], [Generous Paper space, strong serif thesis, measured imagery, one clear next action.],
  [Technical], [Flows, SOPs, systems], [Numbered modules, direct arrows, explicit inputs, owners, review, outputs, and iteration.],
  [Archival], [Articles, reports, research], [Figure labels, captions, evidence-led tables, quiet quotations, and useful metadata.],
  [Digital Command], [Dashboards, portals, UI], [Inter-led navigation, calm cards, visible states, strong hierarchy, and no decorative dashboard clutter.],
)

== Application standards

#grid(columns: (1fr, 1fr), gutter: 10pt,
  panel(rail: terra)[*Website hero* \ Use one proposition, one supporting paragraph, no more than two actions, and authentic operating context.],
  panel(rail: terra)[*Proposal cover* \ Use a specific operating-system title, one Terra spine, disciplined metadata, and client/Cypress credits.],
  panel(rail: mustard)[*Thought leadership* \ Lead with a useful thesis, relevant image or figure, narrow reading measure, and clear source context.],
  panel(rail: olive)[*Dashboard* \ Present consequential metrics, direct units and status, evidence-led charts, and a small set of actions.],
  panel(rail: ink)[*Operating flow* \ Show Assess, Design, Install, Operate, followed by a visible continuous-improvement path.],
  panel(rail: oxblood)[*Critical alert* \ Use Oxblood only for genuine risk, include a recovery action, and never rely on color alone.],
)

#pagebreak()
#eyebrow("11", "Launch copy starter")
= Make the work easier to run.

#small-label("Homepage hero", color: terra)
#v(6pt)
#display([Make the work easier to run.], size: 30pt)
#v(8pt)
Cypress Command builds practical systems that connect people, workflows, data, and AI around the work your business depends on—so your team can act with more clarity and capacity.

#v(8pt)
#box(fill: terra, inset: (x: 14pt, y: 8pt), radius: 2pt)[#text(fill: paper, weight: 700)[Start with an operating system assessment]]
#h(8pt)
#box(stroke: 1pt + ink, inset: (x: 14pt, y: 8pt), radius: 2pt)[#text(weight: 700)[See what we build]]

== Supporting modules

#grid(columns: (1fr, 1fr), gutter: 12pt,
  panel()[
    #small-label("Problem") #v(6pt)
    *Real work rarely lives in one system.* Important work moves through people, inboxes, meetings, documents, spreadsheets, and software. Cypress Command makes that operating reality visible before changing it.
  ],
  panel()[
    #small-label("Approach") #v(6pt)
    *Build the system around the work.* We begin with decisions, handoffs, exceptions, systems, and people—not with tools. Then we install the smallest useful system and improve it with the team.
  ],
  panel()[
    #small-label("AI role") #v(6pt)
    *AI where it is useful. People where judgment matters.* AI supports preparation, organization, pattern detection, drafting, and routing. People retain accountable control.
  ],
  panel()[
    #small-label("Closing CTA") #v(6pt)
    *Start with the work that is hardest to run.* Bring one process, bottleneck, or operating question. We will help determine what is worth changing and what should remain human.
  ],
)

#pagebreak()
#eyebrow("12", "Proof and claims")
= Show the work. Do not overstate it.

Use operator depth across commercial real estate, contracts, finance, operations, business development, AI systems, and automation only after the precise biographical statement is verified. Legal experience may support operational judgment; it must not imply legal advice or representation.

#table(
  columns: (40%, 60%), inset: 7pt, stroke: 0.45pt + rule,
  table.header([*Do not claim*], [*Required boundary*]),
  [Autonomous operations or “runs itself”], [State the human owner, review point, exception path, and approval authority.],
  [Guaranteed savings, revenue, time reduction, or ROI], [Use client-specific measured results only with baseline, method, timeframe, context, and permission.],
  [Secure, compliant, private, or risk-free], [Describe reviewed controls only; do not imply a certification or guarantee.],
  [Best, leading, first, proprietary, or proven at scale], [Use plain descriptions and evidence that can be shown.],
  [Named clients, metrics, testimonials, credentials], [Verify accuracy, approval, permissions, and substantiation before publication.],
)

== Case-study proof standard

Every case study includes context, operating problem, work completed, system built, adoption approach, measured result, client quote if permissioned, and the work that remains under human judgment. A precise qualitative result is better than an unsupported percentage.

#panel(rail: oxblood)[*Mandatory launch blockers:* professional name and trademark clearance; a final legal-entity and trade-name decision; domain and handle control; documented verification of every factual public claim.]

#pagebreak()
#eyebrow("13", "Production and governance")
= Make the system easy to preserve

== Digital delivery

Use SVG as the web master and PDF/vector formats for print. PNG is a compatibility format, not the logo source. Export web assets in sRGB, include meaningful alternative text, test focus and contrast, and never embed essential body text in images.

== Print delivery

Use final trim size with 3 mm / 0.125 in bleed when required, vector rules and icons, embedded or properly licensed fonts, and a physical proof for Terra spines or large Ink fields. Hex values remain the digital source of truth; printer-specific CMYK or spot equivalents require proofing and approval.

== File governance

Keep one approved master folder. Archive superseded assets; do not overwrite them silently. Any new lockup, sub-brand, color, or mark alteration requires brand-owner review. Record version, owner, date, and intended use.

#table(
  columns: (28%, 22%, 50%), inset: 7pt, stroke: 0.45pt + rule,
  table.header([*Asset*], [*Master format*], [*Use*]),
  [Logo], [SVG / PDF], [Web, print, templates, vendors],
  [Raster logo], [PNG], [Applications that cannot render vector],
  [Color tokens], [CSS / JSON], [Web, product UI, design systems],
  [Document templates], [DOCX / SVG], [Letters, proposals, cases, quick production],
  [Messaging source], [Markdown], [Web copy, proposals, social, review],
  [Migration plan], [Confidential Markdown], [Authorized transition team only],
)

#pagebreak()
#eyebrow("14", "Glossary")
= Shared language

#print-glossary(glossary-entries, show-all: true, disable-back-references: true)

#v(18pt)
#panel(fill: ink, rail: terra)[
  #text(font: "Libertinus Serif", size: 18pt, weight: 700, fill: paper)[Good systems do not replace human judgment. They give it room to do its best work.]
]

#v(18pt)
#small-label("Cypress Command · Brand Standards V1.0 · 20 September 2026")
