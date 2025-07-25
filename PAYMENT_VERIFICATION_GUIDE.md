# GuestyPay Payment Verification Guide

## 🔍 How to Verify Payments Are Working

### **1. Console Logs to Check**
After a successful booking, look for these logs in the browser console:

```javascript
[guesty-payment-serverside.js] PAYMENT SUCCESS - Full reservation data: {...}
[guesty-payment-serverside.js] Payment verification details: {
  confirmation_code: "GY-p9qXHSV",
  reservation_id: "...",
  payment_status: "confirmed", 
  payment_amount: 13.68,
  payment_currency: "USD",
  payment_token_used: "6882f5fc19489bdc340b7338"
}
```

### **2. Server Logs to Check**
In your WordPress error logs, look for:

```
GUESTY TOKENIZATION SUCCESS: Payment method created: {"token_id":"...","amount":13.68,...}
GUESTY PAYMENT SUCCESS: Reservation created with payment details: {"reservation_id":"...","cc_token_used":"..."}
```

### **3. Guesty Dashboard Verification**

**Check in Guesty:**
1. **Reservations Tab** → Find your confirmation code
2. **Payment Section** → Should show:
   - ✅ Payment Method: Credit Card
   - ✅ Amount: $13.68 USD
   - ✅ Status: Paid/Authorized
   - ✅ Payment Provider: GuestyPay

**Financial Details:**
- **Guest Payment:** Amount charged to guest's card
- **Host Payout:** Amount that goes to property owner
- **Platform Fee:** Guesty's commission (if any)

### **4. Payment Flow Verification**

**✅ REAL PAYMENT occurred if:**
- Console shows `payment_token_used: "actual_token_id"`
- Server logs show tokenization AND reservation success
- Guesty dashboard shows payment details
- Guest receives charge on their card

**❌ NO PAYMENT occurred if:**
- Amount shows as $0
- No payment token generated
- Guesty shows "No payment method"
- Guest doesn't see charge

### **5. Who Gets the Money?**

**Payment Flow:**
```
Guest's Card → GuestyPay → Property Owner's Account
```

**Money Destination:**
- **Property Owner:** Gets the booking amount minus fees
- **Payment Processor:** GuestyPay takes processing fees (~2.9%)
- **Platform:** Guesty may take commission (varies by account)

### **6. Test vs Live Payments**

**Test Environment:**
- Uses test card numbers (4580458045804580)
- No real money transferred
- Shows in Guesty as test reservations

**Live Environment:**
- Uses real card numbers
- Real money charged and transferred
- Shows in Guesty as actual bookings

### **7. Verification Checklist**

- [ ] Console shows successful tokenization
- [ ] Console shows payment amount > $0
- [ ] Server logs confirm token creation
- [ ] Server logs confirm reservation with payment
- [ ] Guesty dashboard shows payment details
- [ ] Guest confirmation email mentions payment
- [ ] Property owner account shows incoming payment

### **8. Common Issues**

**If amount is $0:**
- Check quote calculation in browser console
- Verify rate plans are set up correctly in Guesty

**If payment shows but no money transfers:**
- Verify you're not using test cards in production
- Check GuestyPay account setup and bank details
- Confirm payout schedule with Guesty support

**If guest gets charged but booking fails:**
- Check Guesty logs for reservation creation errors
- Payment may need manual refund through Guesty dashboard

---

## 🧪 Current Test Status

Based on your recent booking:
- ✅ **Booking Created:** Confirmation #GY-p9qXHSV  
- ✅ **Amount Calculated:** $13.68 USD
- ❓ **Payment Verification:** Need to check console logs
- ❓ **Money Transfer:** Need to verify in Guesty dashboard

**Next Steps:**
1. Check console logs for payment verification details
2. Log into Guesty dashboard and verify payment status
3. Confirm bank account setup for payouts 