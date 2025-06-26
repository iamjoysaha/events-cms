import sequelize from '../database/config.js'
import { DataTypes } from 'sequelize'
import Events from './Events.js'

const Posts = sequelize.define('posts_model', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  description: {
    type: DataTypes.TEXT('long'),
    allowNull: false,
  },
  venue: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  location: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  organizer: {
    type: DataTypes.STRING(255),
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('upcoming', 'ongoing', 'completed'),
    defaultValue: 'upcoming'
  },
  time: {
      type: DataTypes.TIME,
      defaultValue: DataTypes.NOW
  },
  date: {
      type: DataTypes.DATEONLY,
      defaultValue: DataTypes.NOW
  },
  price: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  // Foreign keys
  event_id: {
    type: DataTypes.INTEGER,
    references: {
        model: Events,
        key: 'id',
    }
  },
}, {
  tableName: 'posts',
  timestamps: true,
})

export default Posts