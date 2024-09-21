import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@prisma/client';
import { createClient } from 'redis';
import { prisma } from './prismaClient.controller';

const redisClient = createClient({ url: process.env.REDIS_URL as string });

(async () => {
    await redisClient.connect();
})().catch(err => console.error('Redis connection error:', err));

process.on('SIGINT', async () => {
    await redisClient.quit();
    await prisma.$disconnect();
    process.exit(0);
});

export class CitiesController {
    static async createCity(req: Request, res: Response, next: NextFunction) {
        try {
            const { name, countryId } = req.body;

            if (!name || typeof name !== 'string' || name.trim().length === 0) {
                return res.status(400).json({ success: false, message: 'Iltimos, shahar nomini kiriting.' });
            }
            if (!countryId) {
                return res.status(400).json({ success: false, message: 'Iltimos, mamlakat ID sini kiriting.' });
            }

            const country = await prisma.country.findUnique({ where: { id: countryId } });
            if (!country) {
                const countries = await prisma.country.findMany({
                    select: { id: true, name: true },
                });
                return res.status(400).json({
                    success: false,
                    message: 'Bunday idlik mamlakat mavjud emas. Mana sizga yordam uchun mamlakat idlari va nomlari',
                    availableCountries: countries
                });
            }

            const newCity = await prisma.city.create({
                data: { name: name.trim(), countryId },
            });

            res.status(201).json({ success: true, city: newCity });
        } catch (err) {
            console.error(err);
            next(err);
        }
    }

    static async updateCity(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;
            const { name, countryId } = req.body;

            if (isNaN(Number(id))) {
                return res.status(400).json({ success: false, message: 'ID noto\'g\'ri.' });
            }

            const existingCity = await prisma.city.findUnique({
                where: { id: parseInt(id) },
                include: { country: { select: { id: true, name: true } } },
            });
            if (!existingCity) {
                return res.status(404).json({ success: false, message: 'Shahar topilmadi.' });
            }

            const country = await prisma.country.findUnique({ where: { id: countryId } });
            if (!country) {
                const countries = await prisma.country.findMany();
                return res.status(400).json({
                    success: false,
                    message: 'Bunday idlik mamlakat mavjud emas. Mana sizga yordam uchun mamlakat idlari va nomlari.',
                    availableCountries: countries
                });
            }

            const updatedCity = await prisma.city.update({
                where: { id: parseInt(id) },
                data: { name: name.trim(), countryId },
            });

            res.status(200).json({ success: true, city: updatedCity });
        } catch (err) {
            console.error(err);
            next(err);
        }
    }

    static async getAllCities(req: Request, res: Response, next: NextFunction) {
        try {
            const cachedCities = await redisClient.get('cities');
            if (cachedCities) {
                return res.status(200).json({ success: true, cities: JSON.parse(cachedCities) });
            }

            const cities = await prisma.city.findMany({
                include: {
                    country: {
                        select: {
                            id: true,
                            name: true,
                        },
                    }
                }
            });
            await redisClient.set('cities', JSON.stringify(cities));
            res.status(200).json({ success: true, cities });
        } catch (err) {
            console.error(err);
            next(err);
        }
    }

    static async getCityById(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            if (isNaN(Number(id))) {
                return res.status(400).json({ success: false, message: 'ID noto\'g\'ri.' });
            }

            const cachedCity = await redisClient.get(`city_${id}`);
            if (cachedCity) {
                return res.status(200).json({ success: true, city: JSON.parse(cachedCity) });
            }

            const city = await prisma.city.findUnique({
                where: { id: parseInt(id) },
                include: {
                    country: {
                        select: {
                            id: true,
                            name: true,
                        },
                    }
                }
            });
            if (!city) {
                return res.status(404).json({ success: false, message: 'Shahar topilmadi.' });
            }

            await redisClient.set(`city_${id}`, JSON.stringify(city));
            res.status(200).json({ success: true, city });
        } catch (err) {
            console.error(err);
            next(err);
        }
    }

    static async deleteCity(req: Request, res: Response, next: NextFunction) {
        try {
            const { id } = req.params;

            if (isNaN(Number(id))) {
                return res.status(400).json({ success: false, message: 'ID noto\'g\'ri.' });
            }

            const existingCity = await prisma.city.findUnique({ where: { id: parseInt(id) } });
            if (!existingCity) {
                return res.status(404).json({ success: false, message: 'Shahar topilmadi.' });
            }

            await prisma.city.delete({ where: { id: parseInt(id) } });
            await redisClient.del(`city_${id}`);
            await redisClient.del('cities');
            res.status(200).json({ success: true, message: 'Shahar o\'chirildi.' });
        } catch (err) {
            console.error(err);
            next(err);
        }
    }
}
