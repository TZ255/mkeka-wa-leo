You are a senior Node.js + Express developer working on the **Mkeka wa Leo** project.

Create a simple, reliable **payment system** using **HTMX**, **Bootstrap 5**, and **FontAwesome**, integrated with the **ZenoPay API**.  

The system must follow Mkeka wa Leo’s architecture:
- Views stored in `/views/`
- Zeno API routes in `/routes/zeno.js`
- Fragments (HTMX partials) in `/views/zz-fragments/`
- ZenoPay Model in `/model/PaymentBin.js`
- All dynamic responses must use `res.render()` to serve EJS fragments.

---

## SYSTEM STRUCTURE

### 1. FRONTEND (HTMX + Bootstrap)
- Review and improve the ejs htmx payment form page @/views/8-vip-paid/partials/htmx-form.ejs with a container `#payment-area`.
- The form should:
  - Use Bootstrap 5 layout.
  - Have a **Phone input group**:
    - Left side shows static prefix `+255`.
    - Right side is a 9-digit input (`pattern="[1-9][0-9]{8}"`) with `inputmode="numeric"`.
  - A “Pay Now” button with FontAwesome icon `<i class="fa-solid fa-money-bill"></i>`.
- Add HTMX attributes:
  - `hx-post="/api/pay"`
  - `hx-target="#payment-area"`
  - `hx-swap="innerHTML"`
  - `hx-disabled-elt="input,button"`
  - Include a `.htmx-indicator` spinner using Bootstrap spinner component.
  - The form will submit the phone number and user email through user.email
- When the form posts successfully:
  - The server responds with `res.render("z-fragments/payment-initiated", { orderId })` model (create it).
  - This fragment will show a Bootstrap modal telling the user to confirm payment on their phone.
  - Modal includes a button **“I CONFIRMED”** that posts to `/api/check-status` with the `orderId`.

---

### 2. BACKEND (Express + Mongoose)
All routes live in `/routes/zeno.js`.

#### `/api/pay` (POST)
- Accepts `{ email, phone9 }` from form.
- validate the phone number
- Builds full phone as `255 + phone9`.
- Calls ZenoPay API to create payment (check the imported modules).
- When success it will return the response like this
{"status":"success","resultcode":"000","message":"Request in progress. You will receive a callback shortly","order_id":"17603916674dd5000PHN0757259678"}

- Saves `{ email, phone, orderId, payment_status: "PENDING" }` in the **PaymentBin** model.
- Returns rendered fragment model from the zz-fragments folder with the orderID like: res.render("z-fragments/payment-initiated", { orderId })

#### /api/check-status (POST)
- Accepts { orderId }
- Checks PaymentBin for existing record.
- If COMPLETED: render z-fragments/payment-complete (a success div inside the modal).
- If pending: render z-fragments/payment-pending (a pending div inside the modal telling the user is not completed), user  to check again in 10 seconds or to start over "ANZA UPYA".
- If now completed: update DB to "COMPLETED" and render z-fragments/payment-complete with redirect in 5 seconds to /mkeka/vip

#### /api/zenopay-webhook (POST)

Receives webhook from ZenoPay in format:
{
  "order_id": "176039174dd5000PHN0757259678",
  "payment_status": "COMPLETED",
  "buyer_phone": "255757259678",
  "reference": "0991430664",
  "metadata": {}
}

Finds the matching PaymentBin record by order_id.
Updates:
{ payment_status: "COMPLETED" }

- Write a placeholder function to confirm user payment

- Responds with res.sendStatus(200)
