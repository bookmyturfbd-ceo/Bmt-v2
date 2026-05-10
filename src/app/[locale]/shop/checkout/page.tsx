import CheckoutClient from './CheckoutClient';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Checkout | BMT Shop',
};

export default function CheckoutPage() {
  return <CheckoutClient />;
}
