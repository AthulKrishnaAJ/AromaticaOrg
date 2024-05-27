const Razorpay = require("razorpay");
const { webhookSignature } = require('razorpay');
require('dotenv').config();
const crypto = require('crypto')

const Wallet = require('../models/walletModel');
const User = require('../models/userModel');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET


// razorpay initialization
const addMoneyInWallet = async (req, res) => {
    try {
        const userId = req.session.user
        const { amount } = req.body

        const user = await User.findById(userId);
        const userWallet = await Wallet.findOne({ user: userId })
        const order = await razorpay.orders.create({
            amount: amount * 100,
            currency: 'INR',
            receipt: 'wallet_recharge'
        });

        req.session.walletRecharge = order
        res.json({ success: true, user: user, order: order, keyId: keyId });
    } catch (error) {
        console.log('error in intializing razorpay :', error);

    }
}


const addMoneySuccess = async (req, res) => {
    try {
        const userId = req.session.user
        const { razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body
        console.log("=>", razorpay_payment_id)
        console.log("==>", razorpay_order_id)

        const order = req.session.walletRecharge
        let data = crypto.createHmac('sha256', keySecret);
        data.update(razorpay_order_id + '|' + razorpay_payment_id);

        const signatue = data.digest('hex')

        console.log("===>", razorpay_signature);
        console.log("====>", signatue);

        if (razorpay_signature === signatue) {

            let wallet = await Wallet.findOne({ user: userId });

            if (!wallet) {
                wallet = new Wallet({ user: userId, balance: order.amount / 100 });
            }
            else {
                wallet.balance += order.amount / 100
            }

            wallet.history.push({ status: 'credit', payment: order.amount / 100, date: new Date() });
            await wallet.save();
            req.session.walletRecharge = null

            return res.json({ success: true, wallet: wallet, message: "Money added" })
        }
        else {
            res.json({ success: false, message: "Payment verification failed" });
        }

    } catch (error) {
        console.log("Error in adding money in the wallet :", error.message);
        res.status(500).send("Internal server error");
    }
}

module.exports = {
    addMoneyInWallet,
    addMoneySuccess
}