import { registerMigration, forEachDocumentBatchInCollection } from './migrationUtils'
import { defaultFilterSettings, FilterTag } from '../../lib/filterSettings'
import Users from '../../lib/collections/users/collection'
import Tags from '../../lib/collections/tags/collection'

// TODO; Doc
// Previously, the personalBlog weight was being hackily used to refer
// to the community section on the EA Forum
// Also reset personalBlog filtering back to 'Default'
// TODO; might be useful reference code for lw
registerMigration({
  name: "metaToCommunityUserSettings",
  dateWritten: "2020-05-04",
  idempotent: true,
  action: async () => {
    const communityTagId = await Tags.find({slug: 'community'}).fetch()[0]._id

    await forEachDocumentBatchInCollection({
      collection: Users,
      batchSize: 100,
      filter: {slug: {$in: ['a-a']}}, // TODO;
      callback: async (users: Array<DbUser>) => {
        // eslint-disable-next-line no-console
        console.log("Migrating user batch")
        
        const changes = users.flatMap(user => {
          // If a user already has a filter for the community tag, they've
          // already been migrated. Don't migrate them again or you'll overwrite
          // that setting with the personalBlogpost setting that now might
          // actually be about personal blogposts
          if (user.frontpageFilterSettings?.tags?.some((setting: FilterTag) => setting.tagId === communityTagId))
          {
            return []
          }
          console.log('user.frontpageFilterSettings', user.frontpageFilterSettings)
          const communityWeight = user.frontpageFilterSettings.personalBlog
          console.log("communityWeight", communityWeight)

          return [
            {
              updateOne: {
                filter: { _id: user._id },
                update: {$push: {'frontpageFilterSettings.tags': {
                  tagId: communityTagId,
                  tagName: "Community",
                  filterMode: communityWeight,
                }}}
              }
            }, {
              updateOne: {
                filter: { _id: user._id },
                update: {$set: {
                  'frontpageFilterSettings.personalBlog': defaultFilterSettings.personalBlog
                }}
              }
            }
          ] as MongoModifier<DbUser>
        })
        
        console.log('changes', JSON.stringify(changes))
        if (changes.length) await Users.rawCollection().bulkWrite(changes, { ordered: false })
      }
    })
  }
})
