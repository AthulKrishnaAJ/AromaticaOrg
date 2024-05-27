const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
    
    couponName : {
        type : String,
        required : true
    },
    couponCode : {
        type : String,
        unique : true,
        required : true
    },
    minimumPrice : {
        type : Number,
        require : true
    },
    discount : {
        type : Number,
        required : true,
        min : 0,
        max : 500,
    },
    usedBy : [
        {
            type : mongoose.Schema.Types.ObjectId,
            ref : "User"
        }
    ],
    expiryDate : {
        type : Date,
        required : true,
        index : true
    },
    isValid : {
        type : String,
        enum : ['Active', 'Expired'],
        default : 'Active'
    },
    isActive : {
        type : Boolean,
        default : true
    },
    isRedeemed : {
        type : String,
        enum : ['not-redeemed', 'redeemed'],
        default : 'not-redeemed'
    },
}, {timestamps : true});


couponSchema.pre('save',function(next){
    if(this.expiryDate && this.expiryDate < new Date() && this.isValid !== 'Expired'){
        this.isValid = 'Expired'
    }
    else{
        this.isValid = 'Active'
    }
    next();
});

const Coupon =  mongoose.model('Coupon', couponSchema);
module.exports = Coupon