
// package requirements
const moment = require('moment');
const cron = require('node-cron');


// file requirements
const Coupon = require('../models/couponModel');
const adminHelper = require('../helpers/adminHelper')
const Cart = require('../models/cartModel');
const { json } = require('express');
const User = require('../models/userModel');
const Order = require('../models/orderModel');



// get coupon manage page in admin side
const getCouponPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 5
        const skip = (page - 1) * limit

        const totalCount = await Coupon.countDocuments()
        const totalPage = Math.ceil(totalCount / limit);

        const couponDetails = await Coupon.find().skip(skip).limit(limit).sort({ createdAt: -1 }).populate('usedBy')

        res.render('adminView/coupon', {
            couponDetails: couponDetails,
            currentPage: page,
            totalPage: totalPage

        });

    } catch (error) {
        console.log("Error in getting coupon page : ", error.message);
        res.status(500).send("Internal server error");
    }
}



// adding coupon by admin
const addingCoupon = async (req, res) => {
    try {
        const { couponName, minimumPrice, couponAmount, couponExpiry } = req.body

        const newCouponCode = await adminHelper.generateCouponCode()
        console.log("=====>>>>>> :", newCouponCode);

        const expiryDate = moment(couponExpiry, 'DD/MM/YYYY', true);

        if (!expiryDate.isValid()) {
            console.log("Invalid date");
            return res.json({ success: false, message: "Invalid expiration date" });

        }

        const existinCoupon = await Coupon.findOne({
            $or: [
                { couponName: couponName },
                { couponCode: newCouponCode }
            ]
        });

        if (existinCoupon) {
            console.log("Coupon already exist");
            return res.json({ success: false, message: "Coupon already exist" });
        }

        const newCoupon = new Coupon({
            couponName: couponName,
            couponCode: newCouponCode,
            minimumPrice: parseFloat(minimumPrice),
            discount: parseFloat(couponAmount),
            expiryDate: expiryDate.toDate()
        });

        await newCoupon.save();
        console.log("=====>Coupon added");
        res.json({ success: true, message: "Coupon added" });

    } catch (error) {
        console.log("Error in adding coupon : ", error.message);
        res.status(500).send("Internal server error occur");
    }
}



//schedule for coupon update
cron.schedule('0 0 * * *', () => {
    console.log("day and night");
    adminHelper.updateCouponValidity();
})





// change coupon status by admin
const changeCouponStatus = async (req, res) => {
    try {
        const couponId = req.params.couponId
        const { status } = req.body

        const statusChanged = await Coupon.findByIdAndUpdate(couponId, { isActive: status });

        if (!statusChanged) {
            console.log("Cannot change coupon status.....");
            return res.json({ success: false, message: "Please try again" });
        }

        console.log("Coupon status changed.....");
        res.json({ success: true });
    } catch (error) {
        console.log("Error in changing status : ", error.message);
    }
}




// delete coupon by admin
const deleteCoupon = async (req, res) => {
    try {
        const couponId = req.params.couponId;

        const isDeleted = await Coupon.findByIdAndDelete(couponId);

        if (isDeleted) {
            console.log("Coupon deleted success....")
            return res.json({ success: true, message: "Coupon deleted successful" });
        }
        else {
            console.log("Coupon cannot deleted......")
            return res.json({ success: false, message: "Falied to delete coupon" });

        }
    } catch (error) {
        console.log("Error in deleting coupon :", error.message);
        res.status(500).send("Internal server error");
    }
}


// apply coupon by user
const couponApply = async (req, res) => {
    try {
        const { couponCode } = req.body;
        const userId = req.session.user
        console.log(">=>=>=>=>", couponCode);


        const userCart = await Cart.findOne({ user: userId });

        if (!userCart) {
            console.log('Cannot find the cart for this user');
        }

        const coupon = await Coupon.findOne({ couponCode: couponCode, isActive: true });

        if (!coupon) {
            return res.json({ success: false, message: "Invalid coupon code" });
        }

        if (coupon.isValid === 'Expired') {
            return res.json({ success: false, message: "Coupon expired" });
        }

        // if(coupon.isRedeemed === 'redeemed'){
        //     console.log("Coupon redeemed");
        //     return res.json({success : false, message : 'Coupon redeemed'});
        // }

        const userOrder = await Order.find({ user: userId });

        for (const order of userOrder) {
            if (order.couponDetails && order.couponDetails.couponId && order.couponDetails.couponId.toString() === coupon._id.toString()) {
                console.log("Coupon redeemed");
                return res.json({ success: false, message: 'Coupon redeemed' });
            }
        }


        const alreadyUse = userCart.appliedCoupon.find(id => id.toString() === coupon._id.toString())

        if (alreadyUse) {
            console.log('Same coupon already used');
            return res.json({ success: false, message: 'Coupon already used' });
        }

        if (userCart.appliedCoupon.length > 0) {
            console.log('Only one coupon will be allowed');
            return res.json({ success: false, message: 'One coupon will be allowed' });
        }



        userCart.totalCost = userCart.totalCost - coupon.discount;
        userCart.appliedCoupon.push(coupon._id);

        coupon.usedBy.push(userId);

        await Promise.all([coupon.save(), userCart.save()]);

        console.log("Coupon applied");
        res.json({ success: true, message: "Coupon applied", userCart: userCart, couponId: coupon._id });

    } catch (error) {
        console.log("Error in applying coupon :", error.message);
        res.status(500).send("Internal server error");
    }
}




// remove coupon by user
const removeCoupon = async (req, res) => {
    try {
        const userId = req.session.user
        const couponCode = req.body.couponCode

        const userCart = await Cart.findOne({ user: userId });
        if (!userCart) {
            console.log("Cannot find the cart this user...");
            return res.json({ success: false, message: 'Cart not found' });
        }

        if (!userCart.appliedCoupon || userCart.appliedCoupon.length === 0) {
            return res.json({ success: false, message: "Coupon is not applied" });
        }

        const coupon = await Coupon.findOne({ couponCode: couponCode });
        if (!coupon) {
            return res.json({ success: false, message: "Coupon not found" });
        }

        if (!userCart.appliedCoupon.includes(coupon._id.toString())) {
            return res.json({ success: false, message: 'Coupon does not match for removing' });
        }

        userCart.totalCost = userCart.totalCost + coupon.discount

        const index = coupon.usedBy.indexOf(userId);
        if (index > -1) {
            coupon.usedBy.splice(index, 1);
        }

        userCart.appliedCoupon = []

        await Promise.all([userCart.save(), coupon.save()]);

        console.log("Counpon removed successful...");
        res.json({ success: true, message: "Coupon removed", userCart: userCart });

    } catch (error) {
        console.log("Error in removing coupon :", error.message);
        res.status(500).send("Internal server error");
    }
}

module.exports = {
    getCouponPage,
    addingCoupon,
    changeCouponStatus,
    deleteCoupon,
    couponApply,
    removeCoupon
}