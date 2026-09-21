import React from 'react';

const Privacidade = () => {
  return (
    <div className="min-h-screen bg-[#141414] text-gray-300 pt-28 px-6 md:px-12 lg:px-24 pb-16">
      <div className="max-w-4xl mx-auto animate-fadeIn">
        <h1 className="text-3xl md:text-5xl font-black text-white mb-4 tracking-tight">Política de Privacidade</h1>
        <p className="text-sm text-gray-500 mb-10">Levamos a proteção dos seus dados a sério.</p>
        
        {/* TODAS AS SECÇÕES ESTÃO AGORA ABRAÇADAS POR ESTA DIV */}
        <div className="space-y-8 text-base md:text-lg leading-relaxed">
          
          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Que dados recolhemos?</h2>
            <p>Recolhemos informações necessárias para fornecer e melhorar o nosso serviço de streaming. Isto inclui o seu endereço de email, histórico de visualização, informações do dispositivo e endereço IP para gestão de sessões simultâneas.</p>
          </section>
          
          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Segurança e Pagamentos</h2>
            <p>Não armazenamos dados completos de cartões de crédito ou coordenadas bancárias nos nossos servidores. Todo o processamento financeiro é feito através de gateways parceiros seguros e encriptados.</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Partilha de Dados</h2>
            <p>A Bazar TV não vende nem aluga as suas informações pessoais a terceiros. Os dados podem ser partilhados apenas com autoridades competentes caso exista uma obrigação legal formal.</p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Como utilizamos os seus dados?</h2>
            <p className="mb-2"> Os dados recolhidos pela Bazar TV são processados de forma automatizada para as seguintes finalidades: </p>
            <ul className="list-disc list-inside space-y-2 pl-4 text-gray-400 mt-3">
              <li> <strong className="text-white">Personalização da Experiência:</strong> Utilizar o seu histórico para sugerir filmes e séries de cinema angolano alinhados com o seu gosto. </li>
              <li> <strong className="text-white">Otimização do Streaming:</strong> Monitorizar a qualidade da transmissão no seu telemóvel ou computador para ajustar a resolução do vídeo à velocidade da sua internet. </li>
              <li> <strong className="text-white">Segurança das Sessões:</strong> Validar os identificadores únicos de dispositivo (Device ID) para garantir o cumprimento estrito dos limites de ecrãs do seu plano. </li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Retenção de Dados</h2>
            <p>
              Mantemos os seus dados pessoais armazenados de forma segura no nosso banco de dados (Firestore) apenas durante o período em que a sua conta estiver ativa. Se decidir eliminar a sua conta Bazar TV, todas as suas informações pessoais, histórico de visualização e registos de login serão permanentemente apagados ou anonimizados num prazo máximo de 30 dias, exceto os dados financeiros que somos legalmente obrigados a manter para efeitos fiscais.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Cookies e Tecnologias de Rastreio</h2>
            <p>
              A nossa plataforma utiliza cookies locais e armazenamento do navegador (como o LocalStorage) para manter a sua sessão iniciada e guardar o progresso exato do filme que estava a assistir. Isto garante que, se fechar a aplicação no telemóvel e abrir mais tarde, pode continuar a ver exatamente de onde parou.
            </p>
          </section>

          <section>
            <h2 className="text-xl md:text-2xl font-bold text-white mb-3">Os Seus Direitos</h2>
            <p>
              O utilizador tem o direito de, a qualquer momento, solicitar o acesso, retificação ou eliminação definitiva dos seus dados pessoais armazenados na nossa plataforma. Estas solicitações podem ser feitas diretamente através das definições da sua conta ou entrando em contacto com a nossa equipa através do Centro de Ajuda.
            </p>
          </section>

        </div>
      </div>
    </div>
  );
};

export default Privacidade;