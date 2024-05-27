const User = require("../models/userModel");
const Order = require("../models/orderModel")
const Cart = require("../models/cartModel");
const Products = require("../models/productModel");
const Category = require("../models/categoryModel");

const moment = require('moment')
const bcrypt = require("bcrypt");
const PDF = require('pdfkit');
const product = require("../models/productModel");

// get dashboard
const getDashBoard = async (req, res) => {
    try {
        const salesDetails = await Order.find();
        const products = await Products.find();
        const categories = await Category.find();

        const startOfMonth = moment().startOf('month').toDate();
        const endOfMonth = moment().endOf('month').toDate();

        const monthlyEarnig = await Order.aggregate([
            {
                $match: {
                    status: 'delivered',
                    createdAt: { $gte: startOfMonth, $lt: endOfMonth }
                }
            },
            {
                $group: {
                    _id: null,
                    totalCost: { $sum: '$totalCost' }
                }
            }
        ]);

        const totalMonthlyEaring = monthlyEarnig.length > 0 ? monthlyEarnig[0].totalCost : 0

        const topSellingProducts = await Order.aggregate([
            { $unwind: "$items" },
            {
                $group: {
                    _id: "$items.productId",
                    totalQuantity: { $sum: "$items.quantity" }
                },
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 },
        ]);
        const productId = topSellingProducts.map((product) => product._id);
        const productDatas = await Products.find(
            { _id: { $in: productId } },
            { productName: 1, productImage: 1 }
        );

        const topSellingCategories = await Order.aggregate([
            { $unwind: "$items" },
            {
                $lookup: {
                    from: "products",
                    localField: "items.productId",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $lookup: {
                    from: "categories",
                    localField: "product.category.categoryId",
                    foreignField: "_id",
                    as: "category"
                }
            },
            { $unwind: "$category" },
            {
                $group: {
                    _id: "$category._id",
                    categoryName: { $first: "$category.name" },
                    totalQuantity: { $sum: "$items.quantity" }
                }
            },
            { $sort: { totalQuantity: -1 } },
            { $limit: 10 },

        ]);

        const categoryId = topSellingCategories.map((cat) => cat._id)
        const topSellingCategoryData = await Category.find({
            _id: { $in: categoryId }
        });
        // res.redirect("/admin");
        res.render('adminView/dashBoard', {
            salesDetails: salesDetails,
            products: products,
            categories: categories,
            productDatas: productDatas,
            topSellingProducts: topSellingProducts,
            topSellingCategoryData: topSellingCategoryData,
            totalMonthlyEaring: totalMonthlyEaring
        })
    } catch (error) {
        console.log("rendering error in admin Dashboard", error.message);
        res.status(500).send("<h3>Internal error occured</h3>")
    }
}


// get admin login
const getAdminLogin = (req, res) => {
    try {
        res.render("adminView/adminLogin")
    } catch (error) {
        console.log(`Page rendering error ${error.message}`)
    }
}

// admin login verfication
const verifyAdminLogin = async (req, res) => {
    try {
        const { email, password } = req.body
        const findAdmin = await User.findOne({ email, isAdmin: 1 })

        if (findAdmin) {
            const matchPassword = await bcrypt.compare(password, findAdmin.password);
            if (matchPassword) {
                req.session.admin = true
                const salesDetails = await Order.find();
                const products = await Products.find();
                const categories = await Category.find();


                const startOfMonth = moment().startOf('month').toDate();
                const endOfMonth = moment().endOf('month').toDate();

                const monthlyEarnig = await Order.aggregate([
                    {
                        $match: {
                            status: 'delivered',
                            createdAt: { $gte: startOfMonth, $lt: endOfMonth }
                        }
                    },
                    {
                        $group: {
                            _id: null,
                            totalCost: { $sum: '$totalCost' }
                        }
                    }
                ]);

                const totalMonthlyEaring = monthlyEarnig.length > 0 ? monthlyEarnig[0].totalCost : 0


                const topSellingProducts = await Order.aggregate([
                    { $unwind: "$items" },
                    {
                        $group: {
                            _id: "$items.productId",
                            totalQuantity: { $sum: "$items.quantity" }
                        },
                    },
                    { $sort: { totalQuantity: -1 } },
                    { $limit: 10 },
                ]);
                const productId = topSellingProducts.map((product) => product._id);
                const productDatas = await Products.find(
                    { _id: { $in: productId } },
                    { productName: 1, productImage: 1 }
                );

                const topSellingCategories = await Order.aggregate([
                    { $unwind: "$items" },
                    {
                        $lookup: {
                            from: "products",
                            localField: "items.productId",
                            foreignField: "_id",
                            as: "product"
                        }
                    },
                    { $unwind: "$product" },
                    {
                        $lookup: {
                            from: "categories",
                            localField: "product.category.categoryId",
                            foreignField: "_id",
                            as: "category"
                        }
                    },
                    { $unwind: "$category" },
                    {
                        $group: {
                            _id: "$category._id",
                            categoryName: { $first: "$category.name" },
                            totalQuantity: { $sum: "$items.quantity" }
                        }
                    },
                    { $sort: { totalQuantity: -1 } },
                    { $limit: 10 },

                ]);

                const categoryId = topSellingCategories.map((cat) => cat._id)
                const topSellingCategoryData = await Category.find({
                    _id: { $in: categoryId }
                });

                // res.redirect("/admin");
                res.render('adminView/dashBoard', {
                    salesDetails: salesDetails,
                    products: products,
                    categories: categories,
                    productDatas: productDatas,
                    topSellingProducts: topSellingProducts,
                    topSellingCategoryData: topSellingCategoryData,
                    totalMonthlyEaring: totalMonthlyEaring
                })
                console.log("Admin logged successfully");
            }
            else {
                res.render("adminView/adminLogin", { message: "Password is not match" });
                console.log("Password is not match");
            }
        }
        else {
            res.render("adminView/adminLogin", { message: "You are not an admin" });
            console.log("Your are not an admin go away");
        }
    } catch (error) {
        console.log("Admin login error", error.message);
        res.status(500).send({ message: "Something wenet wrong" })
    }


}


const getLogout = (req, res) => {
    try {
        req.session.admin = null
        res.redirect("/admin/login")
        console.log("admin logout success");
    } catch (error) {
        console.log("Admin logout error occured", error.message);
    }
}


const getSalesReportPage = async (req, res) => {
    try {
        const startDate = new Date();
        const endDate = new Date();
        startDate.setDate(startDate.getDate() - 7);

        const orderCount = await Order.countDocuments({
            status: 'delivered'
        })

        const currentPage = parseInt(req.query.page) || 1
        const limit = 6
        const skip = (currentPage - 1) * limit

        const totalCount = await Order.countDocuments({
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'delivered'
        })

        const salesOrders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'delivered'
        }).sort({ createdAt: -1 }).populate('user').populate('couponDetails.couponId').skip(skip).limit(limit);


        const orderDetails = await Order.find({
            status: 'delivered'
        })

        let overAllDiscount = 0;
        let totalAmount = 0;
        let netDiscount = 0

        for (const order of orderDetails) {
            if (order.couponDetails.discountAmount) {
                overAllDiscount += order.couponDetails.discountAmount
            }
            for (const item of order.items) {
                totalAmount += item.price
            }

        }

        netDiscount = totalAmount - overAllDiscount


        const totalPage = Math.ceil(totalCount / limit);

        console.log("Sales report page getting with by default delivered order details");
        res.render('adminView/salesReport', {
            salesOrders: salesOrders,
            totalPage: totalPage,
            currentPage: currentPage,
            orderCount: orderCount,
            overAllDiscount: overAllDiscount,
            totalAmount: totalAmount,
            netDiscount: netDiscount
        });
    } catch (error) {
        console.log("Error in getting sales report page :", error.message);
        res.status(500).send("Internal server error");
    }
}



// get custom sales report
const getCustomSalesReport = async (req, res) => {
    try {
        const startDateString = req.query.startDate || ''
        const endDateString = req.query.endDate || ''


        const startDate = new Date(startDateString);
        const endDate = new Date(endDateString);
        endDate.setDate(endDate.getDate() + 1)

        console.log(`start date is ======>${startDate} & end date is =======>${endDate}`);

        const currentPage = parseInt(req.query.page) || 1
        const limit = 6
        const skip = (currentPage - 1) * limit

        const orderCount = await Order.countDocuments({
            status: 'delivered'
        });

        const totalCount = await Order.countDocuments({
            createdAt: { $gte: startDate, $lt: endDate },
            status: 'delivered'
        });

        const salesOrders = await Order.find({
            createdAt: { $gte: startDate, $lte: endDate },
            status: 'delivered'
        }).sort({ createdAt: -1 }).populate('user').skip(skip).limit(limit);


        const orderDetails = await Order.find({
            status: 'delivered'
        })

        let overAllDiscount = 0;
        let totalAmount = 0;
        let netDiscount = 0;
        for (const order of orderDetails) {
            if (order.couponDetails.discountAmount) {
                overAllDiscount += order.couponDetails.discountAmount
            }
            totalAmount += order.totalCost

        }

        netDiscount = totalAmount - overAllDiscount

        const totalPage = Math.ceil(totalCount / limit);

        console.log("Generate sales report based on the date");
        res.render('adminView/salesReport', {
            salesOrders: salesOrders,
            totalPage: totalPage,
            currentPage: currentPage,
            startDate: startDate,
            endDate: endDate,
            orderCount: orderCount,
            overAllDiscount: overAllDiscount,
            totalAmount: totalAmount,
            netDiscount: netDiscount
        });


    } catch (error) {
        console.log("Error in filtering order details by dates :", error.message);
        res.status(500).send("Internale server error");
    }
}


// generate pdf
// const generatePdf = async (req, res) => {
//     try {
//         const doc = new PDF();
//         const fileName = 'Sales_report.pdf';
//         const orders = req.body.map(order => ({
//             ...order,
//             name: order.name.trim(),
//             date: order.date.trim()
//         }));
//         res.setHeader('Content-Type', 'application/pdf');
//         res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

//         doc.pipe(res);
//         doc.fontSize(12);
//         doc.text('Sales Report', { align: 'center', fontSize: 16 });
//         const margin = 5;

//         doc
//             .moveTo(margin, margin)
//             .lineTo(600 - margin, margin)
//             .lineTo(600 - margin, 842 - margin)
//             .lineTo(margin, 842 - margin)
//             .lineTo(margin, margin)
//             .lineTo(600 - margin, margin)
//             .lineWidth(3)
//             .strokeColor('#000000')
//             .stroke();

//         doc.moveDown();

//         const headers = ['Order ID', 'Name', 'Date', 'Total'];

//         let headerX = 20;
//         const headerY = doc.y + 10;

//         headers.forEach(header => {
//             doc.text(header, headerX, headerY, { width: 120, align: 'center' });
//             headerX += 140;
//         });

//         let dataY = headerY + 25;

//         orders.forEach(order => {
//             doc.text(order.dataId, 20, dataY, { width: 120, align: 'center' });
//             doc.text(order.name, 160, dataY, { width: 120, align: 'center' });
//             doc.text(order.date, 300, dataY, { width: 120, align: 'center' });
//             doc.text(order.totalAmount.toString(), 440, dataY, { width: 120, align: 'center' });
//             dataY += 30;
//         });

//         doc.end();
//     } catch (err) {
//         console.error("Error generating PDF:", err);
//         res.status(500).send("Error generating PDF");
//     }
// }

const showChart = async (req, res) => {
    try {
        // if(req.body.msg){
        const monthlySales = await Order.aggregate([
            {
                $match: { "status": "delivered" }
            },
            {
                $group: {
                    _id: { $month: "$createdAt" },
                    totalAmount: { $sum: "$totalCost" }
                },
            },
            {
                $sort: { _id: 1 }
            },
        ]);
        const dailySales = await Order.aggregate([
            {
                $match: { "status": "delivered" }
            },
            {
                $group: {
                    _id: { $dayOfMonth: "$createdAt" },
                    totalAmount: { $sum: "$totalCost" }
                }
            },
            {
                $sort: { _id: 1 }
            },
        ]);
        const yearlySales = await Order.aggregate([
            {
                $match: { "status": "delivered" }
            },
            {
                $group: {
                    _id: { $year: "$createdAt" },
                    totalAmount: { $sum: "$totalCost" }
                }
            },
            {
                $sort: { _id: 1 }
            }
        ]);

        res.json({ monthlySales, dailySales, yearlySales })
        // }
    } catch (error) {
        console.log('ERROr :', error.message);
    }
}





module.exports = {
    getAdminLogin,
    verifyAdminLogin,
    getDashBoard,
    getLogout,
    getSalesReportPage,
    getCustomSalesReport,
    // generatePdf,
    showChart

}