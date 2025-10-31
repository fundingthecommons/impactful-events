# Telegram Praise Bot Setup

This document explains how to set up and use the Telegram Praise Bot for your platform.

## Overview

The Telegram Praise Bot allows users to send praise to other community members via direct messages to the bot. When someone sends a praise command, it's automatically saved to the database and linked to their user account.

## Features

- 🎯 **User Linking**: Automatically connects Telegram users to platform accounts
- 📊 **Leaderboards**: View top praised users
- 🔒 **Privacy Controls**: Choose to make praise public or private
- 📈 **Analytics**: Track praise sent and received
- 🎪 **Event Context**: Optionally link praise to specific events

## Setup Instructions

### 1. Create a Telegram Bot

1. Open Telegram and message [@BotFather](https://t.me/BotFather)
2. Send `/newbot` command
3. Follow the prompts to choose a name and username for your bot
4. BotFather will give you a **bot token** - save this for later

Example:
```
Use this token to access the HTTP API:
1234567890:ABCdefGHIjklMNOpqrsTUVwxyz
```

### 2. Configure Environment Variables

Add the following to your `.env` file:

```bash
# Required: Your bot token from BotFather
TELEGRAM_BOT_TOKEN="1234567890:ABCdefGHIjklMNOpqrsTUVwxyz"

# Optional: Webhook security token (recommended for production)
TELEGRAM_WEBHOOK_SECRET="your-random-secret-token"
```

To generate a secure webhook secret:
```bash
openssl rand -hex 32
```

### 3. Set Up Webhook (After Deployment)

Once your app is deployed to Vercel, you need to tell Telegram where to send updates.

**Option A: Using curl**
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-domain.com/api/telegram/webhook",
    "secret_token": "your-webhook-secret"
  }'
```

**Option B: Using Telegram API directly**
Visit this URL in your browser (replace `<YOUR_BOT_TOKEN>` and `<YOUR_DOMAIN>`):
```
https://api.telegram.org/bot<YOUR_BOT_TOKEN>/setWebhook?url=https://<YOUR_DOMAIN>/api/telegram/webhook
```

**Verify webhook is set:**
```bash
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getWebhookInfo"
```

### 4. Test the Bot

1. Find your bot on Telegram by searching for its username
2. Start a conversation with `/start`
3. Send a praise command:
   ```
   !Praise @username for being awesome today
   ```
4. The bot should respond confirming the praise was recorded

## Usage

### Sending Praise

The command format is:
```
!Praise @username for [your message]
```

**Examples:**
- `!Praise @alice for the amazing talk today`
- `!Praise @bob for helping me debug my code`
- `!Praise @charlie for organizing the event`

**Notes:**
- The `@username` should match either:
  - The recipient's Telegram username
  - The recipient's name in the platform
  - The recipient's email prefix (username part before @)
- Case insensitive
- The bot will confirm when praise is successfully recorded

### Viewing Praise

Users can view their praise through the platform UI (to be implemented):

**API Endpoints Available:**
- `api.praise.getMySentPraise()` - Praise you've sent
- `api.praise.getMyReceivedPraise()` - Praise you've received
- `api.praise.getMyStats()` - Your praise statistics
- `api.praise.getLeaderboard()` - Top praised users
- `api.praise.getPublicPraise({ userId })` - Public praise for a user

### Privacy Controls

By default, all praise is **private** (only visible to sender and recipient).

To make praise public:
```typescript
await api.praise.toggleVisibility.mutate({
  praiseId: "praise_id_here",
  isPublic: true
});
```

## User Matching Logic

The bot attempts to match users in the following order:

### Sender (Person Sending Praise)
1. Lookup in `Contact` table by Telegram username
2. If contact found, map to `User` by email or name
3. Fall back to user search by username/email contains

### Recipient (Person Being Praised)
1. Exact match on `Contact.telegram` field
2. Map contact to `User` via email
3. Fuzzy match on `User.name` field
4. If no match found, save praise with `recipientId = null` and just the username

## Database Schema

The `Praise` model stores:
- **senderId**: Platform user ID who sent the praise
- **senderTelegramId**: Telegram user ID (for verification)
- **recipientId**: Platform user ID being praised (nullable)
- **recipientName**: Original @username from message
- **message**: The praise content
- **category**: Optional auto-categorization
- **eventId**: Optional event context
- **telegramMsgId**: Original Telegram message ID
- **isPublic**: Privacy flag
- **createdAt**: Timestamp

## Admin Features

Admins can view all praise for an event:
```typescript
const eventPraise = await api.praise.getEventPraise.query({
  eventId: "event_id_here"
});
```

View leaderboards:
```typescript
const leaderboard = await api.praise.getLeaderboard.query({
  eventId: "optional_event_id",
  limit: 10
});
```

## Troubleshooting

### Bot Not Responding
1. Check that `TELEGRAM_BOT_TOKEN` is set correctly
2. Verify webhook is configured: `curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo`
3. Check application logs for errors
4. Ensure Vercel deployment is successful

### User Not Found
- Make sure the user has either:
  - A Contact record with their Telegram username
  - A User account with matching name/email
- Check that usernames don't include the `@` symbol in the database

### Webhook Issues
- Verify your domain is HTTPS (Telegram requires SSL)
- Check webhook secret matches in both Telegram and your `.env`
- Review Telegram webhook delivery logs in Telegram API

## Security Considerations

1. **Webhook Secret**: Always use `TELEGRAM_WEBHOOK_SECRET` in production
2. **User Privacy**: Default praise to private unless explicitly made public
3. **Rate Limiting**: Consider adding rate limits for praise commands
4. **Authentication**: Only allow praise from registered users

## Future Enhancements

Potential features to add:
- 📧 Email notifications when you receive praise
- 🏆 Praise categories/tags (e.g., "technical", "mentorship", "community")
- 📊 Weekly praise digest emails
- 🎖️ Badges/achievements for top praised users
- 🔔 Telegram notifications for received praise
- 📝 Reply/comment on praise
- ⭐ Like/react to praise
- 🔍 Search praise by keyword or category

## API Reference

### tRPC Procedures

#### Queries
- `praise.getMySentPraise()` - Get all praise sent by current user
- `praise.getMyReceivedPraise()` - Get all praise received by current user
- `praise.getMyStats()` - Get praise statistics for current user
- `praise.getLeaderboard({ eventId?, limit })` - Get top praised users
- `praise.getEventPraise({ eventId })` - Get all praise for event (admin only)
- `praise.getPublicPraise({ userId, limit })` - Get public praise for a user

#### Mutations
- `praise.toggleVisibility({ praiseId, isPublic })` - Change praise visibility

### Webhook Endpoint

**POST** `/api/telegram/webhook`

Receives updates from Telegram Bot API.

**Headers:**
- `X-Telegram-Bot-Api-Secret-Token`: Optional webhook security token

**Body:** Telegram Update object (JSON)

**GET** `/api/telegram/webhook`

Health check endpoint - returns webhook status.

## Support

For issues or questions:
1. Check application logs in Vercel dashboard
2. Review Sentry error tracking
3. Check Telegram webhook info for delivery issues
4. Review this documentation

## Related Documentation

- [Telegram Bot API](https://core.telegram.org/bots/api)
- [Creating a Telegram Bot](https://core.telegram.org/bots#creating-a-new-bot)
- [Webhook Guide](https://core.telegram.org/bots/webhooks)
