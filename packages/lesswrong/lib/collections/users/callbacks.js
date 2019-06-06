import Users from "meteor/vulcan:users";
import { addCallback, runCallbacksAsync, getSetting } from 'meteor/vulcan:core';
import { Posts } from '../posts'
import { Comments } from '../comments'
import request from 'request';
import moment from 'moment'

const MODERATE_OWN_PERSONAL_THRESHOLD = 50
const TRUSTLEVEL1_THRESHOLD = 2000
import { addEditableCallbacks } from '../../../server/editor/make_editable_callbacks.js'
import { makeEditableOptionsModeration } from './custom_fields.js'

function updateTrustedStatus ({newDocument, vote}) {

  const user = Users.findOne(newDocument.userId)
  if (user.karma >= TRUSTLEVEL1_THRESHOLD && (!Users.getGroups(user).includes('trustLevel1'))) {
    Users.update(user._id, {$push: {groups: 'trustLevel1'}});
    const updatedUser = Users.findOne(newDocument.userId)
    //eslint-disable-next-line no-console
    console.info("User gained trusted status", updatedUser.username, updatedUser._id, updatedUser.karma, updatedUser.groups)
  }
}
addCallback("votes.smallUpvote.async", updateTrustedStatus);
addCallback("votes.bigUpvote.async", updateTrustedStatus);

function updateModerateOwnPersonal({newDocument, vote}) {
  const user = Users.findOne(newDocument.userId)
  if (user.karma >= MODERATE_OWN_PERSONAL_THRESHOLD && (!Users.getGroups(user).includes('canModeratePersonal'))) {
    Users.update(user._id, {$push: {groups: 'canModeratePersonal'}});
    const updatedUser = Users.findOne(newDocument.userId)
    //eslint-disable-next-line no-console
    console.info("User gained trusted status", updatedUser.username, updatedUser._id, updatedUser.karma, updatedUser.groups)
  }
}
addCallback("votes.smallUpvote.async", updateModerateOwnPersonal);
addCallback("votes.bigUpvote.async", updateModerateOwnPersonal);

function maybeSendVerificationEmail (modifier, user)
{
  if(modifier.$set.whenConfirmationEmailSent
      && (!user.whenConfirmationEmailSent
          || user.whenConfirmationEmailSent.getTime() !== modifier.$set.whenConfirmationEmailSent.getTime()))
  {
    Accounts.sendVerificationEmail(user._id);
  }
}
addCallback("users.edit.sync", maybeSendVerificationEmail);

addEditableCallbacks({collection: Users, options: makeEditableOptionsModeration})

function approveUnreviewedSubmissions (newUser, oldUser)
{
  if(newUser.reviewedByUserId && !oldUser.reviewedByUserId)
  {
    Posts.update({userId:newUser._id, authorIsUnreviewed:true}, {$set:{authorIsUnreviewed:false, postedAt: new Date()}})
    Comments.update({userId:newUser._id, authorIsUnreviewed:true}, {$set:{authorIsUnreviewed:false, postedAt: new Date()}})
  }
}
addCallback("users.edit.async", approveUnreviewedSubmissions);

// When the very first user account is being created, add them to Sunshine
// Regiment. Patterned after a similar callback in
// vulcan-users/lib/server/callbacks.js which makes the first user an admin.
function makeFirstUserAdminAndApproved (user) {
  const realUsersCount = Users.find({'isDummy': {$in: [false,null]}}).count();
  if (realUsersCount === 0) {
    user.reviewedByUserId = "firstAccount"; //HACK
    
    // Add the first user to the Sunshine Regiment
    if (!user.groups) user.groups = [];
    user.groups.push("sunshineRegiment");
  }
  return user;
}
addCallback('users.new.sync', makeFirstUserAdminAndApproved);

function clearKarmaChangeBatchOnSettingsChange (modifier, user)
{
  if (modifier.$set && modifier.$set.karmaChangeNotifierSettings) {
    if (!user.karmaChangeNotifierSettings.updateFrequency
      || modifier.$set.karmaChangeNotifierSettings.updateFrequency !== user.karmaChangeNotifierSettings.updateFrequency) {
      modifier.$set.karmaChangeLastOpened = null;
      modifier.$set.karmaChangeBatchStart = null;
    }
  }
}
addCallback("users.edit.sync", clearKarmaChangeBatchOnSettingsChange);

const reCaptchaSecret = getSetting('reCaptcha.secret')
const getCaptchaRating = async (token) => {
  // Make an HTTP POST request to get reply text
  return new Promise((resolve, reject) => {
    request.post({url: 'https://www.google.com/recaptcha/api/siteverify',
        form: {
          secret: reCaptchaSecret,
          response: token
        }
      },
      function(err, httpResponse, body) {
        if (err) reject(err);
        return resolve(body);
      }
    );
  });
}
async function processReCaptcha (user) {
  if (!reCaptchaSecret) return
  let update = {}
  let banned = false
  const reCaptchaToken = user?.profile?.reCaptchaToken
  if (reCaptchaToken) {
    const reCaptchaResponse = await getCaptchaRating(reCaptchaToken)
    const reCaptchaData = JSON.parse(reCaptchaResponse)
    // TODO; temp mock ---
    reCaptchaData.success = true
    reCaptchaData.action = 'login/signup'
    reCaptchaData.score = .3
    // ---
    if (reCaptchaData.success && reCaptchaData.action == "login/signup") {
      update.signUpReCaptchaRating = reCaptchaData.score
      if (reCaptchaData.score < getSetting('reCaptchaMinPass') && getSetting('requireReCaptcha')) {
        banned = true
      }
    } else {
      // eslint-disable-next-line no-console
      console.log("reCaptcha check failed:", reCaptchaData)
    }
  } else if (getSetting('requireReCaptcha')) {
    banned = true
  }
  if (banned) {
    console.log('banhammer!')
    update.banned = moment().add(12, 'months').toDate()
    update.deleteContent = true
    runCallbacksAsync('users.ban.async', user);
    runCallbacksAsync('users.deleteContent.async', user);
  }
  // TODO; can we run this with await style?
  Users.update(user._id, {$set: update})
}
addCallback('users.new.async', processReCaptcha);

async function subscribeOnSignup (user) {
  // If the subscribed-to-curated checkbox was checked, set the corresponding config setting
  const subscribeToCurated = user.profile?.subscribeToCurated;
  if (subscribeToCurated) {
    Users.update(user._id, {$set: {emailSubscribedToCurated: true}});
  }
  
  // Regardless of the config setting, try to confirm the user's email address
  // (But not in unit-test contexts, where this function is unavailable and sending
  // emails doesn't make sense.)
  if (!Meteor.isTest && !Meteor.isAppTest && !Meteor.isPackageTest) {
    Accounts.sendVerificationEmail(user._id);
  }
}
addCallback('users.new.async', subscribeOnSignup);
