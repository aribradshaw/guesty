Reservation Quote Flow
Understand the reservation quote flow.

Suggest Edits
📘
Contact our team

If you're having trouble, contact us at booking-engine-support@guesty.com for assistance!

The reservation quote flow supports many use cases, including revenue management tools such as displaying different rate plans, coupons, and promotions set up on Guesty directly on your site.

These API endpoints allow you to create better visibility of the reservation quotes and bring more complex pricing models to your direct booking website.

See the new endpoints below.

Reservation Quote
Create a reservation quote to hold the booking offer for a certain period.

🚧
Additional Fees and Taxes

Currently, the Booking Engine API only works with predefined rate plans inherited your Guesty account. Editing or including additional fees and taxes on top of the rate plan isn't supported.

This endpoint allows you to create a quote in Guesty for a specific reservation. See the example request below.

cURL

curl --request POST \
     --url https://booking.guesty.com/api/reservations/quotes \
     --header 'Accept: application/json; charset=utf-8' \
     --header 'Content-Type: application/json' \
     --data '
{
     "checkInDateLocalized": "2022-12-28",
     "checkOutDateLocalized": "2023-01-15",
     "listingId": "string",
     "guestsCount": 1,
     "coupons": "DISCOUNT_50_$,DISCOUNT_60_$",
     "guest": {
          "guestId": "string",
          "firstName": "John",
          "lastName": "Doe",
          "phone": "string",
          "email": "string"
     }
}
'
The response will give you relevant prices, different rate plans, and available promotions. See the example response below.

JSON

{
  "_id": "string",
  "createdAt": "2022-04-06T14:36:02.553Z",
  "expiresAt": "2022-04-06T14:36:02.553Z",
  "promotions": {
    "name": "string",
    "type": "string",
    "description": "string",
    "adjustment": 0
  },
  "coupons": [
    {
      "name": "string",
      "type": "percentage",
      "code": "string",
      "adjustment": 0
    }
  ],
  "rates": {
    "ratePlans": [
      {
        "_id": "string",
        "name": "string",
        "type": "string",
        "mealPlans": [
          "string"
        ],
        "cancellationPolicy": [
          "string"
        ],
        "cancellationFee": "string",
        "priceAdjustment": {
          "type": "string",
          "direction": "string",
          "amount": 0
        },
        "days": [
          {
            "date": "2022-04-06",
            "price": 0,
            "currency": "string",
            "basePrice": 0,
            "rateStrategy": 0,
            "ratePlan": 0,
            "lengthOfStay": 0
          }
        ],
        "money": {
          "invoiceItems": [
            {
              "title": "string",
              "amount": 0,
              "currency": "USD",
              "type": "string",
              "normalType": "string",
              "description": "string"
            }
          ],
          "_id": "string",
          "fareAccommodationAdjusted": 0,
          "currency": "USD",
          "fareAccommodation": 0,
          "fareCleaning": 0,
          "totalFees": 0,
          "subTotalPrice": 0,
          "hostPayout": 0,
          "hostPayoutUsd": 0,
          "totalTaxes": 0
        }
      }
    ]
  },
  "guestId": "string"
}
We can guarantee that these prices will be available for this booking for 24 hours once the reservation quote is created.

🚧
Coupons

Valid coupons are those created under Guesty's Revenue Management feature. Coupons found through the Booking Engine API settings will no longer work.

Retrieve a Quote by ID
Use the Retrieve a quote by ID endpoint to get the specific details of a quote.

By retrieving the specific quotes, you can regain the visitors who left the website. When they come back, you can offer them the price they were offered initially.

Add/Remove Coupons from a Quote
Update coupon in a quote endpoint allows you to add coupons to a quote for an updated price.

### Creating an Inquiryor Reservation with a Quote

You can both create reservation inquiries and place instant reservations based on a quote.

Using the quote ID and preferred booking type (inquiry/instant), you can create the reservation in Guesty. See the example requests below.

Instant Book
Request

cURL

curl --request POST \
     --url https://booking.guesty.com/api/reservations/quotes/:quoteId/instant \
     --header 'Accept: application/json; charset=utf-8' \
     --header 'Content-Type: application/json'
Response

JSON

{
  "_id": "string",
  "status": "confirmed",
  "platform": "direct",
  "confirmationCode": "string",
  "createdAt": "11/7/2021, 3:57:29 PM",
  "guestId": "string"
}
Inquiry
Request

cURL

curl --request POST \
     --url https://booking.guesty.com/api/reservations/quotes/:quoteId/inquiry \
     --header 'Accept: application/json; charset=utf-8' \
     --header 'Content-Type: application/json'
Response

JSON

{
  "_id": "string",
  "status": "reserved",
  "platform": "direct",
  "createdAt": "11/7/2021, 3:57:29 PM",
  "guestId": "5e384c9fc2700d002670b61b"
}
👍
Tip:

You can use more than one booking type per website. You can apply it per listing or allow the guest to decide.

Reservation Alterations
To make changes to your inquiries and reservations, you can use Guesty's OpenAPI. However, it's important to wait for up to 60 seconds after creating an inquiry or reservation via the Booking Engine API before making any alterations through the OpenAPI. This will allow Guesty enough time to synchronize the data and related objects across both systems.

