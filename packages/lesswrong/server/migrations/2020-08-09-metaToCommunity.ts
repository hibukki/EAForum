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

// TODO; make sure there's nothing too funny about number of votes or similar
// TODO; If I'm giving up on performance, I could use newMutation and
// performVoteServer as in tagsGraphQL.ts
registerMigration({
  name: 'metaToCommunityPosts',
  dateWritten: '2020-08-12',
  idempotent: true,
  action: async () => {
    const communityTagId = Tags.find({slug: 'community'}).fetch()[0]._id

    await forEachDocumentBatchInCollection({
      collection: Posts,
      batchSize: 100,
      // TODO; filter for not already having the tag
      filter: {meta: true},
      callback: async (posts: Array<DbPost>) => {
        // eslint-disable-next-line no-console
        console.log("Migrating post batch");
        const tagRelInserts = posts.map(post => ({
          insertOne: {
            tagId : communityTagId,
            postId : post._id,
            userId : post.reviewedByUserId,
            baseScore : 2,
            score : 2,
            afBaseScore : 2,
            voteCount : 1,
            deleted : false,
            schemaVersion : 1,
            inactive : false,
            createdAt : moment().toDate(),
          }
        }))
        if (tagRelInserts.length) {
          const result = await TagRels.rawCollection().bulkWrite(tagRelInserts, { ordered: false });
          // eslint-disable-next-line no-console
          console.log(`updated ${result.result.nModified} posts`)
        }
        
        // TagRels exist, but the callbacks did not fire, which means posts have
        // not updated to store the tag relevance on their object
        for (let post of posts){
          // This is two database calls for every meta post. I believe that this
          // is only annoyingly and not excruciatingly slow. It seems like I'll
          // need to open up this function and write it with an interesting join
          // if I want to avoid it.
          await updatePostDenormalizedTags(post._id)
        }
        
        // TODO;? Community tag will still claim to have only a few tags.
        // Maybe just manually update it.
      }
    });
    
    // Because of the bulkWrite nature of our insert, we ended up with ObjectIDs
    // instead of strings for the IDs. Our code doesn't like those, so replace
    // them.
    await replaceObjectIdsWithStrings(TagRels)
  }
});

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
    });
  }
});

// Copy pasta from a migration that hasn't been used in a year
// See: `2019-02-04-replaceObjectIdsInEditableFields.ts`
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
