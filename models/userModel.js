const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({

    name:{
        type:String,
        required:true
    },

    email:{
        type:String,
        required:true
    },

    mobile:{
        type:Number,
    },

    password:{
        type:String,
    },
    
    isBlocked:{
        type:Boolean,
        default:false
    },
    isAdmin:{
        type:Number,
        default:0
    },
    referralCode : {
        type : String
    }


},{timestamps : true});

const User = mongoose.model("User",userSchema);
module.exports = User;

