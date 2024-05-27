// cartSchema.js
const mongoose = require("mongoose");

const cartSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    items: [
        {
            product: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product"
            },
            quantity: {
                type: Number,
                default: 1
            },
            price: {
                type: Number,
                default: 0
            }
        }
    ],
    totalQuantity: {
        type: Number,
        default: 0
    },
    totalCost: {
        type: Number,
        default: 0
    },
    appliedCoupon :[ 
       
        {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Coupon",
       
        }
]
    
}, { timestamps: true });

const Cart = mongoose.model("Cart", cartSchema);
module.exports = Cart;
