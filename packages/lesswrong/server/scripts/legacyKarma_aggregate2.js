/* global Vulcan */
import Users from 'meteor/vulcan:users';

Vulcan.fixLegacyKarma = async () => {
  console.log('enter fixlegacy karma')
  const response = Users.rawCollection().aggregate(
    [
        {
            "$addFields" : {
                "legacyKarma" : {
                    "$add" : [
                        {
                            "$multiply" : [
                                10.0,
                                {
                                    "$subtract" : [
                                        {
                                            "$multiply" : [
                                                1.0,
                                                "$legacyData.karma_ups_link_main"
                                            ]
                                        },
                                        {
                                            "$multiply" : [
                                                1.0,
                                                "$legacyData.karma_downs_link_main"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                        {
                            "$multiply" : [
                                1.0,
                                {
                                    "$subtract" : [
                                        {
                                            "$multiply" : [
                                                1.0,
                                                "$legacyData.karma_ups_comment_main"
                                            ]
                                        },
                                        {
                                            "$multiply" : [
                                                1.0,
                                                "$legacyData.karma_downs_comment_main"
                                            ]
                                        }
                                    ]
                                }
                            ]
                        },
                    ]
                }
            }
        },
        {
          "$out": "users"
        }
    ],
    (err, cursor) => {
      console.log('in callback')
      if (err) {
        console.error(err)
      }
      console.log('cursor', cursor)
      console.log('exiting')
    }
  )
  //eslint-disable-next-line no-console
  console.log("Updated legacyKarma: ", response)
  // const whatever = await Users.rawCollection().find({username: 'Jacob_Peacock'})
  // console.log('whatever jacob', whatever)
  console.log('exit')
}

// i quit
// db.users.aggregate([{"$addFields":{"legacyKarma":{"$add":[{"$multiply":[10.0,{"$subtract":[{"$multiply":[1.0,"$legacyData.karma_ups_link_main"]},{"$multiply":[1.0,"$legacyData.karma_downs_link_main"]}]}]},{"$multiply":[1.0,{"$subtract":[{"$multiply":[1.0,"$legacyData.karma_ups_comment_main"]},{"$multiply":[1.0,"$legacyData.karma_downs_comment_main"]}]}]},]}}},{"$out":"users"}])
