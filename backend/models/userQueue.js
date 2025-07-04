import { DataTypes } from 'sequelize';
import sequelize from '../services/sequelize.js';
import User from './user.js';
import Queue from './queue.js';

const UserQueue = sequelize.define('UserQueue', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'users',
      key: 'id',
    },
  },
  queueId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    references: {
      model: 'queues',
      key: 'id',
    },
  },
}, {
  tableName: 'user_queues',
  timestamps: true,
});

User.belongsToMany(Queue, { through: UserQueue, foreignKey: 'userId' });
Queue.belongsToMany(User, { through: UserQueue, foreignKey: 'queueId' });

export default UserQueue;
