import { registerMigration, forEachDocumentBatchInCollection, migrateDocuments } from './migrationUtils'
import { defaultFilterSettings, FilterTag } from '../../lib/filterSettings'
import Users from '../../lib/collections/users/collection'
import Tags from '../../lib/collections/tags/collection'
import Posts from '../../lib/collections/posts/collection';
import TagRels from '../../lib/collections/tagRels/collection';
import * as _ from 'underscore';
import moment from 'moment';
import { updatePostDenormalizedTags } from '../tagging/tagCallbacks';

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
    console.log('communityTagId', communityTagId)

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

registerMigration({
  name: 'metaToCommunityPosts',
  dateWritten: '2020-08-12',
  idempotent: true,
  action: async () => {
    const communityTagId = Tags.find({slug: 'community'}).fetch()[0]._id

    await forEachDocumentBatchInCollection({
      collection: Posts,
      batchSize: 100,
      // TODO;
      filter: {meta: true, slug: {$in: [
        'saturday-morning-breakfast-cereal-rebel', 'saturday-morning-breakfast-cereal-why'
      ]}},
      callback: async (posts: Array<DbPost>) => {
        // eslint-disable-next-line no-console
        console.log("Migrating post batch");
        const tagRelInserts = posts.map(post => {
          return {
            insertOne: {
              "tagId" : communityTagId,
              "postId" : post._id,
              "userId" : post.reviewedByUserId,
              "baseScore" : 2,
              "score" : 2,
              "afBaseScore" : 2,
              "voteCount" : 1,
              "deleted" : false,
              "schemaVersion" : 1,
              "inactive" : false,
              "createdAt" : moment().toDate(),
            }
          }
        })
        console.log('tagRelInserts', tagRelInserts)
        if (tagRelInserts.length) {
          const result = await TagRels.rawCollection().bulkWrite(tagRelInserts, { ordered: false });
          console.log('result', result)
        }
        
        for (let post of posts){
          // TODO; this is a database call for every meta post T_T
          await updatePostDenormalizedTags(post._id)
        }
      }
    });
    
    await replaceObjectIdsWithStrings(TagRels)
  }
});

async function replaceObjectIdsWithStrings<T extends DbObject> (collection: CollectionBase<T>) {
  await migrateDocuments({
    description: `Replace object ids with strings in ${collection.collectionName}`,
    collection,
    batchSize: 1000,
    unmigratedDocumentQuery: {
      _id: {$type: "objectId"}
    },
    migrate: async (documents: Array<T>) => {
      const updates = documents.map(doc => {
        return {
          updateOne: {
            filter: {_id: doc._id.valueOf()},
            update: {
              ...doc,
              _id: doc._id.valueOf(),
            },
            upsert: true
          }
        }
      })
      await collection.rawCollection().bulkWrite(
        updates,
        { ordered: false }
      )
      const _ids = _.pluck(documents, '_id')
      await collection.remove({_id: {$in: _ids}})
    }
  })
}
