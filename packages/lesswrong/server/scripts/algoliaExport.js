/* global Vulcan */
/* eslint no-console: 'off' */

import { Posts, Comments } from 'meteor/example-forum'
import Users from 'meteor/vulcan:users'
import Sequences from '../../lib/collections/sequences/collection.js'
import algoliasearch from 'algoliasearch'
import { getSetting } from 'meteor/vulcan:core'

const gotTaskID = (algoliaIndex, totalErrors) => (error, content) => {
  if(error) {
    console.log('Algolia Error encountered, see errors at end')
    totalErrors.push(error)
  }
  console.log('write operation received: ', content)
  algoliaIndex.waitTask(content, () => {
    console.log(`object ${JSON.stringify(content)} indexed`)
  })
}

function algoliaExport(Collection, indexName, selector = {}, updateFunction) {
  console.log(`Exporting ${indexName}...`)

  const algoliaAppId = getSetting('algolia.appId')
  const algoliaAdminKey = getSetting('algolia.adminKey')
  let client = algoliasearch(algoliaAppId, algoliaAdminKey)
  let algoliaIndex = client.initIndex(indexName)
  console.log('Initiated Index connection', algoliaIndex)

  let importCount = 0
  let importBatch = []
  let batchContainer = []
  let totalErrors = []
  Collection.find(selector).fetch().forEach((item) => {
    if (updateFunction) updateFunction(item)
    batchContainer = Collection.toAlgolia(item)
    importBatch = [...importBatch, ...batchContainer]
    importCount++

    // Batch insert every 100
    if (importCount % 100 === 0) {
      console.log('Importing documents', importBatch.length)
      algoliaIndex.addObjects(
        _.map(importBatch, _.clone),
        gotTaskID(algoliaIndex, totalErrors)
      )
      importBatch = []
    }
  })

  // Batch any remaining
  console.log(`Exporting last ${importCount} documents `)
  algoliaIndex.addObjects(
    _.map(importBatch, _.clone),
    gotTaskID(algoliaIndex, totalErrors)
  )

  if (totalErrors.length) {
    console.log('Encountered the following errors: ', totalErrors)
  } else {
    console.log('Success!')
  }
}

Vulcan.runAlgoliaExport = () => {
  algoliaExport(Posts, 'test_posts', {baseScore: {$gt: 0}})
  algoliaExport(Comments, 'test_comments', {baseScore: {$gt: 0}})
  algoliaExport(Users, 'test_users')
  algoliaExport(Sequences, 'test_sequences')
}
