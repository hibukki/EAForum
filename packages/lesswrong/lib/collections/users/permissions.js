import Users from 'meteor/vulcan:users'
import { getSetting } from 'meteor/vulcan:core';

const sunshineRegimentActions = [
  'users.edit.all',
  'users.view.deleted'
];
Users.groups.sunshineRegiment.can(sunshineRegimentActions);

Users.checkAccess = (user, document) => {
  if (document && document.deleted) return Users.canDo(user, 'users.view.deleted')
  return true
};

Users.ownsAndInGroup = (group) => {
  return (user, document) => {
    return Users.owns(user, document) && Users.isMemberOf(user, group)
  }
}

Users.ownsAndHasSetting = setting => {
  return (user, document) => {
    return Users.owns(user, document) && user[setting]
  }
}

Users.isSharedOn = (currentUser, document) => {
  return (currentUser && document.shareWithUsers && document.shareWithUsers.includes(currentUser._id))
}

Users.canCollaborate = (currentUser, document) => {
  return Users.isSharedOn(currentUser, document)
}

Users.canEditUsersBannedUserIds = (currentUser, targetUser) => {
  if (Users.canDo(currentUser,"posts.moderate.all")) {
    return true
  }
  if (!currentUser || !targetUser) {
    return false
  }
  return !!(
    Users.canDo(currentUser,"posts.moderate.own") &&
    targetUser.moderationStyle
  )
}

const postHasModerationGuidelines = post => {
  // Because of a bug in Vulcan that doesn't adequately deal with nested fields
  // in document validation, we check for originalContents instead of html here,
  // which causes some problems with empty strings, but should overall be fine
  return post.moderationGuidelines?.originalContents || post.moderationStyle
}

const isPersonalBlogpost = post => {
  if (getSetting('forumType') === 'EAForum') {
    return !(post.frontpageDate || post.meta)
  }
  return !post.frontpageDate
}

Users.canModeratePost = (user, post) => {
  if (Users.canDo(user,"posts.moderate.all")) {
    return true
  }
  if (!user || !post) {
    return false
  }
  // Users who can moderate their personal posts can moderate any post that
  // meets all of the following:
  //  1) they own
  //  2) has moderation guidelins
  //  3) is not on the frontpage
  if (
    Users.canDo(user, "posts.moderate.own.personal") &&
    Users.owns(user, post) &&
    postHasModerationGuidelines(post) &&
    isPersonalBlogpost(post)
  ) {
    return true
  }
  // Users who can moderate all of their own posts (even those on the frontpage)
  // can moderate any post that meets all of the following:
  //  1) they own
  //  2) has moderation guidelines
  // We have now checked all the possible conditions for posting, if they fail
  // this, check they cannot moderate this post
  return !!(
    Users.canDo(user,"posts.moderate.own") &&
    Users.owns(user, post) &&
    postHasModerationGuidelines(post)
  )
}

Users.canCommentLock = (user, post) => {
  if (Users.canDo(user,"posts.commentLock.all")) {
    return true
  }
  if (!user || !post) {
    return false
  }
  return !!(
    Users.canDo(user,"posts.commentLock.own") &&
    Users.owns(user, post)
  )
}

Users.userIsBannedFromPost = (user, post) => {
  if (!post) return false;
  const postAuthor = post.user || Users.findOne(post.userId)
  return !!(
    post.bannedUserIds &&
    post.bannedUserIds.includes(user._id) &&
    Users.owns(postAuthor, post)
  )
}

Users.userIsBannedFromAllPosts = (user, post) => {
  const postAuthor = post.user || Users.findOne(post.userId)
  return !!(
    postAuthor &&
    postAuthor.bannedUserIds &&
    postAuthor.bannedUserIds.includes(user._id) &&
    Users.canDo(postAuthor, 'posts.moderate.own') &&
    Users.owns(postAuthor, post)
  )
}

Users.userIsBannedFromAllPersonalPosts = (user, post) => {
  const postAuthor = post.user || Users.findOne(post.userId)
  return !!(
    postAuthor &&
    postAuthor.bannedPersonalUserIds &&
    postAuthor.bannedPersonalUserIds.includes(user._id) &&
    Users.canDo(postAuthor, 'posts.moderate.own.personal') &&
    Users.owns(postAuthor, post)
  )
}

Users.isAllowedToComment = (user, post) => {
  if (!user) {
    return false
  }

  if (!post) {
    return true
  }

  if (Users.userIsBannedFromPost(user, post)) {
    return false
  }

  if (Users.userIsBannedFromAllPosts(user, post)) {
    return false
  }

  if (Users.userIsBannedFromAllPersonalPosts(user, post) && !post.frontpageDate) {
    return false
  }

  if (post.commentsLocked) {
    return false
  }

  if (getSetting('forumType') === 'AlignmentForum') {
    if (!Users.canDo(user, 'comments.alignment.new')) {
      return Users.owns(user, post) && Users.canDo(user, 'votes.alignment')
    }
  }

  return true
}
