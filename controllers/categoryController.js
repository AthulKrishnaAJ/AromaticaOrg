const Category = require("../models/categoryModel")


const getCategory = async (req, res, error) => {
    try {
        const errorMessage = req.query.error
        const page = parseInt(req.query.page) || 1
        const limit = 3
        const skip = (page - 1) * limit

        const totalCount = await Category.countDocuments()
        const totalPage = Math.ceil(totalCount / limit);
        const catergories = await Category.find({}).skip(skip).limit(limit)

        res.render("adminView/category", {
             category: catergories, 
             errorMessage: errorMessage,
             currentPage: page,
             totalPage: totalPage 
            });

    } catch (error) {
        console.log("Category Page rendering error", error.message);
        res.status(500).send("Internal server error")
    }
}




const addCategory = async (req, res) => {
    try {
        const { name, description } = req.body
        const lowerCaseName = new RegExp(name, "i");
        const existCategory = await Category.findOne({ name: lowerCaseName });
        if (description) {
            if (!existCategory) {
                const newCategory = new Category({
                    name: name,
                    description: description
                })
                await newCategory.save()
                console.log(`New category saved : ${newCategory}`);
                res.redirect("/admin/category")
            }
            else {
                console.log("Category already exist");
                res.redirect("/admin/category?error=Category already exist")
            }
        }
        else {
            console.log("Description is required");
        }
    } catch (error) {
        console.log(`Add category error ${error.message}`);
        res.status(500).send("Internal server error")

    }
}


// const getAllCategory = async (req, res) => {
//     try {
//         const categoryData = await Category.find({});
//         if (categoryData) {
//             res.render("adminView/category", { category: categoryData });
//             console.log("Redirect in category page... after add new category");
//         }
//         else {
//             console.log("Error redirect in category page... after add new category");
//         }
//     } catch (error) {
//         console.log("Error redirection in category page... after add new category", error.message);
//         res.status(500).send("Internal error occured");
//     }
// }




const listCategory = async (req, res) => {
    try {
        const id = req.query.id
        await Category.findByIdAndUpdate(id, { isListed: true })
        res.redirect("/admin/category");
        console.log("Category listed")
    } catch (error) {
        console.log(`Category listed error ${error.message}`);

    }
}


const unListCategory = async (req, res) => {
    try {
        const id = req.query.id
        await Category.findByIdAndUpdate(id, { isListed: false })
        res.redirect("/admin/category")
        console.log("Category unlisted");
    } catch (error) {
        console.log(`Category unlisted error ${error.message}`);
    }
}




const getEditCategory = async (req, res) => {
    try {
        const id = req.query.id
        const category = await Category.findOne({ _id: id })
        res.render("adminView/editCategory", { category: category })
        console.log(category)
    } catch (error) {
        console.log("Get error in edit category page", error.message);
    }
}



const updateCategory = async (req, res) => {
    try {
        const id = req.params.id
        console.log("cateogry Id for update category   => ", id);
        const { name, description } = req.body
        const findCategory = await Category.findOne({ _id: id })
        if (findCategory) {
            await Category.updateOne(
                { _id: id },
                {
                    name: name,
                    description: description
                }
            )
            res.redirect("/admin/category");
            console.log("Category updated");
        }
        else {
            console.log("Cannot find category for updating");
        }


    } catch (error) {
        console.log(`Error occured in update category ${error.message} `);
    }
}


module.exports = {
    getCategory,
    addCategory,
    // getAllCategory,
    listCategory,
    unListCategory,
    getEditCategory,
    updateCategory

}



