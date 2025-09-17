import { z } from 'zod';

// export const verifyOtpSchema = z.object({
//   mobileNumber: z.string().min(1, { message: "Mobile number is required" }),
//   code: z.number().min(100000, { message: "OTP must be 6 digits" }).max(999999),
// });


// const createLoginZodSchema = z.object({
//     body: z.object({
//         contact: z.string({ required_error: 'Email is required' }),
//         password: z.string({ required_error: 'Password is required' })
//     })
// });

const createForgetPasswordZodSchema = z.object({
    body: z.object({
        email: z.string({ required_error: 'Email is required' }),
    })
});

const createResetPasswordZodSchema = z.object({
    body: z.object({
        newPassword: z.string({ required_error: 'Password is required' }),
        confirmPassword: z.string({
            required_error: 'Confirm Password is required',
        })
    })
});

const createChangePasswordZodSchema = z.object({
    body: z.object({
        currentPassword: z.string({
            required_error: 'Current Password is required',
        }),
        newPassword: z.string({ required_error: 'New Password is required' }),
        confirmPassword: z.string({
            required_error: 'Confirm Password is required',
        })
    })
});

export const AuthValidation = {
    // verifyOtpSchema,
    createForgetPasswordZodSchema,
    // createLoginZodSchema,
    createResetPasswordZodSchema,
    createChangePasswordZodSchema,
};