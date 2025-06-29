import { Activities } from '../models/index.js'

async function createActivity({ actions, actionsPerformedOn, user_id }) {
    try {
        const timestamp = actionsPerformedOn || new Date()
        const activity = await Activities.create({ actions, actionsPerformedOn: timestamp, user_id })

        return activity ? { success: true, activity } : { success: false, message: 'Unable to create activity!', activity }
    }
    catch(error) {
        console.error('Exception occurred in createActivity!\n', error)
        return { success: false, message: 'Exception::: Activity creation failed!' }
    }
}

async function updateActivity(id, updates) {
    try {
        const activity = await Activities.findByPk(id)
        if (!activity) {
            return { success: false, message: 'Activity not found!' }
        }

        const updatedActivity = await activity.update(updates, { where: {id} })
        return { success: true, message: 'Activity updated!', updatedActivity }

    } 
    catch (error) {
        console.error('Exception occurred in updateActivity!\n', error)
        return { success: false, message: 'Exception::: Activity update failed!' }
    }
}

async function deleteActivity(id) {
    try {
        const activity = await Activities.findByPk(id)

        if (!activity) {
            return { success: false, message: 'Activity not found!' }
        }

        await activity.destroy()
        return { success: true, message: 'Activity deleted successfully!' }
    } 
    catch (error) {
        console.error('Exception occurred in deleteActivity!\n', error)
        return { success: false, message: 'Exception::: Activity deletion failed!' }
    }
}

async function deleteActivityByUserId(user_id) {
    try {
        const activity = await Activities.destroy({ where: { user_id } })

        if (!activity) {
            return { success: false, message: 'Activity not found!' }
        }

        return { success: true, message: 'Activity deleted successfully!' }
    } 
    catch (error) {
        console.error('Exception occurred in deleteActivityByUserId!\n', error)
        return { success: false, message: 'Exception::: Activity deletion failed!' }
    }
}


async function getActivities(pageNo = 1, pageSize = 50) {
    try {
        const { count, rows: activities } = await Activities.findAndCountAll({
            limit: pageSize,
            offset: (pageNo - 1) * pageSize,
        })
    
        return activities.length ? 
            { success: true, activities, totalRecords: count } : 
            { success: false, message: 'Activities are not found!' }
    }
    catch(error) {
        console.log('Exception occured inside getActivities!\n', error)
        return { success: false, message: 'Exception::: Activities are not found!' }
    }
}

export {
    createActivity,
    updateActivity,
    deleteActivity,
    deleteActivityByUserId,
    getActivities,
}