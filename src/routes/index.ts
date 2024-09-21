import { Router } from "express";
import { authRouter } from "./auth.route";
import { cityRouter } from "./cityRoute";
import { countryRouter } from "./country.route";

let router:Router = Router()

router.use("/auth",authRouter)
router.use("/city",cityRouter)
router.use("/country",countryRouter)

export {router}