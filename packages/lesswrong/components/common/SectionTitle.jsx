import React from 'react';
import { registerComponent } from 'meteor/vulcan:core';
import { makeStyles } from '@material-ui/core/styles';
import Typography from '@material-ui/core/Typography';
import classNames from 'classnames'
import { spacingNumbersToCss } from '../../themes/stylePiping'

const borderStyle = "solid 3px rgba(0,0,0,.5)"

const useStyles = makeStyles(theme => ({
  root: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: theme.spacing.unit*3,
    marginBottom: theme.spacing.unit,
  },
  title: ({spacing}) => ({
    margin: 0,
    fontFamily: theme.typography.postStyle.fontFamily,
    fontStyle: "italic",
    ...spacingNumbersToCss(spacing.title),
  }),
  leftDivider: {
    borderTop: borderStyle,
    width: theme.spacing.unit*4,
    marginRight: theme.spacing.unit*1.5,
    [theme.breakpoints.down('sm')]: {
      width: theme.spacing.unit*2,
    },
  },
  rightDivider: {
    flexGrow: 1,
    marginLeft: theme.spacing.unit*1.5,
    borderTop: borderStyle
  },
  rightMargin: {
    marginRight: theme.spacing.unit*1.5
  },
  noTitle: {
    marginLeft: 0,
  },
  children: ({spacing}) => ({
    ...theme.typography.commentStyle,
    ...spacingNumbersToCss(spacing.children),
  }),
  tailDivider: {
    marginLeft: theme.spacing.unit*1.5,
    borderTop: borderStyle,
    width: theme.spacing.unit*4,
  },
  [mediaQuery]: {
    width: spacingNumbers.width,
    marginRight: spacingNumbers.marginRight,
  }
}))

// Section divider with title, frequently featured throughout the site
//
// title: the title of the section, can be a react component if you want to
//   link or provide a tooltip or both
// children: This component can be handed children (the same way you normally
//   do with react). They are the custom part of the SectionTitle, usually a
//   checkbox or setting gear. They are the small part to the right of the title,
//   right aligned.
// TODO; vvv
// customClasses: Custom classnames to apply to the title and children containers.
//   This component can get pretty cramped in the horizontal direction, and
//   sometimes you want to customize the behavior specifically to your use-case.
//   (This is especially common on the EA Forum, which has larger fonts.)
//   Options: {title: class to apply to the title div, children: class to apply
//     to the children div}
// dividers: Should the title have a divider line running horizontally. As of
//   2019-11-26, we never set this to false
const SectionTitle = props => {
  // TODO; spacingNumbers -> variant?
  const {children, title, spacingNumbers, dividers=true} = props
  const classes = useStyles({spacingNumbers})
  console.log('SectionTitle render()')
  
  // const smallDevice = useMediaQuery(theme => theme.breakpoints.down('sm'));
  // const titleSpacing = classes[`${spacingNumbers}Title`]
  // const childrenSpacing = classes[`${spacingNumbers}Children`]
  // console.log(' classes', classes)
  // console.log(' titleSpacing', titleSpacing)
  // console.log(' childrenSpacing', childrenSpacing)
  return (
    <div className={classes.root}>
      { dividers && title && <div className={classes.leftDivider}/>}
      <Typography variant='display1' className={classes.title}>
        {title}
      </Typography>
      { dividers && <div className={classNames(classes.rightDivider, {[classes.noTitle]: !title, [classes.rightMargin]: !!children})}/>}
      <div className={classes.children}>
        { children }
      </div>
      { children && dividers && <div className={classes.tailDivider}/>}
    </div>
  )
}

// const SectionTitle = props => {
//   return <React.Fragment>
//     <Media small>
//       <SectionTitleBase small/>
//     </Media>
//     <Media big>
//       <SectionTitleBase big/>
//     </Media>
//   </React.Fragment>
// }

registerComponent( 'SectionTitle', SectionTitle)
