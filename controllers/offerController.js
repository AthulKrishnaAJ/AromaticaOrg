const Product = require('../models/productModel');
const Category = require('../models/categoryModel');
const Offer = require('../models/offerModel');
const product = require('../models/productModel');


// get category offer page
const getCategoryOffer = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1
        const limit = 6
        const skip = (page - 1) * limit

        const category = await Category.find({ isListed: true });
        const categoryOffer = await Offer.find({ offerType: 'Category' }).sort({ createdAt: -1 })
            .skip(skip).limit(limit)
            .populate('categoryOffer.categoryId');

        const totalCount = await Offer.countDocuments({ offerType: 'Category' });
        const totalPage = Math.ceil(totalCount / limit);

        res.render('adminView/categoryOffer', { category: category, categoryOffer: categoryOffer, currentPage: page, totalPage: totalPage });
        console.log("get add offer page");
    } catch (error) {
        console.log("Error in getting offer page :", error.message);
        res.status(500).send("Internal server error");
    }
}

// add category offer
const addCategoryOffer = async (req, res) => {
    try {

        const { offerName, endDate, offerType, availableCategory, discountPrice } = req.body
        console.log(offerName, endDate, offerType, availableCategory, discountPrice);


        const convertedEndDate = new Date(endDate);

        const productsInCategory = await Product.find({ 'category.categoryId': availableCategory });

        const invalidDiscountPrice = productsInCategory.some(product => product.salePrice <= parseInt(discountPrice));

        if (invalidDiscountPrice) {
            console.log('Discount price must be less than sale price');
            return res.json({ success: false, validation: 'Discount price must less than product sale price' });
        }


        const sameCategoryOffer = await Offer.findOne({ name: offerName, 'categoryOffer.categoryId': availableCategory });

        if (sameCategoryOffer) {
            return res.json({ success: false, message: "Offer already exist" });
        }

        let categoryDiscount = 0

        const existingProductOffer = await Offer.find({
            offerType: 'Product',
            'productOffer.productId': { $in: productsInCategory.map(product => product._id) },
            isActive: true
        });

        const existingCategoryOffers = await Offer.find({
            offerType: 'Category',
            'categoryOffer.categoryId': availableCategory,
            isActive: true
        });


        if (existingCategoryOffers && existingCategoryOffers.length > 0) {
            console.log('1')
            existingCategoryOffers.forEach(offer => {
                if (offer.categoryOffer.discount > categoryDiscount) {
                    categoryDiscount = offer.categoryOffer.discount
                }
            });
            console.log('===>', categoryDiscount)
            if (parseInt(discountPrice) > categoryDiscount) {
                console.log('2',)
                const difference = parseInt(discountPrice) - categoryDiscount
                console.log('===== difference', difference);
                for (const product of productsInCategory) {
                    const productHasOffer = existingProductOffer.some(offer => offer.productOffer.productId.toString() === product._id.toString());
                    if (productHasOffer) {
                        console.log('continue ===> 3')
                        continue;
                    }
                    const newPrice = product.salePrice - difference
                    await Product.findByIdAndUpdate(product._id, { salePrice: newPrice });
                }
            }
        }
        else {
            console.log('4')
            for (const product of productsInCategory) {
                const productHasOffer = existingProductOffer.some(offer => offer.productOffer.productId.toString() === product._id.toString());
                if (productHasOffer) {
                    console.log('continue ====> 5');
                    continue;
                }
                const discountedPrice = product.salePrice - parseInt(discountPrice);
                await Product.findByIdAndUpdate(product._id, { salePrice: discountedPrice });
            }
        }


        const newOffer = new Offer({
            name: offerName,
            endDate: convertedEndDate,
            offerType: offerType,
            categoryOffer: {
                categoryId: availableCategory,
                discount: discountPrice
            }
        });

        await newOffer.save();
        res.json({ success: true, message: 'Offer added' });
        console.log("Category offer added");

    } catch (error) {
        console.log("Error in adding offer :", error.message);
        res.json({ success: false, message: 'Internal server error' });
    }
}




// unlisting category offer
const unlistCategoryOffer = async (req, res) => {
    try {
        const offerId = req.params.offerId;
        const categoryOffer = await Offer.findById(offerId);
        if (!categoryOffer) {

            return res.json({ success: false, message: 'Category offer not found' });
        }
        console.log('=====  CAT offer :', categoryOffer);
        const categoryId = categoryOffer.categoryOffer.categoryId;
        const discountPrice = categoryOffer.categoryOffer.discount;

        const productsInCategory = await Product.find({ 'category.categoryId': categoryId });

        const existingProductOffer = await Offer.find({
            offerType: 'Product',
            'productOffer.productId': { $in: productsInCategory.map(product => product._id) },
            isActive: true
        })

        const existingCategoryOffers = await Offer.find({
            offerType: 'Category',
            'categoryOffer.categoryId': categoryId,
            isActive: true
        });

        console.log(' existing category offers =====>', existingCategoryOffers)
        existingCategoryOffers.sort((a, b) => b.categoryOffer.discount - a.categoryOffer.discount);


        const updateOffer = await Offer.findByIdAndUpdate(offerId, { isActive: false }, { new: true });

        if (existingCategoryOffers.length > 0) {

            if (categoryOffer.categoryOffer.discount === existingCategoryOffers[0].categoryOffer.discount) {

                const productToUpdate = await Product.find({ 'category.categoryId': categoryId });
                for (const product of productToUpdate) {
                    const hasProductOffer = existingProductOffer.some(offer => offer.productOffer.productId.toString() === product._id.toString());
                    if (hasProductOffer) {
                        continue;
                    }
                    const originalSalePrice = product.salePrice + discountPrice;
                    await Product.findByIdAndUpdate(product._id, { salePrice: originalSalePrice });
                }
                req.session.maxDiscount = existingCategoryOffers[0].categoryOffer.discount

                if (existingCategoryOffers.length > 1) {

                    const secondLargestDiscount = existingCategoryOffers[1].categoryOffer.discount;
                    const productToUpdate = await Product.find({ 'category.categoryId': categoryId });
                    for (const product of productToUpdate) {
                        const hasProductOffer = existingProductOffer.some(offer => offer.productOffer.productId.toString() === product._id.toString());
                        if (hasProductOffer) {
                            continue;
                        }
                        const updatedSalePrice = product.salePrice - secondLargestDiscount
                        await Product.findByIdAndUpdate(product._id, { salePrice: updatedSalePrice });
                    }
                    req.session.minDiscount = existingCategoryOffers[1].categoryOffer.discount
                }
            }
        }

        if (updateOffer) {
            res.json({ success: true, message: "Offer unlisted" });
        } else {
            res.json({ success: false, message: "Failed" });
        }
    } catch (error) {
        console.error("error in unlisting category : ", error.message);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
};



// listing category offer
const listCategoryOffer = async (req, res) => {
    try {
        const offerId = req.params.offerId

        const categoryOffer = await Offer.findById(offerId);

        if (!categoryOffer) {
            return res.json({ success: false, message: 'Category offer not found' });
        }

        const discountPrice = categoryOffer.categoryOffer.discount
        const categoryId = categoryOffer.categoryOffer.categoryId

        const updateOffer = await Offer.findByIdAndUpdate(offerId, { isActive: true }, { new: true });

        const productsInCategory = await Product.find({ 'category.categoryId': categoryId });

        const existingProductOffer = await Offer.find({
            offerType: 'Product',
            'productOffer.productId': { $in: productsInCategory.map(product => product._id) },
            isActive: true
        });

        const existingCategoryOffers = await Offer.find({
            offerType: 'Category',
            'categoryOffer.categoryId': categoryId,
            isActive: true
        });
        console.log('existing category =====>', existingCategoryOffers)

        let maxDiscount = 0
        existingCategoryOffers.forEach(offer => {
            if (offer.categoryOffer.discount > maxDiscount) {
                maxDiscount = offer.categoryOffer.discount
            }
        });

        console.log('====>', maxDiscount)

        if (categoryOffer.categoryOffer.discount >= parseInt(maxDiscount)) {

            console.log('Enter the sale price updation while offer is listed...');

            const inActiveOffer = await Offer.findOne({
                offerType: 'Category',
                'categoryOffer.categoryId': categoryId,
                'categoryOffer.discount': req.session.discount,
                isActive: false
            });
            if (inActiveOffer && inActiveOffer.categoryOffer.discount < maxDiscount) {
                req.session.discount = 0;
            }
            const productToUpdate = await Product.find({ 'category.categoryId': categoryId });

            for (const product of productToUpdate) {
                const hasProductOffer = existingProductOffer.some(offer => offer.productOffer.productId.toString() === product._id.toString());
                if (hasProductOffer) {
                    continue;
                }
                if (req.session.discount && maxDiscount > req.session.discount) {
                    console.log('1')
                    product.salePrice += req.session.discount
                }
                if (req.session.maxDiscount && req.session.minDiscount && req.session.maxDiscount > req.session.minDiscount) {
                    product.salePrice += req.session.minDiscount

                    console.log('2')
                }
                const originalSalePrice = product.salePrice - parseInt(maxDiscount)
                await Product.findByIdAndUpdate(product._id, { salePrice: originalSalePrice });

            }
        }
        req.session.maxDiscount = null
        req.session.minDiscount = null
        req.session.discount = maxDiscount
        console.log(req.session.discount)
        if (updateOffer) {
            res.json({ success: true, message: 'Offer listed' });
        }
        else {
            res.json({ success: false, message: 'Failed' });
        }
    } catch (error) {
        console.log("Error in listing category offer :", error.message);
        res.json({ success: false, message: 'Internal server error' });
    }
}







// const getCategoryOfferDetails = async(req, res) => {
//     try{
//         const offerId = req.params.offerId
//         const offerDetails = await Offer.findById(offerId).populate('categoryOffer.categoryId');
//         res.json({success : true, offerDetails : offerDetails});

//     }catch(error){
//         console.log("Error in gettin offer details :", error.message);
//     }
// }



// update category Details
// const updateCategoryDetails = async(req, res) => {
//     try{
//         const {editOfferName, editOfferStartDate, editOfferEndDate, editCategory, editOfferAmount, editOfferId} = req.body
//         console.log('====>', editOfferName, '====>', editCategory)

//         const existingOffer = await Offer.findOne({name : editOfferName});
//         if(existingOffer && existingOffer._id.toString() !== editOfferId){
//             return res.json({success : false, message : "Offer already exist"});
//         }

//         const productsInCategory = await Product.find({'category.categoryId' : editCategory});
//         const invalidDiscountPrice = productsInCategory.some(product => product.salePrice <= parseInt(editOfferAmount));
//         if(invalidDiscountPrice){
//             return res.json({success : false, validation : 'Discount must less than product sale price'});
//         }

//         const updatedCategoryOffer = await Offer.findById(editOfferId);
//         console.log('=====> updated offer :', updatedCategoryOffer);

//         let result = 0
//         let updatedSalePrice = 0;
//         for(const product of productsInCategory){
//             if(parseInt(editOfferAmount) > updatedCategoryOffer.categoryOffer.discount){
//                 result = parseInt(editOfferAmount) - updatedCategoryOffer.categoryOffer.discount
//                  updatedSalePrice = product.salePrice - result
//             }
//             else if(updatedCategoryOffer.categoryOffer.discount > parseInt(editOfferAmount)){
//                 result = updatedCategoryOffer.categoryOffer.discount - parseInt(editOfferAmount);
//                 updatedSalePrice = product.salePrice + result
//             }

//             await Product.findByIdAndUpdate(product._id, {salePrice : updatedSalePrice});
//         }

//         const updateOffer = await Offer.findByIdAndUpdate(editOfferId, {
//                     name : editOfferName,
//                     startDate : new Date(editOfferStartDate),
//                     endDate : new Date(editOfferEndDate),
//                     'categoryOffer.categoryId' : editCategory,
//                     'categoryOffer.discount' : editOfferAmount
//         }, {new : true});

//         if(updateOffer){
//             res.json({success : true, message : 'Offer updated'});
//         }
//         else{
//             res.json({success : false, message : 'Offer cannot updated'});
//         }

//     }catch(error){
//         console.log("Error in updating category offer details :", error.message);
//         res.status(500).send("Internal server error");
//     }
// }




const deleteOffer = async (req, res) => {
    try {
        const offerId = req.params.offerId

        const offerForDelete = await Offer.findById(offerId);

        console.log('offer for delete =======><>', offerForDelete);

        const activeOfferInCategory = await Offer.find({
            offerType: 'Category',
            'categoryOffer.categoryId': offerForDelete.categoryOffer.categoryId,
            isActive: true
        });
        console.log('active offers  ======><>', activeOfferInCategory)

        const deleteOfferDiscount = offerForDelete.categoryOffer.discount
        const categoryId = offerForDelete.categoryOffer.categoryId

        const productsInCategory = await Product.find({ 'category.categoryId': categoryId });

        const existingProductOffers = await Offer.find({
            offerType: 'Product',
            'productOffer.productId': { $in: productsInCategory.map(product => product._id) },
            isActive: true
        });

        console.log('delete offer discount ====>', deleteOfferDiscount)

        if (activeOfferInCategory && activeOfferInCategory.length > 0) {

            const isLargestDiscount = activeOfferInCategory.every(offer => offer.categoryOffer.discount <= deleteOfferDiscount);

            if (isLargestDiscount) {
                console.log('1')
                const productToUpdate = await Product.find({ 'category.categoryId': categoryId })

                if (offerForDelete.isActive !== false) {
                    for (const product of productToUpdate) {
                        const hasProductOffer = existingProductOffers.some(offer => offer.productOffer.productId.toString() === product._id.toString());
                        if (hasProductOffer) {
                            continue
                        }
                        product.salePrice += deleteOfferDiscount
                        await product.save();
                    }
                }
                console.log('2')
                if (activeOfferInCategory.length > 1) {
                    activeOfferInCategory.sort((a, b) => b.categoryOffer.discount - a.categoryOffer.discount);
                    const secondLargestDiscount = activeOfferInCategory[1].categoryOffer.discount
                    console.log('======>SEccccccccccccc', secondLargestDiscount)
                    if (secondLargestDiscount) {
                        console.log('3')
                        for (const product of productToUpdate) {
                            const hasProductOffer = existingProductOffers.some(offer => offer.productOffer.productId.toString() === product._id.toString());
                            if (hasProductOffer) {
                                continue
                            }
                            product.salePrice -= secondLargestDiscount
                            await product.save();
                        }
                    }
                }


            }
        }
        const deletedOffer = await Offer.findByIdAndDelete(offerId);
        if (!deletedOffer) {
            return res.json({ success: false, message: 'Offer not found' });
        }
        console.log('Offer deleted');
        res.json({ success: true, message: 'Offer deleted' });
    } catch (error) {
        console.log('error in deleting category offer :', error.message);
    }
}



// get product offer page
const getProductOfferPage = async (req, res) => {
    try {


        const page = parseInt(req.query.page) || 1
        const limit = 6
        const skip = (page - 1) * limit

        const categories = await Category.find({ isListed: true });
        const categoryId = categories.map(category => category._id);

        const products = await Product.find({
            'category.categoryId': { $in: categoryId },
            isBlocked: false
        }).sort({ createdAt: -1 });

        const productOffer = await Offer.find({ offerType: 'Product' }).sort({ createdAt: -1 })
            .skip(skip).limit(limit)
            .populate('productOffer.productId');

        const totalCount = await Offer.countDocuments({ offerType: 'Product' })
        const totalPage = Math.ceil(totalCount / limit)

        res.render('adminView/productOffer', { products: products, productOffer: productOffer, currentPage: page, totalPage: totalPage });
    } catch (error) {
        console.log('Error in getting product offer page :', error.message);
        res.status(500).send("Internal server error");
    }
}



// add product offer
const addProductOffer = async (req, res) => {
    try {
        const { offerName, endDate, offerType, availableProductId, discountPrice } = req.body

        const convertedEndDate = new Date(endDate);

        const product = await Product.findById(availableProductId)

        if (!product) {
            console.log('Product not found');
        }

        const existingCategoryOfferThisProduct = await Offer.findOne({
            offerType: 'Category',
            'categoryOffer.categoryId': product.category.categoryId
        });

        const existingProductOffer = await Offer.find({
            offerType: 'Product',
            'productOffer.productId': availableProductId
        });

        if (existingProductOffer && existingCategoryOfferThisProduct && existingProductOffer.length > 0) {
            return res.json({ success: false, message: 'Category offer and product offer available this product' });
        }

        if (existingCategoryOfferThisProduct) {
            return res.json({ success: false, message: 'Product already has a category offer' });
        }

        if (product.salePrice <= parseInt(discountPrice)) {
            return res.json({ success: false, validation: 'Discount must less than product sale price' });
        }

        const existingOffer = await Offer.findOne({
            name: offerName,
            'productOffer.productId': availableProductId
        });
        if (existingOffer) {
            return res.json({ success: false, message: 'Offer already exist' });
        }


        let productDiscount = 0

        const activeOffers = await Offer.find({
            offerType: 'Product',
            'productOffer.productId': availableProductId,
            isActive: true
        });

        if (activeOffers && activeOffers.length > 0) {
            console.log('enter the existing product offers ++++>')
            activeOffers.forEach(offer => {
                if (offer.productOffer.discount > productDiscount) {
                    productDiscount = offer.productOffer.discount
                }
            });
            console.log('max product offer discount ++++++> ', productDiscount)
            if (parseInt(discountPrice) > productDiscount) {
                console.log('Enter the discount price checking');
                const difference = parseInt(discountPrice) - productDiscount
                const newPrice = product.salePrice - difference
                await Product.findByIdAndUpdate(product._id, { salePrice: newPrice });
            }
        }
        else {
            console.log('Product offers are not available');
            const discountedPrice = product.salePrice - parseInt(discountPrice)
            await Product.findByIdAndUpdate(product._id, { salePrice: discountedPrice });
        }

        const updateProduct = await Product.findById(availableProductId);
        console.log('===product sale price=====>', updateProduct.salePrice);
        const newOffer = new Offer({
            name: offerName,
            endDate: convertedEndDate,
            offerType: offerType,
            productOffer: {
                productId: availableProductId,
                discount: discountPrice

            }
        });
        await newOffer.save();
        console.log('Product offer added')
        res.json({ success: true, message: 'Offer added' });
    } catch (error) {
        console.log("Error in adding product offer :", error.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
}




const unlistProductOffer = async (req, res) => {
    try {

        const offerId = req.params.offerId
        const productOffer = await Offer.findById(offerId);
        if (!productOffer) {
            return res.json({ success: false, message: 'Product offer not found' })
        }
        console.log('======PRO offer>', productOffer);
        const productId = productOffer.productOffer.productId
        const discountPrice = productOffer.productOffer.discount

        const existingProductOffer = await Offer.find({
            offerType: 'Product',
            'productOffer.productId': productId,
            isActive: true
        });

        console.log('existing product offers ======>', existingProductOffer);
        existingProductOffer.sort((a, b) => b.productOffer.discount - a.productOffer.discount);


        const product = await Product.findById(productId);

        const existingCategoryOffers = await Offer.find({
            offerType: 'Category',
            'categoryOffer.categoryId': product.category.categoryId,
            isActive: true
        });

        let maxCategoryDiscount = 0
        existingCategoryOffers.forEach(offer => {
            if (offer.categoryOffer.discount > maxCategoryDiscount) {
                maxCategoryDiscount = offer.categoryOffer.discount
            }
        });
        console.log('max category discount ====> ', maxCategoryDiscount)
        const unlistOffer = await Offer.findByIdAndUpdate(offerId, { isActive: false }, { new: true });

        if (existingProductOffer.length > 0) {
            console.log('1')
            if (productOffer.productOffer.discount === existingProductOffer[0].productOffer.discount) {
                console.log('2')
                if (existingCategoryOffers && existingCategoryOffers.length > 0) {
                    console.log('3')
                    const categoryOfferToUpdate = existingCategoryOffers.find(offer => offer.categoryOffer.discount === maxCategoryDiscount);
                    if (categoryOfferToUpdate) {
                        console.log('4')
                        product.salePrice = product.salePrice - maxCategoryDiscount
                    }
                }

                const originalSalePrice = product.salePrice + discountPrice
                await Product.findByIdAndUpdate(product._id, { salePrice: originalSalePrice });

                req.session.maxProductDiscount = existingProductOffer[0].productOffer.discount

                if (existingProductOffer.length > 1) {
                    console.log('5')
                    const productToUpdate = await Product.findById(productId);
                    const secondLargestDiscount = existingProductOffer[1].productOffer.discount

                    if (maxCategoryDiscount !== 0 && req.session.maxProductDiscount > secondLargestDiscount) {
                        productToUpdate.salePrice += maxCategoryDiscount
                    }
                    const updatedSalePrice = productToUpdate.salePrice - secondLargestDiscount
                    await Product.findByIdAndUpdate(product._id, { salePrice: updatedSalePrice })

                    req.session.minProductDiscount = existingProductOffer[1].productOffer.discount
                }
            }
        }

        if (unlistOffer) {
            console.log('Product offer unlisted');
            res.json({ success: true, message: "Offer unlisted" });
        }
        else {
            res.json({ success: false, message: 'failed' });
        }
    } catch (error) {
        console.log("Error in unlisting product offer : ", error.message);
        res.json({ success: false, message: 'Internal server error' });
    }
}




const listProductOffer = async (req, res) => {
    try {
        const offerId = req.params.offerId
        const productOffer = await Offer.findById(offerId);

        if (!productOffer) {
            return res.json({ success: false, message: 'Product offer not found' });
        }
        const discountPrice = productOffer.productOffer.discount
        const productId = productOffer.productOffer.productId

        const listOffer = await Offer.findByIdAndUpdate(offerId, { isActive: true }, { new: true });


        const existingProductOffer = await Offer.find({
            offerType: 'Product',
            'productOffer.productId': productId,
            isActive: true
        });

        console.log('existing product offers :=====>', existingProductOffer);

        let maxDiscount = 0
        existingProductOffer.forEach(offer => {
            if (offer.productOffer.discount > maxDiscount) {
                maxDiscount = offer.productOffer.discount
            }
        });

        console.log('======>', maxDiscount)

        const product = await Product.findById(productId);

        const existingCategoryOffers = await Offer.find({
            offerType: 'Category',
            'categoryOffer.categoryId': product.category.categoryId,
            isActive: true
        });

        let maxCategoryDiscount = 0
        existingCategoryOffers.forEach(offer => {
            if (offer.categoryOffer.discount > maxCategoryDiscount) {
                maxCategoryDiscount = offer.categoryOffer.discount
            }
        });
        console.log('=====> max category discount :', maxCategoryDiscount);

        if (productOffer.productOffer.discount >= parseInt(maxDiscount)) {
            console.log('1')
            if (existingCategoryOffers && existingCategoryOffers.length > 0) {
                console.log('2')
                const categoryOfferToUpdate = existingCategoryOffers.find(offer => offer.categoryOffer.discount === maxCategoryDiscount);
                if (categoryOfferToUpdate) {
                    console.log('3')
                    product.salePrice += maxCategoryDiscount
                }
            }
            const inActiveProductOffer = await Offer.findOne({
                offerType: 'Product',
                'productOffer.productId': productId,
                'productOffer.discount': req.session.productDiscount,
                isActive: false
            });

            if (inActiveProductOffer && inActiveProductOffer.productOffer.discount < maxDiscount) {
                req.session.productDiscount = 0
                console.log('4')
            }


            if (req.session.productDiscount && maxDiscount > req.session.productDiscount) {
                product.salePrice += req.session.productDiscount
                console.log('5')
            }
            if (req.session.maxProductDiscount && req.session.minProductDiscount && req.session.maxProductDiscount > req.session.minProductDiscount) {
                product.salePrice += req.session.minProductDiscount
                console.log('6')
            }
            if (existingProductOffer.length > 1) {
                existingProductOffer.sort((a, b) => b.productOffer.discount - a.productOffer.discount)
                if (maxCategoryDiscount !== 0 && maxDiscount > existingProductOffer[1].productOffer.discount) {
                    product.salePrice -= maxCategoryDiscount
                }
            }
            const originalSalePrice = product.salePrice - parseInt(maxDiscount)
            await Product.findByIdAndUpdate(product._id, { salePrice: originalSalePrice })
        }

        req.session.maxProductDiscount = null
        req.session.minProductDiscount = null
        req.session.productDiscount = maxDiscount
        console.log('session discount in listing product offer >>>', req.session.productDiscount);

        if (listOffer) {
            res.json({ success: true, message: 'Offer listed' });
        }
        else {
            res.json({ success: false, message: 'Failed' });
        }
    } catch (error) {
        console.log("Error in listing offer :", error.message);
        res.json({ success: false, message: "Internal server error" });
    }
}





const deleteProductOffer = async (req, res) => {
    try {
        const offerId = req.params.offerId

        const offerForDelete = await Offer.findById(offerId);

        console.log('product offer for delete =====>', offerForDelete)

        const activeOffersInProducts = await Offer.find({
            offerType: 'Product',
            'productOffer.productId': offerForDelete.productOffer.productId,
            isActive: true
        });
        console.log('active offers innnn =====>', activeOffersInProducts);

        const deleteOfferDiscount = offerForDelete.productOffer.discount
        const productId = offerForDelete.productOffer.productId

        const product = await Product.findById(productId);

        const existingCategoryOffer = await Offer.find({
            offerType: 'Category',
            'categoryOffer.categoryId': product.category.categoryId,
            isActive: true
        });

        let maxCategoryOfferDiscount = 0;
        existingCategoryOffer.forEach(offer => {
            if (offer.categoryOffer.discount > maxCategoryOfferDiscount) {
                maxCategoryOfferDiscount = offer.categoryOffer.discount
            }
        });

        console.log('max category discount in deleting product offer ====>', maxCategoryOfferDiscount);


        if (activeOffersInProducts && activeOffersInProducts.length > 0) {
            console.log('1');
            const isLargestDiscount = activeOffersInProducts.every(offer => offer.productOffer.discount <= deleteOfferDiscount)

            if (isLargestDiscount) {
                console.log('2');
                const product = await Product.findById(productId)
                product.salePrice += deleteOfferDiscount
                await product.save();

                if (activeOffersInProducts.length > 1) {
                    console.log('3');
                    activeOffersInProducts.sort((a, b) => b.productOffer.discount - a.productOffer.discount)
                    const secondLargestDiscount = activeOffersInProducts[1].productOffer.discount

                    if (secondLargestDiscount) {
                        console.log('4');

                        product.salePrice -= secondLargestDiscount
                        await product.save();
                    }
                }
                if (existingCategoryOffer && existingCategoryOffer.length > 0 && activeOffersInProducts.length === 1) {
                    console.log('5')
                    const categoryOfferToUpdate = existingCategoryOffer.find(offer => offer.categoryOffer.discount === maxCategoryOfferDiscount)
                    if (categoryOfferToUpdate) {
                        console.log('6  ')
                        product.salePrice -= maxCategoryOfferDiscount
                        await product.save();
                    }
                }

            }
        }
        const deleteOffer = await Offer.findByIdAndDelete(offerId);
        if (!deleteOffer) {
            return res.json({ success: false, message: 'Offer not found' })
        }
        console.log('Offer deleted');
        res.json({ success: true, message: 'Offer deleted' });
    } catch (error) {
        console.log('Error in deleting product offer :', error.message);
    }
}

// const getProductOfferDetailsForEdit = async(req, res) => {
//     try{
//         const offerId = req.params.offerId
//         const offerDetails = await Offer.findById(offerId).populate('productOffer.productId');
//         res.json({success : true, offerDetails : offerDetails});
//     }catch(error){
//         console.log("Error in getting product offer details for edit :", error.message);
//     }
// }




// const updateProductOffer = async(req, res) => {
//     try{
//         const {editOfferName, editOfferStartDate, editOfferEndDate, editProductId, editOfferDiscount, offerId} = req.body;

//         const availableProduct = await Product.findById(editProductId)
//         if(availableProduct.salePrice <= editOfferDiscount){
//             return res.json({success : false, validation : 'Discount must less than product sale price'});
//         }

//         const updateOffer = await Offer.findByIdAndUpdate(offerId,{
//             name : editOfferName,
//             startDate : new Date(editOfferStartDate),
//             endDate : new Date(editOfferEndDate),
//             'productOffer.productId' : editProductId,
//             'productOffer.discount' : editOfferDiscount
//         }, {new : true});
//         if(updateOffer){
//             res.json({success : true, message : 'Offer updated'});
//         }
//         else{
//             res.json({success : false, message : 'Offer cannot updated'});
//         }
//     }catch(error){
//         console.log("Error in updating product offer :", error.message);
//         res.json({success : false, message : "Internal server error"});
//     }
// }




module.exports = {
    getCategoryOffer,
    addCategoryOffer,
    unlistCategoryOffer,
    listCategoryOffer,
    // getCategoryOfferDetails,
    // updateCategoryDetails,
    deleteOffer,
    getProductOfferPage,
    addProductOffer,
    unlistProductOffer,
    listProductOffer,
    // getProductOfferDetailsForEdit,
    // updateProductOffer,
    deleteProductOffer
}