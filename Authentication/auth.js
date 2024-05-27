const User = require("../models/userModel");

const isLogged = (req,res,next) => {
    if(req.isAuthenticated()){
        next();
    }
    else if(req.session.user){
         User.findById(req.session.user).lean()
        .then((data) => {
            if(data && data.isBlocked === false){
                next()
            }
            else{
                res.redirect("/login");
            }
        }).catch((error) => {
            console.log("Error in isLogged middleware",error.message);
            res.redirect("/login");
        })
    }
    else{
        res.redirect("/login");
        console.log("User has no session");
    }
}



const isAdmin = (req,res,next) => {
    if(req.session.admin){
        User.findOne({isAdmin : 1})
        .then((data) => {
            if(data){
                next()
            }
            else{
                res.redirect("/admin/login");
            }
        }).catch((error) => {
            console.log(`Error in admin middleware ${error}`);
            res.status(500).send("<h2> Internal server error occured </h2>")
        })
    }
    else{
        res.redirect("/admin/login");
    }
}





module.exports = {
    isLogged,
    isAdmin
}