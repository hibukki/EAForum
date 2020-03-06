import { registerComponent, Components } from "../../../lib/vulcan-lib"
import React from 'react';
import { createStyles } from "@material-ui/core";

const imgHeight = 1000
const imgWidth = 1800 // big default for now

const styles = createStyles(theme => ({
  root: {
    marginTop: -30,
    height: 250,
    marginBottom: 10,
    [theme.breakpoints.up('md')]: {
      marginLeft: -4,
      width: '100vw',
      marginBottom: 0,
    },
    '& img': {
      // Position image below inner shadow
      position: 'relative',
      zIndex: -2,
    },
    boxShadow: 'inset 0 1px 8px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, .3)'
  },
}))

const PostsFeaturedImageBanner = ({post, classes}) => {
  const { CloudinaryImage2 } = Components
  // TODO; Ideally there'd be a shadow on the header, but c'est la vie
  // TODO; Maybe use userAgent to determine resolution
  // TODO; Maybe upgrade image resolution based on screensize
  // TODO; Get image url from post (will need to update fragment)
  // TODO; I'm not honestly sure whether we shouldn't use a regular cloudinary
  // react component here, it would mean the image wouldn't load on SSR, but
  // that might be fine. It's not the most important part anyway.
  return <div className={classes.root}>
    <CloudinaryImage2
      publicId='development/pasted'
      height={imgHeight}
      width={imgWidth}
      fillWidth='100%'
      fillHeight='100%'
      objectFit='cover'
    />
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
