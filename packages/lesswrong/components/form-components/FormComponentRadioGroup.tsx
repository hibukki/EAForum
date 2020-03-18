import React from 'react';
import PropTypes from 'prop-types';
import { registerComponent } from '../../lib/vulcan-lib';
import Typography from '@material-ui/core/Typography';

const styles = theme => ({
  root: {
    marginRight:theme.spacing.unit*3,
    marginTop: 5,
    display: "flex",
    alignItems: "center"
  },
  size: {
    width:36,
    height:0
  },
  inline: {
    display:"inline",
  }
})

const FormComponentRadioGroup = ({ classes, label, disabled=false, path, value, optionsASDF }, context) => {
  console.log('optionsASDF', optionsASDF)
  return <div className={classes.root}>
    {/* <RadioGroup
      className={classes.size}
      checked={value}
      onChange={(event, checked) => {
        context.updateCurrentValues({
          [path]: checked
        })
      }}
      disabled={disabled}
      disableRipple
    />
    <Typography className={classes.inline} variant="body2" component="label">{label}</Typography> */}
  </div>
}

(FormComponentRadioGroup as any).contextTypes = {
  updateCurrentValues: PropTypes.func,
};

// Replaces FormComponentRadioGroup from vulcan-ui-bootstrap
const FormComponentRadioGroupComponent = registerComponent("FormComponentRadioGroup", FormComponentRadioGroup, {styles});

declare global {
  interface ComponentTypes {
    FormComponentRadioGroup: typeof FormComponentRadioGroupComponent
  }
}
