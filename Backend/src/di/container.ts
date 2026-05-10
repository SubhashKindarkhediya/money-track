import { container } from "tsyringe";
import { PersonService } from "../services/person.service";
import { PersonController } from "../controllers/person.controller";
import { AuthService } from "../services/auth.service";
import { AuthController } from "../controllers/auth.controller";
import { TransactionsService } from "../services/transactions.service";
import { TransactionsController } from "../controllers/transactions.controller";
import { DashboardService } from "../services/dashboard.service";
import { DashboardController } from "../controllers/dashboard.controller";
import { NotificationService } from "../services/notification.service";
import { NotificationController } from "../controllers/notification.controller";

// Register Services
container.registerSingleton(PersonService);
container.registerSingleton(AuthService);
container.registerSingleton(TransactionsService);
container.registerSingleton(DashboardService);
container.registerSingleton(NotificationService);

// Register Controllers
container.register(PersonController, { useClass: PersonController });
container.register(AuthController, { useClass: AuthController });
container.register(TransactionsController, { useClass: TransactionsController });
container.register(DashboardController, { useClass: DashboardController });
container.register(NotificationController, { useClass: NotificationController });

export { container };
