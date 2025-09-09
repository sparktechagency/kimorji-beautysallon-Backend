import { z } from 'zod'

const createPackageZodSchema = z.object({
    body: z.object({
        title: z.string({required_error: "Title is required"}),
        price: z.number({required_error: "Number is required"}),
        description: z.string({required_error: "Description is required"}),
        duration: z.string({required_error: "Duration is required"}),
        feature: z.array(z.string(), {required_error: "Feature is required"})
    })
})

export const PackageValidation = {
    createPackageZodSchema
}