import { model, Schema } from 'mongoose'
import { ISubCategory, SubCategoryModel } from './subCategory.interface'

const subCategorySchema = new Schema<ISubCategory, SubCategoryModel>(
    {
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category",
            required: true
        },
        title: {
            type: String,
            required: true,
            unique: true
        }
    },
    { timestamps: true },
)

export const SubCategory = model<ISubCategory, SubCategoryModel>('SubCategory', subCategorySchema)