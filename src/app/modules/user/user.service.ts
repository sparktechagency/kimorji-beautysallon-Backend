import { USER_ROLES } from "../../../enums/user";
import { IUser } from "./user.interface";
import { JwtPayload } from 'jsonwebtoken';
import { User } from "./user.model";
import { StatusCodes } from "http-status-codes";
import ApiError from "../../../errors/ApiError";
import generateOTP from "../../../util/generateOTP";
import { emailTemplate } from "../../../shared/emailTemplate";
import { emailHelper } from "../../../helpers/emailHelper";
import unlinkFile from "../../../shared/unlinkFile";
import { Reservation } from "../reservation/reservation.model";
import { Service } from "../service/service.model";
import { sendTwilioOTP } from "../../../helpers/twillo";
import { formatPhoneNumber } from "../../../helpers/formatedPhoneNumber";
import { AppError } from "../../../errors/error.app";

const createAdminToDB = async (payload: any): Promise<IUser> => {

  // check admin is exist or not;
  const isExistAdmin = await User.findOne({ email: payload.email })
  if (isExistAdmin) {
    throw new ApiError(StatusCodes.CONFLICT, "This Email already taken");
  }

  // create admin to db
  const createAdmin = await User.create(payload);
  if (!createAdmin) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Admin');
  } else {
    await User.findByIdAndUpdate({ _id: createAdmin?._id }, { verified: true }, { new: true });
  }

  return createAdmin;
}

const createUserToDB = async (payload: Partial<IUser>): Promise<IUser> => {
  const createUser = await User.create(payload);
  if (!createUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create user');
  }

  console.log(createUser);

  // Send email with OTP
  const otp = generateOTP(); // Assume this generates the OTP
  const values = {
    name: createUser.name,
    otp: otp,
    email: createUser.email!
  };
  console.log('Generated OTP:', otp);  // Log the generated OTP
  const createAccountTemplate = emailTemplate.createAccount(values);
  emailHelper.sendEmail(createAccountTemplate);

  // Save OTP in the database
  const authentication = {
    oneTimeCode: otp,
    expireAt: new Date(Date.now() + 3 * 60000), // OTP expires in 3 minutes
  };
  console.log('Saving OTP to database:', authentication);  // Log the OTP and expiration time
  await User.findOneAndUpdate(
    { _id: createUser._id },
    { $set: { authentication } }
  );

  return createUser;
};


const getUserProfileFromDB = async (user: JwtPayload): Promise<Partial<IUser>> => {
  const { id } = user
  const isExistUser: any = await User.findById(id)
  //discount shopDiscount fields are added to the response
    .populate('discount shopDiscount')

  .lean()
  if (!isExistUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!")
  }

  const holderStatus = await Service.findOne({
    barber: user.id,
    status: "Inactive",
  })

  const totalServiceCount = await Reservation.countDocuments({
    customer: user.id,
    status: "Completed",
    paymentStatus: "Paid",
  })

  const totalSpend = await Reservation.aggregate([
    {
      $match: {
        customer: user.id,
        status: "Completed",
        paymentStatus: "Paid",
      },
    },
    {
      $group: {
        _id: null,
        totalSpend: { $sum: "$price" },
      },
    },
  ])

  const data = {
    ...isExistUser,
    email: isExistUser.email,
    totalServiceCount,
    hold: !!holderStatus,
    totalSpend: totalSpend[0]?.totalSpend || 0,
  }

  return data
}

const toggleUserLock = async (id: string): Promise<Partial<IUser>> => {
  const user = await User.findById(id);

  if (!user) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  const updatedUser = await User.findByIdAndUpdate(
    id,
    { isLocked: !user.IsLocked },
    { new: true }
  )

  if (!updatedUser) {
    throw new ApiError(StatusCodes.NOT_FOUND, "User not found");
  }

  return updatedUser
}

const updateProfileToDB = async (
  authUser: JwtPayload,
  payload: Partial<IUser>,
): Promise<Partial<IUser>> => {
  const { id, role } = authUser

  const user = await User.findById(id)
  if (!user) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "User doesn't exist!")
  }

  if (
    (role === USER_ROLES.ADMIN || role === USER_ROLES.SUPER_ADMIN) &&
    payload.email
  ) {
    delete payload.email
  }

  if (payload.email && role !== USER_ROLES.ADMIN && role !== USER_ROLES.SUPER_ADMIN) {
    const existingEmailUser = await User.findOne({
      email: payload.email.toLowerCase(),
      _id: { $ne: id },
    })
    if (existingEmailUser) {
      throw new ApiError(StatusCodes.BAD_REQUEST, "Email already in use")
    }
  }

  const updatedUser = await User.findByIdAndUpdate(id, payload, {
    new: true,
    runValidators: true,
  }).lean()

  if (!updatedUser) {
    throw new ApiError(StatusCodes.BAD_REQUEST, "Failed to update profile")
  }

  const holderStatus = await Service.findOne({
    barber: id,
    status: "Inactive",
  })

  const totalServiceCount = await Reservation.countDocuments({
    customer: id,
    status: "Completed",
    paymentStatus: "Paid",
  })

  const totalSpend = await Reservation.aggregate([
    {
      $match: {
        customer: id,
        status: "Completed",
        paymentStatus: "Paid",
      },
    },
    {
      $group: {
        _id: null,
        totalSpend: { $sum: "$price" },
      },
    },
  ])

  return {
    ...updatedUser,
    email: updatedUser.email,

  }
}
const updateLocationToDB = async (user: JwtPayload, payload: { longitude: number; latitude: number }): Promise<IUser | null> => {

  const result = await User.findByIdAndUpdate(
    user.id,
    {
      $set: {
        "location.type": "Point",
        "location.coordinates": [payload.longitude, payload.latitude]
      }
    },
    { new: true }
  );

  if (!result) {
    throw new ApiError(StatusCodes.NOT_FOUND, "Failed to update user location");
  }

  return result;
};

export const UserService = {
  createUserToDB,
  getUserProfileFromDB,
  updateProfileToDB,
  createAdminToDB,
  updateLocationToDB,
  toggleUserLock
};