import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChainingPickerContainerComponent } from './chaining-picker-container.component';
import { ChainingPickerModule } from '../../components/chaining-picker/chaining-picker.module';
import {
  MatSelectModule,
  MatFormFieldModule,
  MatButtonModule
} from '@angular/material';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { CacheExplorerModule } from '../../components/cache-explorer/cache-explorer.module';

@NgModule({
  declarations: [ChainingPickerContainerComponent],
  imports: [
    CommonModule,
    ChainingPickerModule,
    MatSelectModule,
    MatFormFieldModule,
    MatButtonModule,
    FormsModule,
    ReactiveFormsModule,
    CacheExplorerModule
  ],
  exports: [ChainingPickerContainerComponent]
})
export class ChainingPickerContainerModule {}
