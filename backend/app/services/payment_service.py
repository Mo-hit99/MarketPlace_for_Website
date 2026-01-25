import razorpay
from app.core.config import settings

class PaymentService:
    @staticmethod
    def get_client():
        if not settings.RAZORPAY_KEY_ID:
             # Return Dummy for testing if no keys
             return None 
        return razorpay.Client(auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET))

    @staticmethod
    def create_order(amount: float, currency: str = "INR") -> dict:
        client = PaymentService.get_client()
        amount_paise = int(amount * 100)
        
        if not client:
             # Dummy
             return {"id": "order_dummy_12345", "amount": amount_paise, "currency": currency}
             
        data = { "amount": amount_paise, "currency": currency }
        order = client.order.create(data=data)
        return order

    @staticmethod
    def verify_payment(params: dict):
        client = PaymentService.get_client()
        if not client:
            return True
        try:
            client.utility.verify_payment_signature(params)
            return True
        except:
            return False
