const mongoose = require('mongoose');
const { required } = require('nodemon/lib/config');


const offerSchema = new mongoose.Schema({

    name : {
        type : String,
        required : true
    },
    endDate : {
        type : Date,
        required : true
    },
    offerType : {
        type : String,
        enum : ['Product', 'Category'],
        required : true
    },
    productOffer : {
        productId : {
            type : mongoose.Schema.Types.ObjectId,
            ref : 'Product',

        },
        discount : {
            type : Number,


        },
        offerStatus : {
            type : Boolean,
            default : false
        }
    },
   categoryOffer : {
    categoryId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'Category',

    },
    discount : {
        type : Number,

    },
    offerStatus : {
        type : Boolean,
        default : false
    }
   },
    isActive : {
        type : Boolean,
        default : true
    }
}, {timestamps : true});


offerSchema.pre('save', function(next){
    const currentDate = new Date();
    if(currentDate > this.endDate){
        this.isActive = false
    }
    next();
});


const Offer = mongoose.model("Offer", offerSchema);
module.exports = Offer











    