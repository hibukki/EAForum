import { Components, registerComponent } from 'meteor/vulcan:core';
import { getSetting } from 'meteor/vulcan:lib';
import React from 'react';
import { Link } from 'react-router';
import withUser from '../common/withUser';

const Home2 = ({ currentUser }) => {
  const { SingleColumnSection, SectionTitle, PostsList2, RecentDiscussionThreadsList, SubscribeWidget, HomeLatestPosts, TabNavigationMenu } = Components

  return (
    <React.Fragment>
      <Components.HeadTags image={getSetting('siteImage')} />
      <TabNavigationMenu />

      {/* TODO: better curated removal*/}

      <HomeLatestPosts />

      {/* TODO: event if statement */}

      <SingleColumnSection>
        <SectionTitle title="Recent Discussion" />
        <RecentDiscussionThreadsList terms={{view: 'recentDiscussionThreadsList', limit:6}}/>
      </SingleColumnSection>
    </React.Fragment>
  )
};

registerComponent('Home2', Home2, withUser);
