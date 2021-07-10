import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";

import { TranslateModule } from "@ngx-translate/core";

import { WebviewDirective } from "./directives/";
import { FormsModule } from "@angular/forms";

@NgModule({
  declarations: [WebviewDirective],
  imports: [CommonModule, TranslateModule, FormsModule],
  exports: [TranslateModule, WebviewDirective, FormsModule],
})
export class SharedModule {}
