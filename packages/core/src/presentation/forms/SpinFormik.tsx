import type { FormikConfig } from 'formik';
import type { FormikProps } from 'formik';
import { Formik } from 'formik';
import { set } from 'lodash';
import React from 'react';

import { traverseObject } from '../../utils';

/**
 * This component wraps the <Formik/> component, applying fixes and spinnaker opinions
 * Use this component like you would use the <Formik/> component
 */
function SpinFormikImpl<Values extends {}>(
  props: FormikConfig<Values>,
  ref?: React.MutableRefObject<FormikProps<Values>>,
) {
  const defaultRef = React.useRef<FormikProps<Values>>();
  const formikRef = ref || defaultRef;
  const [refSaved, setRefSaved] = React.useState(false);
  const [ready, setReady] = React.useState(false);

  const defaultIsInitialValid = () => formikRef.current && Object.keys(formikRef.current.errors).length === 0;

  // When a form is reloaded with existing data, we usually want to show validation errors immediately.
  // When the form is first rendered, mark all fields in initialValues as "touched".
  // Then run initial validation.
  React.useEffect(() => {
    if (refSaved) {
      const formik = formikRef.current;
      const initialTouched = {};
      traverseObject(props.initialValues, (path: string) => set(initialTouched, path, true), true);
      formik.setTouched(initialTouched);
      formik.validateForm();
      setReady(true);
    }
  }, [refSaved]);

  function saveRef(formik: FormikProps<Values>) {
    formikRef.current = formik;
    if (!refSaved) {
      // Trigger another render
      setRefSaved(true);
    }
  }

  return (
    <Formik<Values>
      innerRef={saveRef}
      {...props}
      isInitialValid={props.isInitialValid || defaultIsInitialValid}
      render={(renderProps) => ready && props.render && props.render(renderProps)}
    />
  );
}

export const SpinFormik = (React.forwardRef(SpinFormikImpl) as any) as typeof Formik;
