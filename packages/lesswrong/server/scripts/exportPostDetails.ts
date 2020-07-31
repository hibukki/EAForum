/*

    # Vulcan.exportPostDetails({ selector, outputDir })

      Script to export a list of post details to a CSV file.

      selector (Object, optional):
        Mongo selector to choose posts. Default is all published pending and approved posts
      outputDir (String, required):
        Absolute path to the directory where you'd like the CSV output to be written
      outputFile (String, optional):
        Filename for your CSV file. Defaults to 'post_details'

    # Vulcan.exportPostDetailsByMonth({ month, outputDir, outputFile })

      Export details for a whole month

      month: (String, optional)
        Month to export posts for in


*/

import moment from 'moment';
import fs from 'mz/fs';
import Papa from 'papaparse';
import path from 'path';
import { Posts } from '../../lib/collections/posts';
import { Comments } from '../../lib/collections/comments';
import Users from '../../lib/collections/users/collection';
import { siteUrlSetting } from '../../lib/instanceSettings';
import { Vulcan } from '../vulcan-lib';
import { wrapVulcanAsyncScript } from './utils';
import { makeLowKarmaSelector, LOW_KARMA_THRESHOLD } from '../migrations/2020-05-13-noIndexLowKarma';

function getPosts (selector) {
  const defaultSelector = {
    baseScore: {$gte: 0},
    draft: {$ne: true},
    status: { $in: [1, 2] },
    authorIsUnreviewed: false,
  }

  const fields = {
    id: 1,
    userId: 1,
    title: 1,
    slug: 1,
    baseScore: 1,
    meta: 1,
    frontpageDate: 1,
    postedAt: 1,
    createdAt: 1,
    isEvent: 1,
    isFuture: 1,
    draft: 1,
    status: 1,
  }

  const finalSelector = Object.assign({}, defaultSelector, selector || {})

  return Posts
    .find(finalSelector, {fields, sort: { createdAt: 1 }})
}

Vulcan.exportPostDetails = wrapVulcanAsyncScript(
  'exportPostDetails',
  async ({selector, outputDir, outputFile = 'post_details.csv'}) => {
    if (!outputDir) throw new Error('you must specify an output directory (hint: {outputDir})')
    const documents = getPosts(selector)
    let c = 0
    const count = documents.count()
    const rows: Array<any> = []
    for (let post of documents.fetch()) {
      // SD: this makes things horribly slow, but no idea how to do a more efficient join query in Mongo
      const user = Users.findOne(post.userId, { fields: { displayName: 1, email: 1 }})
      if (!user) throw Error(`Can't find user for post: ${post._id}`)
      const postUrl = siteUrlSetting.get()
      const row = {
        display_name: user.displayName,
        email: user.email,
        id: post._id,
        user_id: post.userId,
        title: post.title,
        slug: post.slug,
        karma: post.baseScore,
        community: !!post.meta,
        frontpage_date: post.frontpageDate,
        posted_at: post.postedAt,
        created_at: post.createdAt,
        url: `${postUrl}/posts/${post._id}/${post.slug}`
      }
      rows.push(row)
      c++
      //eslint-disable-next-line no-console
      if (c % 20 === 0) console.log(`Post Details: Processed ${c}/${count} posts (${Math.round(c / count * 100)}%)`)
    }
    const csvFile = Papa.unparse(rows)
    const filePath = path.join(outputDir,`${path.basename(outputFile)}.csv`)
    await fs.writeFile(filePath, csvFile)
    //eslint-disable-next-line no-console
    console.log(`Wrote details for ${rows.length} posts to ${filePath}`)
  }
)

Vulcan.exportLowKarma = (
  {outputFilepath, karma = LOW_KARMA_THRESHOLD}: {outputFilepath: string, karma?: number}
) => {
  Vulcan.exportPostDetails({
    selector: makeLowKarmaSelector(karma),
    outputFile: path.basename(outputFilepath),
    outputDir: path.dirname(outputFilepath)
  })
}

Vulcan.exportPostDetailsByMonth = ({month, outputDir, outputFile}) => {
  const lastMonth = moment.utc(month, 'YYYY-MM').startOf('month')
  outputFile = outputFile || `post_details_${lastMonth.format('YYYY-MM')}`
  //eslint-disable-next-line no-console
  console.log(`Exporting all posts from ${lastMonth.format('MMM YYYY')}`)
  return Vulcan.exportPostDetails({
    selector: {
      createdAt: {
        $gte: lastMonth.toDate(), // first of prev month
        $lte: moment.utc(lastMonth).endOf('month').toDate()
      }
    },
    outputFile,
    outputDir
  })
}

function getComments (selector) {
  const defaultSelector = {
    authorIsUnreviewed: false,
    deleted: {$ne: true},
  }

  const fields = {
    id: 1,
    userId: 1,
    postId: 1,
    postedAt: 1,
    createdAt: 1,
    baseScore: 1,
    deleted: 1,
    answer: 1,
    spam: 1,
    authorIsUnreviewed: 1,
  }

  const finalSelector = Object.assign({}, defaultSelector, selector || {})

  return Comments
    .find(finalSelector, {fields, sort: { createdAt: 1 }})
}

Vulcan.exportCommentDetails = wrapVulcanAsyncScript(
  'exportCommentDetails',
  async ({selector, outputDir, outputFile = 'comment_details.csv'}) => {
    if (!outputDir) throw new Error('you must specify an output directory (hint: {outputDir})')
    const documents = getComments(selector)
    let c = 0
    const count = documents.count()
    const rows: Array<any> = []
    for (let comment of documents.fetch()) {
      // SD: this makes things horribly slow, but no idea how to do a more efficient join query in Mongo
      const user = Users.findOne(comment.userId, { fields: { displayName: 1, email: 1 }})
      const post = Posts.findOne(comment.postId, { fields: { slug: 1, title: 1 }})
      if (!user) throw Error(`Can't find user for comment: ${comment._id}`)
      const baseUrl = siteUrlSetting.get()
      const row = {
        // display_name: user.displayName,
        email: user.email,
        // post_title: post?.title,
        // id: comment._id,
        // user_id: comment.userId,
        karma: comment.baseScore,
        posted_at: comment.postedAt,
        // created_at: comment.createdAt,
        // url: `${baseUrl}/posts/${comment.postId}/${post?.slug}?commentId=${comment?._id}`
      }
      rows.push(row)
      c++
      //eslint-disable-next-line no-console
      if (c % 20 === 0) console.log(`Comment Details: Processed ${c}/${count} comments (${Math.round(c / count * 100)}%)`)
    }
    const csvFile = Papa.unparse(rows)
    const filePath = path.join(outputDir,`${path.basename(outputFile)}.csv`)
    await fs.writeFile(filePath, csvFile)
    //eslint-disable-next-line no-console
    console.log(`Wrote details for ${rows.length} comments to ${filePath}`)
  }
)

Vulcan.exportCommentDetailsByMonth = ({month, outputDir, outputFile}) => {
  const lastMonth = moment.utc(month, 'YYYY-MM').startOf('month')
  outputFile = outputFile || `comment_details_${lastMonth.format('YYYY-MM')}`
  //eslint-disable-next-line no-console
  console.log(`Exporting all comments from ${lastMonth.format('MMM YYYY')}`)
  return Vulcan.exportCommentDetails({
    selector: {
      createdAt: {
        $gte: lastMonth.toDate(), // first of prev month
        $lte: moment.utc(lastMonth).endOf('month').toDate()
      }
    },
    outputFile,
    outputDir
  })
}

function anonymizeNumber (n: number): number {
  if (!n) return 0
  if (n <= 0) return 0
  if (n <= 10) return 10
  return parseFloat(n.toPrecision(1))
}

function getUsers (selector) {
  const defaultSelector = {
    email: {$exists: true},
    deleted: {$ne: true},
    reviewedByUserId: {$exists: true},
    createdAt: {$exists: true},
  }

  const fields = {
    id: 1,
    email: 1,
    createdAt: 1,
    karma: 1,
    commentCount: 1,
    postCount: 1,
  }

  const finalSelector = Object.assign({}, defaultSelector, selector || {})

  return Users
    .find(finalSelector, {fields, sort: { createdAt: 1 }})
}

Vulcan.exportUserDetails = wrapVulcanAsyncScript(
  'exportUserDetails',
  async ({selector, outputDir, outputFile = 'user_details'}) => {
    if (!outputDir) throw new Error('you must specify an output directory (hint: {outputDir})')
    const documents = getUsers(selector)
    let c = 0
    const count = documents.count()
    const rows: Array<any> = []
    for (let user of documents.fetch()) {
      if (!user.email || user.email.length === 0) continue
      const row = {
        email: user.email,
        join_month: moment(user.createdAt).startOf('month').format('YYYY-MM'),
        karma: anonymizeNumber(user.karma),
        writing_count: anonymizeNumber(user.commentCount || 0 + user.postCount || 0),
      }
      rows.push(row)
      c++
      //eslint-disable-next-line no-console
      if (c % 20 === 0) console.log(`User Details: Processed ${c}/${count} users (${Math.round(c / count * 100)}%)`)
    }
    const csvFile = Papa.unparse(rows)
    const filePath = path.join(outputDir,`${path.basename(outputFile)}.csv`)
    await fs.writeFile(filePath, csvFile)
    //eslint-disable-next-line no-console
    console.log(`Wrote details for ${rows.length} users to ${filePath}`)
  }
)

// Vulcan.exportUserDetailsByMonth = ({month, outputDir, outputFile}) => {
//   const lastMonth = moment.utc(month, 'YYYY-MM').startOf('month')
//   outputFile = outputFile || `user_details_${lastMonth.format('YYYY-MM')}`
//   //eslint-disable-next-line no-console
//   console.log(`Exporting all users from ${lastMonth.format('MMM YYYY')}`)
//   return Vulcan.exportUserDetails({
//     selector: {
//       createdAt: {
//         $gte: lastMonth.toDate(), // first of prev month
//         $lte: moment.utc(lastMonth).endOf('month').toDate()
//       }
//     },
//     outputFile,
//     outputDir
//   })
// }
