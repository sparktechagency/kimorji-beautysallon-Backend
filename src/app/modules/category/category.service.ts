import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { ICategory } from './category.interface'
import { Category } from './category.model'
import unlinkFile from '../../../shared/unlinkFile'
import { Bookmark } from '../bookmark/bookmark.model'
import mongoose from 'mongoose'
import { JwtPayload } from 'jsonwebtoken'
import { SubCategory } from '../subCategory/subCategory.model'
import { Service } from '../service/service.model'

const createCategoryToDB = async (payload: ICategory) => {
  const { name, image } = payload;
  const isExistName = await Category.findOne({ name: name })

  if (isExistName) {
    unlinkFile(image);
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "This Category Name Already Exist");
  }

  const createCategory: any = await Category.create(payload)
  if (!createCategory) {
    unlinkFile(image);
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Category')
  }

  return createCategory
}

const getCategoriesFromDB = async (): Promise<ICategory[]> => {
  const result = await Category.find({})
  return result;
}

const adminCategoriesFromDB = async (): Promise<ICategory[]> => {
  const result = await Category.find({}).lean();

  const categories = await Promise.all(result.map(async (category: any) => {
    const subCategory = await SubCategory.find({ category: category._id });
    return {
      ...category,
      subCategory
    }
  }))

  return categories;
}

const updateCategoryToDB = async (id: string, payload: ICategory) => {

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Category ID")
  }
  const isExistCategory: any = await Category.findById(id);

  if (!isExistCategory) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Category doesn't exist");
  }

  if (payload.image) {
    unlinkFile(isExistCategory?.image);
  }

  const updateCategory = await Category.findOneAndUpdate(
    { _id: id },
    payload,
    { new: true }
  )

  return updateCategory
}

const deleteCategoryToDB = async (id: string): Promise<ICategory | null> => {

  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Invalid Category ID")
  }

  const deleteCategory = await Category.findByIdAndDelete(id)
  if (!deleteCategory) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Category doesn't exist")
  }
  return deleteCategory
}

const getCategoryForBarberFromDB = async (user: JwtPayload): Promise<ICategory[] | null> => {

  const categories = await Category.find().select("name").lean();
  if (!categories) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Category doesn't exist")
  }

  const result = await Promise.all(categories?.map(async (category: any) => {
    const subCategories = await SubCategory.find({ category: category._id }).select("title").lean();

    const finalResult = await Promise.all(subCategories?.map(async (subCategory: any) => {
      const service = await Service.findOne({ title: subCategory?._id, category: category._id, barber: user.id });
      return {
        ...subCategory,
        isServiceAdded: !!service
      }
    }));

    return {
      ...category,
      subCategory: finalResult
    }
  }));

  return result
}

export const CategoryService = {
  createCategoryToDB,
  getCategoriesFromDB,
  updateCategoryToDB,
  deleteCategoryToDB,
  getCategoryForBarberFromDB,
  adminCategoriesFromDB
}