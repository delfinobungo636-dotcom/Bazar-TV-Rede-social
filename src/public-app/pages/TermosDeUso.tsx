import React from 'react';

const TermosDeUso = () => {
  return (
    <div className="min-h-screen bg-[#141414] text-gray-300 pt-28 px-6 md:px-12 lg:px-24 pb-16">
      <div className="max-w-4xl mx-auto animate-fadeIn">
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">Termos de Uso</h1>
        <p className="text-sm text-gray-500 mb-10">Última atualização: 20 de Julho de 2026</p>
        
        {/* TODAS AS SECÇÕES ESTÃO AGORA ABRAÇADAS POR ESTA DIV */}
        <div className="space-y-8 text-base md:text-lg leading-relaxed">
          
          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">1. Aceitação dos Termos</h2>
            <p>Ao aceder e utilizar a plataforma Bazar TV, o utilizador concorda em cumprir e ficar vinculado a estes Termos de Uso. Se não concordar com alguma parte destes termos, não deverá utilizar o nosso serviço de streaming.</p>
          </section>
          
          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">2. Assinaturas e Pagamentos</h2>
            <p>Os serviços da Bazar TV são cobrados em Kwanzas (AOA). O acesso aos conteúdos Premium, Standard e Família requer um pagamento prévio válido. As subscrições são mensais e o não pagamento resultará na suspensão automática do acesso (retornando ao plano base de 1000 Kz). Não efetuamos reembolsos por dias não utilizados.</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">3. Partilha de Contas e Dispositivos</h2>
            <p>O número de dispositivos em simultâneo depende estritamente do plano contratado. A partilha abusiva de credenciais fora do limite do plano acionará os nossos sistemas de segurança, resultando no bloqueio da conta ou na desconexão forçada de dispositivos não autorizados.</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">4. Direitos de Autor</h2>
            <p>Todo o conteúdo audiovisual (filmes, séries, transmissões de desporto e notícias) disponível na Bazar TV está protegido por direitos de autor. É estritamente proibido gravar, reproduzir, distribuir ou piratear qualquer material da plataforma.</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">5. Registo e Segurança da Conta</h2>
            <p className="mb-2">
              Para aceder aos conteúdos da Bazar TV, o utilizador deve criar uma conta fornecendo um endereço de email válido e uma palavra-passe segura. O utilizador é o único responsável por manter a confidencialidade dos seus dados de acesso.
            </p>
            <p>
              Qualquer atividade realizada através da sua conta será da sua inteira responsabilidade. Se suspeitar de um acesso não autorizado, deve notificar imediatamente o suporte técnico da Bazar TV.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">6. Mecanismos Antifraude e Bloqueios</h2>
            <p className="mb-2">
              A Bazar TV utiliza sistemas automatizados para monitorizar acessos simultâneos e padrões de tráfego invulgares. Reservamo-nos o direito de suspender ou banir, sem aviso prévio e sem direito a reembolso, qualquer conta que:
            </p>
            <ul className="list-disc list-inside space-y-1 pl-4 text-gray-400">
              <li>Utilize métodos fraudulentos para contornar o gateway de pagamentos da Proxypay.</li>
              <li>Partilhe credenciais de acesso de forma massiva com terceiros.</li>
              <li>Tente injetar scripts maliciosos ou realizar ataques de negação de serviço (DDoS) contra as nossas Cloud Functions.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">7. Disponibilidade do Serviço e Modificações</h2>
            <p>
              Embora a Bazar TV trabalhe para garantir uma disponibilidade de 99,9% da plataforma, o serviço pode ser temporariamente interrompido para manutenções programadas, atualizações de infraestrutura ou falhas de força maior na rede de distribuição de conteúdos (CDN). A Bazar TV reserva-se o direito de alterar o catálogo de filmes, séries e canais em direto a qualquer momento, dependendo dos acordos de licenciamento em vigor.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">8. Resolução de Litígios e Lei Aplicável</h2>
            <p>
              Estes Termos de Uso são regidos e interpretados de acordo com a legislação vigente na República de Angola. Qualquer litígio emergente da interpretação ou execução destes termos será submetido aos tribunais competentes da província de Luanda.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default TermosDeUso;