
const Coupon = require('../models/couponModel');



// generate random coupon code
const generateCouponCode = async () => {
    return Math.random().toString(36).substring(2, 10).toUpperCase();
}



// to check coupon is valid or not
const updateCouponValidity = async () => {
    try {
        const currentDate = new Date()

        const expiryCoupons = await Coupon.find({ expiryDate: { $lt: currentDate } });

        await Promise.all(expiryCoupons.map(async (coupon) => {
            if (coupon.isValid !== 'Expired') {
                coupon.isValid = 'Expired'
                await coupon.save();
            }
        }));
        console.log("Coupon validity update successful");
    } catch (error) {
        console.log("Error in updating coupon validity");
    }
}

module.exports = {
    generateCouponCode,
    updateCouponValidity
}