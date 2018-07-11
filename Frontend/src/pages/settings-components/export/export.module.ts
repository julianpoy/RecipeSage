import { NgModule } from '@angular/core';
import { IonicPageModule } from 'ionic-angular';
import { ExportPage } from './export';

@NgModule({
  declarations: [
    ExportPage,
  ],
  imports: [
    IonicPageModule.forChild(ExportPage),
  ],
})
export class ExportPageModule {}
