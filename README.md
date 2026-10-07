# Midnight Observatory

A small staying-in invitation for Saturday or Sunday, **October 10–11, 2026**. Choose a day, lunch, and something to enjoy during Our time. The day runs from 11:00 AM to 9:00 PM in **Malaysia Time (UTC+8)**. The finished plan drives the page, invitation artwork, email, and calendar event.

## Preview locally

Use Node.js 18 or newer. There are no package dependencies.

```powershell
node server.js
```

Open <http://127.0.0.1:8767/> for the invitation. The [sample designed email](http://127.0.0.1:8767/preview/email) shows a staying-in plan for October 10, 11:00–21:00 MYT. It is a preview only; opening it sends nothing. Run the checks with `node --test tests/*.test.cjs`.

Full motion is the default at the normal URL. The visible Motion toggle saves its setting in the browser. Each transition also has Skip and the finale has Replay.

## Sending the designed email

### GitHub Pages with Cloudflare Workers

GitHub Pages hosts the invitation at <https://ruokei.github.io/date-invitation/>. It cannot run `server.js`, so direct sending uses the small Cloudflare Worker in `worker/index.mjs`. The Worker accepts requests only from the Pages origin, validates the plan and PNG, limits send requests, and sends the designed HTML email, plain text, PNG, and `.ics` to the entered address and `modquack@gmail.com`. It never sends until **Send to both of us** is pressed.

1. In Resend, verify the sending domain `exy.rest` and create an API key with sending access. Never add the key to this repository or the webpage.
2. From the repository root, sign into Cloudflare and deploy the Worker:

   ```powershell
   npx wrangler login
   npx wrangler deploy
   ```

3. Add your Resend API key as a Worker secret. In Cloudflare, open **date-invitation-email → Settings → Runtime variables and secrets → Add variable**. Name it `RESEND_API_KEY`, choose **Secret**, enter the key, and deploy. Alternatively, run the command below and paste the key at its private prompt. The sender is set to `Our Little Universe <invitation@exy.rest>` in `wrangler.jsonc`; change that address there if you prefer another address on your verified domain.

   ```powershell
   npx wrangler secret put RESEND_API_KEY
   ```

4. The deployed URL, `https://date-invitation-email.modquack.workers.dev`, is set in `email-api-config.js` as `window.MidnightEmailApiBase`. That URL is public; the API key stays secret in Cloudflare. Publish the updated static files to GitHub Pages.
5. Open the published invitation and its email preview. **Send to both of us** becomes available when the Worker reports that the API key is configured. A real send occurs only after pressing that button. The `.ics` can always be downloaded from the preview.

Cloudflare's rate limits and Resend's idempotency key reduce accidental repeats. Because the visitor may enter an email address, review abuse controls before sharing the public link widely. If you change the Pages domain, update `SITE_ORIGIN` in `wrangler.jsonc` and redeploy the Worker.

### Local Node preview

The **Send to both of us** button in the local preview is available only when the Node server has a Resend API key and sender address. Configure these in the server environment, then restart it:

```powershell
$env:RESEND_API_KEY = 'your-server-only-key'
$env:MAIL_FROM = 'Our Little Universe <invitation@exy.rest>'
node server.js
```

Use an address on a [verified sending domain](https://resend.com/docs/dashboard/domains/introduction). Keep the API key on the server; never put it in the webpage or commit it.

The visitor enters their email in the preview. One send request addresses that email and `modquack@gmail.com`, with the designed message, PNG, and `.ics` attachment for both. The server validates the entered address and complete plan, checks the image shape, enforces same-origin browser requests and a per-IP limit, and uses a stable [Resend idempotency key](https://resend.com/docs/dashboard/emails/idempotency-keys) for each plan and visitor address. Its in-memory sent record resets on restart; Resend retains idempotency keys for 24 hours. Because this allows a visitor to enter an arbitrary address, add persistent abuse protection or access control before exposing the endpoint broadly.

Sending happens only after the visitor presses **Send to both of us**. A success response means the provider accepted the message; it does not prove inbox delivery. No real invitation is sent by the sample preview.

Without configuration, enter your email to open a plain-text email-app draft addressed to both people or download a designed `.eml` draft with PNG and `.ics` attachments. The preview also offers native file sharing when the device supports both files, copyable details, a PNG download, and a separate `.ics` download. An email-app draft cannot attach files automatically, so add downloaded files manually if using that option. The page does not claim a draft or share was sent.

## Calendar and email details

The `.ics` uses UTC event times corresponding to the selected Malaysia times. The itinerary and Malaysia timezone are written into the calendar description. The HTML email is built from table layout and inline styles, includes all plan details as selectable text, and remains readable when images are blocked; the matching invitation PNG is an attachment. A plain-text version accompanies it.
