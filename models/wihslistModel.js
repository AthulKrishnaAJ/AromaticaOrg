const mongoose = require("mongoose");

const wishlistSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    products : [{
        productId : {
            type : mongoose.Schema.Types.ObjectId,
            ref : "Product",
            required : true
        },
        price : {
            type : Number,
            required : true
        }
    }]
},{timestamps : true});

const Wishlist = mongoose.model("Wishlist",wishlistSchema);
module.exports = Wishlist