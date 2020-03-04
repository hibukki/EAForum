import { registerComponent, Components } from "../../../lib/vulcan-lib"
import React from 'react';
// TODO; import { MAX_COLUMN_WIDTH } from './PostsPage'
import { createStyles } from "@material-ui/core";

// const imgHeight = 250
const imgWidth = 684

const styles = createStyles(theme => ({
  root: {
    // maxWidth: 650 + (theme.spacing.unit*4),
    // marginLeft: 'auto',
    // marginRight: 'auto',
    // overflow: 'hidden',
    // position: 'relative',
    [`@media (max-width: 684px)`]: {
      position: 'relative',
      left: -4,
      width: '100vw',
    },
    marginBottom: theme.spacing.unit * 3,
  },
  // imgWrapper: {
  // }
}))

const PostsFeaturedImageInline = ({post, classes}) => {
  const { CloudinaryImage2 } = Components
  // TODO; get image url from post (will need to update fragment)
  // TODO; specify height if apsect ratio is greater than some preset
  // https://cloudinary.com/documentation/conditional_transformations
  // TODO; I'm not honestly sure whether we shouldn't use a regular cloudinary
  // react component here, it would mean the image wouldn't load on SSR, but
  // that might be fine. it's not the most important part anyway.
  return <div className={classes.root}>
    {/* <div className={classes.imgWrapper}> */}
      <CloudinaryImage2
        publicId='development/infosec'
        // height={imgHeight}
        width={imgWidth}
        fillWidth='100%'
        objectFit='cover'
      />
      {/* TODO; Image description? */}
    {/* </div> */}
  </div>
}

const PostsFeaturedImageInlineComponent = registerComponent(
  'PostsFeaturedImageInline', PostsFeaturedImageInline, {styles},
)

declare global {
  interface ComponentTypes {
    PostsFeaturedImageInline: typeof PostsFeaturedImageInlineComponent
  }
}
