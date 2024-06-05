const User = require("../models/userModel");
const Products = require("../models/productModel");
const Cart = require("../models/cartModel");
const Address = require("../models/addressModel");
const mongoose = require("mongoose");
const Order = require("../models/orderModel");
const Coupon = require("../models/couponModel")
const Wallet = require('../models/walletModel');
const { PDFDocument, rgb } = require('pdf-lib');
const fs = require('fs');
const path = require('path');


const Razorpay = require("razorpay");
const Wishlist = require("../models/wihslistModel");
const { default: items } = require("razorpay/dist/types/items");
require('dotenv').config();


const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

const keyId = process.env.RAZORPAY_KEY_ID
const keySecret = process.env.RAZORPAY_KEY_SECRET




// Get check Out page
const getCheckOutPage = async (req, res) => {
    try {
        const userId = req.session.user


        const allAddresses = await Address.findOne({ user: userId });


        const cartDetails = await Cart.findOne(({ user: userId })).populate("items.product");

        if (!cartDetails) {
            console.log("Cart not found for the user");
            res.status(404).render('userView/fileNotFound');
        }


        for (const cartItem of cartDetails.items) {

            const product = await Products.findById(cartItem.product);

            if (product.updatedAt > cartDetails.updatedAt) {
                console.log("==========> 1")
                if (cartItem.quantity >= product.quantity) {

                    cartItem.quantity = product.quantity
                    cartItem.price = product.salePrice * cartItem.quantity
                    cartDetails.updatedAt = Date.now()
                    console.log("Enter when admin update the product => 1")
                }
                else {
                    cartItem.price = product.salePrice * cartItem.quantity
                    cartDetails.updatedAt = Date.now()
                    console.log("Enter when admin update the product => 2")
                }

                let totalQuantity = 0;
                let totalPrice = 0;

                cartDetails.items.forEach((item) => {
                    totalQuantity += item.quantity
                    totalPrice += item.price
                });

                cartDetails.totalQuantity = totalQuantity
                cartDetails.totalCost = totalPrice



            }
        }

        await cartDetails.save();

        let appliedCouponDetails = []

        if (cartDetails.appliedCoupon.length > 0) {
            for (const couponId of cartDetails.appliedCoupon) {
                const coupon = await Coupon.findById(couponId);
                if (coupon) {
                    appliedCouponDetails.push({
                        couponCode: coupon.couponCode,
                        discount: coupon.discount
                    })
                }
            }
        }


        const totalCost = parseInt(cartDetails.totalCost);

        const couponDetails = await Coupon.find({ isActive: true, minimumPrice: { $lte: totalCost } })


        console.log("cart details isssss   =>", cartDetails);

        res.render("userView/checkOut", {
            allAddresses: allAddresses,
            user: userId,
            cartDetails: cartDetails,
            couponDetails: couponDetails,
            appliedCouponDetails: appliedCouponDetails
        });
        console.log("Check out page rendering successfully");


    } catch (error) {
        console.log("Error in rendering check out page : ", error.message);
        res.status(500).send("Internal server error occur");
    }
}




// Add address in check out
const checkOutAddAddress = async (req, res) => {
    try {
        const userId = req.session.user
        const { addressType, name, addressLine, city, state, pincode, phone, altPhone } = req.body

        const existingAddress = await Address.findOne({ user: userId });
        if (existingAddress) {
            existingAddress.addresses.push({
                addressType: addressType,
                name: name,
                addressLine: addressLine,
                city: city,
                state: state,
                pincode: pincode,
                phone: phone,
                altPhone: altPhone
            });

            await existingAddress.save();
            console.log("User already have an address, new address push in the address array");
        }
        else {
            const newAddress = new Address({
                user: userId,
                addresses: [{

                    addressType: addressType,
                    name: name,
                    addressLine: addressLine,
                    city: city,
                    state: state,
                    pincode: pincode,
                    phone: phone,
                    altPhone: altPhone

                }]
            });
            await newAddress.save();
            console.log("New address added")
        }

        res.redirect("/checkOut");


    } catch (error) {
        console.log(`ERROR in adding address ${error.message}`);
        res.status(500).send("Internal server occur");
    }
}

// get check out page
const getCheckOutEditAddress = async (req, res) => {
    try {
        const userId = req.session.user
        const addressId = req.query.id

        const allAddresses = await Address.findOne({ user: userId });
        console.log(addressId, "address id modallllllllllll");

        const address = allAddresses.addresses.find(address => address._id.equals(addressId));
        if (address) {
            res.json({ address: address });
        }
        else {
            console.log("Address not foud for edit in the check out page");
        }

    } catch (error) {
        console.log("error occur in getting edit address page in the check out page", error.message);
        res.status(500).send("Internal server occur");

    }
}

// update address in the checkout page
const checkOutUpdateAddress = async (req, res) => {
    try {
        const userId = req.session.user
        const { addressId, addressType, name, addressLine, city, state, pincode, phone, altPhone } = req.body
        console.log("======>", addressId, addressType, name, addressLine, city, state, pincode, phone, altPhone);
        console.log("address id isssssss   => ", addressId)

        const upadateAddress = await Address.findOneAndUpdate(
            { "addresses._id": addressId },
            {
                $set: {
                    "addresses.$.addressType": addressType,
                    "addresses.$.name": name,
                    "addresses.$.addressLine": addressLine,
                    "addresses.$.city": city,
                    "addresses.$.state": state,
                    "addresses.$.pincode": pincode,
                    "addresses.$.phone": phone,
                    "addresses.$.altPhone": altPhone
                }
            },
            { new: true }
        );

        if (upadateAddress) {
            res.json({ success: true, user: userId });
            console.log("Address updated");
        }
        else {
            res.json({ success: false, user: userId });
            console.log("Address not updated");
        }


    } catch (error) {
        console.log("Error in updating address in check out page : ", error.message);
        res.status(500).send("Internal server error occur");
    }
}




// razorpay initialization
const razorpayInitialization = async (req, res) => {
    try {

        const userId = req.session.user

        const user = await User.findById(userId);
        const userCart = await Cart.findOne({ user: userId }).populate('items.product');

        if(userCart && userCart.items){
           for(const item of userCart.items){
               let product = await Products.findById(item.product._id);
               if(parseInt(item.quantity) > parseInt(product.quantity)){
                return res.json({success: false, message: `The product ${product.productName} has ${product.quantity} left`});
               }
           }
        }

        let razorpayOrder = await razorpay.orders.create({
            amount: userCart.totalCost * 100,
            currency: 'INR',
            receipt: userCart._id.toString(),
            payment_capture: 1
        });

        res.json({ success: true, user: user, razorpayOrder: razorpayOrder, keyId: keyId });

    } catch (error) {
        console.log("Error in intializing razorpay :", error);
        res.status(500).send("Internal server error");
    }
}





// handle razorpay failure
const handleRazorpayFailure = async (req, res) => {
    try {
        const userId = req.session.user
        const { selectedAddressId, paymentMethod } = req.body

        const selectAddress = await Address.findOne({ user: userId });
        const addressDetails = selectAddress.addresses.find(address => address._id.equals(selectedAddressId));

        const existingOrder = await Order.findOne({
            user: userId,
            'address.addressId': addressDetails._id,
            paymentMethod: paymentMethod,
            status: 'payment failed'
        })

        if (existingOrder) {
            console.log("existing order in the database with status payment failed...");
            return res.json({ success: true, orderId: existingOrder._id });
        }
        else {

            const userCart = await Cart.findOne({ user: userId }).populate("items.product");

            let couponDetails = {}
            if (userCart.appliedCoupon && userCart.appliedCoupon.length > 0) {
                for (const couponId of userCart.appliedCoupon) {
                    const coupon = await Coupon.findById(couponId);
                    if (coupon) {
                        couponDetails = {
                            couponId: coupon._id,
                            discountAmount: coupon.discount
                        }
                    }
                }
            }

            if (paymentMethod === "razorpay") {

                let saveOrder = new Order({
                    user: userId,
                    items: userCart.items.map(item => ({
                        productId: item.product,
                        quantity: item.quantity,
                        price: item.price
                    })),
                    totalCost: userCart.totalCost,
                    address: {
                        addressId: addressDetails._id,
                        addressType: addressDetails.addressType,
                        name: addressDetails.name,
                        addressLine: addressDetails.addressLine,
                        city: addressDetails.city,
                        state: addressDetails.state,
                        pincode: addressDetails.pincode,
                        phone: addressDetails.phone,
                        altPhone: addressDetails.altPhone
                    },
                    paymentMethod: paymentMethod,
                    status: 'payment failed',
                    couponDetails: couponDetails

                });
                let newOrder = await saveOrder.save();
                console.log("Order saved with failure status");


                // await Promise.all(userCart.items.map(async(item) => {
                //     const product = item.product
                //     const updateQuantity = product.quantity - item.quantity
                //     await Products.findByIdAndUpdate(product._id,{quantity : updateQuantity});
                // }));
                //    await Cart.findByIdAndUpdate(userCart._id,{items : [], totalQuantity : 0, totalCost : 0, appliedCoupon : null});
                return res.json({ success: true, orderId: newOrder._id });
            }
            else {
                res.json({ success: false })
            }
        }
    } catch (error) {
        console.log("error in hanlding razorpay failure :", error.message);
        res.stats(500).send("Internal server error");
    }
}







// Place order by user
const placeOrder = async (req, res) => {
    try {
        const userId = req.session.user
        const { selectAddressId, paymentMethod, orderId } = req.body
        console.log("selectedAddressssssss   => :", selectAddressId);

        // const user = await User.findById(userId)
        if (!selectAddressId) {
            return res.status(400).json({ success: false, message: 'Select an address for placing order' });
        }
        if (!paymentMethod) {
            return res.status(400).json({ success: false, message: 'Select a payment method for placing order' });
        }
        const selectedAddress = await Address.findOne({ user: userId })


        const addressDetails = selectedAddress.addresses.find(address => address._id.equals(selectAddressId))


        if (!addressDetails) {
            return res.json({ success: false, message: 'Address details not found for user' });
        }

        const userCart = await Cart.findOne({ user: userId }).populate("items.product");

        if (!userCart) {
            return res.json({ success: false, message: 'Cart not found for user' });
        }
  

        if(userCart && userCart.items){
        for(const item of userCart.items){
            const product = await Products.findById(item.product._id)
            if(parseInt(item.quantity) > parseInt(product.quantity)){
                console.log('Enter quantity checking in placing order');
                return res.json({success: false, message: `The product ${product.productName} has ${product.quantity} left`});
            }
        }
    }
    


        let couponDetails = {};
        if (userCart.appliedCoupon && userCart.appliedCoupon.length > 0) {
            for (const couponId of userCart.appliedCoupon) {
                const coupon = await Coupon.findById(couponId)
                if (coupon) {
                    couponDetails = {
                        couponId: coupon._id,
                        discountAmount: coupon.discount
                    }
                    coupon.isRedeemed = 'redeemed'
                    await coupon.save();
                }
            }
        }


        const userWallet = await Wallet.findOne({ user: userId });

        const existingOrder = await Order.findOne({
            user: userId,
            'address.addressId': addressDetails._id,
            paymentMethod: paymentMethod,
            status: 'payment failed'
        });

        let existingFailureOrder;
        console.log('order Id ======>', orderId);
        if (orderId && orderId !== '') {
            existingFailureOrder = await Order.findOne({
                _id: orderId,
                user: userId,
                status: 'payment failed'
            })
        }
        let saveOrder;

        if (existingOrder) {
            existingOrder.status = 'pending'
            saveOrder = await existingOrder.save();
            console.log("status failure order placed....");
        }
        else {

            if (paymentMethod === 'cash-on-delivery') {

                if (userCart.totalCost < 1000) {
                    return res.json({ success: false, message: 'COD available for orders above 1000 Rs' })
                }

                if (existingFailureOrder && existingFailureOrder !== '') {

                    existingFailureOrder.paymentMethod = paymentMethod
                    existingFailureOrder.status = 'pending',
                        saveOrder = await existingFailureOrder.save();
                    console.log("payment failed status order placed with cash on delivery..");
                }
                else {
                    saveOrder = new Order({
                        user: userId,
                        items: userCart.items.map(item => ({
                            productId: item.product,
                            quantity: item.quantity,
                            price: item.price
                        })),
                        totalCost: userCart.totalCost,
                        address: {
                            addressId: addressDetails._id,
                            addressType: addressDetails.addressType,
                            name: addressDetails.name,
                            addressLine: addressDetails.addressLine,
                            city: addressDetails.city,
                            state: addressDetails.state,
                            pincode: addressDetails.pincode,
                            phone: addressDetails.phone,
                            altPhone: addressDetails.altPhone
                        },
                        paymentMethod: paymentMethod,
                        couponDetails: couponDetails
                    });
                    saveOrder = await saveOrder.save();
                    console.log("Order placed with cash on delivery");
                }
            }
            else if (paymentMethod === 'razorpay') {

                saveOrder = new Order({
                    user: userId,
                    items: userCart.items.map(item => ({
                        productId: item.product,
                        quantity: item.quantity,
                        price: item.price
                    })),
                    totalCost: userCart.totalCost,
                    address: {
                        addressId: addressDetails._id,
                        addressType: addressDetails.addressType,
                        name: addressDetails.name,
                        addressLine: addressDetails.addressLine,
                        city: addressDetails.city,
                        state: addressDetails.state,
                        pincode: addressDetails.pincode,
                        phone: addressDetails.phone,
                        altPhone: addressDetails.altPhone
                    },
                    paymentMethod: paymentMethod,
                    couponDetails: couponDetails
                });
                saveOrder = await saveOrder.save();
                console.log("Order placed with razorpay payment")
            }
            else if (paymentMethod === 'wallet') {

                let totalCost = userCart.totalCost

                if (!userWallet) {
                    return res.json({ success: false, message: "Wallet not found" });
                }

                if (userWallet.balance && userWallet.balance >= totalCost) {

                    userWallet.balance = userWallet.balance - totalCost
                    userWallet.history.push({ status: 'debit', payment: totalCost, date: new Date() });
                    await userWallet.save();

                    if (existingFailureOrder && existingFailureOrder !== '') {
                        existingFailureOrder.paymentMethod = paymentMethod
                        existingFailureOrder.status = 'pending',
                            saveOrder = await existingFailureOrder.save();
                        console.log("payment failed status order placed with wallet amount..");
                    }
                    else {

                        saveOrder = new Order({
                            user: userId,
                            items: userCart.items.map(item => ({
                                productId: item.product,
                                quantity: item.quantity,
                                price: item.price
                            })),
                            totalCost: userCart.totalCost,
                            address: {
                                addressId: addressDetails._id,
                                addressType: addressDetails.addressType,
                                name: addressDetails.name,
                                addressLine: addressDetails.addressLine,
                                city: addressDetails.city,
                                state: addressDetails.state,
                                pincode: addressDetails.pincode,
                                phone: addressDetails.phone,
                                altPhone: addressDetails.altPhone
                            },
                            paymentMethod: paymentMethod,
                            couponDetails: couponDetails
                        });
                        await saveOrder.save();
                        console.log("Order placed with wallet amount")
                    }
                }
                else {
                    return res.json({ success: false, message: "Insufficient wallet balance" });
                }
            }
        }

        await Promise.all(userCart.items.map(async (item) => {
            const product = item.product
            const updateQuantity = product.quantity - item.quantity
            await Products.findByIdAndUpdate(product._id, { quantity: updateQuantity });
        }));

        await Cart.findByIdAndUpdate(userCart._id, { items: [], totalQuantity: 0, totalCost: 0, appliedCoupon: [] });

        res.status(200).json({ success: true, orderId: saveOrder._id });


    } catch (error) {
        console.log("Error in place order : ", error.message);
        res.status(500).send("Internal server error occur");
    }
}





// get order list page by admin
const getOrderListPage = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 4
        const skip = (page - 1) * limit

        const orderCount = await Order.countDocuments()
        const totalPage = Math.ceil(orderCount / limit);

        const order = await Order.find({})
            .populate({
                path: "user",
                select: "name email mobile"
            }).sort({ createdAt: -1 }).skip(skip).limit(limit)

        res.render("adminView/orderList", { order: order, currentPage: page, totalPage: totalPage });
    } catch (error) {
        console.log("Error in getting order listin page : ", error.message);
        res.status(500).send("Intrenal server error")
    }
}




// delete order by admin
const cancelOrderByAdmin = async (req, res) => {
    try {
        const orderId = req.params.orderId
        const order = await Order.findById(orderId);
        const userId = order.user

        console.log("Orders details for cancelling order ===> :", order);

        if (!order) {
            res.json({ status: false, message: "Order not found" });
        }

        for (const item of order.items) {
            await Products.findByIdAndUpdate(item.productId, { $inc: { quantity: item.quantity } })
        }

        if (order.paymentMethod === 'razorpay' || order.paymentMethod === 'wallet') {

            let userWallet = await Wallet.findOne({ user: userId })

            if (!userWallet) {
                userWallet = new Wallet({
                    user: userId,
                    balance: order.totalCost,
                    history: [{
                        status: 'credit',
                        payment: order.totalCost,
                        date: new Date()
                    }]
                })
            }
            else {
                userWallet.balance += order.totalCost
                userWallet.history.push({ status: 'credit', payment: order.totalCost, date: new Date() })
            }
            await userWallet.save();
            console.log('Amount return to wallet');
        }

        order.status = 'cancelled';
        await order.save();
        res.json({ status: true, message: "order cancelled" });
        console.log("Order cancel by admin");

    } catch (error) {
        console.log("Error in cancelling order : ", error.message);
        res.status(500).send("Internal server error occur");
    }
}






// get order details page in the admin side
const getOrderDetailsPage = async (req, res) => {
    try {
        const orderId = req.params.orderId;
        const order = await Order.findById(orderId)
            .populate('user')
            .populate('items.productId')
            .populate('address');

        res.render("adminView/orderDetails", { order: order });
    } catch (error) {
        // Handle error
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};





// change the order status
const changeOrderStatus = async (req, res) => {
    try {
        const { orderId, checknewStatus } = req.body
        console.log(`order id ===> ${orderId}  status ===> ${checknewStatus}`)

        const order = await Order.findById(orderId);
        const userId = order.user
        if (!order) {
            return res.json({ stats: false, message: "Order not found" });
        }
        if (checknewStatus === "returned") {
            for (const item of order.items) {
                await Products.findByIdAndUpdate(item.productId, { $inc: { quantity: item.quantity } });
            }

            if (order.paymentMethod === 'razorpay' || order.paymentMethod === 'wallet') {
                const userWallet = await Wallet.findOne({ user: userId });
                userWallet.balance += order.totalCost
                userWallet.history.push({ status: 'credit', payment: order.totalCost, date: new Date() })
                await userWallet.save();
                console.log("Amount return to wallet when admin accept the return order...")
            }
        }

        order.status = checknewStatus
        await order.save();
        console.log("Status changed success fully")
        res.json({ status: true, message: "Status changed" });
    } catch (error) {
        console.log("Error in changin status", error.message);
        res.status(500).send("Internal server error occur");
    }
}





// get order details in the user side
const userOrderDetailsPage = async (req, res) => {
    try {
        const userId = req.session.user
        const orderId = req.query.orderId
        const userCart = await Cart.findOne({user: userId});
        const userWishlist = await Wishlist.findOne({user: userId})
        const order = await Order.findById(orderId).populate('user').populate('items.productId').populate('address.addressId')

        res.render("userView/userOrderDetails", { order: order, user: userId, userCart: userCart, userWishlist: userWishlist});
    } catch (error) {
        console.log("Error in getting user order detsils : ", error.message);
        res.status(500).send("Internal server error occcur");
    }
}




const cancelOrderByUser = async (req, res) => {
    try {
        const userId = req.session.user
        const orderId = req.params.orderId
        const { reason } = req.body
        const order = await Order.findById(orderId);

        console.log("Orders details for cancelling order ===> :", order);
        console.log("Cancellation reason ======>", reason)

        if (!order) {
            res.json({ status: false, message: "Order not found" });
        }

        for (const item of order.items) {
            await Products.findByIdAndUpdate(item.productId, { $inc: { quantity: item.quantity } })
        }

        if (order.paymentMethod === 'razorpay' || order.paymentMethod === 'wallet') {

            let userWallet = await Wallet.findOne({ user: userId })

            if (!userWallet) {

                userWallet = new Wallet({
                    user: userId,
                    balance: order.totalCost,
                    history: [{
                        status: 'credit',
                        payment: order.totalCost,
                        date: new Date()
                    }]
                });
            }
            else {
                userWallet.balance += order.totalCost
                userWallet.history.push({ status: 'credit', payment: order.totalCost, date: new Date() });
            }
            await userWallet.save();
            console.log('Amout return in to wallet');
        };

        order.cancellationReason = reason
        order.status = 'cancelled';
        await order.save();
        res.json({ status: true, message: "Order Cancelled", user: userId });

    } catch (error) {
        console.log("Error in cancelling order : ", error.message);
        res.status(500).send("Internal server error occur");
    }
}




const returnedOrderByUser = async (req, res) => {
    try {
        const userId = req.session.user
        const orderId = req.params.orderId
        const { reason } = req.body
        console.log("orderId=======>", orderId)
        console.log("========>", reason);

        const order = await Order.findById(orderId)

        if (!order) {
            return res.json({ success: false, message: 'Order not found for return' });
        }

        // for(const item of order.items){
        //     await Products.findByIdAndUpdate(item.productId,{$inc : {quantity : item.quantity}});
        // }

        order.returnedReason = reason
        order.status = 'return pending'
        await order.save();
        res.json({ success: true, message: "Request sent for return", user: userId })
    } catch (error) {
        console.log("Error in order return : ", error.message);
        res.status(500).send("Internal server error");
    }
}




const getOrderSuccessPage = async (req, res) => {
    try {
        const orderId = req.query.orderId
        res.render("userView/orderSuccessPage", { orderId: orderId });

    } catch (error) {
        console.log("Error in getting order success page : ", error.message);
        res.status(500).send("Internal server error occur");
    }
}


// const generateInvoice = async(req, res) => {
//     try{
//         const orderDetails = req.body.orderDetails;

//         const pdfDoc = await PDFDocument.create();
//         const page = pdfDoc.addPage([600, 800]);

//         const fontSize = 12;
//         let yPosition = 750;

//         // Add company details
//         page.drawText('Your Company Name', { x: 50, y: yPosition, size: fontSize, color: rgb(0, 0, 0) });
//         yPosition -= fontSize + 5;
//         page.drawText('Your Company Address', { x: 50, y: yPosition, size: fontSize, color: rgb(0, 0, 0) });
//         yPosition -= fontSize + 5;
//         page.drawText('Your City, Your Country', { x: 50, y: yPosition, size: fontSize, color: rgb(0, 0, 0) });

//         // Add client details
//         yPosition -= fontSize + 20;
//         page.drawText(`Bill To: ${orderDetails.address.name}`, { x: 50, y: yPosition, size: fontSize, color: rgb(0, 0, 0) });
//         yPosition -= fontSize + 5;
//         page.drawText(`${orderDetails.address.addressLine}`, { x: 50, y: yPosition, size: fontSize, color: rgb(0, 0, 0) });
//         yPosition -= fontSize + 5;
//         page.drawText(`${orderDetails.address.city}, ${orderDetails.address.pincode}, India`, { x: 50, y: yPosition, size: fontSize, color: rgb(0, 0, 0) });

//         // Add invoice details
//         yPosition -= fontSize + 20;
//         page.drawText(`Invoice Number: ${orderDetails._id}`, { x: 50, y: yPosition, size: fontSize, color: rgb(0, 0, 0) });
//         yPosition -= fontSize + 5;
//         page.drawText(`Invoice Date: ${new Date().toLocaleDateString()}`, { x: 50, y: yPosition, size: fontSize, color: rgb(0, 0, 0) });

//         // Add product details
//         yPosition -= fontSize + 20;
//         orderDetails.items.forEach((item, index) => {
//             page.drawText(`${index + 1}. ${item.productId.name} - ${item.quantity} x ${item.price}`, { x: 50, y: yPosition, size: fontSize, color: rgb(0, 0, 0) });
//             yPosition -= fontSize + 5;
//         });

//         // Add total cost
//         yPosition -= fontSize + 20;
//         page.drawText(`Total: ${orderDetails.totalCost}`, { x: 50, y: yPosition, size: fontSize, color: rgb(0, 0, 0) });

//         const pdfBytes = await pdfDoc.save();

//         res.setHeader('Content-Type', 'application/pdf');
//         res.setHeader('Content-Disposition', `attachment; filename=Aromatica_invoice.pdf`);
//         res.send(pdfBytes);


//     }catch(error){
//         console.log('Error in generating invoice :', error.message);
//         res.status(500).send('Internal server error');
//     }
// }





module.exports = {
    getCheckOutPage,
    checkOutAddAddress,
    getCheckOutEditAddress,
    checkOutUpdateAddress,
    razorpayInitialization,
    handleRazorpayFailure,
    placeOrder,
    getOrderListPage,
    getOrderDetailsPage,
    changeOrderStatus,
    userOrderDetailsPage,
    cancelOrderByUser,
    cancelOrderByAdmin,
    getOrderSuccessPage,
    returnedOrderByUser,
    // generateInvoice
}