import bcrypt from 'bcrypt'
import dayjs from 'dayjs'
import { Users } from '../models/index.js'

async function createUser({ first_name, last_name, email, password, username, status, email_verified_at,  is_owner, organizing_committee_id, role_id}) {
    if (password.length < 8) {
        return { success: false, message: 'Password must be at least 8 characters long' }
    }

    try {
        const hashedPassword = await bcrypt.hash(password, 10)
    
        const user = await Users.create({
            first_name, 
            last_name, 
            email, 
            password: hashedPassword, 
            username, 
            status, 
            email_verified_at,  
            is_owner, 
            organizing_committee_id, 
            role_id
        })
    
        if(!user) {
            return { success: false, message: 'Unable to create user!' }
        }
    
        return { success: true, message: 'Registration successful!', user }
    }
    catch(error) {
        console.error('Exception occurred inside createUser!\n', error)
        return { success: false, message: 'Exception::: Unable to create user!'}
    }
}

async function getUser({email, password}) {
    try {
        const user = await Users.findOne({ where: { email, is_owner: true } })
    
        if (!user) 
            return { success: false, message: 'User not found!' }
    
        const isMatch = await bcrypt.compare(password, user.password)
        if (isMatch) {
            await user.update({ status: 1, updatedAt: new Date() })
            return { success: true, user }
        } 
        else {
            return { success: false, message: 'Invalid password' }
        }
    }
    catch (error) {
        console.log('Exception occurred inside getUser!\n', error)
        return { success: false, message: 'Exception:::: User not found!' }
    }
}

async function getUsers() {
    try {
        const users = await Users.findAll()
    
        if (!users || !users.length) 
            return { success: false, message: 'Users not found!' }
    
        return { success: true, users }
    }
    catch (error) {
        console.log('Exception occurred inside getUsers!\n', error)
        return { success: false, message: 'Exception:::: Users not found!' }
    }
}

async function getActiveUsers(id) {
    try {
        const { user }  = await getUserById(id)
        const users = await Users.findAll({
            where: {
                organizing_committee_id: user.organizing_committee_id,
                status: 1,
                role_id: 2,
            },
            attributes: {
                exclude: ['password']
            }
        })

        return { success: true, users }
    }
    catch(error) {
        console.log('Exception occurred inside getActiveUsers!\n', error)
        return { success: false, message: 'Exception:::: Active users not found!' }
    }
}

async function getOnlyUsers(id, pageNo = 1, pageSize = 50) {
    try {
        const { user }  = await getUserById(id)
        const { count, rows: users} = await Users.findAndCountAll({
            where: {
                organizing_committee_id: user.organizing_committee_id,
                role_id: 2,
            },
            attributes: {
                exclude: ['password']
            },
            limit: pageSize,
            offset: (pageNo - 1) * pageSize
        })

        return { success: true, users, totalRecords: count }
    }
    catch(error) {
        console.log('Exception occurred inside getOnlyUsers!\n', error)
        return { success: false, message: 'Exception:::: Active users not found!' }
    }
}


async function getUserByRoleId(role_id) {
    try {
        const user = await Users.findOne({ where: { role_id, is_owner: true, status: 1 } })
        return user ? 
            { success: true, user } : 
            { success: false, message: 'User not found!' }
    }
    catch (error) {
        console.log('Exception occured inside getUserByRoleId!\n', error)
        return { success: false, message: 'Exception:::: User not found!' }
    }
}

async function getUsersByRoleId(role_id) {
    try {
        const users = await Users.findAll({ where: { role_id, is_owner: true, status: 1 } })
    
        return (!users || !users.length) ? 
            { success: false, message: 'Users not found' } :
            { success: true, users }
    }
    catch (error) {
        console.log('Exception occurred inside getUsersByRoleId!\n', error)
        return { success: false, message: 'Exception:::: Users not found!' }
    }
}

async function getUserById(id) {
    try {
        const user = await Users.findOne({ where: { id, is_owner: true, status: 1 } })
        return user ? { success: true, user } : { success: false, message: 'User not found' }
    }
    catch (error) {
        console.log('Exception occurred inside getUserById!\n', error)
        return { success: false, message: 'Exception:::: User not found!' }
    }
}

async function isAdminExistsForCommittee(organizing_committee_id) {
    try {
        const user = await Users.findOne({ where: { organizing_committee_id, role_id: 1 } })
        return user ? { success: true, message: 'Admin is already there for this organization!' } : { success: false, message: 'User not found!' }
    }
    catch (error) {
        console.log('Exception occurred inside isAdminExistsForCommittee!\n', error)
        return { success: false, message: 'Exception:::: User not found!' }
    }
}

async function deleteUserById(id) {
    try {
        const user = await Users.destroy({ where: { id } })
        
        return user ? 
            { success: true, message: 'User got deleted!' } : 
            { success: false, message: 'Unable to delete user!' }
    }
    catch (error) {
        console.log('Exception occurred inside deleteUserById!\n', error)
        return { success: false, message: 'Exception:::: Unable to delete user!' }
    }
}

async function updateUserById(id, updates) {
    if (updates.password) {
        if (updates.password.length < 8) {
            return { success: false, message: 'Password must be at least 8 characters long' }
        }

        updates.password = await bcrypt.hash(updates.password, 10)
    }

    try {
        const [status] = await Users.update(updates, { where: { id } })
    
        if (!status) {
            return { success: false, message: 'User not found or no changes made!' }
        }
    
        const updatedUser = await Users.findByPk(id)
        return { success: true, message: 'User got updated!',  updatedUser }
    }
    catch (error) {
        console.log('Exception occurred inside updateUserById!\n', error)
        return { success: false, message: 'Exception::: User not found or no changes made!' }
    }
}

async function updateAllUsersStatus() {
    try {
        const users = await Users.findAll({ where: { role_id: 2, status: 1 } })
        if (!users || !users.length) return { success: false, message: '\nNo active users found!' }

        const today = dayjs()

        for (const user of users) {
            const verifiedDate = dayjs(user.email_verified_at)
            const isOlderUser = today.diff(verifiedDate, 'day') >= 5
            // const isOlderUser = today.diff(verifiedDate, 'minute') >= 1

            if (isOlderUser) {
                await user.update({ status: 0 })
            }
        }

        return { success: true, message: '\nUsers status updated!' }
    }
    catch (error) {
        console.log('Exception occurred inside updateAllUsersStatus!\n', error)
        return { success: false, message: 'Exception::: Users not found or no changes made!' }
    }
}


export {
    createUser,
    deleteUserById,
    updateUserById,
    updateAllUsersStatus,
    getUser,
    getUsers,
    getActiveUsers,
    getOnlyUsers,

    getUserByRoleId,
    getUsersByRoleId,

    getUserById,

    isAdminExistsForCommittee,
}