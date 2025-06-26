import { Op } from 'sequelize'
import { Events, Posts } from '../models/index.js'
import { getImagesByPostId } from './imagesController.js'
import { getStatus } from '../services/status.js'

async function createPost({ title, description, venue, time, date, location, duration, organizer, status, price, event_id }) {
    try {
        const post = await Posts.create({ title, description, venue, time, date, location, duration, organizer, status, price, event_id })

        return { success: true, message: 'Post created!', post }
    }
    catch(error) {
        console.error('Exception occurred inside createPost!\n', error)
        return { success: false, message: 'Exception:: Unable to create post!'}
    }
}

async function deletePostByEventId(event_id) {
    try {
        const post = await Posts.destroy({ where: { event_id }})
    
        if(!post) {
            return { success: false, message: 'Unable to delete post or post not found!' }
        }
    
        return { success: true, message: 'Post deleted successfully' }

    }
    catch(error) {
        console.error('Exception occurred inside deletePostByEventId!\n', error)
        return { success: false, message: 'Exception::: Unable to delete post or post not found!' }
    }
}

async function deletePostById(id) {
    try {
        const post = await Posts.destroy({ where: { id }})
    
        if(!post) {
            return {success: false, message: 'Unable to delete post or post not found!' }
        }
    
        return { success: true, message: 'Post deleted successfully' }

    }
    catch(error) {
        console.error('Exception occurred inside deletePostById!\n', error)
        return { success: false, message: 'Exception::: Unable to delete post or post not found!' }
    }
}

async function updatePostByEventId(event_id, updates) {
    try {
        const [status] = await Posts.update(updates, { where: { event_id } })

        if (!status) {
            return { success: false, message: 'Post not found or nothing to update!' }
        }

        const updatedPost = await getPostsByEventId(event_id)
        return { success: true, message: 'Post updated successfully!', updatedPost }

    } 
    catch (error) {
        console.error('Exception occurred inside updatePostByEventId!\n', error)
        return { success: false, message: 'Exception::: Post not found or nothing to update!' }
    }
}

async function updatePostById(id, updates) {
    try {
        const [status] = await Posts.update(updates, { where: { id } })

        if (!status) {
            return { success: false, message: 'Post not found or nothing to update!' }
        }

        const updatedPost = await Posts.findByPk(id)
        return { success: true, message: 'Post updated successfully!', updatedPost }

    } 
    catch (error) {
       console.error('Exception occurred inside updatePostById!\n', error)
       return { success: false, message: 'Exception::: Post not found or nothing to update!'}
    }
}

async function updateAllPostsStatus() {
  try {
    const posts = await Posts.findAll({ where: { status: { [Op.in]: ['upcoming', 'ongoing'] } } })
    if (!posts.length) return { success: false, message: '\nNo posts found to update post status!' }

    for (const post of posts) {
      const { id, date, time, status: currentStatus } = post
      const calculatedStatus = getStatus(date, time)

      if (calculatedStatus !== currentStatus) {
        await Posts.update({ status: calculatedStatus }, { where: { id } })
      }
    }

    return { success: true, message: '\nPost status updated!' }
  } 
  catch (error) {
    console.error('\n:::: Exception while updating the posts! ::::\n', error)
    return { success: false, message: '\nNo posts found to update post status!' }
  }
}

async function getPostByEventId(event_id) {
    try {
        const post = await Posts.findOne({ where: { event_id } })
        return post ? { success: true, post } : { success: false, message: 'Post not found!' }
    }
    catch(error) {
        console.error('Exception occurred inside getPostsByEventId!\n', error)
        return { success: false, message: 'Exception:::: Post not found!' }
    }
}

async function getPostById(id) {
    try {
        const post = await Posts.findByPk(id)
        return post ? { success: true, post } : { success: false, message: 'Post not found!' }
    } 
    catch (error) {
        console.error('Exception occurred inside getPostById!\n', error)
        return { success: false, message: 'Exception:::: Post not found!' }
    }
}

async function getPostsByEventId(event_id, pageNo = 1, pageSize = 100) {
    try {
        const { count, rows: posts } = await Posts.findAndCountAll({
            where: { event_id },
            limit: pageSize,
            offset: (pageNo - 1) * pageSize
        })
        return count ? 
            { success: true, posts, totalRecords: count } : 
            { success: false, message: 'No posts found!' }
    }
    catch(error) {
        console.error('Exception occurred inside getPostsByEventId!\n', error)
        return { success: false, message: 'Exception:::: No posts found!'}
    }
}

async function getAllUpcomingPosts(pageNo = 1, pageSize = 50) {
  try {
    const { count, rows: posts } = await Posts.findAndCountAll({
      where: { status: 'upcoming' },
      include: [Events],
      limit: pageSize,
      offset: (pageNo - 1) * pageSize
    })

    const postsWithImages = await Promise.all(posts.map(async post => {
      const { images = [] } = await getImagesByPostId(post.id)
      return {
        ...post.get({ plain: true }),
        images: images.map(img => img.get({ plain: true }))
      }
    }))

    const totalPages = Math.ceil(count / pageSize)
    return { success: true, posts: postsWithImages, totalPages }
  } 
  catch (error) {
    console.error('Error fetching upcoming posts!\n', error)
    return { success: false, posts: [], totalPages: 0 }
  }
}

async function getPostByOrganizerName(organizer) {
    try {
        const post = await Posts.findOne({ where: { organizer } })
        return post ? 
            { success: true, post } : 
            { success: false, message: 'Post not found!' }
    }
    catch(error) {
        console.error('Exception occurred inside getPostByOrganizerName!\n', error)
        return { success: false, message: 'Exception:::: Post not found!' }
    }
}

async function getPostsByOrganizerName(organizer) {
    try {
        // gonna help in pagination later
        const { count, rows } = await Posts.findAndCountAll({ where: { organizer } })
        return count ? 
            { success: true, posts: rows } : 
            { success: false, message: 'Posts not found!' }

    }
    catch(error) {
        console.error('Exception occurred inside getPostsByOrganizerName\n!', error)
        return { success: false, message: 'Exception:::: Posts not found!' }
    }
}

async function getPostByStatus(status) {
    try {
        const post = await Posts.findOne({ where: { status } })
        return post ? { success: true, post } : { success: false, message: 'Post not found!' }
    }
    catch(error) {
        console.error('Exception occurred inside getPostByStatus!\n', error)
        return { success: false, message: 'Exception:::: Post not found!'}
    }
}

async function getPostsByStatus(status) {
    try {
        const posts = await Posts.findAll({ where: { status } })
        return posts.length ? { success: true, posts } : { success: false, message: 'Posts not found!' }
    }
    catch(error) {
        console.error('Exception occurred inside getPostsByStatus!\n', error)
        return { success: false, message: 'Exception::: Posts not found!' }
    }
}

async function getAllPosts(pageNo = 1, pageSize = 50) {
    try {
        const {count, rows: posts} = await Posts.findAndCountAll({
            limit: pageSize,
            offset: (pageNo - 1) * pageSize
        })
        
        return posts.length ? 
            { success: true, posts, totalRecords: count } : 
            { success: false, message: 'Event Posts not found!' }
    }
    catch(error) {
        console.error('Exception occurred inside getAllPosts!\n', error)
        return { success: false, message: 'Exception::: Event Posts not found!' }
    }
}

async function getAllPostsExceptThisId(postId, pageNo = 1, pageSize = 100) {
    try {
        const { count, rows: posts } = await Posts.findAndCountAll({
            where: {
                id: { [Op.ne]: postId }
            },
            limit: pageSize,
            offset: (pageNo - 1) * pageSize,
        })

        if (!posts || !posts.length) {
            return { success: false, message: 'Events not found!' }
        }

        return { success: true, posts, totalRecords: count }
    } 
    catch (error) {
        console.error('Exception occurred inside getAllPostsExceptThisId!\n', error)
        return { success: false, message: 'Exception::: Posts not found!' }
    }
}

// enhanced function for testing purpose
async function findOnePostByField(field, value) {
    try {
        const post = await Posts.findOne({ where: { [field]: value } })
        return post ? { success: true, post } : { success: false, message: 'Post not found!' }
    } 
    catch (error) {
        console.error(`Exception occurred inside getPostBy${capitalize(field)}!\n`, error)
        return { success: false, message: 'Exception::: Post not found!' }
    }
}

export {
    createPost,

    deletePostByEventId,
    deletePostById,

    updatePostByEventId,
    updatePostById,
    updateAllPostsStatus,

    getPostByEventId,
    getPostsByEventId,
    getAllUpcomingPosts,

    getPostByOrganizerName,
    getPostsByOrganizerName,

    getPostByStatus,
    getPostsByStatus,

    getPostById,
    getAllPosts,
    getAllPostsExceptThisId,
    
    findOnePostByField,
}