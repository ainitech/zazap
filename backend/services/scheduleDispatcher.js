import { Op } from 'sequelize';
import { Schedule, Session } from '../models/index.js';
import { processScheduleItem } from '../controllers/scheduleController.js';

let timer = null;
let running = false;

export const startScheduleDispatcher = () => {
  if (timer) return;
  timer = setInterval(tick, 30000); // 30s
  // Run immediately once
  tick().catch(() => {});
};

export const stopScheduleDispatcher = () => {
  if (timer) clearInterval(timer);
  timer = null;
};

async function tick() {
  if (running) return; // prevent overlap
  running = true;
  try {
    const now = new Date();
    const due = await Schedule.findAll({
      where: {
        status: 'pending',
        sendAt: { [Op.lte]: now }
      },
      order: [['sendAt', 'ASC']],
      limit: 10
    });
    for (const item of due) {
      try {
        const session = await Session.findByPk(item.sessionId);
        if (!session) {
          await item.update({ status: 'failed', lastError: 'Sessão não encontrada' });
          continue;
        }
        await processScheduleItem(item, session);
      } catch (err) {
        // processScheduleItem handles status updates
      }
    }
  } finally {
    running = false;
  }
}
