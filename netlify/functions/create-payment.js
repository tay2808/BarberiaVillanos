const mercadopago = require('mercadopago');

exports.handler = async (event, context) => {
  // 1. Check if the request is a POST request (for security)
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405, // Method Not Allowed
      body: JSON.stringify({ error: 'This function only accepts POST requests.' }),
    };
  }

  // 2. Get the secret Access Token from the "environment variables" (our digital safe box)
  const accessToken = process.env.MERCADOPAGO_ACCESS_TOKEN;

  if (!accessToken) {
    console.error("Mercado Pago Access Token is not configured.");
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Payment processor is not configured correctly.' }),
    };
  }

  // 3. Configure the Mercado Pago SDK with your secret token
  mercadopago.configure({
    access_token: accessToken,
  });

  // 4. Get the appointment details sent from the frontend (index.html)
  let appointmentDetails;
  try {
    appointmentDetails = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400, // Bad Request
      body: JSON.stringify({ error: 'Invalid request body. Expecting JSON.' }),
    };
  }

  const { serviceName, price, appointmentId } = appointmentDetails;

  // Basic validation
  if (!serviceName || !price || !appointmentId) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing required fields: serviceName, price, and appointmentId are required.' }),
    };
  }

  // 5. Create the payment "preference" object for Mercado Pago
  const preference = {
    items: [
      {
        title: serviceName,
        unit_price: Number(price), // Ensure price is a number
        quantity: 1,
      },
    ],
    back_urls: {
      // URL to redirect the user to after a successful payment
      success: `https://YOUR_NETLIFY_SITE_URL/success?appointment_id=${appointmentId}`, // IMPORTANT: Replace with your actual site URL
      // URL for pending or failed payments
      pending: `https://YOUR_NETLIFY_SITE_URL/pending`,
      failure: `https://YOUR_NETLIFY_SITE_URL/failure`,
    },
    auto_return: 'approved', // Automatically redirect on successful payment
    external_reference: appointmentId, // Link this payment to our appointment ID
  };

  try {
    // 6. Send the preference to Mercado Pago to create the payment session
    const response = await mercadopago.preferences.create(preference);

    // 7. Send back the secure payment URL to the frontend
    return {
      statusCode: 200,
      body: JSON.stringify({
        payment_url: response.body.init_point, // This is the URL the user will be redirected to
      }),
    };
  } catch (error) {
    console.error('Error creating Mercado Pago preference:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to create payment link.' }),
    };
  }
};
