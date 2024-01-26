/* eslint-disable */
import axios from 'axios';
import { showAlert } from './alerts';
// public key

export const bookTour = async tourId => {
  const stripe = Stripe(
    'pk_test_51ObxS7L5FuoBpeMWDbNPY0GHYBJtyAtK2psheIPLj1G8CUPK0V6x0lWOzDem05LZauUHsI65vQIliK0Wo7goqlcU00Rb7aPPMl'
  );
  try {
    console.log('tourId', tourId);
    // 1) Get checkout session from API
    const session = await axios(`/api/v1/bookings/checkout-session/${tourId}`);
    // console.log(session);

    // 2) Create checkout form + chanre credit card
    await stripe.redirectToCheckout({
      sessionId: session.data.session.id
    });
  } catch (err) {
    console.log(err);
    showAlert('error', err);
  }
};
