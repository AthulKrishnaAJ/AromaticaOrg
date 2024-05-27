
const nodeMailer = require("nodemailer");
const otpGenerator = require("otp-generator");
const bcrypt = require("bcryptjs");
// const toast = require("toastify-js");
// const jwt = require("jsonwebtoken");



// file requirements
const User = require("../models/userModel");
const Products = require("../models/productModel");
const Address = require("../models/addressModel");
const userHelper = require("../helpers/userHelper");
const Category = require("../models/categoryModel");
const Order = require("../models/orderModel");
const Wallet = require('../models/walletModel');

const { use } = require("bcrypt/promises");
const { findById } = require("../models/categoryModel");
const { query } = require("express");
const Offer = require("../models/offerModel");
const Wishlist = require("../models/wihslistModel");
const Cart = require("../models/cartModel");






//Load home Page
const loadHomePage = async (req, res) => {
    try {
        const user = req.session.user;
        const findUser = req.session.userData

        const unListedCategory = await Category.find({ isListed: false });

        const productsData = await Products.find({
            isBlocked: false,
            'category.categoryId': { $nin: unListedCategory.map(cat => cat._id) }
        }).sort({ createdAt: 1 }).limit(6).populate({
            path: 'category',
            match: { isListed: true },
            select: 'name'
        });

        const userCart = await Cart.findOne({user: user})
        const userWishlist = await Wishlist.findOne({user: user})

        for (const product of productsData) {


            const productOffers = await Offer.find({
                offerType: 'Product',
                'productOffer.productId': product._id,
                isActive: true
            });


            let maxProductDiscount = 0
            productOffers.forEach(offer => {
                if (offer.productOffer.discount > maxProductDiscount) {
                    maxProductDiscount = offer.productOffer.discount
                }
            });

            product.productOrginalPrice = product.salePrice + maxProductDiscount
            product.hasProductOffer = maxProductDiscount > 0
            product.maxProductDiscount = maxProductDiscount


            let maxCategoryDiscount = 0;
            const existingCategoryOffers = await Offer.find({
                offerType: 'Category',
                'categoryOffer.categoryId': product.category.categoryId._id,
                isActive: true
            });

            existingCategoryOffers.forEach(offer => {
                if (offer.categoryOffer.discount > maxCategoryDiscount) {
                    maxCategoryDiscount = offer.categoryOffer.discount
                }
            });

            product.categoryOrginalPrice = product.salePrice + maxCategoryDiscount
            product.hasDiscount = maxCategoryDiscount > 0
            product.maxDiscount = maxCategoryDiscount


            if (product.hasProductOffer && product.hasDiscount) {

                product.availableOriginalPrice = product.salePrice + maxProductDiscount
                product.availableDiscount = maxProductDiscount
            }

        }

        if (user) {
            res.render("userView/home", { user: user, product: productsData, userCart: userCart, userWishlist: userWishlist });
        }
        else {
            res.render("userView/home", { product: productsData, userCart: userCart, userWishlist: userWishlist });
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).send("Internal error occured", error.message);
    }

}



// Load login page
const loadUserLoginPage = (req, res) => {
    try {
        if (!req.session.user) {
            res.render("userView/userLogin")
        }
        else {
            res.redirect("/");
        }

    } catch (error) {
        console.log(`Somthing error.... ${error}`);
        res.status(500).send("Internal error occured", error.message);

    }
}




// User insert the details on login page
const insertDetailsInLogin = async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email: email, isAdmin: 0 })
        console.log("Find the user for login  => ", user);
        // const productData = await Products.find({isBlocked : false}).sort({_id : -1}).limit(6);

        if (user) {
            const userNotBlocked = user.isBlocked === false

            if (userNotBlocked) {
                const matchPassword = await bcrypt.compare(password, user.password,)

                if (matchPassword) {
                    req.session.user = user._id;
                    req.session.userData = user
                    res.redirect('/')
                    // res.render("userView/home",{product : productData , user : user});
                    console.log("Login successfullyyyyyyyyy");
                    return;
                }
                else {
                    console.log("Password not match")
                    res.render("userView/userLogin", { message: "Password not matching" })
                }

            }
            else {
                console.log("User is blocked");
                res.render("userView/userLogin", { message: "User is blocked" })
            }
        }
        else {
            console.log("User not found");
            res.render("userView/userLogin", { message: "User not found please signup" })
        }
    } catch (error) {
        console.log(error.message);
        res.status(500).render("userView/userLogin", { message: "something went wrong login failed" })

    }
}





// Load signup page
const loadSignUpPage = (req, res) => {
    try {
        if (!req.session.user) {

            const errorMessage = req.query.error
            res.render("userView/userSignup", { errorMessage });
            console.log("Render sign up page");

        }
        else {
            res.render("/")
        }
    } catch (error) {
        console.log(`Something went wrong ${error}`);
        res.status(500).send({ message: "internal error occurred" });
    }
}





// User signing for generate OTP
const insertDetailsInSignUp = async (req, res) => {
    try {
        const { name, email, mobile, password, confirmPassword, referral } = req.body;
        req.session.referral = referral
        const findUser = await User.findOne({ email });

        if (!findUser) {

            if (password === confirmPassword) {
                //generate otp
                const otp = otpGenerator.generate(6, {
                    digits: true, lowerCaseAlphabets: false,
                    upperCaseAlphabets: false, specialChars: false
                });
                console.log("This is OTP => ", otp);

                const info = await userHelper.sendOtpByEmail(email, otp);

                if (info) {
                    req.session.userOtp = otp
                    req.session.userData = { name, email, mobile, password }
                    res.render("userView/verifyOtp")
                }
            }
            else {
                console.log("Confirm password is not matching to the password");

            }

        }
        else {
            console.log("User already exist")
            res.redirect("/signup?error=User already exist change the email")
            // res.render("userView/userSignup",{message:"User already exist change the email"});
        }


    } catch (error) {
        console.log("Error in otp generation", error.message);
        res.render("userView/userSignup", { message: "Error in OTP generation, Please try again..!" })
    }

}



const getOtPage = async (req, res) => {
    try {
        res.render("userView/verifyOtp");
        console.log("Render otp page");
    } catch (error) {
        console.log("Get otp page error", error.message);
        res.status(500).send("Internal server error")
    }

}



// verifiying OTP
const verifyOtp = async (req, res) => {
    try {
        const enteredOtp = req.body.otp

        console.log("entered otp  ====>", enteredOtp);

        if (req.session.userOtp === enteredOtp) {

            const userData = req.session.userData
            const passwordHash = await userHelper.securePassword(userData.password);
            const email = userData.email

            const referralCode = await userHelper.generateString();
            console.log('referral ======>', referralCode);



            if (req.session.referral) {
                const existingUser = await User.findOne({ referralCode: req.session.referral });
                if (existingUser) {
                    const wallet = await Wallet.findOne({ user: existingUser._id });
                    if (wallet) {
                        wallet.balance += 50
                        // wallet.history.push({status : 'credit', payment : 50, date : new Date()});
                        await wallet.save();
                    } else {
                        const newWallet = new Wallet({
                            user: existingUser._id,
                            balance: 50
                        })
                        // newWallet.history.push({status : 'credit', payment : 50, date : new Date()});
                        await newWallet.save();
                    }
                }
            }

            const userExist = await User.findOne({ email: email })

            if (!userExist) {

                const newUser = new User({
                    name: userData.name,
                    email: userData.email,
                    mobile: userData.mobile,
                    password: passwordHash,
                    referralCode: referralCode
                });
                await newUser.save()
                // req.session.user = newUser._id;
                const existingUser = await User.findOne({ referralCode: req.session.referral });
                if (existingUser) {
                    const newUserWallet = new Wallet({
                        user: newUser._id,
                        balance: 50
                    });
                    await newUserWallet.save();
                } else {
                    const newUserWallet = new Wallet({
                        user: newUser._id,
                        balance: 0
                    });
                    await newUserWallet.save();
                }

                console.log("rejistered successfully");
                res.json({ status: true });
            }
            else {
                res.json({ status: false, message: "User already rejistered" });
            }

        } else {
            console.log("OTP not matching");
            res.json({ status: false, message: "Invalid OTP" });

        }

    } catch (error) {
        console.log("internal error:", error.message);
    }

}




const resendOtp = async (req, res) => {
    try {
        const email = req.session.userData.email;
        const newOtp = otpGenerator.generate(6, { digits: true, lowerCaseAlphabets: false, upperCaseAlphabets: false, specialChars: false });
        console.log(`${email} & ${newOtp}`)

        const info = await userHelper.resendOtpSendByEmail(email, newOtp);

        if (info) {
            req.session.userOtp = newOtp
            res.json({ success: true, message: "OTP resend successfully" });
        }
        else {
            res.json({ success: false, message: "Resend OTP failed" })
        }

    } catch (error) {
        console.log("Error in OTP generation", error.message);
        res.json({ success: false, message: "Error in otp generation" });
    }
}



const logoutUser = (req, res) => {
    try {
        //    req.session.destroy((error) => {
        //     if(error){
        //         console.log("Logout error",error.message);
        //     }
        //     else{
        //         res.redirect("/login");
        //         console.log("User logout successful");
        //     }
        // })
        // req.logout()
        req.session.user = null
        res.redirect("/login");
        console.log("User logout successfull");

    } catch (error) {
        console.log("Error during logout", error.message);
        res.status(500).send("Internal sever error");
    }
}



const getProductDetails = async (req, res) => {
    try {

        const userId = req.session.user
        console.log(`user Id in the product details : ${userId}`);

        const productId = req.query.id;
        console.log(`Product Id in the product details: ${productId}`);

        const findProduct = await Products.findById(productId);
        console.log(`find product id for product details : ${findProduct._id}`);

        const allProducts = await Products.find({ isBlocked: false });

        const productOffer = await Offer.find({
            offerType: 'Product',
            'productOffer.productId': findProduct._id,
            isActive: true
        });

        const userCart = await Cart.findOne({user: userId});

        console.log('available product offer ===>', productOffer);

        let maxProductDiscount = 0;
        productOffer.forEach(offer => {
            if (offer.productOffer.discount > maxProductDiscount) {
                maxProductDiscount = offer.productOffer.discount
            }
        });

        console.log('max product discount ===>', maxProductDiscount);

        findProduct.productOrginalPrice = findProduct.salePrice + maxProductDiscount
        findProduct.hasProductOffer = maxProductDiscount > 0
        findProduct.maxProductDiscount = maxProductDiscount


        const categoryOffer = await Offer.find({
            offerType: 'Category',
            'categoryOffer.categoryId': findProduct.category.categoryId,
            isActive: true
        });
        console.log('available category offer =====>', categoryOffer);

        let maxCategoryOfferDiscount = 0;
        categoryOffer.forEach(offer => {
            if (offer.categoryOffer.discount > maxCategoryOfferDiscount) {
                maxCategoryOfferDiscount = offer.categoryOffer.discount
            }
        });

        console.log('max category offer discount ====>', maxCategoryOfferDiscount);

        findProduct.categoryOrginalPrice = findProduct.salePrice + maxCategoryOfferDiscount
        findProduct.hasCategoryOffer = maxCategoryOfferDiscount > 0
        findProduct.maxCategoryOfferDiscount = maxCategoryOfferDiscount


        let maxAvailableDiscount = 0

        if (findProduct.hasProductOffer && findProduct.hasCategoryOffer) {

            maxAvailableDiscount = maxProductDiscount
        }
        else if (findProduct.hasProductOffer) {

            maxAvailableDiscount = maxProductDiscount
        }
        else if (findProduct.hasCategoryOffer) {

            maxAvailableDiscount = maxCategoryOfferDiscount
        }

        findProduct.availableOriginalPrice = findProduct.salePrice + maxAvailableDiscount
        findProduct.availableDiscount = maxAvailableDiscount

        let isInWishlist = false
        
        if (userId) {
           const userWishlist = await Wishlist.findOne({ user: userId, 'products.productId': productId });
            isInWishlist = !!userWishlist
        }

        const userWishlist = await Wishlist.findOne({user: userId})

        if (userId) {
            res.render("userView/productDetails", { user: userId, product: findProduct, allProduct: allProducts, isInWishlist: isInWishlist, userWishlist: userWishlist, userCart: userCart });
        }
        else {
            res.render("userView/productDetails", { product: findProduct, allProduct: allProducts, isInWishlist: isInWishlist, userWishlist: userWishlist, userCart: userCart });
        }

    } catch (error) {
        console.log(`Error in product details page : ${error.message}`)
        res.status(500).redirect('/fileNotFound');
    }
}


// Get profile
const getUserProfile = async (req, res) => {
    try {
        const userId = req.session.user
        const userData = await User.findById(userId);
        console.log(`User data is  => ${userData}`);


        const userAddress = await Address.findOne({ user: userId });

        const order = await Order.find({ user: userId }).populate({
            path: "items.productId",
            select: "productName productImage",

        }).sort({ createdAt: -1 })


        const wallet = await Wallet.findOne({ user: userId });
        const userCart = await Cart.findOne({user: userId});
        const userWishlist = await Wishlist.findOne({user: userId})


        res.render("userView/profile", { user: userData, userAddress: userAddress, order: order, wallet: wallet, userCart: userCart, userWishlist: userWishlist });
        console.log("Render user profile page");
    } catch (error) {
        console.log(`Internal server occur while rendering user profile ${error.message}`);
        res.status(500).send("Internal server occur");
    }
}



const getOrders = async (req, res) => {
    try {
        const userId = req.session.user
        const currentPage = parseInt(req.query.page) || 1
        const limit = 5
        const skip = (currentPage - 1) * limit

        const orders = await Order.find({ user: userId })
            .populate({
                path: "items.productId",
                select: "productName productImage"
            })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)

        const totalCount = await Order.countDocuments({ user: userId });
        const totalPage = Math.ceil(totalCount / limit);

        res.json({ orders: orders, totalPage: totalPage })
    } catch (error) {
        console.log('Error in the getting orders with pagination :', error.message);
        res.status(500).send("Intrenal server error");
    }
}


const getWalletDetails = async (req, res) => {
    try {
        const userId = req.session.user
        const currentPage = parseInt(req.query.page) || 1
        const limit = 6
        const skip = (currentPage - 1) * limit

        const wallet = await Wallet.findOne({ user: userId })
        if (wallet) {
            const totalCount = wallet.history.length
            const totalPage = Math.ceil(totalCount / limit);
            const transaction = wallet.history.slice(skip, skip + limit);

            res.json({ transaction: transaction, totalPage: totalPage });
        }
        else {
            console.log("user have no wallet");
        }

    } catch (error) {
        console.log("Error in getting wallet details with pagination :", error.message);
        res.status(500).send("Internal server error");
    }
}


// Get add address
const getAddAddress = async (req, res) => {
    try {
        const userId = req.session.user
        // console.log(userId);
        res.render("userView/addAddress", { user: userId });
        console.log("Address page render successfully");
    } catch (error) {
        console.log(`Error in rendering add address page ${error.message}`);
        res.status(500).send("Internal server error occur");
    }
}



// Add details on the address
const addAddress = async (req, res) => {
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

        res.redirect("/profile");


    } catch (error) {
        console.log(`ERROR in adding address ${error.message}`);
        res.status(500).send("Internal server occur");
    }
}



// Get edit address page
const getEditAddress = async (req, res) => {
    try {
        const userId = req.session.user
        // console.log(userId);

        const addressId = req.query.id
        // console.log(`address id is  => ${addressId}`);

        const userAddress = await Address.findOne({ user: userId });

        if (!userAddress) {
            return res.status(404).send("No address found for this user");
        }

        const addressToEdit = userAddress.addresses.find(address => address._id == addressId);
        console.log(`addressd to edit  => ${addressToEdit}`)

        if (!addressToEdit) {
            return res.status(404).send("Address is not found");
        }

        res.render("userView/editAddress", { addressToEdit: addressToEdit });
    } catch (error) {
        console.log(`Error in rendering edit address page ${error.message}`);
        res.status(500).send("Internal server error");
    }
}



const updateTheAddress = async (req, res) => {
    try {
        const userId = req.session.user
        const addressId = req.query.id
        const { addressType, name, addressLine, city, state, pincode, phone, altPhone } = req.body;

        const userAddress = await Address.findOne({ user: userId, "addresses._id": addressId });

        if (!userAddress) {
            return res.json({ status: false, message: "Address not found for this user" });
        }
        // const findAddress = userAddress.addresses.find(address => address._id.equals(addressId));
        // console.log(`Find address  => ${findAddress}`);

        const updateObj = {
            addressType: addressType,
            name: name,
            addressLine: addressLine,
            city: city,
            state: state,
            pincode: pincode,
            phone: phone,
            altPhone: altPhone
        }

        await Address.updateOne(
            { "addresses._id": addressId },
            {
                $set: {
                    "addresses.$": updateObj
                }
            }
        );

        res.json({ status: true, message: "Address updated" });
        console.log("Address updated successfully");


    } catch (error) {
        console.log(`Error in update user address ${error.message}`);
        res.status(500).send("Internal server error occur");
    }
}




const deleteAddress = async (req, res) => {
    try {
        const userId = req.session.user
        const addressId = req.body.addressId
        console.log("address id is  => ", addressId);

        const result = await Address.updateOne(
            { user: userId },
            { $pull: { addresses: { _id: addressId } } }
        );
        if (result) {
            res.json({ status: true })
            console.log("Addresds has been removed successfully");
        }
        else {
            res.json({ status: false, message: "Failed to delete address!" });
            console.log("Address is not remove");
        }

    } catch (error) {
        console.log(`Error in deleting address ${error.message}`);
        res.status(500).send("Internal server error occur");
    }
}





// get shop page
const getShopPage = async (req, res) => {
    try {
        const userId = req.session.user
        const searchQuery = req.query.query
        const page = parseInt(req.query.page) || 1
        const limit = 6
        const skip = (page - 1) * limit

        const category = await Category.find({ isListed: true });
        const catId = category.map(cat => cat._id);


        let query = {
            isBlocked: false,
            'category.categoryId': { $in: catId }
        }

        if (searchQuery) {
            query.productName = { $regex: searchQuery, $options: 'i' }
        }

        const totalCount = await Products.countDocuments(query);

        const products = await Products.find(query)
            .populate('category.categoryId').skip(skip).limit(limit)


        for (const product of products) {


            const productOffers = await Offer.find({
                offerType: 'Product',
                'productOffer.productId': product._id,
                isActive: true
            });


            let maxProductDiscount = 0
            productOffers.forEach(offer => {
                if (offer.productOffer.discount > maxProductDiscount) {
                    maxProductDiscount = offer.productOffer.discount
                }
            });

            product.productOrginalPrice = product.salePrice + maxProductDiscount
            product.hasProductOffer = maxProductDiscount > 0
            product.maxProductDiscount = maxProductDiscount


            let maxCategoryDiscount = 0;
            const existingCategoryOffers = await Offer.find({
                offerType: 'Category',
                'categoryOffer.categoryId': product.category.categoryId._id,
                isActive: true
            });

            existingCategoryOffers.forEach(offer => {
                if (offer.categoryOffer.discount > maxCategoryDiscount) {
                    maxCategoryDiscount = offer.categoryOffer.discount
                }
            });

            product.categoryOrginalPrice = product.salePrice + maxCategoryDiscount
            product.hasDiscount = maxCategoryDiscount > 0
            product.maxDiscount = maxCategoryDiscount


            if (product.hasProductOffer && product.hasDiscount) {

                product.availableOriginalPrice = product.salePrice + maxProductDiscount
                product.availableDiscount = maxProductDiscount
            }

        }


        const userCart = await Cart.findOne({user: userId});
        const userWishlist = await Wishlist.findOne({user: userId})

        res.render('userView/shop', {
            user: userId,
            product: products,
            category: category,
            query: searchQuery,
            noItemsFound: products.length === 0,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            userCart: userCart,
            userWishlist: userWishlist
        });
    } catch (error) {
        console.log('Error in getting shop page : ', error.message);
        res.status(500).send("Internal server error");
    }
}



// filter product by category
const filterCategory = async (req, res) => {
    try {
        const userId = req.session.user
        const categoryId = req.query.categoryId
        const searchQuery = req.query.query

        const page = parseInt(req.query.page) || 1
        const limit = 6
        const skip = (page - 1) * limit

        const categories = await Category.find({ isListed: true });

        const userCart = await Cart.findOne({user: userId});
        const userWishlist = await Wishlist.findOne({user: userId});

        let queryConditon = {
            isBlocked: false,
            'category.categoryId': categoryId,
        }

        if (searchQuery && searchQuery.trim() !== "") {
            queryConditon.productName = { $regex: searchQuery, $options: 'i' }
        }

        const totalCount = await Products.countDocuments(queryConditon);

        let products = await Products.find(queryConditon).populate('category.categoryId')
            .skip(skip).limit(limit)

        for (const product of products) {


            const productOffers = await Offer.find({
                offerType: 'Product',
                'productOffer.productId': product._id,
                isActive: true
            });


            let maxProductDiscount = 0
            productOffers.forEach(offer => {
                if (offer.productOffer.discount > maxProductDiscount) {
                    maxProductDiscount = offer.productOffer.discount
                }
            });

            product.productOrginalPrice = product.salePrice + maxProductDiscount
            product.hasProductOffer = maxProductDiscount > 0
            product.maxProductDiscount = maxProductDiscount


            let maxCategoryDiscount = 0;
            const existingCategoryOffers = await Offer.find({
                offerType: 'Category',
                'categoryOffer.categoryId': product.category.categoryId._id,
                isActive: true
            });

            existingCategoryOffers.forEach(offer => {
                if (offer.categoryOffer.discount > maxCategoryDiscount) {
                    maxCategoryDiscount = offer.categoryOffer.discount
                }
            });

            product.categoryOrginalPrice = product.salePrice + maxCategoryDiscount
            product.hasDiscount = maxCategoryDiscount > 0
            product.maxDiscount = maxCategoryDiscount


            if (product.hasProductOffer && product.hasDiscount) {

                product.availableOriginalPrice = product.salePrice + maxProductDiscount
                product.availableDiscount = maxProductDiscount
            }

        }

        res.render('userView/shop', {
            user: userId,
            product: products,
            category: categories,
            query: searchQuery,
            currentPage: page,
            totalPages: Math.ceil(totalCount / limit),
            noItemsFound: products.length <= 0,
            categoryId: categoryId,
            userCart: userCart,
            userWishlist: userWishlist
        })
    } catch (error) {
        console.log("Error in filtering category : ", error.message);
        res.status(500).send("Internal server error");
    }
}



// search products
const searchProducts = (req, res) => {
    try {
        const previousRoute = req.headers.referer;
        let redirectTo;
        let query = req.query.search || '';


        if (previousRoute) {
            const url = new URL(previousRoute);
            const categoryId = url.searchParams.get('categoryId');
            const sortBy = url.searchParams.get('sortBy');
            const sortByName = url.searchParams.get('sortByName');
            const minPrice = url.searchParams.get('minPrice');
            const maxPrice = url.searchParams.get('maxPrice');

            if (categoryId) {
                redirectTo = `/filterCategory?categoryId=${categoryId}`;

                console.log("1")
                if (query) {
                    url.searchParams.set('query', query);
                }
            }
            else if (sortBy) {
                redirectTo = `/filterProductWithPrice?sortBy=${sortBy}`
                console.log("2")
                if (query) {
                    url.searchParams.set('query', query);
                }
            }
            else if (sortByName) {
                redirectTo = `/sortProductWithName?sortByName=${sortByName}`
                console.log("3")
                if (query) {
                    url.searchParams.set('query', query)
                }
            }
            else if (minPrice && maxPrice) {
                redirectTo = `/filterPrice?minPrice=${minPrice}&maxPrice=${maxPrice}`
                console.log("4")
                if (query) {
                    url.searchParams.set('query', query)
                }
            }
            else {
                redirectTo = '/shop';
                console.log("5")
                if (query) {
                    url.searchParams.set('query', query);
                }
            }

            redirectTo = url.toString();
        }

        res.redirect(redirectTo || '/shop');
    } catch (error) {
        console.log("Error in searching products: ", error.message);
        res.status(500).send("Internal server error");
    }
}



const filterPriceRange = async (req, res) => {
    try {
        const { minPrice, maxPrice } = req.query;
        const userId = req.session.user
        const searchQuery = req.query.query

        const userCart = await Cart.findOne({user: userId});
        const userWishlist = await Wishlist.findOne({user: userId});

        const category = await Category.find({ isListed: true });
        const catId = category.map(cat => cat._id)

        let query = {
            salePrice: { $gte: minPrice, $lte: maxPrice },
            isBlocked: false,
            'category.categoryId': { $in: catId }
        }

        const currentPage = parseInt(req.query.page) || 1
        const limit = 6
        const skip = (currentPage - 1) * limit

        if (searchQuery) {
            query.productName = { $regex: searchQuery, $options: 'i' }
        }


        const totalProducts = await Products.countDocuments(query);

        const product = await Products.find(query)
            .populate('category.categoryId').skip(skip).limit(limit);

        const totalPages = Math.ceil(totalProducts / limit);



        res.render("userView/shop", {
            user: userId,
            product: product,
            category: category,
            query: searchQuery ? searchQuery : '',
            noItemsFound: product.length === 0,
            currentPage: currentPage,
            totalPages: totalPages,
            minPrice: minPrice,
            maxPrice: maxPrice,
            userCart: userCart,
            userWishlist: userWishlist

        })

    } catch (error) {
        console.log("Error in filter product by price : ", error.message);
        res.status(500).send("Internal server error");
    }
}





// sort product by price
const sortProductWithPrice = async (req, res) => {
    try {
        const { sortBy } = req.query;
        const searchQuery = req.query.query;
        const userId = req.session.user;

        const userCart = await Cart.findOne({user: userId});
        const userWishlist = await Wishlist.findOne({user: userId});

        const category = await Category.find({ isListed: true });
        const cateId = category.map((cat) => cat._id);

        let query = {
            isBlocked: false,
            'category.categoryId': { $in: cateId }
        };

        if (searchQuery) {
            query.productName = { $regex: searchQuery, $options: 'i' };
        }

        const totalProducts = await Products.countDocuments(query);

        const currentPage = parseInt(req.query.page) || 1;
        const limit = 6;
        const skip = (currentPage - 1) * limit;

        let product;

        if (searchQuery) {

            if (sortBy === 'lowToHigh') {
                product = await Products.find(query)
                    .sort({ salePrice: 1 })
                    .skip(skip)
                    .limit(limit);
            } else {
                product = await Products.find(query)
                    .sort({ salePrice: -1 })
                    .skip(skip)
                    .limit(limit);
            }
        } else {
            product = await Products.find(query)
                .populate('category.categoryId')
                .sort(sortBy === 'lowToHigh' ? { salePrice: 1 } : { salePrice: -1 })
                .skip(skip)
                .limit(limit);
        }

        const totalPages = Math.ceil(totalProducts / limit);

        res.render("userView/shop", {
            user: userId,
            product: product,
            category: category,
            query: searchQuery ? searchQuery : '',
            noItemsFound: product.length === 0,
            currentPage: currentPage,
            totalPages: totalPages,
            sortBy: sortBy,
            userCart: userCart,
            userWishlist: userWishlist
        });

    } catch (error) {
        console.log("Error in sorting product with price: ", error.message);
        res.status(500).send("Internal server error");
    }
};




// sort product by name
const sortProductWithName = async (req, res) => {
    try {
        const userId = req.session.user
        const searchQuery = req.query.query
        const { sortByName } = req.query

        const userCart = await Cart.findOne({user: userId});
        const userWishlist = await Wishlist.findOne({user: userId});

        const categories = await Category.find({ isListed: true });
        const catId = categories.map(cat => cat._id)

        let query = {
            isBlocked: false,
            'category.categoryId': { $in: catId }
        }

        if (searchQuery) {
            query.productName = { $regex: searchQuery, $options: 'i' }
        }

        let products = await Products.find(query)
            .populate('category.categoryId')


        if (sortByName === "ascending") {
            products = products.sort((a, b) => a.productName.localeCompare(b.productName))
        }
        else if (sortByName === "descending") {
            products = products.sort((a, b) => b.productName.localeCompare(a.productName));
        }

        const totalProducts = products.length

        const currentPage = parseInt(req.query.page) || 1
        const limit = 6
        const skip = (currentPage - 1) * limit
        const totalPages = Math.ceil(totalProducts / limit)

        products = products.slice(skip, skip + limit);


        res.render("userView/shop", {
            user: userId,
            product: products,
            category: categories,
            query: searchQuery ? searchQuery : '',
            noItemsFound: products.length === 0,
            currentPage: currentPage,
            totalPages: totalPages,
            sortByName: sortByName,
            userCart: userCart,
            userWishlist: userWishlist
        })

    } catch (error) {
        console.log("Error in sorting product with name : ", error.message);
        res.status(500).send("Internal server error");
    }
}



const sortProductsWithOption = async (req, res) => {
    try {
        const { option } = req.query;
        const userId = req.session.user
        const query = req.query.query || ''
        let product;

        const userCart = await Cart.findOne({user: userId});
        const userWishlist = await Wishlist.findOne({user: userId});

        const category = await Category.find({ isListed: true })
        const catId = category.map(cat => cat._id);

        if (option === "newArrivals") {

            if (query) {
                product = await Products.find({
                    productName: { $regex: query, $options: "i" },
                    isBlocked: false,
                    'category.categoryId': { $in: catId }
                }).sort({ createdAt: -1 }).limit(4)
            }
            else {
                product = await Products.find({
                    isBlocked: false,
                    'category.categoryId': { $in: catId }
                }).sort({ createdAt: -1 }).limit(4)
            }


        }

        res.render("userView/shop", {
            user: userId,
            product: product || [],
            category: category,
            query: query ? query : '',
            noItemsFound: product.length === 0,
            currentPage: '',
            totalPages: '',
            userCart: userCart,
            userWishlist: userWishlist

        })

    } catch (error) {
        console.log("Error in sorting product with options :", error.message);
        res.status(500).send("Internal server error");
    }
}




const updateUserDetails = async (req, res) => {
    try {
        const userId = req.session.user

        const user = await User.findById(userId)


        if (!user) {
            return res.status(404).json({ status: false, message: 'User not found' });
        }
        if(!user.mobile){

        let updatedFields = {}
        const { name, mobile, password } = req.body;
            console.log('1 ====>', name, mobile, password)

            if(!password && password === ''){
                return res.json({message: 'You must have enter a new password'})
            }
                const hashedPassword = await userHelper.securePassword(password)
                updatedFields = {name, mobile, hashedPassword}
                await User.findByIdAndUpdate(userId, updatedFields, {new: true});
            
            

        }
        else{

        const { name, mobile, currentPassword, password } = req.body;
            console.log('2 ===>', name, mobile, currentPassword, password)
        if (currentPassword) {
            if (!password) {
                return res.json({ message: 'Enter a new password' });
            }
            const isPasswordMatch = await bcrypt.compare(currentPassword, user.password);

            if (!isPasswordMatch) {
                console.log("Current password is not match");
                return res.json({ message: 'Current password is not match' });
            }
        }

        let updatedFields = { name, mobile }

        if (password) {
            if (!currentPassword) {
                return res.json({ message: 'Enter the current password' });
            }
            const hashPassword = await userHelper.securePassword(password);
            console.log("hashhhh =======> : ", hashPassword)
            updatedFields.password = hashPassword
        }

        const updateUser = await User.findByIdAndUpdate(userId, updatedFields, { new: true });

        if (!updateUser) {
            return res.json({ status: false, message: "User not found" });
        }

    }
        console.log("Account updated");
        res.json({ status: true, message: "Account details updated" });

    } catch (error) {
        console.log("Error in updating user details : ", error.message);
        res.status(500).send("Internal server error occur")
    }
}





const getEmailVerificationForForgotPassword = async (req, res) => {
    try {
        res.render("userView/forgotPassEmail")
        console.log("Getting email verification form for forgot password");
    } catch (error) {
        console.log("Error in getting email verfication page : ", error.message);
        res.status(500).send("Internal server error");
    }
}



const insertEmailInEmailverfication = async (req, res) => {
    try {
        const { email } = req.body
        // const secretKey = process.env.SECRET_KEY

        const userExist = await User.findOne({ email: email });
        const id = userExist._id

        if (!userExist) {
            return res.json({ success: false, message: "User not rejistered" });
        }

        // const token = jwt.sign({email},secretKey,{expiresIn:'15m'});
        // console.log("====>",token)
        const resetLink = `http://localhost:2012/resetPassword?id=${id}`

        const transpoter = nodeMailer.createTransport({
            service: 'gmail',
            port: 587,
            secure: false,
            requireTLS: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD
            }
        });
        console.log(process.env.EMAIL_USER, "process.env.EMAIL_USERmmm");
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'Password reset link',
            html: `<p>You requested a password reset. Click <a href="${resetLink}">Here</a> to reset your password.</p>`
        }

        transpoter.sendMail(mailOptions, (err, info) => {
            if (err) {
                console.log("Error in sending link in to the mail => ", err.message);
                return res.json({ success: false, message: "Failed send reset link" });
            }
            res.json({ success: true, message: "Link sent by email" });
        })

    } catch (error) {
        console.log("Error in sending link in email");
        res.status(500).send("Internal server error");
    }
}



const getResetPasswordForForgotPassword = async (req, res) => {
    try {

        const userId = req.query.id
        console.log("=====>", userId)

        res.render("userView/resetPassword", { userId: userId });
        console.log("Getting reset password form successfully");
    } catch (error) {
        console.log("Error in getting reset password : ", error.message);
        res.status(500).send("Internal server error");
    }
}



const insertPasswordInResetPassword = async (req, res) => {
    try {
        const { password, confirmPassword, userId } = req.body

        if (password && confirmPassword) {
            if (password !== confirmPassword) {
                return res.json({ success: false, message: "Password do not match" });
            }
        }
        const hashPassword = await userHelper.securePassword(password);

        if (hashPassword) {
            await User.findByIdAndUpdate(
                { _id: userId },
                { password: hashPassword },
                { new: true }
            )
        }
        res.json({ success: true, message: "Password changed" });
    } catch (error) {
        console.log("Error in changing password : ", error.message);
        res.status(500).send("Internal server error");
    }
}


const googlaAuthentication = async(req, res) => {
    try{
        const userDetails = req.user
        const userId = userDetails.id
        const userName = userDetails.displayName
        const userEmail = userDetails.emails[0].value

        console.log('id of the user ====>', userId)
        console.log('name of the user =====>', userName)
        console.log('email of the user', userEmail)

        const userExist = await User.findOne({email: userEmail});
        
        if(!userExist){
            const hashedPassword = await userHelper.securePassword(userId);
            const referral = await userHelper.generateString()

            const newUser = new User({
                name: userName,
                email: userEmail,
                password: hashedPassword,
                referralCode: referral
            });

            await newUser.save();
            req.session.user = newUser._id
            console.log('User signinnnnnnnn :', newUser);
            res.redirect('/')
        }
        else{
            const userNotBlocked = userExist.isBlocked === false
            if(userNotBlocked){
                req.session.user = userExist._id
                console.log('User login with google')
                res.redirect('/')

            }else{
                console.log('user is blocked');
                res.render('userView/userLogin', {message : 'User is blocked'});
            }
        }
    }catch(error){
        console.log('Error in google auth sigh up and login : ', error.message);
        res.status(500).redirect('/fileNotFound')
    }
}

const fileNotFound = (req, res) => {
    try {
        res.render('userView/fileNotFound');
    } catch (error) {
        console.log('Error in getting 404 page error :', error.message)
    }
}


module.exports = {

    insertDetailsInSignUp,
    loadSignUpPage,
    loadHomePage,
    loadUserLoginPage,
    verifyOtp,
    insertDetailsInLogin,
    getOtPage,
    resendOtp,
    logoutUser,
    getProductDetails,
    getUserProfile,
    getOrders,
    getWalletDetails,
    getAddAddress,
    addAddress,
    getEditAddress,
    updateTheAddress,
    deleteAddress,
    getShopPage,
    filterCategory,
    searchProducts,
    updateUserDetails,
    filterPriceRange,
    sortProductWithPrice,
    sortProductWithName,
    sortProductsWithOption,
    getEmailVerificationForForgotPassword,
    insertEmailInEmailverfication,
    getResetPasswordForForgotPassword,
    insertPasswordInResetPassword,
    googlaAuthentication,
    fileNotFound







}


