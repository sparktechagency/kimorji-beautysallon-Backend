import { StatusCodes } from 'http-status-codes'
import ApiError from '../../../errors/ApiError'
import { ISubCategory } from './subCategory.interface'
import { SubCategory } from './subCategory.model'

const createSubCategoryToDB = async (payload: ISubCategory) => {
  const { title } = payload;
  const isExistName = await SubCategory.findOne({ title: title })

  if (isExistName) {
    throw new ApiError(StatusCodes.NOT_ACCEPTABLE, "This Category Name Already Exist");
  }

  const createCategory: any = await SubCategory.create(payload)
  if (!createCategory) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Category')
  }

  return createCategory
}

const getSubCategoriesFromDB = async (): Promise<ISubCategory[]> => {
  const result = await SubCategory.find({}).populate("category", "name image")
  return result;
}

const updateSubCategoryToDB = async (id: string, payload: ISubCategory) => {
  const isExistCategory: any = await SubCategory.findById(id);

  if (!isExistCategory) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Category doesn't exist");
  }

  const updateCategory = await SubCategory.findOneAndUpdate(
    { _id: id },
    payload,
    { new: true }
  )

  return updateCategory
}

const deleteSubCategoryToDB = async (id: string): Promise<ISubCategory | null> => {
  const deleteCategory = await SubCategory.findByIdAndDelete(id)
  if (!deleteCategory) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Category doesn't exist")
  }
  return deleteCategory
}




export const SubCategoryService = {
  createSubCategoryToDB,
  getSubCategoriesFromDB,
  updateSubCategoryToDB,
  deleteSubCategoryToDB
}