import React, { PureComponent } from 'react';
import PropTypes from 'prop-types';
import { registerComponent, instantiateComponent } from '../../../lib/vulcan-lib';
import classNames from 'classnames';

const styles = (theme: ThemeType): JssStyles => ({
  formComponentClear: {
    "& span": {
      position: "relative",
      top: 20,
      padding: 10,
    },
  },
});

class FormComponentInner extends PureComponent<any> {
  renderClear = () => {
    const { classes } = this.props;
    if (['datetime', 'time', 'select', 'radiogroup'].includes(this.props.input)) {
      return (
        <a
          className={classes.formComponentClear}
          title="Clear field"
          onClick={this.props.clearField}
        >
          <span>✕</span>
        </a>
      );
    }
  };

  getProperties = () => {
    const { name, path, options, label, onChange, value, disabled, inputType } = this.props;

    // these properties are whitelisted so that they can be safely passed to the actual form input
    // and avoid https://facebook.github.io/react/warnings/unknown-prop.html warnings
    const inputProperties = {
      name,
      path,
      options,
      label,
      onChange: event => {
        // FormComponent's handleChange expects value as argument; look in target.checked or target.value
        const inputValue = inputType === 'checkbox' ? event.target.checked : event.target.value;
        onChange(inputValue);
      },
      value,
      disabled,
      ...this.props.inputProperties,
    };

    return {
      ...this.props,
      inputProperties,
    };
  };

  render() {
    const {
      inputClassName,
      name,
      input,
      beforeComponent,
      afterComponent,
      errors,
      showCharsRemaining,
      charsRemaining,
      formComponents,
    } = this.props;

    const FormComponents = formComponents;

    const hasErrors = errors && errors.length;

    const inputName = typeof input === 'function' ? input.name : input;
    const inputClass = classNames(
      'form-input',
      inputClassName,
      `input-${name}`,
      `form-component-${inputName || 'default'}`,
      { 'input-error': hasErrors }
    );
    const properties = this.getProperties();

    const FormInput = this.props.formInput;

    return (
      <div className={inputClass}>
        {instantiateComponent(beforeComponent, properties)}
        <FormInput {...properties}/>
        {hasErrors ? <FormComponents.FieldErrors errors={errors} /> : null}
        {this.renderClear()}
        {showCharsRemaining && (
          <div className={classNames('form-control-limit', { danger: charsRemaining < 10 })}>{charsRemaining}</div>
        )}
        {instantiateComponent(afterComponent, properties)}
      </div>
    );
  }
}

(FormComponentInner as any).propTypes = {
  inputClassName: PropTypes.string,
  name: PropTypes.string.isRequired,
  input: PropTypes.any,
  beforeComponent: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  afterComponent: PropTypes.oneOfType([PropTypes.string, PropTypes.node]),
  clearField: PropTypes.func.isRequired,
  errors: PropTypes.array.isRequired,
  help: PropTypes.node,
  onChange: PropTypes.func.isRequired,
  showCharsRemaining: PropTypes.bool.isRequired,
  charsRemaining: PropTypes.number,
  charsCount: PropTypes.number,
  charsMax: PropTypes.number,
  inputComponent: PropTypes.func,
  classes: PropTypes.any,
};

const FormComponentInnerComponent = registerComponent('FormComponentInner', FormComponentInner, {styles});

declare global {
  interface ComponentTypes {
    FormComponentInner: typeof FormComponentInnerComponent
  }
}
