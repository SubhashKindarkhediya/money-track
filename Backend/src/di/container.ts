import { container } from "tsyringe";
import { PersonService } from "../services/person.service";
import { PersonController } from "../controllers/person.controller";
import { AuthService } from "../services/auth.service";
import { AuthController } from "../controllers/auth.controller";
import { TransactionsService } from "../services/transactions.service";
import { TransactionsController } from "../controllers/transactions.controller";
import { DashboardService } from "../services/dashboard.service";
import { DashboardController } from "../controllers/dashboard.controller";

// Register Services
container.registerSingleton(PersonService);
container.registerSingleton(AuthService);
container.registerSingleton(TransactionsService);
container.registerSingleton(DashboardService);

// Register Controllers
container.register(PersonController, { useClass: PersonController });
container.register(AuthController, { useClass: AuthController });
container.register(TransactionsController, { useClass: TransactionsController });
container.register(DashboardController, { useClass: DashboardController });

export { container };
