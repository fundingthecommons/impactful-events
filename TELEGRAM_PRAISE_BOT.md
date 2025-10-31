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

# Optional: Channel ID for automatic praise cross-posting
TELEGRAM_PRAISE_CHANNEL_ID="@your_praise_channel"
# OR use numeric ID: TELEGRAM_PRAISE_CHANNEL_ID="-1001234567890"
```

To generate a secure webhook secret:
```bash
openssl rand -hex 32
```

**Note**: If `TELEGRAM_PRAISE_CHANNEL_ID` is not set, praise will still be saved to the database but won't be cross-posted to a channel.

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

### 4. (Optional) Set Up Channel Cross-Posting

If you want praise to be automatically posted to a Telegram channel anonymously:

#### Step 4a: Create or Use Existing Channel

1. Create a new Telegram channel or use an existing one
2. Make it either public or private
3. Note the channel username (e.g., `@praise_channel`) or ID

#### Step 4b: Add Bot as Admin

1. Go to your channel
2. Click on channel name → Administrators
3. Click "Add Administrator"
4. Search for your bot by username
5. Grant **only** "Post Messages" permission
6. Save

#### Step 4c: Get Channel ID (if using numeric ID)

If your channel is private or you prefer using numeric ID:

```bash
# Send a test message to the channel via the bot
curl -X POST "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/sendMessage" \
  -H "Content-Type: application/json" \
  -d '{"chat_id": "@your_channel_username", "text": "Test"}'

# Get channel updates to see the numeric ID
curl "https://api.telegram.org/bot<YOUR_BOT_TOKEN>/getUpdates"
```

The channel ID will look like: `-1001234567890`

#### Step 4d: Configure Channel in Environment

Add to your `.env` file and deploy:

```bash
TELEGRAM_PRAISE_CHANNEL_ID="@your_praise_channel"
# OR
TELEGRAM_PRAISE_CHANNEL_ID="-1001234567890"

# Optional: For channels with topics/forums, specify the topic ID
TELEGRAM_PRAISE_TOPIC_ID="71"
```

**Getting the Topic ID**:
- If your channel has topics enabled (also called "Forums" or "Topics" in supergroups)
- The topic ID is in the message URL: `https://t.me/c/3079571094/71` → Topic ID is `71`
- Without this, praise posts to the "General" topic

After deployment, all new praise will automatically be cross-posted to the channel anonymously in the format:
```
🌟 Someone praised @alice for helping with the workshop today
```

### 5. (Optional) Add Bot to Public Groups

To enable praise in your community's public Telegram groups/channels:

#### Step 5a: Add Bot to Group

1. Go to your Telegram group or channel
2. Click on group name → Add members
3. Search for `@platform_praise_bot`
4. Add the bot

#### Step 5b: Configure Bot Permissions

For the bot to work properly in groups:

1. **If it's a group**: Bot automatically gets message access
2. **If it's a supergroup/channel**:
   - Make bot an admin (or enable "All Members Are Admins")
   - Bot needs these permissions:
     - ✅ Read Messages
     - ✅ Send Messages (for reactions)
     - ❌ Delete Messages (not needed)
     - ❌ Restrict Members (not needed)

#### Step 5c: Enable Group Privacy (if needed)

If the bot can't see messages in your group:

1. Message @BotFather in Telegram
2. Send `/mybots`
3. Select `@platform_praise_bot`
4. Go to Bot Settings → Group Privacy
5. Click "Turn off" to allow bot to see all messages (required for `!praise` detection)

### 6. Test the Bot

#### Test in DM:
1. Find your bot on Telegram by searching for `@platform_praise_bot`
2. Start a conversation with `/start`
3. Send a praise command:
   ```
   !Praise @username for being awesome today
   ```
4. The bot should respond confirming the praise was recorded
5. If channel is configured, check your praise channel for the anonymous post

#### Test in Group:
1. Go to a group where you added the bot
2. Send a praise command:
   ```
   !Praise @username for their amazing strudel skills
   ```
3. The bot should react with 👍 to your message
4. Check your praise channel - it should show "YourName praised @username for..."

## Usage

### Sending Praise

The command format is:
```
!Praise @username for [your message]
```

**You can send praise in two ways:**

#### 1. Direct Message (DM) to Bot
- Send `!Praise @username for message` directly to @platform_praise_bot
- Bot replies confirming praise was recorded
- **Anonymous in channel**: Cross-posted as "Someone praised @user for..."
- Private and discreet

#### 2. Public Group/Channel Message
- Send `!Praise @username for message` in any group where bot is added
- Bot reacts with 👍 to acknowledge (no text reply to keep chat clean)
- **Shows your name in channel**: Cross-posted as "YourName praised @user for..."
- Public and visible to all group members

**Examples:**
- `!Praise @alice for the amazing talk today`
- `!Praise @bob for helping me debug my code`
- `!Praise @charlie for organizing the event and strudel skills`

**Notes:**
- The `@username` should match either:
  - The recipient's Telegram username
  - The recipient's name in the platform
  - The recipient's email prefix (username part before @)
- Case insensitive
- Works with or without mentioning the bot (@platform_praise_bot)
- In DMs: Bot confirms with text message
- In groups: Bot reacts with 👍 emoji

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

### Channel Cross-Posting Issues
- **Bot not posting to channel**:
  - Verify bot is admin in the channel
  - Check `TELEGRAM_PRAISE_CHANNEL_ID` is set correctly
  - Test bot can post manually: `curl -X POST "https://api.telegram.org/bot<TOKEN>/sendMessage" -d '{"chat_id":"@channel","text":"test"}'`
- **"Chat not found" error**:
  - For private channels, use numeric ID instead of @username
  - Make sure channel ID includes the `-` prefix (e.g., `-1001234567890`)
- **Praise saves but doesn't post to channel**:
  - Check Vercel logs for errors
  - Check Sentry for error reports
  - Verify `TELEGRAM_PRAISE_CHANNEL_ID` is set in Vercel environment variables
- **Bot posts but user gets error**:
  - This is expected behavior - praise saves even if channel post fails
  - Check logs to diagnose channel posting issue

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
