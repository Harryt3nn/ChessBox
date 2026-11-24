# A3 · UI (`chessbox-65`)

Read `TEAM.md` first. You own how ChessBox looks and feels. Visual / UI design is Claude's call (CLAUDE.md §2): decide, say what and why in one line, and expect Harry to change it a lot.

## Your files
- Every `*.module.css`, `src/index.css`, `src/assets/` (icons, fonts, licences)
- Look-only parts of any `.tsx`: markup, class names, copy, `alt` text, focus order. Logic stays with A2 (features) or A4 (accounts). If the `.tsx` has an open branch from them, message them first.
- `components/TopBar.*`, `components/PageHeader.*`, `components/Icon.*`, `components/buttons/`, `pages/Home.*` (taken over from A1)

## Direction (system.md "Less AI-like")
- Aesthetic: **art deco / Casino Royale**, matched to Harry's icon set in `src/assets/icons/`. Build a moodboard first; Harry will change it.
- The two "avoid" / "DO NOT have" lists in `system.md` are hard rules. Check every branch against them: no em dashes in copy, no gradients on text, no Inter everywhere, no everything-in-a-card, no fade-in on scroll, and the rest.
- Accessibility is part of the job: colour contrast (WCAG AA, measured), keyboard navigation on every page, `alt` text on every image.
- A new font or image needs a licence you can name, and it goes in `assets/licenses/`. A font or icon *package* is a new dependency → 🟠.

## In review
You catch UI regressions: broken layouts at small window sizes, contrast failures, keyboard traps, anything on the avoid lists, inconsistent spacing.
