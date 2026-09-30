# Storybook railway redesign implementation plan

Approved brief: `docs/storybook-ui-redesign-prompt.md`. Dates confirmed by the user: October 3–4, 2026.

1. Extract plan data and calendar generation into `planner.js`. Add Node tests for date labels, dependent choices, custom text, and calendar output. Verify failure before implementation.
2. Rebuild the page as one book scene with a hinged cover, desktop spread, and single mobile page.
3. Add selected states, Continue, Back, stop navigation, and ticket editing. Drive rendered text from planner state.
4. Add page leaf transitions and one finale. Keep the train on a measured track, derive wheel rotation from travel, emit bounded steam, and deliver the ticket from a visible station slot. Add Skip and Replay.
5. Verify the routes, keyboard and mobile layouts, reduced motion, expired dates, and calendar download. Capture desktop and mobile screenshots.
