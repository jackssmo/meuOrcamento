import { Request, Response } from 'express';
import { AuthRequest } from '../middleware/auth.middleware';
import { UserRepository } from '../repositories/UserRepository';
import { UserService } from '../services/UserService';
import { env } from '../config/env';
import jwt from 'jsonwebtoken';

const userRepository = new UserRepository();
const userService = new UserService(userRepository);

export class AuthController {
  
  async register(req: Request, res: Response): Promise<Response> {
    try {
      const { name, email, password } = req.body;

      if (!name || !email || !password) {
        return res.status(400).json({ error: 'Nome, e-mail e senha são obrigatórios' });
      }

      const user = await userService.registerUser(name, email, password);

      const { password_hash, ...userWithoutPassword } = user;

      return res.status(201).json(userWithoutPassword);
      
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao criar conta.';
      return res.status(message === 'Este e-mail já está em uso' ? 409 : 400).json({ error: message });
    }
  }

  async login(req: Request, res: Response): Promise<Response> {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: 'E-mail e senha são obrigatórios' });
      }

      const user = await userService.authenticate(email, password);
      const { password_hash, ...userWithoutPassword } = user;

      const payload = { id: user.id, email: user.email };
      const token = jwt.sign(payload, env.jwtSecret, { expiresIn: '7d' });
      
      return res.status(200).json({ 
        message: 'Login bem-sucedido!', 
        user: userWithoutPassword,
        token 
      });

    } catch (error: unknown) {
      if (error instanceof Error && error.message === 'E-mail ou senha incorretos') {
        return res.status(401).json({ error: error.message });
      }
      console.error('Erro de conexão/banco durante autenticação:', error);
      return res.status(500).json({ error: 'Erro de conexão com o banco de dados. Tente novamente em instantes.' });
    }
  }

  async profile(req: Request, res: Response): Promise<Response> {
    try {
      const user = (req as Request & { user?: { id: number } }).user;
      if (!user?.id) return res.status(401).json({ error: 'Usuário não autenticado.' });
      const found = await userRepository.findById(user.id);
      if (!found) return res.status(404).json({ error: 'Usuário não encontrado.' });
      const { password_hash, ...safeUser } = found;
      return res.status(200).json(safeUser);
    } catch (error) {
      console.error('Erro ao consultar perfil:', error);
      return res.status(500).json({ error: 'Erro de comunicação com o banco de dados.' });
    }
  }

  async updateProfile(req: AuthRequest, res: Response): Promise<Response> {
    try {
      const userId = req.user?.id;
      if (!userId) return res.status(401).json({ error: 'Usuário não autenticado.' });

      const { name, email, currentPassword, newPassword } = req.body;
      if (typeof name !== 'string' || typeof email !== 'string' || typeof currentPassword !== 'string') {
        return res.status(400).json({ error: 'Nome, e-mail e senha atual são obrigatórios.' });
      }

      const user = await userService.updateProfile(userId, name, email, currentPassword, newPassword);
      const { password_hash, ...safeUser } = user;
      return res.status(200).json(safeUser);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Erro ao atualizar perfil.';
      return res.status(message === 'Este e-mail já está em uso' ? 409 : 400).json({ error: message });
    }
  }
}