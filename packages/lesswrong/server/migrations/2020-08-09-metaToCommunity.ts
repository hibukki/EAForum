import { registerMigration, forEachDocumentBatchInCollection, migrateDocuments } from './migrationUtils'
import { defaultFilterSettings, FilterTag } from '../../lib/filterSettings'
import Users from '../../lib/collections/users/collection'
import Tags from '../../lib/collections/tags/collection'
import Posts from '../../lib/collections/posts/collection';
import TagRels from '../../lib/collections/tagRels/collection';
import { newMutation } from '../vulcan-lib';

// TODO; Doc
// Previously, the personalBlog weight was being hackily used to refer
// to the community section on the EA Forum
// Also reset personalBlog filtering back to 'Default'
// TODO; might be useful reference code for lw
registerMigration({
  name: 'metaToCommunityUserSettings',
  dateWritten: '2020-08-11',
  idempotent: true,
  action: async () => {
    const communityTagId = Tags.find({slug: 'community'}).fetch()[0]._id

    await forEachDocumentBatchInCollection({
      collection: Users,
      batchSize: 100,
      filter: {slug: {$in: ['a-a']}}, // TODO;
      callback: async (users: Array<DbUser>) => {
        // eslint-disable-next-line no-console
        console.log("Migrating user batch")
        
        const changes: Array<MongoModifier<DbUser>> = users.flatMap(user => {
          // If a user already has a filter for the community tag, they've
          // already been migrated. Don't migrate them again or you'll overwrite
          // that setting with the personalBlogpost setting that now might
          // actually be about personal blogposts
          if (user.frontpageFilterSettings?.tags?.some((setting: FilterTag) => setting.tagId === communityTagId))
          {
            return []
          }
          const communityWeight = user.frontpageFilterSettings.personalBlog

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
        
        if (changes.length) await Users.rawCollection().bulkWrite(changes, { ordered: false })
      }
    })
  }
})

registerMigration({
  name: 'metaToCommunityPosts',
  dateWritten: '2020-08-12',
  idempotent: true,
  action: async () => {
    const communityTagId = Tags.find({slug: 'community'}).fetch()[0]._id

    await forEachDocumentBatchInCollection({
      collection: Posts,
      batchSize: 100,
      filter: {meta: true},
      callback: async (posts: Array<DbPost>) => {
        // eslint-disable-next-line no-console
        console.log("Migrating post batch");
        
        for (let post of posts) {
          // Oh man, I refactored this migration to use this method, and it
          // changed my life. 10/10 would use again in future migrations.
          // bulkwrite is faster, but callbacks are often important
          await newMutation({
            collection: TagRels,
            document: {
              tagId: communityTagId,
              postId: post._id,
              userId: post.reviewedByUserId,
              baseScore: 2,
            },
            // Validation requires us to have a context object, which has
            // things like currentUser that aren't applicable.
            validate: false,
          })
        }
      }
    })
  }
})

registerMigration({
  name: 'moveMetaToFrontpage',
  dateWritten: '2020-08-14',
  idempotent: true,
  action: async () => {
    await forEachDocumentBatchInCollection({
      collection: Posts,
      batchSize: 100,
      filter: {meta: true},
      callback: async (posts: Array<DbPost>) => {
        // eslint-disable-next-line no-console
        console.log("Migrating post batch");
        const changes = posts.map(post => ({
          updateOne: {
            filter: {_id : post._id},
            update: {$set: {
              meta: false,
              frontpageDate: post.createdAt
            }}
          }
        }))
        if (changes.length) {
          const result = await Posts.rawCollection().bulkWrite(changes, { ordered: false });
          // eslint-disable-next-line no-console
          console.log(`updated ${result.result.nModified} posts`)
        }
      }
    })
  }
})
