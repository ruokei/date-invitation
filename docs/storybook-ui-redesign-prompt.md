# Storybook railway UI redesign prompt

Grounded in a review of `codex/storybook-train-ticket` at `46ee552db21fdb8e60f521f7c8c92aae2be4d349`. The branch is a standalone `index.html` with inline CSS, JavaScript, and SVG. Desktop and 390 × 844 mobile views were inspected.

Copy the prompt below into the implementation chat.

---

Redesign the date invitation on branch `codex/storybook-train-ticket` into a tactile, interactive storybook railway experience. Review the latest branch before editing. Implement the redesign and verify it in a browser.

The visitor is someone receiving a personal invitation and choosing a day together. The experience should feel intimate, playful, and easy to complete. Preserve the railway story, personal itinerary options, and keepsake ticket. I want realistic motion: believable weight, hinges, contact, momentum, and mechanical relationships within an illustrated world.

## Art direction and layout

Use an emerald clothbound book, warm ivory paper, restrained brass details, and a terracotta railway ticket. Keep the editorial serif headings and use monospaced type selectively for railway labels. Add subtle paper grain, page edges, embossed cover details, and coherent lighting. Keep text readable and let material details support it.

On desktop, create a believable open spread: illustration and a compact record of the chosen itinerary on the left, the current question and controls on the right. Keep headings, text, and controls clear of the spine. On phones, use one readable page with a small chapter indicator and compact itinerary summary; remove the artificial central gutter. Give the final ticket visual priority and place its useful actions close to its details.

## Interaction design

- Keep the existing journey: choose a day → go out or stay home → choose a route → optional activity, including a custom suggestion → café or lunch choice → ticket → calendar download.
- Make choices visibly selectable. Show a clear selected state and a brief stamp or pressed-paper response; a Continue control turns the page. Avoid navigating away before the visitor can inspect their choice.
- Add Back and direct editing from the summary/ticket. Preserve valid choices. When an earlier answer changes, clear only answers that no longer apply, then update the preview and export consistently.
- Replace anonymous progress bars with a compact, labeled railway journey. Previously visited stops can reopen their corresponding step. Account for routes that skip the activity step.
- Let each choice add a small, meaningful detail to the illustrated route or developing ticket. Keep this feedback restrained and tied to the selected option.
- Support optional swiping/page dragging and a ticket-stub interaction where they feel natural. Every gesture must have a visible button and keyboard equivalent. Dragging should follow the pointer and settle or cancel predictably.

## Book motion

Keep the cover, spine, pages, and next page in one stable coordinate system. Opening the book must rotate the visible cover around its hinge, revealing the first page underneath. Show the reverse face, paper thickness, and changing occlusion/contact shadows. Do not simply hide the cover and animate a separate panel into its place.

For navigation, turn the outgoing leaf to expose the next page. Reverse the direction when going back. The page should accelerate, decelerate, and settle with the restrained behavior of paper. Keep form controls usable, avoid text flicker or mirrored text, and resolve rapid or interrupted input to one coherent state.

Use approximately 100–160 ms for press feedback, 180–300 ms for selection changes, and 450–700 ms for routine page turns. Treat these as starting values to tune in the browser, not mandatory delays between actions.

## Train and ticket choreography

Make one memorable finale: the miniature train enters a clearly reserved track area, brakes at a station, and delivers the visitor's ticket from a visible slot or carriage mechanism. The ticket slides onto the page, bends slightly, settles against a contact shadow, and receives one small stamp. Keep the train, delivery point, and ticket position spatially connected throughout.

- Measure train travel relative to its scene container, not the viewport. Keep scale constant while it moves along a flat track.
- Derive each wheel's rotation from actual distance traveled and its radius. Rotate the spokes with the rims. Drive the connecting rod from the crank positions rather than an unrelated diagonal pulse. Ground wheels consistently on the rail.
- Emit steam at the chimney's current location, then let each puff drift and disperse independently in scene coordinates. Any body movement or light change should have a plausible cause.
- Give the ticket a clear source, continuous size, paper stiffness, and a small settling motion. Replace the existing effect that grows it from a tiny, heavily blurred rectangle.
- Keep the finale concise, about two seconds. Provide Skip and Replay controls. Make the completed ticket immediately available when motion is skipped or reduced. Replaying must preserve the plan and never trigger a calendar download.
- Keep the track unobstructed at phone sizes. Avoid large stacked signs covering the train or pushing the ticket and its actions far down the page.

## Function, accessibility, and performance

Preserve the existing plans, custom activity input, and calendar download. Display the actual day, month, and year wherever dates are selected or confirmed. Use one source of truth for visible dates and calendar data. The reviewed branch hardcodes September 26–27, 2026, which have passed; surface the need to configure the intended dates rather than inventing a new weekend. Prevent accidental export of an expired invitation. Serialize custom text safely in the calendar file.

Keep semantic buttons and form labels, visible keyboard focus, comfortable touch targets, and readable contrast. On navigation, move focus to the current heading and keep it in view. Use concise announcements for meaningful state changes. Make optional gestures supplemental to normal controls.

Provide an intentional reduced-motion version: immediate page changes or short fades, a static train illustration, and an immediately visible ticket. Keep every action and state available. Pause ambient animation when hidden or offscreen; stop wheel and steam loops when the train is stationary or the sequence is finished. Do not autoplay sound.

Work with the current vanilla HTML/CSS/JavaScript and SVG structure. Use CSS 3D transforms, the Web Animations API, or a small animation loop where appropriate. Prefer one coordinated motion timeline/state model. Add a dependency only when it solves a concrete limitation. Consolidate the existing duplicate CSS overrides and separate route state, rendering, and animation sequencing into readable units.

## Verification and handoff

Check the normal outing, new-activity outing, custom activity, and home routes. Verify Back/Edit behavior, dependent-answer resets, repeated input, Skip/Replay, and calendar contents against the displayed plan. Inspect desktop, 390px mobile, keyboard operation, and reduced-motion behavior. Watch full animation sequences to catch clipping, wheel sliding, abrupt swaps, and disconnected ticket movement; still screenshots alone cannot verify these.

Provide a working local preview, representative desktop/mobile screenshots, and a short account of what changed and what you verified. Flag anything that requires my input, especially the intended dates. Keep the work local for review unless I explicitly request publishing.
