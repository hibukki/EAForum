import { registerComponent, Components } from 'meteor/vulcan:core';
import { withRouter, Link } from 'react-router';
import React from 'react';
import { withStyles } from '@material-ui/core/styles';
import classNames from 'classnames';
import Tooltip from '@material-ui/core/Tooltip';
import withUser from '../common/withUser';

import { compassIcon } from '../icons/compassIcon';
import { questionsGlobeIcon } from '../icons/questionsGlobeIcon';
import { communityGlobeIcon } from '../icons/communityGlobeIcon';
import { bookIcon } from '../icons/bookIcon'
import { allPostsIcon } from '../icons/allPostsIcon';

export const iconWidth = 30
const smallIconSize = 23

const styles = (theme) => ({
  root: {
    position: "absolute",
    width:"100%",
    zIndex: theme.zIndexes.tabNavigation,
    [theme.breakpoints.up('lg')]: {
      top: 64,
      left:0,
      width:270,
    },
    [theme.breakpoints.down('md')]: {
      position: "unset",
    },
  },
  tabMenu: {
    display: "flex",
    justifyContent: "space-around",
    zIndex: theme.zIndexes.tabNavigation,
    backgroundColor: "#ffffffd4",
    [theme.breakpoints.up('lg')]: {
      paddingTop: 30,
      paddingBottom: 70,
      flexDirection: "column",
    },
    [theme.breakpoints.down('md')]: {
      position: "fixed",
      bottom: 0,
      left: 0,
      width: "100%",
      backgroundColor: theme.palette.grey[300]
    },
  },
  selected: {
    '& $icon': {
      opacity: 1,
    },
    '& $navText': {
      color: theme.palette.grey[900],
      fontWeight: 600,
    },
    [theme.breakpoints.down('md')]: {
      backgroundColor: theme.palette.grey[400]
    }
  },
  navButton: {
    [theme.breakpoints.down('md')]: {
      width: "20%",
    },
    '&:hover': {
      opacity:.6
    },
    paddingTop: theme.spacing.unit*1.5,
    paddingBottom: theme.spacing.unit*1.5,
    paddingLeft: theme.spacing.unit*2,
    paddingRight: theme.spacing.unit*2,
    display: "flex",
    alignItems: "center",
    [theme.breakpoints.up('lg')]: {
      justifyContent: "flex-start",
      flexDirection: "row",
    },
    [theme.breakpoints.down('md')]: {
      paddingTop: theme.spacing.unit,
      paddingBottom: 2,
      width: "100%",
      flexDirection: "column",
    }
  },
  icon: {
    display: "block",
    opacity: .3,
    width: iconWidth,
    height: 28,
    [theme.breakpoints.up('lg')]: {
      marginRight: theme.spacing.unit*2,
      display: "inline",
    },
    [theme.breakpoints.down('md')]: {
      opacity: .45,
      width: smallIconSize,
      height: smallIconSize,
      '& svg': {
        width: smallIconSize,
        height: smallIconSize,
      }
    }
  },
  navText: {
    ...theme.typography.body2,
    color: theme.palette.grey[600],
    [theme.breakpoints.down('md')]: {
      fontSize: '.8rem',
      color: theme.palette.grey[700],
    },
    [theme.breakpoints.up('lg')]: {
      textTransform: "none !important",
    },
  },
  hideOnMobile: {
    [theme.breakpoints.down('md')]: {
      display: "none"
    },
  },
  hideOnDesktop: {
    [theme.breakpoints.up('lg')]: {
      display: "none"
    },
  },
  homeIcon: {
    '& svg': {
      height: 29,
      position: "relative",
      top: -1,
      [theme.breakpoints.down('md')]: {
        height: smallIconSize,
        width: smallIconSize
      }
    }
  },
})

const TabNavigationMenu = ({
  currentUser,
  classes,
  location,
}) => {

  const { pathname } = location
  const { TabNavigationSubItem, TabNavigationEventsList } = Components
  
  const lat = currentUser && currentUser.mongoLocation && currentUser.mongoLocation.coordinates[1]
  const lng = currentUser && currentUser.mongoLocation && currentUser.mongoLocation.coordinates[0]
  let eventsListTerms = {
    view: 'events',
    limit: 3,
  }
  if (lat && lng) {
    eventsListTerms = {
      view: 'nearbyEvents',
      lat: lat,
      lng: lng,
      limit: 3,
    }
  }

  return (
    <div className={classes.root}>
      <div className={classes.tabMenu}>
        <Tooltip placement="right" title="Latest posts, comments and curated content.">
          <Link to="/" className={classNames(classes.navButton, {[classes.selected]: pathname === "/"})}>
            <span className={classes.icon}>
              <span className={classes.homeIcon}>{ compassIcon }</span>
            </span>
            <span className={classes.navText}>
              Home
            </span>
          </Link>
        </Tooltip>

        <Tooltip placement="right-start" title={<div>
          <div>• Ask simple newbie questions.</div>
          <div>• Collaborate on open research questions.</div>
          <div>• Pose and resolve confusions.</div>
        </div>}>
          <Link to="/questions" className={classNames(classes.navButton, {[classes.selected]: pathname === "/questions"})}>
            <span className={classes.icon}>
              { questionsGlobeIcon }
            </span>
            <span className={classes.navText}>
              <span className={classes.hideOnMobile}>Open </span>Questions
            </span>
          </Link>
        </Tooltip>

        {/* TODO: Events here */}
        <Tooltip placement="right" title="See all posts, filtered and sorted however you like.">
          <Link to="/allPosts" className={classNames(classes.navButton, {[classes.selected]: pathname === "/allPosts"})}>
            <span className={classes.icon}>
              { allPostsIcon }
            </span>
            <span className={classes.navText}>
              Archive
            </span>
          </Link>
        </Tooltip>
      </div>
    </div>
  )
};

registerComponent('TabNavigationMenu', TabNavigationMenu, withRouter, withUser, withStyles(styles, { name: 'TabNavigationMenu'}));
