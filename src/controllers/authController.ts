import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import bcrypt from 'bcrypt';
import { createTransporter } from "@config";
import { PrismaClient } from "@prisma/client";
import { checkRequiredFields, generateAccessToken, generateRefreshToken } from "@utils";
import { NextFunction, Request, Response } from "express";
import { createClient } from "redis";

dotenv.config();

const prisma = new PrismaClient();

let redisClient: any;

const getRedisClient = async () => {
  if (!redisClient) {
    redisClient = createClient();
    await redisClient.connect();
  }
  return redisClient;
};

const sendEmail = async (email: string, subject: string, htmlContent: string) => {
  const transporter = createTransporter();
  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: email,
    subject,
    html: htmlContent,
  });
};

const isValidEmail = (email: string) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isStrongPassword = (password: string) => {
  const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
  return passwordRegex.test(password);
};

export class AuthController {
  // Tasdiqlash kodini yuborish
  static async sendCode(req: Request, res: Response) {
    const { email } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).send({ success: false, message: "Noto'g'ri email formati" });
    }

    try {
      const redis = await getRedisClient();
      const code = Math.floor(Math.random() * 1000000);
      await redis.setEx(email, 300, code.toString()); // 5 daqiqa davomida amal qiladi

      await sendEmail(email, "Tasdiqlash kodi", `<b>${code}</b>`);
      res.send({ success: true, message: "Tasdiqlash kodi yuborildi" });
    } catch (error) {
      console.error("Email yuborishda xatolik:", error);
      res.status(500).send("Email yuborishda xatolik yuz berdi");
    }
  }

  // Tasdiqlash kodini tekshirish va foydalanuvchini ro'yxatdan o'tkazish
  static async verifyCode(req: Request, res: Response) {
    const { email, code, name, password } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).send({ success: false, message: "Noto'g'ri email formati" });
    }

    if (password && !isStrongPassword(password)) {
      return res.status(400).send({ success: false, message: "Parol kuchsiz. U kamida 8 belgidan iborat bo'lishi va kamida bitta harf va bitta raqamni o'z ichiga olishi kerak." });
    }

    try {
      const redis = await getRedisClient();
      const redisCode = await redis.get(email);

      if (!redisCode) {
        return res.status(403).send({ success: false, message: "Kod eskirgan yoki yuborilmagan" });
      }

      if (redisCode !== code) {
        // Noto'g'ri kod
        const newCode = Math.floor(Math.random() * 1000000);
        await redis.setEx(email, 300, newCode.toString());
        await sendEmail(email, "Yangi tasdiqlash kodi", `<b>${newCode}</b>`);
        return res.status(403).send({ success: false, message: "Kod noto'g'ri. Yangi kod yuborildi." });
      }

      let user = await prisma.user.findUnique({ where: { email } });
      if (!user) {
        if (!password) {
          return res.status(400).send({ success: false, message: "Yangi foydalanuvchi uchun parol ko'rsatilishi kerak." });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        user = await prisma.user.create({ data: { email, name, password: hashedPassword } });
      } else if (!user.password && password) {
        const hashedPassword = await bcrypt.hash(password, 10);
        await prisma.user.update({ where: { email }, data: { password: hashedPassword } });
      }

      const accessToken = generateAccessToken({ id: user.id });
      const refreshToken = generateRefreshToken({ id: user.id });

      res.status(200).send({
        success: true,
        message: "Muvaffaqiyatli kirishingiz amalga oshirildi",
        data: { accessToken, refreshToken, expiresIn: 900 },
      });
    } catch (error) {
      console.error("Xatolik:", error);
      res.status(500).send("Xatolik yuz berdi");
    }
  }

  // Parolni tiklash uchun kod yuborish
  static async forgotPassword(req: Request, res: Response) {
    const { email } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).send({ success: false, message: "Noto'g'ri email formati" });
    }

    try {
      const redis = await getRedisClient();
      const resetCode = Math.floor(Math.random() * 1000000);
      await redis.setEx(email, 300, resetCode.toString());
      
      await sendEmail(email, "Parolni tiklash kodi", `<b>${resetCode}</b>`);
      res.send("Parolni tiklash kodi yuborildi");
    } catch (error) {
      console.error("Email yuborishda xatolik:", error);
      res.status(500).send("Email yuborishda xatolik yuz berdi");
    }
  }

  // Parolni tiklash
  static async resetPassword(req: Request, res: Response) {
    const { email, code, newPassword } = req.body;

    if (!isValidEmail(email)) {
      return res.status(400).send({ success: false, message: "Noto'g'ri email formati" });
    }

    if (!isStrongPassword(newPassword)) {
      return res.status(400).send({ success: false, message: "Parol kuchsiz. U kamida 8 belgidan iborat bo'lishi va kamida bitta harf va bitta raqamni o'z ichiga olishi kerak." });
    }

    try {
      const redis = await getRedisClient();
      const redisCode = await redis.get(email);

      if (!redisCode || redisCode !== code) {
        return res.status(403).send({ success: false, message: "Kod noto'g'ri yoki eskirgan" });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { email }, data: { password: hashedPassword } });
      res.send("Parol muvaffaqiyatli yangilandi");
    } catch (error) {
      console.error("Xatolik:", error);
      res.status(500).send("Xatolik yuz berdi");
    }
  }

  // Profil ma'lumotlarini olish
  static async getProfile(req: Request, res: Response) {
    const userId = req.user?.id;

    try {
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) {
        return res.status(404).send({ success: false, message: "Foydalanuvchi topilmadi" });
      }

      res.status(200).send({ success: true, data: user });
    } catch (error) {
      res.status(500).send("Xatolik yuz berdi");
    }
  }

  static async changePassword(req: Request, res: Response) {
    const userId = req.user?.id;
    const { oldPassword, newPassword } = req.body;
  
    const missingFields = checkRequiredFields(['oldPassword', 'newPassword'], req.body);
    if (missingFields) {
      return res.status(400).send({ success: false, message: `Quyidagi maydonlar to'ldirilmagan: ${missingFields.join(", ")}` });
    }
  
    if (!isStrongPassword(newPassword)) {
      return res.status(400).send({ success: false, message: "Parol kuchsiz. U kamida 8 belgidan iborat bo'lishi va kamida bitta harf va bitta raqamni o'z ichiga olishi kerak." });
    }
  
    try {
      const user = await prisma.user.findUnique({ where: { id: userId } });
  
      if (!user) {
        return res.status(404).send({ success: false, message: "Foydalanuvchi topilmadi" });
      }
  
      // Check if password is not null before comparing
      if (user.password === null) {
        return res.status(403).send({ success: false, message: "Foydalanuvchining paroli yo'q." });
      }
  
      const isMatch = await bcrypt.compare(oldPassword, user.password);
      if (!isMatch) {
        return res.status(403).send({ success: false, message: "Eski parol noto'g'ri" });
      }
  
      const hashedNewPassword = await bcrypt.hash(newPassword, 10);
      await prisma.user.update({ where: { id: userId }, data: { password: hashedNewPassword } });
  
      res.send("Parol muvaffaqiyatli yangilandi");
    } catch (error) {
      console.error("Xatolik:", error);
      res.status(500).send("Xatolik yuz berdi");
    }
  }
  
  
}
