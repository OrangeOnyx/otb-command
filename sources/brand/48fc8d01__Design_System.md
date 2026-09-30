# Cypress Command Design System v1

Version 1.1.1 | 22 September 2026


## Practical systems. Smarter operations.

Warm Paper. Deep Ink. Terra-led intent. One system across documents, interfaces and decisions.


### SPECIFICATION RELEASE / 1.1.1

22 September 2026
Light + dark / four expressions / one consistent mark


### A practical standard

A reusable visual and interaction specification built from the established conversation and recovered reference. This package defines the new design system; it does not indicate that existing public sites or products have migrated.


## Read the system

Start with the foundation. Use semantic roles in production. Choose one dominant expression per artifact.


### Pages 03-11 / Foundation

Brand principles, current authority, Terra logo, exact color roles, accessible pairings and typography.


### Pages 12-18 / Mechanics

Spacing and grids, material tokens, interaction states, components, navigation and data states.


### Pages 19-23 / Visual language

Icons, imagery, diagrams, charts, four expression modes and dark translation.


### Pages 24-29 / Applications

Supplied light/dark boards and guidance for website, article, report, proposal, SOP, deck, dashboard and social.


### Pages 30-34 / Stewardship

Governance, implementation, reference reconciliation, source authority and acceptance. PDF bookmarks provide direct access to every page.


## Clarity is the identity

Cypress Command should feel intelligent, durable, human and operational. The system makes complex work easier to read and act on.


### Approved company tagline

Practical systems. Smarter operations. Supporting description: We design and implement AI, software, and workflows around how your business operates. Use the tagline consistently with Cypress Command. Keep it as live text beside the logo, preserving logo clear space; do not redraw the outlined wordmark. The editorial operating-system phrase describes the design, not a second company tagline.


### Five working principles

Structure before decoration. Meaning before color. Evidence before claims. Restraint before novelty. Consistency before local invention. Warmth comes from typography, paper and human subject matter, not visual noise.


### Visual hierarchy

Use color to clarify information hierarchy: Paper/Ink for the reading foundation; Terra for the primary action or focal idea; Olive for supporting structure and verified progress; Mustard for attention and review; Oxblood for a deliberate editorial feature or an explicitly labeled exception. Match color strength to importance. Do not assign colors simply by item order.


### Brand architecture

Cypress Command remains the master identity. Named products and services use a typographic descriptor under the existing mark; they do not acquire independent palettes. On The Boulevard may appear as an accurately sourced case study, never as a Cypress product or invented endorsement.


## The mark, in Terra

Retain the existing symbol geometry and outlined wordmark. The current conversation authorizes a new color system: Terra leads the mark.


### New production masters

Use cc-v1-horizontal-light.svg on Paper: Terra #A44E12 symbol and Ink #1E1B16 wordmark. Use cc-v1-horizontal-dark.svg on Night: Terra #D2802F symbol and Paper #F4EFE2 wordmark. These are color-only derivatives of the existing vector geometry, matching the new direction.


### Clear space and minimums

One core width of clear space on all sides: the original core is 48 units within a 168 x 160 symbol envelope. Horizontal SVGs already include padding. Minimum export width: 260 CSS px / 65 mm. Standalone standard mark: 24 px high / 12.7 mm. Use the standard Terra mark at 24 px or larger; a new Terra micro variant requires dedicated small-size testing.


### Placement

Align the visible mark optically with the content column while preserving built-in SVG padding. Use the standalone mark when the brand name is already stated in nearby text. On photography, provide a solid Paper or Ink holding area with clear space.


### Keep the form coherent

Do not distort, remove the square, change corner geometry, add effects or rebuild the outlined wordmark from a font. Do not scatter different logo colors through one artifact. A new color treatment is allowed when approved for the current system; past brand colors are not binding.


## The warm foundation

The light values below are recovered from the source conversation and visual reference. Hex values are authoritative sRGB; RGB values are exact equivalents.


### Paper / #F4EFE2 / 244, 239, 226

Default canvas; warm, quiet and untextured behind functional content.


### Paper Deep / #EAE2CD / 234, 226, 205

Secondary surfaces, plates and grouped areas. Never rely on the subtle surface change alone to identify a control. Raised Paper #FAF6EC adds a clean lifted surface. Color family tints are available for supporting regions; they are no longer limited to alerts.


### Ink / #1E1B16 / 30, 27, 22

Primary text, key lines and neutral information. Ink Soft #5C554A (92, 85, 74) is secondary text.


### Rule / #C9BFA8 / 201, 191, 168

Decorative dividers and table rules only. Control boundary #827765 (130,119,101) is a new production token with stronger contrast.


## Color earns its place

Color communicates importance, grouping and action. Use a strong field for the focal idea, soft tints for supporting groups, and neutral surfaces for detail. More color should produce clearer hierarchy, not more competing signals.


### Terra / #A44E12 / 164, 78, 18

Principal action, link, active navigation and editorial marker. One high-priority action per decision area. Hover #8F410E; pressed #79360B; on-action Paper #F4EFE2. Small links on either Paper surface use action-text #95450F; this avoids the source Terra failing normal-text contrast on Paper Deep.


### Olive / #49573C / 73, 87, 60

Olive supports grounded editorial panels, research sections and process diagrams through brand-olive roles. In functional status components, semantic success means verified or complete and includes a check and label. Soft surface #E5E8DC.


### Mustard / #8F6D0C / 143, 109, 12

Mustard supports highlights, section dividers and presentation plates through brand-mustard roles. Semantic warning remains caution/review. Use #795B08 for small warning text on Paper. Soft surface #F2E7C6; white #FFFFFF on strong Mustard; do not use Paper on that strong fill.


### Oxblood / #8A2F1F / 138, 47, 31

Oxblood may anchor an editorial feature, a cover or an archival panel through brand-oxblood roles. Semantic danger still means error, risk or destructive action and uses an explicit label/icon. Soft surface #F0DFD8. Avoid an Oxblood decorative block next to an error that could be confused with it.


## Night is warm, too

The reference already defines the night palette. It is a deliberate translation, never a browser inversion filter.


### Foundation / source values

Night #181813 (24,24,19); Night Raised #262218 (38,34,24); text Paper #F4EFE2; secondary #B8B4A2 (184,180,162); decorative Rule #48463A (72,70,58). New control boundary #827C68 (130,124,104).


### Accent / source values

Terra #D2802F (210,128,47); Olive #9AA989 (154,169,137); Mustard #CFA032 (207,160,50); Oxblood #C96455 (201,100,85). Preserve the same semantic meaning across modes.


### Interaction / v1 additions

Terra hover #E09545; pressed #BD7027; on-action #181813. Oxblood hover #D77B6D; pressed #C96455; on-danger #181813. Success tint #272D22; warning tint #302919; danger tint #32211C. Pressed danger retains the default fill and adds a 2 px inset on-danger keyline; do not darken it below the readable threshold.


### Safe danger text

Source Oxblood #C96455 is retained as the danger fill and indicator. Use the brighter #D87969 for small danger text on Night Raised and danger-tinted panels. Do not assume that a color passing on Night passes on every raised surface.


## Contrast is a pairing

Validate foreground against the actual adjacent background. A named color is never inherently accessible.


### Required thresholds

Normal text: 4.5:1. Large text: 3:1 at 24 CSS px regular or approximately 18.67 px bold and above. Meaningful control boundaries and graphic indicators: 3:1. The included calculated matrix lists actual pairs; ratios are not rounded up to pass.


### Structural rules

Use color plus text, shape or icon for status. Underline links in prose. Keep labels visible; placeholders are examples, not labels. The source Rule colors are decorative only and must not outline inputs as their sole boundary.


### Interaction baseline

Use at least 44 x 44 CSS px for primary touch targets as a system preference. WCAG 2.2 AA specifies 24 x 24 px with defined exceptions. Provide visible keyboard focus, meaningful reading order and focused controls that remain unobscured.


### Verification boundary

Pairing checks do not establish whole-product WCAG compliance. Check keyboard use, names, errors, zoom, reflow at 320 CSS px and screen-reader output in the implementation. The guide PDF is a visual reference, not a certified tagged accessible PDF. See editable HTML and Markdown for selectable source content.


## Verified contrast pairs

Computed using the WCAG sRGB relative-luminance formula. The complete CSV includes all specified text, control and action states.


## Three voices, one hierarchy

Archivo supplies structure. Besley supplies editorial depth. Courier Prime supplies technical evidence.


### Archivo / structural sans

400 for interface copy; 600 for controls and labels; 700 for section headings; 900 for major structural statements. Use -0.02em tracking only above 32 px. Avoid tightly tracked uppercase paragraphs.


### Besley / editorial serif

400 for long-form reading; 600 for editorial display and selected pull quotes. Default article text 18/29 px. Use for a cover thesis, essay lead or quotation, never every dashboard label.


### Courier Prime / metadata

400 for identifiers, figure labels, code excerpts, timestamps and measured values. Default 12/17 px, 0.02em tracking. Restrict uppercase metadata to short labels; essential instructions belong in body type.


### Font continuity and delivery

The outlined logo wordmark geometry remains unchanged and need not use Archivo. Bundled fonts are from Google Fonts with their OFL licenses. Self-host the supplied files. Fallbacks: Arial for Archivo, Georgia for Besley, Courier New for Courier Prime. Never rasterize body copy.


## A measured type scale

Sizes are CSS px; line height is explicit. Print uses its own point scale instead of shrinking a website.


### Display / editorial titles

display 64/68, Besley 600; h1 48/54, Archivo 700; h2 32/38, Archivo 700; h3 24/30, Archivo 600. On narrow screens display becomes 40/46 and h1 becomes 36/42.


### Reading / interface

lead 22/32 Besley 400; article 18/29 Besley 400; body 16/24 Archivo 400; small 14/20 Archivo 400; label 14/20 Archivo 600; mono 12/17 Courier Prime 400. Do not use 12 px metadata for core instructions.


### Print / presentation

US Letter or A4 reports: body 10.5/15 pt, h1 28/32 pt, h2 18/23 pt, captions 9/12 pt. Decks at 1920 x 1080: title 64/72 px, body 32/44 px, source 20/28 px. Keep presentation text short enough to preserve size.


### Reading discipline

Body measure 60-75 characters; article maximum 68ch. Left align paragraphs; never force justified UI copy. Use sentence case, typographic apostrophes where supported, tabular numeric alignment and consistent currency precision. Never truncate amounts or critical instructions.


## Space is structure

A four-pixel base creates predictable rhythms across dense operational screens and generous editorial pages.


### Spacing tokens / px

0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96. Label-to-field: 8. Related controls: 12. Card padding: 24 (16 on mobile). Section gap: 64 desktop / 40 mobile. Editorial hero gap: 96 desktop / 48 mobile.


### Responsive web grid

Below 768 px: 4 columns, 16 px gutter, 20 px margin. 768-1199 px: 8 columns, 24 px gutter, 32 px margin. At 1200 px and above: 12 columns, 24 px gutter, 48 px minimum margin, content max 1280 px. Breakpoints are content-driven defaults.


### Document + presentation grid

US Letter 612 x 792 pt or A4 595 x 842 pt. Minimum margin 42 pt; 6 columns with 12 pt gutters. Reading pages use one column, reference tables may span all six. Deck: 1920 x 1080, 96 px safe margin, 12 columns and 32 px gutters.


### Responsive behavior

Reflow content in reading order. Side annotations move below the associated text. Avoid fixed heights on text cards. Tables may scroll in a labeled region; forms, headings and paragraphs must not require horizontal scrolling.


## Depth with purpose

Shadows are allowed and useful. Keep reading surfaces quiet; use soft, directional depth to distinguish lifted objects and temporary layers.


### Edges

Radius none 0; small 2 px for badges; control 4 px; panel 8 px; pill 999 px only for switches and compact status lozenges. Editorial pages and diagrams are predominantly square. Border hairline 1 px; strong 2 px; print rule 0.5 pt.


### Depth

Level 0: flat documents, tables and reading surfaces. Level 1: selected specimens, interactive tiles or raised panels; offset 3/12 px with 10/28 px blur at .10/.05 Ink opacity. Level 2: menus, popovers and dialogs; offset 10/24 px, blur 24/56 px at .14/.10. Dark variants use black at .24/.14 and .34/.24 with a lighter raised surface.


### Motion

Fast 120 ms, standard 180 ms, deliberate 240 ms; easing cubic-bezier(.2,0,0,1). Animate opacity or a maximum 4 px translation for menus. Avoid parallax, bouncing counters and ambient motion. Reduced-motion preference removes nonessential transitions.


### Layering

Base 0; sticky navigation 10; dropdown 20; overlay 30; dialog 40; toast 50. A toast cannot obscure dialog controls. Focus uses a 2 px semantic focus outline with 3 px surface offset; verify on filled controls as well as on the canvas. Never apply shadows to every content block. Hover elevation belongs only to an interactive object; static text does not lift. A shadow cannot replace a required control boundary or focus indicator.


## Every state has a contract

Components inherit semantic tokens. A component cannot invent a new local shade, motion duration or status meaning.


### Shared anatomy

Label, content, optional leading icon, optional trailing action, optional helper or error. Keep DOM reading order aligned with visual order. Use semantic HTML elements first. IDs connect labels, descriptions and errors.


### Default / hover / pressed / focus

Default uses role tokens. Hover changes action fill and may underline links. Pressed uses the dedicated pressed fill. Focus remains visible independently of hover. Selected states include a check, underline or shape change rather than color alone.


### Disabled / busy

Disabled uses secondary text on the neutral secondary surface and aria-disabled or native disabled as appropriate; explain why an action is unavailable nearby. Busy preserves width and label (“Saving…”), blocks duplicate submission and exposes aria-busy. Never communicate disabled state only through opacity.


### Component naming

CcButton, CcField, CcSelect, CcCheckbox, CcRadio, CcSwitch, CcCard, CcTable, CcAlert, CcTabs, CcNavigation, CcDialog, CcProgress and CcDataState. This package specifies behavior and supplies visual examples; it is not a tested JavaScript component framework.


## Actions and entry

Make the intended action obvious. Keep the user’s work intact when validation fails.


### Button / CcButton

Anatomy: label, optional 16 px icon, 8 px gap; 16 px horizontal padding; minimum height 44 px. Variants: primary Terra, secondary outlined, tertiary underlined text, danger Oxblood. Primary uses on-action text; danger uses on-danger. Use a button for actions and an anchor for navigation.


### Field / CcField

Persistent label 14/20, helper 14/20, input text 16/24; 44 px minimum height, 12 px horizontal padding, 4 px radius and control-border outline. Textarea minimum 120 px tall. Required status is stated in text. Invalid state adds a danger border, icon and linked error text.


### Select / choices

Prefer native select for short choices. Radio groups select one option; checkboxes allow multiple; switches apply an immediate reversible setting. Use a fieldset and legend for grouped choices. A custom combobox must support typing, arrows, Enter, Escape and announced selection.


### Validation and recovery

Validate on submit and then on field correction; do not show errors before first interaction. Focus the error summary on failed submission. Preserve all entries. Password visibility toggles have an accessible name. Destructive actions name the object and require a clear confirmation when recovery is not possible.


## Information and status

Operational information must preserve source, units, status and next action.


### Card / CcCard

Header, body and optional footer separated by 16-24 px. Radius 0 for editorial plates or 8 px for digital groups. Static cards do not look clickable. Clickable cards have one primary destination and visible focus; do not nest buttons inside a wrapping anchor.


### Table / CcTable

Header 14/20 at weight 600; body 14/20 or 16/24; row minimum 44 px, padding 12 x 16 px. Left-align labels, right-align numeric values. Sorting uses a labeled button and aria-sort. Include caption, column headers, source/as-of metadata and units.


### Alert / CcAlert

Icon + title + message + optional action. Info is neutral; success Olive; warning Mustard; danger Oxblood. Use tinted backgrounds with primary Ink text and semantic icons. Urgent new errors use role=alert; routine updates use role=status. Persistent failures never auto-dismiss.


### Status / CcProgress

Badge uses icon or word plus color, minimum text 12/17. Determinate progress exposes current and maximum values; indeterminate progress says what is happening. Never display a fabricated percentage. Stepper names completed/current/upcoming steps in text.


## Move without losing place

Navigation reveals location. Overlays preserve context and return the user to a predictable place.


### Navigation / CcNavigation

Use a labeled nav landmark; current page has aria-current=page plus a Terra rule. Include a skip link. Collapse to a labeled menu control on small screens; return focus to its trigger after closing. Breadcrumbs describe hierarchy, never substitute for the page heading.


### Tabs / CcTabs

Use tabs only for peer panels in one context. Tab list with selected state, controlled panel IDs, roving tabindex and arrow/Home/End navigation. Activate on focus only when panels load immediately; otherwise Enter/Space activates. Use links for separate routes.


### Dialog / CcDialog

Modal width 560 px maximum, mobile width calc(100% - 40px), padding 24 px. Labeled dialog, initial focus on a safe relevant control, focus containment, Escape and explicit close, inert background, focus return. Long content scrolls inside the dialog without hiding actions.


### Menus / toasts

Menus fit the viewport and dismiss on Escape or outside click; keyboard activation is required. Toasts announce routine outcomes politely and provide a durable alternative for important information. A tooltip supplements a visible label and appears on focus as well as hover.


## Absence is information

Loading, empty, stale, unavailable and error are separate states. Each should answer what happened and what the user can do.


### Loading / empty

Loading retains the surrounding structure with a short descriptive status; skeletons are decorative and hidden from assistive technology. Empty means no records exist: name the scope, explain the first useful action and avoid invented sample data.


### No results / error

No results means filters found no matches: show the active filters and a clear-reset action. Error means retrieval failed: preserve last-known data if useful, mark it stale, state what failed and offer retry. Never render a failed request as “0”.


### Stale / partial / restricted

Stale shows the last successful refresh time and source. Partial identifies missing coverage. Restricted explains the permission needed without leaking protected data. Unknown values render as “Unavailable” or an em dash with an explanation, never zero.


### Numbers and evidence

Each metric declares definition, unit, period, source and refresh time. Forecasts and estimates are labeled at point of use. Demonstration screens in this package use “Illustrative” labels and intentionally avoid implying live business performance.


## Draw what matters

Use original operational subject matter and legible visual notation. Decoration should never imply evidence.


### Iconography

24 x 24 viewBox; 1.5 px strokes at 24 px, square or modestly rounded terminals, no mixed filled/outline families. Render common control icons at 16 or 20 px inside a 44 px target. Check=complete, triangle=attention, octagon/error mark=failed, arrow=direction. Icons inherit semantic foreground.


### Accessible use

Decorative SVGs use aria-hidden=true. Standalone icon buttons require a specific accessible label; “icon” or “more” is insufficient when the action can be named. Never use an icon alone to distinguish risk states. Do not redraw the logo with the icon system.


### Photography

Prefer actual spaces, tools, people at work and material details. Natural light, warm neutrals, honest documentary cropping. Obtain permission for recognizable people and private locations. Remove confidential screen content. Keep text off busy imagery; use an opaque caption panel.


### Illustration

Use measured diagrams, architectural linework, annotated plates and restrained geometric studies. One line-weight family, controlled use of the full palette, purposeful labels. Avoid brains, glowing circuits, robots, literal cypress-tree decoration and invented product screenshots. Paper texture is optional on editorial covers only, never behind controls or dense text.


## Diagrams explain the work

Every diagram needs a question, reading direction and key. A more complicated diagram is not a more rigorous explanation.


### Process flow

Default left-to-right; mobile top-to-bottom. Rectangles for actions, diamonds for decisions, rounded endpoints. Use 1.5 px connectors with arrowheads; label decision branches. Number steps, name owners and identify handoffs. Solid line=confirmed path; dashed=proposed path, always with a legend.


### System map

Group nodes by responsibility or trust boundary. Label data moving across boundaries. Show storage, human approval and external services explicitly. Do not turn speculative integrations into solid “live” connections. Limit a plate to 7-9 primary nodes or split it.


### Matrices + timelines

Matrices include row/column meanings and an explicit scoring key. Timeline intervals use a consistent scale; milestones have dates and owners. Distinguish planned from completed with shape and label, not just color.


### Plate grammar

Header: figure number and descriptive title. Body: drawing with generous white space. Footer: interpretation, source, date and confidence/status. Use Archivo labels, Courier Prime IDs and Besley only for short editorial explanation.


## Evidence, not decoration

Select the chart that answers the question with the fewest assumptions. Direct labels are preferred to distant legends.


### Choose the form

Compare categories with horizontal bars; show time with a line; show composition with a stacked bar and totals; show distributions with a histogram or dot plot. Use tables when exact values drive the decision. Avoid 3D effects, unexplained dual axes and decorative gauges.


### Scale and labeling

Bar charts begin at zero. Any truncated line-chart axis is explicit. Label units, dates, sample size where relevant, source and as-of date. Missing observations create visible gaps, not zeros. Forecast segments are dashed and labeled. Uncertainty uses ranges with a definition.


### Series and contrast

Use Terra for the focal series, Ink/secondary for context, then Olive and Mustard only when categories require them. In operational charts, reserve Oxblood for risk; an editorial categorical chart may use brand-oxblood when the legend makes its meaning explicit. Separate adjacent fills with a surface gap or outline. For thin dark-mode error lines use danger-text #D87969. Never depend on hue alone.


### Accessible equivalent

Provide a short interpretation and the underlying data table or download. Up to four series per compact chart; use small multiples after that. Encode series with markers or dash patterns. A color-blind check and grayscale review are required before publication.


## Four expressions. One system.

Modes alter emphasis and density. They never introduce a new palette, type family, logo or meaning for risk.


### Core Editorial / default

Website, proposals and case studies. Besley thesis, Archivo structure, broad Paper field, Terra kicker, restrained rules. Spacious rhythm: 64 px section gaps. Default when the audience is evaluating an idea or a service. Terra feature panels and Olive supporting sections are available; one focal saturated region per view.


### Technical Systems / explain

SOPs, architecture and implementation. Archivo headings, Courier metadata, numbered steps and annotated diagrams. Neutral plates, square corners and 32 px gaps. Accuracy and navigability take priority over hero typography. Use labeled Olive/Mustard process areas and Terra handoffs to make structure visible.


### Archival Intelligence / read

Essays, research and founder content. Besley body, wide margins, footnotes, marginal references and long-form pacing. Maximum reading width 68ch; 80 px section breaks. Texture, if used, stays outside the reading field. Use Oxblood or Olive editorial plates and warm tinted notes; keep the long-form text column neutral.


### Digital Command / operate

Dashboards, tools and portals. Archivo throughout controls, compact but readable tables, 44 px targets and minimal depth. Besley is limited to onboarding or empty-state headlines. Standard section gap 24 px; status semantics remain explicit. Use tinted selections, colored workflow groups and subtle raised panels; functional status meaning remains consistent.


## Translate, do not invert

Theme changes surface and foreground roles. The content hierarchy, interaction contract and information meaning stay constant.


### Role mapping

canvas Paper -> Night; surface Paper Deep -> Night Raised; text Ink -> Paper; muted Ink Soft -> Night Soft. action Terra -> Night Terra; on-action Paper -> Night. Borders split into decorative-rule and control-border in both themes.


### State mapping

All hover, pressed, selected, disabled, error, success and focus roles resolve independently in each mode. Semantic tinted panels keep main text in the text role. Use danger-text for small errors in dark mode. Never apply opacity to an entire card to create a dim state.


### Preference and persistence

Offer System / Light / Dark. Default to System, honor prefers-color-scheme, and persist an explicit user override locally. Use color-scheme so native controls match. Avoid a flash of the wrong theme by applying the preference before first paint.


### Media and print

Use the v1 dark logo: night Terra symbol, Paper wordmark. Photographs retain their natural exposure; do not auto-invert media or PDF previews. Charts need theme-specific foregrounds. Print defaults to the light system to preserve legibility and reduce heavy ink coverage.


## The light application board

User-supplied master application board, reproduced unchanged. The Terra logo direction is adopted; operating numbers, copy and imagery remain illustrative reference content.

![Supplied master board](references/master-application-board-light.png)


## The dark application board

User-supplied master application board, reproduced unchanged. The Terra logo direction is adopted; operating numbers, copy and imagery remain illustrative reference content.

![Supplied master board](references/master-application-board-dark.png)


## Website + article

Core Editorial establishes the proposition; Archival Intelligence supports sustained reading.


### Website / structure

Navigation -> one clear proposition -> supporting evidence -> offer or process -> one primary next action -> footer. Keep hero copy under approximately 50 words. Use the 12-column grid; headline spans 7 columns, supporting material 4, with one column of separation.


### Website / responsive

At 768 px, stack the hero in reading order. Below 768 px use 20 px margins and 40/46 display. Avoid side-by-side CTAs when labels wrap. A mobile menu must remain operable without hover. Actual claims and client proof require a cited source.


### Article / structure

Title, standfirst, author/date, main reading column, figures, notes and related next action. Use Besley 18/29 at 68ch max. Figures may break into a wider grid with captions and source links. Place long technical blocks in a separately labeled plate.


### Editable starting points

templates/website.html and templates/article.html provide static layouts linked to the common CSS. Replace bracketed prompts with verified content. Template actions are deliberately sample labels; wire real destinations and test keyboard behavior before launch.


## Reports + proposals

Let the document state the decision, show the evidence and make its limits visible.


### Report / required sequence

Cover -> executive finding -> scope/method -> evidence -> implications -> recommendations -> source register/appendix. Cover includes title, recipient or audience, author, date, revision and confidentiality. Each substantive chart states source and as-of date.


### Proposal / required sequence

Problem -> intended outcome -> scope and exclusions -> approach -> deliverables -> schedule -> fees and assumptions -> next action. Separate draft commercial terms from accepted terms. Do not include a signature line that suggests agreement has already occurred.


### Document mechanics

Use Letter/A4 six-column grid. Keep body at 10.5/15 pt or larger. Running footer shows document title, revision and page number. Table headers repeat after page breaks. Keep headings with the first paragraph and avoid single orphan lines.


### Editable starting points

templates/report.html and templates/proposal.html use print styling, structured headings and editable placeholders. Browser print supports light output; for a signed or legally operative document, route final content through the applicable review process.


## SOPs + decks

A procedure enables repeatable action. A deck enables a focused conversation. Their density should be different.


### SOP / anatomy

Process name; owner; effective date; version; purpose; trigger; inputs and permissions; numbered actions; verification; exceptions; escalation; records retained. Each step starts with a verb and ends with an observable result. Distinguish automation from human approval.


### SOP / working view

Technical Systems mode. Show current step, prerequisites and exception path. Use screenshots only when they materially clarify a step, redact private data and include capture date. The procedure must still make sense without the picture.


### Deck / anatomy

16:9 canvas, 96 px safe margins at 1920 x 1080. Cover -> problem -> evidence -> recommendation -> delivery path -> decision. One point per slide, body minimum 32 px. Source footnotes remain 20 px. Use dark slides selectively for section transitions, not arbitrary alternation.


### Editable starting points

templates/sop.html and templates/deck.html contain replaceable section prompts. Deck pages print landscape 16:9 from browser settings. For room presentation, validate legibility on the intended display before exporting slides.


## Dashboards + social

A dashboard helps someone decide or act. A social graphic makes one useful point without losing its source.


### Dashboard / hierarchy

Page title and scope -> refresh/source metadata -> exceptions requiring action -> key measures -> detailed table. Prefer useful filters and saved views to decorative KPI cards. Every number needs a definition, period and source. Use the data-state patterns when unavailable.


### Dashboard / density

Digital Command mode, 24 px section gaps, 44 px rows and 16 px controls. Show maximum four primary measures per row. Tables scroll inside labeled regions on mobile; filters wrap vertically. Preserve units and complete financial values.


### Social / composition

Square 1080 x 1080 or portrait 1080 x 1350, 72 px safe margin. Title approximately 64/72 px, support 32/44 px, source 24/32 px. One thesis, one visual or evidence point, restrained Terra marker. Include equivalent plain text in the post and meaningful alt text.


### Editable starting points

templates/dashboard.html and templates/social.html use the shared roles and sample placeholders. Social artwork is not a place for dense report tables. Do not crop away the logo clear space or citation when resizing.


## Consistency is governed

The design system is a shared operating agreement. Changes should improve a repeatable need, not accommodate a single preference.


### Ownership and release

Adam Abdalla is the decision owner. A maintainer proposes token and component changes with before/after examples, contrast results and affected applications. Use semantic versioning: breaking names/roles = major; additive tokens/components = minor; corrections = patch.


### Do

Use semantic tokens. Choose one dominant mode per artifact. Preserve the mark geometry. Label estimates and example data. Reuse templates. Record sources and dates. Choose color by task: neutral reading and data fields, richer section panels and fully colored editorial plates where they improve hierarchy. There is no fixed neutral-area quota. Before coloring a region, identify its job: primary action, supporting group, attention, or exception. Repeat that mapping within the artifact. Avoid cycling colors across equivalent items without a labeled reason.


### Don’t

Invent a sub-brand palette. Confuse editorial color with status. Use color as the only state indicator. Put paper texture behind small text. Shrink type to fit copy. Rebuild the logo. Claim WCAG compliance from a contrast check alone. Treat speculative metrics as actuals.


### Exceptions and retirement

Record the need, affected surface, owner, expiry and replacement plan. Keep temporary overrides local and named. Deprecate tokens with a documented replacement before removing them. This specification establishes the new direction without modifying the archived legacy release or publish changes to any site.


## Build from roles

tokens/tokens.json is the machine-readable source. tokens/tokens.css is generated from it. Design examples consume those roles.


### Structure

Schema cypress-command-tokens/1.0.0: palette stores source primitives; themes.light and themes.dark store semantic role values; scales stores dimensional, typography, motion, layer and grid values. It is a documented project schema, not a claim of DTCG compliance.


### Naming

CSS colors: --cc-color-canvas, --cc-color-text, --cc-color-action, --cc-color-action-text, --cc-color-on-action, --cc-color-danger-text. Noncolor values use --cc-space-*, --cc-radius-*, --cc-type-*, --cc-motion-* and --cc-grid-*. Never hardcode a primitive into an application component when a semantic role exists. Editorial surfaces use brand-*-surface or brand-*-strong plus on-brand-*; operational states continue to use success/warning/danger.


### Theme contract

The generated stylesheet supports explicit data-theme=light|dark on the root and follows prefers-color-scheme when the attribute is absent. The example switcher supports System/Light/Dark and local persistence. Expression changes are independent of theme.


### Rebuild and integrate

Install Python dependencies from source/requirements.txt, then run python source/build.py from the package root. No API keys or environment variables are required. The build reads specification.json and tokens.json, regenerates guide/boards/CSS/templates and recalculates contrast. Read source/schema.md before adding tokens.


## Reference decisions

Exploration is intentionally broad. Production needs one stable interpretation.


### Fonts

Earlier expression images name Chronicle, Tiempos, Freight, Canela, Inter and other families. The master boards return to Besley, Archivo and Courier Prime; those three govern this release. No unlicensed commercial exploration fonts are bundled.


### Color and meaning

Use #EAE2CD for Paper Deep and #8A2F1F for Oxblood, as stated in the source brief. Some image labels differ or are ambiguous. Mustard means caution/review, Terra means primary action, Olive means positive/verified, Oxblood means risk/error. Old level/chapter colors do not establish a second semantic scheme. V1.1 separates these operational meanings from expressive brand-color roles; editorial use of all four colors is permitted.


### Dark accessibility

The supplied dark master demonstrates composition but its printed dark color labels and retained deep accent inks are unsuitable as a complete control palette. This release uses the original night palette plus tested state colors; the original master image remains unchanged for comparison.


### Logo and example content

The Terra-colored mark is accepted for this system. V1 SVGs translate it into exact light and dark colors while preserving geometry. Named companies, sample metrics, article copy and photographic scenes in reference boards remain illustrative. Commercial claims, imagery rights and operating figures require separate verification.


## What is authoritative

This package distinguishes inherited direction, new production decisions and illustrative applications.


### Inherited / verified this session

Referenced conversation “Start design system workflow,” ID 6ab057cc-b82c-83ea-84b3-ae5e562cdefe. Exact light colors and font families were stated in its source brief. The recovered original PNG supplies the night palette and the visual language; it is included unchanged under references/. Both supplied master application boards are included in the guide and references folder. The same foundation sheet was subsequently supplied directly by the user and is also included.


### Geometry / current color authority

The earlier 04C vector files supply geometry only. The user explicitly approved Terra coloring and directed this package to follow the current conversation and attached images over prior brand rules. V1 logo derivatives change color only; originals remain included for traceability.


### New / specified here

Production logo color variants, control boundaries, state colors, accessible dark danger text, status tints, component contracts, dimensional scales, responsive behavior, governance and application templates are v1 design decisions. They are not claimed to have appeared in the earlier board. Version 1.1 expands expressive brand color and purposeful elevation under the current user request.


### Reconciled / supplied application boards

The user supplied both master boards and four earlier expression studies during assembly. All seven uploads are included unchanged. Font names, hex labels and status meanings vary across the image studies. The final master boards support Besley / Archivo / Courier Prime; exact source-brief hex values govern over inconsistent raster labels. The accessible night translation uses the original reference night inks, with explicitly documented v1 additions.


## Release with evidence

A reusable specification needs a verifiable relationship between guide, tokens and examples.


### Package checks

Validate JSON parsing and role parity. Calculate all declared contrast pairs. Compare original logo hashes and validate color-only derivative geometry. Render and inspect every PDF page. Check editable sources and the archive manifest. Review the generated QA report for exact results and limits. Verify portal navigation, palette copy feedback and theme-aware previews.


### Production acceptance

Before migrating an application: test responsive reflow, keyboard paths, focus, screen-reader labels, long content, real error states and reduced motion. Check actual chart data and permission boundaries. The static templates do not replace these application-level checks.


### Delivery map

Guide: Cypress_Command_Design_System_v1.pdf. Editable copy: Design_System.md and source/specification.json. Tokens: tokens/tokens.json and tokens/tokens.css. Boards: references/application-board-light.svg and -dark.svg. Templates: eight HTML starters plus shared styles. Assets: Terra SVG logo variants and original geometry masters, fonts and licenses.


### Normative accessibility source

W3C, Web Content Accessibility Guidelines (WCAG) 2.2: https://www.w3.org/TR/WCAG22/ . Consult the full criteria and exceptions for product conformance. Source and contrast calculations were checked on 22 September 2026. See references/README.md for the authority order and conflicts resolved.
