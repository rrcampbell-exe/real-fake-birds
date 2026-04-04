# Birder Player Feedback

Date: 2026-04-04
Persona: Birder Player Agent

## Overall Impression

As a real-world birder, the core loop is genuinely engaging because I can apply taxonomy instincts, but it currently leans a bit too much on obvious fake-name construction in some rounds. It feels best when a name is plausible enough that I have to hesitate.

## What Feels Authentic & Clever

- Real species like House Sparrow and Greater Flamingo create trust and anchor the game in real birding knowledge.
- Using familiar bird-group endings like warbler, noddy, hawk, and courser makes many names feel close to checklist reality.
- The post-answer card with field notes and immediate next-round flow keeps the pace brisk and supports learning momentum.

## What Breaks Immersion

- Some fake names are too crafted rather than naturally plausible (for example Asparagus-fronted Noddy), which makes fake detection feel linguistic rather than ornithological.
- The persistent Daily Nudge panel in classic play competes for attention with the bird ID task.
- A few generated names feel like stacked novelty descriptors, which reduces the could-this-be-real tension.

## Would You Return?

- Daily: Yes, because the real/fake discrimination is still satisfying and quick, and I can feel skill carryover.
- Session length estimate: about 5 to 12 minutes per session.

## Suggestions

- Increase fake-name plausibility by constraining adjective choices to realistic plumage/body/region patterns used in actual common names.
- Weight rounds toward ambiguous-but-believable fakes instead of overtly quirky ones.
- Tone down or auto-collapse the Daily Nudge box once dismissed so classic mode stays focused on ID decisions.
- Show a brief why this is real/fake line more consistently to reinforce learning value for birders.

## Evidence

- URL tested: http://localhost:3000
- Number of rounds played: 6 consecutive real/fake decisions in classic play
- Runtime observation 1: I played through named rounds including House Sparrow, Old Lavender Shearwater, Ultramarine Hawk, Greater Flamingo, Green Leaf-fronted Honeyguide, and Asparagus-fronted Noddy.
- Runtime observation 2: After answering, the game showed a result card with FAKE/REAL labeling, field-notes text, and a Next Bird button before continuing.
- Runtime observation 3: I performed a visible navigation/state action by moving to /settings and returning to /, and classic play resumed with the same bird and stats state visible.
- First-person reaction: After about five rounds, I started trusting the game more when real species appeared, but I felt pulled out whenever a fake name sounded intentionally whimsical instead of eBird-plausible.
