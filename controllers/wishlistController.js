const Wishlist = require("../models/wihslistModel");
const Product = require("../models/productModel")
const Cart = require('../models/cartModel')


// get wishlist page
const getWishlist = async (req, res) => {
    try {
        const userId = req.session.user
        const wishlist = await Wishlist.findOne({ user: userId }).populate('products.productId');
        const userCart = await Cart.findOne({user: userId})
        res.render("userView/wishlist", { wishlist: wishlist, user: userId, userCart: userCart });
    } catch (error) {
        console.log("Error in getting wishlist : ", error.message);
        res.status(500).send("Internal server error occur");
    }
}


// add to wishlist
const addToWishlist = async (req, res) => {
    try {
        const userId = req.session.user
        const { productId } = req.body

        const existingWishlist = await Wishlist.findOne({ user: userId });

        const productDetails = await Product.findById(productId);

        if (existingWishlist) {

            const existingItem = existingWishlist.products.some(product => product.productId.toString() === productId);
            if (existingItem) {
                return res.json({ status: false, message: "Product already in wishlist!" });
            }

            await Wishlist.findOneAndUpdate(
                { user: userId },
                { $push: { products: { productId: productId, price: productDetails.salePrice } } }
            );
            res.json({ status: true, message: "Product add to wishlist!" });
        }
        else {
            const newWishlist = new Wishlist({
                user: userId,
                products: [{ productId: productId, price: productDetails.salePrice }]
            });
            await newWishlist.save();
            res.json({ status: true, message: "Product add to wishlist!" });
        }

    } catch (error) {
        console.log("Error in adding product in the wishlist : ", error.message);
        res.status(500).send("Internal server occur");
    }
}


// remove product from wishlist
const removeProductInWishlist = async (req, res) => {
    try {
        const { productId } = req.body
        console.log("product id for removing proudct in wishlist=====>", productId)

        const updateWishlist = await Wishlist.findOneAndUpdate(
            { 'products.productId': productId },
            { $pull: { products: { productId: productId } } },
            { new: true }
        );

        if (updateWishlist) {
            res.json({ status: true, message: "Product removed" });
            console.log("Product has been removed from the wishlist");
        }
        else {
            res.json({ status: false, message: "Product not removed,please try again" });
        }


    } catch (error) {
        console.log("Error in removing product in wishlist : ", error.message);
        res.status(500).send("Internal server error");
    }
}


const addToCartFromWhishlist = async (req, res) => {
    try {
        const productId = req.query.id
        const quantity = req.query.quantity
        const userId = req.session.user


        let cart = await Cart.findOne({ user: userId });
        const product = await Product.findById(productId);
        const proId = product._id
        if (!product || product.quantity <= 0 || product.isBlocked) {
            return res.json({ status: "Product Unavailable" });
        }

        if (!cart) {
            cart = new Cart({ user: userId });
        }

        const existingItem = cart.items.find(item => item.product.equals(productId));

        if (!existingItem || (existingItem.quantity + parseInt(quantity)) <= product.quantity) {

            if (existingItem) {
                existingItem.quantity += parseInt(quantity)
                existingItem.price += product.salePrice * parseInt(quantity)

            }
            else {
                cart.items.push({
                    product: productId,
                    quantity: parseInt(quantity),
                    price: product.salePrice * parseInt(quantity)
                })
            }

            cart.totalQuantity += parseInt(quantity);
            cart.totalCost += product.salePrice * parseInt(quantity);

            await cart.save();
            console.log("Product added in to cart")
            res.json({ status: true, productId: proId });

        }
        else {
            res.json({ status: false, message: "Out of stock" });
        }

    } catch (error) {
        console.error(`Internal server error occur in add to cart ${error.message}`);
        res.status(500).json({ status: false, message: "Something Wrong" });
    }


}



module.exports = {
    getWishlist,
    addToWishlist,
    removeProductInWishlist,
    addToCartFromWhishlist
}