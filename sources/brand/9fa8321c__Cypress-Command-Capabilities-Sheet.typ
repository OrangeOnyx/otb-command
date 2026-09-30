#import "report-theme.typ": report-theme

#let paper = rgb("#F4EFE2")
#let paper-deep = rgb("#E8E2CD")
#let ink = rgb("#1E1B16")
#let ink-soft = rgb("#5C554A")
#let rule = rgb("#C9BFA8")
#let olive = rgb("#49573C")
#let mustard = rgb("#8F6D0C")
#let terra = rgb("#A44E12")

#show: report-theme.with(title: "Cypress Command Capabilities", author: "Cypress Command", rhythm: "report", running-header: false)
#set page(paper: "us-letter", fill: paper, margin: (top: 0.58in, bottom: 0.55in, x: 0.65in), numbering: none, header: none, footer: none)
#set text(font: "Inter", lang: "en", region: "us", size: 9pt, fill: ink)
#set par(justify: false, leading: 0.72em, spacing: 0.45em)

#let label(body, color: ink-soft) = text(size: 7.2pt, weight: 700, tracking: 0.11em, fill: color, upper(body))
#let panel(body, rail: terra) = block(width: 100%, fill: paper-deep, stroke: (left: 3pt + rail, rest: 0.5pt + rule), inset: 10pt, breakable: false, body)

#image("assets/logo-horizontal.svg", width: 2.3in)
#v(8pt)
#line(length: 100%, stroke: 0.7pt + ink)
#v(16pt)
#label("AI-enabled operating systems for owner-led businesses", color: terra)
#v(6pt)
#text(font: "Libertinus Serif", size: 31pt, weight: 700)[Make the work easier to run.]
#v(8pt)
#text(size: 11pt, fill: ink-soft)[Cypress Command connects people, workflows, data, software, and carefully applied AI around the work your business depends on—so your team can act with more clarity and capacity.]

#v(14pt)
#grid(columns: (1fr, 1fr, 1fr), gutter: 8pt,
  panel(rail: olive)[#label("01 · Assessment", color: olive) #v(6pt) Map one priority workflow, establish the operating baseline, identify friction and risk, and define what should happen first.],
  panel(rail: terra)[#label("02 · Build", color: terra) #v(6pt) Design and install the workflow, information structure, review points, documentation, and useful automation.],
  panel(rail: mustard)[#label("03 · Partnership", color: mustard) #v(6pt) Review performance, sustain adoption, improve the live system, and prioritize the next operating change.],
)

#v(15pt)
#grid(columns: (1fr, 1fr), gutter: 14pt,
  [
    #label("Where we focus")
    #v(7pt)
    #table(columns: (14pt, 1fr), inset: (y: 4pt), stroke: none,
      [#text(fill: terra, weight: 700)[—]], [Recurring workflow management],
      [#text(fill: terra, weight: 700)[—]], [Contract and document intelligence],
      [#text(fill: terra, weight: 700)[—]], [Reporting and decision preparation],
      [#text(fill: terra, weight: 700)[—]], [Asset and portfolio operating visibility],
      [#text(fill: terra, weight: 700)[—]], [Handoff, follow-up, and business-development systems],
    )
  ],
  [
    #label("How we work")
    #v(7pt)
    #table(columns: (auto, 1fr), inset: 5pt, stroke: 0.45pt + rule,
      [#text(font: "Libertinus Serif", size: 15pt, weight: 700, fill: olive)[01]], [*Assess* — See the work as it is.],
      [#text(font: "Libertinus Serif", size: 15pt, weight: 700, fill: mustard)[02]], [*Design* — Turn the opportunity into a workable system.],
      [#text(font: "Libertinus Serif", size: 15pt, weight: 700, fill: terra)[03]], [*Install* — Put the system into real work.],
      [#text(font: "Libertinus Serif", size: 15pt, weight: 700, fill: ink)[04]], [*Operate* — Keep improving what is now part of the business.],
    )
  ],
)

#v(14pt)
#block(fill: ink, stroke: (left: 4pt + terra), inset: 13pt, width: 100%)[
  #grid(columns: (1fr, auto), align: (left, center),
    [#text(font: "Libertinus Serif", size: 17pt, weight: 700, fill: paper)[Start with the work that is hardest to run.] \
     #text(size: 8.5pt, fill: paper-deep)[Bring one process, persistent bottleneck, or operating question.]],
    [#box(fill: terra, inset: (x: 11pt, y: 7pt), radius: 2pt)[#text(size: 8.5pt, weight: 700, fill: paper)[CYPRESSCOMMAND.COM →]]],
  )
]

#v(10pt)
#line(length: 100%, stroke: 0.5pt + rule)
#v(5pt)
#grid(columns: (1fr, 1fr),
  label("Practical intelligence for real operations."),
  align(right)[#label("People + systems + real work")],
)
