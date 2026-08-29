import { Routes } from '@angular/router';
import { HomePageComponent } from './pages/home-page/home-page.component';
import { OrderClaimPageComponent } from './pages/order-claim-page/order-claim-page.component';
import { PrivacyPolicyPageComponent } from './pages/privacy-policy-page/privacy-policy-page.component';

export const routes: Routes = [
  {
    path: '',
    component: HomePageComponent,
    title: 'Dukanz | Groceries delivered with less friction'
  },
  {
    path: 'privacy-policy',
    component: PrivacyPolicyPageComponent,
    title: 'Dukanz | Privacy Policy'
  },
  {
    path: 'orders/:orderId/claim',
    component: OrderClaimPageComponent,
    title: 'Dukanz | Order Claim'
  },
  {
    path: '**',
    redirectTo: ''
  }
];
