import { User } from '../models/index.js';
import bcrypt from 'bcryptjs';

// Obter perfil do usuário logado
export const getProfile = async (req, res) => {
  try {
    const user = await User.findByPk(req.user.id, { attributes: ['id', 'name', 'email'] });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Atualizar perfil do usuário logado (apenas nome e email)
export const updateProfile = async (req, res) => {
  const { name, email } = req.body;
  
  try {
    // Validações básicas
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Nome é obrigatório.' });
    }

    if (!email || !email.trim()) {
      return res.status(400).json({ error: 'Email é obrigatório.' });
    }

    // Validação de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Email inválido.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Verificar se o email já está em uso por outro usuário
    if (email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser && existingUser.id !== user.id) {
        return res.status(400).json({ error: 'Este email já está em uso por outro usuário.' });
      }
    }

    // Atualizar dados
    user.name = name.trim();
    user.email = email.trim();
    await user.save();

    res.json({ 
      success: true, 
      message: 'Perfil atualizado com sucesso!',
      user: { 
        id: user.id, 
        name: user.name, 
        email: user.email 
      } 
    });
  } catch (err) {
    console.error('Erro ao atualizar perfil:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// Alterar senha do usuário logado
export const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  
  try {
    // Validações básicas
    if (!currentPassword) {
      return res.status(400).json({ error: 'Senha atual é obrigatória.' });
    }

    if (!newPassword) {
      return res.status(400).json({ error: 'Nova senha é obrigatória.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Nova senha deve ter pelo menos 6 caracteres.' });
    }

    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Verificar senha atual
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isCurrentPasswordValid) {
      return res.status(400).json({ error: 'Senha atual incorreta.' });
    }

    // Verificar se a nova senha é diferente da atual
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({ error: 'A nova senha deve ser diferente da senha atual.' });
    }

    // Atualizar senha
    user.password = await bcrypt.hash(newPassword, 12);
    await user.save();

    res.json({ 
      success: true, 
      message: 'Senha alterada com sucesso!' 
    });
  } catch (err) {
    console.error('Erro ao alterar senha:', err);
    res.status(500).json({ error: 'Erro interno do servidor.' });
  }
};

// Listar todos os usuários (apenas para administradores)
export const getUsers = async (req, res) => {
  try {
    // Verificar se o usuário logado é administrador
    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem listar usuários.' });
    }

    const users = await User.findAll({
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt', 'updatedAt'],
      order: [['createdAt', 'DESC']]
    });

    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Obter usuário por ID
export const getUserById = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário logado é administrador ou está acessando seu próprio perfil
    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.id !== parseInt(id))) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const user = await User.findByPk(id, {
      attributes: ['id', 'name', 'email', 'role', 'isActive', 'createdAt', 'updatedAt']
    });

    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Criar novo usuário
export const createUser = async (req, res) => {
  try {
    const { name, email, password, role = 'attendant', isActive = true } = req.body;

    // Verificar se o usuário logado é administrador
    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem criar usuários.' });
    }

    // Validar dados obrigatórios
    if (!name || !email || !password) {
      return res.status(400).json({ error: 'Nome, email e senha são obrigatórios.' });
    }

    // Verificar se o email já existe
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ error: 'Este email já está em uso.' });
    }

    // Validar role
    const validRoles = ['admin', 'supervisor', 'attendant'];
    if (!validRoles.includes(role)) {
      return res.status(400).json({ error: 'Função inválida. Use: admin, supervisor ou attendant.' });
    }

    // Criar hash da senha
    const hashedPassword = await bcrypt.hash(password, 10);

    // Criar usuário
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role,
      isActive
    });

    res.status(201).json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        createdAt: user.createdAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Atualizar usuário
export const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, password, role, isActive } = req.body;

    // Verificar se o usuário logado é administrador ou está editando seu próprio perfil
    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.id !== parseInt(id))) {
      return res.status(403).json({ error: 'Acesso negado.' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    // Se não for admin, não pode alterar role
    if (currentUser.role !== 'admin') {
      delete req.body.role;
    }

    // Validar role se fornecida
    if (role) {
      const validRoles = ['admin', 'supervisor', 'attendant'];
      if (!validRoles.includes(role)) {
        return res.status(400).json({ error: 'Função inválida. Use: admin, supervisor ou attendant.' });
      }
    }

    // Verificar se o email já existe (se estiver sendo alterado)
    if (email && email !== user.email) {
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ error: 'Este email já está em uso.' });
      }
    }

    // Atualizar campos
    if (name) user.name = name;
    if (email) user.email = email;
    if (password) user.password = await bcrypt.hash(password, 10);
    if (role !== undefined) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;

    await user.save();

    res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
        updatedAt: user.updatedAt
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Excluir usuário
export const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;

    // Verificar se o usuário logado é administrador
    const currentUser = await User.findByPk(req.user.id);
    if (!currentUser || currentUser.role !== 'admin') {
      return res.status(403).json({ error: 'Acesso negado. Apenas administradores podem excluir usuários.' });
    }

    // Não permitir excluir o próprio usuário
    if (currentUser.id === parseInt(id)) {
      return res.status(400).json({ error: 'Não é possível excluir seu próprio usuário.' });
    }

    const user = await User.findByPk(id);
    if (!user) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    await user.destroy();

    res.json({ success: true, message: 'Usuário excluído com sucesso.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
