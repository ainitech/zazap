import { Schedule, Session, Contact } from '../models/index.js';
import { Op } from 'sequelize';
import { sendText as sendTextBaileys, sendMedia as sendMediaBaileys } from '../services/baileysService.js';

export const listSchedules = async (req, res) => {
  try {
    console.log('📅 Backend ScheduleController: Requisição recebida, user:', req.user);
    
    const { status, q } = req.query;
    const where = { userId: req.user.id };
    if (status) where.status = status;
    if (q) where.to = { [Op.iLike]: `%${q}%` };

    console.log('📅 Backend ScheduleController: Buscando com where:', where);
    const items = await Schedule.findAll({
      where,
      order: [['sendAt', 'ASC']],
      include: [
        { model: Session, attributes: ['id', 'whatsappId'] },
        { model: Contact, attributes: ['id', 'name', 'whatsappId'] }
      ]
    });

    console.log('📅 Backend ScheduleController: Encontrados', items.length, 'agendamentos');
    res.json(items);
  } catch (err) {
    console.error('📅 Backend ScheduleController: Erro ao listar agendamentos:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const getCounts = async (req, res) => {
  try {
    const [pending, processing, sent, failed] = await Promise.all([
      Schedule.count({ where: { userId: req.user.id, status: 'pending' } }),
      Schedule.count({ where: { userId: req.user.id, status: 'processing' } }),
      Schedule.count({ where: { userId: req.user.id, status: 'sent' } }),
      Schedule.count({ where: { userId: req.user.id, status: 'failed' } }),
    ]);
    res.json({ pending, processing, sent, failed, total: pending + processing + sent + failed });
  } catch (err) {
    console.error('Erro ao contar agendamentos:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const createSchedule = async (req, res) => {
  try {
    const { sessionId, contactId, queueId, to, type, text, sendAt } = req.body;
    if (!sessionId || !to || !sendAt) {
      return res.status(400).json({ error: 'sessionId, to e sendAt são obrigatórios' });
    }
    const payload = {
      userId: req.user.id,
      sessionId,
      contactId: contactId || null,
      queueId: queueId || null,
      to,
      type: type || 'text',
      text: text || null,
      sendAt: new Date(sendAt)
    };
    if (req.file) {
      payload.type = 'media';
      payload.filePath = req.file.path;
      payload.fileName = req.file.filename;
      payload.fileType = req.file.mimetype;
    }
    const item = await Schedule.create(payload);
    res.status(201).json(item);
  } catch (err) {
    console.error('Erro ao criar agendamento:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const updateSchedule = async (req, res) => {
  try {
    const id = req.params.id;
    const item = await Schedule.findOne({ where: { id, userId: req.user.id } });
    if (!item) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (item.status !== 'pending') return res.status(400).json({ error: 'Apenas agendamentos pendentes podem ser editados' });

    const updates = { ...req.body };
    if (updates.sendAt) updates.sendAt = new Date(updates.sendAt);
    ['userId', 'status', 'attempts', 'lastError'].forEach(k => delete updates[k]);
    if (req.file) {
      updates.type = 'media';
      updates.filePath = req.file.path;
      updates.fileName = req.file.filename;
      updates.fileType = req.file.mimetype;
    }

    await item.update(updates);
    res.json(item);
  } catch (err) {
    console.error('Erro ao atualizar agendamento:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const cancelSchedule = async (req, res) => {
  try {
    const id = req.params.id;
    const item = await Schedule.findOne({ where: { id, userId: req.user.id } });
    if (!item) return res.status(404).json({ error: 'Agendamento não encontrado' });
    if (item.status === 'sent') return res.status(400).json({ error: 'Agendamento já foi enviado' });
    await item.update({ status: 'canceled' });
    res.json({ success: true });
  } catch (err) {
    console.error('Erro ao cancelar agendamento:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

// Envio imediato (para testes)
export const triggerSendNow = async (req, res) => {
  try {
    const id = req.params.id;
    const item = await Schedule.findOne({ where: { id, userId: req.user.id } });
    if (!item) return res.status(404).json({ error: 'Agendamento não encontrado' });
    const session = await Session.findByPk(item.sessionId);
    if (!session) return res.status(400).json({ error: 'Sessão inválida' });

    await processScheduleItem(item, session);
    res.json(item);
  } catch (err) {
    console.error('Erro ao enviar agora:', err);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
};

export const processScheduleItem = async (item, session) => {
  try {
    if (item.status !== 'pending') return item;
    await item.update({ status: 'processing' });

    if (item.type === 'media' && item.filePath) {
      // Carregar arquivo e enviar como base64
      const fs = await import('fs');
      const path = await import('path');
      const abs = path.resolve(process.cwd(), item.filePath);
      const data = fs.readFileSync(abs);
  const base64 = data.toString('base64');
  await sendMediaBaileys(session.whatsappId, item.to, base64, item.fileName || 'file', item.fileType || 'application/octet-stream');
    } else {
  await sendTextBaileys(session.whatsappId, item.to, item.text || '');
    }

    await item.update({ status: 'sent', attempts: item.attempts + 1, lastError: null });
    return item;
  } catch (err) {
    await item.update({ status: 'failed', attempts: item.attempts + 1, lastError: err.message?.slice(0, 500) || String(err).slice(0, 500) });
    return item;
  }
};
