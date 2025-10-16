const express = require('express');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors({ origin: 'https://<your-username>.github.io/<repository-name>' })); // Replace with your GitHub Pages URL

// Razorpay Secret Key (Keep secure, store in environment variables in production)
const RAZORPAY_SECRET = 'rzp_test_YOUR_SECRET_HERE'; // Replace with your actual Razorpay Secret Key

// In-memory storage (Use a database like MongoDB in production)
let payments = [];

function verifyPaymentSignature(payment, signature) {
    const key = RAZORPAY_SECRET;
    const data = `${payment.razorpay_order_id}|${payment.razorpay_payment_id}`;
    const expectedSignature = crypto
        .createHmac('sha256', key)
        .update(data)
        .digest('hex');
    return expectedSignature === signature;
}

app.post('/verify-payment', (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, amount } = req.body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
        return res.status(400).json({ success: false, message: 'Missing payment details' });
    }

    const isValid = verifyPaymentSignature({ razorpay_order_id, razorpay_payment_id }, razorpay_signature);

    if (isValid) {
        payments.push({ razorpay_payment_id, razorpay_order_id, razorpay_signature, amount, timestamp: new Date() });
        res.json({ success: true, message: 'Payment verified successfully' });
    } else {
        res.status(400).json({ success: false, message: 'Invalid payment signature' });
    }
});

// Webhook endpoint for Razorpay (optional, for real-time updates)
app.post('/webhook', (req, res) => {
    const secret = RAZORPAY_SECRET;
    const shasum = crypto.createHmac('sha256', secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest('hex');

    if (digest === req.headers['x-razorpay-signature']) {
        console.log('Payment webhook received', req.body);
        payments.push({ ...req.body.payload.payment.entity, timestamp: new Date() });
        res.status(200).send('Webhook received');
    } else {
        res.status(400).send('Invalid webhook signature');
    }
});

// Start server (for local testing, use a hosting service like Heroku for production)
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
