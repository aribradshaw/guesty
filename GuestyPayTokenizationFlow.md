GuestyPay Tokenization Flow
How to safely tokenize credit card details for the GuestyPay payment method.

Suggest Edits
Overview
There are two primary steps to creating a guest payment method through GuestyPay for reservations.

Collect and tokenize the guest's credit card.
Pass the token in the reservation creation request.
 

Create a Guest Payment Method Sequence Diagram
Figure 1.0. GuestyPay Tokenization Flow


Step 1: Tokenize the Guest's Card

📘
Determine the Payment Processor ID

The API will automatically identify a property's payment processor when you include the listingId in your tokenization request. Even then, it is a best practice to include the paymentProviderId as well. You can retrieve it with the following request.

Get payment provider by listing id

Payment Form and SDK
The quickest, easiest, and recommended way to facilitate payments on your website is by using our payment form SDK. Guesty offers a JavaScript SDK that supports multiple payment methods, ensuring that your guests enjoy a personalized and hassle-free checkout process. It's secure and PCI-compliant. You can access it at the links below.

GitHub Wiki
NPM package
Please note that the SDK only supports the GuestyPay.


Resources
❗️
Directly Interfacing with the API

Interfacing with the API directly, using the resources outlined below, should only be attempted if the SDK cannot be adapted for your use case. Even then, please contact Customer Experience and we will assist you with it. We plan to offer the SDK as the only method in the near future.


Available Endpoints

Method	Endpoint
POST	https://pay.guesty.com/api/tokenize/v2

Payload

Body Parameter	Data Type	Description	Required
paymentProviderId	string	The payment processing account ID as stored in Guesty - Learn more.	✔️
listingId	string	The ID of the property being booked.	✔️
card	object	Credit card details.	✔️
billing_details	object	Billing details.	✔️
threeDS	object	3D Secure validation (refer to the threeDS Object table below).	✔️
merchantData	object	See the Merchant Data section below.	

Card Object
This table describes the parameters of the card object from the Payload table above.


Body Parameter	Data Type	Description	Required
number	string	Credit card number.	✔️
exp_month	string	Expiration month in 2 digits string format ("04").	✔️
exp_year	string	Expiration year in 4 digits string format ("2024").	✔️
cvc	string	Card verification code. Three digits in string format.	✔️

Billing Details Object
These are the parameters of the billing_details object from the Payload table above.


Body Parameter	Data Type	Description	Required
name	string	Cardholder's name.	✔️
address	object	Card's billing address.	✔️
    city	string	City. Max length 50 characters.	✔️
    country	string	The ISO 3166 Alpha-2 country code.	✔️
    line1	string	Street name and number. Max length 50 characters.	✔️
    postal_code	string	Postal code. Max length 20 characters.	✔️

threeDS Object
Guesty offers two parameters that can help guide the user toward the next step in your booking process after an authentication attempt.

successURL is the next step in your booking flow after a successful authentication attempt. For example, post the token as the guest's payment method and send the user a booking confirmation message.

failureURL is the next step in your process after authentication fails. Your website/application should redirect the guest to the relevant page to either try again, provide an alternate payment method, or follow any other process you have in place for invalid credit cards.


Body Parameter	Data Type	Description	Required
amount	number	The total amount of the future payment.	✔️
currency	string	The currency code. E.g. "USD"	✔️
successURL	string	URL for redirect after successful authentication.	
failureURL	string	URL for redirect after a failed authentication.	

🚧
Success and Failure URLs

If you don't provide any URLs, the user will be redirected to a blank white page after attempting to authenticate. To avoid this, we suggest specifying the URL of the next step in your booking process, based on the authentication result, for a better user experience.


Merchant Data
Body Parameter	Data Type	Description	Required
freeText	string	Any text you may wish to retain for future reference. E.g., "PayeeId-1234567".	
transactionDate	string	The ISO 8601 date and time (YYYY-MM-DDTHh:Mm.ss.sssZ).	
transactionDescription	string	Define your transaction for ease of reference.	
transactionId	string	Enter the transaction ID you require for your systems.	

Example
Request

cURL

curl --location 'https://pay.guesty.com/api/tokenize/v2' \
--header 'Content-Type: application/json' \
--data '{  
    "listingId": "64f03f9094d741004fda977d",
    "card": {
        "number": "4580458045804580",
        "exp_month": "12",
        "exp_year": "2024",
        "cvc": "123"
    },
    "billing_details": {
        "name": "John Smith",
        "address": {
            "line1": "20 W 34th St",
            "city": "New York",
            "postal_code": "10001",
            "country": "US"
        }
    },
     "threeDS": {
        "amount": 500,
        "currency": "USD",
        "successURL": "https://book.pms.com?{orderN}",
        "failureURL": "https://book.pms.com/fail?{orderN}"
    },
     "merchantData": {
        "freeText": "PayeeId-1234567",
        "transactionDate": "2023-11-14T12:12:33.162Z",
        "transactionDescription": "Descriptor",
        "transactionId": "Reservation-2000583"
    }
}

 

Response

Body Parameter	Data Type	Description
_id	string	The ID of the newly tokenized card. Pass this as the ccToken in your reservation creation request.
threeDS	object	Contains the authentication URL ("authURL").

Send the authURL to the user to authenticate the payment method. Once the authentication process is complete, the user is redirected to either the successURL or failureURL specified in the tokenization request, depending on the outcome.

If authentication is successful no authURL is returned in the response (the issuer didn't require it), you may proceed to use the token_id to create the guest payment method.


Response

JSON

{
    "_id": "64d4d01f1884841581a7768e",
    "threeDS": {
        "authURL": "https://api.checkout.com/sessions-interceptor/sid_.....",
    }
}

Step 2: Create the Reservation
Pass the GuestyPay token you've generated as the ccToken in the Create inquiry for reservation based on quote or Create instant reservation based on quote requests.


Reuse of Tokens
Using the same payment token for multiple reservations is not supported. It will result in a missing payment method error in the user dashboard (even though it exists), preventing auto payments from being executed as scheduled. Generate a new token for each new inquiry or reservation through the Booking Engine API.


Troubleshooting
The reservation was created without a payment method
How can I be sure the payment method succeeded?
The reservation object payload will show the payment object, nested under the money.payments section.

Error 402: ERR_BAD_REQUEST
When the data of your response contains the messages: "Request contradicts clearing interface configuration" and"Bad Bin or Host Disconnect", it means there is an issue with your GuestyPay account and it could be offline. To remedy this, contact Customer Experience.

