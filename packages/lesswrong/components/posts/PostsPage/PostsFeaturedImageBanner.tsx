import { registerComponent, Components } from "../../../lib/vulcan-lib"
import React from 'react';
// TODO; import { MAX_COLUMN_WIDTH } from './PostsPage'
import { createStyles } from "@material-ui/core";

const imgHeight = 1000
const imgWidth = 1800 // big default for now

const styles = createStyles(theme => ({
  root: {
    marginTop: -30,
    height: 250,
    [`@media (max-width: 684px)`]: {
      marginLeft: -4,
      width: '100vw',
    },
    // marginBottom: theme.spacing.unit * 3,
  },
}))

const PostsFeaturedImageBanner = ({post, classes}) => {
  const { CloudinaryImage2 } = Components
  // TODO; Use userAgent to determine resolution
  // TODO; maybe we upgrade dimensions?
  // TODO; get image url from post (will need to update fragment)
  // TODO; I'm not honestly sure whether we shouldn't use a regular cloudinary
  // react component here, it would mean the image wouldn't load on SSR, but
  // that might be fine. it's not the most important part anyway.
  return <div className={classes.root}>
    {/* <div className={classes.imgWrapper}> */}
      <CloudinaryImage2
        publicId='development/infosec'
        height={imgHeight}
        width={imgWidth}
        fillWidth='100%'
        fillHeight='100%'
        objectFit='cover'
      />
      {/* TODO; Image description? */}
    {/* </div> */}
  </div>
}

const PostsFeaturedImageBannerComponent = registerComponent(
  'PostsFeaturedImageBanner', PostsFeaturedImageBanner, {styles},
)

declare global {
  interface ComponentTypes {
    PostsFeaturedImageBanner: typeof PostsFeaturedImageBannerComponent
  }
}
