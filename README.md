# Midnight Observatory

A small staying-in invitation for Saturday or Sunday, **October 10–11, 2026**. Choose a day, a slow or creative home plan, and start and end times in **Malaysia Time (UTC+8)**. Lunch is delivered so the whole day can stay at home. The finished plan drives the page, invitation artwork, email, and calendar event.

## Preview locally

Use Node.js 18 or newer. There are no package dependencies.

```powershell
node server.js
```

Open <http://127.0.0.1:8767/> for the invitation. The [sample designed email](http://127.0.0.1:8767/preview/email) shows a staying-in plan for October 10, 12:00–20:00 MYT. It is a preview only; opening it sends nothing. Run the checks with `node --test tests/*.test.cjs`.

Full motion is the default at the normal URL. The visible Motion toggle saves its setting in the browser. Each transition also has Skip and the finale has Replay.

## Sending the designed email

The **Send invitation** button is available only when the server has a Resend API key and a sender address. Configure these in the server environment, then restart it:

```powershell
$env:RESEND_API_KEY = 'your-server-only-key'
$env:MAIL_FROM = 'Our Little Universe <invitation@your-verified-domain.example>'
node server.js
```

Use an address on a [verified sending domain](https://resend.com/docs/dashboard/domains/introduction). Keep the API key on the server; never put it in the webpage or commit it. Deploy `server.js` with HTTPS and set `HOST` and `PORT` for your host. Static hosting alone cannot provide direct sending.

The server accepts only a complete, validated plan, fixes the recipient to `modquack@gmail.com`, checks the image shape, enforces same-origin browser requests and a per-IP limit, and uses a stable [Resend idempotency key](https://resend.com/docs/dashboard/emails/idempotency-keys) to prevent routine duplicate sends. Its in-memory sent record resets on restart; Resend retains idempotency keys for 24 hours. Use persistent storage or access control if this endpoint will be exposed broadly or for longer.

Sending happens only after the visitor presses **Send invitation**. The server's success means the provider accepted the message; it does not prove inbox delivery. No real invitation is sent by the test suite or the sample preview.

Without configuration, the preview still offers an email-app draft with plain text, a designed `.eml` download with PNG and `.ics` attachments, a native file share when the device supports both files, copyable details, a PNG download, and a separate `.ics` download. An email-app draft cannot attach files automatically, so add downloaded files manually if using that option. The page does not claim a draft or share was sent.

## Calendar and email details

The `.ics` uses UTC event times corresponding to the selected Malaysia times. The itinerary and Malaysia timezone are written into the calendar description. The HTML email is built from table layout and inline styles, includes all plan details as selectable text, and remains readable when images are blocked; the matching invitation PNG is an attachment. A plain-text version accompanies it.
