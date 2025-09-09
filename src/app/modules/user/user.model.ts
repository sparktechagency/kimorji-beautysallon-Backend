import { model, Schema } from "mongoose";
import { USER_ROLES } from "../../../enums/user";
import { IUser, UserModal } from "./user.interface";
import bcrypt from "bcrypt";
import ApiError from "../../../errors/ApiError";
import { StatusCodes } from "http-status-codes";
import config from "../../../config";

const userSchema = new Schema<IUser, UserModal>(
    {
        name: {
            type: String,
            required: false,
        },
        appId: {
            type: String,
            required: false,
        },

        role: {
            type: String,
            enum: Object.values(USER_ROLES),
            required: true,
        },
        
        email: {
            type: String,
            required: false,
            unique: true,
            immutable: true,
            lowercase: true,
        },

        mobileNumber: {
            type: String,
            required: false,
            unique: true,
            immutable: true,
        },

        password: {
            type: String,
            required: false,
            select: 0
        },
        location: {
            type: {
                type: String,
                enum: ['Point'],
                required: false
            },
            coordinates: {
                type: [Number],
                // default: [-122.084, 37.4219983], // [longitude, latitude]
                required: false
            }
        },
        profile: {
            type: String,
            default: 'https://res.cloudinary.com/ddqovbzxy/image/upload/v1736572642/avatar_ziy9mp.jpg',
        },
        verified: {
            type: Boolean,
            default: false,
        },
        isSubscribed: {
            type: Boolean
        },
        about: {
            type: String,
            required: false
        },
        address: {
            type: String,
            required: false
        },
        dateOfBirth: {
            type: String,
            required: false
        },
        gender: {
            type: String,
            enum: ["Male", "Female", "Children", 'Others'],
            required: false
        },
        authentication: {
            type: {
                isResetPassword: {
                    type: Boolean,
                    default: false,
                },
                otpCode: {
                    type: Number,
                    default: null,
                },
                expireAt: {
                    type: Date,
                    default: null,
                },
            },
            select: 0
        },
        accountInformation: {
            status: { type: Boolean },
            accountId: { type: String },
            externalAccountId: { type: String },
            accountUrl: { type: String },
            currency: { type: String }
        },
        discount: {
            type: Number
        },
        deviceToken: {
            type: String,
        },
    },
    {
        timestamps: true
    }
)

userSchema.index({ location: '2dsphere' });

//exist user check
userSchema.statics.isExistUserById = async (id: string) => {
    const isExist = await User.findById(id);
    return isExist;
};

userSchema.statics.isExistUserByEmail = async (email: string) => {
    const isExist = await User.findOne({ email });
    return isExist;
};

//account check
userSchema.statics.isAccountCreated = async (id: string) => {
    const isUserExist: any = await User.findById(id);
    return isUserExist.accountInformation.status;
};

//is match password
userSchema.statics.isMatchPassword = async (password: string, hashPassword: string): Promise<boolean> => {
    return await bcrypt.compare(password, hashPassword);
};

//check user
userSchema.pre('save', async function (next) {

    const user = this as IUser;

    //check user
    const isExist = await User.findOne({ email: user.email });
    if (isExist) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exist!');
    }

    if (user.role === USER_ROLES.BARBER) {

        // if role is BARBER the accountInformation status initially set as false
        user.accountInformation = {
            status: false
        };

        user.discount = 0
        user.about = ''

        // if role is BARBER the isSubscribe initially set as false
        user.isSubscribed = false
    }

    //password hash
    if(!user.appId){
        user.password = await bcrypt.hash(this.password, Number(config.bcrypt_salt_rounds));
    }
    next();
});
export const User = model<IUser, UserModal>("User", userSchema)