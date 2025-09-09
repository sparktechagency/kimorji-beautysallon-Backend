import { Request, Response } from 'express'
import { StatusCodes } from 'http-status-codes'
import catchAsync from '../../../shared/catchAsync'
import sendResponse from '../../../shared/sendResponse'
import { SubCategoryService } from './subCategory.service'

const createSubCategory = catchAsync(async (req: Request, res: Response) => {
    const categoryData = req.body;
    const result = await SubCategoryService.createSubCategoryToDB(categoryData)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Sub Category create successfully',
        data: result
    })
})

const getSubCategories = catchAsync(async (req: Request, res: Response) => {
    const result = await SubCategoryService.getSubCategoriesFromDB();

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Sub Category retrieved successfully',
        data: result
    })
})

const updateSubCategory = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id
    const updateCategoryData = req.body;
    const result = await SubCategoryService.updateSubCategoryToDB(id, updateCategoryData)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Sub Category updated successfully',
        data: result
    })
})

const deleteSubCategory = catchAsync(async (req: Request, res: Response) => {
    const id = req.params.id
    const result = await SubCategoryService.deleteSubCategoryToDB(id)

    sendResponse(res, {
        success: true,
        statusCode: StatusCodes.OK,
        message: 'Sub Category delete successfully',
        data: result
    })
})


export const SubCategoryController = {
    createSubCategory,
    getSubCategories,
    updateSubCategory,
    deleteSubCategory
}
