import type { Request, Response } from 'express';
import { Role } from '../generated/prisma/client.js';
import { hashPassword, comparePassword, generateToken } from '../auth.js';
import { prisma } from '../lib/prisma.js';

export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, name, role } = req.body;
    const hashedPassword = await hashPassword(password);
    const user = await prisma.$transaction(async (tx) => {
      const createdUser = await tx.user.create({
        data: { email, password: hashedPassword, name, role },
      });

      if (createdUser.role === Role.DRIVER) {
        await tx.driverProfile.create({
          data: { userId: createdUser.id },
        });
      }

      return createdUser;
    });
    const token = generateToken(user.id, user.role);
    res.status(201).json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }
    const token = generateToken(user.id, user.role);
    res.json({ token, user: { id: user.id, email: user.email, role: user.role, name: user.name } });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};

export const me = async (req: any, res: Response) => {
  try {
    const user = await prisma.user.findUnique({ where: { id: req.user.userId } });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
};
