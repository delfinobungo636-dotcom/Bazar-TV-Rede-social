 interface CheckoutProps {
    planName: string;
    price: string | number;
  }
  
  const CheckoutCard = ({ planName, price }: CheckoutProps) => {
    const whatsappLink = `https://wa.me/244928420341?text=Olá! Fiz o pagamento de ${price} Kz para o plano ${planName}`;
  
    return (
      <div className="payment-card">
        <h3>Pagamento via MCX Express</h3>
        <p>Número Express: <strong>928420341</strong></p>
        <p>Valor a pagar: <strong>{price} Kz</strong></p>
        <hr />
        <a href={whatsappLink} className="whatsapp-button">
          ENVIAR COMPROVATIVO VIA WHATSAPP
        </a>
        <p className="note">Ninguém entra na dashboard sem ter pago.</p>
      </div>
    );
  };