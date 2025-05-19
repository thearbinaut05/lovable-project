import express from 'express';
import cors from 'cors';
import bodyParser from 'body-parser';
import fetch from 'node-fetch';

const app = express();
const port = 4000;

app.use(cors());
app.use(bodyParser.json());

// PayPal API credentials - replace with your own
const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID';
const PAYPAL_SECRET = process.env.PAYPAL_SECRET || 'YOUR_PAYPAL_SECRET';
const PAYPAL_API = 'https://api-m.sandbox.paypal.com'; // Use sandbox for testing

// Get PayPal access token
async function getAccessToken() {
  const auth = Buffer.from(PAYPAL_CLIENT_ID + ':' + PAYPAL_SECRET).toString('base64');
  const response = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });
  const data = await response.json();
  return data.access_token;
}

// Endpoint to handle cashout payout
app.post('/cashout', async (req, res) => {
  try {
    const { receiverEmail, amount, currency } = req.body;

    if (!receiverEmail || !amount || !currency) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const accessToken = await getAccessToken();

    const payoutData = {
      sender_batch_header: {
        sender_batch_id: `batch_${Date.now()}`,
        email_subject: 'You have a payout!',
      },
      items: [
        {
          recipient_type: 'EMAIL',
          amount: {
            value: amount,
            currency: currency,
          },
          receiver: receiverEmail,
          note: 'Thanks for using our service!',
          sender_item_id: `item_${Date.now()}`,
        },
      ],
    };

    const payoutResponse = await fetch(`${PAYPAL_API}/v1/payments/payouts`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payoutData),
    });

    const payoutResult = await payoutResponse.json();

    if (payoutResponse.status >= 400) {
      return res.status(payoutResponse.status).json(payoutResult);
    }

    res.json({ success: true, payoutBatchId: payoutResult.batch_header.payout_batch_id });
  } catch (error) {
    console.error('Cashout error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.listen(port, () => {
  console.log(`Cashout server listening at http://localhost:${port}`);
});
