import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { CategoryService } from './category.service'
import { logger } from '../../../shared/logger'
import { SubCategoryService } from '../subCategory/subCategory.service'

const createCategory = catchAsync(async (req: Request, res: Response) => {
    const categoryData = req.body;
    const result = await CategoryService.createCategoryToDB(categoryData)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Category create successfully',
        data: result
    })
})

const getCategories = catchAsync(async (req: Request, res: Response) => {
    const result = await CategoryService.getCategoriesFromDB();

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Category retrieved successfully',
        data: result
    })
})

const getAllSubCategories = catchAsync(async (req: Request, res: Response) => {
  logger.info('Starting getAllSubCategories request');
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const searchTerm = req.query.searchTerm as string || '';
  const categoryId = req.query.categoryId as string || ''; 
  logger.info(`Pagination: page=${page}, limit=${limit}, searchTerm=${searchTerm}, categoryId=${categoryId}`);

  try {
    const result = await CategoryService.getAllSubCategories({ page, limit, searchTerm, categoryId });
    logger.info('SubCategories retrieved successfully');
    res.status(StatusCodes.OK).json({
      success: true,
      message: 'SubCategories retrieved successfully',
      data: result,
    });
  } catch (error) {
    logger.error(`Error retrieving subcategories: ${error}`);
    throw error;
  }
});
const updateCategory = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id
    const updateCategoryData = req.body;
    const result = await CategoryService.updateCategoryToDB(id, updateCategoryData)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Category updated successfully',
        data: result
    })
})

const deleteCategory = catchAsync(async (req: Request, res: Response) => {

    const result = await CategoryService.deleteCategoryToDB(req.params.id)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Category delete successfully',
        data: result
    })
})

const getCategoryForBarber = catchAsync(async (req: Request, res: Response) => {

    const result = await CategoryService.getCategoryForBarberFromDB(req.user)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Barber category successfully',
        data: result
    })
})


const adminGetCategories = catchAsync(async (req: Request, res: Response) => {

    const result = await CategoryService.adminCategoriesFromDB()

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Admin Category successfully',
        data: result
    })
})


export const CategoryController = {
    createCategory,
    getCategories,
    updateCategory,
    deleteCategory,
    getCategoryForBarber,
    adminGetCategories,
    getAllSubCategories
}
