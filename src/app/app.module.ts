import { BrowserModule } from "@angular/platform-browser";
import { NgModule } from "@angular/core";
import { FormsModule } from "@angular/forms";
import { HttpClientModule, HttpClient } from "@angular/common/http";
import { CoreModule } from "./core/core.module";
import { SharedModule } from "./shared/shared.module";

import { AppRoutingModule } from "./app-routing.module";
import { MatProgressBarModule } from "@angular/material/progress-bar";
import { TableModule } from 'ngx-easy-table'
import { MatTooltipModule } from '@angular/material/tooltip';
import { CodemirrorModule } from '@ctrl/ngx-codemirror';
import { MonacoEditorModule } from '@materia-ui/ngx-monaco-editor';
import { ToastrModule } from 'ngx-toastr';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { DropdownListModule } from 'ngx-dropdown-list';

// NG Translate
import { TranslateModule, TranslateLoader } from "@ngx-translate/core";
import { TranslateHttpLoader } from "@ngx-translate/http-loader";

import { AppComponent } from "./app.component";
import { HomeComponent } from "./pages/home/home.component";
import { CustomfilterComponent } from "./pages/customfilter/customfilter.component";
import { EditComponent } from "./pages/edit/edit.component";
import { FiltersComponent } from "./pages/filters/filters.component";
import { ImportexportComponent } from "./pages/importexport/importexport.component";
import { SettingsComponent } from "./pages/settings/settings.component";
import { ConfirmModalComponent } from "./components/confirm-modal/confirm-modal.component";
import { GeneratingCacheComponent } from "./components/generating-cache/generating-cache.component";
import { HeaderComponent } from "./components/header/header.component";
import { LoadingBarComponent } from "./components/loading-bar/loading-bar.component";
import { RenameModalComponent } from "./components/rename-modal/rename-modal.component";
import { SettingsModalComponent } from "./components/settings-modal/settings-modal.component";
import { SidebarComponent } from "./components/sidebar/sidebar.component";
import { SidebarButtonComponent } from "./components/sidebar-button/sidebar-button.component";
import { LoadingComponent } from "./pages/loading/loading.component";
import { PaginationComponent } from './components/pagination/pagination.component';
import { UpdateComponent } from './components/update/update.component';
import { HelpComponent } from './components/help/help.component';

// AoT requires an exported function for factories
const httpLoaderFactory = (http: HttpClient): TranslateHttpLoader =>
  new TranslateHttpLoader(http, "./assets/i18n/", ".json");

@NgModule({
  declarations: [
    AppComponent,
    HomeComponent,
    CustomfilterComponent,
    EditComponent,
    FiltersComponent,
    ImportexportComponent,
    SettingsComponent,
    ConfirmModalComponent,
    GeneratingCacheComponent,
    HeaderComponent,
    LoadingComponent,
    LoadingBarComponent,
    RenameModalComponent,
    SettingsModalComponent,
    SidebarComponent,
    SidebarButtonComponent,
    PaginationComponent,
    UpdateComponent,
    HelpComponent,
  ],
  imports: [
    BrowserModule,
    FormsModule,
    HttpClientModule,
    CoreModule,
    SharedModule,
    AppRoutingModule,
    TranslateModule.forRoot({
      loader: {
        provide: TranslateLoader,
        useFactory: httpLoaderFactory,
        deps: [HttpClient],
      },
    }),
    MatProgressBarModule,
    TableModule,
    MatTooltipModule,
    CodemirrorModule,
    MonacoEditorModule,
    DropdownListModule,
    ToastrModule.forRoot(),
    BrowserAnimationsModule
  ],
  providers: [],
  bootstrap: [AppComponent],
})
export class AppModule {}
