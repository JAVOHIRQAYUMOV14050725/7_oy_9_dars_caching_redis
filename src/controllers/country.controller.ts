import { Request, Response } from 'express';
import { createClient } from 'redis';
import { prisma } from './prismaClient.controller';

const redisClient = createClient({ url: process.env.REDIS_URL as string });

redisClient.connect().catch(err => console.error('Redis ulanishda xato:', err));

const handleError = (res: Response, message: string, status = 500) => {
    return res.status(status).send({ success: false, message });
};

export class CountriesController {
    static async createCountry(req: Request, res: Response) {
        try {
            const { name } = req.body;
            if (!name || typeof name !== 'string' || !name.trim()) {
                return handleError(res, 'Iltimos, davlat nomini kiriting.', 400);
            }

            const existingCountry = await prisma.country.findUnique({ where: { name: name.trim() } });
            if (existingCountry) {
                return handleError(res, 'Bunday davlat mavjud.', 409);
            }

            const newCountry = await prisma.country.create({ data: { name: name.trim() } });
            await redisClient.set(`country_${newCountry.id}`, JSON.stringify(newCountry));
            await redisClient.del('countries');
            res.status(201).send({ success: true, country: newCountry });
        } catch (err) {
            handleError(res, 'Xato yuz berdi. Iltimos, qayta urinib ko\'ring.');
        }
    }

    static async getAllCountries(req: Request, res: Response) {
        try {
            const cachedCountries = await redisClient.get('countries');
            if (cachedCountries) {
                return res.status(200).send({ success: true, countries: JSON.parse(cachedCountries) });
            }

            const countries = await prisma.country.findMany({ include: { cities: true } });
            await redisClient.set('countries', JSON.stringify(countries));
            res.status(200).send({ success: true, countries });
        } catch (err) {
            handleError(res, 'Xato yuz berdi. Iltimos, qayta urinib ko\'ring.');
        }
    }

    static async getCountryById(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (isNaN(Number(id))) {
                return handleError(res, 'ID noto\'g\'ri.', 400);
            }

            const cachedCountry = await redisClient.get(`country_${id}`);
            if (cachedCountry) {
                return res.status(200).send({ success: true, country: JSON.parse(cachedCountry) });
            }

            const country = await prisma.country.findUnique({
                where: { id: parseInt(id) },
                include: { cities: true } // Include cities when fetching the country
            });

            if (!country) {
                return handleError(res, 'Davlat topilmadi.', 404);
            }

            await redisClient.set(`country_${id}`, JSON.stringify(country));
            res.status(200).send({ success: true, country });
        } catch (err) {
            handleError(res, 'Xato yuz berdi. Iltimos, qayta urinib ko\'ring.');
        }
    }

    static async updateCountry(req: Request, res: Response) {
        try {
            const { id } = req.params;
            const { name } = req.body;

            if (isNaN(Number(id))) {
                return handleError(res, 'ID noto\'g\'ri.', 400);
            }

            const existingCountry = await prisma.country.findUnique({ where: { id: parseInt(id) } });
            if (!existingCountry) {
                return handleError(res, 'Davlat topilmadi.', 404);
            }

            if (!name || typeof name !== 'string' || !name.trim()) {
                return handleError(res, 'Iltimos, yangi davlat nomini kiriting.', 400);
            }

            const countryWithSameName = await prisma.country.findUnique({
                where: { name: name.trim() },
            });
            if (countryWithSameName && countryWithSameName.id !== existingCountry.id) {
                return handleError(res, 'Bunday davlat nomi allaqachon mavjud.', 409);
            }

            const updatedCountry = await prisma.country.update({
                where: { id: parseInt(id) },
                data: { name: name.trim() },
            });

            await redisClient.set(`country_${id}`, JSON.stringify(updatedCountry));
            await redisClient.del('countries');
            res.status(200).send({ success: true, country: updatedCountry });
        } catch (err) {
            handleError(res, 'Xato yuz berdi. Iltimos, qayta urinib ko\'ring.');
        }
    }

    static async deleteCountry(req: Request, res: Response) {
        try {
            const { id } = req.params;
            if (isNaN(Number(id))) {
                return handleError(res, 'ID noto\'g\'ri.', 400);
            }

            const existingCountry = await prisma.country.findUnique({ where: { id: parseInt(id) } });
            if (!existingCountry) {
                return handleError(res, 'Davlat topilmadi.', 404);
            }

            await prisma.country.delete({ where: { id: parseInt(id) } });
            await redisClient.del(`country_${id}`);
            await redisClient.del('countries');
            res.status(200).send({ success: true, message: 'Davlat o\'chirildi.' });
        } catch (err) {
            handleError(res, 'Xato yuz berdi. Iltimos, qayta urinib ko\'ring.');
        }
    }
}
