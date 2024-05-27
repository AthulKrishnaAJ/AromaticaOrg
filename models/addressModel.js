const mongoose = require("mongoose");

const addressSchema = new mongoose.Schema({
    user : {
        type : mongoose.Schema.Types.ObjectId,
        ref : "User",
        required : true
    },
    addresses : [{
        addressType : {
            type : String,
            enum : ["Home","Work","Other"],
            required : true
        },
        name : {
            type : String,
            required : true
        },
        addressLine : {
            type : String,
            required : true
        },
        city : {
            type : String,
            required : true
        },
        state : {
            type : String,
            required : true
        },
        pincode : {
            type : Number,
            required : true
        },
        phone : {
            type : Number,
            required : true
        },
        altPhone : {
            type : Number,
            required : true
        },
        
    }],
},{ timestamps: true });


const Address = mongoose.model("Address",addressSchema);
module.exports = Address;