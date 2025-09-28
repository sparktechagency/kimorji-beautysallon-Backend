import express, { NextFunction, Request, Response } from 'express';
import { USER_ROLES } from '../../../enums/user'
import auth from '../../middlewares/auth'
import validateRequest from '../../middlewares/validateRequest'
import { CategoryController } from './category.controller'
import { CategoryValidation } from './category.validation'
import fileUploadHandler from '../../middlewares/fileUploaderHandler'
const router = express.Router()

router.route("/")
    .post(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
        fileUploadHandler(),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const payload = req.body;

                let image = null;

                if (req.files && "image" in req.files && req.files.image[0]) {
                    image = `/images/${req.files.image[0].filename}`;
                }

                req.body = { ...payload, image };
                next();

            } catch (error) {
                return res.status(500).json({ message: "Failed to convert string to number" });
            }
        },
        validateRequest(CategoryValidation.createCategoryZodSchema),
        CategoryController.createCategory
    )
    .get(
        CategoryController.getCategories
    );


router.get("/barber",
    auth(USER_ROLES.BARBER),
    CategoryController.getCategoryForBarber
)

router.get("/idBySubCategory/:id",
    CategoryController.getAllSubCategories
)

router.get("/admin-category",
    auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
    CategoryController.adminGetCategories
)

router.route("/:id")
    .patch(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
        fileUploadHandler(),
        async (req: Request, res: Response, next: NextFunction) => {
            try {
                const payload = req.body;

                let image;

                if (req.files && "image" in req.files && req.files.image[0]) {
                    image = `/images/${req.files.image[0].filename}`;
                }

                req.body = { ...payload, image };
                next();

            } catch (error) {
                return res.status(500).json({ message: "Failed to convert string to number" });
            }
        },
        CategoryController.updateCategory,
    )
    .delete(
        auth(USER_ROLES.SUPER_ADMIN, USER_ROLES.ADMIN),
        CategoryController.deleteCategory,
    );

export const CategoryRoutes = router