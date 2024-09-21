import { CitiesController } from "@controllers";
import { Router } from "express";

const cityRouter = Router()

cityRouter.get("/getAll",CitiesController.getAllCities)
cityRouter.get("/get/:id",CitiesController.getCityById)
cityRouter.post("/create",CitiesController.createCity)
cityRouter.patch("/update/:id",CitiesController.updateCity)
cityRouter.delete("/delete/:id",CitiesController.deleteCity)

export { cityRouter}