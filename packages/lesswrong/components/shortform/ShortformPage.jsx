import React from 'react';
import { Components, registerComponent } from 'meteor/vulcan:core';
import { withStyles } from '@material-ui/core/styles';

const styles = theme => ({
  column: {
    maxWidth:680,
    margin:"auto"
  },
  sectionTitleTitle: {
    // TODO; LW might want as well
    // TODO; move to EA Theme
    // Super custom width matched to wording
    '@media (max-width: 429.95px)': {
      width: 195,
    },
  },
})

const ShortformPage = ({classes}) => {
  const { SingleColumnSection, ShortformThreadList, SectionTitle } = Components

  return (
    <SingleColumnSection>
      <div className={classes.column}>
        <SectionTitle
          title="Shortform Content [Beta]"
          customClasses={{title: classes.sectionTitleTitle}}
        />
        <ShortformThreadList terms={{view: 'shortform', limit:20}} />
      </div>
    </SingleColumnSection>
  )
}

registerComponent('ShortformPage', ShortformPage, withStyles(styles, {name:"ShortformPage"}));
