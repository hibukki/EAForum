import { registerComponent, Components } from "../../../lib/vulcan-lib"
import React from 'react';
import { createStyles } from "@material-ui/core";

const imgWidth = 684

const styles = createStyles(theme => ({
  root: {
    [`@media (max-width: 684px)`]: {
      // can just use margin
      position: 'relative',
      left: -4,
      width: '100vw',
    },
    marginBottom: theme.spacing.unit * 3,
  },
}))

const PostsFeaturedImageInline = ({post, classes}) => {
  const { CloudinaryImage2 } = Components
  // TODO; Get image url from post (will need to update fragment)
  // TODO; Specify height if apsect ratio is greater than some preset
  // https://cloudinary.com/documentation/conditional_transformations
  // TODO; I'm not honestly sure whether we shouldn't use a regular cloudinary
  // react component here, it would mean the image wouldn't load on SSR, but
  // that might be fine. It's not the most important part anyway.
  return <div className={classes.root}>
    <CloudinaryImage2
      publicId='development/infosec'
      width={imgWidth}
      fillWidth='100%'
      objectFit='cover'
    />
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
