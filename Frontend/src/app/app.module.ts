import { NgModule, ErrorHandler } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { RouteReuseStrategy } from '@angular/router';

import { IonicModule, IonicRouteStrategy } from '@ionic/angular';
import { SplashScreen } from '@ionic-native/splash-screen/ngx';
import { StatusBar } from '@ionic-native/status-bar/ngx';

import { LoadingBarModule } from '@ngx-loading-bar/core';
import * as Sentry from '@sentry/browser';

import { AppComponent } from './app.component';
import { AppRoutingModule } from './app-routing.module';
import { DefaultPageGuardService } from './services/default-page-guard.service';
import { UnsavedChangesGuardService } from './services/unsaved-changes-guard.service';

import { environment } from 'src/environments/environment';

Sentry.init({
  release: (window as any).version,
  environment: environment.production ? 'production' : 'dev',
  dsn: 'https://056d11b20e624d52a5771ac8508dd0b8@sentry.io/1219200'
});

export class SentryErrorHandler extends ErrorHandler {
  handleError(error) {
    super.handleError(error);

    const chunkFailedMessage = /Loading chunk [\d]+ failed/;
    if (chunkFailedMessage.test(error.message)) {
      const shouldReload = confirm('There was a connection interruption while loading this page. Press okay to reload.');
      if (shouldReload) {
        window.location.reload(true);
      }
    }

    let token = '';
    try {
      token = localStorage.getItem('token');
    } catch (e) {}

    try {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Session: ' + token,
        level: Sentry.Severity.Info
      });
      Sentry.captureException(error.originalError || error);
    } catch (e) {
      console.error(e);
    }
  }
}

@NgModule({
  declarations: [
    AppComponent
  ],
  entryComponents: [],
  imports: [
    BrowserModule,
    IonicModule.forRoot(),
    AppRoutingModule,
    LoadingBarModule
  ],
  providers: [
    { provide: ErrorHandler, useClass: SentryErrorHandler },
    StatusBar,
    SplashScreen,
    { provide: RouteReuseStrategy, useClass: IonicRouteStrategy },
    DefaultPageGuardService,
    UnsavedChangesGuardService,
  ],
  bootstrap: [AppComponent]
})
export class AppModule {}
