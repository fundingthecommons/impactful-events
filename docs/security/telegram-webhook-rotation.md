# Telegram webhook secret rotation

**Who performs this:** a human operator with access to the Vercel project and
the bot token — James Farrell or David Casey. **Never an agent.** The secret
passes through a terminal and the Vercel dashboard only; it is never pasted
into a chat, a doc, a ticket, a commit, or an agent session.

**Time:** about 15 minutes. **Downtime:** none for users; Telegram queues and
re-delivers updates it could not deliver during the switch (watch
`pending_update_count` drain in step 6).

---

## Why this runbook exists

- `test-webhook-manually.sh` carried the **live** `TELEGRAM_WEBHOOK_SECRET` in
  this **public** repository from 2025-10-31 (commit `dc29782`) until it was
  deleted in the 2026-10-21 security PR. Anyone who read the repo in that
  window has the value. Git history still contains it: **rotation is the
  control, not a history rewrite** (rewriting a public repo's history does not
  recall forks, mirrors or caches, and it breaks every collaborator's clone).
- The secret is the only thing that authenticates a call to
  `POST /api/telegram/webhook` as coming from Telegram. With it, an attacker
  can forge updates and:
  - **record fake praise** under any sender/recipient, cross-posted to the
    praise channel;
  - **rebind a member's `telegramChatId`**: a forged "private" update with a
    victim's `from.username` makes `captureTelegramChatId` overwrite the
    victim's stored chat ID with an attacker-controlled one, redirecting
    future bot DMs for that member.
- Until the 2026-10-21 PR the handler also *skipped* the check whenever the
  env var was unset. It now fails closed (401 on unset/empty/mismatch) and
  compares in constant time, so after this PR deploys the webhook delivers
  **nothing** until the value in Vercel and the value registered with Telegram
  agree. That makes the order of the steps below matter.

## Before you start

- [ ] The security PR that hardens the check is **deployed to Production**
      (the fail-closed handler is live). Rotating before it deploys works too,
      but do the steps in the order given either way.
- [ ] You are on your own laptop, not a shared machine, in a shell you can
      clear.
- [ ] You have: Vercel dashboard access to the platform project; the bot
      token (from the Vercel env var `TELEGRAM_BOT_TOKEN`, or BotFather);
      `openssl` and `curl`.
- [ ] Shell hygiene for every command below that takes a secret: read the
      value into a variable with `read -rs` (nothing is echoed and nothing
      lands in history) instead of typing it inline.

  ```bash
  read -rs TELEGRAM_BOT_TOKEN      # paste the bot token, press Enter
  ```

## Steps

### 1. Capture the current webhook settings

Telegram allows one webhook per bot. Record the current settings so step 4
re-registers the identical URL and options with only the secret changed.

```bash
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

Note `url` (production: the platform's `/api/telegram/webhook` endpoint),
`allowed_updates` (if present), `max_connections` (if present) and
`pending_update_count`. If `allowed_updates` or `max_connections` is set, pass
the same values in step 4 — `setWebhook` resets options you leave out.

### 2. Generate the new secret

```bash
openssl rand -hex 32
```

Copy the 64-character output to your clipboard. Do not write it anywhere else.
(Telegram accepts 1–256 characters of `A–Z a–z 0–9 _ -`; hex fits.)

### 3. Set it in Vercel and redeploy

1. Vercel → the platform project → **Settings → Environment Variables** →
   `TELEGRAM_WEBHOOK_SECRET`.
2. Edit the **Production** value: paste the new secret. Tick **Sensitive**
   if the option is offered (the value can then never be read back from the
   dashboard).
3. **Preview / Development:** only a separate *test* bot whose webhook points
   at a preview URL needs a value here (give it its own secret, never the
   production one). Otherwise leave Preview unset — the handler then rejects
   everything on previews, which is the safe default.
4. Save, then **Deployments → latest Production deployment → Redeploy**. A
   redeploy is required: Vercel injects environment variables at deploy time.
5. Wait for the deployment to be **Ready**. From this moment Telegram's
   deliveries (still signed with the old secret) get `401` and queue — that is
   expected and lasts until step 4 completes.

### 4. Register the new secret with Telegram

```bash
read -rs TELEGRAM_WEBHOOK_SECRET_NEW   # paste the new secret, press Enter
curl -sS -X POST "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\":\"<WEBHOOK_URL from step 1>\",\"secret_token\":\"${TELEGRAM_WEBHOOK_SECRET_NEW}\"}"
```

Add `"allowed_updates": [...]` / `"max_connections": N` to the JSON body if
step 1 showed them. Expected response:

```json
{"ok":true,"result":true,"description":"Webhook was set"}
```

(`"Webhook is already set"` with `"ok":true` is also fine — the secret still
updated.)

### 5. Verify the registration

```bash
curl -sS "https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getWebhookInfo"
```

- `url` unchanged from step 1.
- `last_error_date` / `last_error_message` absent, or older than step 3
  (a `401 Unauthorized` error dated during the switch is expected).
- `pending_update_count` falling to `0` within a minute or two.

### 6. Confirm the OLD value is rejected

Use the old secret (you still have it in Vercel's history or the old script).
The body below has no `message`, so even an accepted call is a no-op.

```bash
read -rs TELEGRAM_WEBHOOK_SECRET_OLD    # paste the OLD secret, press Enter
curl -sS -o /dev/null -w "%{http_code}\n" -X POST "<WEBHOOK_URL>" \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: ${TELEGRAM_WEBHOOK_SECRET_OLD}" \
  -d '{"update_id":1}'
# expect: 401

curl -sS -o /dev/null -w "%{http_code}\n" -X POST "<WEBHOOK_URL>" \
  -H "Content-Type: application/json" \
  -d '{"update_id":1}'
# expect: 401  (no header at all)
```

Anything other than `401` for both means the deployment is not the hardened
build or the env var did not take — stop and fix before continuing.

### 7. Confirm a real praise still works

From your own Telegram account, DM the bot:

```
!praise @<a teammate> for surviving the webhook rotation
```

- The bot replies that the praise was recorded.
- Vercel → Logs shows `[Webhook] Received message:` with no `Unauthorized`.
- If cross-posting is configured, the praise appears in the channel.

If the bot does not reply: check Vercel logs for
`[Webhook] TELEGRAM_WEBHOOK_SECRET is not set` (step 3 did not take) or
`Unauthorized` (step 4's value differs from Vercel's — redo 2–4 with a fresh
secret rather than re-pasting).

### 8. Clean up and record

```bash
unset TELEGRAM_BOT_TOKEN TELEGRAM_WEBHOOK_SECRET_NEW TELEGRAM_WEBHOOK_SECRET_OLD
```

- Treat the old value as **compromised**: it remains in git history forever
  (see "Why"). Delete any local copies (old clones still have the deleted
  script; local `.env` files that mirrored production).
- Record the rotation in the security PR (comment:
  `Rotated TELEGRAM_WEBHOOK_SECRET: YYYY-MM-DD, <operator>`) **and** in the
  log at the bottom of this file. Only the date and operator — never the
  value.
- Tell the other operator it is done so nobody rotates twice.

## If the bot token was also exposed

The 2026-10-21 finding was the webhook secret. If a review of the same script
or of git history shows the **bot token** too, rotate it as well:

1. BotFather → `/mybots` → the bot → **API Token → Revoke current token**.
   The old token stops working immediately, including the webhook.
2. Vercel → `TELEGRAM_BOT_TOKEN` (Production) → new value → Redeploy.
3. Re-run steps 4–7 above with the new token (a new token has no webhook
   registered; registering it also sets the secret).

## Do not

- Put the secret in a script, a test fixture, a doc or `.env.example` — that
  is how this happened.
- Paste it into Slack, Notion, email, a PR, or any AI/agent session.
- Register the webhook with the `setWebhook?url=...` browser shortcut: it
  drops `secret_token`, and the handler now rejects unsigned updates.
- "Fix" the exposure by rewriting git history on the public repo.

## Rotation log

| Date | Operator | Reason | Verified (steps 5–7) |
|------|----------|--------|----------------------|
| [YYYY-MM-DD] | [name] | Committed in `test-webhook-manually.sh` (public repo, 2025-10-31 → 2026-10-21) | [ ] |
