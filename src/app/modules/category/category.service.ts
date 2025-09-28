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
import { logger } from '../../../shared/logger'
import { PaginatedResult, PaginationOptions } from '../../../helpers/pagination.interface'

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

 const getAllSubCategories = async ({ page, limit, searchTerm, categoryId }: PaginationOptions): Promise<PaginatedResult> => {
  logger.info(`Starting getAllSubCategories: page=${page}, limit=${limit}, searchTerm=${searchTerm}, categoryId=${categoryId}`);

  // Build query
  const query: any = {};
  if (categoryId) {
    if (!categoryId.match(/^[0-9a-fA-F]{24}$/)) {
      logger.error(`Invalid category ID format: ${categoryId}`);
      throw new ApiError(StatusCodes.BAD_REQUEST, 'Invalid category ID format');
    }
    const categoryExists = await Category.findById(categoryId).select('_id');
    if (!categoryExists) {
      logger.error(`Category not found: ${categoryId}`);
      throw new ApiError(StatusCodes.NOT_FOUND, 'Category not found');
    }
    query.category = categoryId;
  }
  if (searchTerm) {
    query.title = { $regex: searchTerm, $options: 'i' };
  }

  try {
    // Calculate pagination
    const total = await SubCategory.countDocuments(query);
    const totalPage = Math.ceil(total / limit);
    const skip = (page - 1) * limit;

    // Fetch subcategories
    const subCategories = await SubCategory.find(query)
      .populate('category')
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 }); // Sort by newest first

    logger.info(`Retrieved ${subCategories.length} subcategories, total: ${total}`);
    return {
      subCategories,
      pagination: {
        page,
        limit,
        total,
        totalPage,
      },
    };
  } catch (error) {
    logger.error(`Database error retrieving subcategories: ${error}`);
    throw error;
  }
};

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
  adminCategoriesFromDB,
  getAllSubCategories
}