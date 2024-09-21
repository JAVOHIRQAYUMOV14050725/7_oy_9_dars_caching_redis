import { CountriesController } from "@controllers";
import { authenticateToken } from "@middlewares";
import { Router } from "express";

const countryRouter = Router()

countryRouter.get("/getAll",CountriesController.getAllCountries)
countryRouter.get("/get/:id",CountriesController.getCountryById)
countryRouter.post("/create",CountriesController.createCountry)
countryRouter.patch("/update/:id",CountriesController.updateCountry)
countryRouter.delete("/delete/:id",CountriesController.deleteCountry)

export { countryRouter}