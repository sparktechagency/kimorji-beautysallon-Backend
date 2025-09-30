import express from 'express';
import { UserRoutes } from '../modules/user/user.routes';
import { AuthRoutes } from '../modules/auth/auth.routes';
import { BookmarkRoutes } from '../modules/bookmark/bookmark.routes';
import { CategoryRoutes } from '../modules/category/category.route';
import { RuleRoutes } from '../modules/rule/rule.route';
import { FaqRoutes } from '../modules/faq/faq.route';
import { AdminRoutes } from '../modules/admin/admin.route';
import { ChatRoutes } from '../modules/chat/chat.route';
import { MessageRoutes } from '../modules/message/message.route';
import { NotificationRoutes } from '../modules/notification/notification.routes';
import { PackageRoutes } from '../modules/package/package.routes';
import { ReviewRoutes } from '../modules/review/review.routes';
import { ServiceRoutes } from '../modules/service/service.routes';
import { SubCategoryRoutes } from '../modules/subCategory/subCategory.route';
import { PortfolioRoutes } from '../modules/portfolio/portfolio.route';
import { BarberRoutes } from '../modules/barber/barber.routes';
import { ReservationRoutes } from '../modules/reservation/reservation.routes';
import { ReportRoutes } from '../modules/report/report.routes';
import { PaymentRoutes } from '../modules/payment/payment.routes';
import { OfferRoutes } from '../modules/offer/offer.routes';
const router = express.Router();

const apiRoutes = [
    { path: "/user", route: UserRoutes },
    { path: "/auth", route: AuthRoutes },
    { path: "/admin", route: AdminRoutes },
    { path: "/bookmark", route: BookmarkRoutes },
    { path: "/category", route: CategoryRoutes },
    { path: "/subCategory", route: SubCategoryRoutes },
    { path: "/rule", route: RuleRoutes },
    { path: "/faq", route: FaqRoutes },
    { path: "/chat", route: ChatRoutes },
    { path: "/message", route: MessageRoutes },
    { path: "/notification", route: NotificationRoutes },
    { path: "/package", route: PackageRoutes },
    { path: "/review", route: ReviewRoutes },
    { path: "/service", route: ServiceRoutes },
    { path: "/portfolio", route: PortfolioRoutes },
    { path: "/barber", route: BarberRoutes },
    { path: "/reservation", route: ReservationRoutes },
    { path: "/report", route: ReportRoutes },
    { path: "/payment", route: PaymentRoutes },
    { path: "/offer", route: OfferRoutes },
]

apiRoutes.forEach(route => router.use(route.path, route.route));
export default router;