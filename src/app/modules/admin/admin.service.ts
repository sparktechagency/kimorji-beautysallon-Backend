import { StatusCodes } from 'http-status-codes';
import ApiError from '../../../errors/ApiError';
import { IUser } from '../user/user.interface';
import { User } from '../user/user.model';
import { Reservation } from '../reservation/reservation.model';
import QueryBuilder from '../../../shared/apiFeature';

const createAdminToDB = async (payload: IUser): Promise<IUser> => {
    const createAdmin: any = await User.create(payload);
    if (!createAdmin) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to create Admin');
    }
    if (createAdmin) {
        await User.findByIdAndUpdate(
            { _id: createAdmin?._id },
            { verified: true },
            { new: true }
        );
    }
    return createAdmin;
};

const deleteAdminFromDB = async (id: any): Promise<IUser | undefined> => {
    const isExistAdmin = await User.findByIdAndDelete(id);
    if (!isExistAdmin) {
        throw new ApiError(StatusCodes.BAD_REQUEST, 'Failed to delete Admin');
    }
    return;
};

const getAdminFromDB = async (): Promise<IUser[]> => {
    const admins = await User.find({ role: 'ADMIN' })
        .select('name email profile contact location');
    return admins;
};

const countSummaryFromDB = async () => {

    const totalCustomers = await User.countDocuments({
        $and: [
            { role: { $nin: ["SUPER-ADMIN", "ADMIN"] } },
            { role: "CUSTOMER" }
        ]
    });

    const totalBarbers = await User.countDocuments({
        $and: [
            { role: { $nin: ["SUPER-ADMIN", "ADMIN"] } },
            { role: "BARBER" }
        ]
    });

    const totalRevenue = await Reservation.aggregate([
        {
            $match: {
                status: "Completed",
                paymentStatus: "Paid"
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$price" }
            }
        }
    ]);

    const totalIncome = await Reservation.aggregate([
        {
            $match: {
                status: "Completed",
                paymentStatus: "Paid"
            }
        },
        {
            $group: {
                _id: null,
                total: { $sum: "$price" }
            }
        },
        {
            $project: {
                _id: 0,
                totalAfterDeduction: { $multiply: ["$total", 0.1] }
            }
        }
    ]);

    return {
        totalCustomers,
        totalBarbers,
        totalRevenue: totalRevenue[0]?.total || 0,
        totalIncome: totalIncome[0]?.totalAfterDeduction || 0
    };

}

const userStatisticsFromDB = async () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Initialize user statistics array with 0 counts
    const userStatisticsArray = Array.from({ length: 12 }, (_, i) => ({
        month: monthNames[i],
        customers: 0,
        barbers: 0,
    }));

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const usersAnalytics = await User.aggregate([
        {
            $match: {
                role: { $in: ["CUSTOMER", "BARBER"] },
                createdAt: { $gte: startOfYear, $lt: endOfYear }
            }
        },
        {
            $group: {
                _id: {
                    month: { $month: "$createdAt" },
                    role: "$role",
                },
                total: { $sum: 1 }
            }
        }
    ]);

    // Populate statistics array
    usersAnalytics.forEach(stat => {
        const monthIndex = stat._id.month - 1; // Convert month (1-12) to array index (0-11)
        if (stat._id.role === "CUSTOMER") {
            userStatisticsArray[monthIndex].customers = stat.total;
        } else if (stat._id.role === "BARBER") {
            userStatisticsArray[monthIndex].barbers = stat.total;
        }
    });

    return userStatisticsArray;
};

const revenueStatisticsFromDB = async () => {
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    // Initialize user statistics array with 0 counts
    const revenueStatisticsArray = Array.from({ length: 12 }, (_, i) => ({
        month: monthNames[i],
        revenue: 0,
    }));

    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const endOfYear = new Date(now.getFullYear() + 1, 0, 1);

    const revenueAnalytics = await Reservation.aggregate([
        {
            $match: {
                status: "Completed",
                paymentStatus: "Paid",
                createdAt: { $gte: startOfYear, $lt: endOfYear }
            }
        },
        {
            $group: {
                _id: {
                    month: { $month: "$createdAt" },
                    role: "$role",
                },
                total: { $sum: "$price" }
            }
        }
    ]);

    // Populate statistics array
    revenueAnalytics.forEach(stat => {
        const monthIndex = stat._id.month - 1;
        revenueStatisticsArray[monthIndex].revenue = stat.total;
    });

    return revenueStatisticsArray;
};

const userListFromDB = async (query: Record<string, any>) => {
    const result = new QueryBuilder(User.find(), query).paginate().filter().search(['name', 'email']);
    const users = await result.queryModel;
    const pagination = result.getPaginationInfo();

    return { users, pagination };
};

const reservationListFromDB = async (query: Record<string, any>) => {
    const result = new QueryBuilder(Reservation.find(), query).paginate().filter();
    const reservations = await result.queryModel.populate([
        {
            path: 'customer',
            select: "name profile"
        },
        {
            path: 'barber',
            select: "name profile"
        },
        {
            path: 'service',
            select: "title category",
            populate: [
                {
                path: 'category',
                select: "name"
            }
        ]
        }
    ]);

    const pagination = await result.getPaginationInfo();

    return { reservations, pagination };
};

export const AdminService = {
    createAdminToDB,
    deleteAdminFromDB,
    getAdminFromDB,
    countSummaryFromDB,
    userStatisticsFromDB,
    revenueStatisticsFromDB,
    userListFromDB,
    reservationListFromDB
};
