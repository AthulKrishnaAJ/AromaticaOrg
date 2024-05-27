const { required } = require("nodemon/lib/config");
const Category = require("../models/categoryModel");
const Products = require("../models/productModel")
const fs = require("fs");
const path = require("path");
const sharp = require('sharp');


const getAddProduct = async (req, res) => {
    try {
        const errorMessage = req.query.error
        const category = await Category.find({ isListed: true })
        res.render("adminView/addProduct", { category: category, errorMessage: errorMessage })
    } catch (error) {
        res.status(500).send("Somthing went wrong")
        console.log("Error in add product page rendering", error.message);
    }
}

// Add product
const addProduct = async (req, res) => {
    try {
        const product = req.body;
        console.log(product);

        const category = await Category.findOne({ name: product.category });
        const nameSearch = new RegExp(product.productName, "i");
        const isProductExist = await Products.findOne({ productName: nameSearch });
        if (!isProductExist) {
            const images = [];
            if (req.files && req.files.length > 0) {
                for (let i = 0; i < req.files.length; i++) {
                    // images.push(req.files[i].filename);
                    const file = req.files[i];
                    const filename = Date.now() + "-" + file.originalname

                    await sharp(file.path)
                        .resize(600, 600)
                        .toFile(path.join(__dirname, '../public/uploads/product-images/', filename))

                    images.push(filename)
                }
            }

            const newProduct = new Products({
                productName: product.productName,
                description: product.description,
                category: {
                    categoryId: category._id,
                    name: product.category,
                },
                regularPrice: product.regularPrice,
                salePrice: product.salePrice,
                createdOn: new Date().toISOString(),
                quantity: product.quantity,
                productImage: images,
                size: product.size
            });

            await newProduct.save();
            console.log("product saved");
            res.redirect("/admin/product")
        }
        else {

            res.redirect("/admin/addProduct?error=Product already exist");
        }

    } catch (error) {

        console.log(`Error in add product ${error.message}`);
        res.status(500).send("Internal server error");

    }
}



const getProduct = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const searchTerm = req.query.search || ""
        const limit = 4;
        const skip = (page - 1) * limit;

        const productsData = await Products.find({ productName: { $regex: `.*${searchTerm}.*`, $options: "i" } })
            .sort({ createdAt: -1 }).limit(limit).skip(skip).exec();

        const count = await Products.find({ productName: { $regex: `.*${searchTerm}.*`, $options: "i" } })
            .countDocuments();

        const totalPage = Math.ceil(count / limit);

        console.log("=> All Products get");
        res.render("adminView/products", { productData: productsData, currentPage: page, totalPage: totalPage });

    } catch (error) {
        console.log("Rendering error of product listing page ", error.message);
        res.status(500).send("Internal server occured");
    }
}



const blockProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        await Products.findByIdAndUpdate(productId, { isBlocked: true });
        console.log("Product is blocked");
        res.redirect("/admin/product");
    } catch (error) {
        console.log(`Error in product blocking ${error.message}`);
    }
}


const unBlockProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        await Products.findByIdAndUpdate(productId, { isBlocked: false });
        console.log("Product is unblocked");
        res.redirect("/admin/product");
    } catch (error) {
        console.log(`Error in product unblocking ${error.message}`);
    }
}


const getEditProduct = async (req, res) => {
    try {
        const id = req.query.id;
        const errorMessage = req.query.error
        const products = await Products.findOne({ _id: id });
        console.log("get Product for edit product")
        const catergories = await Category.find({});

        console.log("Product page render successfully");
        res.render("adminView/editProduct", { product: products, category: catergories, errorMessage: errorMessage })

    } catch (error) {
        res.status(500).send("Internal error", error.message)
        console.log(`Error in edit product rendering ${error.message}`);
    }
}



const deleteImage = async (req, res) => {
    try {
        const { productId, filename } = req.params;
        await Products.findByIdAndUpdate(productId, { $pull: { productImage: filename } });

        const imagePath = path.join('public', 'uploads', 'product-images', filename);
        if (fs.existsSync(imagePath)) {
            fs.unlinkSync(imagePath);
            console.log("Image delete successfully");
            res.json({ success: true });
        }
        else {
            console.log("Image not found");
            res.json({ success: false, error: "Image not found" });
        }
    } catch (error) {
        console.log("Error in image deletion", error.message);
        res.status(500).json({ success: false, error: "Internal server error" });
    }
}




const updateProduct = async (req, res) => {
    try {
        const productId = req.params.productId;
        const { productName, description, category, regularPrice, salePrice, quantity, size } = req.body;

        const cat = await Category.findOne({ name: category })
        let productImage = [];
        const newImage = req.files

        const newImageFileNames = []
        for(const file of newImage){
            const fileName = Date.now() +"-"+ file.originalname

            await sharp(file.path)
            .resize(600, 600)
            .toFile(path.join(__dirname, '../public/uploads/product-images/', fileName));

            newImageFileNames.push(fileName)
        }

        const nameSearch = new RegExp(productName, "i");
        const existingProduct = await Products.findOne({ productName: nameSearch });

        if (!existingProduct || existingProduct._id.toString() === productId) {
            if (req.files.length > 0) {
                const existProductId = await Products.findById(productId);

                if (existProductId) {
                    productImage = existProductId.productImage.concat(newImageFileNames);
                }
                await Products.findByIdAndUpdate(productId, {
                    productName: productName,
                    description: description,
                    category: {
                        categoryId: cat._id,
                        name: category
                    },
                    regularPrice: regularPrice,
                    salePrice: salePrice,
                    createdOn: new Date(),
                    quantity: quantity,
                    size: size,
                    productImage: productImage || newImageFileNames
                }, { new: true });

                res.redirect("/admin/product");
                // res.status(200).json({success : true, message : "Product updated successful"});
                console.log("Product updated successfully");
            }
            else {
                await Products.findByIdAndUpdate(productId, {
                    productName: productName,
                    description: description,
                    category: {
                        categoryId: cat._id,
                        name: category
                    },
                    regularPrice: regularPrice,
                    salePrice: salePrice,
                    createdOn: new Date(),
                    quantity: quantity,
                    size: size,
                }, { new: true });
                res.redirect("/admin/product");
                // res.status(200).json({success : true , message : "Product updated successful"});
                console.log("Product updated without modifiying image array");
            }

        }
        else {
            res.redirect(`/admin/editProduct?id=${productId}&error=Product already exist`)
        }
    } catch (error) {
        console.log("Error in update product :", error.message);
        res.status(500).send("Internal server occur");

    }
};





module.exports = {
    getAddProduct,
    addProduct,
    getProduct,
    blockProduct,
    unBlockProduct,
    getEditProduct,
    deleteImage,
    updateProduct

}