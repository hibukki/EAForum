import React from 'react'
import { registerComponent } from '../../lib/vulcan-lib'
import RadioGroup from '@material-ui/core/RadioGroup'
import Radio from '@material-ui/core/Radio'
import FormControlLabel from '@material-ui/core/FormControlLabel'
import FormControl from '@material-ui/core/FormControl'
import FormLabel from '@material-ui/core/FormLabel'

const styles = theme => ({
  radioGroup: {
    marginTop: 4,
  },
  radioButton: {
    paddingTop: 4,
    paddingBottom: 4,
    paddingRight: 4,
  }
})

interface RadioButtonGroupOption {
  value: string,
  label: any
}

const RadioButtonGroup = ({ value, label, onChange, options, classes, className }: {
  value: string,
  label?: any,
  onChange: (event: any, newValue: any) => void,
  options: Array<RadioButtonGroupOption>,
  classes: ClassesType,
  className?: string
}) => {
  return <FormControl component={'fieldset' as any} className={className}>
    {label && <FormLabel component={'legend' as any}>{label}</FormLabel>}
    <RadioGroup className={classes.radioGroup} value={value} onChange={onChange}>
      {options.map(option => <FormControlLabel
        value={option.value}
        label={option.label || option.value}
        key={option.value}
        control={<Radio className={classes.radioButton} />}
      />)}
    </RadioGroup>
  </FormControl>
}

const RadioButtonGroupComponent = registerComponent("RadioButtonGroup", RadioButtonGroup, { styles });

declare global {
  interface ComponentTypes {
    RadioButtonGroup: typeof RadioButtonGroupComponent
  }
}
