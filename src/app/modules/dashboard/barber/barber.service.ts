import { StatusCodes } from "http-status-codes";
import { Day } from "../../../../enums/day";
import { ServiceType } from "../../../../enums/serviceType";
import ApiError from "../../../../errors/ApiError";
import { Reservation } from "../../reservation/reservation.model";
import { Service } from "../../service/service.model";

const getBarberDashboard = async (barberId: string) => {
    // Verify barber exists
    const barberServices = await Service.find({ barber: barberId });

    if (!barberServices) {
        throw new ApiError(StatusCodes.NOT_FOUND, "Barber not found");
    }

    // Get current date info
    const today = new Date();
    const todayDateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
    const currentDay = today.toLocaleString('en-US', { weekday: 'long' }).toUpperCase() as Day;

    // ============= SERVICE STATISTICS =============

    // Total services
    const totalServices = await Service.countDocuments({
        barber: barberId,
        status: "Active"
    });

    // Available services (those with active status)
    const availableServices = await Service.find({
        barber: barberId,
        status: "Active"
    });

    // Home services count
    const totalHomeServices = await Service.countDocuments({
        barber: barberId,
        serviceType: ServiceType.HOME,
        status: "Active"
    });

    // Saloon services count
    const totalSaloonServices = await Service.countDocuments({
        barber: barberId,
        serviceType: ServiceType.SALOON,
        status: "Active"
    });

    // Today's available services (based on current day schedule)
    const todayServices = availableServices.filter(service => {
        if (!service.dailySchedule || service.dailySchedule.length === 0) {
            return false;
        }

        // Check if service has schedule for today
        const todaySchedule = service.dailySchedule.find(
            schedule => schedule.day === currentDay
        );

        // Service is available today if it has schedule and time slots
        return todaySchedule && todaySchedule.timeSlot && todaySchedule.timeSlot.length > 0;
    });

    const todayAvailableServicesCount = todayServices.length;

    // ============= EARNINGS STATISTICS =============

    // Get all completed and paid reservations for this barber
    const completedReservations = await Reservation.find({
        barber: barberId,
        status: "Completed",
        paymentStatus: "Paid"
    }).populate('service');

    // Total earnings (all time)
    const totalEarnings = completedReservations.reduce((sum, reservation) => {
        return sum + (reservation.price || 0) + (reservation.tips || 0);
    }, 0);

    // Today's earnings
    const todayReservations = completedReservations.filter(
        reservation => reservation.reservationDate === todayDateString
    );

    const todayEarnings = todayReservations.reduce((sum, reservation) => {
        return sum + (reservation.price || 0) + (reservation.tips || 0);
    }, 0);

    // Home service earnings (all time)
    const homeServiceEarnings = completedReservations.reduce((sum, reservation) => {
        const service = reservation.service as any;
        if (service && service.serviceType === ServiceType.HOME) {
            return sum + (reservation.price || 0) + (reservation.tips || 0);
        }
        return sum;
    }, 0);

    // Saloon service earnings (all time)
    const saloonServiceEarnings = completedReservations.reduce((sum, reservation) => {
        const service = reservation.service as any;
        if (service && service.serviceType === ServiceType.SALOON) {
            return sum + (reservation.price || 0) + (reservation.tips || 0);
        }
        return sum;
    }, 0);

    // Today's Home service earnings
    const todayHomeEarnings = todayReservations.reduce((sum, reservation) => {
        const service = reservation.service as any;
        if (service && service.serviceType === ServiceType.HOME) {
            return sum + (reservation.price || 0) + (reservation.tips || 0);
        }
        return sum;
    }, 0);

    // Today's Saloon service earnings
    const todaySaloonEarnings = todayReservations.reduce((sum, reservation) => {
        const service = reservation.service as any;
        if (service && service.serviceType === ServiceType.SALOON) {
            return sum + (reservation.price || 0) + (reservation.tips || 0);
        }
        return sum;
    }, 0);

    // ============= ADDITIONAL STATISTICS =============

    // Total completed reservations count
    const totalCompletedReservations = completedReservations.length;

    // Today's completed reservations count
    const todayCompletedReservations = todayReservations.length;

    return {
        // Service Statistics
        serviceStatistics: {
            totalServices,
            availableServices: totalServices,
            totalHomeServices,
            totalSaloonServices,
            todayAvailableServices: todayAvailableServicesCount,
            currentDay: currentDay,
            todayDate: todayDateString,
        },

        // Earnings Statistics
        earningsStatistics: {
            // Total Earnings
            totalEarnings: {
                amount: totalEarnings,
                completedReservations: totalCompletedReservations
            },

            // Today's Earnings
            todayEarnings: {
                amount: todayEarnings,
                completedReservations: todayCompletedReservations,
                date: todayDateString
            },

            // Service Type Earnings (All Time)
            homeServiceEarnings: {
                amount: homeServiceEarnings
            },

            saloonServiceEarnings: {
                amount: saloonServiceEarnings
            },

            // Today's Service Type Earnings
            todayHomeServiceEarnings: {
                amount: todayHomeEarnings
            },

            todaySaloonServiceEarnings: {
                amount: todaySaloonEarnings
            }
        },

        // Today's Services Details (optional - you can remove if not needed)
        todayServicesDetails: todayServices.map(service => ({
            id: service._id,
            title: service.title,
            serviceType: service.serviceType,
            price: service.price,
            duration: service.duration,
            todaySchedule: service.dailySchedule?.find(s => s.day === currentDay)
        }))
    };
};

export const dashboardBarberService = {
    getBarberDashboard,
};