import Users from './Users.js'
import Role from './Role.js'
import Events from './Events.js'
import Category from './Category.js'
import OrganizingCommittee from './OrganizingCommittee.js'
import Posts from './Posts.js'
import Images from './Images.js'
import Activities from './Activities.js'
import Views from './Views.js'
import Booking from './Booking.js'

// defining relationships
Category.hasMany(Events, { foreignKey: "category_id" })
Events.belongsTo(Category, { foreignKey: "category_id" })

Events.hasMany(Posts, { foreignKey: "event_id" })
Posts.belongsTo(Events, { foreignKey: "event_id" })

Events.belongsTo(OrganizingCommittee, { foreignKey: "organizing_committee_id" })
OrganizingCommittee.hasMany(Events, { foreignKey: "organizing_committee_id" })

Events.belongsTo(Role, { foreignKey: "role_id" })

Users.belongsTo(OrganizingCommittee, { foreignKey: "organizing_committee_id" })
OrganizingCommittee.hasMany(Users, { foreignKey: "organizing_committee_id" })

Users.hasMany(Role, { foreignKey: "users_id" })
Users.hasMany(Role, { foreignKey: "users_organizing_committee_id" })

Users.hasMany(Activities, { foreignKey: 'user_id' })
Activities.belongsTo(Users, { foreignKey: 'user_id' })

Posts.hasMany(Views, { foreignKey: 'post_id', as: 'views', onDelete: 'CASCADE' })
Views.belongsTo(Posts, { foreignKey: 'post_id', as: 'post' })

export {
  Users,
  Role,
  Events,
  Category,
  OrganizingCommittee,
  Posts,
  Images,
  Activities,
  Views,
  Booking,
}
