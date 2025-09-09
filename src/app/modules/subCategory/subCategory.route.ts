import express from 'express';
import { USER_ROLES } from '../../../enums/user'
import auth from '../../middlewares/auth'
import validateRequest from '../../middlewares/validateRequest';
import { SubCategoryValidation } from './subCategory.validation';
import { SubCategoryController } from './subCategory.controller';
const router = express.Router()

router.route("/")
    .post(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
        validateRequest(SubCategoryValidation.createSubCategoryZodSchema),
        SubCategoryController.createSubCategory
    )
    .get(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN, USER_ROLES.CUSTOMER),
        SubCategoryController.getSubCategories
    );

router.route("/:id")
    .patch(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
        SubCategoryController.updateSubCategory
    )
    .delete(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
        SubCategoryController.deleteSubCategory
    );

export const SubCategoryRoutes = router