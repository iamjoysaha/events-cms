import sequelize from '../database/config.js'
import { DataTypes } from 'sequelize'

const Booking = sequelize.define('booking_model', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  user_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  post_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('Booked', 'Book Now'),
    defaultValue: 'Book Now',
  },
}, {
  tableName: 'booking',
  timestamps: true,
})

export default Booking