import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ViewChild,
  ViewContainerRef,
  ComponentFactoryResolver,
  Input,
  Output,
  EventEmitter,
  SimpleChanges
} from '@angular/core';
import { FieldBooleanComponent } from '../field-boolean/field-boolean.component';
import { FieldCallbackComponent } from '../field-callback/field-callback.component';
import { FieldBaseComponent } from '../field-base/field-base.component';
import { FormField, FormFieldChange } from '../form.interface';
import { FieldAssertComponent } from '../field-assert/field-assert.component';
import { FieldSelectComponent } from '../field-select/field-select.component';

@Component({
  selector: 'play-field',
  templateUrl: './field.component.html',
  styleUrls: [],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class FieldComponent implements OnInit {
  @Input() data: FormField = <FormField>{};
  @Output() onChange = new EventEmitter<FormFieldChange>();
  @ViewChild('container', { static: true, read: ViewContainerRef })
  private container: ViewContainerRef;

  readonly fieldMapper = {
    assert: FieldAssertComponent,
    boolean: FieldBooleanComponent,
    callback: FieldCallbackComponent,
    select: FieldSelectComponent
  };

  constructor(private componentFactoryResolver: ComponentFactoryResolver) {}

  ngOnInit() {
    const componentFactory = this.componentFactoryResolver.resolveComponentFactory(
      this.getComponentFor(this.data.type)
    );
    const viewContainerRef = this.container;
    viewContainerRef.clear();
    const componentRef = viewContainerRef.createComponent(componentFactory);
    (<FieldBaseComponent>componentRef.instance).data = this.data;
    (<FieldBaseComponent>componentRef.instance).onChange = this.onChange;
  }

  private getComponentFor(field: string) {
    return this.fieldMapper[field];
  }

  ngOnChanges(changes: SimpleChanges) {
    if (!changes.data.firstChange) this.ngOnInit();
  }
}
