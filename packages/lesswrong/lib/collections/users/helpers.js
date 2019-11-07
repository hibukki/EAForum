import Users from "meteor/vulcan:users";
import bowser from 'bowser'
import { getSetting, Utils } from 'meteor/vulcan:core';

// Overwrite user display name getter from Vulcan
Users.getDisplayName = (user) => {
  if (!user) {
    return "";
  } else {
    return getSetting('forumType') === 'AlignmentForum' ? 
      (user.fullName || user.displayName) :
      (user.displayName || Users.getUserName(user))
  }
};

Users.blockedCommentingReason = (user, post) => {
  if (!user) {
    return "Can't recognize user"
  }

  if (Users.userIsBannedFromPost(user, post)) {
    return "This post's author has blocked you from commenting."
  }

  if (getSetting('forumType') === 'AlignmentForum') {
    if (!Users.canDo(user, 'comments.alignment.new')) {
      return "You must be approved by an admin to comment on the AI Alignment Forum"
    }
  }
  if (Users.userIsBannedFromAllPosts(user, post)) {
    return "This post's author has blocked you from commenting."
  }

  if (Users.userIsBannedFromAllPersonalPosts(user, post)) {
    return "This post's author has blocked you from commenting on any of their personal blog posts."
  }

  if (post.commentsLocked) {
    return "Comments on this post are disabled."
  }
  return "You cannot comment at this time"
}

// Return true if the user's account has at least one verified email address.
Users.emailAddressIsVerified = (user) => {
  if (!user || !user.emails)
    return false;
  for (let email of user.emails) {
    if (email && email.verified)
      return true;
  }
  return false;
};

// Replaces Users.getProfileUrl from the vulcan-users package.
Users.getProfileUrl = (user, isAbsolute=false) => {
  if (!user) return "";
  
  if (user.slug) {
    return Users.getProfileUrlFromSlug(user.slug, isAbsolute);
  } else {
    return "";
  }
}

Users.getProfileUrlFromSlug = (userSlug, isAbsolute=false) => {
  if (!userSlug) return "";
  
  const prefix = isAbsolute ? Utils.getSiteUrl().slice(0,-1) : '';
  return `${prefix}/users/${userSlug}`;
}



const clientRequiresMarkdown = () => {
  if (Meteor.isClient &&
      window &&
      window.navigator &&
      window.navigator.userAgent) {

      return (bowser.mobile || bowser.tablet)
  }
  return false
}

Users.useMarkdownCommentEditor = (user) => {
  if (clientRequiresMarkdown()) {
    return true
  }
  return user && user.markDownCommentEditor
}

Users.useMarkdownPostEditor = (user) => {
  if (clientRequiresMarkdown()) {
    return true
  }
  return user && user.markDownPostEditor
}

Users.canEdit = (currentUser, user) => {
  return Users.owns(currentUser, user) || Users.canDo(currentUser, 'users.edit.all')
}



// Return the current user's location, as a latitude-longitude pair, plus
// boolean fields `loading` and `known`. If `known` is false, the lat/lng are
// invalid placeholders. If `loading` is true, then `known` is false, but the
// state might be updated with a location later.
//
// If the user is logged in, the location specified in their account settings
// is used first. If the user is not logged in, then no location is available
// for server-side rendering, but we can try to get a location client-side
// using the browser geolocation API. (This won't necessarily work, since not
// all browsers and devices support it, and it requires user permission.)
Users.getLocation = (currentUser) => {
  const placeholderLat = 37.871853;
  const placeholderLng = -122.258423;

  const currentUserLat = currentUser && currentUser.mongoLocation && currentUser.mongoLocation.coordinates[1]
  const currentUserLng = currentUser && currentUser.mongoLocation && currentUser.mongoLocation.coordinates[0]
  if (currentUserLat && currentUserLng) {
    // First return a location from the user profile, if set
    return {lat: currentUserLat, lng: currentUserLng, loading: false, known: true}
  } else if (Meteor.isServer) {
    // If there's no location in the user profile, we may still be able to get
    // a location from the browser--but not in SSR.
    return {lat: placeholderLat, lng:placeholderLng, loading: true, known: false};
  } else {
    // If we're on the browser, try to get a location using the browser
    // geolocation API. This is not always available.
    if (typeof window !== 'undefined' && typeof navigator !== 'undefined'
        && navigator && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        if(position && position.coords) {
          const navigatorLat = position.coords.latitude
          const navigatorLng = position.coords.longitude
          return {lat: navigatorLat, lng: navigatorLng, loading: false, known: true}
        }
      });
    }

    return {lat: placeholderLat, lng:placeholderLng, loading: false, known: false};
  }
}

Users.getPostCount = (user) => {
  if (getSetting('forumType') === 'AlignmentForum') {
    return user.afPostCount;
  } else {
    return user.postCount;
  }
}

Users.getCommentCount = (user) => {
  if (getSetting('forumType') === 'AlignmentForum') {
    return user.afCommentCount;
  } else {
    return user.commentCount;
  }
}
