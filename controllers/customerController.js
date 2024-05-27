const { render } = require("ejs");
const User = require("../models/userModel");



const getCustomer = async (req, res) => {
    try {
        const { search = "", page = 1 } = req.query;
        const limit = 3;
        const searchRegex = new RegExp(search, "i");

        const userData = await User.find({
            isAdmin: 0,
            $or: [
                { name: { $regex: searchRegex } },
                { email: { $regex: searchRegex } }
            ]
        }).limit(limit).skip((page - 1) * limit).exec()

        const count = await User.find({
            isAdmin: 0,
            $or: [
                { name: { $regex: searchRegex } },
                { email: { $regex: searchRegex } }
            ]

        }).countDocuments()

        const totalPage = Math.ceil(count / limit)

        res.render("adminView/users", {
            userData: userData,
            totalPage: totalPage,
            currentPage: page


        })

        console.log("customer listing page rendering with customer data successfully");

    } catch (error) {
        console.log(`Customer list page rendering error with customer details ${error.message}`);
        res.status(500).send(`Internal error occured ${error.message}`)
    }
}



const blockCustomers = async (req, res) => {
    try {
        const customerId = req.query.id
        if (customerId) {
            console.log(customerId);
            await User.findByIdAndUpdate(customerId, { isBlocked: true })
            res.redirect("/admin/users");
        }
    } catch (error) {
        res.status(500).send("Internal server error")
        console.log("Error in blocking customer", error.message);
    }
}


const unBlockCustomers = async (req, res) => {
    try {
        const customerId = req.query.id
        if (customerId) {
            console.log(customerId);
            await User.findByIdAndUpdate(customerId, { isBlocked: false })
            res.redirect("/admin/users")
        }
    } catch (error) {
        res.status(500).send("Internal server error")
        console.log("Error in Unblocking customers", error.message);
    }
}




module.exports = {
    getCustomer,
    blockCustomers,
    unBlockCustomers

}