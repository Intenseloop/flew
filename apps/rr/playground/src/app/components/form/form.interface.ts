import { MatCheckboxChange, MatRadioChange } from '@angular/material';

export interface FormFieldOption {
  name: string;
  label: string;
  onChange: any;
  meta: any;
  required: boolean;
}

export interface FormField {
  name: string;
  placeholder: string;
  type: 'boolean' | 'callback' | 'assert';
  value: any;
}

export interface FormFieldChange {
  event: any;
  field: FormField;
}

export type FormFieldChangeEvent = MatCheckboxChange | MatRadioChange | any;
