import React, { useEffect, useState } from 'react';
import { Components, registerComponent } from '../../../lib/vulcan-lib';
import Button from '@material-ui/core/Button';
import Card from '@material-ui/core/Card';
import Divider from '@material-ui/core/Divider';
import Tooltip from '@material-ui/core/Tooltip';
import { createStyles } from '@material-ui/core/styles';
import CloseIcon from '@material-ui/icons/Close';
import { useMulti } from '../../../lib/crud/withMulti';
import { useCookies } from 'react-cookie';
import moment from 'moment';
import sample from 'lodash/sample';
import {AnalyticsContext} from "../../../lib/analyticsEvents";

const styles = createStyles((theme: ThemeType): JssStyles => ({
  card: {
    margin: '1em 0 1em 1em',
    padding: '2em',
    boxShadow: '0 4px 4px rgba(0, 0, 0, 0.07)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
  },
  closeButton: {
    padding: '.25em',
    margin: "-1.5em -1.5em 0 0",
    minHeight: '.75em',
    minWidth: '.75em',
    alignSelf: 'end',
  },
  closeIcon: {
    width: '.6em',
    height: '.6em',
    color: 'rgba(0, 0, 0, .2)',
  },
  title: {
    color: '#616161',
    paddingBottom: '1em',
    fontFamily: theme.typography.fontFamily,
    textAlign: 'center',
  },
  divider: {
    width: '50%',
  },
  body: {
    color: '#616161',
    marginTop: '1.5rem',
    marginBottom: '1.5rem',
    textAlign: 'center',
    fontFamily: theme.typography.fontFamily,
    fontSize: '1.05rem',
  },
  ctaButton: {
    borderRadius: 'unset',
    minWidth: '50%',
    background: theme.palette.primary.main,
    color: 'white',
    '&:hover': {
      background: theme.palette.primary.main,
    },
  }
}));

const FeaturedResourceBanner = ({ terms, classes }: {
  terms: FeaturedResourcesViewTerms,
  classes: ClassesType
}) => {
  const HIDE_FEATURED_RESOURCE_COOKIE = 'hide_featured_resource';
  const [cookies, setCookie] = useCookies([HIDE_FEATURED_RESOURCE_COOKIE])
  const [resource, setResource] = useState<FeaturedResourcesFragment | undefined>(undefined)
  const { results, loading } = useMulti({
    terms,
    collectionName: 'FeaturedResources',
    fragmentName: 'FeaturedResourcesFragment',
    enableTotal: false,
  });
  const { Typography } = Components

  useEffect(() => {
    if (loading || !results.length) {
      return;
    }

    setResource(sample(results));
  }, [results, loading]);

  if (cookies[HIDE_FEATURED_RESOURCE_COOKIE]) {
    return null;
  }

  const hideBanner = () => setCookie(
    HIDE_FEATURED_RESOURCE_COOKIE,
    "true", {
    expires: moment().add(30, 'days').toDate(),
  });

  if (!resource) {
    return null;
  }

  return <Card className={classes.card}>
    <AnalyticsContext pageSectionContext="featuredResourceBanner">
      <Tooltip title="Hide this for the next month">
        <Button className={classes.closeButton} onClick={hideBanner}>
          <CloseIcon className={classes.closeIcon} />
        </Button>
      </Tooltip>
      <Typography variant="title" className={classes.title}>
        {resource.title}
      </Typography>
      <Divider className={classes.divider} />
      <Typography variant="body2" className={classes.body}>
        {resource.body}
      </Typography>
      {resource.ctaUrl && resource.ctaText && <a href={resource.ctaUrl} target="_blank" rel="noopener noreferrer">
        <Button color="primary" className={classes.ctaButton}>
          {resource.ctaText}
        </Button>
      </a>}
    </AnalyticsContext>
  </Card>
}

const FeaturedResourceBannerComponent = registerComponent(
  'FeaturedResourceBanner', FeaturedResourceBanner, { styles }
)

declare global {
  interface ComponentTypes {
    FeaturedResourceBanner: typeof FeaturedResourceBannerComponent
  }
}
