import dotenv from 'dotenv'
import { OrganizingCommittee, Role, Category } from '../models/index.js'
import sequelize from './config.js'

dotenv.config()

const seedData = async () => {
  await Role.bulkCreate([
    { role: 'admin' },
    { role: 'user' }
  ])

  await OrganizingCommittee.bulkCreate([
    { name: 'PVR Cinemas' },
  ])

  await Category.bulkCreate([
    { category: 'Educational' },
    { category: 'Entertainment' },
    { category: 'Sports' },
    { category: 'Corporate' },
    { category: 'Cultural' },
  ])
}

async function initializeDB() {
  try {
    const shouldForceSync = process.env.DB_FORCE_SYNC === 'true'
    await sequelize.sync({ force: shouldForceSync })

    console.log(`\n:::: Database synced ${shouldForceSync ? 'with' : 'without'} force! :::: \n`)

    const roleCount = await Role.count()
    const committeeCount = await OrganizingCommittee.count()

    if (shouldForceSync || roleCount === 0 || committeeCount === 0) {
      await seedData()
      console.log('Seeded Roles and Committees!\n')
    }
  } 
  catch (error) {
    console.error('Exception occurred inside initializeDB!\n', error)
  }
}

export default initializeDB
