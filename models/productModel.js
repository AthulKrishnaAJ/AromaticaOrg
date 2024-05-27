const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
 
    productName : {
        type : String,
        required : true
    },
    description : {
        type : String,
        required : true
    },
    category : {
        categoryId : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "Category",
        required : true
        },
        name : {
            type : String,
            required : true
        }
    },
    regularPrice : {
        type : Number,
        required : true
    },
    salePrice : {
        type : Number,
        required : true
    },
    createdOn : {
        type : String,
        required : true
    },
    quantity : {
        type : Number,
        required : true
    },
    isBlocked : {
        type : Boolean,
        default : false
    },
    productImage : {
        type : Array,
        required : true
    },
    size : {
        type : Number,
        required : true
    }
},{timestamps : true});

const product = mongoose.model("Product",productSchema);

module.exports = product

