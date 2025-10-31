#!/bin/bash

# Test webhook endpoint manually with a simulated group message

echo "Testing webhook with simulated group praise message..."
echo ""

curl -X POST "https://platform.fundingthecommons.io/api/telegram/webhook" \
  -H "Content-Type: application/json" \
  -H "X-Telegram-Bot-Api-Secret-Token: c43b7407d961daacefb22694fe542ee37e6c771f5c7e64a81d606fcaa2857072" \
  -d '{
    "update_id": 999999,
    "message": {
      "message_id": 12345,
      "from": {
        "id": 467634857,
        "is_bot": false,
        "first_name": "James",
        "last_name": "Test",
        "username": "jamestest"
      },
      "chat": {
        "id": -1003079571094,
        "type": "supergroup"
      },
      "date": 1698765432,
      "text": "!praise @AlisherX for his introduction to Keycard and blind signing"
    }
  }'

echo ""
echo ""
echo "Check Vercel logs to see if this was processed:"
echo "https://vercel.com/dashboard"
