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
      required: false,  // Email is not required anymore
      unique: false,    // Removed unique constraint on email
      immutable: true,
      lowercase: true,
    },

    mobileNumber: {
      type: String,
      required: false, 
    },
    
    password: {
      type: String,
      required: false,
      select: 0,  // Password is not required for OTP-based login
    },

    location: {
      type: {
        type: String,
        enum: ['Point'],
        required: false,
      },
      coordinates: {
        type: [Number],
        required: false,
      },
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
      type: Boolean,
    },

    about: {
      type: String,
      required: false,
    },

    address: {
      type: String,
      required: false,
    },

    dateOfBirth: {
      type: String,
      required: false,
    },

    gender: {
      type: String,
      enum: ["Male", "Female", "Children", 'Others'],
      required: false,
    },

    authentication: {
      type: {
        isResetPassword: {
          type: Boolean,
          default: false,
        },
        otpCode: {
          type: String,
          default: null,
        },
        expireAt: {
          type: Date,
          default: null,
        },
      },
      select: 0,
    },

    accountInformation: {
      status: { type: Boolean },
      accountId: { type: String },
      externalAccountId: { type: String },
      accountUrl: { type: String },
      currency: { type: String },
    },

    discount: {
      type: Number,
    },

    deviceToken: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

userSchema.index({ location: '2dsphere' });

userSchema.statics.isExistUserById = async (id: string) => {
    const isExist = await User.findById(id);
    return isExist;
};

userSchema.statics.isExistUserByEmail = async (email: string) => {
    const isExist = await User.findOne({ email });
    return isExist;
};

userSchema.statics.isExistUserByMobileNumber = async (mobileNumber: string) => {
    const isExist = await User.findOne({ mobileNumber });
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

// Single pre-save middleware that handles all validation logic
userSchema.pre('save', async function (next) {
    const user = this as IUser;

    // Only check for duplicates when creating a new user (not when updating)
    if (this.isNew) {
        // Check if mobile number already exists (only for new users)
        if (user.mobileNumber) {
            const existingUserByMobile = await User.findOne({ mobileNumber: user.mobileNumber });
            if (existingUserByMobile) {
                throw new ApiError(StatusCodes.BAD_REQUEST, 'Mobile number already exists');
            }
        }

        // Check if email already exists (only for new users)
        if (user.email) {
            const existingUserByEmail = await User.findOne({ email: user.email });
            if (existingUserByEmail) {
                throw new ApiError(StatusCodes.BAD_REQUEST, 'Email already exists!');
            }
        }
    }

    // Set default values for BARBER role
    if (user.role === USER_ROLES.BARBER) {
        // if role is BARBER the accountInformation status initially set as false
        if (!user.accountInformation) {
            user.accountInformation = {
                status: false
            };
        }

        if (user.discount === undefined) {
            user.discount = 0;
        }
        
        if (!user.about) {
            user.about = '';
        }

        // if role is BARBER the isSubscribe initially set as false
        if (user.isSubscribed === undefined) {
            user.isSubscribed = false;
        }
    }

    // Password hash (uncomment if needed)
    // if(!user.appId && user.password){
    //     user.password = await bcrypt.hash(this.password, Number(config.bcrypt_salt_rounds));
    // }
    
    next();
});

export const User = model<IUser, UserModal>("User", userSchema);


