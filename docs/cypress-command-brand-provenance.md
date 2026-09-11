# Cypress Command brand asset provenance

Verified September 7, 2026 from the private [Cypress Command brand repository](https://github.com/OrangeOnyx/cypress-command-brand-system/tree/4a116e75472415210d05deea13041cb2b74db53a), commit `4a116e75472415210d05deea13041cb2b74db53a` (`main` when inspected). Release: **04C v1.0.1**, approved by Adam Abdalla on September 6, 2026. This live source supersedes the earlier finding that the specifically referenced local 04C output folder was empty.

## Governing source documents

- [`brand-system/brand-config.json`](https://github.com/OrangeOnyx/cypress-command-brand-system/blob/4a116e75472415210d05deea13041cb2b74db53a/brand-system/brand-config.json): approved identity, version, exact palette and typography.
- [`brand-system/BRAND_CONTEXT.md`](https://github.com/OrangeOnyx/cypress-command-brand-system/blob/4a116e75472415210d05deea13041cb2b74db53a/brand-system/BRAND_CONTEXT.md): 04C supersedes earlier 04B exploration; 04D is supporting layout language only.
- [`brand-system/logos/README.md`](https://github.com/OrangeOnyx/cypress-command-brand-system/blob/4a116e75472415210d05deea13041cb2b74db53a/brand-system/logos/README.md): variants, minimum size and clear space.
- [`brand-system/fonts/README.md`](https://github.com/OrangeOnyx/cypress-command-brand-system/blob/4a116e75472415210d05deea13041cb2b74db53a/brand-system/fonts/README.md) and [`tokens/token-notes.md`](https://github.com/OrangeOnyx/cypress-command-brand-system/blob/4a116e75472415210d05deea13041cb2b74db53a/brand-system/tokens/token-notes.md): font roles and functional UI rules.

## Applied asset constraints

- Use the supplied outlined wordmark and rounded 04C symbol. Preserve the center square, geometry, proportions and colors; no retyping, effects or Amber logo.
- Use primary artwork on light surfaces; Bone reverse artwork on Cypress or Charcoal. The horizontal SVG includes clear space and must be at least 260px wide including that padding. Do not crop it. Standalone mark files omit padding: reserve one 48-unit core width around the 168 × 160-unit symbol, with at least 24px visible symbol height.
- Palette: Cypress `#1E4D3A`, Moss `#2F6B4E`, Amber `#D97706`, Charcoal `#0A1F16`, Bone `#F3EDE0`. Amber is a limited signal with Charcoal text; avoid Amber body text on Bone and white text on Amber.
- Fraunces 450 for restrained headings; Inter for body/UI; JetBrains Mono for actual identifiers. No synthetic italics. Binary font inspection verified Fraunces weight 100–900 and optical size 9–144, Inter weight 100–900, JetBrains Mono weight 400–800. The historical `-400` filenames do not indicate static faces.
- Preserve the supplied SIL OFL 1.1 license texts. No third-party font request is needed. Planned brand email addresses are not treated as live contact information.

## Copied files and SHA-256

Destination paths below are relative to `public/brand/cypress/`; source paths are relative to the pinned brand repository. All 12 copies were verified byte-for-byte against the downloaded source. No source artwork or font was regenerated.

| Destination | Source | SHA-256 of copied bytes |
| --- | --- | --- |
| `cc-04c-horizontal-primary.svg` | `brand-system/logos/svg/cc-04c-horizontal-primary.svg` | `22e43152dba8bf195bd4a377812d4ad89e0955f48f0a563504368d40596578c3` |
| `cc-04c-horizontal-reverse.svg` | `brand-system/logos/svg/cc-04c-horizontal-reverse.svg` | `99c96e6035d63187011f7843618ed6fa8860ac0ab0b9be0e87533cd29d55791a` |
| `cc-04c-mark-primary.svg` | `brand-system/logos/svg/cc-04c-mark-primary.svg` | `420a55a530c044de765ce8d6fe83cf057819c268f936db11bc3b8ef01bdd4bd8` |
| `cc-04c-mark-reverse.svg` | `brand-system/logos/svg/cc-04c-mark-reverse.svg` | `a14527ebd4da63b9e17176d77b612f3d244bc950a54bcf8d9abbf1a6ef2da6d7` |
| `favicon.ico` | `brand-system/logos/png/favicon.ico` | `b8356b58a9af8b84db57979987ec3c7676e01418697c8848ff99159e16bbca02` |
| `app-icon-180.png` | `brand-system/logos/png/app-icon-180.png` | `0be31e3748e12b431f253283abe623e8e984740ae12ea9c0b13d6a77a3960ec8` |
| `fonts/Fraunces-400.woff2` | `brand-system/fonts/Fraunces-400.woff2` | `48282a415ec22e31beaf0a0666e6fae0c8cbddcd0b1f6e729f27c3ade8a64e43` |
| `fonts/Inter-400.woff2` | `brand-system/fonts/Inter-400.woff2` | `c940764593d0fe5d596be327ca7558855e018039fb78509aa21921fd3644c3e4` |
| `fonts/JetBrainsMono-400.woff2` | `brand-system/fonts/JetBrainsMono-400.woff2` | `2c32b9b3ee358c119e210f6f5195f9bd34894d78a785ff2e95d60e718e400af4` |
| `fonts/Fraunces-OFL.txt` | `brand-system/fonts/Fraunces-OFL.txt` | `fcfa1cc090bc091e22db5f45230e064450892b5ba56e97b2469b55849c36f75b` |
| `fonts/Inter-OFL.txt` | `brand-system/fonts/Inter-OFL.txt` | `f14f2b95a38f4f20cad4d27f7710593f37534c046641be0348da7c28365f4e39` |
| `fonts/JetBrainsMono-OFL.txt` | `brand-system/fonts/JetBrainsMono-OFL.txt` | `ef2870fd9ccb5f68d6b89aba72c3b30a27ab66f317b41d8c2c048693236bee01` |

The upstream 133-file release manifest was checked: 102 exact hash matches; 31 text files differed solely by CRLF versus LF line endings, with zero unexplained differences. All copied logo/icon/font binaries match that manifest exactly. The copied license files preserve GitHub's original CRLF bytes; their actual-byte hashes above intentionally differ from the release manifest's LF hashes. Do not represent the entire release as an exact raw-hash match.

The source repository was inspected outside the application in a temporary checkout/archive. No second application, brand generation script, website starter, contact publishing, account change, deployment or remote write was introduced by this asset import.
